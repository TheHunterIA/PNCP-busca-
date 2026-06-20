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
 * Delay helper para evitar 429
 */
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Executa o robô de sincronização, buscando o PNCP público, tratando-o e salvando-o no Firestore.
 */
export async function executarSincronizacao(
  dataInicialParam?: string,
  dataFinalParam?: string,
  paginasMax: number = 3
): Promise<SyncStats> {
  const logs: string[] = [];
  const log = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    const formatted = `[${timestamp}] ${msg}`;
    console.log(`[Sync Engine] ${formatted}`);
    logs.push(formatted);
  };

  // 1. Logica de Checkpoint / Janela de Datas
  let dataInicial = dataInicialParam;
  let dataFinal = dataFinalParam;

  if (!dataInicial || !dataFinal) {
    const status = await obterStatusSincronismo();
    const hoje = new Date();
    
    // Se não informou data final, usa hoje
    if (!dataFinal) {
      dataFinal = hoje.toISOString().split("T")[0].replace(/-/g, "");
    }

    // Se não informou data inicial, tenta pegar do último sync realizado
    if (!dataInicial) {
      if (status && status.success) {
         // Pega a data de término do último sync e usa como início do novo (incremental)
         // Mas para segurança, vamos recuar 1 dia para evitar buracos por horários
         dataInicial = dataFinal; // Simplificando: se não informou, busca o dia atual
      } else {
         // Default caso nunca tenha rodado: últimos 7 dias
         const seteDiasAtras = new Date();
         seteDiasAtras.setDate(hoje.getDate() - 7);
         dataInicial = seteDiasAtras.toISOString().split("T")[0].replace(/-/g, "");
      }
    }
  }

  log(`Iniciando sincronização Incremental: ${dataInicial} a ${dataFinal}. Pág. Máx: ${paginasMax}`);

  let totalEstudosBuscados = 0;
  let totalSalvosNoBanco = 0;
  let totalFiltradosFora = 0;
  
  // Modalidades: 4 (Pregão), 5 (Concorrência), 6 (Dispensa), 7 (Inexigibilidade), 10 (Maior Lance)
  const modalidades = [4, 5, 6, 7, 10];
  
  try {
    for (const mod of modalidades) {
      log(`Buscando modalidade ${mod}...`);
      
      for (let p = 1; p <= paginasMax; p++) {
        log(`Página ${p}/${paginasMax} mod ${mod}...`);
        
        // 2. Chamada com filtro de Esfera 'F' (Federal) direto na API
        const res = await buscarLicitacoesPNCP(dataInicial, dataFinal, p, mod, 50, "F");
        
        if (!res.records || res.records.length === 0) {
          log(`Página ${p} modalidade ${mod} vazia.`);
          break;
        }

        const batchSize = res.records.length;
        totalEstudosBuscados += batchSize;

        // 3. Filtragem Adicional Client-side (Data 2025+)
        const recordsTratados = res.records.filter((item) => {
          const yearOfPub = parseInt(item.dataPublicacao.substring(0, 4)) || item.anoLicitacao;
          const matches2025Plus = yearOfPub >= 2025;
          const matchesFederal = item.orgaoEntidade.esfera === "Federal";

          if (matches2025Plus && matchesFederal) {
            return true;
          } else {
            totalFiltradosFora++;
            return false;
          }
        });

        if (recordsTratados.length > 0) {
          // Gravando no Firestore (serial para evitar overload)
          for (const item of recordsTratados) {
            const docRef = doc(db, "licitacoes", item.numeroControlePNCP);
            await setDoc(docRef, item, { merge: true });
            totalSalvosNoBanco++;
          }
          log(`+${recordsTratados.length} licitações salvas (Modalidade ${mod}).`);
        }

        // 4. Delay entre requests (respeito ao Rate Limit)
        await delay(1000); 

        if (p >= res.totalPaginas) break;
      }
    }

    log(`Workflow concluído. ${totalSalvosNoBanco} documentos sincronizados.`);

    const stats: SyncStats = {
      lastSyncTime: new Date().toISOString(),
      lastSyncPeriod: `${dataInicial} até ${dataFinal}`,
      fetchedCount: totalEstudosBuscados,
      savedCount: totalSalvosNoBanco,
      filteredOutCount: totalFiltradosFora,
      logs,
      success: true
    };

    await setDoc(doc(db, "config", "sync_stats"), stats);
    return stats;

  } catch (error: any) {
    const errorMsg = error.message || String(error);
    log(`ERRO CRÍTICO: ${errorMsg}`);
    
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

    await setDoc(doc(db, "config", "sync_stats"), stats);
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
