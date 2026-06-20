import { Gavel, Search, ShieldCheck, Database, RefreshCw } from "lucide-react";

interface HeaderProps {
  source: "PNCP_LIVE" | "MOCK_FALLBACK" | null;
  loading: boolean;
  onRefresh: () => void;
  forceMock: boolean;
  onToggleMock: () => void;
}

export default function Header({ source, loading, onRefresh, forceMock, onToggleMock }: HeaderProps) {
  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Agency identity */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500 rounded-lg text-slate-950 shadow-inner flex items-center justify-center">
              <Gavel className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
                  Portal Transparência
                </span>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-slate-800 text-slate-300 rounded border border-slate-700">
                  PNCP v1.0
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                Painel de Licitações do PNCP
              </h1>
            </div>
          </div>

          {/* Connection status and source toggles */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Live API toggle */}
            <button
              onClick={onToggleMock}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border cursor-pointer ${
                forceMock
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
              }`}
              title="Alternar entre API ao vivo do PNCP ou banco de dados simulado local"
              id="btn-toggle-mock"
            >
              {forceMock ? (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>Modo Simulado (Local)</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Integrado com PNCP (Live)</span>
                </>
              )}
            </button>

            {/* Connection badge */}
            {source && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider ${
                source === "PNCP_LIVE" 
                  ? "bg-emerald-600 text-white" 
                  : "bg-indigo-600 text-white"
              }`}>
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span>
                  {source === "PNCP_LIVE" ? "Live PNCP" : "Backup / Local"}
                </span>
              </div>
            )}

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 text-slate-300 disabled:text-slate-500 rounded-md transition-all duration-200 border border-slate-700 cursor-pointer flex items-center justify-center"
              title="Atualizar dados de licitações"
              id="btn-refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
}
