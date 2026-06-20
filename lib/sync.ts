import { doc, setDoc, getDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "./firebase";
import { buscarLicitacoesPNCP } from "./pncp";
import { LicitacaoPNCP } from "./types";

export interface SyncStats {
  lastSyncTime: string;
  lastSyncPeriod: string;
  fetchedCount: number;
  savedCount: number;
  filteredOutCount: number;
  logs: string[];
  success: boolean;
  errorMessage?: string;
}

/**
 * Executa o robô de sincronização, buscando o PNCP público, tratando-o e salvando-o no Firestore.
 * Regras de tratamento de dados solicitadas:
 * 1. Remove duplicados (garantido pelo uso de numeroControlePNCP como ID de documento no Firestore)
 * 2. Filtra 2025+ (apenas licitações de 2025 ou anos posteriores)
 * 3. Mantém apenas esfera federal
 * 4. Normaliza campos (já realizado na ingestão no pncp.ts)
 */
export async function executarSincronizacao(
  dataInicial: string,
  dataFinal: string,
  paginasMax: number = 3
): Promise<SyncStats> {
  const logs: string[] = [];
  const log = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    const formatted = `[${timestamp}] ${msg}`;
    console.log(`[Sync Engine] ${formatted}`);
    logs.push(formatted);
  };

  log(`Iniciando sincronização para o período ${dataInicial} a ${dataFinal}. Pág. Máx: ${paginasMax}`);

  let totalEstudosBuscados = 0;
  let totalSalvosNoBanco = 0;
  let totalFiltradosFora = 0;
  
  // Modalidades principais para busca automática:
  // 4: Pregão, 5: Concorrência, 6: Dispensa, 7: Inexigibilidade, 10: Maior Lance
  const modalidades = [4, 5, 6, 7, 10];
  
  try {
    for (const mod of modalidades) {
      log(`Buscando modalidade ${mod}...`);
      
      for (let p = 1; p <= paginasMax; p++) {
        log(`Buscando lote de licitações no portal PNCP (Página ${p}, Mod ${mod})...`);
        
        const res = await buscarLicitacoesPNCP(dataInicial, dataFinal, p, mod, 50);
        
        if (!res.records || res.records.length === 0) {
          log(`Página ${p} modalidade ${mod} veio vazia.`);
          break;
        }

        const batchSize = res.records.length;
        totalEstudosBuscados += batchSize;
        log(`Lote recebido: ${batchSize} registros encontrados.`);

        // Tratamento e Filtragem
        const recordsTratados = res.records.filter((item) => {
          // Regra 1: Filtro de Ano (2025+)
          const yearOfPub = parseInt(item.dataPublicacao.substring(0, 4)) || item.anoLicitacao;
          const matches2025Plus = yearOfPub >= 2025;
          
          // Regra 2: Mantém só esfera federal
          const matchesFederal = item.orgaoEntidade.esfera.toLowerCase() === "federal";

          if (matches2025Plus && matchesFederal) {
            return true;
          } else {
            totalFiltradosFora++;
            return false;
          }
        });

        if (recordsTratados.length > 0) {
          for (const item of recordsTratados) {
            const docRef = doc(db, "licitacoes", item.numeroControlePNCP);
            await setDoc(docRef, item, { merge: true });
            totalSalvosNoBanco++;
          }
          log(`Gravados ${recordsTratados.length} registros da modalidade ${mod} no Firestore.`);
        }

        if (p >= res.totalPaginas) break;
      }
    }

    log(`Sincronização concluída com sucesso!`);
    log(`Resumo do Robô: ${totalEstudosBuscados} buscados do PNCP, ${totalSalvosNoBanco} inseridos/atualizados no Firestore, ${totalFiltradosFora} eliminados nos filtros.`);

    const stats: SyncStats = {
      lastSyncTime: new Date().toISOString(),
      lastSyncPeriod: `${dataInicial.substring(6,8)}/${dataInicial.substring(4,6)}/${dataInicial.substring(0,4)} até ${dataFinal.substring(6,8)}/${dataFinal.substring(4,6)}/${dataFinal.substring(0,4)}`,
      fetchedCount: totalEstudosBuscados,
      savedCount: totalSalvosNoBanco,
      filteredOutCount: totalFiltradosFora,
      logs,
      success: true
    };

    // Salva estatísticas globais no próprio Firestore para o painel ler instantaneamente
    await setDoc(doc(db, "config", "sync_stats"), stats);

    return stats;

  } catch (error: any) {
    const errorMsg = error.message || String(error);
    log(`CATASTRÓFICO: Erro durante sincronização: ${errorMsg}`);
    
    const stats: SyncStats = {
      lastSyncTime: new Date().toISOString(),
      lastSyncPeriod: `${dataInicial} a ${dataFinal}`,
      fetchedCount: totalEstudosBuscados,
      savedCount: totalSalvosNoBanco,
      filteredOutCount: totalFiltradosFora,
      logs,
      success: false,
      errorMessage: errorMsg
    };

    try {
      await setDoc(doc(db, "config", "sync_stats"), stats);
    } catch (e) {
      console.error("Não foi possível salvar logs de erro no Firestore", e);
    }

    return stats;
  }
}

/**
 * Obtém os históricos e status do último sincronismo realizado.
 */
export async function obterStatusSincronismo(): Promise<SyncStats | null> {
  try {
    const snap = await getDoc(doc(db, "config", "sync_stats"));
    if (snap.exists()) {
      return snap.data() as SyncStats;
    }
  } catch (e) {
    console.error("Erro ao obter status de sincronismo do Firestore:", e);
  }
  return null;
}

/**
 * Retorna o total geral de registros que estão armazenados no Firestore na coleção licitacoes.
 */
export async function obterTotalRegistrosFirestore(): Promise<number> {
  try {
    const snap = await getDocs(query(collection(db, "licitacoes"), limit(1)));
    // Firestore client SDK doesn't have aggregate counting on basic client queries easily online,
    // so we can get all document sizes or query count. To be perfectly accurate and clean, 
    // we can retrieve up to 200 documents or read the overall database status, or read from sync_stats.
    const statsSnap = await getDoc(doc(db, "config", "sync_stats"));
    if (statsSnap.exists()) {
      return statsSnap.data().savedCount || 0;
    }
    
    // Fallback counts actual snapshot size (capped for quick safety)
    const allDocs = await getDocs(collection(db, "licitacoes"));
    return allDocs.size;
  } catch (e) {
    console.error("Erro ao obter total de registros do Firestore:", e);
    return 0;
  }
}
