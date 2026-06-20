import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

async function main() {
  console.log("--- Verificação Admin do Firestore ---");
  
  const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  
  try {
    initializeApp({
      projectId: config.projectId,
    });
    
    // Check if we need to specify the databaseId
    const db = getFirestore(config.firestoreDatabaseId);
    
    const snapshot = await db.collection("licitacoes").limit(5).get();
    console.log(`Total de licitações encontradas (limite 5): ${snapshot.size}`);
    
    if (snapshot.size > 0) {
      snapshot.forEach(doc => {
        console.log(`- Documento ID: ${doc.id}`);
        const data = doc.data();
        console.log(`  Objeto: ${data.objeto?.substring(0, 50)}...`);
      });
    } else {
      console.log("Nenhuma licitação encontrada na coleção 'licitacoes'.");
    }
    
    // Status do sync
    const statsDoc = await db.collection("config").doc("sync_stats").get();
    if (statsDoc.exists) {
      console.log("Status de sync encontrado:", JSON.stringify(statsDoc.data(), null, 2));
    } else {
      console.log("Nenhum dado em config/sync_stats.");
    }
    
  } catch (error) {
    console.error("Erro na verificação Admin:", error);
  }
}

main();
