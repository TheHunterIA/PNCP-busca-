import { filtrarMockData } from "./mockData";

export default async function handler(req: any, res: any) {
  try {
    // Definir cabeçalhos CORS básicos para evitar problemas se acessado de fora
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
    );

    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

    const {
      termo,                  // Busca por palavra-chave no objeto ou razaoSocial
      dataInicial,           // YYYYMMDD
      dataFinal,             // YYYYMMDD
      uf,                    // Sigla do Estado (SP, RJ...)
      modalidade,            // Código ou nome da modalidade (1=Concorrência, 5=Pregão...)
      esfera,                // Municipal, Estadual, Federal
      situacao,              // Aberta, Em andamento, Homologada, Publicada
      pagina = "1",
      tamanho = "10",
      forceMock = "false"
    } = req.query;

    const pageNum = parseInt(pagina as string, 10) || 1;
    const pageSize = parseInt(tamanho as string, 10) || 10;

    // Se o usuário pedir dados fictícios ou para testes, ou se forçado pelo cliente
    if (forceMock === "true") {
      return res.status(200).json(filtrarMockData(pageNum, pageSize, { termo, uf, modalidade, esfera, situacao }));
    }

    // Parâmetros para chamada real ao PNCP
    const queryDataInicial = (dataInicial as string) || "20260601";
    const queryDataFinal = (dataFinal as string) || "20260620";

    // Tentamos obter dados reais da API Oficial do Portal Nacional de Contratações Públicas (PNCP)
    let pncpUrl = `https://pncp.gov.br/api/consulta/v1/licitacoes?dataInicial=${queryDataInicial}&dataFinal=${queryDataFinal}&pagina=${pageNum}&tamanhoPagina=${pageSize}`;

    // Repassar termos e filtros para a requisição da API real do Governo receber conteúdo qualificado
    if (termo) {
      pncpUrl += `&termo=${encodeURIComponent(termo as string)}`;
    }
    if (uf) {
      pncpUrl += `&uf=${encodeURIComponent((uf as string).toUpperCase())}`;
    }
    if (modalidade && !isNaN(Number(modalidade))) {
      pncpUrl += `&codigoModalidade=${encodeURIComponent(modalidade as string)}`;
    }
    if (esfera) {
      let esferaCode = "";
      const esfUpper = (esfera as string).toLowerCase();
      if (esfUpper === "federal" || esfUpper === "f") esferaCode = "F";
      else if (esfUpper === "estadual" || esfUpper === "e") esferaCode = "E";
      else if (esfUpper === "municipal" || esfUpper === "m") esferaCode = "M";

      if (esferaCode) {
        pncpUrl += `&esfera=${esferaCode}`;
      }
    }

    console.log(`[Vercel Serverless PNCP Query] Consultando API Oficial do Governo: ${pncpUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 segundos de tolerância

    try {
      const response = await fetch(pncpUrl, {
        signal: controller.signal,
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0"
        }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const rawData = await response.json();
        let records = rawData.data || [];

        // Filtro local adicional caso o endpoint do PNCP não refine completamente
        if (termo) {
          const queryClean = (termo as string).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          records = records.filter((item: any) => {
            const objClean = (item.objeto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const organClean = (item.orgaoEntidade?.razaoSocial || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return objClean.includes(queryClean) || organClean.includes(queryClean);
          });
        }

        if (uf) {
          records = records.filter((item: any) => 
            (item.orgaoEntidade?.uf || "").toLowerCase() === (uf as string).toLowerCase()
          );
        }

        if (modalidade) {
          records = records.filter((item: any) => 
            String(item.modalidadeId) === String(modalidade) || 
            (item.modalidadeNome || "").toLowerCase().includes((modalidade as string).toLowerCase())
          );
        }

        if (esfera) {
          records = records.filter((item: any) =>
            (item.orgaoEntidade?.esfera || "").toLowerCase() === (esfera as string).toLowerCase()
          );
        }

        return res.status(200).json({
          success: true,
          source: "PNCP_LIVE",
          data: records,
          totalRegistros: rawData.totalRegistros || records.length,
          totalPaginas: rawData.totalPaginas || Math.ceil(records.length / pageSize),
          pagina: pageNum,
          tamanhoPagina: pageSize
        });
      } else {
        console.warn(`[PNCP Query Warning] API Real retornou status não-200: ${response.status}. Usando dados simulados.`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`[PNCP Query Error] Ocorreu uma exceção ao chamar a API real do PNCP: ${err.message || err}`);
    }

    // Fallback gracioso para dados simulados extremamente representativos
    return res.status(200).json(filtrarMockData(pageNum, pageSize, { termo, uf, modalidade, esfera, situacao }));

  } catch (error: any) {
    console.error("Erro interno no Vercel Serverless Function:", error);
    return res.status(500).json({
      success: false,
      message: "Ocorreu um erro ao processar os parâmetros de consulta de licitações no Vercel Serverless.",
      error: error.message
    });
  }
}
