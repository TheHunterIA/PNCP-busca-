import { LicitacaoPNCP } from "../types";
import { DollarSign, Percent, TrendingUp, Landmark } from "lucide-react";

interface StatsGridProps {
  licitacoes: LicitacaoPNCP[];
  loading: boolean;
}

export default function StatsGrid({ licitacoes, loading }: StatsGridProps) {
  // Calculate statistics from the results
  const totalVolume = licitacoes.reduce((acc, curr) => acc + (curr.valorEstimado || 0), 0);
  
  const largestContract = licitacoes.reduce((max, curr) => {
    return (curr.valorEstimado || 0) > max ? (curr.valorEstimado || 0) : max;
  }, 0);

  const spheres = licitacoes.reduce((acc: Record<string, number>, curr) => {
    const esfera = curr.orgaoEntidade?.esfera || "Outra";
    acc[esfera] = (acc[esfera] || 0) + 1;
    return acc;
  }, {});

  const mostCommonEsfera = Object.entries(spheres).reduce((max, curr) => {
    return curr[1] > (max[1] || 0) ? curr : max;
  }, ["-", 0])[0];

  const formattedTotal = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(totalVolume);

  const formattedLargest = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(largestContract);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="stats-grid">
      
      {/* Total Volume */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
        <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
          <DollarSign className="w-6 h-6" />
        </div>
        <div>
          <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
            Volume Estimado Total
          </span>
          <span className="block text-lg font-bold text-slate-800 tracking-tight mt-0.5">
            {loading ? "Calculando..." : formattedTotal}
          </span>
        </div>
      </div>

      {/* Largest Contract */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
        <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
            Maior Licitação do Lote
          </span>
          <span className="block text-lg font-bold text-slate-800 tracking-tight mt-0.5">
            {loading ? "Buscando..." : largestContract > 0 ? formattedLargest : "R$ 0,00"}
          </span>
        </div>
      </div>

      {/* Main Sphere */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
        <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
          <Landmark className="w-6 h-6" />
        </div>
        <div>
          <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
            Esfera Predominante
          </span>
          <span className="block text-lg font-bold text-slate-800 tracking-tight mt-0.5 capitalize">
            {loading ? "Analisando..." : mostCommonEsfera !== "-" ? mostCommonEsfera : "Nenhuma"}
          </span>
        </div>
      </div>

      {/* Loaded quantity */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
        <div className="p-3 bg-slate-50 rounded-lg text-slate-600">
          <Percent className="w-6 h-6" />
        </div>
        <div>
          <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
            Quantidade Atual
          </span>
          <span className="block text-lg font-bold text-slate-800 tracking-tight mt-0.5">
            {licitacoes.length} {licitacoes.length === 1 ? "licitação" : "licitações"}
          </span>
        </div>
      </div>

    </div>
  );
}
