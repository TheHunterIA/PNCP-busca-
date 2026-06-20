import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
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

  // API Routes
  app.get("/api/licitacoes", async (req, res) => {
    try {
      const {
        q,
        termo,
        uf,
        modalidade,
        pagina = "1",
        limite = "10"
      } = req.query;

      const results = await buscarLicitacoesDoFirestore({
        q: (q as string) || (termo as string),
        uf: uf as string,
        modalidade: modalidade as string,
        pagina: parseInt(pagina as string, 10) || 1,
        limite: parseInt(limite as string, 10) || 10
      });

      return res.json(results);
    } catch (error: any) {
      console.error("[Server Error] Falha de leitura em /api/licitacoes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/licitacoes/stats", async (req, res) => {
    try {
      const stats = await obterStatusSincronismo();
      const total = await obterTotalRegistrosFirestore();
      return res.json({ ...stats, totalRegistros: total });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.all("/api/sync", async (req, res) => {
    try {
      let queryDataInicial: string | undefined;
      let queryDataFinal: string | undefined;
      let limitPages = 3;

      if (req.method === "POST") {
        const { dataInicial, dataFinal, paginasMax } = req.body;
        queryDataInicial = dataInicial;
        queryDataFinal = dataFinal;
        limitPages = parseInt(String(paginasMax), 10) || 3;
      } else {
        const { dataInicial, dataFinal, paginasMax } = req.query;
        queryDataInicial = dataInicial as string;
        queryDataFinal = dataFinal as string;
        limitPages = parseInt(String(paginasMax), 10) || 3;
      }

      console.log(`[Sync Trigger] Iniciando sincronismo via ${req.method}. Checkpoint ativo se datas omitidas.`);
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

  app.post("/api/clear", async (req, res) => {
    try {
      console.log("[Wipe Engine] Iniciando limpeza total da base de licitações...");
      const colRef = collection(db, "licitacoes");
      const snap = await getDocs(colRef);
      let count = 0;
      
      for (const d of snap.docs) {
        await deleteDoc(doc(db, "licitacoes", d.id));
        count++;
      }

      try {
        await deleteDoc(doc(db, "config", "sync_stats"));
      } catch (e) {}

      console.log(`[Wipe Engine] Sucesso: ${count} registros limpos.`);
      return res.json({
        success: true,
        message: `Wipe completo! ${count} registros removidos.`,
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

  // Frontend Serving Logic
  if (process.env.NODE_ENV !== "production") {
    // Development: Vite middleware
    console.log("[Server] Integrando middleware do Vite para desenvolvimento...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: Static serving
    const clientPath = path.join(process.cwd(), "dist", "client");
    console.log(`[Server] Servindo frontend estático de: ${clientPath}`);
    app.use(express.static(clientPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) return res.status(404).end();
      res.sendFile(path.join(clientPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PNCP Modern Server] Backend rodando na porta ${PORT}`);
    
    // Boot Sync Trigger
    const triggerInitialSync = async () => {
      console.log("[Boot Trigger] Verificando carga inicial...");
      try {
        const stats = await obterStatusSincronismo();
        // Só faz sync inicial se nunca foi feito ou se o banco parece vazio
        if (!stats.lastSyncTime) {
          const startOfYear = "20250101";
          const today = new Date();
          const formatDate = (d: Date) => d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
          const endDate = formatDate(today);

          executarSincronizacao(startOfYear, endDate, 1)
            .then(s => console.log(`[Boot Trigger] Sync inicial concluído: ${s.savedCount} regs.`))
            .catch(e => console.error("[Boot Trigger] Erro no sync inicial:", e));
        }
      } catch (e) {}
    };

    triggerInitialSync();
  });
}

startServer();

