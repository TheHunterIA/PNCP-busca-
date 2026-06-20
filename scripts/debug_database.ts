import { obterTotalRegistrosFirestore, obterStatusSincronismo } from "../lib/sync";

async function main() {
  console.log("--- Verificação do Banco de Dados Firestore ---");
  
  try {
    const total = await obterTotalRegistrosFirestore();
    console.log(`Total de licitações encontradas na coleção 'licitacoes': ${total}`);
    
    const status = await obterStatusSincronismo();
    if (status) {
      console.log("Último status de sincronismo:");
      console.log(`- Data: ${status.lastSyncTime}`);
      console.log(`- Sucesso: ${status.success}`);
      console.log(`- Registros salvos: ${status.savedCount}`);
      if (status.errorMessage) {
        console.log(`- Erro: ${status.errorMessage}`);
      }
    } else {
      console.log("Nenhum registro de sincronismo encontrado em 'config/sync_stats'.");
    }
  } catch (error) {
    console.error("Erro durante a verificação:", error);
  }
  
  process.exit(0);
}

main();
