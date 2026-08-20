import { useState, useEffect, useCallback } from "react";
import { getToken } from "../../services/auth";
import {
  Plus, Send, Trash2, X, FileText, Package, Check, AlertCircle, Loader2,
} from "lucide-react";

const API = "https://backend-crm-production-157b.up.railway.app";

// Fluxo do orçamento, na ordem em que acontece.
const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  rascunho:      { label: "Rascunho",      color: "#566573", bg: "rgba(149,165,166,0.15)" },
  enviado:       { label: "Enviado",       color: "#2980b9", bg: "rgba(41,128,185,0.12)"  },
  em_negociacao: { label: "Em negociação", color: "#d68910", bg: "rgba(214,137,16,0.12)"  },
  aprovado:      { label: "Aprovado",      color: "#16a34a", bg: "rgba(22,163,74,0.12)"   },
  recusado:      { label: "Recusado",      color: "#dc2626", bg: "rgba(220,38,38,0.1)"    },
};
const STATUS_ORDEM = ["rascunho", "enviado", "em_negociacao", "aprovado", "recusado"];

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
  motivo_recusa: string | null;
  itens?: Item[];
}
interface EmpresaOpt { empresa_id: string; nome: string }

function brl(v?: number | null) {
  return `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}
function formatDate(v?: string | null) {
  return v ? new Date(v).toLocaleDateString("pt-BR") : "—";
}

export default function VendasPanel({ empresas }: { empresas: EmpresaOpt[] }) {
  const [sub, setSub] = useState<"orcamentos" | "equipamentos">("orcamentos");
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
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
      const [oRes, eRes] = await Promise.all([
        fetch(`${API}/orcamentos`, { headers: hdrs() }),
        fetch(`${API}/equipamentos`, { headers: hdrs() }),
      ]);
      if (oRes.ok) setOrcamentos(await oRes.json());
      if (eRes.ok) setEquipamentos(await eRes.json());
    } catch {
      setErro("Não foi possível carregar os dados de vendas.");
    }
    setLoading(false);
  }, []);

  // Carga inicial só na montagem.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchTudo(); }, []);

  const abrirNovo = () => {
    setEditando({
      orcamento_id: "", empresa_id: "", empresa_nome: null, titulo: "",
      observacoes: "", status: "rascunho", total: 0, data_envio: null,
      motivo_recusa: null, itens: [],
    });
  };

  const abrirExistente = async (id: string) => {
    try {
      const res = await fetch(`${API}/orcamentos/${id}`, { headers: hdrs() });
      if (res.ok) setEditando(await res.json());
    } catch { setErro("Erro ao abrir o orçamento."); }
  };

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
      if (res.ok) fetchTudo();
      else setErro("Não foi possível mudar o status.");
    } catch { setErro("Erro de conexão ao mudar o status."); }
  };

  const enviar = async (id: string) => {
    setEnviandoId(id);
    setErro(null);
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

  const visiveis = filtroStatus === "todos"
    ? orcamentos
    : orcamentos.filter(o => o.status === filtroStatus);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "18px 24px" }}>
      {/* Sub-abas + ação */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {(["orcamentos", "equipamentos"] as const).map(k => (
          <button
            key={k}
            onClick={() => setSub(k)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 10,
              border: sub === k ? "1.5px solid rgba(41,128,185,0.5)" : "1.5px solid rgba(200,225,240,0.8)",
              background: sub === k ? "rgba(41,128,185,0.1)" : "rgba(255,255,255,0.65)",
              color: sub === k ? "#2980b9" : "rgba(20,45,70,0.6)",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            {k === "orcamentos" ? <FileText style={{ width: 13, height: 13 }} /> : <Package style={{ width: 13, height: 13 }} />}
            {k === "orcamentos" ? "Orçamentos" : "Equipamentos"}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {sub === "orcamentos" && (
          <button
            onClick={abrirNovo}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10,
              border: "none", background: "linear-gradient(135deg,#2980b9,#1abc9c)", color: "#fff",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Novo orçamento
          </button>
        )}
      </div>

      {erro && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", marginBottom: 14 }}>
          <AlertCircle style={{ width: 15, height: 15, color: "#dc2626", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", flex: 1 }}>{erro}</span>
          <button onClick={() => setErro(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 180, borderRadius: 14 }} />
      ) : sub === "equipamentos" ? (
        <CatalogoEquipamentos
          equipamentos={equipamentos}
          hdrs={hdrs}
          onMudou={fetchTudo}
          onErro={setErro}
        />
      ) : (
        <>
          {/* Filtro por status */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {["todos", ...STATUS_ORDEM].map(s => {
              const info = STATUS_INFO[s];
              const ativo = filtroStatus === s;
              const qtd = s === "todos" ? orcamentos.length : orcamentos.filter(o => o.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setFiltroStatus(s)}
                  className={`chip-filter${ativo ? " active" : ""}`}
                  style={ativo && info ? { borderColor: info.color, background: info.bg, color: info.color } : undefined}
                >
                  {info ? info.label : "Todos"} ({qtd})
                </button>
              );
            })}
          </div>

          {visiveis.length === 0 ? (
            <div style={{ padding: "50px 0", textAlign: "center", color: "rgba(20,45,70,0.4)" }}>
              <FileText style={{ width: 30, height: 30, marginBottom: 8 }} />
              <p style={{ fontSize: 13, fontWeight: 700 }}>Nenhum orçamento aqui.</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Clique em "Novo orçamento" para começar.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {visiveis.map(o => {
                const info = STATUS_INFO[o.status] || STATUS_INFO.rascunho;
                return (
                  <div
                    key={o.orcamento_id}
                    style={{ border: "1.5px solid rgba(200,225,240,0.7)", borderRadius: 14, padding: 14, background: "rgba(255,255,255,0.82)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}
                  >
                    <div style={{ flex: 1, minWidth: 200, cursor: "pointer" }} onClick={() => abrirExistente(o.orcamento_id)}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#0f2133" }}>{o.titulo || "Orçamento"}</div>
                      <div style={{ fontSize: 11, color: "rgba(20,45,70,0.55)", marginTop: 2 }}>
                        {o.empresa_nome || "—"} · enviado em {formatDate(o.data_envio)}
                      </div>
                      {o.motivo_recusa && (
                        <div style={{ fontSize: 10, color: "#dc2626", marginTop: 3, fontWeight: 600 }}>
                          Recusa: {o.motivo_recusa}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: 15, fontWeight: 900, color: "#0f2133" }}>{brl(o.total)}</div>

                    <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 8, color: info.color, background: info.bg }}>
                      {info.label}
                    </span>

                    <select
                      value={o.status}
                      onChange={e => mudarStatus(o.orcamento_id, e.target.value)}
                      style={{ height: 32, padding: "0 8px", borderRadius: 8, border: "1.5px solid rgba(200,225,240,0.8)", background: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 700, color: "#0f2133", cursor: "pointer" }}
                    >
                      {STATUS_ORDEM.map(s => (
                        <option key={s} value={s}>{STATUS_INFO[s].label}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => enviar(o.orcamento_id)}
                      disabled={enviandoId === o.orcamento_id}
                      title="Enviar por email ao contato da empresa"
                      style={{ display: "flex", alignItems: "center", gap: 5, height: 32, padding: "0 12px", borderRadius: 8, border: "none", background: "rgba(41,128,185,0.12)", color: "#2980b9", fontSize: 11, fontWeight: 700, cursor: enviandoId === o.orcamento_id ? "wait" : "pointer" }}
                    >
                      {enviandoId === o.orcamento_id
                        ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                        : <Send style={{ width: 12, height: 12 }} />}
                      Enviar
                    </button>

                    <button
                      onClick={() => excluir(o.orcamento_id)}
                      title="Excluir"
                      style={{ height: 32, width: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", background: "rgba(220,38,38,0.08)", color: "#dc2626", cursor: "pointer" }}
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
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
        body: JSON.stringify({ nome: nome.trim(), preco_base: Number(preco) || 0 }),
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

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => e.key === "Enter" && adicionar()}
          placeholder="Nome do equipamento"
          style={{ flex: 1, minWidth: 200, height: 40, padding: "0 14px", borderRadius: 10, border: "1.5px solid rgba(200,225,240,0.8)", background: "rgba(255,255,255,0.75)", fontSize: 13, outline: "none" }}
        />
        <input
          value={preco}
          onChange={e => setPreco(e.target.value.replace(/[^\d.,]/g, ""))}
          onKeyDown={e => e.key === "Enter" && adicionar()}
          placeholder="Preço base"
          style={{ width: 140, height: 40, padding: "0 14px", borderRadius: 10, border: "1.5px solid rgba(200,225,240,0.8)", background: "rgba(255,255,255,0.75)", fontSize: 13, outline: "none" }}
        />
        <button
          onClick={adicionar}
          disabled={salvando || !nome.trim()}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 18px", height: 40, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#2980b9,#1abc9c)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: salvando || !nome.trim() ? "not-allowed" : "pointer", opacity: salvando || !nome.trim() ? 0.5 : 1 }}
        >
          <Plus style={{ width: 14, height: 14 }} /> Cadastrar
        </button>
      </div>

      {equipamentos.length === 0 ? (
        <div style={{ padding: "50px 0", textAlign: "center", color: "rgba(20,45,70,0.4)" }}>
          <Package style={{ width: 30, height: 30, marginBottom: 8 }} />
          <p style={{ fontSize: 13, fontWeight: 700 }}>Nenhum equipamento no catálogo.</p>
          <p style={{ fontSize: 11, marginTop: 4 }}>Cadastre os itens que você costuma orçar.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {equipamentos.map(e => (
            <div key={e.equipamento_id} style={{ display: "flex", alignItems: "center", gap: 12, border: "1.5px solid rgba(200,225,240,0.7)", borderRadius: 12, padding: "10px 14px", background: "rgba(255,255,255,0.82)" }}>
              <Package style={{ width: 15, height: 15, color: "#2980b9", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2133" }}>{e.nome}</div>
                {e.descricao && <div style={{ fontSize: 11, color: "rgba(20,45,70,0.5)" }}>{e.descricao}</div>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#0f2133" }}>{brl(e.preco_base)}</div>
              <button
                onClick={() => desativar(e.equipamento_id)}
                title="Desativar (orçamentos antigos continuam intactos)"
                style={{ height: 30, width: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", background: "rgba(220,38,38,0.08)", color: "#dc2626", cursor: "pointer" }}
              >
                <Trash2 style={{ width: 12, height: 12 }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
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
      equipamento_id: eq.equipamento_id,
      descricao: eq.nome,
      quantidade: 1,
      preco_unitario: Number(eq.preco_base) || 0,
    }]);
  };

  const addAvulso = () => {
    setItens(prev => [...prev, { equipamento_id: null, descricao: "", quantidade: 1, preco_unitario: 0 }]);
  };

  const mudarItem = (idx: number, patch: Partial<Item>) => {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

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

  return (
    <div
      onClick={onFechar}
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(10,31,51,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", background: "rgba(255,255,255,0.98)", borderRadius: 18, padding: 24, boxShadow: "0 20px 60px rgba(10,31,51,0.3)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <FileText style={{ width: 18, height: 18, color: "#2980b9" }} />
          <div style={{ flex: 1, fontSize: 16, fontWeight: 900, color: "#0f2133" }}>
            {novo ? "Novo orçamento" : "Editar orçamento"}
          </div>
          <button onClick={onFechar} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(20,45,70,0.5)" }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(15,33,51,0.45)", textTransform: "uppercase" }}>Empresa</label>
            <select
              value={empresaId}
              onChange={e => setEmpresaId(e.target.value)}
              disabled={!novo}
              style={{ width: "100%", height: 42, padding: "0 12px", borderRadius: 10, border: "1.5px solid rgba(200,225,240,0.8)", background: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 5, cursor: novo ? "pointer" : "not-allowed" }}
            >
              <option value="">Selecione…</option>
              {empresas.map(e => (
                <option key={e.empresa_id} value={e.empresa_id}>{e.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(15,33,51,0.45)", textTransform: "uppercase" }}>Título</label>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex.: Locação de equipamentos — evento de junho"
              style={{ width: "100%", height: 42, padding: "0 12px", borderRadius: 10, border: "1.5px solid rgba(200,225,240,0.8)", background: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 5, outline: "none" }}
            />
          </div>

          {/* Itens */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(15,33,51,0.45)", textTransform: "uppercase" }}>Itens</label>
            <div style={{ display: "flex", gap: 8, marginTop: 5, marginBottom: 10, flexWrap: "wrap" }}>
              <select
                value=""
                onChange={e => e.target.value && addDoCatalogo(e.target.value)}
                style={{ flex: 1, minWidth: 180, height: 38, padding: "0 12px", borderRadius: 10, border: "1.5px solid rgba(200,225,240,0.8)", background: "rgba(255,255,255,0.75)", fontSize: 12, cursor: "pointer" }}
              >
                <option value="">+ Adicionar do catálogo…</option>
                {equipamentos.map(eq => (
                  <option key={eq.equipamento_id} value={eq.equipamento_id}>
                    {eq.nome} — {brl(eq.preco_base)}
                  </option>
                ))}
              </select>
              <button
                onClick={addAvulso}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 14px", height: 38, borderRadius: 10, border: "1.5px solid rgba(200,225,240,0.8)", background: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700, color: "rgba(20,45,70,0.65)", cursor: "pointer" }}
              >
                <Plus style={{ width: 13, height: 13 }} /> Item avulso
              </button>
            </div>

            {itens.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12, color: "rgba(20,45,70,0.4)", fontWeight: 600 }}>
                Nenhum item ainda.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {itens.map((it, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      value={it.descricao}
                      onChange={e => mudarItem(idx, { descricao: e.target.value })}
                      placeholder="Descrição"
                      style={{ flex: 1, minWidth: 0, height: 36, padding: "0 10px", borderRadius: 8, border: "1.5px solid rgba(200,225,240,0.8)", background: "rgba(255,255,255,0.75)", fontSize: 12, outline: "none" }}
                    />
                    <input
                      type="number"
                      min={1}
                      value={it.quantidade}
                      onChange={e => mudarItem(idx, { quantidade: Number(e.target.value) })}
                      style={{ width: 60, height: 36, padding: "0 8px", borderRadius: 8, border: "1.5px solid rgba(200,225,240,0.8)", background: "rgba(255,255,255,0.75)", fontSize: 12, textAlign: "center", outline: "none" }}
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={it.preco_unitario}
                      onChange={e => mudarItem(idx, { preco_unitario: Number(e.target.value) })}
                      style={{ width: 100, height: 36, padding: "0 8px", borderRadius: 8, border: "1.5px solid rgba(200,225,240,0.8)", background: "rgba(255,255,255,0.75)", fontSize: 12, textAlign: "right", outline: "none" }}
                    />
                    <button
                      onClick={() => setItens(prev => prev.filter((_, i) => i !== idx))}
                      style={{ height: 36, width: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", background: "rgba(220,38,38,0.08)", color: "#dc2626", cursor: "pointer", flexShrink: 0 }}
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(15,33,51,0.45)", textTransform: "uppercase" }}>Observações</label>
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Condições de pagamento, prazo de entrega…"
              style={{ width: "100%", minHeight: 70, padding: "10px 12px", borderRadius: 10, border: "1.5px solid rgba(200,225,240,0.8)", background: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 5, outline: "none", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 6, borderTop: "1px solid rgba(200,225,240,0.6)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(20,45,70,0.45)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Total</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#0f2133" }}>{brl(total)}</div>
            </div>
            <button
              onClick={onFechar}
              style={{ padding: "0 18px", height: 42, borderRadius: 10, border: "1.5px solid rgba(200,225,240,0.9)", background: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 700, color: "rgba(20,45,70,0.65)", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 20px", height: 42, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#2980b9,#1abc9c)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: salvando ? "wait" : "pointer", opacity: salvando ? 0.7 : 1 }}
            >
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
