import { LicitacaoPNCP } from "./types";

interface PNCPFetchResult {
  records: LicitacaoPNCP[];
  totalRegistros: number;
  totalPaginas: number;
}

/**
 * Normaliza os campos brutos recebidos da API PNCP para o nosso tipo do sistema LicitacaoPNCP.
 */
export function normalizarLicitacao(item: any): LicitacaoPNCP {
  const orgao = item.orgaoEntidade || {};
  
  // Normalização e limpeza de campo
  const esferaMapeada = (): string => {
    const esf = String(orgao.esferaId || orgao.esfera || "").toUpperCase();
    if (esf === "F" || esf.includes("FEDER")) return "Federal";
    if (esf === "E" || esf.includes("ESTAD")) return "Estadual";
    if (esf === "M" || esf.includes("MUNIC")) return "Municipal";
    return orgao.esfera || orgao.esferaId || "Outra";
  };

  const sanitizeId = (id: string): string => id.replace(/\//g, "-");
  const objetoNormalizado = (item.objeto || item.objetoCompra || "Objeto não informado").trim();

  return {
    numeroControlePNCP: sanitizeId(item.numeroControlePNCP || `${orgao.cnpj || "000"}-${item.numeroLicitacao || item.numeroCompra || "0"}-${item.anoLicitacao || item.anoCompra || "2025"}`),
    numeroLicitacao: item.numeroLicitacao || item.numeroCompra || "",
    anoLicitacao: Number(item.anoLicitacao || item.anoCompra) || 2025,
    objeto: objetoNormalizado,
    valorEstimado: Number(item.valorEstimado || item.valorTotalEstimado || item.valorTotalHomologado) || 0,
    dataPublicacao: item.dataPublicacao || item.dataPublicacaoPncp || item.dataInclusao || new Date().toISOString(),
    dataAberturaProposta: item.dataAberturaProposta || item.dataFimApresentacaoProposta || undefined,
    situacaoLicitacao: item.situacaoLicitacaoNome || item.situacaoLicitacao || item.situacaoCompraNome || "Publicada",
    modalidadeNome: item.modalidadeNome || "Licitação",
    modalidadeId: item.modalidadeId ? String(item.modalidadeId) : undefined,
    orgaoEntidade: {
      cnpj: orgao.cnpj || "00.000.000/0000-00",
      razaoSocial: (orgao.razaoSocial || "Órgão Não Identificado").trim(),
      poder: orgao.poderId || orgao.poder || undefined,
      esfera: esferaMapeada(),
      uf: (orgao.uf || orgao.ufSigla || "DF").toUpperCase()
    },
    linkOriginal: item.linkOriginal || item.linkSistemaOrigem || undefined
  };
}

/**
 * Consulta a API oficial do Portal Nacional de Contratações Públicas (PNCP).
 * Nota: Este endpoint exige o código da modalidade.
 */
export async function buscarLicitacoesPNCP(
  dataInicial: string,
  dataFinal: string,
  pagina: number = 1,
  codigoModalidade: number = 4, // Padrão: Pregão
  tamanhoPagina: number = 50,
  codigoEsfera: string = "F" // Padrão: Federal
): Promise<PNCPFetchResult> {
  // Endpoint validado via Swagger
  // Adicionando filtro de esfera para reduzir tráfego e processamento
  const pncpUrl = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=${dataInicial}&dataFinal=${dataFinal}&codigoModalidadeContratacao=${codigoModalidade}&pagina=${pagina}&tamanhoPagina=${tamanhoPagina}&codigoEsfera=${codigoEsfera}`;
  
  console.log(`[PNCP Robo] Fazendo chamada ao PNCP (Mod ${codigoModalidade}, Esfera ${codigoEsfera}): ${pncpUrl}`);
  
  const response = await fetch(pncpUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
  });

  if (response.status === 204) {
    return { records: [], totalRegistros: 0, totalPaginas: 0 };
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[PNCP Robo] Erro ${response.status} ao acessar PNCP: ${errorText.substring(0, 200)}`);
    throw new Error(`O portal PNCP retornou status de erro: ${response.status}`);
  }

  const rawData = await response.json();
  const rawItems = rawData.data || [];
  
  // Normalizar os itens recebidos
  const records = rawItems.map((item: any) => normalizarLicitacao(item));

  return {
    records,
    totalRegistros: rawData.totalRegistros || records.length,
    totalPaginas: rawData.totalPaginas || 1
  };
}
