import React, { useState } from "react";
import { SearchFilters as FilterType } from "../types";
import { Search, HelpCircle, Calendar, Filter, RotateCcw } from "lucide-react";

interface SearchFiltersProps {
  filters: FilterType;
  onFilterChange: (newFilters: FilterType) => void;
  onSearch: () => void;
  onReset?: () => void;
}

const BR_STATES = [
  { sigla: "", nome: "Todos os Estados (UF)" },
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" }
];

const MODALIDADES = [
  { id: "", nome: "Todas as Modalidades" },
  { id: "5", nome: "Pregão Eletrônico" },
  { id: "1", nome: "Concorrência" },
  { id: "dispensa", nome: "Dispensa de Licitação" },
  { id: "inexigibilidade", nome: "Inexigibilidade" },
  { id: "leilao", nome: "Leilão" },
  { id: "dialogo", nome: "Diálogo Competitivo" }
];

const ESFERAS = [
  { key: "", label: "Todas as Esferas" },
  { key: "Federal", label: "Federal" },
  { key: "Estadual", label: "Estadual" },
  { key: "Municipal", label: "Municipal" }
];

export default function SearchFilters({ filters, onFilterChange, onSearch, onReset }: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterType>(filters);

  const handleInputChange = (field: keyof FilterType, value: any) => {
    const updated = { ...localFilters, [field]: value };
    setLocalFilters(updated);
    onFilterChange(updated);
  };

  const handleReset = () => {
    const resetFilters: FilterType = {
      termo: "",
      dataInicial: "2026-06-01",
      dataFinal: "2026-06-20",
      uf: "",
      modalidade: "",
      esfera: "",
      situacao: "",
      forceMock: filters.forceMock
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
    if (onReset) {
      onReset();
    } else {
      setTimeout(() => onSearch(), 50);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-6" id="search-filters-container">
      <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-slate-100">
        <Filter className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
          Filtros de Pesquisa e Parametros PNCP
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Core keyword input */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-9 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 transition-all"
              placeholder="Pesquise por termo (ex: ar-condicionado, segurança, computadores, prefeitura...)"
              value={localFilters.termo}
              onChange={(e) => handleInputChange("termo", e.target.value)}
              id="input-termo"
            />
          </div>
          <div className="md:col-span-3 flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-slate-900 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-slate-800 transition-colors shadow-sm cursor-pointer flex items-center justify-center space-x-1.5"
              id="btn-submit-search"
            >
              <span>Buscar PNCP</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm transition-all cursor-pointer flex items-center justify-center border border-slate-200"
              title="Limpar Filtros"
              id="btn-reset-filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Detailed filters grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* UF Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
              Estado (UF Órgão)
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:bg-white"
              value={localFilters.uf}
              onChange={(e) => handleInputChange("uf", e.target.value)}
              id="select-uf"
            >
              {BR_STATES.map((state) => (
                <option key={state.sigla} value={state.sigla}>
                  {state.sigla ? `${state.sigla} - ${state.nome}` : state.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Modalidade */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
              Modalidade
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:bg-white"
              value={localFilters.modalidade}
              onChange={(e) => handleInputChange("modalidade", e.target.value)}
              id="select-modalidade"
            >
              {MODALIDADES.map((mod) => (
                <option key={mod.id} value={mod.id}>
                  {mod.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Esfera */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
              Esfera Governamental
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:bg-white"
              value={localFilters.esfera}
              onChange={(e) => handleInputChange("esfera", e.target.value)}
              id="select-esfera"
            >
              {ESFERAS.map((esfera) => (
                <option key={esfera.key} value={esfera.key}>
                  {esfera.label}
                </option>
              ))}
            </select>
          </div>

          {/* Situação */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
              Situação do Edital
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:bg-white"
              value={localFilters.situacao}
              onChange={(e) => handleInputChange("situacao", e.target.value)}
              id="select-situacao"
            >
              <option value="">Todas as Situações</option>
              <option value="publicada">Publicada</option>
              <option value="em andamento">Em andamento</option>
              <option value="aberta">Aberta</option>
              <option value="homologada">Homologada</option>
              <option value="encerrada">Encerrada</option>
            </select>
          </div>
        </div>

        {/* Date Filters block */}
        <div className="bg-slate-50 p-4 rounded-lg flex flex-col sm:flex-row items-center gap-4 border border-slate-100">
          <div className="flex items-center space-x-2 text-slate-500">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium uppercase tracking-wider">Publicação Edital:</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400">De</span>
            <input
              type="date"
              className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800"
              value={localFilters.dataInicial}
              onChange={(e) => handleInputChange("dataInicial", e.target.value)}
              id="date-inicio"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400">Até</span>
            <input
              type="date"
              className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800"
              value={localFilters.dataFinal}
              onChange={(e) => handleInputChange("dataFinal", e.target.value)}
              id="date-fim"
            />
          </div>

          <div className="sm:ml-auto text-[11px] text-slate-400 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Consultar no PNCP requer intervalos de datas de publicação.</span>
          </div>
        </div>
      </form>
    </div>
  );
}
