import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCcw, 
  ExternalLink, 
  FileText, 
  Calendar, 
  Building2, 
  MapPin,
  ChevronLeft,
  ChevronRight,
  Database,
  Terminal,
  Activity,
  Trash2,
  Info
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Licitacao {
  numeroControlePNCP: string;
  objeto: string;
  numeroLicitacao?: string;
  anoLicitacao?: number;
  orgaoEntidade: {
    cnpj: string;
    razaoSocial: string;
    uf: string;
    esfera: string;
  };
  modalidadeNome: string;
  dataPublicacao: string;
  linkOriginal?: string;
  valorEstimado?: number;
  situacaoLicitacao?: string;
}

interface SyncStats {
  lastSyncTime: string;
  lastSyncPeriod: string;
  fetchedCount: number;
  savedCount: number;
  success: boolean;
  totalRegistros?: number;
  logs?: string[];
  errorMessage?: string;
}

export default function App() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState({
    cnpj: '',
    catmat: '',
    uf: '',
    esfera: '',
    modalidade: ''
  });

  const fetchLicitacoes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: search,
        pagina: page.toString(),
        limite: '10',
        cnpj: advancedFilters.cnpj,
        catmat: advancedFilters.catmat,
        uf: advancedFilters.uf,
        esfera: advancedFilters.esfera,
        modalidade: advancedFilters.modalidade
      });
      const res = await fetch(`/api/licitacoes?${params}`);
      const data = await res.json();
      setLicitacoes(data.items || []);
      setTotal(data.total || 0);
      setHasMore(data.total > page * 10);
    } catch (error) {
      console.error('Erro ao buscar licitações:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const res = await fetch('/api/licitacoes/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {}
  };

  const handleSync = async () => {
    setSyncing(true);
    setShowLogs(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        checkSyncStatus();
        fetchLicitacoes();
      }
    } catch (error) {
      console.error('Erro ao iniciar sincronismo:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Deseja realmente apagar TODOS os dados do banco de dados local?")) return;
    try {
      await fetch('/api/clear', { method: 'POST' });
      fetchLicitacoes();
      checkSyncStatus();
    } catch (e) {}
  };

  useEffect(() => {
    fetchLicitacoes();
    checkSyncStatus();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLicitacoes();
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 pb-20 font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white text-[10px] font-bold py-1 px-4 flex items-center justify-between uppercase tracking-[0.1em]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-green-400" /> Sistema Ativo</span>
          <span className="opacity-50">Conexão: Firebase Firestore</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{total} Registros Indexados</span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2.5 rounded-xl shadow-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">PNCP <span className="text-blue-600">Warehouse</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Explorador de Dados Público 14.133</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowLogs(!showLogs)}
              className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
              title="Logs do Sistema"
            >
              <Terminal className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCcw className={cn("w-4 h-4", syncing && "animate-spin")} />
              {syncing ? "Processando..." : "Sincronizar"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Sync Logs Section */}
        {showLogs && (
          <div className="mb-10 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl animate-in slide-in-from-top-4 duration-300">
            <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logs de Sincronismo Firestore</span>
              </div>
              <button onClick={() => setShowLogs(false)} className="text-slate-500 hover:text-white text-xs">Fechar</button>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto font-mono text-[11px] text-blue-300/80 space-y-1">
              {stats?.logs && stats.logs.length > 0 ? (
                stats.logs.map((log, i) => <div key={i} className="border-l border-slate-800 pl-3 leading-relaxed">{log}</div>)
              ) : (
                <div className="text-slate-600 italic">Nenhum log disponível. Inicie um sincronismo para ver os dados.</div>
              )}
              {syncing && <div className="animate-pulse text-blue-400">AGUARDANDO STREAM DE DADOS PNCP...</div>}
              {stats?.errorMessage && <div className="text-red-400 font-bold bg-red-950/30 p-2 mt-2 rounded">ERRO: {stats.errorMessage}</div>}
            </div>
          </div>
        )}

        {/* Search & Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          <div className="lg:col-span-9">
            <div className="flex flex-col gap-4">
              <form onSubmit={handleSearch} className="relative group">
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="PROCURAR POR CNPJ, ÓRGÃO OU OBJETO..." 
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl py-5 pl-14 pr-6 shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 text-sm font-medium tracking-tight"
                />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                      showFilters ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Filtros
                  </button>
                  {search && <button type="button" onClick={() => {setSearch(''); setPage(1);}} className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-900 pr-2 border-r border-slate-100">Limpar</button>}
                  <button type="submit" className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all">Pesquisar</button>
                </div>
              </form>

              {/* Advanced Filter Panel */}
              {showFilters && (
                <div className="bg-white border-2 border-blue-100 rounded-3xl p-8 shadow-xl shadow-blue-500/5 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">CNPJ do Fornecedor / Órgão</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={advancedFilters.cnpj}
                        onChange={(e) => setAdvancedFilters(prev => ({...prev, cnpj: e.target.value}))}
                        placeholder="00.000.000/0000-00"
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-3 px-4 text-sm font-bold focus:bg-white focus:border-blue-500 transition-all outline-none"
                      />
                      <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Código CATMAT / Material</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={advancedFilters.catmat}
                        onChange={(e) => setAdvancedFilters(prev => ({...prev, catmat: e.target.value}))}
                        placeholder="Ex: Alimentos, Software..."
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-3 px-4 text-sm font-bold focus:bg-white focus:border-blue-500 transition-all outline-none"
                      />
                      <FileText className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Localização (UF)</label>
                    <div className="relative">
                      <select 
                        value={advancedFilters.uf}
                        onChange={(e) => setAdvancedFilters(prev => ({...prev, uf: e.target.value}))}
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-3 px-4 text-sm font-bold focus:bg-white focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer"
                      >
                        <option value="">Brasil (Todos)</option>
                        {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                      <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                    </div>
                  </div>

                  <div className="md:col-span-3 pt-2 border-t border-slate-50 flex items-center justify-end">
                     <button 
                       type="button"
                       onClick={() => {
                         setAdvancedFilters({ cnpj: '', catmat: '', uf: '', esfera: '', modalidade: '' });
                         setSearch('');
                       }}
                       className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors"
                     >
                       Limpar Todos os Filtros
                     </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="lg:col-span-3 grid grid-cols-1 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:scale-110 transition-transform">
                <Database className="w-20 h-20 text-slate-900" />
              </div>
              <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Base de Dados</div>
              <div className="text-3xl font-black text-slate-900">{total}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Registros Locais</div>
            </div>
            
            <button 
              onClick={handleClear}
              className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-red-500/50 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Wipe Firestore
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-8 flex items-center gap-3 bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-blue-800">
           <Info className="w-5 h-5 shrink-0" />
           <p className="text-xs font-medium leading-relaxed">
             Este explorer consulta apenas o banco de dados interno sincronizado. Se não encontrar o que procura, utilize o botão <b>Sincronizar</b> para buscar novas atualizações do Portal Nacional de Contratações Públicas.
           </p>
        </div>

        {/* Results List */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-500/10 border-t-blue-600 rounded-full animate-spin"></div>
                <Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-blue-600" />
              </div>
              <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em]">Acessando Firestore...</p>
            </div>
          ) : licitacoes.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-4">
                {licitacoes.map((item) => (
                  <div key={item.numeroControlePNCP} className="bg-white border-2 border-slate-100 rounded-3xl p-8 shadow-sm hover:border-blue-500/20 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <div className="text-[9px] font-mono text-slate-300">ID: {item.numeroControlePNCP.split('-').pop()}</div>
                    </div>
                    
                    <div className="flex flex-col gap-6">
                      {/* Badge Line */}
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="bg-slate-900 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
                          {item.modalidadeNome}
                        </span>
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
                          ESFERA {item.orgaoEntidade.esfera}
                        </span>
                        <span className="text-slate-300 font-mono text-[10px] tracking-tight">#{item.numeroControlePNCP}</span>
                        {item.situacaoLicitacao && (
                          <span className={cn(
                            "text-[9px] font-black uppercase px-2 tracking-wider",
                            item.situacaoLicitacao.includes("Public") ? "text-green-500" : "text-blue-500"
                          )}>
                            ● {item.situacaoLicitacao}
                          </span>
                        )}
                      </div>

                      {/* Content Header */}
                      <div className="space-y-4">
                        <h3 className="text-xl font-bold leading-tight text-slate-900 lg:pr-20 group-hover:text-blue-600 transition-colors">
                          {item.objeto}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 py-4 border-y border-slate-50">
                          <div className="space-y-1">
                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Órgão / Entidade</div>
                            <div className="flex items-start gap-2">
                              <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                              <span className="text-sm font-bold text-slate-700 leading-tight">{item.orgaoEntidade.razaoSocial}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 pl-6">CNPJ: {item.orgaoEntidade.cnpj}</div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Localização</div>
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              <span>{item.orgaoEntidade.uf}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Publicação</div>
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span>{new Date(item.dataPublicacao).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Valor Estimado</div>
                            <div className="text-lg font-black text-blue-600">
                              {item.valorEstimado ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorEstimado) : 'Sob Consulta'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-4">
                           <div className="text-[10px] font-bold text-slate-400">Licitação: {item.numeroLicitacao}/{item.anoLicitacao}</div>
                        </div>
                        <a 
                          href={item.linkOriginal || `https://pncp.gov.br/app/editais/${item.numeroControlePNCP}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 bg-slate-900 group-hover:bg-blue-600 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                        >
                          Detalhes PNCP
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex flex-col items-center gap-6 pt-12">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0,0); }}
                    disabled={page === 1}
                    className="h-12 w-12 flex items-center justify-center border-2 border-slate-100 rounded-2xl disabled:opacity-30 hover:border-blue-500 hover:text-blue-500 text-slate-400 transition-all active:scale-90"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="bg-white border-2 border-slate-100 px-8 h-12 flex items-center justify-center rounded-2xl shadow-sm text-sm font-black text-slate-700 uppercase tracking-widest">
                    Página {page}
                  </div>
                  <button 
                    onClick={() => { setPage(p => p + 1); window.scrollTo(0,0); }}
                    disabled={!hasMore}
                    className="h-12 w-12 flex items-center justify-center border-2 border-slate-100 rounded-2xl disabled:opacity-30 hover:border-blue-500 hover:text-blue-500 text-slate-400 transition-all active:scale-90"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Data Warehouse Explorador v1.2</p>
              </div>
            </>
          ) : (
            <div className="bg-white border-4 border-dashed border-slate-100 rounded-[40px] py-32 text-center shadow-inner">
              <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                <FileText className="w-10 h-10 text-slate-200" />
              </div>
              <h4 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Banco de Dados Vazio</h4>
              <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto px-6 leading-relaxed">
                Nenhum registro foi encontrado no Firestore para os filtros aplicados. Clique no botão de sincronismo para importar dados reais do Governo Federal.
              </p>
              <button 
                onClick={handleSync}
                className="mt-10 bg-slate-900 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform"
              >
                Iniciar Carga de Dados Agora
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Stats Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 py-3 px-6 z-20 transition-transform translate-y-0 group hover:translate-y-[-4px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
           <div className="flex items-center gap-6">
             <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Firestore Online</span>
             <span>Último Sync: {stats?.lastSyncTime ? new Date(stats.lastSyncTime).toLocaleTimeString() : 'Pendente'}</span>
           </div>
           <div className="flex items-center gap-2">
              <span>Filtros Federativos: 14.133</span>
              <span className="text-slate-200 mx-2">|</span>
              <span className="text-blue-600">AI Studio PNCP v1</span>
           </div>
        </div>
      </footer>
    </div>
  );
}
