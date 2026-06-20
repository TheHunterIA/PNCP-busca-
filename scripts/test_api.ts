async function main() {
  console.log("--- Verificando API Backend ---");
  
  const endpoints = ["/", "/api/sync/status", "/api/licitacoes"];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTestando: ${endpoint}...`);
      const res = await fetch(`http://localhost:3000${endpoint}`);
      const data = await res.json();
      console.log(`Status: ${res.status}`);
      console.log(`Resposta:`, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Erro em ${endpoint}:`, error);
    }
  }
}

main();
