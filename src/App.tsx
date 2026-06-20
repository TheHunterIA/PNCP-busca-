import React, { useState, useEffect, useCallback } from "react";
import { LicitacaoPNCP, SearchFilters as FilterType, ApiResponse } from "./types";
import Header from "./components/Header";
import StatsGrid from "./components/StatsGrid";
import SearchFilters from "./components/SearchFilters";
import LicitacaoCard from "./components/LicitacaoCard";
import { 
  Briefcase, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  Info, 
  Compass, 
  Globe2, 
  Sparkles,
  CheckCircle2, 
  Loader2,
  BookmarkCheck,
  Search
} from "lucide-react";

export default function App() {
  const [licitacoes, setLicitacoes] = useState<LicitacaoPNCP[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceData, setSourceData] = useState<"PNCP_LIVE" | "MOCK_FALLBACK" | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);
  
  // Pagination State
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // Filters State
  const [filters, setFilters] = useState<FilterType>({
    termo: "",
    dataInicial: "2026-06-01",
    dataFinal: "2026-06-20",
    uf: "",
    modalidade: "",
    esfera: "",
    situacao: "",
    forceMock: false
  });

  // Fetch function
  const fetchLicitacoes = useCallback(async (
    currentFilters: FilterType, 
    currentPage: number
  ) => {
    setLoading(true);
    setError(null);
    try {
      // Formatar datas para YYYYMMDD esperado pela API real se necessário
      const dIni = currentFilters.dataInicial.replace(/-/g, "");
      const dFim = currentFilters.dataFinal.replace(/-/g, "");

      const params = new URLSearchParams({
        termo: currentFilters.termo,
        dataInicial: dIni,
        dataFinal: dFim,
        uf: currentFilters.uf,
        modalidade: currentFilters.modalidade,
        esfera: currentFilters.esfera,
        situacao: currentFilters.situacao,
        pagina: String(currentPage),
        tamanho: "6", // 6 por página para grids responsivos perfeitos
        forceMock: String(currentFilters.forceMock)
      });

      const response = await fetch(`/api/licitacoes?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Não foi possível carregar os editais de licitação da API.");
      }

      const resData: ApiResponse = await response.json();
      
      if (resData.success) {
        setLicitacoes(resData.data || []);
        setTotalPaginas(resData.totalPaginas || 1);
        setTotalRegistros(resData.totalRegistros || 0);
        setSourceData(resData.source);
      } else {
        throw new Error(resData.message || "Erro desconhecido na consulta do PNCP.");
      }
    } catch (err: any) {
      console.error("Erro na busca de licitações:", err);
      setError(
          err.message || 
          "Houve uma falha na conexão com o servidor. Se a API pública do PNCP estiver instável, experimente ativar o 'Modo Simulado'."
      );
      // Fallback em caso de erro de rede completo
      setLicitacoes([]);
      setTotalPaginas(1);
      setTotalRegistros(0);
      setSourceData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch triggers when page or primitive filter indicators change
  // We use primitive keys for dependency array to align with useEffect rules
  const filterKeyStr = `${filters.termo}-${filters.uf}-${filters.modalidade}-${filters.esfera}-${filters.situacao}-${filters.dataInicial}-${filters.dataFinal}-${filters.forceMock}`;

  useEffect(() => {
    if (hasSearched) {
      fetchLicitacoes(filters, pagina);
    }
  }, [pagina, filterKeyStr, searchTrigger, fetchLicitacoes, hasSearched]);

  // Handle Search submit
  const handleSearchTrigger = () => {
    setPagina(1); // volta para a primeira página
    setHasSearched(true);
    setSearchTrigger(prev => prev + 1);
  };

  // Toggle mock state
  const handleToggleMock = () => {
    const updated = { ...filters, forceMock: !filters.forceMock };
    setFilters(updated);
    setPagina(1);
  };

  // Quick preset dates (Last 7 days, Last 15 days...)
  const setDateRangePreset = (daysAgo: number) => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - daysAgo);

    const format = (d: Date) => d.toISOString().split("T")[0];

    const updated = {
      ...filters,
      dataInicial: format(past),
      dataFinal: format(today)
    };
    setFilters(updated);
    setPagina(1);
    setHasSearched(true);
    setSearchTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" id="main-layout">
      
      {/* Portal Header */}
      <Header
        source={sourceData}
        loading={loading}
        onRefresh={() => fetchLicitacoes(filters, pagina)}
        forceMock={filters.forceMock}
        onToggleMock={handleToggleMock}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        
        {/* Portal Notice or welcome board */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4" id="welcome-alert">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700 shrink-0 home-icon">
              <Compass className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                Lei 14.133/2021 & Transparência Governamental
                <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded">Dica</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Este sistema integra-se diretamente à base do Portal Nacional de Contratações Públicas brasileiro, unificando editais e atas de compras federais, estaduais e municipais de forma centralizada e transparente.
              </p>
            </div>
          </div>
          
          {/* Quick Date Presets */}
          <div className="flex items-center gap-2 flex-wrap text-xs md:border-l md:border-slate-200 md:pl-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block w-full md:w-auto">Intervalo Rápido:</span>
            <button
              onClick={() => setDateRangePreset(7)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition font-medium cursor-pointer"
            >
              U7d (Últimos 7 dias)
            </button>
            <button
              onClick={() => setDateRangePreset(15)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition font-medium cursor-pointer"
            >
              U15d (Últimos 15 dias)
            </button>
            <button
              onClick={() => setDateRangePreset(30)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition font-medium cursor-pointer"
            >
              U30d (Últimos 30 dias)
            </button>
          </div>
        </div>

        {/* Dynamic Analytics Stats Widget */}
        {hasSearched && <StatsGrid licitacoes={licitacoes} loading={loading} />}

        {/* Search Parameter Section */}
        <SearchFilters
          filters={filters}
          onFilterChange={(updatedFilters) => setFilters(updatedFilters)}
          onSearch={handleSearchTrigger}
          onReset={handleResetToMainSearch}
        />

        {/* Error Notification Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" id="error-alert">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <span className="font-bold text-red-800 text-sm block">Falha de Comunicação PNCP</span>
                <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
            <button
              onClick={() => {
                // Auto switch to simulated data to guarantee a working demo
                setFilters({ ...filters, forceMock: true });
                setPagina(1);
              }}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 cursor-pointer shadow-sm"
              id="btn-auto-fallback-mock"
            >
              Mudar para Dados Simulados
            </button>
          </div>
        )}

        {!hasSearched ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto my-12 shadow-sm" id="onboarding-state">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4 border border-slate-200">
              <Search className="w-8 h-8 text-slate-500 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Pronto para pesquisar</h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-md mx-auto">
              Selecione os termos e filtros desejados acima e clique em <strong className="text-slate-900">Buscar PNCP</strong> para exibir os resultados do Portal Nacional de Contratações Públicas.
            </p>
          </div>
        ) : (
          <>
            {/* Results layout */}
            <div className="mb-4 flex items-center justify-between" id="results-meta">
              <div className="text-sm">
                <span className="text-slate-500">Exibindo </span>
                <span className="font-extrabold text-slate-800">{licitacoes.length}</span>
                <span className="text-slate-500"> de </span>
                <span className="font-extrabold text-slate-800">{loading ? "..." : totalRegistros}</span>
                <span className="text-slate-500"> editais encontrados</span>
              </div>

              {sourceData === "MOCK_FALLBACK" && (
                <div className="flex items-center space-x-1 py-1 px-2.5 bg-amber-50 text-amber-800 rounded-full border border-amber-200 text-[10px] font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Exibindo lote de dados simulados inteligentes</span>
                </div>
              )}
            </div>

            {/* Bidding Grid loader */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4" id="main-loader">
                <Loader2 className="w-12 h-12 text-slate-900 animate-spin" />
                <div className="text-center">
                  <span className="text-slate-700 font-bold text-sm block">Consultando Base Nacional do PNCP...</span>
                  <span className="text-xs text-slate-400 mt-1 block">Buscando atas e licitações vigentes no período</span>
                </div>
              </div>
            ) : licitacoes.length === 0 ? (
              /* Zero state container */
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto my-8" id="empty-state">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4 border border-slate-100">
                  <Briefcase className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Nenhuma Licitação Encontrada</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-md mx-auto">
                  Experimente alterar os termos de pesquisa, ampliar o período de publicação (atualmente de {filters.dataInicial.split('-').reverse().join('/')} até {filters.dataFinal.split('-').reverse().join('/')}) ou selecionar outros estados.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={handleResetToMainSearch}
                    className="px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    id="btn-reset-empty"
                  >
                    Limpar Filtros e Reestudar
                  </button>
                  
                  {!filters.forceMock && (
                    <button
                      onClick={() => {
                        setFilters({ ...filters, forceMock: true });
                        setPagina(1);
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm"
                      id="btn-force-mock-empty"
                    >
                      Ver banco de editais simulados
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Cards Grid Wrapper */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="licitacoes-cards-grid">
                {licitacoes.map((licitacao, idx) => (
                  <LicitacaoCard 
                    key={licitacao.numeroControlePNCP} 
                    licitacao={licitacao} 
                    index={idx}
                  />
                ))}
              </div>
            )}

            {/* Responsive Pagination Controls */}
            {totalPaginas > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6" id="pagination-controls">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Página {pagina} de {totalPaginas}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagina((prev) => Math.max(prev - 1, 1))}
                    disabled={pagina === 1 || loading}
                    className="px-4 py-2 border border-slate-200 hover:border-slate-300 disabled:opacity-40 text-slate-700 bg-white hover:bg-slate-50 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1"
                    id="btn-page-prev"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>

                  <div className="hidden md:flex items-center space-x-1">
                    {Array.from({ length: Math.min(totalPaginas, 5) }).map((_, i) => {
                      const targetPage = i + 1;
                      return (
                        <button
                          key={targetPage}
                          onClick={() => setPagina(targetPage)}
                          className={`w-8 h-8 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            pagina === targetPage
                              ? "bg-slate-900 text-white"
                              : "border border-slate-100 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {targetPage}
                        </button>
                      );
                    })}
                    {totalPaginas > 5 && <span className="text-slate-400 px-1 font-bold">...</span>}
                  </div>

                  <button
                    onClick={() => setPagina((prev) => Math.min(prev + 1, totalPaginas))}
                    disabled={pagina === totalPaginas || loading}
                    className="px-4 py-2 border border-slate-200 hover:border-slate-300 disabled:opacity-40 text-slate-700 bg-white hover:bg-slate-50 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1"
                    id="btn-page-next"
                  >
                    <span>Próximo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* Footer Informational Hub */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-14" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2 text-white font-bold mb-3">
                <Globe2 className="w-4 h-4 text-amber-500" />
                <span>Acordo PNCP Integrado</span>
              </div>
              <p className="leading-relaxed text-slate-400">
                O Portal Nacional de Contratações Públicas é o sítio eletrônico oficial estruturado para divulgação centralizada dos atos exigidos pela Lei Federal nº 14.133, de 1º de abril de 2021.
              </p>
            </div>
            <div>
              <div className="flex items-center space-x-2 text-white font-bold mb-3">
                <BookmarkCheck className="w-4 h-4 text-emerald-500" />
                <span>Foco em Praticidade</span>
              </div>
              <p className="leading-relaxed text-slate-400">
                Pesquise pregões de TI, engenharia asfáltica, manutenção e insumos médicos em todos os entes públicos da União de forma rápida e com métricas agregadas automáticas.
              </p>
            </div>
            <div>
              <div className="flex items-center space-x-2 text-white font-bold mb-3">
                <Info className="w-4 h-4 text-sky-400" />
                <span>Modo de Funcionamento</span>
              </div>
              <p className="leading-relaxed text-slate-400">
                Se a API pública do Governo sofrer lentidão ou estiver fora de operação durante feriados ou manutenções, o sistema aciona de forma automatizada nosso lote armazenado em cache para demonstração contínua.
              </p>
            </div>
          </div>
          
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
            <div>
              <span>© 2026 Painel de Licitações PNCP. Produzido com foco em Transparência Operacional.</span>
            </div>
            <div className="flex space-x-4">
              <span className="hover:text-slate-300 transition-colors">Termos de Uso</span>
              <span>•</span>
              <span className="hover:text-slate-300 transition-colors">Nova Lei de Licitações (14.133)</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );

  function handleResetToMainSearch() {
    const defaultFilters: FilterType = {
      termo: "",
      dataInicial: "2026-06-01",
      dataFinal: "2026-06-20",
      uf: "",
      modalidade: "",
      esfera: "",
      situacao: "",
      forceMock: filters.forceMock
    };
    setFilters(defaultFilters);
    setPagina(1);
    setHasSearched(false);
    setLicitacoes([]);
    setTotalPaginas(1);
    setTotalRegistros(0);
  }
}
