import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { LicitacaoPNCP, ApiResponse } from "../lib/types";

/**
 * Consulta todas as licitações armazenadas no Firebase Firestore,
 * realiza filtragem avançada de busca em memória (case-insensitive e livre de acentos)
 * e retorna o resultado paginado e ordenado por data de publicação de forma super rápida.
 */
export async function buscarLicitacoesDoFirestore(params: {
  pagina?: number;
  limite?: number;
  q?: string;
  uf?: string;
  modalidade?: string;
  esfera?: string;
  situacao?: string;
} = {}): Promise<ApiResponse & { databaseEmpty?: boolean; items: LicitacaoPNCP[] }> {
  const { pagina = 1, limite = 10, q, uf, modalidade, esfera, situacao } = params;
  try {
    const colRef = collection(db, "licitacoes");
    const snap = await getDocs(colRef);
    
    if (snap.empty) {
      console.log("[Firestore Query] Banco de dados está vazio. Sem registros.");
      return {
        success: true,
        source: "PNCP_LIVE",
        items: [],
        data: [],
        totalRegistros: 0,
        totalPaginas: 1,
        pagina,
        tamanhoPagina: limite,
        databaseEmpty: true,
        message: "O banco de dados do Firebase Firestore está vazio. Use o robô sincronizador para carregar dados!"
      };
    }

    const records: LicitacaoPNCP[] = [];
    snap.forEach((doc) => {
      records.push(doc.data() as LicitacaoPNCP);
    });

    // 1. Filtragem Interativa e Inteligente em Memória
    let filteredRecords = [...records];

    // Filtro 1: Termo de Busca (Objeto ou Razão Social do Órgão)
    const termo = q;
    if (termo) {
      const termoNormalizado = termo
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      
      filteredRecords = filteredRecords.filter((item) => {
        const objClean = (item.objeto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const razaoClean = (item.orgaoEntidade?.razaoSocial || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cnpjClean = (item.orgaoEntidade?.cnpj || "").replace(/[^\d]/g, "");
        const numControleClean = (item.numeroControlePNCP || "").toLowerCase();
        
        return (
          objClean.includes(termoNormalizado) ||
          razaoClean.includes(termoNormalizado) ||
          cnpjClean.includes(termoNormalizado) ||
          numControleClean.includes(termoNormalizado)
        );
      });
    }

    // Filtro 2: Estado (UF)
    if (uf) {
      filteredRecords = filteredRecords.filter(
        (item) => (item.orgaoEntidade?.uf || "").toLowerCase() === uf.toLowerCase()
      );
    }

    // Filtro 3: Modalidade
    if (modalidade) {
      filteredRecords = filteredRecords.filter((item) => {
        const itemModId = String(item.modalidadeId || "");
        const itemModNome = String(item.modalidadeNome || "").toLowerCase();
        const searchMod = modalidade.toLowerCase();
        return itemModId === searchMod || itemModNome.includes(searchMod);
      });
    }

    // Filtro 4: Esfera
    if (esfera) {
      filteredRecords = filteredRecords.filter(
        (item) => (item.orgaoEntidade?.esfera || "").toLowerCase() === esfera.toLowerCase()
      );
    }

    // Filtro 5: Situação do Edital
    if (situacao) {
      const sLower = situacao.toLowerCase();
      filteredRecords = filteredRecords.filter((item) => {
        const sLicitacao = (item.situacaoLicitacao || "").toLowerCase();
        return sLicitacao.includes(sLower);
      });
    }

    // 2. Ordenação por data de publicação (mais recentes primeiro)
    filteredRecords.sort((a, b) => {
      const dateA = new Date(a.dataPublicacao).getTime() || 0;
      const dateB = new Date(b.dataPublicacao).getTime() || 0;
      return dateB - dateA;
    });

    // 3. Paginação de resultados
    const totalRegistros = filteredRecords.length;
    const totalPaginas = Math.ceil(totalRegistros / limite) || 1;
    const offset = (pagina - 1) * limite;
    const paginatedData = filteredRecords.slice(offset, offset + limite);

    return {
      success: true,
      source: "PNCP_LIVE",
      items: paginatedData,
      data: paginatedData, // Mantendo data para retrocompatibilidade se necessário
      total: totalRegistros, // Frontend espera total
      totalRegistros,
      totalPaginas,
      pagina,
      tamanhoPagina: limite
    };
  } catch (err: any) {
    console.error("[Firestore Query Error] Falha de leitura:", err);
    throw new Error(`Erro ao ler dados do Firestore: ${err.message || err}`);
  }
}
