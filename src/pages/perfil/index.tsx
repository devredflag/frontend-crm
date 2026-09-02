import { getToken } from "../../services/auth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bell, Shield, Mail,
  MessageCircle, Monitor, Check, ChevronRight,
  Globe, ExternalLink, Info, Save, BarChart3,
  LayoutDashboard, TrendingUp, Building2, Users, UserRoundCog,
  Search, ClipboardList, Calendar,
  AlertTriangle, CalendarCheck, Repeat, Trash2, FileText, Menu,
  RefreshCw, XCircle, CheckCircle2
} from "lucide-react";
import useIsMobile from "../../hooks/useIsMobile";
import { GmailIcon, OutlookIcon, WhatsAppIcon } from "../../components/LogosMarcas";
import CardUsuario, { useUsuarioLogado } from "../../components/CardUsuario";

import FundoAzul from "../../components/FundoAzul";
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(41,128,185,0.35)} 70%{box-shadow:0 0 0 8px rgba(41,128,185,0)} 100%{box-shadow:0 0 0 0 rgba(41,128,185,0)} }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:#EAF6FB; transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(159,211,234,0.08); color:#fff; }
  .nav-item.active { background:rgba(159,211,234,0.08); color:#fff; font-weight:600; }
  .glass-card { background:#143354; border:1px solid rgba(159,211,234,0.18); border-radius:16px; }
  .settings-tab { display:flex; align-items:center; gap:10px; padding:11px 14px; border-radius:11px; cursor:pointer; font-size:13px; font-weight:500; color:#EAF6FB; transition:all 0.18s; user-select:none; }
  .settings-tab:hover { background:rgba(46,111,149,0.07); color:#EAF6FB; }
  .settings-tab.active { background:rgba(46,111,149,0.1); color:#9FD3EA; font-weight:700; }
  .channel-card { padding:18px; border-radius:14px; border:2px solid rgba(126,176,219,0.22); background:#123253; cursor:pointer; transition:all 0.22s; position:relative; overflow:hidden; }
  .channel-card:hover { border-color:rgba(0,120,212,0.3); background:rgba(18,59,94,0.55); transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,120,212,0.1); }
  .channel-card.selected-outlook { border-color:#50B3FF; background:rgba(0,120,212,0.12); box-shadow:0 0 0 3px rgba(0,120,212,0.20); }
  .channel-card.selected-green { border-color:#25D366; background:rgba(37,211,102,0.10); box-shadow:0 0 0 3px rgba(37,211,102,0.18); }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(46,111,149,0.25); border-radius:4px; }
  .notif-row { display:flex; align-items:center; gap:14px; padding:14px 16px; border-radius:12px; background:rgba(18,59,94,0.55); border:1px solid rgba(159,211,234,0.18); transition:background 0.16s; }
  .notif-row:hover { background:rgba(18,59,94,0.55); }
  .toggle-track { width:42px; height:24px; border-radius:12px; position:relative; cursor:pointer; flex-shrink:0; transition:background 0.22s; }
  .toggle-thumb { position:absolute; top:3px; width:18px; height:18px; border-radius:50%; background:#FFFFFF; transition:left 0.22s; box-shadow:0 1px 4px rgba(3,14,26,0.45); }
  .save-btn { height:40px; padding:0 20px; border-radius:10px; border:none; cursor:pointer; background:linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95); background-size:200% 200%; animation:gradientShift 4s ease infinite; color:#fff; font-size:13px; font-weight:700; display:flex; align-items:center; gap:7px; box-shadow:0 4px 14px rgba(41,128,185,0.3); transition:opacity 0.18s; }
  .save-btn:hover { opacity:0.9; }
`;

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

interface Usuario {
  nome: string; email: string; cargo: string; empresa_nome: string;
  is_gerente?: boolean; is_supervisor?: boolean;
}

interface CanalIntegracao {
  ativo: boolean;
  caixa?: string | null;
  expira_em?: string | null;
  atualizado_em?: string | null;
}

interface IntegracoesStatus {
  canais: Record<string, CanalIntegracao>;
  gmail_pubsub_configurado: boolean;
  remetente_sandbox: boolean;
}

interface PessoaIntegracao {
  nome: string;
  email: string;
  funcao: string;
  google_conectado: boolean;
  canais: Record<string, CanalIntegracao>;
}

type EmailProvider = "gmail" | "outlook" | null;
type OutlookMode = "web" | "app" | null;
type WhatsAppMode = "web" | "app" | null;
type SettingsTab = "comunicacao" | "perfil" | "notificacoes" | "seguranca";

interface NotifPrefs {
  rascunho_aviso: boolean;
  rascunho_excluido: boolean;
  email_interaction: boolean;
  calendar_accepted: boolean;
  calendar_declined: boolean;
  visita_lembrete: boolean;
}

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  rascunho_aviso: true,
  rascunho_excluido: true,
  email_interaction: true,
  calendar_accepted: true,
  calendar_declined: true,
  visita_lembrete: false,
};

function avatarColor(n: string) {
  const c = ["#9FD3EA","#83DDA8","#C9B6E4","#F2C879","#83DDA8","#F7B8B1"];
  return c[(n?.charCodeAt(0) || 0) % c.length];
}
function initials(n: string) { return n?.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase() || "?"; }

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",                path: "/dashboard" },
  { icon: TrendingUp,      label: "Insights",                  path: "/insights" },
  { icon: Search,          label: "Buscar Empresas",           path: "/buscar" },
  { icon: Building2,       label: "Cadastrar Empresas",        path: "/empresas/nova" },
  { icon: Users,           label: "Todos os clientes",         path: "/clientes" },
  { icon: ClipboardList,   label: "Gerenciamento", path: "/gerenciamento" },
  { icon: Calendar,        label: "Calendário",                path: "/calendario" },
];

const settingsTabs: { key: SettingsTab; icon: any; label: string; badge?: string }[] = [
  { key: "comunicacao",   icon: MessageCircle, label: "Comunicação",     badge: "Configurar" },
  { key: "perfil",        icon: User,          label: "Perfil" },
  { key: "notificacoes",  icon: Bell,          label: "Notificações" },
  { key: "seguranca",     icon: Shield,        label: "Segurança" },
];

/** Estado das integracoes que alimentam as notificacoes.
 *
 * Existe porque watch que morre nao aparece em lugar nenhum da aplicacao: ate
 * aqui, "a notificacao nao chega" era indistinguivel de "o canal nunca subiu",
 * e responder isso exigia log do Railway ou curl com token na mao.
 */
function PainelIntegracoes() {
  const [dados, setDados]       = useState<IntegracoesStatus | null>(null);
  const [equipe, setEquipe]     = useState<PessoaIntegracao[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]         = useState<string | null>(null);

  const buscar = async () => {
    setCarregando(true);
    setErro(null);
    const cab = { Authorization: `Bearer ${getToken() || ""}` };
    try {
      const res = await fetch(`${API}/admin/integracoes-status`, { headers: cab });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDados(await res.json());
    } catch (e: any) {
      setErro(e?.message || "Falha ao consultar");
    }
    // A equipe e complementar: se essa falhar, o painel proprio ainda serve.
    try {
      const res = await fetch(`${API}/admin/integracoes-equipe`, { headers: cab });
      setEquipe(res.ok ? (await res.json()).pessoas : null);
    } catch {
      setEquipe(null);
    }
    setCarregando(false);
  };

  // Só na montagem: buscar e recriado a cada render e recriaria o efeito.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { buscar(); }, []);

  const linhas: { chave: string; rotulo: string; desc: string }[] = [
    { chave: "gmail",           rotulo: "Gmail",           desc: "Resposta de e-mail de cliente vira notificação" },
    { chave: "google_calendar", rotulo: "Google Calendar", desc: "Resposta a convite de reunião em tempo real" },
    { chave: "outlook",         rotulo: "Outlook",         desc: "E-mail e agenda pela conta Microsoft" },
  ];

  const dataCurta = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  return (
    <div className="glass-card" style={{ padding:18, marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:14 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:"#EAF6FB" }}>Integrações e notificações</div>
          <div style={{ fontSize:11, color:"#9FD3EA", marginTop:2 }}>
            Canais que precisam estar de pé para as notificações chegarem
          </div>
        </div>
        <button onClick={buscar} disabled={carregando}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:8,
                   border:"1px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)",
                   color:"#9FD3EA", fontSize:11, fontWeight:700,
                   cursor:carregando ? "default" : "pointer", opacity:carregando ? 0.6 : 1, flexShrink:0 }}>
          <RefreshCw style={{ width:12, height:12 }}/> {carregando ? "Verificando" : "Reverificar"}
        </button>
      </div>

      {erro ? (
        <div style={{ fontSize:12, color:"#F7B8B1" }}>Não foi possível consultar: {erro}</div>
      ) : carregando && !dados ? (
        <div style={{ fontSize:12, color:"#9FD3EA" }}>Consultando…</div>
      ) : dados ? (
        <>
          {linhas.map(l => {
            const c = dados.canais?.[l.chave] || { ativo:false };
            const validade = dataCurta(c.expira_em);
            return (
              <div key={l.chave} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0",
                                          borderBottom:"1px solid rgba(159,211,234,0.12)" }}>
                {c.ativo
                  ? <CheckCircle2 style={{ width:16, height:16, color:"#2CCD93", flexShrink:0 }}/>
                  : <XCircle style={{ width:16, height:16, color:"#F87171", flexShrink:0 }}/>}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#EAF6FB" }}>
                    {l.rotulo}
                    {c.caixa && <span style={{ fontWeight:500, color:"#9FD3EA" }}> — {c.caixa}</span>}
                  </div>
                  <div style={{ fontSize:10.5, color:"#9FD3EA", marginTop:1 }}>
                    {c.ativo
                      ? (validade ? `Ativo, renova antes de ${validade}` : "Ativo")
                      : l.desc}
                  </div>
                </div>
                <span style={{ fontSize:10, fontWeight:800, letterSpacing:"0.04em", flexShrink:0,
                               color:c.ativo ? "#2CCD93" : "#F87171" }}>
                  {c.ativo ? "ATIVO" : "INATIVO"}
                </span>
              </div>
            );
          })}

          {!dados.gmail_pubsub_configurado && (
            <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginTop:14, padding:"10px 12px",
                          borderRadius:10, background:"rgba(240,160,90,0.08)",
                          border:"1px solid rgba(240,160,90,0.25)" }}>
              <AlertTriangle style={{ width:14, height:14, color:"#F0A05A", flexShrink:0, marginTop:1 }}/>
              <div style={{ fontSize:11, color:"#EAF6FB", lineHeight:1.5 }}>
                <strong>Pub/Sub não configurado.</strong> Enquanto <code>GMAIL_PUBSUB_TOPIC</code> não
                for definida no servidor, o Gmail não consegue avisar o CRM e nenhuma resposta de
                cliente vira notificação.
              </div>
            </div>
          )}

          {dados.remetente_sandbox && (
            <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginTop:10, padding:"10px 12px",
                          borderRadius:10, background:"rgba(240,160,90,0.08)",
                          border:"1px solid rgba(240,160,90,0.25)" }}>
              <AlertTriangle style={{ width:14, height:14, color:"#F0A05A", flexShrink:0, marginTop:1 }}/>
              <div style={{ fontSize:11, color:"#EAF6FB", lineHeight:1.5 }}>
                <strong>Remetente em modo de teste.</strong> O e-mail sai de um endereço de sandbox
                do Resend, que só entrega para o dono da conta — orçamento enviado pelo CRM não
                chega ao cliente.
              </div>
            </div>
          )}
        </>
      ) : null}

      {equipe && equipe.length > 1 && (
        <div style={{ marginTop:18, paddingTop:16, borderTop:"1px solid rgba(159,211,234,0.18)" }}>
          <div style={{ fontSize:12, fontWeight:800, color:"#EAF6FB", marginBottom:2 }}>Equipe</div>
          <div style={{ fontSize:10.5, color:"#9FD3EA", marginBottom:10 }}>
            Quem está sem canal ativo não recebe notificação de resposta
          </div>

          {equipe.map(p => {
            const ativos = Object.values(p.canais || {}).filter(c => c.ativo).length;
            const problema = !p.google_conectado || ativos === 0;
            return (
              <div key={p.email} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0",
                                          borderBottom:"1px solid rgba(159,211,234,0.10)" }}>
                {problema
                  ? <AlertTriangle style={{ width:14, height:14, color:"#F0A05A", flexShrink:0 }}/>
                  : <CheckCircle2 style={{ width:14, height:14, color:"#2CCD93", flexShrink:0 }}/>}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11.5, fontWeight:700, color:"#EAF6FB", overflow:"hidden",
                                textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {p.nome} <span style={{ fontWeight:500, color:"#9FD3EA" }}>· {p.funcao}</span>
                  </div>
                  <div style={{ fontSize:10, color:"#9FD3EA", overflow:"hidden",
                                textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {!p.google_conectado
                      ? "Google não conectado"
                      : ativos === 0
                        ? "Conectado, mas sem canal ativo"
                        : Object.entries(p.canais)
                            .filter(([, c]) => c.ativo)
                            .map(([nome]) => nome === "google_calendar" ? "Calendar" : nome === "gmail" ? "Gmail" : "Outlook")
                            .join(" · ")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Perfil() {
  const navigate = useNavigate();
  // Insights e tela de gestao: fica fora do menu de quem nao e gerente.
  const ehGerenteMenu = !!useUsuarioLogado()?.is_gerente;
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [usuario, setUsuario]         = useState<Usuario | null>(null);
  const [activeTab, setActiveTab]     = useState<SettingsTab>("comunicacao");
  const [emailProvider, setEmailProvider] = useState<EmailProvider>(null);
  const [outlookMode, setOutlookMode] = useState<OutlookMode>(null);
  const [whatsappMode, setWhatsappMode] = useState<WhatsAppMode>(null);
  const [notifPrefs, setNotifPrefs]   = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [saved, setSaved]             = useState(false);
  const [loading, setLoading]         = useState(true);
  const [gmailConectado, setGmailConectado]     = useState(false);
  const [outlookConectado, setOutlookConectado] = useState(false);
  const [conectandoGmail, setConectandoGmail]   = useState(false);
  const [desconectando, setDesconectando]       = useState<"gmail"|"outlook"|null>(null);

  // MFA / 2FA
  const [mfaAtivado, setMfaAtivado]   = useState(false);
  const [mfaSetup, setMfaSetup]       = useState<{ qr_code: string | null; secret: string } | null>(null);
  const [mfaCode, setMfaCode]         = useState("");
  const [mfaBackup, setMfaBackup]     = useState<string[] | null>(null);
  const [mfaSenha, setMfaSenha]       = useState("");
  const [mfaBusy, setMfaBusy]         = useState(false);
  const [mfaErro, setMfaErro]         = useState("");

  useEffect(() => {
    const token = getToken() || "";
    const h = { Authorization: `Bearer ${token}` };

    fetch(`${API}/me`, { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setUsuario(d); setMfaAtivado(!!d.mfa_ativado); } })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Carrega preferências salvas
    try {
      const prefs = JSON.parse(localStorage.getItem("crm_comm_prefs") || "{}");
      if (prefs.emailProvider)  setEmailProvider(prefs.emailProvider);
      if (prefs.outlookMode)    setOutlookMode(prefs.outlookMode);
      if (prefs.whatsappMode)   setWhatsappMode(prefs.whatsappMode);
      if (prefs.notifPrefs)     setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...prefs.notifPrefs });
    } catch {}

    // Verifica conexão dos provedores
    Promise.all([
      fetch(`${API}/auth/google/status`,  { headers: h }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/auth/outlook/status`, { headers: h }).then(r => r.json()).catch(() => ({})),
    ]).then(([g, o]) => {
      setGmailConectado(!!g?.conectado);
      setOutlookConectado(!!o?.conectado);
    });
  }, []);

  const handleSave = () => {
    localStorage.setItem("crm_comm_prefs", JSON.stringify({ emailProvider, outlookMode, whatsappMode, notifPrefs }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const connectGmail = async () => {
    setConectandoGmail(true);
    try {
      const token = getToken() || "";
      const res = await fetch(`${API}/auth/google/login`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.auth_url) window.location.href = data.auth_url;
    } catch {} finally { setConectandoGmail(false); }
  };

  const connectOutlook = async () => {
    try {
      const token = getToken() || "";
      const res = await fetch(`${API}/auth/outlook/login`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.auth_url) window.location.href = data.auth_url;
    } catch {}
  };

  const disconnect = async (prov: "gmail" | "outlook") => {
    setDesconectando(prov);
    try {
      const token = getToken() || "";
      await fetch(`${API}/auth/${prov === "gmail" ? "google" : "outlook"}/disconnect`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (prov === "gmail") { setGmailConectado(false); if (emailProvider === "gmail") setEmailProvider(null); }
      else { setOutlookConectado(false); if (emailProvider === "outlook") setEmailProvider(null); }
    } catch {} finally { setDesconectando(null); }
  };

  // ---- MFA / 2FA ----
  const iniciarMfa = async () => {
    setMfaErro(""); setMfaBusy(true); setMfaBackup(null);
    try {
      const res = await fetch(`${API}/mfa/setup`, { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (res.ok) setMfaSetup({ qr_code: data.qr_code, secret: data.secret });
      else setMfaErro(data.detail || "Não foi possível iniciar o MFA.");
    } catch { setMfaErro("Erro de conexão."); }
    finally { setMfaBusy(false); }
  };

  const confirmarMfa = async () => {
    setMfaErro(""); setMfaBusy(true);
    try {
      const res = await fetch(`${API}/mfa/ativar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ code: mfaCode.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMfaAtivado(true);
        setMfaSetup(null);
        setMfaCode("");
        setMfaBackup(data.backup_codes || []);
      } else setMfaErro(data.detail || "Código inválido.");
    } catch { setMfaErro("Erro de conexão."); }
    finally { setMfaBusy(false); }
  };

  const desativarMfa = async () => {
    setMfaErro(""); setMfaBusy(true);
    try {
      const res = await fetch(`${API}/mfa/desativar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ senha: mfaSenha }),
      });
      const data = await res.json();
      if (res.ok) { setMfaAtivado(false); setMfaSenha(""); setMfaBackup(null); }
      else setMfaErro(data.detail || "Senha inválida.");
    } catch { setMfaErro("Erro de conexão."); }
    finally { setMfaBusy(false); }
  };

  const nomeUsuario  = usuario?.nome || "...";
  const cargoUsuario = usuario?.cargo || "Administrador";
  const emailUsuario = usuario?.email || "—";
  const corUsuario   = usuario ? avatarColor(usuario.nome) : "#9FD3EA";
  const iniciaisUsu  = usuario ? initials(usuario.nome) : "?";

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", position:"relative" }}>
      <style>{css}</style>

      {/* Background */}
      <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
        <FundoAzul />
      </div>

      {/* Sidebar */}
      {isMobile && menuOpen && (
        <div onClick={()=>setMenuOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(10,31,51,0.45)", zIndex:999 }}/>
      )}
      <div style={{ width:220, flexShrink:0, height:"100vh", overflowY:"auto", zIndex:1000, background:"linear-gradient(180deg,#1a3a5c 0%,#0f2a44 60%,#0a1f33 100%)", boxShadow:"4px 0 24px rgba(0,0,0,0.18)", display:"flex", flexDirection:"column", padding:"0 12px 20px",
        position: isMobile ? "fixed" : "relative", top:0, left:0,
        transform: isMobile && !menuOpen ? "translateX(-100%)" : "translateX(0)",
        transition:"transform 0.28s ease" }}>
        <div style={{ padding:"22px 4px 24px", borderBottom:"1px solid rgba(159,211,234,0.18)", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#2E6F95,#2E6F95)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(46,111,149,0.4)" }}>
              <BarChart3 style={{ width:18, height:18, color:"#fff" }}/>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Prospecção</div>
              <div style={{ fontSize:11, fontWeight:700, background:"linear-gradient(90deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize:"200% 200%", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"gradientShift 4s ease infinite" }}>CRM</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, display:"flex", flexDirection:"column", gap:2 }}>
          {navItems.filter(nav => nav.label !== "Insights" || ehGerenteMenu).map(item => (
            <div key={item.label} className="nav-item" onClick={() => navigate(item.path)}>
              <item.icon style={{ width:16, height:16 }}/>{item.label}
            </div>
          ))}
          {((usuario as any)?.is_gerente || (usuario as any)?.is_supervisor) && (
            <div className="nav-item" onClick={() => navigate("/equipe")}>
              <UserRoundCog style={{ width:16, height:16 }}/>Equipe
            </div>
          )}
        </nav>
        <CardUsuario />
      </div>

      {/* Main */}
      <div style={{ flex:1, height:"100vh", overflowY:"auto", position:"relative", zIndex:5 }}>

        {/* Topbar */}
        <div style={{ position:"sticky", top:0, zIndex:20, padding:isMobile?"12px 14px":"14px 28px", background:"rgba(15,46,75,0.88)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(126,176,219,0.16)", display:"flex", alignItems:"center", gap:isMobile?8:16 }}>
          {isMobile && (
            <button onClick={()=>setMenuOpen(true)} style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Menu style={{ width:18, height:18, color:"#9FD3EA" }}/>
            </button>
          )}
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:18, fontWeight:800, color:"#FFFFFF", letterSpacing:"-0.02em" }}>Configurações</h1>
            <p style={{ fontSize:12, color:"#B6CFE4", marginTop:1 }}>Gerencie sua conta e preferências</p>
          </div>
        </div>

        <div style={{ padding:"24px 28px 40px", display:"flex", gap:20 }}>

          {/* Sidebar de abas */}
          <div style={{ width:210, flexShrink:0 }}>
            <motion.div className="glass-card" style={{ padding:10 }} initial={{ opacity:0, x:-14 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.35 }}>
              <div style={{ padding:"14px 10px 16px", borderBottom:"1px solid rgba(159,211,234,0.18)", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:42, height:42, borderRadius:"50%", background:`linear-gradient(135deg,${corUsuario},${corUsuario}cc)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:"#fff", flexShrink:0 }}>{iniciaisUsu}</div>
                  <div style={{ minWidth:0 }}>
                    {loading ? (
                      <>
                        <div style={{ height:12, width:90, borderRadius:4, background:"rgba(159,211,234,0.08)", marginBottom:5 }}/>
                        <div style={{ height:10, width:70, borderRadius:4, background:"rgba(159,211,234,0.08)" }}/>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nomeUsuario}</div>
                        <div style={{ fontSize:10, color:"#9FD3EA", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cargoUsuario}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {settingsTabs.map(tab => (
                <div key={tab.key} className={`settings-tab${activeTab === tab.key ? " active" : ""}`} onClick={() => setActiveTab(tab.key)}>
                  <tab.icon style={{ width:15, height:15, flexShrink:0 }}/>
                  <span style={{ flex:1 }}>{tab.label}</span>
                  {tab.badge && activeTab !== tab.key && (
                    <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:5, background:"rgba(46,111,149,0.12)", color:"#9FD3EA" }}>{tab.badge}</span>
                  )}
                  {activeTab === tab.key && <ChevronRight style={{ width:12, height:12 }}/>}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Conteúdo */}
          <div style={{ flex:1, minWidth:0 }}>
            <AnimatePresence mode="wait">

              {/* ── ABA COMUNICAÇÃO ── */}
              {activeTab === "comunicacao" && (
                <motion.div key="comunicacao" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} transition={{ duration:0.25 }}>

                  <div style={{ marginBottom:20 }}>
                    <h2 style={{ fontSize:16, fontWeight:800, color:"#EAF6FB", letterSpacing:"-0.02em" }}>Canais de Comunicação</h2>
                    <p style={{ fontSize:12, color:"#9FD3EA", marginTop:3 }}>Configure seus provedores e como deseja enviar mensagens pelo CRM</p>
                  </div>

                  {/* Diagnóstico das integrações — só o gerente; para o vendedor é ruído */}
                  {usuario?.is_gerente && <PainelIntegracoes/>}

                  {/* ── PROVEDORES DE E-MAIL ── */}
                  <motion.div className="glass-card" style={{ padding:"20px 22px", marginBottom:16 }} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                      <div style={{ width:32, height:32, borderRadius:9, background:"rgba(46,111,149,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Mail style={{ width:15, height:15, color:"#9FD3EA" }}/>
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:"#EAF6FB" }}>Provedores de E-mail</div>
                        <div style={{ fontSize:11, color:"#9FD3EA" }}>Conecte e escolha qual usar como padrão</div>
                      </div>
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12, marginBottom:14 }}>
                      {/* Gmail */}
                      {[
                        { prov: "gmail" as const,   label:"Gmail",   sub:"Google",    color:"#F2695E", bg:"rgba(234,67,53,0.14)",  Logo:GmailIcon,   conectado:gmailConectado   },
                        { prov: "outlook" as const, label:"Outlook", sub:"Microsoft", color:"#50B3FF", bg:"rgba(0,120,212,0.16)", Logo:OutlookIcon, conectado:outlookConectado },
                      ].map(({ prov, label, sub, color, bg, Logo, conectado }) => (
                        <div key={prov} style={{ padding:16, borderRadius:12, border:`2px solid ${emailProvider===prov ? color : "rgba(126,176,219,0.22)"}`, background:emailProvider===prov ? bg : "#123253", transition:"all 0.2s", position:"relative" }}>
                          {emailProvider === prov && (
                            <div style={{ position:"absolute", top:10, right:10, width:20, height:20, borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <Check style={{ width:11, height:11, color:"#fff" }}/>
                            </div>
                          )}
                          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                            <div style={{ width:34, height:34, borderRadius:9, background:"#0F2E4B", border:`1.5px solid ${color}44`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <Logo size={18}/>
                            </div>
                            <div>
                              <div style={{ fontSize:13, fontWeight:700, color:"#FFFFFF" }}>{label}</div>
                              <div style={{ fontSize:10, color:"#B6CFE4" }}>{sub}</div>
                            </div>
                          </div>
                          {/* Status */}
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                            <div style={{ width:7, height:7, borderRadius:"50%", background:conectado ? "#2CCD93" : "rgba(126,176,219,0.35)", flexShrink:0 }}/>
                            <span style={{ fontSize:11, fontWeight:600, color:conectado ? "#2CCD93" : "#B6CFE4" }}>
                              {conectado ? "Conectado" : "Não conectado"}
                            </span>
                          </div>
                          <div style={{ display:"flex", gap:6 }}>
                            {conectado ? (
                              <>
                                <button
                                  onClick={() => setEmailProvider(emailProvider === prov ? null : prov)}
                                  style={{ flex:1, height:30, borderRadius:8, border:`1.5px solid ${color}55`, background:emailProvider===prov ? color : "transparent", color: emailProvider===prov ? "#062033" : color, fontSize:11, fontWeight:700, cursor:"pointer" }}
                                >
                                  {emailProvider === prov ? "✓ Padrão" : "Usar como padrão"}
                                </button>
                                <button
                                  onClick={() => disconnect(prov)}
                                  disabled={desconectando === prov}
                                  style={{ height:30, padding:"0 10px", borderRadius:8, border:"1.5px solid rgba(248,113,113,0.35)", background:"rgba(248,113,113,0.12)", color:"#F87171", fontSize:11, fontWeight:600, cursor:"pointer" }}
                                >
                                  {desconectando === prov ? "..." : "Desconectar"}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => prov === "gmail" ? connectGmail() : connectOutlook()}
                                disabled={conectandoGmail && prov === "gmail"}
                                style={{ flex:1, height:30, borderRadius:8, border:`1.5px solid ${color}66`, background:bg, color, fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
                              >
                                <Logo size={13}/>
                                {conectandoGmail && prov === "gmail" ? "Conectando..." : `Conectar ${label}`}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Modo Outlook */}
                    {outlookConectado && (
                      <div style={{ borderTop:"1px solid rgba(159,211,234,0.18)", paddingTop:14 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#9FD3EA", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>Como abrir o Outlook</div>
                        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:8 }}>
                          {[
                            { mode:"web" as const, label:"Outlook Web",  sub:"outlook.live.com", Icon:Globe },
                            { mode:"app" as const, label:"App instalado", sub:"Protocolo mailto:", Icon:Monitor },
                          ].map(({ mode, label, sub, Icon: Ic }) => (
                            <div key={mode} onClick={() => setOutlookMode(outlookMode===mode ? null : mode)} style={{ padding:"10px 12px", borderRadius:10, border:`1.5px solid ${outlookMode===mode ? "#9FD3EA" : "rgba(159,211,234,0.18)"}`, background:outlookMode===mode ? "rgba(0,120,212,0.06)" : "rgba(18,59,94,0.55)", cursor:"pointer", display:"flex", alignItems:"center", gap:10, transition:"all 0.18s" }}>
                              <Ic style={{ width:14, height:14, color:outlookMode===mode ? "#9FD3EA" : "#9FD3EA", flexShrink:0 }}/>
                              <div>
                                <div style={{ fontSize:12, fontWeight:700, color:outlookMode===mode ? "#9FD3EA" : "#EAF6FB" }}>{label}</div>
                                <div style={{ fontSize:10, color:"#9FD3EA" }}>{sub}</div>
                              </div>
                              {outlookMode === mode && <Check style={{ width:12, height:12, color:"#9FD3EA", marginLeft:"auto" }}/>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* ── WHATSAPP ── */}
                  <motion.div className="glass-card" style={{ padding:"20px 22px", marginBottom:20 }} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                      <div style={{ width:32, height:32, borderRadius:9, background:"rgba(37,211,102,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <MessageCircle style={{ width:15, height:15, color:"#25d366" }}/>
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:"#EAF6FB" }}>WhatsApp</div>
                        <div style={{ fontSize:11, color:"#9FD3EA" }}>Selecione como abrir conversas WhatsApp</div>
                      </div>
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12 }}>

                      {/* WhatsApp Web */}
                      <div className={`channel-card${whatsappMode === "web" ? " selected-green" : ""}`} onClick={() => setWhatsappMode(whatsappMode === "web" ? null : "web")}>
                        {whatsappMode === "web" && (
                          <div style={{ position:"absolute", top:10, right:10, width:20, height:20, borderRadius:"50%", background:"#25D366", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Check style={{ width:11, height:11, color:"#fff" }}/>
                          </div>
                        )}
                        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:"#0F2E4B", border:"1.5px solid rgba(37,211,102,0.35)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <WhatsAppIcon size={18}/>
                          </div>
                          <div>
                            <div style={{ fontSize:14, fontWeight:700, color:"#EAF6FB" }}>WhatsApp Web</div>
                            <div style={{ fontSize:10, color:"#9FD3EA" }}>Abre no navegador</div>
                          </div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#9FD3EA" }}>
                          <ExternalLink style={{ width:11, height:11, marginTop:1 }}/>
                          <span>web.whatsapp.com</span>
                        </div>
                        <div style={{ marginTop:8, padding:"6px 10px", borderRadius:8, background:"rgba(37,211,102,0.12)", border:"1px solid rgba(37,211,102,0.30)", fontSize:10, color:"#25D366", fontWeight:600 }}>
                          Não precisa de app instalado
                        </div>
                      </div>

                      {/* WhatsApp App */}
                      <div className={`channel-card${whatsappMode === "app" ? " selected-green" : ""}`} onClick={() => setWhatsappMode(whatsappMode === "app" ? null : "app")}>
                        {whatsappMode === "app" && (
                          <div style={{ position:"absolute", top:10, right:10, width:20, height:20, borderRadius:"50%", background:"#83DDA8", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Check style={{ width:11, height:11, color:"#fff" }}/>
                          </div>
                        )}
                        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:"#0F2E4B", border:"1.5px solid rgba(37,211,102,0.35)", position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <WhatsAppIcon size={18}/>
                            <Monitor style={{ width:10, height:10, color:"#25D366", position:"absolute", right:-4, bottom:-4, background:"#0F2E4B", borderRadius:3 }}/>
                          </div>
                          <div>
                            <div style={{ fontSize:14, fontWeight:700, color:"#EAF6FB" }}>App instalado</div>
                            <div style={{ fontSize:10, color:"#9FD3EA" }}>Windows / macOS</div>
                          </div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#9FD3EA" }}>
                          <Monitor style={{ width:11, height:11, marginTop:1 }}/>
                          <span>Protocolo whatsapp://</span>
                        </div>
                        <div style={{ marginTop:8, padding:"6px 10px", borderRadius:8, background:"rgba(37,211,102,0.12)", border:"1px solid rgba(37,211,102,0.30)", fontSize:10, color:"#25D366", fontWeight:600 }}>
                          Abre direto no app do desktop
                        </div>
                      </div>
                    </div>

                    {whatsappMode && (
                      <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} style={{ marginTop:12, padding:"10px 14px", borderRadius:10, background:"rgba(37,211,102,0.06)", border:"1px solid rgba(37,211,102,0.2)", display:"flex", gap:8, alignItems:"flex-start" }}>
                        <Info style={{ width:14, height:14, color:"#25d366", flexShrink:0, marginTop:1 }}/>
                        <div style={{ fontSize:11, color:"#EAF6FB", lineHeight:1.5 }}>
                          {whatsappMode === "web"
                            ? "Ao clicar no ícone WhatsApp de um contato, o WhatsApp Web será aberto em nova aba com a conversa iniciada automaticamente."
                            : "O link usará o protocolo whatsapp:// para abrir o app instalado no seu computador. Necessário ter o WhatsApp Desktop instalado."}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Resumo + salvar */}
                  <motion.div className="glass-card" style={{ padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}>
                    <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                      <div style={{ fontSize:12, color:"#9FD3EA" }}>
                        <span style={{ fontWeight:600, color:"#EAF6FB" }}>E-mail padrão: </span>
                        {emailProvider === "gmail" ? "Gmail" : emailProvider === "outlook" ? `Outlook ${outlookMode === "app" ? "App" : "Web"}` : <span style={{ color:"#9FD3EA" }}>não configurado</span>}
                      </div>
                      <div style={{ fontSize:12, color:"#9FD3EA" }}>
                        <span style={{ fontWeight:600, color:"#EAF6FB" }}>WhatsApp: </span>
                        {whatsappMode === "web" ? "WhatsApp Web" : whatsappMode === "app" ? "App instalado" : <span style={{ color:"#9FD3EA" }}>não configurado</span>}
                      </div>
                    </div>
                    <button className="save-btn" onClick={handleSave}>
                      <AnimatePresence mode="wait">
                        {saved ? (
                          <motion.span key="saved" initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }} style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <Check style={{ width:14, height:14 }}/> Salvo!
                          </motion.span>
                        ) : (
                          <motion.span key="save" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <Save style={{ width:14, height:14 }}/> Salvar preferências
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* ── ABA PERFIL ── */}
              {activeTab === "perfil" && (
                <motion.div key="perfil" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} transition={{ duration:0.25 }}>
                  <motion.div className="glass-card" style={{ padding:"28px 24px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:24, paddingBottom:20, borderBottom:"1px solid rgba(159,211,234,0.18)" }}>
                      <div style={{ width:60, height:60, borderRadius:"50%", background:`linear-gradient(135deg,${corUsuario},${corUsuario}cc)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:800, color:"#fff" }}>{iniciaisUsu}</div>
                      <div>
                        <div style={{ fontSize:18, fontWeight:800, color:"#EAF6FB" }}>{nomeUsuario}</div>
                        <div style={{ fontSize:12, color:"#9FD3EA", marginTop:2 }}>{emailUsuario}</div>
                        <div style={{ fontSize:11, fontWeight:600, color:"#9FD3EA", marginTop:4 }}>{cargoUsuario}</div>
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:14 }}>
                      {[
                        { label:"Nome completo", value:nomeUsuario },
                        { label:"Cargo",         value:cargoUsuario },
                        { label:"E-mail",        value:emailUsuario },
                        { label:"Empresa",       value:usuario?.empresa_nome || "—" },
                      ].map(f => (
                        <div key={f.label}>
                          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:"#9FD3EA", marginBottom:5 }}>{f.label}</div>
                          <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(18,59,94,0.55)", border:"1px solid rgba(159,211,234,0.18)", fontSize:13, fontWeight:600, color:"#EAF6FB" }}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize:11, color:"#9FD3EA", marginTop:18, textAlign:"center" }}>Para alterar seus dados, entre em contato com o administrador.</p>
                  </motion.div>
                </motion.div>
              )}

              {/* ── ABA NOTIFICAÇÕES ── */}
              {activeTab === "notificacoes" && (
                <motion.div key="notificacoes" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} transition={{ duration:0.25 }}>

                  <div style={{ marginBottom:20 }}>
                    <h2 style={{ fontSize:16, fontWeight:800, color:"#EAF6FB", letterSpacing:"-0.02em" }}>Preferências de Notificação</h2>
                    <p style={{ fontSize:12, color:"#9FD3EA", marginTop:3 }}>Escolha quais alertas deseja receber no sino de notificações</p>
                  </div>

                  {/* Rascunhos */}
                  <motion.div className="glass-card" style={{ padding:"20px 22px", marginBottom:14 }} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                      <div style={{ width:30, height:30, borderRadius:8, background:"rgba(230,126,34,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <FileText style={{ width:14, height:14, color:"#F2C879" }}/>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB" }}>Rascunhos</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

                      {/* rascunho_aviso */}
                      <div className="notif-row">
                        <div style={{ width:34, height:34, borderRadius:9, background:"rgba(230,126,34,0.1)", border:"1px solid rgba(230,126,34,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <AlertTriangle style={{ width:15, height:15, color:"#F2C879" }}/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB" }}>Alerta de rascunho pendente</div>
                          <div style={{ fontSize:11, color:"#9FD3EA", marginTop:2 }}>Notifica quando um rascunho está pendente há mais de 48h</div>
                        </div>
                        <div
                          className="toggle-track"
                          style={{ background:notifPrefs.rascunho_aviso ? "#2CCD93" : "rgba(126,176,219,0.22)" }}
                          onClick={() => setNotifPrefs(p => ({ ...p, rascunho_aviso: !p.rascunho_aviso }))}
                        >
                          <div className="toggle-thumb" style={{ left: notifPrefs.rascunho_aviso ? "21px" : "3px" }}/>
                        </div>
                      </div>

                      {/* rascunho_excluido */}
                      <div className="notif-row">
                        <div style={{ width:34, height:34, borderRadius:9, background:"rgba(231,76,60,0.1)", border:"1px solid rgba(231,76,60,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <Trash2 style={{ width:15, height:15, color:"#F7B8B1" }}/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB" }}>Rascunho excluído automaticamente</div>
                          <div style={{ fontSize:11, color:"#9FD3EA", marginTop:2 }}>Avisa quando um rascunho foi removido por expiração</div>
                        </div>
                        <div
                          className="toggle-track"
                          style={{ background:notifPrefs.rascunho_excluido ? "#2CCD93" : "rgba(126,176,219,0.22)" }}
                          onClick={() => setNotifPrefs(p => ({ ...p, rascunho_excluido: !p.rascunho_excluido }))}
                        >
                          <div className="toggle-thumb" style={{ left: notifPrefs.rascunho_excluido ? "21px" : "3px" }}/>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* E-mail */}
                  <motion.div className="glass-card" style={{ padding:"20px 22px", marginBottom:14 }} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.08 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                      <div style={{ width:30, height:30, borderRadius:8, background:"rgba(46,111,149,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Mail style={{ width:14, height:14, color:"#9FD3EA" }}/>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB" }}>E-mail</div>
                    </div>
                    <div className="notif-row">
                      <div style={{ width:34, height:34, borderRadius:9, background:"rgba(46,111,149,0.1)", border:"1px solid rgba(159,211,234,0.30)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Mail style={{ width:15, height:15, color:"#9FD3EA" }}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB" }}>Interações por e-mail</div>
                        <div style={{ fontSize:11, color:"#9FD3EA", marginTop:2 }}>Quando um contato responde, abre ou interage com um e-mail enviado</div>
                      </div>
                      <div
                        className="toggle-track"
                        style={{ background:notifPrefs.email_interaction ? "#2CCD93" : "rgba(126,176,219,0.22)" }}
                        onClick={() => setNotifPrefs(p => ({ ...p, email_interaction: !p.email_interaction }))}
                      >
                        <div className="toggle-thumb" style={{ left: notifPrefs.email_interaction ? "21px" : "3px" }}/>
                      </div>
                    </div>
                  </motion.div>

                  {/* Calendário */}
                  <motion.div className="glass-card" style={{ padding:"20px 22px", marginBottom:14 }} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.11 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                      <div style={{ width:30, height:30, borderRadius:8, background:"rgba(142,68,173,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Calendar style={{ width:14, height:14, color:"#9FD3EA" }}/>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB" }}>Calendário</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

                      {/* calendar_accepted */}
                      <div className="notif-row">
                        <div style={{ width:34, height:34, borderRadius:9, background:"rgba(39,174,96,0.1)", border:"1px solid rgba(39,174,96,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <CalendarCheck style={{ width:15, height:15, color:"#83DDA8" }}/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB" }}>Evento aceito</div>
                          <div style={{ fontSize:11, color:"#9FD3EA", marginTop:2 }}>Quando um contato confirma presença em um evento agendado</div>
                        </div>
                        <div
                          className="toggle-track"
                          style={{ background:notifPrefs.calendar_accepted ? "#2CCD93" : "rgba(126,176,219,0.22)" }}
                          onClick={() => setNotifPrefs(p => ({ ...p, calendar_accepted: !p.calendar_accepted }))}
                        >
                          <div className="toggle-thumb" style={{ left: notifPrefs.calendar_accepted ? "21px" : "3px" }}/>
                        </div>
                      </div>

                      {/* calendar_declined */}
                      <div className="notif-row">
                        <div style={{ width:34, height:34, borderRadius:9, background:"rgba(231,76,60,0.1)", border:"1px solid rgba(231,76,60,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <Repeat style={{ width:15, height:15, color:"#F7B8B1" }}/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB" }}>Evento recusado ou reagendado</div>
                          <div style={{ fontSize:11, color:"#9FD3EA", marginTop:2 }}>Quando um contato recusa ou solicita alteração no evento</div>
                        </div>
                        <div
                          className="toggle-track"
                          style={{ background:notifPrefs.calendar_declined ? "#2CCD93" : "rgba(126,176,219,0.22)" }}
                          onClick={() => setNotifPrefs(p => ({ ...p, calendar_declined: !p.calendar_declined }))}
                        >
                          <div className="toggle-thumb" style={{ left: notifPrefs.calendar_declined ? "21px" : "3px" }}/>
                        </div>
                      </div>

                      {/* visita_lembrete */}
                      <div className="notif-row">
                        <div style={{ width:34, height:34, borderRadius:9, background:"rgba(13,148,136,0.1)", border:"1px solid rgba(13,148,136,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <Bell style={{ width:15, height:15, color:"#9FD3EA" }}/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB" }}>Lembrete de visita agendada</div>
                          <div style={{ fontSize:11, color:"#9FD3EA", marginTop:2 }}>Envia um alerta 24h antes de uma visita marcada</div>
                        </div>
                        <div
                          className="toggle-track"
                          style={{ background:notifPrefs.visita_lembrete ? "#2CCD93" : "rgba(126,176,219,0.22)" }}
                          onClick={() => setNotifPrefs(p => ({ ...p, visita_lembrete: !p.visita_lembrete }))}
                        >
                          <div className="toggle-thumb" style={{ left: notifPrefs.visita_lembrete ? "21px" : "3px" }}/>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Salvar */}
                  <motion.div className="glass-card" style={{ padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.14 }}>
                    <div style={{ fontSize:12, color:"#9FD3EA" }}>
                      {Object.values(notifPrefs).filter(Boolean).length} de {Object.keys(notifPrefs).length} notificações ativas
                    </div>
                    <button className="save-btn" onClick={handleSave}>
                      <AnimatePresence mode="wait">
                        {saved ? (
                          <motion.span key="saved" initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }} style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <Check style={{ width:14, height:14 }}/> Salvo!
                          </motion.span>
                        ) : (
                          <motion.span key="save" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <Save style={{ width:14, height:14 }}/> Salvar preferências
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* ── ABA SEGURANÇA ── */}
              {activeTab === "seguranca" && (
                <motion.div key="seguranca" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} transition={{ duration:0.25 }}>
                  <motion.div className="glass-card" style={{ padding:"24px 22px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                      <Shield style={{ width:22, height:22, color:"#9FD3EA" }}/>
                      <div style={{ fontSize:15, fontWeight:800, color:"#EAF6FB" }}>Autenticação em duas etapas (2FA)</div>
                      <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:999,
                        background:mfaAtivado ? "rgba(46,204,113,0.15)" : "rgba(231,76,60,0.12)",
                        color:mfaAtivado ? "#83DDA8" : "#F7B8B1" }}>
                        {mfaAtivado ? "Ativado" : "Desativado"}
                      </span>
                    </div>
                    <div style={{ fontSize:12, color:"#9FD3EA", marginBottom:18, lineHeight:1.5 }}>
                      Protege sua conta exigindo um código do app autenticador (Google Authenticator, Authy) além da senha.
                    </div>

                    {mfaErro && (
                      <div style={{ fontSize:12.5, color:"#F7B8B1", background:"rgba(231,76,60,0.08)", border:"1px solid rgba(231,76,60,0.22)", borderRadius:10, padding:"9px 12px", marginBottom:14 }}>{mfaErro}</div>
                    )}

                    {/* Códigos de backup recém-gerados (mostrados uma única vez) */}
                    {mfaBackup && (
                      <div style={{ background:"rgba(46,111,149,0.06)", border:"1px solid rgba(159,211,234,0.30)", borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
                        <div style={{ fontSize:12.5, fontWeight:700, color:"#EAF6FB", marginBottom:8 }}>Guarde seus códigos de backup (mostrados só agora):</div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, fontFamily:"monospace", fontSize:13 }}>
                          {mfaBackup.map(c => <div key={c} style={{ padding:"4px 8px", background:"rgba(18,59,94,0.55)", borderRadius:6, textAlign:"center" }}>{c}</div>)}
                        </div>
                      </div>
                    )}

                    {/* Estado: desativado e sem setup em andamento */}
                    {!mfaAtivado && !mfaSetup && (
                      <button onClick={iniciarMfa} disabled={mfaBusy}
                        style={{ height:46, padding:"0 20px", borderRadius:12, border:"none", cursor:mfaBusy?"not-allowed":"pointer",
                          fontSize:14, fontWeight:700, color:"#fff", background:"linear-gradient(135deg, #2E6F95, #2E6F95)" }}>
                        {mfaBusy ? "Gerando..." : "Ativar 2FA"}
                      </button>
                    )}

                    {/* Estado: setup em andamento (QR + confirmação) */}
                    {!mfaAtivado && mfaSetup && (
                      <div>
                        <div style={{ fontSize:12.5, color:"#EAF6FB", marginBottom:12 }}>
                          1. Escaneie o QR no seu app autenticador:
                        </div>
                        {mfaSetup.qr_code
                          ? <img src={mfaSetup.qr_code} alt="QR do MFA" style={{ width:180, height:180, borderRadius:12, border:"1px solid rgba(0,0,0,0.06)" }}/>
                          : <div style={{ fontSize:12 }}>Chave manual: <code>{mfaSetup.secret}</code></div>}
                        <div style={{ fontSize:12.5, color:"#EAF6FB", margin:"14px 0 8px" }}>
                          2. Digite o código gerado para confirmar:
                        </div>
                        <div style={{ display:"flex", gap:8 }}>
                          <input value={mfaCode} onChange={e=>setMfaCode(e.target.value)} placeholder="000000" inputMode="numeric"
                            style={{ height:44, width:140, padding:"0 14px", borderRadius:10, border:"1px solid rgba(159,211,234,0.18)", fontSize:15, letterSpacing:"0.2em", textAlign:"center" }}/>
                          <button onClick={confirmarMfa} disabled={mfaBusy || mfaCode.trim().length < 6}
                            style={{ height:44, padding:"0 18px", borderRadius:10, border:"none", cursor:"pointer", fontSize:14, fontWeight:700, color:"#EAF6FB", background:"linear-gradient(135deg, #2E6F95, #2E6F95)" }}>
                            {mfaBusy ? "..." : "Confirmar"}
                          </button>
                          <button onClick={()=>{ setMfaSetup(null); setMfaCode(""); setMfaErro(""); }}
                            style={{ height:44, padding:"0 16px", borderRadius:10, border:"1px solid rgba(159,211,234,0.18)", cursor:"pointer", fontSize:13, fontWeight:600, background:"transparent", color:"#EAF6FB" }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Estado: ativado → desativar exige senha */}
                    {mfaAtivado && (
                      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                        <input type="password" value={mfaSenha} onChange={e=>setMfaSenha(e.target.value)} placeholder="Sua senha para desativar"
                          style={{ height:44, width:220, padding:"0 14px", borderRadius:10, border:"1px solid rgba(159,211,234,0.18)", fontSize:14 }}/>
                        <button onClick={desativarMfa} disabled={mfaBusy || !mfaSenha}
                          style={{ height:44, padding:"0 18px", borderRadius:10, border:"1px solid rgba(231,76,60,0.4)", cursor:mfaBusy||!mfaSenha?"not-allowed":"pointer", fontSize:14, fontWeight:700, color:"#F7B8B1", background:"rgba(231,76,60,0.06)" }}>
                          {mfaBusy ? "..." : "Desativar 2FA"}
                        </button>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}