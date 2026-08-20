import { useState, useEffect, useCallback, useMemo } from "react";
import { getToken } from "../../services/auth";
import useIsMobile from "../../hooks/useIsMobile";
import {
  Plus, Send, Trash2, X, FileText, Package, Check, AlertCircle, Loader2,
  DollarSign, Wallet, Target, CalendarCheck, ArrowRight, Filter,
} from "lucide-react";

const API = "https://backend-crm-production-157b.up.railway.app";

// Fluxo do orçamento, na ordem em que acontece.
const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  rascunho:      { label: "Rascunho",      color: "#566573", bg: "rgba(86,101,115,0.12)"  },
  enviado:       { label: "Enviado",       color: "#2980b9", bg: "rgba(41,128,185,0.12)"  },
  em_negociacao: { label: "Em negociação", color: "#d68910", bg: "rgba(214,137,16,0.13)"  },
  aprovado:      { label: "Aprovado",      color: "#1e8449", bg: "rgba(39,174,96,0.13)"   },
  recusado:      { label: "Recusado",      color: "#c0392b", bg: "rgba(220,38,38,0.1)"    },
};
const STATUS_ORDEM = ["rascunho", "enviado", "em_negociacao", "aprovado", "recusado"];

const css = `
  .vp-card { background:rgba(255,255,255,0.72); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.9); border-radius:16px; }
  .vp-inner { background:rgba(255,255,255,0.55); border:1px solid rgba(200,225,240,0.7); border-radius:12px; }
  .vp-num { font-variant-numeric:tabular-nums; }
  .vp-table { width:100%; border-collapse:collapse; font-size:12.5px; }
  .vp-table thead th { text-align:left; padding:10px 14px; font-size:10px; letter-spacing:0.07em; text-transform:uppercase; color:rgba(20,45,70,0.45); font-weight:800; border-bottom:1px solid rgba(200,225,240,0.7); white-space:nowrap; }
  .vp-table tbody td { padding:11px 14px; border-bottom:1px solid rgba(200,225,240,0.45); color:#0f2133; }
  .vp-table tbody tr:last-child td { border-bottom:0; }
  .vp-table tbody tr { transition:background 0.14s; }
  .vp-table tbody tr:hover { background:rgba(41,128,185,0.05); }
  .vp-table .r { text-align:right; }
  .vp-row-link { cursor:pointer; }
  .vp-ghost { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; color:rgba(20,45,70,0.6); border:1px solid rgba(200,225,240,0.9); border-radius:9px; padding:6px 11px; background:rgba(255,255,255,0.7); cursor:pointer; transition:all 0.15s; font-family:inherit; }
  .vp-ghost:hover { color:#0f2133; border-color:rgba(41,128,185,0.4); }
  .vp-icon-btn { display:flex; align-items:center; justify-content:center; border:none; cursor:pointer; border-radius:8px; transition:all 0.15s; }
  .vp-icon-btn:hover { filter:brightness(0.94); }
  .vp-chip { padding:5px 12px; border-radius:20px; border:1.5px solid rgba(200,225,240,0.8); background:rgba(255,255,255,0.65); font-size:11px; font-weight:700; cursor:pointer; transition:all 0.15s; color:rgba(20,45,70,0.6); font-family:inherit; }
  .vp-chip:hover { border-color:rgba(41,128,185,0.35); }
  .vp-tab { display:flex; align-items:center; gap:6px; padding:10px 4px; margin-right:18px; border:none; background:none; cursor:pointer; font-family:inherit; font-size:13px; border-bottom:2.5px solid transparent; margin-bottom:-1px; transition:color 0.15s; }
  .vp-bar { border-radius:5px 5px 0 0; background:rgba(41,128,185,0.22); transition:background 0.15s; }
  .vp-bar.hi { background:linear-gradient(180deg,#2980b9,#1abc9c); }
  .vp-bar:hover { background:#1abc9c; }
  .vp-facts > div { display:flex; justify-content:space-between; gap:10px; padding:7px 0; font-size:12.5px; border-bottom:1px solid rgba(200,225,240,0.45); }
  .vp-facts > div:last-child { border-bottom:0; }
`;

interface Equipamento {
  equipamento_id: string;
  nome: string;
  descricao: string | null;
  preco_base: number;
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
    setEnviandoId(id); setErro(null);
    try {
      const res = await fetch(`${API}/orcamentos/${id}/enviar`, { method: "POST", headers: hdrs() });
      if (res.ok) fetchTudo();
      else {
        const d = await res.json().catch(() => ({}));
        setErro(d.detail || "Não foi possível enviar o orçamento.");
      }
    } catch { setErro("Erro de conexão ao enviar."); }
    setEnviandoId(null);
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
    { lab: "Valor aprovado", val: brlCurto(insights?.valor_aprovado), sub: `${aprovados.length} orçamento${aprovados.length === 1 ? "" : "s"} fechado${aprovados.length === 1 ? "" : "s"}`, icon: DollarSign, cor: "#27ae60" },
    { lab: "Em aberto",      val: brlCurto(insights?.valor_em_aberto), sub: "enviados e em negociação",  icon: Wallet,        cor: "#8e44ad" },
    { lab: "Ticket médio",   val: brlCurto(ticketMedio),               sub: "por orçamento aprovado",    icon: Target,        cor: "#d68910" },
    { lab: "Último fechamento", val: formatDate(ultimaVenda),          sub: ultimaVenda ? "última aprovação" : "nada fechado ainda", icon: CalendarCheck, cor: "#2980b9" },
  ];

  return (
    <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px 14px 32px" : "18px 24px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{css}</style>

      {/* Faixa de indicadores */}
      <section className="vp-card" style={{ padding: isMobile ? 16 : 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f2133", letterSpacing: "-0.01em" }}>Resumo da carteira</h3>
            <p style={{ fontSize: 12.5, color: "rgba(20,45,70,0.5)", marginTop: 2 }}>
              {orcamentos.length} orçamento{orcamentos.length === 1 ? "" : "s"}
              {insights ? ` · ${insights.taxa_conversao}% de conversão` : ""}
            </p>
          </div>
          <button
            onClick={abrirNovo}
            style={{ display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 18px", borderRadius: 10, border: "none", cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "linear-gradient(135deg,#2980b9,#1abc9c,#2ecc71,#2980b9)", backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite", boxShadow: "0 4px 14px rgba(41,128,185,0.35)" }}
          >
            <Plus style={{ width: 15, height: 15 }} /> Novo orçamento
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          {kpis.map(k => (
            <div key={k.lab} className="vp-inner" style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0, background: `${k.cor}1f` }}>
                <k.icon style={{ width: 18, height: 18, color: k.cor }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(20,45,70,0.45)", fontWeight: 800, marginBottom: 3 }}>{k.lab}</div>
                <div className="vp-num" style={{ fontSize: 18, fontWeight: 900, color: "#0f2133", letterSpacing: "-0.02em" }}>{k.val}</div>
                <div style={{ fontSize: 11, color: "rgba(20,45,70,0.45)", marginTop: 2 }}>{k.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Abas do módulo */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid rgba(200,225,240,0.7)" }}>
        {([
          { key: "orcamentos" as const, label: "Orçamentos", icon: FileText },
          { key: "equipamentos" as const, label: "Equipamentos", icon: Package },
        ]).map(t => {
          const on = sub === t.key;
          return (
            <button key={t.key} onClick={() => setSub(t.key)} className="vp-tab"
              style={{ color: on ? "#2980b9" : "rgba(20,45,70,0.5)", fontWeight: on ? 800 : 600, borderBottomColor: on ? "#2980b9" : "transparent" }}>
              <t.icon style={{ width: 15, height: 15 }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {erro && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.25)" }}>
          <AlertCircle style={{ width: 15, height: 15, color: "#c0392b", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#c0392b", flex: 1 }}>{erro}</span>
          <button onClick={() => setErro(null)} className="vp-icon-btn" style={{ background: "none", color: "#c0392b", width: 24, height: 24 }}>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 18px", borderBottom: "1px solid rgba(200,225,240,0.7)", flexWrap: "wrap" }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 800, color: "#0f2133", letterSpacing: "-0.01em" }}>
                {filtroStatus === "todos" ? "Todos os orçamentos" : STATUS_INFO[filtroStatus].label}
              </h3>
              <button className="vp-ghost" onClick={() => setMostrarFiltros(v => !v)}>
                <Filter style={{ width: 14, height: 14 }} /> Filtros
              </button>
            </div>

            {mostrarFiltros && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "12px 18px", borderBottom: "1px solid rgba(200,225,240,0.7)" }}>
                {["todos", ...STATUS_ORDEM].map(s => {
                  const info = STATUS_INFO[s];
                  const on = filtroStatus === s;
                  const qtd = s === "todos" ? orcamentos.length : orcamentos.filter(o => o.status === s).length;
                  return (
                    <button key={s} onClick={() => setFiltroStatus(s)} className="vp-chip"
                      style={on ? { borderColor: info ? info.color : "#2980b9", background: info ? info.bg : "rgba(41,128,185,0.1)", color: info ? info.color : "#2980b9" } : undefined}>
                      {info ? info.label : "Todos"} ({qtd})
                    </button>
                  );
                })}
              </div>
            )}

            {visiveis.length === 0 ? (
              <div style={{ padding: "56px 20px", textAlign: "center", color: "rgba(20,45,70,0.42)" }}>
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
                            <td className="vp-num" style={{ color: "rgba(20,45,70,0.42)" }}>{i + 1}</td>
                            <td className="vp-num vp-row-link" onClick={() => abrirExistente(o.orcamento_id)} style={{ color: "rgba(20,45,70,0.6)", whiteSpace: "nowrap" }}>
                              {numeroOrcamento(o)}
                            </td>
                            <td className="vp-row-link" onClick={() => abrirExistente(o.orcamento_id)} style={{ fontWeight: 700 }}>
                              {o.empresa_nome || "—"}
                            </td>
                            <td className="vp-row-link" onClick={() => abrirExistente(o.orcamento_id)} style={{ color: "rgba(20,45,70,0.6)" }}>
                              {o.titulo || "Orçamento"}
                              {o.motivo_recusa && (
                                <span style={{ display: "block", fontSize: 10.5, color: "#c0392b", marginTop: 1, fontWeight: 600 }}>
                                  Recusa: {o.motivo_recusa}
                                </span>
                              )}
                            </td>
                            <td className="vp-num" style={{ color: "rgba(20,45,70,0.6)", whiteSpace: "nowrap" }}>{formatDate(o.data_envio)}</td>
                            <td className="vp-num r" style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{brl(o.total)}</td>
                            <td>
                              <select
                                value={o.status}
                                onChange={e => mudarStatus(o.orcamento_id, e.target.value)}
                                aria-label={`Status do orçamento ${numeroOrcamento(o)}`}
                                style={{ height: 28, padding: "0 8px", borderRadius: 20, border: `1.5px solid ${info.color}40`, background: info.bg, fontSize: 10.5, fontWeight: 800, color: info.color, cursor: "pointer", fontFamily: "inherit", appearance: "none", textAlign: "center" }}
                              >
                                {STATUS_ORDEM.map(s => <option key={s} value={s}>{STATUS_INFO[s].label}</option>)}
                              </select>
                            </td>
                            <td className="r">
                              <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                                <button onClick={() => enviar(o.orcamento_id)} disabled={enviandoId === o.orcamento_id}
                                  title="Enviar por email ao contato da empresa" className="vp-icon-btn"
                                  style={{ width: 28, height: 28, background: "rgba(41,128,185,0.12)", color: "#2980b9", cursor: enviandoId === o.orcamento_id ? "wait" : "pointer" }}>
                                  {enviandoId === o.orcamento_id
                                    ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                                    : <Send style={{ width: 13, height: 13 }} />}
                                </button>
                                <button onClick={() => excluir(o.orcamento_id)} title="Excluir orçamento" className="vp-icon-btn"
                                  style={{ width: 28, height: 28, background: "rgba(220,38,38,0.08)", color: "#c0392b" }}>
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
                <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "rgba(20,45,70,0.5)", borderTop: "1px solid rgba(200,225,240,0.7)" }}>
                  <span>Mostrando {visiveis.length} de {orcamentos.length} orçamento{orcamentos.length === 1 ? "" : "s"}</span>
                  <span className="vp-num" style={{ fontWeight: 800, color: "#0f2133" }}>
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
              <h4 style={{ fontSize: 12.5, fontWeight: 800, color: "#0f2133", marginBottom: 14 }}>Taxa de conversão</h4>
              <Donut pct={insights?.taxa_conversao || 0} />
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <div className="vp-num" style={{ fontSize: 13, fontWeight: 800, color: "#0f2133" }}>
                  {insights?.por_status?.aprovado?.total || 0} aprovado{(insights?.por_status?.aprovado?.total || 0) === 1 ? "" : "s"}
                </div>
                <div className="vp-num" style={{ fontSize: 11, color: "rgba(20,45,70,0.45)" }}>
                  de {(insights?.por_status?.aprovado?.total || 0) + (insights?.por_status?.recusado?.total || 0)} decidido(s)
                </div>
              </div>
            </div>

            {/* Série mensal */}
            <div className="vp-card" style={{ padding: 16 }}>
              <h4 style={{ fontSize: 12.5, fontWeight: 800, color: "#0f2133", marginBottom: 14 }}>Aprovado — últimos 6 meses</h4>
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
                        <span key={i} style={{ flex: 1, textAlign: "center", fontSize: 10.5, color: "rgba(20,45,70,0.45)" }}>{m.rotulo}</span>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Equipamentos mais orçados */}
            <div className="vp-card" style={{ padding: 16 }}>
              <h4 style={{ fontSize: 12.5, fontWeight: 800, color: "#0f2133", marginBottom: 10 }}>Mais orçados</h4>
              {!insights || insights.equipamentos_mais_orcados.length === 0 ? (
                <p style={{ fontSize: 11.5, color: "rgba(20,45,70,0.42)", fontWeight: 600, padding: "12px 0" }}>Nada orçado ainda.</p>
              ) : (
                <dl className="vp-facts">
                  {insights.equipamentos_mais_orcados.slice(0, 5).map(e => (
                    <div key={e.nome}>
                      <dt style={{ color: "rgba(20,45,70,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.nome}</dt>
                      <dd className="vp-num" style={{ fontWeight: 800, color: "#2980b9", flexShrink: 0 }}>{e.quantidade}x</dd>
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
            <stop offset="0%" stopColor="#2980b9" />
            <stop offset="100%" stopColor="#1abc9c" />
          </linearGradient>
        </defs>
        <text x="66" y="66" textAnchor="middle" dominantBaseline="central"
          fill="#0f2133" fontSize="26" fontWeight="800" style={{ fontVariantNumeric: "tabular-nums" }}>
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
  const [preco, setPreco] = useState("");
  const [salvando, setSalvando] = useState(false);

  const adicionar = async () => {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      const res = await fetch(`${API}/equipamentos`, {
        method: "POST", headers: hdrs(),
        body: JSON.stringify({ nome: nome.trim(), preco_base: Number(preco.replace(",", ".")) || 0 }),
      });
      if (res.ok) { setNome(""); setPreco(""); onMudou(); }
      else onErro("Não foi possível cadastrar o equipamento.");
    } catch { onErro("Erro de conexão ao cadastrar."); }
    setSalvando(false);
  };

  const desativar = async (id: string) => {
    try {
      const res = await fetch(`${API}/equipamentos/${id}`, { method: "DELETE", headers: hdrs() });
      if (res.ok) onMudou();
    } catch { onErro("Erro ao desativar."); }
  };

  const inputStyle = { height: 40, padding: "0 14px", borderRadius: 10, border: "1.5px solid rgba(200,225,240,0.8)", background: "rgba(255,255,255,0.75)", fontSize: 13, outline: "none", fontFamily: "inherit", color: "#0f2133" } as const;

  return (
    <section className="vp-card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "15px 18px", borderBottom: "1px solid rgba(200,225,240,0.7)" }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 800, color: "#0f2133", letterSpacing: "-0.01em" }}>Catálogo de equipamentos</h3>
        <p style={{ fontSize: 12, color: "rgba(20,45,70,0.5)", marginTop: 2 }}>Itens reutilizáveis na montagem dos orçamentos.</p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "14px 18px", borderBottom: "1px solid rgba(200,225,240,0.7)" }}>
        <input value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key === "Enter" && adicionar()}
          placeholder="Nome do equipamento" style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
        <input value={preco} onChange={e => setPreco(e.target.value.replace(/[^\d.,]/g, ""))} onKeyDown={e => e.key === "Enter" && adicionar()}
          placeholder="Preço base" className="vp-num" style={{ ...inputStyle, width: 140 }} />
        <button onClick={adicionar} disabled={salvando || !nome.trim()}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 18px", height: 40, borderRadius: 10, border: "none", color: "#fff", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", background: "linear-gradient(135deg,#2980b9,#1abc9c)", cursor: salvando || !nome.trim() ? "not-allowed" : "pointer", opacity: salvando || !nome.trim() ? 0.5 : 1 }}>
          <Plus style={{ width: 14, height: 14 }} /> Cadastrar
        </button>
      </div>

      {equipamentos.length === 0 ? (
        <div style={{ padding: "56px 20px", textAlign: "center", color: "rgba(20,45,70,0.42)" }}>
          <Package style={{ width: 30, height: 30, marginBottom: 8 }} />
          <p style={{ fontSize: 13, fontWeight: 700 }}>Nenhum equipamento no catálogo.</p>
          <p style={{ fontSize: 11.5, marginTop: 4 }}>Cadastre os itens que você costuma orçar.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="vp-table">
            <thead>
              <tr><th>Equipamento</th><th>Descrição</th><th className="r">Preço base</th><th className="r">Ações</th></tr>
            </thead>
            <tbody>
              {equipamentos.map(e => (
                <tr key={e.equipamento_id}>
                  <td style={{ fontWeight: 700 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Package style={{ width: 14, height: 14, color: "#2980b9", flexShrink: 0 }} />
                      {e.nome}
                    </span>
                  </td>
                  <td style={{ color: "rgba(20,45,70,0.6)" }}>{e.descricao || "—"}</td>
                  <td className="vp-num r" style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{brl(e.preco_base)}</td>
                  <td className="r">
                    <button onClick={() => desativar(e.equipamento_id)} className="vp-icon-btn"
                      title="Desativar — orçamentos antigos continuam intactos"
                      style={{ width: 28, height: 28, background: "rgba(220,38,38,0.08)", color: "#c0392b", marginLeft: "auto" }}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
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

  const label = { fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: "rgba(15,33,51,0.45)", textTransform: "uppercase" } as const;
  const field = { width: "100%", height: 42, padding: "0 12px", borderRadius: 10, border: "1.5px solid rgba(200,225,240,0.8)", background: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 5, outline: "none", fontFamily: "inherit", color: "#0f2133" } as const;

  return (
    <div onClick={onFechar}
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(10,31,51,0.42)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 660, maxHeight: "90vh", overflowY: "auto", background: "rgba(255,255,255,0.97)", borderRadius: 18, padding: 24, boxShadow: "0 24px 64px rgba(10,31,51,0.32)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(41,128,185,0.12)", display: "grid", placeItems: "center" }}>
            <FileText style={{ width: 17, height: 17, color: "#2980b9" }} />
          </div>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 900, color: "#0f2133" }}>
            {novo ? "Novo orçamento" : "Editar orçamento"}
          </div>
          <button onClick={onFechar} className="vp-icon-btn" style={{ width: 30, height: 30, background: "rgba(200,225,240,0.4)", color: "rgba(20,45,70,0.6)" }}>
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
            <span style={label}>Itens</span>
            <div style={{ display: "flex", gap: 8, marginTop: 5, marginBottom: 10, flexWrap: "wrap" }}>
              <select value="" onChange={e => e.target.value && addDoCatalogo(e.target.value)} aria-label="Adicionar item do catálogo"
                style={{ ...field, marginTop: 0, flex: 1, minWidth: 180, height: 38, fontSize: 12, cursor: "pointer" }}>
                <option value="">+ Adicionar do catálogo…</option>
                {equipamentos.map(eq => <option key={eq.equipamento_id} value={eq.equipamento_id}>{eq.nome} — {brl(eq.preco_base)}</option>)}
              </select>
              <button onClick={() => setItens(prev => [...prev, { equipamento_id: null, descricao: "", quantidade: 1, preco_unitario: 0 }])}
                className="vp-ghost" style={{ height: 38, padding: "0 14px" }}>
                <Plus style={{ width: 13, height: 13 }} /> Item avulso
              </button>
            </div>

            {itens.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12, color: "rgba(20,45,70,0.42)", fontWeight: 600 }}>
                Nenhum item ainda.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {itens.map((it, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
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
                      style={{ width: 32, height: 36, background: "rgba(220,38,38,0.08)", color: "#c0392b", flexShrink: 0 }}>
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

          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 10, borderTop: "1px solid rgba(200,225,240,0.7)", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(20,45,70,0.45)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Total</div>
              <div className="vp-num" style={{ fontSize: 21, fontWeight: 900, color: "#0f2133", letterSpacing: "-0.02em" }}>{brl(total)}</div>
            </div>
            <button onClick={onFechar} className="vp-ghost" style={{ height: 42, padding: "0 18px", fontSize: 13 }}>Cancelar</button>
            <button onClick={salvar} disabled={salvando}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 20px", height: 42, borderRadius: 10, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "linear-gradient(135deg,#2980b9,#1abc9c,#2ecc71,#2980b9)", backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite", cursor: salvando ? "wait" : "pointer", opacity: salvando ? 0.7 : 1 }}>
              {salvando
                ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                : <Check style={{ width: 14, height: 14 }} />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
