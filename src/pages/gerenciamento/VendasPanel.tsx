import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { getToken } from "../../services/auth";
import useIsMobile from "../../hooks/useIsMobile";
import { openEmail, openWhatsApp } from "../../utils/commPrefs";
import {
  Plus, Send, Trash2, X, FileText, Package, Check, AlertCircle, Loader2,
  DollarSign, Wallet, Target, CalendarCheck, ArrowRight, Filter,
  ChevronDown, Download, Upload, FileSpreadsheet, AlertTriangle, Hash,
} from "lucide-react";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

// Fluxo do orçamento, na ordem em que acontece.
const STATUS_INFO: Record<string, { label: string; color:string; bg: string }> = {
  rascunho:      { label: "Rascunho",      color:"#9FD3EA", bg: "rgba(86,101,115,0.12)"  },
  enviado:       { label: "Enviado",       color:"#9FD3EA", bg: "rgba(159,211,234,0.55)"  },
  em_negociacao: { label: "Em negociação", color:"#F2C879", bg: "rgba(214,137,16,0.13)"  },
  aprovado:      { label: "Aprovado",      color:"#83DDA8", bg: "rgba(39,174,96,0.13)"   },
  recusado:      { label: "Recusado",      color:"#F7B8B1", bg: "rgba(220,38,38,0.1)"    },
};
const STATUS_ORDEM = ["rascunho", "enviado", "em_negociacao", "aprovado", "recusado"];

const css = `
  /* flex-shrink:0 e o que faz a lista aparecer inteira: o painel e uma coluna
     flex com overflow:auto, e sem isso os cards encolhem para caber na altura
     da tela em vez de deixarem o painel rolar -- com overflow:hidden no card,
     o que sobra some. O backdrop-filter saiu junto: o fundo agora e opaco
     (nao havia o que borrar) e ele criava bloco de contencao para position:fixed,
     que foi o que cortou os modais de importacao e de orcamento. */
  .vp-card { background:#143354; border:1px solid rgba(126,176,219,0.16); border-radius:16px; flex-shrink:0; }
  .vp-inner { background:rgba(18,59,94,0.55); border:1px solid rgba(159,211,234,0.18); border-radius:12px; }
  .vp-num { font-variant-numeric:tabular-nums; }
  .vp-table { width:100%; border-collapse:collapse; font-size:12.5px; }
  .vp-table thead th { text-align:left; padding:10px 14px; font-size:10px; letter-spacing:0.07em; text-transform:uppercase; color:#9FD3EA; font-weight:800; border-bottom:1px solid rgba(159,211,234,0.18); white-space:nowrap; }
  .vp-table tbody td { padding:11px 14px; border-bottom:1px solid rgba(159,211,234,0.18); color:#EAF6FB; }
  .vp-table tbody tr:last-child td { border-bottom:0; }
  .vp-table tbody tr { transition:background 0.14s; }
  .vp-table tbody tr:hover { background:rgba(46,111,149,0.05); }
  .vp-table .r { text-align:right; }
  .vp-row-link { cursor:pointer; }
  .vp-ghost { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; color:#EAF6FB; border:1px solid rgba(159,211,234,0.18); border-radius:9px; padding:6px 11px; background:rgba(18,59,94,0.55); cursor:pointer; transition:all 0.15s; font-family:inherit; }
  .vp-ghost:hover { color:#EAF6FB; border-color:rgba(159,211,234,0.30); }
  .vp-icon-btn { display:flex; align-items:center; justify-content:center; border:none; cursor:pointer; border-radius:8px; transition:all 0.15s; }
  .vp-icon-btn:hover { filter:brightness(0.94); }
  .vp-chip { padding:5px 12px; border-radius:20px; border:1.5px solid rgba(159,211,234,0.18); background:rgba(18,59,94,0.55); font-size:11px; font-weight:700; cursor:pointer; transition:all 0.15s; color:#EAF6FB; font-family:inherit; }
  .vp-chip:hover { border-color:rgba(159,211,234,0.30); }
  .vp-tab { display:flex; align-items:center; gap:6px; padding:10px 4px; margin-right:18px; border:none; background:none; cursor:pointer; font-family:inherit; font-size:13px; border-bottom:2.5px solid transparent; margin-bottom:-1px; transition:color 0.15s; }
  .vp-bar { border-radius:5px 5px 0 0; background:rgba(46,111,149,0.22); transition:background 0.15s; }
  .vp-bar.hi { background:linear-gradient(180deg,#2E6F95,#2E6F95); }
  .vp-bar:hover { background:#2E6F95; }
  .vp-facts > div { display:flex; justify-content:space-between; gap:10px; padding:7px 0; font-size:12.5px; border-bottom:1px solid rgba(159,211,234,0.18); }
  .vp-facts > div:last-child { border-bottom:0; }
  .vp-catalogo-btn:hover:not(:disabled) { border-color:rgba(159,211,234,0.30) !important; box-shadow:0 4px 14px rgba(41,128,185,0.20) !important; transform:translateY(-1px); }
  .vp-catalogo-btn:focus-visible { outline:2px solid rgba(159,211,234,0.30); outline-offset:2px; }
  .vp-catalogo-item:hover { background:rgba(46,111,149,0.07); }
  .vp-catalogo-item:focus-visible { outline:2px solid rgba(159,211,234,0.30); outline-offset:-2px; }
  .vp-catalogo-item:last-child { border-bottom:0; }
  .vp-avulso:focus-visible { outline:2px solid rgba(159,211,234,0.30); outline-offset:2px; }
  .vp-import-row:nth-child(even) { background:rgba(46,111,149,0.035); }
`;

interface Equipamento {
  equipamento_id: string;
  codigo: string | null;      // SKU — identifica o item numa reimportação
  nome: string;
  descricao: string | null;
  preco_base: number;
  quantidade: number;         // saldo em estoque
  ativo: boolean;
}
interface Item {
  equipamento_id: string | null;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
}
interface Orcamento {
  orcamento_id: string;
  empresa_id: string;
  empresa_nome: string | null;
  titulo: string | null;
  observacoes: string | null;
  status: string;
  total: number;
  data_envio: string | null;
  data_decisao: string | null;
  criado_em: string | null;
  motivo_recusa: string | null;
  itens?: Item[];
}
interface Insights {
  por_status: Record<string, { total: number; valor: number }>;
  total_orcamentos: number;
  valor_em_aberto: number;
  valor_aprovado: number;
  taxa_conversao: number;
  equipamentos_mais_orcados: { nome: string; quantidade: number; valor: number }[];
}
interface EmpresaOpt { empresa_id: string; nome: string }

// GET /orcamentos/{id}/previa-email — conteúdo pronto para envio manual.
interface PreviaEmail {
  destino: string | null;
  telefone: string | null;
  empresa_nome: string;
  assunto: string;
  texto: string;
}

function brl(v?: number | null) {
  return `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function brlCurto(v?: number | null) {
  const n = Number(v || 0);
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return brl(n);
}
function formatDate(v?: string | null) {
  return v ? new Date(v).toLocaleDateString("pt-BR") : "—";
}
/** Nº legível do orçamento a partir do UUID — ORC-2026-A3F1 */
function numeroOrcamento(o: Orcamento) {
  const ano = o.criado_em ? new Date(o.criado_em).getFullYear() : new Date().getFullYear();
  return `ORC-${ano}-${o.orcamento_id.slice(0, 4).toUpperCase()}`;
}

export default function VendasPanel({ empresas }: { empresas: EmpresaOpt[] }) {
  const isMobile = useIsMobile();
  const [sub, setSub] = useState<"orcamentos" | "equipamentos">("orcamentos");
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [editando, setEditando] = useState<Orcamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  // Quando o Resend recusa, o orçamento NÃO vira "enviado" (seria mentira: o
  // cliente não recebeu). Guardamos o motivo e a prévia para o vendedor mandar
  // por conta própria.
  const [falhaEnvio, setFalhaEnvio] = useState<{ id: string; motivo: string; previa: PreviaEmail | null } | null>(null);

  const hdrs = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken() || ""}`,
  });

  const fetchTudo = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, eRes, iRes] = await Promise.all([
        fetch(`${API}/orcamentos`, { headers: hdrs() }),
        fetch(`${API}/equipamentos`, { headers: hdrs() }),
        fetch(`${API}/vendas/insights`, { headers: hdrs() }),
      ]);
      if (oRes.ok) setOrcamentos(await oRes.json());
      if (eRes.ok) setEquipamentos(await eRes.json());
      if (iRes.ok) setInsights(await iRes.json());
    } catch {
      setErro("Não foi possível carregar os dados de vendas.");
    }
    setLoading(false);
  }, []);

  // Carga inicial só na montagem.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchTudo(); }, []);

  // Valor aprovado por mês, dos últimos 6 meses — calculado do que já temos.
  const serieMensal = useMemo(() => {
    const meses: { rotulo: string; valor: number }[] = [];
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({ rotulo: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), valor: 0 });
    }
    orcamentos.filter(o => o.status === "aprovado").forEach(o => {
      const ref = o.data_decisao || o.data_envio || o.criado_em;
      if (!ref) return;
      const d = new Date(ref);
      const diff = (hoje.getFullYear() - d.getFullYear()) * 12 + (hoje.getMonth() - d.getMonth());
      if (diff >= 0 && diff <= 5) meses[5 - diff].valor += Number(o.total || 0);
    });
    return meses;
  }, [orcamentos]);

  const aprovados = orcamentos.filter(o => o.status === "aprovado");
  const ticketMedio = aprovados.length ? (insights?.valor_aprovado || 0) / aprovados.length : 0;
  const ultimaVenda = aprovados
    .map(o => o.data_decisao || o.data_envio)
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || null;

  const visiveis = filtroStatus === "todos"
    ? orcamentos
    : orcamentos.filter(o => o.status === filtroStatus);

  const mudarStatus = async (id: string, status: string) => {
    let motivo_recusa: string | null = null;
    if (status === "recusado") {
      const m = window.prompt("Motivo da recusa (opcional)");
      if (m === null) return;
      motivo_recusa = m.trim() || null;
    }
    try {
      const res = await fetch(`${API}/orcamentos/${id}/status`, {
        method: "PUT", headers: hdrs(), body: JSON.stringify({ status, motivo_recusa }),
      });
      if (res.ok) fetchTudo(); else setErro("Não foi possível mudar o status.");
    } catch { setErro("Erro de conexão ao mudar o status."); }
  };

  const enviar = async (id: string) => {
    setEnviandoId(id); setErro(null); setFalhaEnvio(null);
    try {
      const res = await fetch(`${API}/orcamentos/${id}/enviar`, { method: "POST", headers: hdrs() });
      if (res.ok) { fetchTudo(); setEnviandoId(null); return; }
      const d = await res.json().catch(() => ({}));
      const motivo = typeof d.detail === "string" ? d.detail : "Não foi possível enviar o orçamento.";
      // 502 = o email não saiu, mas o orçamento está íntegro. Oferecemos o
      // caminho manual em vez de deixar o vendedor sem saída.
      if (res.status === 502) {
        let previa: PreviaEmail | null = null;
        try {
          const pRes = await fetch(`${API}/orcamentos/${id}/previa-email`, { headers: hdrs() });
          if (pRes.ok) previa = await pRes.json();
        } catch { /* sem prévia, mostramos só o motivo */ }
        setFalhaEnvio({ id, motivo, previa });
      } else {
        setErro(motivo);
      }
    } catch { setErro("Erro de conexão ao enviar."); }
    setEnviandoId(null);
  };

  // Depois de enviar por fora, o vendedor marca o status na mão — o sistema não
  // tem como saber que o email saiu por outro canal.
  const marcarComoEnviado = async (id: string) => {
    try {
      const res = await fetch(`${API}/orcamentos/${id}/status`, {
        method: "PUT", headers: hdrs(), body: JSON.stringify({ status: "enviado" }),
      });
      if (res.ok) { setFalhaEnvio(null); fetchTudo(); }
      else setErro("Não foi possível atualizar o status.");
    } catch { setErro("Erro de conexão ao atualizar o status."); }
  };

  const excluir = async (id: string) => {
    if (!window.confirm("Excluir este orçamento?")) return;
    try {
      const res = await fetch(`${API}/orcamentos/${id}`, { method: "DELETE", headers: hdrs() });
      if (res.ok) fetchTudo();
    } catch { setErro("Erro ao excluir."); }
  };

  const abrirExistente = async (id: string) => {
    try {
      const res = await fetch(`${API}/orcamentos/${id}`, { headers: hdrs() });
      if (res.ok) setEditando(await res.json());
    } catch { setErro("Erro ao abrir o orçamento."); }
  };

  const abrirNovo = () => setEditando({
    orcamento_id: "", empresa_id: "", empresa_nome: null, titulo: "", observacoes: "",
    status: "rascunho", total: 0, data_envio: null, data_decisao: null,
    criado_em: null, motivo_recusa: null, itens: [],
  });

  const kpis = [
    { lab: "Valor aprovado", val: brlCurto(insights?.valor_aprovado), sub: `${aprovados.length} orçamento${aprovados.length === 1 ? "" : "s"} fechado${aprovados.length === 1 ? "" : "s"}`, icon: DollarSign, cor: "#83DDA8" },
    { lab: "Em aberto",      val: brlCurto(insights?.valor_em_aberto), sub: "enviados e em negociação",  icon: Wallet,        cor: "#C9B6E4" },
    { lab: "Ticket médio",   val: brlCurto(ticketMedio),               sub: "por orçamento aprovado",    icon: Target,        cor: "#F2C879" },
    { lab: "Último fechamento", val: formatDate(ultimaVenda),          sub: ultimaVenda ? "última aprovação" : "nada fechado ainda", icon: CalendarCheck, cor: "#9FD3EA" },
  ];

  return (
    <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px 14px 32px" : "18px 24px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{css}</style>

      {/* Faixa de indicadores */}
      <section className="vp-card" style={{ padding: isMobile ? 16 : 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color:"#EAF6FB", letterSpacing: "-0.01em" }}>Resumo da carteira</h3>
            <p style={{ fontSize: 12.5, color:"#9FD3EA", marginTop: 2 }}>
              {orcamentos.length} orçamento{orcamentos.length === 1 ? "" : "s"}
              {insights ? ` · ${insights.taxa_conversao}% de conversão` : ""}
            </p>
          </div>
          <button
            onClick={abrirNovo}
            style={{ display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 18px", borderRadius: 10, border:"none", cursor: "pointer", color:"#EAF6FB", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background:"linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite", boxShadow: "0 4px 14px rgba(159,211,234,0.30)" }}
          >
            <Plus style={{ width: 15, height: 15 }} /> Novo orçamento
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          {kpis.map(k => (
            <div key={k.lab} className="vp-inner" style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0, background:`${k.cor}1f` }}>
                <k.icon style={{ width: 18, height: 18, color:k.cor }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color:"#9FD3EA", fontWeight: 800, marginBottom: 3 }}>{k.lab}</div>
                <div className="vp-num" style={{ fontSize: 18, fontWeight: 900, color:"#EAF6FB", letterSpacing: "-0.02em" }}>{k.val}</div>
                <div style={{ fontSize: 11, color:"#9FD3EA", marginTop: 2 }}>{k.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Abas do módulo */}
      <div style={{ display: "flex", alignItems: "center", borderBottom:"1px solid rgba(159,211,234,0.18)" }}>
        {([
          { key: "orcamentos" as const, label: "Orçamentos", icon: FileText },
          { key: "equipamentos" as const, label: "Equipamentos", icon: Package },
        ]).map(t => {
          const on = sub === t.key;
          return (
            <button key={t.key} onClick={() => setSub(t.key)} className="vp-tab"
              style={{ color:on ? "#9FD3EA" : "#9FD3EA", fontWeight: on ? 800 : 600, borderBottomColor: on ? "#9FD3EA" : "transparent" }}>
              <t.icon style={{ width: 15, height: 15 }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {falhaEnvio && (
        <FalhaEnvioOrcamento
          falha={falhaEnvio}
          onFechar={() => setFalhaEnvio(null)}
          onMarcarEnviado={() => marcarComoEnviado(falhaEnvio.id)}
        />
      )}

      {erro && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background:"rgba(220,38,38,0.07)", border:"1px solid rgba(220,38,38,0.25)" }}>
          <AlertCircle style={{ width: 15, height: 15, color:"#F7B8B1", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color:"#F7B8B1", flex: 1 }}>{erro}</span>
          <button onClick={() => setErro(null)} className="vp-icon-btn" style={{ background:"none", color:"#F7B8B1", width: 24, height: 24 }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 260, borderRadius: 16 }} />
      ) : sub === "equipamentos" ? (
        <CatalogoEquipamentos equipamentos={equipamentos} hdrs={hdrs} onMudou={fetchTudo} onErro={setErro} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(0,1fr) 280px", gap: 16, alignItems: "start" }}>

          {/* Tabela de orçamentos */}
          <section className="vp-card" style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 18px", borderBottom:"1px solid rgba(159,211,234,0.18)", flexWrap: "wrap" }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 800, color:"#EAF6FB", letterSpacing: "-0.01em" }}>
                {filtroStatus === "todos" ? "Todos os orçamentos" : STATUS_INFO[filtroStatus].label}
              </h3>
              <button className="vp-ghost" onClick={() => setMostrarFiltros(v => !v)}>
                <Filter style={{ width: 14, height: 14 }} /> Filtros
              </button>
            </div>

            {mostrarFiltros && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "12px 18px", borderBottom:"1px solid rgba(159,211,234,0.18)" }}>
                {["todos", ...STATUS_ORDEM].map(s => {
                  const info = STATUS_INFO[s];
                  const on = filtroStatus === s;
                  const qtd = s === "todos" ? orcamentos.length : orcamentos.filter(o => o.status === s).length;
                  return (
                    <button key={s} onClick={() => setFiltroStatus(s)} className="vp-chip"
                      style={on ? { borderColor: info ? info.color:"#9FD3EA", background: info ? info.bg : "rgba(159,211,234,0.55)", color: info ? info.color:"#9FD3EA" } : undefined}>
                      {info ? info.label : "Todos"} ({qtd})
                    </button>
                  );
                })}
              </div>
            )}

            {visiveis.length === 0 ? (
              <div style={{ padding: "56px 20px", textAlign: "center", color:"#9FD3EA" }}>
                <FileText style={{ width: 30, height: 30, marginBottom: 8 }} />
                <p style={{ fontSize: 13, fontWeight: 700 }}>Nenhum orçamento aqui.</p>
                <p style={{ fontSize: 11.5, marginTop: 4 }}>Clique em "Novo orçamento" para começar.</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table className="vp-table">
                    <thead>
                      <tr>
                        <th style={{ width: 28 }}>#</th>
                        <th>Nº</th>
                        <th>Empresa</th>
                        <th>Título</th>
                        <th>Enviado</th>
                        <th className="r">Valor</th>
                        <th>Status</th>
                        <th className="r">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiveis.map((o, i) => {
                        const info = STATUS_INFO[o.status] || STATUS_INFO.rascunho;
                        return (
                          <tr key={o.orcamento_id}>
                            <td className="vp-num" style={{ color:"#9FD3EA" }}>{i + 1}</td>
                            <td className="vp-num vp-row-link" onClick={() => abrirExistente(o.orcamento_id)} style={{ color:"#EAF6FB", whiteSpace: "nowrap" }}>
                              {numeroOrcamento(o)}
                            </td>
                            <td className="vp-row-link" onClick={() => abrirExistente(o.orcamento_id)} style={{ fontWeight: 700 }}>
                              {o.empresa_nome || "—"}
                            </td>
                            <td className="vp-row-link" onClick={() => abrirExistente(o.orcamento_id)} style={{ color:"#EAF6FB" }}>
                              {o.titulo || "Orçamento"}
                              {o.motivo_recusa && (
                                <span style={{ display: "block", fontSize: 10.5, color:"#F7B8B1", marginTop: 1, fontWeight: 600 }}>
                                  Recusa: {o.motivo_recusa}
                                </span>
                              )}
                            </td>
                            <td className="vp-num" style={{ color:"#EAF6FB", whiteSpace: "nowrap" }}>{formatDate(o.data_envio)}</td>
                            <td className="vp-num r" style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{brl(o.total)}</td>
                            <td>
                              <select
                                value={o.status}
                                onChange={e => mudarStatus(o.orcamento_id, e.target.value)}
                                aria-label={`Status do orçamento ${numeroOrcamento(o)}`}
                                style={{ height: 28, padding: "0 8px", borderRadius: 20, border:`1.5px solid ${info.color}40`, background:info.bg, fontSize: 10.5, fontWeight: 800, color: info.color, cursor: "pointer", fontFamily: "inherit", appearance: "none", textAlign: "center" }}
                              >
                                {STATUS_ORDEM.map(s => <option key={s} value={s}>{STATUS_INFO[s].label}</option>)}
                              </select>
                            </td>
                            <td className="r">
                              <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                                <button onClick={() => enviar(o.orcamento_id)} disabled={enviandoId === o.orcamento_id}
                                  title="Enviar por email ao contato da empresa" className="vp-icon-btn"
                                  style={{ width: 28, height: 28, background:"rgba(46,111,149,0.12)", color:"#9FD3EA", cursor: enviandoId === o.orcamento_id ? "wait" : "pointer" }}>
                                  {enviandoId === o.orcamento_id
                                    ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                                    : <Send style={{ width: 13, height: 13 }} />}
                                </button>
                                <button onClick={() => excluir(o.orcamento_id)} title="Excluir orçamento" className="vp-icon-btn"
                                  style={{ width: 28, height: 28, background:"rgba(220,38,38,0.08)", color:"#F7B8B1" }}>
                                  <Trash2 style={{ width: 13, height: 13 }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color:"#9FD3EA", borderTop:"1px solid rgba(159,211,234,0.18)" }}>
                  <span>Mostrando {visiveis.length} de {orcamentos.length} orçamento{orcamentos.length === 1 ? "" : "s"}</span>
                  <span className="vp-num" style={{ fontWeight: 800, color:"#EAF6FB" }}>
                    {brl(visiveis.reduce((s, o) => s + Number(o.total || 0), 0))}
                  </span>
                </div>
              </>
            )}
          </section>

          {/* Rail lateral */}
          <aside style={{ display: isMobile ? "grid" : "flex", gridTemplateColumns: isMobile ? "repeat(auto-fit,minmax(230px,1fr))" : undefined, flexDirection: isMobile ? undefined : "column", gap: 16 }}>

            {/* Conversão */}
            <div className="vp-card" style={{ padding: 16 }}>
              <h4 style={{ fontSize: 12.5, fontWeight: 800, color:"#EAF6FB", marginBottom: 14 }}>Taxa de conversão</h4>
              <Donut pct={insights?.taxa_conversao || 0} />
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <div className="vp-num" style={{ fontSize: 13, fontWeight: 800, color:"#EAF6FB" }}>
                  {insights?.por_status?.aprovado?.total || 0} aprovado{(insights?.por_status?.aprovado?.total || 0) === 1 ? "" : "s"}
                </div>
                <div className="vp-num" style={{ fontSize: 11, color:"#9FD3EA" }}>
                  de {(insights?.por_status?.aprovado?.total || 0) + (insights?.por_status?.recusado?.total || 0)} decidido(s)
                </div>
              </div>
            </div>

            {/* Série mensal */}
            <div className="vp-card" style={{ padding: 16 }}>
              <h4 style={{ fontSize: 12.5, fontWeight: 800, color:"#EAF6FB", marginBottom: 14 }}>Aprovado — últimos 6 meses</h4>
              {(() => {
                const max = Math.max(1, ...serieMensal.map(m => m.valor));
                return (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 92 }}>
                      {serieMensal.map((m, i) => (
                        <div key={i} className={`vp-bar${m.valor > 0 && m.valor === max ? " hi" : ""}`}
                          title={`${m.rotulo} · ${brl(m.valor)}`}
                          style={{ flex: 1, height: `${Math.max(3, (m.valor / max) * 100)}%` }} />
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 7, marginTop: 7 }}>
                      {serieMensal.map((m, i) => (
                        <span key={i} style={{ flex: 1, textAlign: "center", fontSize: 10.5, color:"#9FD3EA" }}>{m.rotulo}</span>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Equipamentos mais orçados */}
            <div className="vp-card" style={{ padding: 16 }}>
              <h4 style={{ fontSize: 12.5, fontWeight: 800, color:"#EAF6FB", marginBottom: 10 }}>Mais orçados</h4>
              {!insights || insights.equipamentos_mais_orcados.length === 0 ? (
                <p style={{ fontSize: 11.5, color:"#9FD3EA", fontWeight: 600, padding: "12px 0" }}>Nada orçado ainda.</p>
              ) : (
                <dl className="vp-facts">
                  {insights.equipamentos_mais_orcados.slice(0, 5).map(e => (
                    <div key={e.nome}>
                      <dt style={{ color:"#EAF6FB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.nome}</dt>
                      <dd className="vp-num" style={{ fontWeight: 800, color:"#9FD3EA", flexShrink: 0 }}>{e.quantidade}x</dd>
                    </div>
                  ))}
                </dl>
              )}
              <button onClick={() => setSub("equipamentos")} className="vp-ghost" style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>
                Ver catálogo <ArrowRight style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </aside>
        </div>
      )}

      {editando && (
        <EditorOrcamento
          orcamento={editando}
          empresas={empresas}
          equipamentos={equipamentos.filter(e => e.ativo)}
          hdrs={hdrs}
          onFechar={() => setEditando(null)}
          onSalvo={() => { setEditando(null); fetchTudo(); }}
          onErro={setErro}
        />
      )}
    </div>
  );
}

// ── Donut de conversão ────────────────────────────────────────
function Donut({ pct }: { pct: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const off = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <div style={{ display: "grid", placeItems: "center" }}>
      <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`${pct}% de conversão`}>
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(200,225,240,0.75)" strokeWidth="12" />
        <circle cx="66" cy="66" r={r} fill="none" stroke="url(#vpGrad)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 66 66)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        <defs>
          <linearGradient id="vpGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9FD3EA" />
            <stop offset="100%" stopColor="#83DDA8" />
          </linearGradient>
        </defs>
        <text x="66" y="66" textAnchor="middle" dominantBaseline="central"
          fill="#EAF6FB" fontSize="26" fontWeight="800" style={{ fontVariantNumeric: "tabular-nums" }}>
          {Math.round(pct)}%
        </text>
      </svg>
    </div>
  );
}

// ── Catálogo de equipamentos ──────────────────────────────────
function CatalogoEquipamentos({
  equipamentos, hdrs, onMudou, onErro,
}: {
  equipamentos: Equipamento[];
  hdrs: () => Record<string, string>;
  onMudou: () => void;
  onErro: (m: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [preco, setPreco] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  // O modelo vem do backend (gerado a partir dos campos reais do catálogo) e
  // exige o header de autenticação — por isso não é um <a href> simples.
  const baixarModelo = async () => {
    setBaixando(true);
    try {
      const res = await fetch(`${API}/equipamentos/modelo-importacao`, {
        headers: { Authorization: hdrs().Authorization },
      });
      if (!res.ok) { onErro("Não foi possível gerar o modelo de importação."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "modelo-catalogo-prospectageo.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { onErro("Erro de conexão ao baixar o modelo."); }
    setBaixando(false);
  };

  const adicionar = async () => {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      const res = await fetch(`${API}/equipamentos`, {
        method: "POST", headers: hdrs(),
        body: JSON.stringify({
          nome: nome.trim(),
          codigo: codigo.trim() || null,
          preco_base: Number(preco.replace(",", ".")) || 0,
          quantidade: Number(quantidade) || 0,
        }),
      });
      if (res.ok) { setNome(""); setCodigo(""); setPreco(""); setQuantidade(""); onMudou(); }
      else {
        const d = await res.json().catch(() => ({}));
        onErro(typeof d.detail === "string" ? d.detail : "Não foi possível cadastrar o equipamento.");
      }
    } catch { onErro("Erro de conexão ao cadastrar."); }
    setSalvando(false);
  };

  const desativar = async (id: string) => {
    try {
      const res = await fetch(`${API}/equipamentos/${id}`, { method: "DELETE", headers: hdrs() });
      if (res.ok) onMudou();
    } catch { onErro("Erro ao desativar."); }
  };

  const inputStyle = { height: 40, padding: "0 14px", borderRadius: 10, border:"1.5px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)", fontSize: 13, outline:"none", fontFamily: "inherit", color:"#EAF6FB" } as const;

  return (
    <section className="vp-card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "15px 18px", borderBottom:"1px solid rgba(159,211,234,0.18)", display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ fontSize: 14.5, fontWeight: 800, color:"#EAF6FB", letterSpacing: "-0.01em" }}>Catálogo de equipamentos</h3>
          <p style={{ fontSize: 12, color:"#9FD3EA", marginTop: 2 }}>Itens reutilizáveis na montagem dos orçamentos.</p>
        </div>
        {/* Estoque/catálogo em Excel: baixar o modelo oficial e importar de volta */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={baixarModelo} disabled={baixando} className="vp-ghost" style={{ height: 36, padding: "0 12px" }}>
            {baixando
              ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
              : <Download style={{ width: 13, height: 13 }} />}
            Baixar modelo
          </button>
          <button onClick={() => setImportando(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 9, border:"1.5px solid rgba(159,211,234,0.30)", background:"linear-gradient(135deg,rgba(46,111,149,0.12),rgba(26,188,156,0.10))", color:"#9FD3EA", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            <Upload style={{ width: 13, height: 13 }} /> Importar Excel
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "14px 18px", borderBottom:"1px solid rgba(159,211,234,0.18)" }}>
        <input value={codigo} onChange={e => setCodigo(e.target.value)} onKeyDown={e => e.key === "Enter" && adicionar()}
          placeholder="Código / SKU" aria-label="Código ou SKU do equipamento" style={{ ...inputStyle, width: 130 }} />
        <input value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key === "Enter" && adicionar()}
          placeholder="Nome do equipamento" aria-label="Nome do equipamento" style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
        <input value={quantidade} onChange={e => setQuantidade(e.target.value.replace(/[^\d]/g, ""))} onKeyDown={e => e.key === "Enter" && adicionar()}
          placeholder="Qtd." aria-label="Quantidade em estoque" className="vp-num" style={{ ...inputStyle, width: 84, textAlign: "center" }} />
        <input value={preco} onChange={e => setPreco(e.target.value.replace(/[^\d.,]/g, ""))} onKeyDown={e => e.key === "Enter" && adicionar()}
          placeholder="Preço base" aria-label="Preço base" className="vp-num" style={{ ...inputStyle, width: 130 }} />
        <button onClick={adicionar} disabled={salvando || !nome.trim()}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 18px", height: 40, borderRadius: 10, border:"none", color:"#EAF6FB", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", background:"linear-gradient(135deg,#2E6F95,#2E6F95)", cursor: salvando || !nome.trim() ? "not-allowed" : "pointer", opacity: salvando || !nome.trim() ? 0.5 : 1 }}>
          <Plus style={{ width: 14, height: 14 }} /> Cadastrar
        </button>
      </div>

      {equipamentos.length === 0 ? (
        <div style={{ padding: "56px 20px", textAlign: "center", color:"#9FD3EA" }}>
          <Package style={{ width: 30, height: 30, marginBottom: 8 }} />
          <p style={{ fontSize: 13, fontWeight: 700 }}>Nenhum equipamento no catálogo.</p>
          <p style={{ fontSize: 11.5, marginTop: 4 }}>Cadastre os itens que você costuma orçar.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="vp-table">
            <thead>
              <tr><th>Código</th><th>Equipamento</th><th>Descrição</th><th className="r">Estoque</th><th className="r">Preço base</th><th className="r">Ações</th></tr>
            </thead>
            <tbody>
              {equipamentos.map(e => (
                <tr key={e.equipamento_id}>
                  <td className="vp-num" style={{ color:e.codigo ? "#EAF6FB" : "#9FD3EA", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {e.codigo || "—"}
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Package style={{ width: 14, height: 14, color:"#9FD3EA", flexShrink: 0 }} />
                      {e.nome}
                    </span>
                  </td>
                  <td style={{ color:"#EAF6FB" }}>{e.descricao || "—"}</td>
                  <td className="vp-num r" style={{ fontWeight: 700, color:e.quantidade > 0 ? "#83DDA8" : "#9FD3EA" }}>
                    {e.quantidade ?? 0}
                  </td>
                  <td className="vp-num r" style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{brl(e.preco_base)}</td>
                  <td className="r">
                    <button onClick={() => desativar(e.equipamento_id)} className="vp-icon-btn"
                      title="Desativar — orçamentos antigos continuam intactos"
                      style={{ width: 28, height: 28, background:"rgba(220,38,38,0.08)", color:"#F7B8B1", marginLeft: "auto" }}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {importando && (
        <ImportarCatalogo
          hdrs={hdrs}
          onFechar={() => setImportando(false)}
          onImportado={() => { setImportando(false); onMudou(); }}
        />
      )}
    </section>
  );
}

// ── Importação de catálogo/estoque por Excel ──────────────────
// Dois passos com o MESMO arquivo: o primeiro POST valida e devolve a prévia
// (nada é gravado), o segundo confirma. O mapeamento das colunas é feito no
// backend pelo NOME do cabeçalho — reordenar colunas no Excel não embaralha os
// dados. Aqui só mostramos o que o servidor entendeu antes de gravar.
interface LinhaPrevia {
  linha: number;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  quantidade: number;
  preco_base: number;
  acao: "criar" | "atualizar";
}
interface Previa {
  colunas_reconhecidas: Record<string, number>;
  linha_cabecalho: number;
  total_linhas: number;
  validos: LinhaPrevia[];
  erros: string[];
  resumo: { validos: number; com_erro: number; criar: number; atualizar: number };
}

function ImportarCatalogo({
  hdrs, onFechar, onImportado,
}: {
  hdrs: () => Record<string, string>;
  onFechar: () => void;
  onImportado: () => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const enviar = async (f: File, confirmar: boolean) => {
    setOcupado(true);
    setErro(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", f);
      // Só o Authorization: o Content-Type do multipart é montado pelo browser.
      const res = await fetch(`${API}/equipamentos/importar?confirmar=${confirmar}`, {
        method: "POST",
        headers: { Authorization: hdrs().Authorization },
        body: fd,
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Traduz o erro técnico do backend em algo acionável, sem "Erro 500".
        setErro(typeof dados.detail === "string"
          ? dados.detail
          : "Não foi possível ler a planilha. Confira se é um arquivo .xlsx válido.");
        if (confirmar) setPrevia(p => p);
        return;
      }
      if (confirmar) {
        setSucesso(`Importação concluída: ${dados.criados} item(ns) criado(s) e ${dados.atualizados} atualizado(s).`);
        setTimeout(onImportado, 1400);
      } else {
        setPrevia(dados as Previa);
      }
    } catch {
      setErro("Erro de conexão ao enviar a planilha.");
    }
    setOcupado(false);
  };

  const escolher = (f: File | null) => {
    setPrevia(null); setErro(null); setSucesso(null); setArquivo(f);
    if (f) enviar(f, false);
  };

  const podeGravar = !!previa && previa.resumo.com_erro === 0 && previa.resumo.validos > 0;

  return createPortal(
    <div onClick={onFechar}
      style={{ position: "fixed", inset: 0, zIndex: 70, background:"rgba(10,31,51,0.42)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", background:"#143354", borderRadius: 18, padding: 24, boxShadow: "0 24px 64px rgba(10,31,51,0.32)" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background:"rgba(39,174,96,0.14)", display: "grid", placeItems: "center" }}>
            <FileSpreadsheet style={{ width: 17, height: 17, color:"#83DDA8" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color:"#EAF6FB" }}>Importar catálogo do Excel</div>
            <div style={{ fontSize: 11.5, color:"#9FD3EA", marginTop: 1 }}>
              As colunas são reconhecidas pelo nome do cabeçalho — pode reordená-las à vontade.
            </div>
          </div>
          <button onClick={onFechar} className="vp-icon-btn" aria-label="Fechar"
            style={{ width: 30, height: 30, background:"rgba(159,211,234,0.08)", color:"#EAF6FB" }}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* Passo 1 — escolher o arquivo */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={ocupado}
          style={{
            width: "100%", padding: "22px 16px", borderRadius: 12, cursor: ocupado ? "wait" : "pointer",
            border:"1.5px dashed rgba(159,211,234,0.30)", background:"rgba(46,111,149,0.05)",
            fontFamily: "inherit", textAlign: "center",
          }}
        >
          <Upload style={{ width: 20, height: 20, color:"#9FD3EA" }} />
          <div style={{ fontSize: 13, fontWeight: 800, color:"#9FD3EA", marginTop: 6 }}>
            {arquivo ? arquivo.name : "Escolher planilha (.xlsx)"}
          </div>
          <div style={{ fontSize: 11, color:"#9FD3EA", marginTop: 2 }}>
            {arquivo ? "Clique para trocar o arquivo" : "Use o modelo de importação para garantir os nomes das colunas"}
          </div>
        </button>
        <input ref={inputRef} type="file" accept=".xlsx,.xlsm" style={{ display: "none" }}
          onChange={e => escolher(e.target.files?.[0] || null)} />

        {ocupado && !sucesso && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 12.5, fontWeight: 700, color:"#EAF6FB" }}>
            <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
            Lendo e validando a planilha…
          </div>
        )}

        {erro && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, padding: "11px 13px", borderRadius: 10, background:"rgba(220,38,38,0.07)", border:"1px solid rgba(220,38,38,0.2)" }}>
            <AlertTriangle style={{ width: 15, height: 15, color:"#F7B8B1", flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color:"#F7B8B1", lineHeight: 1.45 }}>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, padding: "11px 13px", borderRadius: 10, background:"rgba(39,174,96,0.09)", border:"1px solid rgba(39,174,96,0.25)" }}>
            <Check style={{ width: 15, height: 15, color:"#83DDA8", flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color:"#83DDA8" }}>{sucesso}</span>
          </div>
        )}

        {/* Passo 2 — prévia do que será gravado */}
        {previa && !sucesso && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {[
                { rotulo: "Linhas lidas", valor: previa.total_linhas, cor: "#9FD3EA" },
                { rotulo: "Válidas", valor: previa.resumo.validos, cor: "#83DDA8" },
                { rotulo: "Com erro", valor: previa.resumo.com_erro, cor: previa.resumo.com_erro ? "#F7B8B1" : "#9FD3EA" },
                { rotulo: "Novos", valor: previa.resumo.criar, cor: "#9FD3EA" },
                { rotulo: "Atualizados", valor: previa.resumo.atualizar, cor: "#F2C879" },
              ].map(c => (
                <div key={c.rotulo} style={{ flex: "1 1 96px", padding: "9px 11px", borderRadius: 10, background:"rgba(18,59,94,0.55)", border:"1px solid rgba(159,211,234,0.18)" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color:"#9FD3EA" }}>{c.rotulo}</div>
                  <div className="vp-num" style={{ fontSize: 18, fontWeight: 900, color:c.cor }}>{c.valor}</div>
                </div>
              ))}
            </div>

            {/* Prova de que o servidor casou cada coluna pelo cabeçalho */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12, fontSize: 11, color:"#9FD3EA" }}>
              <Hash style={{ width: 12, height: 12 }} />
              <span style={{ fontWeight: 700 }}>Colunas reconhecidas:</span>
              {Object.keys(previa.colunas_reconhecidas).map(nome => (
                <span key={nome} style={{ padding: "2px 8px", borderRadius: 20, background:"rgba(46,111,149,0.1)", color:"#9FD3EA", fontWeight: 700 }}>{nome}</span>
              ))}
            </div>

            {previa.erros.length > 0 && (
              <div style={{ marginBottom: 12, padding: "11px 13px", borderRadius: 10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.2)" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color:"#F7B8B1", marginBottom: 6 }}>
                  {previa.resumo.com_erro} problema(s) — corrija na planilha e envie de novo:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
                  {previa.erros.map((e, i) => (
                    <li key={i} style={{ fontSize: 12, color:"#F7B8B1", lineHeight: 1.45 }}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {previa.validos.length > 0 && (
              <div style={{ maxHeight: 240, overflowY: "auto", borderRadius: 10, border:"1px solid rgba(159,211,234,0.18)" }}>
                <table className="vp-table">
                  <thead>
                    <tr><th>Linha</th><th>Código</th><th>Nome</th><th className="r">Qtd</th><th className="r">Preço</th><th>Ação</th></tr>
                  </thead>
                  <tbody>
                    {previa.validos.map(l => (
                      <tr key={l.linha} className="vp-import-row">
                        <td className="vp-num" style={{ color:"#9FD3EA" }}>{l.linha}</td>
                        <td className="vp-num">{l.codigo || "—"}</td>
                        <td style={{ fontWeight: 700 }}>{l.nome}</td>
                        <td className="vp-num r">{l.quantidade}</td>
                        <td className="vp-num r" style={{ whiteSpace: "nowrap" }}>{brl(l.preco_base)}</td>
                        <td>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 20,
                            background:l.acao === "criar" ? "rgba(46,111,149,0.12)" : "rgba(214,137,16,0.14)",
                            color:l.acao === "criar" ? "#9FD3EA" : "#a9700c" }}>
                            {l.acao === "criar" ? "novo" : "atualiza"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {previa.resumo.validos === 0 && previa.resumo.com_erro === 0 && (
              <div style={{ padding: "26px 14px", textAlign: "center", fontSize: 12.5, fontWeight: 700, color:"#9FD3EA" }}>
                A planilha não tem nenhuma linha preenchida.
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18, paddingTop: 14, borderTop:"1px solid rgba(126,176,219,0.16)", position: "sticky", bottom: -24, background:"#143354", paddingBottom: 24, marginBottom: -24, marginInline: -24, paddingInline: 24 }}>
          <button onClick={onFechar} className="vp-ghost" style={{ height: 40, padding: "0 16px", fontSize: 13 }}>
            {sucesso ? "Fechar" : "Cancelar"}
          </button>
          <button
            onClick={() => arquivo && enviar(arquivo, true)}
            disabled={!podeGravar || ocupado || !!sucesso}
            title={previa && previa.resumo.com_erro > 0 ? "Corrija os erros antes de importar" : undefined}
            style={{
              display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 20px", borderRadius: 10,
              border:"none", color:"#EAF6FB", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              background:"linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize: "200% 200%",
              animation: "gradientShift 4s ease infinite",
              cursor: podeGravar && !ocupado && !sucesso ? "pointer" : "not-allowed",
              opacity: podeGravar && !ocupado && !sucesso ? 1 : 0.5,
            }}>
            {ocupado
              ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
              : <Check style={{ width: 14, height: 14 }} />}
            Confirmar importação
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Editor de orçamento ───────────────────────────────────────
function EditorOrcamento({
  orcamento, empresas, equipamentos, hdrs, onFechar, onSalvo, onErro,
}: {
  orcamento: Orcamento;
  empresas: EmpresaOpt[];
  equipamentos: Equipamento[];
  hdrs: () => Record<string, string>;
  onFechar: () => void;
  onSalvo: () => void;
  onErro: (m: string) => void;
}) {
  const novo = !orcamento.orcamento_id;
  const [empresaId, setEmpresaId] = useState(orcamento.empresa_id || "");
  const [titulo, setTitulo] = useState(orcamento.titulo || "");
  const [observacoes, setObservacoes] = useState(orcamento.observacoes || "");
  const [itens, setItens] = useState<Item[]>(orcamento.itens || []);
  const [salvando, setSalvando] = useState(false);

  const total = itens.reduce((s, i) => s + (i.quantidade || 1) * (i.preco_unitario || 0), 0);

  const addDoCatalogo = (equipamentoId: string) => {
    const eq = equipamentos.find(e => e.equipamento_id === equipamentoId);
    if (!eq) return;
    setItens(prev => [...prev, {
      equipamento_id: eq.equipamento_id, descricao: eq.nome,
      quantidade: 1, preco_unitario: Number(eq.preco_base) || 0,
    }]);
  };

  const mudarItem = (idx: number, patch: Partial<Item>) =>
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const salvar = async () => {
    if (!empresaId) { onErro("Escolha a empresa do orçamento."); return; }
    setSalvando(true);
    try {
      const body = JSON.stringify({
        empresa_id: empresaId,
        titulo: titulo.trim() || "Orçamento",
        observacoes,
        itens: itens.map(i => ({
          equipamento_id: i.equipamento_id,
          descricao: i.descricao.trim() || "Item",
          quantidade: Math.max(1, Number(i.quantidade) || 1),
          preco_unitario: Number(i.preco_unitario) || 0,
        })),
      });
      const res = novo
        ? await fetch(`${API}/orcamentos`, { method: "POST", headers: hdrs(), body })
        : await fetch(`${API}/orcamentos/${orcamento.orcamento_id}`, { method: "PUT", headers: hdrs(), body });
      if (res.ok) onSalvo();
      else {
        const d = await res.json().catch(() => ({}));
        onErro(d.detail || "Não foi possível salvar o orçamento.");
      }
    } catch { onErro("Erro de conexão ao salvar."); }
    setSalvando(false);
  };

  const label = { fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color:"#9FD3EA", textTransform: "uppercase" } as const;
  const field = { width: "100%", height: 42, padding: "0 12px", borderRadius: 10, border:"1.5px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)", fontSize: 13, marginTop: 5, outline:"none", fontFamily: "inherit", color:"#EAF6FB" } as const;

  return createPortal(
    <div onClick={onFechar}
      style={{ position: "fixed", inset: 0, zIndex: 60, background:"rgba(10,31,51,0.42)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 660, maxHeight: "90vh", overflowY: "auto", background:"#143354", borderRadius: 18, padding: 24, boxShadow: "0 24px 64px rgba(10,31,51,0.32)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background:"rgba(46,111,149,0.12)", display: "grid", placeItems: "center" }}>
            <FileText style={{ width: 17, height: 17, color:"#9FD3EA" }} />
          </div>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 900, color:"#EAF6FB" }}>
            {novo ? "Novo orçamento" : "Editar orçamento"}
          </div>
          <button onClick={onFechar} className="vp-icon-btn" style={{ width: 30, height: 30, background:"rgba(159,211,234,0.08)", color:"#EAF6FB" }}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={label} htmlFor="orc-empresa">Empresa</label>
            <select id="orc-empresa" value={empresaId} onChange={e => setEmpresaId(e.target.value)} disabled={!novo}
              style={{ ...field, cursor: novo ? "pointer" : "not-allowed" }}>
              <option value="">Selecione…</option>
              {empresas.map(e => <option key={e.empresa_id} value={e.empresa_id}>{e.nome}</option>)}
            </select>
          </div>

          <div>
            <label style={label} htmlFor="orc-titulo">Título</label>
            <input id="orc-titulo" value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="Ex.: Locação de equipamentos — evento de junho" style={field} />
          </div>

          <div>
            {/* ITENS — o caminho principal é pegar do catálogo; item avulso é a
                alternativa. Antes os dois pareciam a mesma coisa e o usuário
                achava que precisava digitar tudo à mão. */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={label}>Itens do orçamento</span>
              {itens.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, color:"#9FD3EA", background:"rgba(46,111,149,0.1)", padding: "2px 8px", borderRadius: 20 }}>
                  {itens.length}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "stretch" }}>
              <SeletorCatalogo equipamentos={equipamentos} onEscolher={addDoCatalogo} />
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
                <button
                  onClick={() => setItens(prev => [...prev, { equipamento_id: null, descricao: "", quantidade: 1, preco_unitario: 0 }])}
                  className="vp-ghost vp-avulso" style={{ height: 38, padding: "0 14px", whiteSpace: "nowrap" }}>
                  <Plus style={{ width: 13, height: 13 }} /> Item avulso
                </button>
                <span style={{ fontSize: 9.5, fontWeight: 600, color:"#9FD3EA", textAlign: "center" }}>
                  fora do catálogo
                </span>
              </div>
            </div>

            {itens.length === 0 ? (
              <div style={{ padding: "18px 12px", textAlign: "center", borderRadius: 10, border:"1.5px dashed rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)" }}>
                <Package style={{ width: 22, height: 22, color:"#9FD3EA" }} />
                <p style={{ fontSize: 12, fontWeight: 700, color:"#9FD3EA", marginTop: 6 }}>
                  Nenhum item ainda.
                </p>
                <p style={{ fontSize: 11, color:"#9FD3EA", marginTop: 2 }}>
                  {equipamentos.length > 0
                    ? "Comece por “Adicionar do catálogo” — os preços já vêm preenchidos."
                    : "Cadastre equipamentos no catálogo para reaproveitá-los aqui."}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {itens.map((it, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {/* Origem do item: do catálogo (ícone cheio) ou avulso (contorno) */}
                    <span
                      aria-hidden
                      title={it.equipamento_id ? "Item do catálogo" : "Item avulso"}
                      style={{
                        width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center",
                        background:it.equipamento_id ? "rgba(46,111,149,0.12)" : "transparent",
                        border:it.equipamento_id ? "none" : "1.5px dashed rgba(159,211,234,0.18)",
                      }}
                    >
                      {it.equipamento_id
                        ? <Package style={{ width: 12, height: 12, color:"#9FD3EA" }} />
                        : <Plus style={{ width: 11, height: 11, color:"#9FD3EA" }} />}
                    </span>
                    <input value={it.descricao} onChange={e => mudarItem(idx, { descricao: e.target.value })}
                      placeholder="Descrição" aria-label="Descrição do item"
                      style={{ ...field, marginTop: 0, flex: 1, minWidth: 0, height: 36, fontSize: 12 }} />
                    <input type="number" min={1} value={it.quantidade} aria-label="Quantidade"
                      onChange={e => mudarItem(idx, { quantidade: Number(e.target.value) })} className="vp-num"
                      style={{ ...field, marginTop: 0, width: 62, height: 36, fontSize: 12, textAlign: "center", padding: "0 6px" }} />
                    <input type="number" min={0} step="0.01" value={it.preco_unitario} aria-label="Preço unitário"
                      onChange={e => mudarItem(idx, { preco_unitario: Number(e.target.value) })} className="vp-num"
                      style={{ ...field, marginTop: 0, width: 104, height: 36, fontSize: 12, textAlign: "right", padding: "0 8px" }} />
                    <button onClick={() => setItens(prev => prev.filter((_, i) => i !== idx))} className="vp-icon-btn"
                      aria-label="Remover item"
                      style={{ width: 32, height: 36, background:"rgba(220,38,38,0.08)", color:"#F7B8B1", flexShrink: 0 }}>
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={label} htmlFor="orc-obs">Observações</label>
            <textarea id="orc-obs" value={observacoes} onChange={e => setObservacoes(e.target.value)}
              placeholder="Condições de pagamento, prazo de entrega…"
              style={{ ...field, height: "auto", minHeight: 70, padding: "10px 12px", resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 10, borderTop:"1px solid rgba(159,211,234,0.18)", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color:"#9FD3EA", textTransform: "uppercase", letterSpacing: "0.07em" }}>Total</div>
              <div className="vp-num" style={{ fontSize: 21, fontWeight: 900, color:"#EAF6FB", letterSpacing: "-0.02em" }}>{brl(total)}</div>
            </div>
            <button onClick={onFechar} className="vp-ghost" style={{ height: 42, padding: "0 18px", fontSize: 13 }}>Cancelar</button>
            <button onClick={salvar} disabled={salvando}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 20px", height: 42, borderRadius: 10, border:"none", color:"#EAF6FB", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background:"linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite", cursor: salvando ? "wait" : "pointer", opacity: salvando ? 0.7 : 1 }}>
              {salvando
                ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                : <Check style={{ width: 14, height: 14 }} />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Seletor de catálogo ───────────────────────────────────────
// Ação PRINCIPAL da área de itens. Era um <select> nativo que se confundia com
// os outros campos do formulário; virou um botão em destaque que abre uma lista
// com busca, mostrando nome, descrição e preço de cada item de forma legível
// (o <select> nativo só permite uma linha de texto por opção).
function SeletorCatalogo({
  equipamentos, onEscolher,
}: {
  equipamentos: Equipamento[];
  onEscolher: (equipamentoId: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const caixa = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return equipamentos;
    return equipamentos.filter(e =>
      e.nome.toLowerCase().includes(q) ||
      (e.descricao || "").toLowerCase().includes(q) ||
      (e.codigo || "").toLowerCase().includes(q)
    );
  }, [equipamentos, busca]);

  const vazio = equipamentos.length === 0;

  return (
    <div ref={caixa} style={{ position: "relative", flex: 1, minWidth: 230 }}>
      <button
        type="button"
        onClick={() => { if (!vazio) { setAberto(a => !a); setBusca(""); } }}
        disabled={vazio}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className="vp-catalogo-btn"
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          height: 52, padding: "0 14px", borderRadius: 12, cursor: vazio ? "not-allowed" : "pointer",
          fontFamily: "inherit", textAlign: "left", opacity: vazio ? 0.6 : 1,
          border:`1.5px solid ${aberto ? "rgba(159,211,234,0.30)" : "rgba(159,211,234,0.30)"}`,
          background:"linear-gradient(135deg, rgba(46,111,149,0.12), rgba(26,188,156,0.10))",
          boxShadow: aberto ? "0 0 0 3px rgba(41,128,185,0.14)" : "0 2px 8px rgba(41,128,185,0.10)",
          transition: "all 0.16s ease",
        }}
      >
        <span aria-hidden style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "grid", placeItems: "center",
          background:"linear-gradient(135deg,#2E6F95,#2E6F95)", boxShadow: "0 3px 10px rgba(46,111,149,0.35)",
        }}>
          <Package style={{ width: 16, height: 16, color:"#fff" }} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 800, color:"#9FD3EA", letterSpacing: "-0.01em" }}>
            Adicionar do catálogo
          </span>
          <span style={{ display: "block", fontSize: 10.5, fontWeight: 600, color:"rgba(21,84,127,0.62)", marginTop: 1 }}>
            {vazio
              ? "Nenhum equipamento cadastrado ainda"
              : `${equipamentos.length} ${equipamentos.length === 1 ? "item disponível" : "itens disponíveis"} — preço já preenchido`}
          </span>
        </span>
        <ChevronDown style={{ width: 15, height: 15, color:"#9FD3EA", flexShrink: 0, transform: aberto ? "rotate(180deg)" : "none", transition: "transform 0.16s" }} />
      </button>

      {aberto && (
        <div role="listbox" aria-label="Itens do catálogo" style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20,
          maxHeight: 300, overflowY: "auto", borderRadius: 12, background:"rgba(18,59,94,0.55)",
          border:"1px solid rgba(159,211,234,0.18)", boxShadow: "0 14px 40px rgba(10,31,51,0.22)",
        }}>
          <div style={{ position: "sticky", top: 0, background:"rgba(18,59,94,0.55)", padding: 8, borderBottom:"1px solid rgba(159,211,234,0.18)" }}>
            <input
              autoFocus value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar no catálogo…" aria-label="Buscar no catálogo"
              style={{
                width: "100%", height: 34, padding: "0 12px", borderRadius: 8, fontSize: 12,
                border:"1.5px solid rgba(159,211,234,0.18)", outline:"none", fontFamily: "inherit", color:"#EAF6FB",
              }}
            />
          </div>
          {filtrados.length === 0 ? (
            <div style={{ padding: "22px 14px", textAlign: "center", fontSize: 12, fontWeight: 600, color:"#9FD3EA" }}>
              Nenhum item encontrado para “{busca}”.
            </div>
          ) : filtrados.map(eq => (
            <button
              key={eq.equipamento_id} role="option" aria-selected={false} type="button"
              onClick={() => { onEscolher(eq.equipamento_id); setAberto(false); }}
              className="vp-catalogo-item"
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                border:"none", borderBottom:"1px solid rgba(159,211,234,0.18)", background:"none",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              }}
            >
              <Package style={{ width: 14, height: 14, color:"#9FD3EA", flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color:"#EAF6FB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {eq.nome}
                  {eq.codigo && (
                    <span style={{ fontSize: 10, fontWeight: 700, color:"#9FD3EA", marginLeft: 6 }}>{eq.codigo}</span>
                  )}
                </span>
                {eq.descricao && (
                  <span style={{ display: "block", fontSize: 11, color:"#9FD3EA", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {eq.descricao}
                  </span>
                )}
              </span>
              <span className="vp-num" style={{ fontSize: 12.5, fontWeight: 800, color:"#83DDA8", whiteSpace: "nowrap", flexShrink: 0 }}>
                {brl(eq.preco_base)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Falha no envio automático do orçamento ────────────────────────────────
// O orçamento continua como estava (não vira "enviado", porque o cliente não
// recebeu). Aqui o vendedor vê o motivo e manda pelo próprio email/WhatsApp,
// com o conteúdo já pronto.
function FalhaEnvioOrcamento({
  falha, onFechar, onMarcarEnviado,
}: {
  falha: { id: string; motivo: string; previa: PreviaEmail | null };
  onFechar: () => void;
  onMarcarEnviado: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const p = falha.previa;

  const copiar = async () => {
    if (!p) return;
    try {
      await navigator.clipboard.writeText(p.texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch { /* sem clipboard: o texto fica visível para copiar à mão */ }
  };

  return (
    <div style={{ padding: "13px 15px", borderRadius: 12, background:"rgba(217,119,6,0.07)", border:"1px solid rgba(217,119,6,0.3)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <AlertTriangle style={{ width: 16, height: 16, color:"#F2C879", flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color:"#F2C879" }}>
            O email automático não saiu — o orçamento continua intacto
          </div>
          <div style={{ fontSize: 12, color:"#EAF6FB", marginTop: 4, lineHeight: 1.5 }}>
            {falha.motivo}
          </div>
        </div>
        <button onClick={onFechar} className="vp-icon-btn" aria-label="Fechar"
          style={{ background:"none", color:"#F2C879", width: 24, height: 24, flexShrink: 0 }}>
          <X style={{ width: 13, height: 13 }} />
        </button>
      </div>

      {p && (
        <>
          <div style={{ fontSize: 11.5, fontWeight: 700, color:"#EAF6FB", margin: "12px 0 7px" }}>
            Enviar você mesmo para {p.empresa_nome}:
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {p.destino && (
              <button onClick={() => openEmail(p.destino!, undefined, p.assunto, p.texto)} className="vp-ghost" style={{ height: 34 }}>
                <Send style={{ width: 12, height: 12 }} /> Abrir no meu email
              </button>
            )}
            {p.telefone && (
              <button onClick={() => openWhatsApp(p.telefone!)} className="vp-ghost" style={{ height: 34 }}>
                <Send style={{ width: 12, height: 12 }} /> WhatsApp
              </button>
            )}
            <button onClick={copiar} className="vp-ghost" style={{ height: 34 }}>
              {copiado ? <><Check style={{ width: 12, height: 12 }} /> Copiado</> : "Copiar texto"}
            </button>
            <button onClick={onMarcarEnviado}
              title="Use depois de enviar por fora — o sistema não tem como saber sozinho"
              style={{ height: 34, padding: "0 14px", borderRadius: 9, border:"none", cursor: "pointer", background:"#F2C879", color:"#0A2540", fontSize: 12, fontWeight: 700, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Check style={{ width: 12, height: 12 }} /> Já enviei — marcar como enviado
            </button>
          </div>
          <pre style={{ marginTop: 10, padding: "10px 12px", borderRadius: 9, background:"rgba(18,59,94,0.55)", border:"1px solid rgba(159,211,234,0.18)", fontSize: 11.5, lineHeight: 1.55, color:"#EAF6FB", whiteSpace: "pre-wrap", fontFamily: "inherit", maxHeight: 180, overflowY: "auto" }}>
            {p.texto}
          </pre>
        </>
      )}
    </div>
  );
}
