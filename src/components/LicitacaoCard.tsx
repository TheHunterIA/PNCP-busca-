import React, { useState } from "react";
import { LicitacaoPNCP } from "../types";
import { 
  Building2, 
  Calendar, 
  Clock, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  DollarSign 
} from "lucide-react";

interface LicitacaoCardProps {
  key?: string;
  licitacao: LicitacaoPNCP;
  index: number;
}

export default function LicitacaoCard({ licitacao, index }: LicitacaoCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const {
    numeroControlePNCP,
    numeroLicitacao,
    objeto,
    valorEstimado,
    dataPublicacao,
    dataAberturaProposta,
    situacaoLicitacao,
    modalidadeNome,
    orgaoEntidade,
    linkOriginal
  } = licitacao;

  // Formatting helpers
  const valorFormatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(valorEstimado || 0);

  const formatarData = (dataStr?: string) => {
    if (!dataStr) return "Não informada";
    try {
      const data = new Date(dataStr);
      return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch {
      return dataStr;
    }
  };

  const formatarHora = (dataStr?: string) => {
    if (!dataStr) return "";
    try {
      const data = new Date(dataStr);
      return data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      }) + "h";
    } catch {
      return "";
    }
  };

  const copiarControle = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(numeroControlePNCP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Badge stylings based on esfera
  const getEsferaClass = (esf?: string) => {
    switch (esf?.toLowerCase()) {
      case "federal":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "estadual":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "municipal":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Badge stylings based on situacao
  const getSituacaoClass = (sit?: string) => {
    const s = sit?.toLowerCase() || "";
    if (s.includes("andamento") || s.includes("aberta")) {
      return "bg-gradient-to-r from-emerald-500 to-teal-600 text-white";
    }
    if (s.includes("publicada")) {
      return "bg-gradient-to-r from-blue-500 to-indigo-600 text-white";
    }
    if (s.includes("homologada") || s.includes("concluída")) {
      return "bg-gradient-to-r from-slate-700 to-slate-900 text-white";
    }
    return "bg-slate-400 text-white";
  };

  // UF colors
  const getUfClass = (uf?: string) => {
    const u = uf?.toUpperCase() || "BR";
    const colors: Record<string, string> = {
      SP: "bg-slate-900 text-white border-slate-950",
      RJ: "bg-blue-900 text-white border-blue-950",
      MG: "bg-red-800 text-white border-red-900",
      DF: "bg-yellow-500 text-slate-950 border-yellow-600",
      BA: "bg-teal-700 text-white border-teal-800",
      PR: "bg-emerald-800 text-white border-emerald-900",
      RS: "bg-rose-700 text-white border-rose-800",
      CE: "bg-yellow-600 text-slate-950 border-yellow-700",
      PE: "bg-indigo-800 text-white border-indigo-900",
      AM: "bg-red-700 text-white border-red-800",
      SC: "bg-amber-700 text-white border-amber-800",
      GO: "bg-green-700 text-white border-green-800",
      PA: "bg-red-900 text-white border-red-950",
    };
    return colors[u] || "bg-slate-200 text-slate-800 border-slate-300";
  };

  // Truncate text logic
  const isTooLong = objeto.length > 180;
  const displayText = expanded ? objeto : (isTooLong ? `${objeto.slice(0, 180)}...` : objeto);

  // Link to official PNCP or a search on PNCP for this control notice
  const targetLink = linkOriginal || `https://pncp.gov.br/app/editais/${orgaoEntidade?.cnpj || "000"}/${numeroControlePNCP}`;

  return (
    <div 
      className="bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-200 hover:border-slate-300 transition-all duration-300 flex flex-col h-full overflow-hidden"
      id={`licitacao-card-${numeroControlePNCP}`}
    >
      
      {/* Top Badges Bar */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 flex-wrap">
          {/* UF State Badge */}
          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getUfClass(orgaoEntidade?.uf)}`}>
            {orgaoEntidade?.uf || "BR"}
          </span>

          {/* Esfera Gov */}
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase ${getEsferaClass(orgaoEntidade?.esfera)}`}>
            {orgaoEntidade?.esfera || "Esfera"}
          </span>

          {/* Modalidade */}
          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-medium whitespace-nowrap">
            {modalidadeNome || "Licitação"}
          </span>
        </div>

        {/* Status Badge */}
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-sm ${getSituacaoClass(situacaoLicitacao)}`}>
          {situacaoLicitacao || "Indefinida"}
        </span>
      </div>

      {/* Main Content Area */}
      <div className="p-5 flex-1 flex flex-col">
        
        {/* Organ name and details */}
        <div className="flex items-start space-x-2.5 mb-3">
          <Building2 className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-700 tracking-wide uppercase line-clamp-2">
              {orgaoEntidade?.razaoSocial || "Órgão Não Informado"}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              CNPJ: {orgaoEntidade?.cnpj ? orgaoEntidade.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : "Não informado"}
            </span>
          </div>
        </div>

        {/* Objeto / Description of bidding notice */}
        <div className="flex-1 mb-4 flex flex-col justify-start">
          <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {displayText}
          </div>
          {isTooLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs font-semibold text-slate-800 hover:text-slate-950 inline-flex items-center space-x-0.5 transition-colors cursor-pointer self-start focus:outline-none"
              id={`btn-expand-${numeroControlePNCP}`}
            >
              <span>{expanded ? "Ler menos" : "Ler objeto completo"}</span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Key Contract Estimate Value - Highlighted card section */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Valor Estimado / Homologado
          </span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-sm font-semibold text-emerald-600">R$</span>
            <span className="text-xl font-extrabold text-emerald-600 tracking-tight">
              {valorEstimado ? valorEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}
            </span>
            {(!valorEstimado || valorEstimado === 0) && (
              <span className="text-xs text-slate-500 font-medium ml-1">
                (Não informado / Sigiloso)
              </span>
            )}
          </div>
        </div>

        {/* Timeline block */}
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
          <div>
            <span className="flex items-center space-x-1 text-slate-400 mb-1 font-medium transform">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Publicado em:</span>
            </span>
            <span className="block font-bold text-slate-700 ml-4.5">
              {formatarData(dataPublicacao)}
            </span>
          </div>

          <div>
            <span className="flex items-center space-x-1 text-slate-400 mb-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Abertura propostas:</span>
            </span>
            <span className="block font-bold text-slate-700 ml-4.5">
              {dataAberturaProposta ? (
                <>
                  {formatarData(dataAberturaProposta)}
                  <span className="text-[10px] text-slate-400 font-normal block">
                    {formatarHora(dataAberturaProposta)}
                  </span>
                </>
              ) : (
                "Ver Edital"
              )}
            </span>
          </div>
        </div>

      </div>

      {/* Footer Controls / Action Button */}
      <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 mt-auto">
        <div className="min-w-0 flex-1 mr-2">
          <div className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700/80 p-1.5 rounded border border-slate-700 transition-colors inline-flex max-w-full">
            <span className="text-[10px] text-slate-300 font-mono truncate select-all px-0.5">
              Nº {numeroLicitacao || "Edital"}
            </span>
            <button
              onClick={copiarControle}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5 shrink-0"
              title="Copiar número de controle PNCP"
              id={`btn-copy-${numeroControlePNCP}`}
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        <a
          href={targetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-md text-[11px] transform active:scale-95 transition-all text-center flex items-center gap-1 shrink-0"
          title="Ver o processo licitatório na íntegra no portal do PNCP"
          id={`link-original-${numeroControlePNCP}`}
        >
          <span>Edital</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

    </div>
  );
}
