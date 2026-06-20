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
    const esf = String(orgao.esfera || "").toUpperCase();
    if (esf === "F" || esf.includes("FEDER")) return "Federal";
    if (esf === "E" || esf.includes("ESTAD")) return "Estadual";
    if (esf === "M" || esf.includes("MUNIC")) return "Municipal";
    return orgao.esfera || "Outra";
  };

  return {
    numeroControlePNCP: item.numeroControlePNCP || `${orgao.cnpj || "000"}-${item.numeroLicitacao || "0"}-${item.anoLicitacao || "2025"}`,
    numeroLicitacao: item.numeroLicitacao || "",
    anoLicitacao: Number(item.anoLicitacao) || 2025,
    objeto: (item.objeto || "Objeto não informado").trim(),
    valorEstimado: Number(item.valorEstimado) || Number(item.valorTotalEstimado) || 0,
    dataPublicacao: item.dataPublicacao || item.dataInclusao || new Date().toISOString(),
    dataAberturaProposta: item.dataAberturaProposta || item.dataFimApresentacaoProposta || undefined,
    situacaoLicitacao: item.situacaoLicitacao || "Publicada",
    modalidadeNome: item.modalidadeNome || "Licitação",
    modalidadeId: item.modalidadeId ? String(item.modalidadeId) : undefined,
    orgaoEntidade: {
      cnpj: orgao.cnpj || "00.000.000/0000-00",
      razaoSocial: (orgao.razaoSocial || "Órgão Não Identificado").trim(),
      poder: orgao.poder || undefined,
      esfera: esferaMapeada(),
      uf: (orgao.uf || "DF").toUpperCase()
    },
    linkOriginal: item.linkOriginal || undefined
  };
}

/**
 * Consulta a API oficial do Portal Nacional de Contratações Públicas (PNCP).
 * @param dataInicial Data inicial no formato YYYYMMDD
 * @param dataFinal Data final no formato YYYYMMDD
 * @param pagina Página de consulta (1-indexed)
 * @param tamanhoPagina Tamanho do lote (recomendado: 50)
 */
export async function buscarLicitacoesPNCP(
  dataInicial: string,
  dataFinal: string,
  pagina: number = 1,
  tamanhoPagina: number = 50
): Promise<PNCPFetchResult> {
  const pncpUrl = `https://pncp.gov.br/api/consulta/v1/licitacoes?dataInicial=${dataInicial}&dataFinal=${dataFinal}&pagina=${pagina}&tamanhoPagina=${tamanhoPagina}`;
  
  console.log(`[PNCP Robo] Fazendo chamada do robô ao PNCP: ${pncpUrl}`);
  
  const response = await fetch(pncpUrl, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0"
    }
  });

  if (!response.ok) {
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
