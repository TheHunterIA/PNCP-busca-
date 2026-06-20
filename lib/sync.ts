import { doc, setDoc, getDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "./firebase";
import { buscarLicitacoesPNCP } from "./pncp";
import { LicitacaoPNCP } from "./types";

export interface SyncStats {
  lastSyncTime: string;
  lastSyncPeriod: string;
  lastSyncDateInternal?: string; // Formato YYYYMMDD
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

  const statusDoc = await getDoc(doc(db, "config", "sync_stats"));
  const status = statusDoc.exists() ? statusDoc.data() as SyncStats : null;

  if (!dataInicial || !dataFinal) {
    const hoje = new Date();
    const hojeFormatado = hoje.toISOString().split("T")[0].replace(/-/g, "");
    
    if (!dataFinal) dataFinal = hojeFormatado;

    if (!dataInicial) {
      if (status && status.success && status.lastSyncDateInternal) {
         // Retoma do dia seguinte ao último sucesso
         const lastDate = new Date(status.lastSyncDateInternal.substring(0,4) + "-" + status.lastSyncDateInternal.substring(4,6) + "-" + status.lastSyncDateInternal.substring(6,8));
         lastDate.setDate(lastDate.getDate() + 1);
         dataInicial = lastDate.toISOString().split("T")[0].replace(/-/g, "");
         
         // Se a data calculada for no futuro em relação ao hoje, trava no hoje
         if (parseInt(dataInicial) > parseInt(dataFinal)) {
            dataInicial = dataFinal;
         }
      } else {
         // Default: Volta 3 dias para não sobrecarregar no primeiro sync
         const start = new Date();
         start.setDate(hoje.getDate() - 3);
         dataInicial = start.toISOString().split("T")[0].replace(/-/g, "");
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
    // Processamento por lotes (Chunks) para controlar concorrência (max 3 simultâneos)
    const modalidadesChunks = [modalidades.slice(0, 2), modalidades.slice(2, 4), modalidades.slice(4)];

    for (const chunk of modalidadesChunks) {
      log(`Iniciando lote de modalidades: ${chunk.join(", ")}`);
      
      await Promise.all(chunk.map(async (mod) => {
        for (let p = 1; p <= paginasMax; p++) {
          log(`Pág ${p} mod ${mod}...`);
          
          const res = await buscarLicitacoesPNCP(dataInicial!, dataFinal!, p, mod, 50, "F");
          
          if (!res.records || res.records.length === 0) break;

          totalEstudosBuscados += res.records.length;

          const recordsTratados = res.records.filter((item) => {
            const yearOfPub = parseInt(item.dataPublicacao.substring(0, 4)) || item.anoLicitacao;
            const matches2025Plus = yearOfPub >= 2025;
            const isFederal = item.orgaoEntidade.esfera === "Federal";

            if (matches2025Plus && isFederal) return true;
            totalFiltradosFora++;
            return false;
          });

          if (recordsTratados.length > 0) {
            for (const item of recordsTratados) {
              await setDoc(doc(db, "licitacoes", item.numeroControlePNCP), item, { merge: true });
              totalSalvosNoBanco++;
            }
            log(`+${recordsTratados.length} licitações (Mod ${mod})`);
          }

          await delay(800); // Delay curto para evitar 429
          if (p >= res.totalPaginas) break;
        }
      }));
    }

    log(`Workflow concluído. ${totalSalvosNoBanco} documentos sincronizados.`);

    const stats: SyncStats = {
      lastSyncTime: new Date().toISOString(),
      lastSyncPeriod: `${dataInicial} até ${dataFinal}`,
      lastSyncDateInternal: dataFinal, // Guardamos a data final para o próximo checkpoint
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
