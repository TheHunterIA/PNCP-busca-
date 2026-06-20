import express from "express";
import path from "path";
import { buscarLicitacoesDoFirestore } from "./api/licitacoes";
import { executarSincronizacao, obterStatusSincronismo, obterTotalRegistrosFirestore } from "./lib/sync";
import { db } from "./lib/firebase";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS Headers
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // 1. API: Leitura rápida diretamente do Firebase Firestore
  app.get("/api/licitacoes", async (req, res) => {
    try {
      const {
        termo,
        dataInicial,
        dataFinal,
        uf,
        modalidade,
        esfera,
        situacao,
        pagina = "1",
        tamanho = "6"
      } = req.query;

      const pageNum = parseInt(pagina as string, 10) || 1;
      const pageSize = parseInt(tamanho as string, 10) || 6;

      const result = await buscarLicitacoesDoFirestore(pageNum, pageSize, {
        termo: termo as string,
        uf: uf as string,
        modalidade: modalidade as string,
        esfera: esfera as string,
        situacao: situacao as string
      });

      return res.json(result);
    } catch (error: any) {
      console.error("[Server Error] Falha de leitora em /api/licitacoes:", error);
      res.status(500).json({
        success: false,
        message: "Ocorreu um erro ao consultar o banco de dados Firebase Firestore.",
        error: error.message
      });
    }
  });

  // 2. API: Robô de Ingestão e Sincronização incremental do PNCP (Suporta GET e POST para Cron Vercel)
  app.all("/api/sync", async (req, res) => {
    try {
      let queryDataInicial = "20250101";
      let queryDataFinal = "20251231";
      let limitPages = 3;

      if (req.method === "POST") {
        const { dataInicial, dataFinal, paginasMax } = req.body;
        queryDataInicial = dataInicial || "20250101";
        queryDataFinal = dataFinal || "20251231";
        limitPages = parseInt(String(paginasMax), 10) || 3;
      } else {
        // GET request (e.g. from Vercel Cron)
        const { dataInicial, dataFinal, paginasMax } = req.query;
        
        if (dataInicial || dataFinal) {
          queryDataInicial = (dataInicial as string) || "20250101";
          queryDataFinal = (dataFinal as string) || "20251231";
          limitPages = parseInt(String(paginasMax), 10) || 3;
        } else {
          // Default rolling window: from 15 days ago to today (perfect for continuous automation)
          const today = new Date();
          const fifteenDaysAgo = new Date();
          fifteenDaysAgo.setDate(today.getDate() - 15);
          
          const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}${month}${day}`;
          };
          
          queryDataInicial = formatDate(fifteenDaysAgo);
          queryDataFinal = formatDate(today);
          limitPages = 4; // Fetch up to 4 pages (200 records) automatically
        }
      }

      console.log(`[Sync Trigger] Iniciando sincronismo via ${req.method}. Período selecionado: ${queryDataInicial} a ${queryDataFinal} (Max Pág: ${limitPages})`);
      
      // Chamando a nova versão do sync que lida com checkpoints se os params forem omitidos
      const stats = await executarSincronizacao(queryDataInicial, queryDataFinal, limitPages);

      return res.json({
        success: stats.success,
        stats
      });
    } catch (error: any) {
      console.error("[Server Error] Falha de processamento em /api/sync:", error);
      res.status(500).json({
        success: false,
        message: "Falha na execução do processo de sincronismo.",
        error: error.message
      });
    }
  });

  // 3. API: Status do Robô e número total de registros salvos no Firestore
  app.get("/api/sync/status", async (req, res) => {
    try {
      const stats = await obterStatusSincronismo();
      const totalFirestore = await obterTotalRegistrosFirestore();
      
      return res.json({
        success: true,
        totalRecords: totalFirestore,
        lastSync: stats
      });
    } catch (error: any) {
      console.error("[Server Error] Falha em obter status do robô:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao ler metadados do banco secundário.",
        error: error.message
      });
    }
  });

  // 4. API: Limpeza de cache no Firestore para testes limpos e incríveis pelo usuário
  app.post("/api/clear", async (req, res) => {
    try {
      console.log("[Wipe Engine] Iniciando limpeza total da base de licitações para teste do usuário...");
      
      // Apaga os registros de licitações
      const colRef = collection(db, "licitacoes");
      const snap = await getDocs(colRef);
      let count = 0;
      
      for (const d of snap.docs) {
        await deleteDoc(doc(db, "licitacoes", d.id));
        count++;
      }

      // Apaga registros de status
      try {
        await deleteDoc(doc(db, "config", "sync_stats"));
      } catch (e) {}

      console.log(`[Wipe Engine] Sucesso: ${count} registros limpos do Firebase.`);
      
      return res.json({
        success: true,
        message: `Wipe completo! ${count} registros removidos com sucesso. O Firestore está zerado para novos testes de ingestão incremental!`,
        recordsCleaned: count
      });
    } catch (error: any) {
      console.error("[Server Error] Falha no wipe do banco:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao zerar tabelas do Firestore.",
        error: error.message
      });
    }
  });

  // Health Check / Root route
  app.get("/", (req, res) => {
    res.json({ 
      status: "online", 
      message: "PNCP Modern API Server (Firebase Backend Only)",
      endpoints: [
        "/api/licitacoes",
        "/api/sync",
        "/api/sync/status"
      ]
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PNCP Modern Server] API Backend escutando perfeitamente na porta ${PORT}`);
    
    // Disparo Automático: Carga Inicial de Dados no Boot
    // Isso garante que o usuário tenha dados assim que o servidor subir pela primeira vez
    const triggerInitialSync = async () => {
      console.log("[Boot Trigger] Iniciando carga de dados automática de inicialização...");
      try {
        const today = new Date();
        const startOfYear = "20250101"; // Início de 2025 conforme regra
        const formatDate = (d: Date) => d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
        const endDate = formatDate(today);

        // Executa sync em background para não travar o boot do servidor
        executarSincronizacao(startOfYear, endDate, 2)
          .then(stats => {
            console.log(`[Boot Trigger] Sincronismo inicial concluído. Salvos: ${stats.savedCount} registros.`);
          })
          .catch(err => {
            console.error("[Boot Trigger] Falha na carga automática de boot:", err);
          });
      } catch (e) {
        console.error("[Boot Trigger] Erro ao preparar carga inicial:", e);
      }
    };

    triggerInitialSync();
  });
}

startServer();
