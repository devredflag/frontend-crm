import { getToken, setAccessToken } from "../../services/auth";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Search, Building2, Users, ClipboardList,
  Calendar, BarChart3, Plus, RefreshCw, Menu, Shield, UserPlus,
  Mail, X, Crown, CheckCircle2, Ban, TrendingUp, UserRoundCog, Network,
} from "lucide-react";
import useIsMobile from "../../hooks/useIsMobile";
import Dropdown from "../../components/Dropdown";
import CardUsuario from "../../components/CardUsuario";

import FundoAzul from "../../components/FundoAzul";
import { FUNDO_AZUL } from "../../components/FundoAzul";
const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:#EAF6FB; transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(159,211,234,0.08); color:#fff; }
  .nav-item.active { background:rgba(159,211,234,0.08); color:#fff; font-weight:600; }
  .card { background:#143354; border:1px solid rgba(159,211,234,0.18); border-radius:14px; }
  .ipt { width:100%; height:42px; border-radius:10px; border:1px solid rgba(159,211,234,0.18); background:rgba(18,59,94,0.55); padding:0 14px; font-size:13px; color:#EAF6FB; outline:none; transition:border-color 0.15s; }
  .ipt:focus { border-color:rgba(159,211,234,0.30); box-shadow:0 0 0 3px rgba(41,128,185,0.08); }
  ::-webkit-scrollbar { width:5px; height:5px; }
  ::-webkit-scrollbar-thumb { background:rgba(46,111,149,0.25); border-radius:4px; }
`;

interface Me {
  usuario_id?: string; email?: string; nome: string; cargo?: string; role?: string;
  is_gerente?: boolean; is_supervisor?: boolean; conta_nome?: string;
}

// Como cada função aparece na interface. "Papel" saiu do vocabulário da tela:
// o usuário lê "Função" (o campo continua sendo `role` na API — não se renomeia
// contrato por estética).
const FUNCOES = [
  { valor: "vendedor",   rotulo: "Vendedor",   desc: "Carteira própria",          cor: "#9FD3EA" },
  { valor: "supervisor", rotulo: "Supervisor", desc: "Acompanha seus vendedores", cor: "#C9B6E4" },
  { valor: "gerente",    rotulo: "Gerente",    desc: "Vê tudo da conta",          cor: "#F2C879" },
] as const;

// Colunas da lista de usuários (cabeçalho e linhas usam a mesma definição).
const GRID_USUARIOS = "2fr 110px 150px 90px 90px 140px";

function rotuloFuncao(role?: string) {
  return FUNCOES.find(f => f.valor === role)?.rotulo || "Vendedor";
}
function corFuncao(role?: string) {
  return FUNCOES.find(f => f.valor === role)?.cor || "#9FD3EA";
}

interface UsuarioRow {
  usuario_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  role: string;
  ativo: boolean;
  data_criacao: string | null;
  total_empresas: number;
  supervisor_id: string | null;
  supervisor_nome: string | null;
}

// Organograma devolvido por GET /equipe/estrutura
interface PessoaEstrutura {
  usuario_id: string;
  nome: string;
  email: string;
  role: string;
  funcao: string;
  ativo: boolean;
  supervisor_id: string | null;
  total_empresas: number;
}
interface Estrutura {
  gerentes: PessoaEstrutura[];
  supervisores: (PessoaEstrutura & { vendedores: PessoaEstrutura[] })[];
  sem_supervisor: PessoaEstrutura[];
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
  { icon: ClipboardList, label: "Gerenciamento", path: "/gerenciamento" },
  { icon: Calendar, label: "Calendario", path: "/calendario" },
  { icon: UserRoundCog, label: "Equipe", path: "/equipe" },
];

function initials(n: string) { return n?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?"; }
function avatarColor(n: string) { const c = ["#9FD3EA", "#83DDA8", "#C9B6E4", "#F2C879", "#83DDA8", "#F7B8B1"]; return c[(n?.charCodeAt(0) || 0) % c.length]; }
function money(v?: number | null) { return `R$ ${Number(v || 0).toLocaleString("pt-BR")}`; }

export default function Equipe() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [estrutura, setEstrutura] = useState<Estrutura | null>(null);
  const [loading, setLoading] = useState(true);
  const [negado, setNegado] = useState(false);
  const [aviso, setAviso] = useState("");

  // modal de convite
  const [showInvite, setShowInvite] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [role, setRole] = useState("vendedor");
  const [supervisorId, setSupervisorId] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  // Quando o Resend recusa o envio, o backend devolve o link de ativação para
  // o gerente repassar por WhatsApp/pessoalmente. O usuário JÁ foi criado.
  const [linkAtivacao, setLinkAtivacao] = useState("");
  const [motivoEmail, setMotivoEmail] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [reenviandoId, setReenviandoId] = useState("");

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
      // Gerente administra; supervisor acompanha (o backend recorta os dados
      // para o ramo dele). Vendedor não entra.
      if (!meData.is_gerente && !meData.is_supervisor) { setNegado(true); setLoading(false); return; }

      const [u, d, e] = await Promise.all([
        fetch(`${API}/usuarios`, { headers: hdrs() }),
        fetch(`${API}/gerencia/dashboard`, { headers: hdrs() }),
        fetch(`${API}/equipe/estrutura`, { headers: hdrs() }),
      ]);
      if (u.ok) setUsuarios(await u.json());
      if (d.ok) setDash(await d.json());
      if (e.ok) setEstrutura(await e.json());
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
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          // Telefone continua opcional no backend: o rótulo perdeu a palavra
          // "opcional", a regra de obrigatoriedade não mudou.
          telefone: telefone.trim() || null,
          role,
          supervisor_id: role === "vendedor" && supervisorId ? supervisorId : null,
        }),
      });
      if (res.ok) {
        const dados = await res.json().catch(() => ({}));
        setNome(""); setEmail(""); setTelefone(""); setRole("vendedor"); setSupervisorId("");
        await carregar();
        if (dados.email_enviado === false) {
          // Cadastro deu certo, email não. Mantém o modal aberto com o link.
          setSucesso("Usuário criado — mas o email não saiu.");
          setMotivoEmail(dados.motivo || "");
          setLinkAtivacao(dados.link_ativacao || "");
        } else {
          setSucesso("Convite enviado! O usuário vai receber um email para ativar a conta.");
          setTimeout(() => { setShowInvite(false); setSucesso(""); }, 1600);
        }
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
    setAviso("");
    setUsuarios(p => p.map(x => x.usuario_id === u.usuario_id ? { ...x, role: novaRole } : x));
    const res = await fetch(`${API}/usuarios/${u.usuario_id}`, {
      method: "PATCH", headers: hdrs(), body: JSON.stringify({ role: novaRole }),
    });
    if (!res.ok) {
      setUsuarios(p => p.map(x => x.usuario_id === u.usuario_id ? { ...x, role: anterior } : x));
      const j = await res.json().catch(() => ({}));
      setAviso(typeof j.detail === "string" ? j.detail : "Não foi possível alterar a função.");
      return;
    }
    const j = await res.json().catch(() => ({}));
    if (j.vendedores_desvinculados) {
      setAviso(`${u.nome} deixou de ser Supervisor. ${j.vendedores_desvinculados} vendedor(es) ficaram sem supervisor — reatribua abaixo.`);
    } else {
      setAviso(`Função de ${u.nome} atualizada para ${rotuloFuncao(novaRole)}.`);
    }
    // A mudança de função reorganiza o organograma inteiro.
    await carregar();
  };

  // Atribui, troca ou REMOVE o vínculo com um supervisor. Remover não apaga o
  // usuário: só zera o vínculo, e ele pode ser reatribuído depois.
  const definirSupervisor = async (u: UsuarioRow, novoId: string) => {
    setAviso("");
    const corpo = novoId
      ? { supervisor_id: novoId }
      : { limpar_supervisor: true };
    const res = await fetch(`${API}/usuarios/${u.usuario_id}`, {
      method: "PATCH", headers: hdrs(), body: JSON.stringify(corpo),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setAviso(typeof j.detail === "string" ? j.detail : "Não foi possível alterar o supervisor.");
      return;
    }
    const nomeSup = usuarios.find(x => x.usuario_id === novoId)?.nome;
    setAviso(novoId
      ? `${u.nome} agora responde a ${nomeSup}.`
      : `${u.nome} ficou sem supervisor. O usuário continua ativo e pode ser reatribuído.`);
    await carregar();
  };

  // Reenvia o convite de quem ainda nao ativou — gera token novo no backend.
  const reenviarConvite = async (u: UsuarioRow) => {
    setAviso(""); setLinkAtivacao(""); setMotivoEmail("");
    setReenviandoId(u.usuario_id);
    try {
      const res = await fetch(`${API}/usuarios/${u.usuario_id}/reenviar-convite`, {
        method: "POST", headers: hdrs(),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAviso(typeof dados.detail === "string" ? dados.detail : "Não foi possível reenviar o convite.");
      } else if (dados.email_enviado === false) {
        setAviso(`O email para ${u.email} não saiu. Copie o link de ativação e envie por outro canal.`);
        setMotivoEmail(dados.motivo || "");
        setLinkAtivacao(dados.link_ativacao || "");
      } else {
        setAviso(dados.msg || "Convite reenviado.");
      }
    } catch {
      setAviso("Erro de conexão ao reenviar o convite.");
    }
    setReenviandoId("");
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkAtivacao);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch { /* navegador sem clipboard: o link fica visível para copiar à mão */ }
  };

  const metricaDe = (id: string) => dash?.vendedores.find(v => v.usuario_id === id);

  if (negado) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background:FUNDO_AZUL.background, backgroundSize: FUNDO_AZUL.backgroundSize }}>
        <style>{css}</style>
        <div className="card" style={{ padding: 40, textAlign: "center", maxWidth: 420 }}>
          <Shield style={{ width: 40, height: 40, color:"#F7B8B1", margin: "0 auto 14px" }} />
          <h2 style={{ fontSize: 18, fontWeight: 800, color:"#EAF6FB", marginBottom: 8 }}>Acesso restrito</h2>
          <p style={{ fontSize: 13, color:"#EAF6FB", marginBottom: 20 }}>
            Esta área é exclusiva de gerentes e supervisores da conta.
          </p>
          <button onClick={() => navigate("/dashboard")} style={{ padding: "10px 20px", borderRadius: 10, border:"none", background:"linear-gradient(135deg,#2E6F95,#2E6F95)", color:"#EAF6FB", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  const ehGerente = !!me?.is_gerente;
  const supervisores = usuarios.filter(u => u.role === "supervisor");
  const semSupervisor = usuarios.filter(u => u.role === "vendedor" && !u.supervisor_id).length;

  const cards = dash ? [
    { label: "Vendedores", value: dash.conta.total_vendedores, color:"#9FD3EA", icon: Users },
    { label: "Empresas", value: dash.conta.total_empresas, color:"#9FD3EA", icon: Building2 },
    { label: "Ganhos", value: dash.conta.ganhos, color:"#83DDA8", icon: TrendingUp },
    { label: "Pipeline", value: money(dash.conta.ticket_total), color:"#F2C879", icon: BarChart3 },
  ] : [];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
      <style>{css}</style>

      {/* Background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
        <FundoAzul />
      </div>

      {/* Sidebar */}
      {isMobile && menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background:"rgba(10,31,51,0.45)", zIndex: 999 }} />
      )}
      <div style={{
        width: 220, flexShrink: 0, height: "100vh", overflowY: "auto", zIndex: 1000,
        background:"linear-gradient(180deg,#1a3a5c 0%,#0f2a44 60%,#0a1f33 100%)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", padding: "0 12px 20px",
        position: isMobile ? "fixed" : "relative", top: 0, left: 0,
        transform: isMobile && !menuOpen ? "translateX(-100%)" : "translateX(0)", transition: "transform 0.28s ease",
      }}>
        <div style={{ padding: "22px 4px 24px", borderBottom:"1px solid rgba(159,211,234,0.18)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background:"linear-gradient(135deg,#2E6F95,#2E6F95)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(46,111,149,0.4)" }}>
              <BarChart3 style={{ width: 18, height: 18, color:"#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color:"#fff" }}>Prospecção</div>
              <div style={{ fontSize: 11, fontWeight: 700, background:"linear-gradient(90deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize: "200% 200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "gradientShift 4s ease infinite" }}>CRM</div>
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
        <CardUsuario />
      </div>

      {/* Main */}
      <div style={{ flex: 1, height: "100vh", overflow: "auto", position: "relative", zIndex: 5 }}>
        {/* Header */}
        <div style={{ padding: isMobile ? "14px 16px" : "20px 30px", background:"rgba(15,46,75,0.88)", backdropFilter: "blur(20px)", borderBottom:"1px solid rgba(159,211,234,0.18)", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 10 }}>
          {isMobile && (
            <button onClick={() => setMenuOpen(true)} style={{ width: 36, height: 36, borderRadius: 10, border:"1px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Menu style={{ width: 18, height: 18, color:"#9FD3EA" }} />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color:"#9FD3EA", letterSpacing: "0.08em", textTransform: "uppercase" }}>{me?.conta_nome || "Gestão"}</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color:"#EAF6FB", letterSpacing: "-0.03em" }}>
              {ehGerente ? "Equipe & Usuários" : "Minha equipe"}
            </h1>
          </div>
          <button onClick={carregar} style={{ width: 38, height: 38, borderRadius: 10, border:"1px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw style={{ width: 15, height: 15, color:"#9FD3EA" }} />
          </button>
          {/* Convidar usuario e prerrogativa do gerente — a API tambem recusa
              a chamada de quem nao for gerente, nao e so o botao escondido. */}
          {ehGerente && (
            <button onClick={() => { setShowInvite(true); setErro(""); setSucesso(""); setLinkAtivacao(""); setMotivoEmail(""); }} style={{ height: 38, padding: "0 16px", borderRadius: 10, border:"none", cursor: "pointer", background:"linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite", color:"#EAF6FB", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 14px rgba(159,211,234,0.30)" }}>
              <UserPlus style={{ width: 15, height: 15 }} /> Adicionar usuário
            </button>
          )}
        </div>

        <div style={{ padding: isMobile ? "16px" : "24px 30px" }}>
          {/* Métricas */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
            {cards.map(c => (
              <div key={c.label} className="card" style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background:`${c.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <c.icon style={{ width: 16, height: 16, color:c.color }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color:"#9FD3EA", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color:c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Aviso do resultado das ações de hierarquia */}
          {aviso && (
            <div className="card" style={{ padding: "11px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 9, border:"1px solid rgba(159,211,234,0.30)", background:"rgba(46,111,149,0.07)" }}>
              <CheckCircle2 style={{ width: 15, height: 15, color:"#9FD3EA", flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color:"#9FD3EA", flex: 1 }}>{aviso}</span>
              <button onClick={() => { setAviso(""); setLinkAtivacao(""); setMotivoEmail(""); }} aria-label="Fechar aviso"
                style={{ border:"none", background:"none", cursor: "pointer", color:"#9FD3EA", display: "flex" }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          )}

          {!showInvite && linkAtivacao && (
            <div style={{ marginBottom: 16 }}>
              <LinkAtivacao link={linkAtivacao} motivo={motivoEmail} copiado={copiado} onCopiar={copiarLink} />
            </div>
          )}

          {/* Estrutura da equipe: Gerente -> Supervisor -> Vendedores */}
          <div className="card" style={{ padding: isMobile ? "14px" : "20px 22px", marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <Network style={{ width: 18, height: 18, color:"#9FD3EA" }} />
              <h2 style={{ fontSize: 16, fontWeight: 800, color:"#EAF6FB" }}>
                {ehGerente ? "Estrutura da equipe" : "Vendedores sob sua supervisão"}
              </h2>
              {ehGerente && semSupervisor > 0 && (
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color:"#F2C879", background:"rgba(217,119,6,0.12)", padding: "3px 10px", borderRadius: 8 }}>
                  {semSupervisor} vendedor(es) sem supervisor
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color:"#9FD3EA", marginBottom: 16 }}>
              {ehGerente
                ? "Cada supervisor enxerga apenas os vendedores atribuídos a ele. Use a coluna Supervisor, na lista abaixo, para mudar as atribuições."
                : "Você acompanha os resultados destes vendedores. A estrutura é definida pelo gerente da conta."}
            </p>

            {loading ? (
              <div style={{ padding: 30, textAlign: "center", color:"#9FD3EA", fontSize: 13 }}>Carregando estrutura...</div>
            ) : !estrutura || (estrutura.supervisores.length === 0 && estrutura.sem_supervisor.length === 0) ? (
              <div style={{ padding: "30px 20px", textAlign: "center", color:"#9FD3EA" }}>
                <Network style={{ width: 30, height: 30, margin: "0 auto 10px", opacity: 0.3 }} />
                <p style={{ fontSize: 13, fontWeight: 700 }}>
                  {ehGerente ? "Nenhum supervisor cadastrado ainda." : "Nenhum vendedor atribuído a você ainda."}
                </p>
                <p style={{ fontSize: 12, marginTop: 4 }}>
                  {ehGerente
                    ? "Adicione um usuário com a função Supervisor e atribua vendedores a ele."
                    : "Quando o gerente atribuir vendedores, eles aparecem aqui."}
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
                {estrutura.supervisores.map(sup => (
                  <div key={sup.usuario_id} style={{ borderRadius: 12, border:"1px solid rgba(142,68,173,0.25)", background:"rgba(142,68,173,0.04)", padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 10, borderBottom:"1px solid rgba(142,68,173,0.18)" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background:"#2E6F95", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, color:"#EAF6FB", flexShrink: 0 }}>
                        {initials(sup.nome)}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color:"#EAF6FB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {sup.nome}
                          {!sup.ativo && <span style={{ fontSize: 10, color:"#F7B8B1", marginLeft: 6 }}>inativo</span>}
                        </div>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color:"#C9B6E4" }}>Supervisor</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color:"#C9B6E4", background:"rgba(142,68,173,0.12)", padding: "2px 9px", borderRadius: 8, flexShrink: 0 }}>
                        {sup.vendedores.length}
                      </span>
                    </div>
                    {sup.vendedores.length === 0 ? (
                      <p style={{ fontSize: 11.5, color:"#9FD3EA", fontWeight: 600, padding: "12px 2px 2px" }}>
                        Nenhum vendedor atribuído a este supervisor.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10 }}>
                        {sup.vendedores.map(v => (
                          <div key={v.usuario_id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 8, background:avatarColor(v.nome), display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, color:"#EAF6FB", flexShrink: 0 }}>
                              {initials(v.nome)}
                            </div>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color:"#EAF6FB", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {v.nome}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color:"#9FD3EA", flexShrink: 0 }}>
                              {v.total_empresas} emp.
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Vendedores sem vínculo existem de propósito: remover a
                    atribuição não exclui o usuário. */}
                {estrutura.sem_supervisor.length > 0 && (
                  <div style={{ borderRadius: 12, border:"1px dashed rgba(217,119,6,0.4)", background:"rgba(217,119,6,0.05)", padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10, borderBottom:"1px solid rgba(217,119,6,0.2)" }}>
                      <Ban style={{ width: 15, height: 15, color:"#F2C879" }} />
                      <div style={{ fontSize: 13, fontWeight: 800, color:"#F2C879", flex: 1 }}>Sem supervisor</div>
                      <span style={{ fontSize: 11, fontWeight: 800, color:"#F2C879" }}>{estrutura.sem_supervisor.length}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10 }}>
                      {estrutura.sem_supervisor.map(v => (
                        <div key={v.usuario_id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 8, background:avatarColor(v.nome), display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, color:"#EAF6FB", flexShrink: 0 }}>
                            {initials(v.nome)}
                          </div>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color:"#EAF6FB", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {v.nome}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color:"#9FD3EA", flexShrink: 0 }}>
                            {v.total_empresas} emp.
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lista de usuários */}
          <div className="card" style={{ padding: isMobile ? "14px" : "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Users style={{ width: 18, height: 18, color:"#9FD3EA" }} />
              <h2 style={{ fontSize: 16, fontWeight: 800, color:"#EAF6FB" }}>{ehGerente ? "Usuários da conta" : "Meus vendedores"}</h2>
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, color:"#9FD3EA", background:"rgba(46,111,149,0.1)", padding: "2px 9px", borderRadius: 8 }}>{usuarios.length}</span>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color:"#9FD3EA", fontSize: 13 }}>Carregando...</div>
            ) : usuarios.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color:"#9FD3EA" }}>
                <Users style={{ width: 34, height: 34, margin: "0 auto 10px", opacity: 0.3 }} />
                <p style={{ fontSize: 13, fontWeight: 600 }}>Nenhum usuário ainda. Adicione o primeiro vendedor.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: isMobile ? 720 : undefined }}>
                  <div style={{ display: "grid", gridTemplateColumns: GRID_USUARIOS, gap: 12, padding: "6px 12px", fontSize: 10, fontWeight: 700, color:"#9FD3EA", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    <span>Usuário</span><span>Função</span><span>Supervisor</span><span>Carteira</span><span>Status</span><span>Ações</span>
                  </div>
                  {usuarios.map((u, idx) => {
                    const m = metricaDe(u.usuario_id);
                    const cor = corFuncao(u.role);
                    return (
                      <motion.div key={u.usuario_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: idx * 0.03 }}
                        style={{ display: "grid", gridTemplateColumns: GRID_USUARIOS, gap: 12, alignItems: "center", padding: "12px", borderTop:"1px solid rgba(159,211,234,0.18)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background:avatarColor(u.nome), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color:"#EAF6FB", flexShrink: 0 }}>{initials(u.nome)}</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color:"#EAF6FB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.nome}</div>
                            <div style={{ fontSize: 11, color:"#9FD3EA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                          </div>
                        </div>
                        {/* Função — quem não é gerente vê o rótulo, sem poder editar */}
                        <div>
                          {ehGerente ? (
                            <Dropdown
                              valor={u.role} onChange={v => alterarRole(u, v)}
                              ariaLabel={`Função de ${u.nome}`} altura={30} corAtiva={cor}
                              opcoes={FUNCOES.map(f => ({
                                valor: f.valor, rotulo: f.rotulo, detalhe: f.desc, cor: f.cor,
                              }))}
                            />
                          ) : (
                            <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 7, background:`${cor}14`, color:cor, fontSize: 11, fontWeight: 700 }}>
                              {rotuloFuncao(u.role)}
                            </span>
                          )}
                        </div>

                        {/* Supervisor — atribuir, trocar ou remover o vínculo.
                            Remover não exclui o usuário: ele só fica sem supervisor. */}
                        <div>
                          {u.role !== "vendedor" ? (
                            <span style={{ fontSize: 11, fontWeight: 600, color:"#9FD3EA" }}>—</span>
                          ) : ehGerente ? (
                            <Dropdown
                              valor={u.supervisor_id || ""} onChange={v => definirSupervisor(u, v)}
                              ariaLabel={`Supervisor de ${u.nome}`} altura={30}
                              disabled={supervisores.length === 0}
                              corAtiva={u.supervisor_id ? "#C9B6E4" : "#F2C879"}
                              busca={supervisores.length > 8}
                              placeholder={supervisores.length === 0 ? "Nenhum supervisor" : "Sem supervisor"}
                              opcoes={[
                                {
                                  valor: "",
                                  rotulo: supervisores.length === 0 ? "Nenhum supervisor" : "Sem supervisor",
                                  cor: "#F2C879",
                                },
                                ...supervisores.map(sv => ({
                                  valor: sv.usuario_id, rotulo: sv.nome,
                                  icone: UserRoundCog, cor: "#C9B6E4",
                                })),
                              ]}
                            />
                          ) : (
                            <span style={{ fontSize: 11.5, fontWeight: 600, color:u.supervisor_nome ? "#C9B6E4" : "#9FD3EA" }}>
                              {u.supervisor_nome || "Sem supervisor"}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color:"#EAF6FB" }}>
                          {u.total_empresas}
                          {m && m.ganhos > 0 && <span style={{ fontSize: 10, color:"#83DDA8", marginLeft: 4 }}>· {m.ganhos}✓</span>}
                        </div>
                        <div>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 7, background:u.ativo ? "rgba(39,174,96,0.12)" : "rgba(220,38,38,0.1)", color: u.ativo ? "#83DDA8" : "#F7B8B1" }}>
                            {u.ativo ? <CheckCircle2 style={{ width: 11, height: 11 }} /> : <Ban style={{ width: 11, height: 11 }} />}
                            {u.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <div>
                          {u.email === me?.email ? (
                            <span style={{ fontSize: 11, fontWeight: 600, color:"#9FD3EA" }}>Você</span>
                          ) : !ehGerente ? (
                            <span style={{ fontSize: 11, fontWeight: 600, color:"#9FD3EA" }}>—</span>
                          ) : (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button onClick={() => toggleAtivo(u)}
                                style={{ padding: "6px 12px", borderRadius: 8, border:"1px solid rgba(159,211,234,0.18)", background: u.ativo ? "rgba(220,38,38,0.06)" : "rgba(39,174,96,0.08)", color: u.ativo ? "#F7B8B1" : "#83DDA8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                {u.ativo ? "Desativar" : "Reativar"}
                              </button>
                              {/* Quem nunca ativou pode nao ter recebido o email */}
                              {!u.ativo && (
                                <button onClick={() => reenviarConvite(u)} disabled={reenviandoId === u.usuario_id}
                                  title="Gerar um convite novo e reenviar por email"
                                  style={{ padding: "6px 10px", borderRadius: 8, border:"1px solid rgba(159,211,234,0.30)", background:"rgba(46,111,149,0.08)", color:"#9FD3EA", fontSize: 11, fontWeight: 700, cursor: reenviandoId === u.usuario_id ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                  <Mail style={{ width: 11, height: 11 }} />
                                  {reenviandoId === u.usuario_id ? "Enviando..." : "Reenviar"}
                                </button>
                              )}
                            </div>
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
            /* Fecha no MOUSEDOWN sobre o próprio overlay, não no click. Com
               `onClick`, o navegador dispara o evento no ancestral comum de
               mousedown e mouseup: selecionar texto dentro do modal e soltar o
               botão fora fechava tudo, levando junto o que já fora digitado. */
            onMouseDown={e => { if (e.target === e.currentTarget && !saving) setShowInvite(false); }}
            style={{ position: "fixed", inset: 0, background:"rgba(10,31,51,0.5)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <motion.div initial={{ scale: 0.94, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 14 }}
              onMouseDown={e => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 440, background:"#143354", border:"1px solid rgba(159,211,234,0.22)", borderRadius: 18, padding: 26, boxShadow: "0 24px 70px rgba(3,14,26,0.55)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background:"linear-gradient(135deg,#2E6F95,#2E6F95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserPlus style={{ width: 19, height: 19, color:"#fff" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color:"#EAF6FB" }}>Adicionar usuário</h3>
                  <p style={{ fontSize: 12, color:"#9FD3EA" }}>Ele recebe um email para criar a senha.</p>
                </div>
                <button onClick={() => setShowInvite(false)} style={{ width: 30, height: 30, borderRadius: 8, border:"none", background:"rgba(159,211,234,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X style={{ width: 16, height: 16, color:"#EAF6FB" }} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color:"#EAF6FB", marginBottom: 5, display: "block" }}>Nome</label>
                  <input className="ipt" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color:"#EAF6FB", marginBottom: 5, display: "block" }}>Email</label>
                  <div style={{ position: "relative" }}>
                    <Mail style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color:"#9FD3EA" }} />
                    <input className="ipt" style={{ paddingLeft: 36 }} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@empresa.com" />
                  </div>
                </div>
                <div>
                  <label htmlFor="novo-telefone" style={{ fontSize: 11, fontWeight: 700, color:"#EAF6FB", marginBottom: 5, display: "block" }}>Telefone</label>
                  <input id="novo-telefone" className="ipt" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color:"#EAF6FB", marginBottom: 5, display: "block" }}>Função</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
                    {[
                      { v: "vendedor",   ic: Users,        },
                      { v: "supervisor", ic: UserRoundCog, },
                      { v: "gerente",    ic: Crown,        },
                    ].map(opt => {
                      const info = FUNCOES.find(f => f.valor === opt.v)!;
                      const on = role === opt.v;
                      return (
                        // O não-selecionado era `background:"#fff"` — um bloco
                        // branco dentro de um modal escuro, com texto claro por
                        // cima. Agora repousa na superfície do modal e o estado
                        // ativo é fundo sólido na cor da função.
                        <button key={opt.v} type="button" onClick={() => { setRole(opt.v); if (opt.v !== "vendedor") setSupervisorId(""); }}
                          aria-pressed={on}
                          style={{
                            padding: "10px 9px", borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                            border:`1.5px solid ${on ? info.cor : "rgba(159,211,234,0.18)"}`,
                            background:on ? info.cor : "#123253",
                            boxShadow:on ? `0 0 0 3px ${info.cor}33` : "none",
                            transition:"all 0.15s",
                          }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <opt.ic style={{ width: 14, height: 14, color:on ? "#0A2338" : "#9FD3EA", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: on ? 800 : 700, color:on ? "#0A2338" : "#EAF6FB" }}>{info.rotulo}</span>
                          </div>
                          <div style={{ fontSize: 10, color:on ? "rgba(10,35,56,0.78)" : "#9FD3EA", lineHeight: 1.35, fontWeight:on ? 600 : 400 }}>{info.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Atribuicao do supervisor no MESMO fluxo do cadastro, para o
                    gerente nao ter que abrir outra tela depois. */}
                {role === "vendedor" && (
                  <div>
                    <label htmlFor="novo-supervisor" style={{ fontSize: 11, fontWeight: 700, color:"#EAF6FB", marginBottom: 5, display: "block" }}>
                      Supervisor
                    </label>
                    {supervisores.length === 0 ? (
                      <div style={{ fontSize: 11.5, color:"#9FD3EA", background:"rgba(217,119,6,0.07)", border:"1px solid rgba(217,119,6,0.25)", borderRadius: 9, padding: "9px 12px" }}>
                        Nenhum supervisor cadastrado ainda. Você pode criar o vendedor agora e atribuir depois.
                      </div>
                    ) : (
                      <Dropdown
                        id="novo-supervisor" ariaLabel="Supervisor do novo vendedor"
                        valor={supervisorId} onChange={setSupervisorId}
                        corAtiva="#C9B6E4" altura={44}
                        busca={supervisores.length > 8}
                        placeholder="Sem supervisor (definir depois)"
                        opcoes={[
                          { valor: "", rotulo: "Sem supervisor (definir depois)" },
                          ...supervisores.map(sv => ({
                            valor: sv.usuario_id, rotulo: sv.nome,
                            detalhe: `${sv.total_empresas} empresa${sv.total_empresas === 1 ? "" : "s"}`,
                            icone: UserRoundCog, cor: "#C9B6E4",
                          })),
                        ]}
                      />
                    )}
                  </div>
                )}

                {erro && <div style={{ fontSize: 12, fontWeight: 600, color:"#F7B8B1", background:"rgba(220,38,38,0.08)", padding: "8px 12px", borderRadius: 9 }}>{erro}</div>}
                {sucesso && (
                  <div style={{ fontSize: 12, fontWeight: 600, color:linkAtivacao ? "#F2C879" : "#83DDA8", background: linkAtivacao ? "rgba(217,119,6,0.1)" : "rgba(39,174,96,0.1)", padding: "8px 12px", borderRadius: 9 }}>
                    {sucesso}
                  </div>
                )}
                {linkAtivacao && <LinkAtivacao link={linkAtivacao} motivo={motivoEmail} copiado={copiado} onCopiar={copiarLink} />}

                <button onClick={convidar} disabled={saving}
                  style={{ height: 44, borderRadius: 11, border:"none", cursor: saving ? "default" : "pointer", background:"linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite", color:"#EAF6FB", fontSize: 14, fontWeight: 700, opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
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

// Mostrado quando o convite por email nao sai: o usuario JA foi criado, entao o
// que falta e fazer o link chegar nele por outro canal.
function LinkAtivacao({
  link, motivo, copiado, onCopiar,
}: {
  link: string; motivo: string; copiado: boolean; onCopiar: () => void;
}) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, background:"rgba(217,119,6,0.07)", border:"1px solid rgba(217,119,6,0.28)" }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color:"#F2C879", marginBottom: 6 }}>
        Envie este link de ativação para a pessoa:
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input readOnly value={link} onFocus={e => e.currentTarget.select()}
          aria-label="Link de ativação"
          style={{ flex: 1, minWidth: 180, height: 34, padding: "0 10px", borderRadius: 8, border:"1px solid rgba(217,119,6,0.3)", background:"rgba(18,59,94,0.55)", fontSize: 11.5, color:"#EAF6FB", outline:"none" }} />
        <button onClick={onCopiar}
          style={{ height: 34, padding: "0 14px", borderRadius: 8, border:"none", cursor: "pointer", background: copiado ? "#83DDA8" : "#F2C879", color:"#EAF6FB", fontSize: 11.5, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
          {copiado ? <><CheckCircle2 style={{ width: 12, height: 12 }} /> Copiado</> : "Copiar"}
        </button>
      </div>
      {motivo && (
        <div style={{ fontSize: 11, color:"#EAF6FB", marginTop: 8, lineHeight: 1.5 }}>
          <strong>Por que o email não saiu:</strong> {motivo}
        </div>
      )}
    </div>
  );
}
