import { getToken, setAccessToken } from "../../services/auth";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Search, Building2, Users, ClipboardList,
  Calendar, BarChart3, Plus, RefreshCw, Menu, Shield, UserPlus,
  Mail, X, Crown, CheckCircle2, Ban, TrendingUp, UserRoundCog,
} from "lucide-react";
import useIsMobile from "../../hooks/useIsMobile";

const API = "https://backend-crm-production-157b.up.railway.app";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:rgba(255,255,255,0.65); transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(255,255,255,0.08); color:#fff; }
  .nav-item.active { background:rgba(255,255,255,0.14); color:#fff; font-weight:600; }
  .card { background:rgba(255,255,255,0.82); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.9); border-radius:14px; }
  .ipt { width:100%; height:42px; border-radius:10px; border:1px solid rgba(200,225,240,0.9); background:#fff; padding:0 14px; font-size:13px; color:#1a2e40; outline:none; transition:border-color 0.15s; }
  .ipt:focus { border-color:rgba(41,128,185,0.55); box-shadow:0 0 0 3px rgba(41,128,185,0.08); }
  ::-webkit-scrollbar { width:5px; height:5px; }
  ::-webkit-scrollbar-thumb { background:rgba(41,128,185,0.25); border-radius:4px; }
`;

interface Me { usuario_id?: string; email?: string; nome: string; cargo?: string; role?: string; is_gerente?: boolean; conta_nome?: string; }

interface UsuarioRow {
  usuario_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  role: string;
  ativo: boolean;
  data_criacao: string | null;
  total_empresas: number;
}

interface VendedorMetrica {
  usuario_id: string;
  nome: string;
  email: string;
  ativo: boolean;
  total_empresas: number;
  ganhos: number;
  perdidos: number;
  rascunhos: number;
  ticket_total: number;
  ultima_atividade: string | null;
}

interface Dashboard {
  conta: { total_empresas: number; ganhos: number; perdidos: number; rascunhos: number; ticket_total: number; total_vendedores: number; };
  vendedores: VendedorMetrica[];
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards", path: "/dashboard" },
  { icon: Search, label: "Buscar Empresas", path: "/buscar" },
  { icon: Building2, label: "Cadastrar Empresas", path: "/empresas/nova" },
  { icon: Users, label: "Todos os clientes", path: "/clientes" },
  { icon: ClipboardList, label: "Gerenciamento de clientes", path: "/gerenciamento" },
  { icon: Calendar, label: "Calendario", path: "/calendario" },
  { icon: UserRoundCog, label: "Equipe", path: "/equipe" },
];

function initials(n: string) { return n?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?"; }
function avatarColor(n: string) { const c = ["#2980b9", "#1abc9c", "#8e44ad", "#e67e22", "#27ae60", "#e74c3c"]; return c[(n?.charCodeAt(0) || 0) % c.length]; }
function money(v?: number | null) { return `R$ ${Number(v || 0).toLocaleString("pt-BR")}`; }
function formatDate(v?: string | null) { return v ? new Date(v).toLocaleDateString("pt-BR") : "—"; }

export default function Equipe() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [negado, setNegado] = useState(false);

  // modal de convite
  const [showInvite, setShowInvite] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [role, setRole] = useState("vendedor");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const hdrs = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken() || ""}`,
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch(`${API}/me`, { headers: hdrs() });
      if (meRes.status === 401) { setAccessToken(null); navigate("/login"); return; }
      const meData: Me = await meRes.json();
      setMe(meData);
      if (!meData.is_gerente) { setNegado(true); setLoading(false); return; }

      const [u, d] = await Promise.all([
        fetch(`${API}/usuarios`, { headers: hdrs() }),
        fetch(`${API}/gerencia/dashboard`, { headers: hdrs() }),
      ]);
      if (u.ok) setUsuarios(await u.json());
      if (d.ok) setDash(await d.json());
    } catch {}
    setLoading(false);
  }, [navigate]);

  useEffect(() => { carregar(); }, [carregar]);

  const convidar = async () => {
    setErro(""); setSucesso("");
    if (!nome.trim() || !email.trim()) { setErro("Preencha nome e email."); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/usuarios`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ nome: nome.trim(), email: email.trim(), telefone: telefone.trim() || null, role }),
      });
      if (res.ok) {
        setSucesso("Convite enviado! O usuário vai receber um email para ativar a conta.");
        setNome(""); setEmail(""); setTelefone(""); setRole("vendedor");
        await carregar();
        setTimeout(() => { setShowInvite(false); setSucesso(""); }, 1600);
      } else {
        const j = await res.json().catch(() => ({}));
        setErro(typeof j.detail === "string" ? j.detail : "Não foi possível criar o usuário.");
      }
    } catch { setErro("Erro de conexão."); }
    setSaving(false);
  };

  const toggleAtivo = async (u: UsuarioRow) => {
    const anterior = u.ativo;
    setUsuarios(p => p.map(x => x.usuario_id === u.usuario_id ? { ...x, ativo: !anterior } : x));
    const res = await fetch(`${API}/usuarios/${u.usuario_id}`, {
      method: "PATCH", headers: hdrs(), body: JSON.stringify({ ativo: !anterior }),
    });
    if (!res.ok) setUsuarios(p => p.map(x => x.usuario_id === u.usuario_id ? { ...x, ativo: anterior } : x));
  };

  const alterarRole = async (u: UsuarioRow, novaRole: string) => {
    const anterior = u.role;
    setUsuarios(p => p.map(x => x.usuario_id === u.usuario_id ? { ...x, role: novaRole } : x));
    const res = await fetch(`${API}/usuarios/${u.usuario_id}`, {
      method: "PATCH", headers: hdrs(), body: JSON.stringify({ role: novaRole }),
    });
    if (!res.ok) setUsuarios(p => p.map(x => x.usuario_id === u.usuario_id ? { ...x, role: anterior } : x));
  };

  const metricaDe = (id: string) => dash?.vendedores.find(v => v.usuario_id === id);

  if (negado) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg,#c8e8f5,#c5eae0)" }}>
        <style>{css}</style>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 420 }}>
          <Shield style={{ width: 40, height: 40, color: "#dc2626", margin: "0 auto 14px" }} />
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f2133", marginBottom: 8 }}>Acesso restrito</h2>
          <p style={{ fontSize: 13, color: "rgba(20,45,70,0.6)", marginBottom: 20 }}>
            Esta área é exclusiva do gerente da conta.
          </p>
          <button onClick={() => navigate("/dashboard")} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#2980b9,#1abc9c)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  const cards = dash ? [
    { label: "Vendedores", value: dash.conta.total_vendedores, color: "#2980b9", icon: Users },
    { label: "Empresas", value: dash.conta.total_empresas, color: "#8e44ad", icon: Building2 },
    { label: "Ganhos", value: dash.conta.ganhos, color: "#27ae60", icon: TrendingUp },
    { label: "Pipeline", value: money(dash.conta.ticket_total), color: "#d97706", icon: BarChart3 },
  ] : [];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
      <style>{css}</style>

      {/* Background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(145deg,#c8e8f5 0%,#d6eef5 30%,#cceee8 65%,#c5eae0 100%)" }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.4, backgroundImage: "radial-gradient(circle,rgba(41,128,185,0.2) 1px,transparent 1px)", backgroundSize: "22px 22px" }} />
      </div>

      {/* Sidebar */}
      {isMobile && menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(10,31,51,0.45)", zIndex: 999 }} />
      )}
      <div style={{
        width: 220, flexShrink: 0, height: "100vh", overflowY: "auto", zIndex: 1000,
        background: "linear-gradient(180deg,#1a3a5c 0%,#0f2a44 60%,#0a1f33 100%)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", padding: "0 12px 20px",
        position: isMobile ? "fixed" : "relative", top: 0, left: 0,
        transform: isMobile && !menuOpen ? "translateX(-100%)" : "translateX(0)", transition: "transform 0.28s ease",
      }}>
        <div style={{ padding: "22px 4px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#2980b9,#1abc9c)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(41,128,185,0.4)" }}>
              <BarChart3 style={{ width: 18, height: 18, color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Prospecção</div>
              <div style={{ fontSize: 11, fontWeight: 700, background: "linear-gradient(90deg,#2980b9,#1abc9c,#2ecc71,#2980b9)", backgroundSize: "200% 200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "gradientShift 4s ease infinite" }}>CRM</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(item => (
            <div key={item.label} className={`nav-item${item.path === "/equipe" ? " active" : ""}`} onClick={() => navigate(item.path)}>
              <item.icon style={{ width: 16, height: 16, flexShrink: 0 }} />{item.label}
            </div>
          ))}
        </nav>
        <div onClick={() => navigate("/perfil")} style={{ marginTop: 16, padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${avatarColor(me?.nome || "")},#1abc9c)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials(me?.nome || "?")}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{me?.nome || "..."}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>Gerente</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, height: "100vh", overflow: "auto", position: "relative", zIndex: 5 }}>
        {/* Header */}
        <div style={{ padding: isMobile ? "14px 16px" : "20px 30px", background: "rgba(210,238,248,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 10 }}>
          {isMobile && (
            <button onClick={() => setMenuOpen(true)} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(200,225,240,0.9)", background: "rgba(255,255,255,0.75)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Menu style={{ width: 18, height: 18, color: "#2980b9" }} />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(20,45,70,0.45)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{me?.conta_nome || "Gestão"}</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0f2133", letterSpacing: "-0.03em" }}>Equipe & Usuários</h1>
          </div>
          <button onClick={carregar} style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(200,225,240,0.9)", background: "rgba(255,255,255,0.75)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw style={{ width: 15, height: 15, color: "#2980b9" }} />
          </button>
          <button onClick={() => { setShowInvite(true); setErro(""); setSucesso(""); }} style={{ height: 38, padding: "0 16px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#2980b9,#1abc9c,#2ecc71,#2980b9)", backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 14px rgba(41,128,185,0.35)" }}>
            <UserPlus style={{ width: 15, height: 15 }} /> Adicionar usuário
          </button>
        </div>

        <div style={{ padding: isMobile ? "16px" : "24px 30px" }}>
          {/* Métricas */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
            {cards.map(c => (
              <div key={c.label} className="card" style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${c.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <c.icon style={{ width: 16, height: 16, color: c.color }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(20,45,70,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Lista de usuários */}
          <div className="card" style={{ padding: isMobile ? "14px" : "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Users style={{ width: 18, height: 18, color: "#2980b9" }} />
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f2133" }}>Usuários da conta</h2>
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, color: "#2980b9", background: "rgba(41,128,185,0.1)", padding: "2px 9px", borderRadius: 8 }}>{usuarios.length}</span>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(20,45,70,0.4)", fontSize: 13 }}>Carregando...</div>
            ) : usuarios.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(20,45,70,0.45)" }}>
                <Users style={{ width: 34, height: 34, margin: "0 auto 10px", opacity: 0.3 }} />
                <p style={{ fontSize: 13, fontWeight: 600 }}>Nenhum usuário ainda. Adicione o primeiro vendedor.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: isMobile ? 720 : undefined }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 90px 90px 140px", gap: 12, padding: "6px 12px", fontSize: 10, fontWeight: 700, color: "rgba(20,45,70,0.45)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    <span>Usuário</span><span>Papel</span><span>Carteira</span><span>Status</span><span>Ações</span>
                  </div>
                  {usuarios.map((u, idx) => {
                    const m = metricaDe(u.usuario_id);
                    const ehGerente = u.role === "gerente";
                    return (
                      <motion.div key={u.usuario_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: idx * 0.03 }}
                        style={{ display: "grid", gridTemplateColumns: "2fr 1fr 90px 90px 140px", gap: 12, alignItems: "center", padding: "12px", borderTop: "1px solid rgba(200,225,240,0.5)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: avatarColor(u.nome), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials(u.nome)}</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2133", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.nome}</div>
                            <div style={{ fontSize: 11, color: "rgba(20,45,70,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                          </div>
                        </div>
                        <div>
                          <select value={u.role} onChange={e => alterarRole(u, e.target.value)}
                            style={{ height: 30, padding: "0 8px", borderRadius: 7, border: `1px solid ${ehGerente ? "rgba(217,119,6,0.4)" : "rgba(41,128,185,0.3)"}`, background: ehGerente ? "rgba(217,119,6,0.1)" : "rgba(41,128,185,0.08)", fontSize: 11, fontWeight: 700, color: ehGerente ? "#b45309" : "#2980b9", outline: "none", cursor: "pointer" }}>
                            <option value="vendedor">Vendedor</option>
                            <option value="gerente">Gerente</option>
                          </select>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(20,45,70,0.7)" }}>
                          {u.total_empresas}
                          {m && m.ganhos > 0 && <span style={{ fontSize: 10, color: "#27ae60", marginLeft: 4 }}>· {m.ganhos}✓</span>}
                        </div>
                        <div>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 7, background: u.ativo ? "rgba(39,174,96,0.12)" : "rgba(220,38,38,0.1)", color: u.ativo ? "#1e8449" : "#dc2626" }}>
                            {u.ativo ? <CheckCircle2 style={{ width: 11, height: 11 }} /> : <Ban style={{ width: 11, height: 11 }} />}
                            {u.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <div>
                          {u.email === me?.email ? (
                            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(20,45,70,0.4)" }}>Você</span>
                          ) : (
                            <button onClick={() => toggleAtivo(u)}
                              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(200,225,240,0.8)", background: u.ativo ? "rgba(220,38,38,0.06)" : "rgba(39,174,96,0.08)", color: u.ativo ? "#dc2626" : "#1e8449", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                              {u.ativo ? "Desativar" : "Reativar"}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de convite */}
      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !saving && setShowInvite(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(10,31,51,0.5)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <motion.div initial={{ scale: 0.94, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 14 }}
              onClick={e => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: 18, padding: 26, boxShadow: "0 24px 70px rgba(0,0,0,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg,#2980b9,#1abc9c)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserPlus style={{ width: 19, height: 19, color: "#fff" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f2133" }}>Adicionar usuário</h3>
                  <p style={{ fontSize: 12, color: "rgba(20,45,70,0.5)" }}>Ele recebe um email para criar a senha.</p>
                </div>
                <button onClick={() => setShowInvite(false)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "rgba(200,225,240,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X style={{ width: 16, height: 16, color: "rgba(20,45,70,0.6)" }} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(20,45,70,0.6)", marginBottom: 5, display: "block" }}>Nome</label>
                  <input className="ipt" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do vendedor" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(20,45,70,0.6)", marginBottom: 5, display: "block" }}>Email</label>
                  <div style={{ position: "relative" }}>
                    <Mail style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "rgba(20,45,70,0.35)" }} />
                    <input className="ipt" style={{ paddingLeft: 36 }} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@empresa.com" />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(20,45,70,0.6)", marginBottom: 5, display: "block" }}>Telefone (opcional)</label>
                  <input className="ipt" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(20,45,70,0.6)", marginBottom: 5, display: "block" }}>Papel</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { v: "vendedor", l: "Vendedor", ic: Users, d: "Carteira própria" },
                      { v: "gerente", l: "Gerente", ic: Crown, d: "Vê tudo da conta" },
                    ].map(opt => (
                      <button key={opt.v} onClick={() => setRole(opt.v)}
                        style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${role === opt.v ? "#2980b9" : "rgba(200,225,240,0.9)"}`, background: role === opt.v ? "rgba(41,128,185,0.08)" : "#fff", cursor: "pointer", textAlign: "left" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <opt.ic style={{ width: 14, height: 14, color: role === opt.v ? "#2980b9" : "rgba(20,45,70,0.5)" }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: role === opt.v ? "#2980b9" : "#0f2133" }}>{opt.l}</span>
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(20,45,70,0.5)" }}>{opt.d}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {erro && <div style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", background: "rgba(220,38,38,0.08)", padding: "8px 12px", borderRadius: 9 }}>{erro}</div>}
                {sucesso && <div style={{ fontSize: 12, fontWeight: 600, color: "#1e8449", background: "rgba(39,174,96,0.1)", padding: "8px 12px", borderRadius: 9 }}>{sucesso}</div>}

                <button onClick={convidar} disabled={saving}
                  style={{ height: 44, borderRadius: 11, border: "none", cursor: saving ? "default" : "pointer", background: "linear-gradient(135deg,#2980b9,#1abc9c,#2ecc71,#2980b9)", backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite", color: "#fff", fontSize: 14, fontWeight: 700, opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
                  {saving ? "Enviando..." : <><Plus style={{ width: 16, height: 16 }} /> Enviar convite</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
