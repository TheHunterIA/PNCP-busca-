/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OrgaoEntidade {
  cnpj: string;
  razaoSocial: string;
  poder?: string;
  esfera: string;
  uf: string;
}

export interface LicitacaoPNCP {
  numeroControlePNCP: string;
  numeroLicitacao: string;
  anoLicitacao: number;
  objeto: string;
  valorEstimado: number;
  dataPublicacao: string;
  dataAberturaProposta?: string;
  situacaoLicitacao: string;
  modalidadeNome: string;
  modalidadeId?: string;
  orgaoEntidade: OrgaoEntidade;
  linkOriginal?: string;
}

export interface SearchFilters {
  termo: string;
  dataInicial: string;
  dataFinal: string;
  uf: string;
  modalidade: string;
  esfera: string;
  situacao: string;
  forceMock: boolean;
}

export interface ApiResponse {
  success: boolean;
  source: "PNCP_LIVE" | "MOCK_FALLBACK";
  data: LicitacaoPNCP[];
  totalRegistros: number;
  totalPaginas: number;
  pagina: number;
  tamanhoPagina: number;
  message?: string;
}
