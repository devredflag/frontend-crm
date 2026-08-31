import { dataLocal } from "./data";

// Vocabulario do orcamento — o mesmo no painel de vendas e na ficha da empresa.
// Ficava duplicado nos dois arquivos e ja tinha comeco de divergencia nas cores.
export const STATUS_ORCAMENTO: Record<string, { label: string; color: string; bg: string }> = {
  rascunho:      { label: "Rascunho",      color: "#9FD3EA", bg: "rgba(86,101,115,0.12)" },
  enviado:       { label: "Enviado",       color: "#9FD3EA", bg: "rgba(159,211,234,0.55)" },
  em_negociacao: { label: "Em negociação", color: "#F2C879", bg: "rgba(214,137,16,0.13)" },
  aprovado:      { label: "Aprovado",      color: "#83DDA8", bg: "rgba(39,174,96,0.13)" },
  recusado:      { label: "Recusado",      color: "#F7B8B1", bg: "rgba(220,38,38,0.1)" },
};

/** Ordem em que o orcamento acontece — usada nos filtros e no dropdown. */
export const STATUS_ORDEM = ["rascunho", "enviado", "em_negociacao", "aprovado", "recusado"];

/** Nº legivel do orcamento a partir do UUID — ORC-2026-A3F1. */
export function numeroOrcamento(o: { orcamento_id: string; criado_em?: string | null }) {
  const ano = dataLocal(o.criado_em)?.getFullYear() ?? new Date().getFullYear();
  return `ORC-${ano}-${o.orcamento_id.slice(0, 4).toUpperCase()}`;
}
