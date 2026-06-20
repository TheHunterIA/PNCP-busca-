import { executarSincronizacao } from "../lib/sync";

async function main() {
  console.log("--- Executando Sincronismo Manual para Teste ---");
  try {
    const stats = await executarSincronizacao("20250601", "20250620", 1);
    console.log("Sincronismo concluído:");
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error("Erro no sincronismo:", error);
  }
  process.exit(0);
}

main();
