import { getToken } from "../../../services/auth";
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { openEmail, openWhatsApp } from "../../../utils/commPrefs";
import { formatarData } from "../../../utils/data";
import {
  BarChart3, LayoutDashboard, Search, Building2, Users,
  ClipboardList, Calendar, ArrowLeft, Edit3,
  MapPin, Tag, Thermometer, TrendingUp, DollarSign,
  Phone, Mail, User, Clock, ChevronRight, MessageCircle, Link2,
  ChevronDown,
  FileText, Hash, Globe, Percent, NotebookPen,
} from "lucide-react";

import SelectRecipientsModal, {
  SendChannel,
  Recipient,
  EmailProvider,
} from "../../../components/SelectRecipientsModal";
import EmpresaNotificationBell from "../../../components/EmpresaNotificationBell";
import CardUsuario from "../../../components/CardUsuario";
import EmpresasProximasDaEmpresa from "../../../components/EmpresasProximasDaEmpresa";

import FundoAzul from "../../../components/FundoAzul";
const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:#EAF6FB; transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(159,211,234,0.08); color:#fff; }
  .nav-item.active { background:rgba(159,211,234,0.08); color:#fff; font-weight:600; }
  .glass-card { background:#143354; border:1px solid rgba(159,211,234,0.18); border-radius:16px; }
  .chip { display:inline-flex; align-items:center; gap:4px; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; }
  .info-row { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid rgba(159,211,234,0.18); }
  .info-row:last-child { border-bottom:none; }
  .send-btn { display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:8px; border:1.5px solid; font-size:11px; font-weight:700; cursor:pointer; transition:all 0.18s; font-family:'Plus Jakarta Sans',sans-serif; }
  .skeleton { background:linear-gradient(90deg,rgba(159,211,234,0.08) 25%,rgba(220,240,252,0.7) 50%,rgba(159,211,234,0.08) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
  .user-card { margin-top:16px; padding:12px; border-radius:12px; background:rgba(159,211,234,0.08); border:1px solid rgba(159,211,234,0.18); display:flex; align-items:center; gap:10px; cursor:pointer; transition:background 0.18s; }
  .user-card:hover { background:rgba(159,211,234,0.08); }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(46,111,149,0.25); border-radius:4px; }
`;

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",                path: "/dashboard" },
  { icon: Search,          label: "Buscar Empresas",           path: "/buscar" },
  { icon: Building2,       label: "Cadastrar Empresas",        path: "/empresas/nova" },
  { icon: Users,           label: "Todos os clientes",         path: "/clientes" },
  { icon: ClipboardList,   label: "Gerenciamento", path: "/gerenciamento" },
  { icon: Calendar,        label: "Calendário",                path: "/calendario" },
];

interface Contato {
  contato_id: string;
  nome: string;
  funcao?: string;
  cargo?: string;
  email?: string;
  celular?: string;
  whatsapp?: string;
  telefone?: string;
  linkedin?: string;
  decisor?: boolean;
}

interface Empresa {
  empresa_id: string;
  nome: string;
  logo_url?: string | null;
  segmento: string;
  porte: string;
  cidade: string;
  estado?: string;
  status: string;
  temperatura: string;
  responsavel_principal: string;
  origem_lead: string;
  ultima_interacao: string | null;
  proxima_acao: string;
  observacoes?: string;
  cnpj?: string;
  site?: string;
  data_proxima_acao?: string | null;
  // vêm do LATERAL join do contato decisor em GET /empresas/{id}
  contato_email?: string | null;
  contato_celular?: string | null;
  // usados pela aba "Próximas" — a busca parte da coordenada desta empresa
  latitude?: number | null;
  longitude?: number | null;
}

interface Orcamento {
  orcamento_id: string;
  titulo?: string | null;
  status: string;
  total: number | string | null;
  criado_em?: string | null;
  data_envio?: string | null;
  data_decisao?: string | null;
}

function statusColor(s: string) {
  if (s === "Fechado")    return { bg:"rgba(39,174,96,0.12)",   text:"#83DDA8",  border:"rgba(39,174,96,0.25)"   };
  if (s === "Proposta")   return { bg:"rgba(142,68,173,0.12)",  text:"#C9B6E4",  border:"rgba(142,68,173,0.25)"  };
  if (s === "Em contato") return { bg:"rgba(41,128,185,0.12)",  text:"#1a5276",  border:"rgba(159,211,234,0.30)"  };
  return                         { bg:"rgba(149,165,166,0.15)", text:"#9FD3EA",  border:"rgba(149,165,166,0.3)"  };
}
function initials(name: string) {
  return name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
}
function avatarColor(name: string) {
  const colors = ["#9FD3EA", "#83DDA8", "#C9B6E4", "#F2C879", "#83DDA8", "#F7B8B1"];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}
const formatDate = (d: string | null) => formatarData(d);

// Mesmo vocabulário e mesmas cores do VendasPanel, para o orçamento não trocar
// de cara quando o usuário vem de lá para cá.
const STATUS_ORCAMENTO: Record<string, { label: string; color:string; bg: string }> = {
  rascunho:      { label: "Rascunho",      color:"#9FD3EA", bg: "rgba(86,101,115,0.12)" },
  enviado:       { label: "Enviado",       color:"#9FD3EA", bg: "rgba(159,211,234,0.55)" },
  em_negociacao: { label: "Em negociação", color:"#F2C879", bg: "rgba(214,137,16,0.13)" },
  aprovado:      { label: "Aprovado",      color:"#83DDA8", bg: "rgba(39,174,96,0.13)"  },
  recusado:      { label: "Recusado",      color:"#F7B8B1", bg: "rgba(220,38,38,0.1)"   },
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const TABS = [
  { key: "resumo",      label: "Resumo",      icon: FileText },
  { key: "orcamentos",  label: "Orçamentos",  icon: DollarSign },
  { key: "contatos",    label: "Contatos",    icon: Users },
  { key: "proximas",    label: "Próximas",    icon: MapPin },
  { key: "observacoes", label: "Observações", icon: NotebookPen },
  { key: "timeline",    label: "Timeline",    icon: Calendar },
];

function SendButton({
  color, bg, border, icon: Icon, label, onClick,
}: {
  color:string; bg: string; border:string;
  icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <button
      className="send-btn"
      onClick={onClick}
      style={{ background:bg, borderColor: border, color }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
    >
      <Icon style={{ width: 11, height: 11 }} />
      {label}
    </button>
  );
}

export default function EmpresaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo: string = (location.state as any)?.from ?? "/clientes";
  const [empresa, setEmpresa]     = useState<Empresa | null>(null);
  const [contatos, setContatos]   = useState<Contato[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [orcamentosErro, setOrcamentosErro] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [expandedContato, setExpandedContato] = useState<string | null>(null);

  // Aba ativa espelhada na URL (?tab=), para dar link direto de fora — o sino de
  // notificações e a tela de vendas apontam para abas específicas.
  const tabParam = new URLSearchParams(location.search).get("tab") || "";
  const tab = TABS.some(t => t.key === tabParam) ? tabParam : "resumo";
  const setTab = (key: string) =>
    navigate(`/clientes/${id}${key === "resumo" ? "" : `?tab=${key}`}`, {
      replace: true,
      state: location.state,
    });

  // canal aberto no modal
  const [sendChannel, setSendChannel] = useState<SendChannel | null>(null);
  // provider escolhido na sessão (persiste entre aberturas do modal)
  const [lastProvider, setLastProvider] = useState<EmailProvider>("outlook");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [empRes, contatosRes] = await Promise.all([
          fetch(`${API}/empresas/${id}`,          { headers }),
          fetch(`${API}/empresas/${id}/contatos`, { headers }),
        ]);
        if (empRes.ok)      setEmpresa(await empRes.json());
        if (contatosRes.ok) setContatos(await contatosRes.json());
        try {
          const aRes = await fetch(`${API}/empresas/${id}/atividades`, { headers });
          if (aRes.ok) setAtividades(await aRes.json());
        } catch {}
        try {
          const oRes = await fetch(`${API}/orcamentos?empresa_id=${id}`, { headers });
          if (oRes.ok) { setOrcamentos(await oRes.json()); setOrcamentosErro(false); }
          else setOrcamentosErro(true);
        } catch { setOrcamentosErro(true); }
      } catch {}
      setLoading(false);
    };
    fetchAll();

    // Atualiza atividades a cada 20s para capturar respostas de calendário
    const refreshAtividades = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API}/empresas/${id}/atividades`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setAtividades(await res.json());
      } catch {}
    };
    const iv = setInterval(refreshAtividades, 20_000);
    return () => clearInterval(iv);
  }, [id]);

  const buildRecipients = (channel: SendChannel): Recipient[] =>
    contatos.map((c, i) => {
      let valor = "";
      if (channel === "email")    valor = c.email    || "";
      if (channel === "whatsapp") valor = c.whatsapp || c.celular || "";
      if (channel === "telefone") valor = c.celular  || c.telefone || "";
      if (channel === "linkedin") valor = c.linkedin || "";
      return {
        id: c.contato_id,
        nome: c.nome,
        funcao: c.funcao || c.cargo,
        valor,
        principal: i === 0,
        decisor: c.decisor,
      };
    });

  // ── único handler — recebe o provider escolhido dentro do modal ──
  const handleConfirmSend = (selected: Recipient[], provider?: EmailProvider) => {
    // salva para o próximo envio
    if (provider) setLastProvider(provider);
    setSendChannel(null);

    const resolvedProvider = provider ?? lastProvider;

    selected.forEach(r => {
      if (!r.valor) return;
      if (sendChannel === "email") {
        openEmail(r.valor, resolvedProvider as "gmail" | "outlook");
        return;
      }
      if (sendChannel === "whatsapp") {
        openWhatsApp(r.valor);
        return;
      }
      if (sendChannel === "telefone") {
        window.open(`tel:${r.valor}`, "_self");
        return;
      }
      if (sendChannel === "linkedin") {
        window.open(r.valor.startsWith("http") ? r.valor : `https://${r.valor}`);
      }
    });
  };

  const openContactEmail = (email: string, provider?: "gmail" | "outlook") => {
    openEmail(email, provider || (lastProvider as "gmail" | "outlook"));
  };

  const hdrs = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken() || ""}`,
  });

  const updateTemperatura = async (temperatura: string) => {
    if (!empresa) return;
    const anterior = empresa.temperatura;
    setEmpresa(prev => prev ? { ...prev, temperatura } : prev);
    try {
      await fetch(`${API}/empresas/${empresa.empresa_id}`, {
        method: "PUT", headers: hdrs(), body: JSON.stringify({ temperatura }),
      });
    } catch {
      setEmpresa(prev => prev ? { ...prev, temperatura: anterior } : prev);
    }
  };

  // Métricas do card "Informações rápidas". Só o que tem fonte hoje: faturamento,
  // budget e nº de vendas do mock dependem de vendas faturadas, que não existem.
  // Mesmo critério do LATERAL join do backend em GET /empresas/{id}: decisor primeiro.
  const contatoPrincipal = contatos.find(c => c.decisor) || contatos[0] || null;

  const num = (v: number | string | null | undefined) => Number(v ?? 0) || 0;
  const aprovados  = orcamentos.filter(o => o.status === "aprovado");
  const recusados  = orcamentos.filter(o => o.status === "recusado");
  const emAberto   = orcamentos.filter(o => o.status === "enviado" || o.status === "em_negociacao");
  const decididos  = aprovados.length + recusados.length;
  const conversao  = decididos ? Math.round((aprovados.length / decididos) * 100) : null;
  const valorAprovado = aprovados.reduce((s, o) => s + num(o.total), 0);
  const valorEmAberto = emAberto.reduce((s, o) => s + num(o.total), 0);

  // Ticket médio: média dos orçamentos que o cliente aprovou, e só isso. O
  // campo estimado do cadastro foi removido do sistema — era chute digitado uma
  // vez e nunca revisado. Sem nada aprovado, o número não existe e mostramos
  // "—" em vez de inventar.
  const ticketMedio = aprovados.length ? valorAprovado / aprovados.length : null;

  const sc = empresa ? statusColor(empresa.status)      : statusColor("");

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", position:"relative" }}>
      <style>{css}</style>

      {/* ── Modal (único) ── */}
      <SelectRecipientsModal
        open={!!sendChannel}
        channel={sendChannel ?? "email"}
        recipients={sendChannel ? buildRecipients(sendChannel) : []}
        onConfirm={handleConfirmSend}
        onClose={() => setSendChannel(null)}
      />

      {/* Background */}
      <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
        <FundoAzul />
      </div>

      {/* ── Sidebar ── */}
      <div style={{ width:220, flexShrink:0, height:"100vh", overflowY:"auto", position:"relative", zIndex:10, background:"linear-gradient(180deg,#1a3a5c 0%,#0f2a44 60%,#0a1f33 100%)", boxShadow:"4px 0 24px rgba(0,0,0,0.18)", display:"flex", flexDirection:"column", padding:"0 12px 20px" }}>
        <div style={{ padding:"22px 4px 24px", borderBottom:"1px solid rgba(159,211,234,0.18)", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#2E6F95,#2E6F95)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(46,111,149,0.4)" }}>
              <BarChart3 style={{ width:18, height:18, color:"#fff" }} />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Prospecção</div>
              <div style={{ fontSize:11, fontWeight:700, background:"linear-gradient(90deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize:"200% 200%", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"gradientShift 4s ease infinite" }}>CRM</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, display:"flex", flexDirection:"column", gap:2 }}>
          {navItems.map(item => (
            <div key={item.label} className="nav-item" onClick={() => navigate(item.path)}>
              <item.icon style={{ width:16, height:16, flexShrink:0 }} />
              {item.label}
            </div>
          ))}
        </nav>
        <CardUsuario />
      </div>

      {/* ── Main ── */}
      <div style={{ flex:1, height:"100vh", overflowY:"auto", position:"relative", zIndex:5 }}>

        {/* Topbar */}
        <div style={{ position:"sticky", top:0, zIndex:20, padding:"14px 28px", background:"rgba(15,46,75,0.88)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(159,211,234,0.18)", display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={() => navigate(backTo)} style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <ArrowLeft style={{ width:15, height:15, color:"#9FD3EA" }} />
          </button>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:18, fontWeight:800, color:"#EAF6FB", letterSpacing:"-0.02em" }}>
              {loading ? "Carregando..." : empresa?.nome}
            </h1>
            <p style={{ fontSize:12, color:"#9FD3EA", marginTop:1, display:"flex", alignItems:"center", gap:4 }}>
              <span>Clientes</span>
              <ChevronRight style={{ width:11, height:11 }} />
              <span>{loading ? "..." : empresa?.nome}</span>
            </p>
          </div>

          {!loading && contatos.length > 0 && (
            <div style={{ display:"flex", gap:6 }}>
              <SendButton color="#9FD3EA" bg="rgba(41,128,185,0.08)" border="rgba(41,128,185,0.3)"  icon={Mail}          label="E-mail"   onClick={() => setSendChannel("email")} />
              <SendButton color="#83DDA8" bg="rgba(39,174,96,0.08)"  border="rgba(39,174,96,0.3)"   icon={MessageCircle} label="WhatsApp" onClick={() => setSendChannel("whatsapp")} />
              <SendButton color="#F2C879" bg="rgba(230,126,34,0.08)" border="rgba(230,126,34,0.3)"  icon={Phone}         label="Ligar"    onClick={() => setSendChannel("telefone")} />
            </div>
          )}

          {!loading && empresa && (
            <EmpresaNotificationBell
              empresaId={empresa.empresa_id}
              empresaNome={empresa.nome}
              onVerComunicacoes={() => navigate(`/clientes/${id}?tab=timeline`)}
            />
          )}

          <button onClick={() => navigate(`/clientes/${id}/editar`)} style={{ height:38, padding:"0 16px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize:"200% 200%", animation:"gradientShift 4s ease infinite", color:"#EAF6FB", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:6, boxShadow:"0 4px 14px rgba(159,211,234,0.30)" }}>
            <Edit3 style={{ width:14, height:14 }} /> Editar
          </button>
        </div>

        <div style={{ padding:"24px 28px 40px", display:"flex", flexDirection:"column", gap:18 }}>
          {loading ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
              {[1,2,3,4].map(i => (
                <div key={i} className="glass-card" style={{ padding:24 }}>
                  <div className="skeleton" style={{ height:20, width:"40%", marginBottom:16 }} />
                  {[1,2,3].map(j => (
                    <div key={j} className="skeleton" style={{ height:16, width:`${50+j*15}%`, marginBottom:10 }} />
                  ))}
                </div>
              ))}
            </div>
          ) : empresa ? (
            <>
              {/* Header card */}
              <motion.div className="glass-card" style={{ padding:"24px 28px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }}>
                <div style={{ display:"flex", alignItems:"center", gap:18 }}>
                  <div style={{ width:64, height:64, borderRadius:16, background:empresa.logo_url?"#0F2E4B":avatarColor(empresa.nome), border:empresa.logo_url?"1px solid rgba(126,176,219,0.22)":undefined, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:800, color:"#FFFFFF", flexShrink:0 }}>
                    {empresa.logo_url
                      ? <img src={empresa.logo_url} alt={`Logo de ${empresa.nome}`} style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
                      : initials(empresa.nome)}
                  </div>
                  <div style={{ flex:1 }}>
                    <h2 style={{ fontSize:22, fontWeight:800, color:"#EAF6FB", letterSpacing:"-0.02em" }}>{empresa.nome}</h2>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6, flexWrap:"wrap" }}>
                      <span className="chip" style={{ background:sc.bg, color:sc.text, border:`1px solid ${sc.border}` }}>{empresa.status}</span>
                      {/* Temperatura interativa. Os emojis saíram: renderizavam
                          em tamanhos diferentes por sistema e desalinhavam a
                          linha. A cor sólida do estado ativo já diz qual é. */}
                      {[
                        { key:"Quente", solido:"#E06B5E", bg:"rgba(224,107,94,0.14)" },
                        { key:"Morno",  solido:"#E0A040", bg:"rgba(224,160,64,0.14)" },
                        { key:"Frio",   solido:"#56A4F5", bg:"rgba(86,164,245,0.14)" },
                      ].map(t => {
                        const on = empresa.temperatura === t.key;
                        return (
                          <button key={t.key} onClick={() => updateTemperatura(t.key)}
                            aria-pressed={on}
                            style={{
                              display:"inline-flex", alignItems:"center", gap:6, padding:"5px 13px",
                              borderRadius:20, fontSize:11, fontWeight:on?800:600, cursor:"pointer",
                              border:`1.5px solid ${on ? t.solido : "rgba(159,211,234,0.18)"}`,
                              background:on ? t.solido : "rgba(159,211,234,0.08)",
                              color:on ? "#FFFFFF" : "#9FD3EA",
                              boxShadow:on ? `0 0 0 3px ${t.bg}` : "none",
                              transition:"all 0.15s",
                            }}>
                            {/* ponto de cor: dá o código visual que o emoji dava,
                                sem depender da fonte de emoji do sistema */}
                            <span style={{ width:7, height:7, borderRadius:"50%", flexShrink:0, background:on ? "#FFFFFF" : t.solido }} />
                            {t.key}
                          </button>
                        );
                      })}
                      <span style={{ fontSize:12, color:"#9FD3EA", display:"flex", alignItems:"center", gap:4 }}>
                        <MapPin style={{ width:12, height:12 }} />
                        {empresa.cidade}{empresa.estado ? `, ${empresa.estado}` : ""}
                      </span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:16, flexShrink:0 }}>
                    {/* Ticket médio — calculado, não digitado. Sai da média dos
                        orçamentos aprovados desta empresa e se atualiza sozinho
                        a cada aprovação. */}
                    <div style={{ textAlign:"center" }}
                      title={ticketMedio !== null
                        ? `Média de ${aprovados.length} orçamento${aprovados.length === 1 ? "" : "s"} aprovado${aprovados.length === 1 ? "" : "s"} — ${brl(valorAprovado)} no total`
                        : "Aparece assim que o primeiro orçamento desta empresa for aprovado."}>
                      <div style={{ fontSize:20, fontWeight:800, color:ticketMedio !== null ? "#83DDA8" : "#9FD3EA", display:"flex", alignItems:"center", gap:4, justifyContent:"center" }}>
                        {ticketMedio
                          ? `R$ ${(ticketMedio/1000).toFixed(ticketMedio >= 10000 ? 0 : 1)}k`
                          : "—"}
                      </div>
                      <div style={{ fontSize:10, color:"#9FD3EA", fontWeight:600 }}>
                        Ticket médio
                        {ticketMedio !== null && (
                          <span style={{ color:"#83DDA8", fontWeight:700 }}>
                            {` · ${aprovados.length} aprov.`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:20, fontWeight:800, color:"#9FD3EA" }}>{contatos.length || "—"}</div>
                      <div style={{ fontSize:10, color:"#9FD3EA", fontWeight:600 }}>Contatos</div>
                    </div>
                  </div>
                </div>

                {/* Identificação — CNPJ, site e contato principal */}
                <div style={{ marginTop:18, paddingTop:16, borderTop:"1px solid rgba(159,211,234,0.18)", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:"8px 22px" }}>
                  {[
                    { icon: Hash,  label:"CNPJ",    value: empresa.cnpj },
                    { icon: Globe, label:"Site",    value: empresa.site, href: empresa.site ? (empresa.site.startsWith("http") ? empresa.site : `https://${empresa.site}`) : undefined },
                    { icon: User,  label:"Contato", value: contatoPrincipal ? `${contatoPrincipal.nome}${contatoPrincipal.funcao || contatoPrincipal.cargo ? ` — ${contatoPrincipal.funcao || contatoPrincipal.cargo}` : ""}` : undefined },
                    { icon: Mail,  label:"E-mail",  value: contatoPrincipal?.email || empresa.contato_email || undefined },
                    { icon: Phone, label:"Telefone", value: contatoPrincipal?.celular || contatoPrincipal?.telefone || empresa.contato_celular || undefined },
                  ].map(({ icon: Icon, label, value, href }: any) => (
                    <div key={label} style={{ display:"flex", alignItems:"center", gap:7, minWidth:0 }}>
                      <Icon style={{ width:13, height:13, color:"#9FD3EA", flexShrink:0 }} />
                      <span style={{ fontSize:11, color:"#9FD3EA", fontWeight:600, flexShrink:0 }}>{label}</span>
                      {href && value ? (
                        <a href={href} target="_blank" rel="noreferrer" style={{ fontSize:12, color:"#9FD3EA", fontWeight:600, textDecoration:"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value}</a>
                      ) : (
                        <span style={{ fontSize:12, color:value ? "#EAF6FB" : "#9FD3EA", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value || "—"}</span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Abas */}
              <div style={{ display:"flex", gap:4, overflowX:"auto", borderBottom:"1px solid rgba(159,211,234,0.18)" }}>
                {TABS.map(t => {
                  const on = tab === t.key;
                  const badge = t.key === "orcamentos" && orcamentos.length ? orcamentos.length
                              : t.key === "contatos"   && contatos.length   ? contatos.length
                              : t.key === "timeline"   && atividades.length ? atividades.length
                              : null;
                  return (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 14px", fontSize:13, fontWeight: on ? 700 : 600, color:on ? "#9FD3EA" : "#9FD3EA", background:"none", border:"none", borderBottom:`2px solid ${on ? "rgba(159,211,234,0.30)" : "transparent"}`, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'Plus Jakarta Sans',sans-serif", transition:"color 0.15s" }}>
                      <t.icon style={{ width:14, height:14 }} />
                      {t.label}
                      {badge !== null && (
                        <span style={{ fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:20, background:on ? "rgba(46,111,149,0.12)" : "rgba(149,165,166,0.15)", color: on ? "#2E6F95" : "rgba(10,37,64,0.92)" }}>{badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {tab === "resumo" && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:18, alignItems:"start" }}>
                {/* Informações */}
                <motion.div className="glass-card" style={{ padding:"22px 24px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.07 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB", marginBottom:16, display:"flex", alignItems:"center", gap:7 }}>
                    <Building2 style={{ width:15, height:15, color:"#9FD3EA" }} /> Informações da Empresa
                  </div>
                  {[
                    { icon: Tag,         label:"Segmento",       value:empresa.segmento },
                    { icon: Building2,   label:"Porte",          value:empresa.porte },
                    { icon: MapPin,      label:"Cidade",         value:`${empresa.cidade}${empresa.estado ? ` / ${empresa.estado}` : ""}` },
                    { icon: TrendingUp,  label:"Origem do lead", value:empresa.origem_lead },
                    { icon: DollarSign,  label:"Ticket médio",   value:ticketMedio
                        ? `R$ ${ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`
                        : "Sem orçamento aprovado" },
                    { icon: Thermometer, label:"Temperatura",    value:empresa.temperatura },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="info-row">
                      <Icon style={{ width:14, height:14, color:"#9FD3EA", flexShrink:0 }} />
                      <span style={{ fontSize:12, color:"#9FD3EA", fontWeight:600, minWidth:110 }}>{label}</span>
                      <span style={{ fontSize:12, color:"#EAF6FB", fontWeight:600 }}>{value || "—"}</span>
                    </div>
                  ))}
                </motion.div>

                {/* Relacionamento */}
                <motion.div className="glass-card" style={{ padding:"22px 24px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.12 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB", marginBottom:16, display:"flex", alignItems:"center", gap:7 }}>
                    <ClipboardList style={{ width:15, height:15, color:"#9FD3EA" }} /> Relacionamento
                  </div>
                  {[
                    { icon: User,         label:"Responsável",      value:empresa.responsavel_principal },
                    { icon: Clock,        label:"Última interação", value:formatDate(empresa.ultima_interacao) },
                    { icon: ChevronRight, label:"Próxima ação",     value:empresa.proxima_acao },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="info-row">
                      <Icon style={{ width:14, height:14, color:"#9FD3EA", flexShrink:0 }} />
                      <span style={{ fontSize:12, color:"#9FD3EA", fontWeight:600, minWidth:130 }}>{label}</span>
                      <span style={{ fontSize:12, color:"#EAF6FB", fontWeight:600 }}>{value || "—"}</span>
                    </div>
                  ))}
                </motion.div>

                {/* Informações rápidas — só o que tem fonte hoje. Faturamento, budget e
                    nº de vendas do mock dependem de vendas faturadas (fase 2). */}
                <motion.div className="glass-card" style={{ padding:"22px 24px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB", marginBottom:16, display:"flex", alignItems:"center", gap:7 }}>
                    <Percent style={{ width:15, height:15, color:"#9FD3EA" }} /> Informações rápidas
                  </div>
                  {[
                    { label:"Orçamentos",       value: orcamentos.length ? String(orcamentos.length) : "—" },
                    { label:"Valor aprovado",   value: valorAprovado ? brl(valorAprovado) : "—" },
                    { label:"Valor em aberto",  value: valorEmAberto ? brl(valorEmAberto) : "—" },
                    { label:"Taxa de conversão", value: conversao !== null ? `${conversao}%` : "—",
                      hint: conversao !== null ? `${aprovados.length} de ${decididos} decidido${decididos === 1 ? "" : "s"}` : "nenhum orçamento decidido" },
                    { label:"Próximo contato",  value: formatDate(empresa.data_proxima_acao || null) },
                  ].map(({ label, value, hint }: any) => (
                    <div key={label} className="info-row" style={{ justifyContent:"space-between" }}>
                      <span style={{ fontSize:12, color:"#9FD3EA", fontWeight:600 }}>{label}</span>
                      <span style={{ textAlign:"right" }}>
                        <span style={{ fontSize:12, color:"#EAF6FB", fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{value}</span>
                        {hint && <span style={{ display:"block", fontSize:10, color:"#9FD3EA" }}>{hint}</span>}
                      </span>
                    </div>
                  ))}
                </motion.div>
              </div>
              )}

              {/* Observações */}
              {tab === "observacoes" && (
                <motion.div className="glass-card" style={{ padding:"22px 24px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB", display:"flex", alignItems:"center", gap:7 }}>
                      <NotebookPen style={{ width:15, height:15, color:"#9FD3EA" }} /> Observações
                    </div>
                    <button onClick={() => navigate(`/clientes/${id}/editar`)} style={{ height:30, padding:"0 12px", borderRadius:8, border:"1px solid rgba(159,211,234,0.30)", background:"rgba(46,111,149,0.06)", color:"#9FD3EA", fontSize:11.5, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                      <Edit3 style={{ width:12, height:12 }} /> Editar
                    </button>
                  </div>
                  {empresa.observacoes ? (
                    <p style={{ fontSize:13, color:"#EAF6FB", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{empresa.observacoes}</p>
                  ) : (
                    <div style={{ padding:"28px 0", textAlign:"center", fontSize:12, color:"#9FD3EA" }}>Nenhuma observação registrada</div>
                  )}
                </motion.div>
              )}

              {/* Orçamentos */}
              {tab === "orcamentos" && (
                <motion.div className="glass-card" style={{ padding:"22px 24px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, gap:12, flexWrap:"wrap" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB", display:"flex", alignItems:"center", gap:7 }}>
                      <DollarSign style={{ width:15, height:15, color:"#83DDA8" }} /> Orçamentos ({orcamentos.length})
                    </div>
                    <button onClick={() => navigate("/gerenciamento?tab=vendas")} style={{ height:30, padding:"0 12px", borderRadius:8, border:"1px solid rgba(159,211,234,0.30)", background:"rgba(46,111,149,0.06)", color:"#9FD3EA", fontSize:11.5, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                      Gerenciar vendas <ChevronRight style={{ width:12, height:12 }} />
                    </button>
                  </div>

                  {orcamentosErro ? (
                    <div style={{ padding:"24px 0", textAlign:"center", fontSize:12, color:"rgba(192,57,43,0.75)", fontWeight:600 }}>
                      Não foi possível carregar os orçamentos.
                    </div>
                  ) : orcamentos.length === 0 ? (
                    <div style={{ padding:"28px 0", textAlign:"center" }}>
                      <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(39,174,96,0.07)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
                        <DollarSign style={{ width:20, height:20, color:"rgba(39,174,96,0.35)" }} />
                      </div>
                      <div style={{ fontSize:12, color:"#9FD3EA", fontWeight:600 }}>Nenhum orçamento para esta empresa</div>
                      <div style={{ fontSize:11, color:"#9FD3EA", marginTop:3 }}>Crie o primeiro em Gerenciamento → Vendas</div>
                    </div>
                  ) : (
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                        <thead>
                          <tr>
                            {["Título", "Criado em", "Enviado em", "Status", "Total"].map((h, i) => (
                              <th key={h} style={{ textAlign: i === 4 ? "right" : "left", padding:"8px 12px", fontSize:10.5, letterSpacing:"0.06em", textTransform:"uppercase", color:"#9FD3EA", fontWeight:700, borderBottom:"1px solid rgba(159,211,234,0.18)", whiteSpace:"nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {orcamentos.map(o => {
                            const info = STATUS_ORCAMENTO[o.status] || STATUS_ORCAMENTO.rascunho;
                            return (
                              <tr key={o.orcamento_id}>
                                <td style={{ padding:"10px 12px", borderBottom:"1px solid rgba(159,211,234,0.18)", color:"#EAF6FB", fontWeight:600 }}>{o.titulo || "Sem título"}</td>
                                <td style={{ padding:"10px 12px", borderBottom:"1px solid rgba(159,211,234,0.18)", color:"#EAF6FB", fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" }}>{formatDate(o.criado_em || null)}</td>
                                <td style={{ padding:"10px 12px", borderBottom:"1px solid rgba(159,211,234,0.18)", color:"#EAF6FB", fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" }}>{formatDate(o.data_envio || null)}</td>
                                <td style={{ padding:"10px 12px", borderBottom:"1px solid rgba(159,211,234,0.18)" }}>
                                  <span className="chip" style={{ background:info.bg, color:info.color }}>{info.label}</span>
                                </td>
                                <td style={{ padding:"10px 12px", borderBottom:"1px solid rgba(159,211,234,0.18)", textAlign:"right", color:"#EAF6FB", fontWeight:700, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" }}>{brl(num(o.total))}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Contatos + Timeline */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:18 }}>

                {/* Card único de contatos */}
                {tab === "contatos" && (
                <motion.div className="glass-card" style={{ padding:"22px 24px", display:"flex", flexDirection:"column", maxHeight:420 }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.18 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB", display:"flex", alignItems:"center", gap:7 }}>
                      <Users style={{ width:15, height:15, color:"#9FD3EA" }} /> Contatos ({contatos.length})
                    </div>
                    <div style={{ display:"flex", gap:5 }}>
                      <SendButton color="#9FD3EA" bg="rgba(41,128,185,0.08)" border="rgba(41,128,185,0.25)" icon={Mail}          label="E-mail"   onClick={() => setSendChannel("email")} />
                      <SendButton color="#83DDA8" bg="rgba(39,174,96,0.08)"  border="rgba(39,174,96,0.25)"  icon={MessageCircle} label="WhatsApp" onClick={() => setSendChannel("whatsapp")} />
                    </div>
                  </div>

                  {contatos.length === 0 ? (
                    <div style={{ padding:"24px 0", textAlign:"center", fontSize:12, color:"#9FD3EA" }}>Nenhum contato cadastrado</div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:6, overflowY:"auto", flex:1 }}>
                      <AnimatePresence>
                        {contatos.map((c, i) => {
                          const expanded = expandedContato === c.contato_id;
                          const cor = ["#9FD3EA","#83DDA8","#F2C879","#C9B6E4","#83DDA8"][i % 5];
                          return (
                            <motion.div key={c.contato_id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.18 }} style={{ borderRadius:10, overflow:"hidden" }}>
                              {/* Linha compacta */}
                              <div
                                onClick={() => setExpandedContato(expanded ? null : c.contato_id)}
                                style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:"rgba(18,59,94,0.55)", border:`1.5px solid ${expanded ? "rgba(159,211,234,0.30)" : "rgba(159,211,234,0.18)"}`, borderBottom: expanded ? "1px solid rgba(200,225,240,0.4)" : undefined, borderRadius: expanded ? "10px 10px 0 0" : "10px", cursor:"pointer", transition:"all 0.15s" }}
                              >
                                <div style={{ width:32, height:32, borderRadius:"50%", background:cor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#EAF6FB", flexShrink:0 }}>{initials(c.nome)}</div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ fontSize:12, fontWeight:700, color:"#EAF6FB", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.nome}</div>
                                  <div style={{ fontSize:10, color:"#9FD3EA" }}>{c.funcao || c.cargo || "—"}</div>
                                </div>
                                {c.decisor && <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:4, background:"rgba(39,174,96,0.1)", color:"#83DDA8", border:"1px solid rgba(39,174,96,0.2)", flexShrink:0 }}>Decisor</span>}
                                <ChevronDown style={{ width:13, height:13, color:"#9FD3EA", transform: expanded ? "rotate(180deg)" : "none", transition:"transform 0.2s", flexShrink:0 }} />
                              </div>

                              {/* Expandido */}
                              <AnimatePresence>
                                {expanded && (
                                  <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} transition={{ duration:0.2 }} style={{ overflow:"hidden" }}>
                                    <div style={{ background:"#0F2E4B", border:"1.5px solid rgba(159,211,234,0.30)", borderTop:"none", borderRadius:"0 0 10px 10px", padding:"12px 14px", display:"flex", flexDirection:"column", gap:6 }}>
                                      {c.email && (
                                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                          <Mail style={{ width:11, height:11, color:"#9FD3EA", flexShrink:0 }} />
                                          <span style={{ fontSize:11, color:"#EAF6FB", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.email}</span>
                                        </div>
                                      )}
                                      {(c.celular || c.telefone) && (
                                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                          <Phone style={{ width:11, height:11, color:"#9FD3EA", flexShrink:0 }} />
                                          <span style={{ fontSize:11, color:"#EAF6FB" }}>{c.celular || c.telefone}</span>
                                        </div>
                                      )}
                                      {c.whatsapp && (
                                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                          <MessageCircle style={{ width:11, height:11, color:"#83DDA8", flexShrink:0 }} />
                                          <span style={{ fontSize:11, color:"#EAF6FB" }}>{c.whatsapp}</span>
                                        </div>
                                      )}
                                      {c.linkedin && (
                                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                          <Link2 style={{ width:11, height:11, color:"#0077b5", flexShrink:0 }} />
                                          <span style={{ fontSize:11, color:"#EAF6FB", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.linkedin}</span>
                                        </div>
                                      )}
                                      <div style={{ display:"flex", gap:5, marginTop:4 }}>
                                        {c.email && (
                                          <button onClick={() => openContactEmail(c.email!)} style={{ flex:1, height:26, borderRadius:6, border:"1px solid rgba(159,211,234,0.30)", background:"rgba(46,111,149,0.06)", color:"#9FD3EA", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                                            <Mail style={{ width:9, height:9 }} /> Email
                                          </button>
                                        )}
                                        {(c.whatsapp || c.celular) && (
                                          <button onClick={() => openWhatsApp(c.whatsapp || c.celular || "")} style={{ flex:1, height:26, borderRadius:6, border:"1px solid rgba(39,174,96,0.25)", background:"rgba(39,174,96,0.06)", color:"#83DDA8", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                                            <MessageCircle style={{ width:9, height:9 }} /> WhatsApp
                                          </button>
                                        )}
                                        {(c.celular || c.telefone) && (
                                          <button onClick={() => window.open(`tel:${c.celular || c.telefone}`, "_self")} style={{ flex:1, height:26, borderRadius:6, border:"1px solid rgba(230,126,34,0.25)", background:"rgba(230,126,34,0.06)", color:"#F2C879", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                                            <Phone style={{ width:9, height:9 }} /> Ligar
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
                )}

                {/* Empresas próximas desta empresa — parte da coordenada dela,
                    sem obrigar o usuário a voltar para a busca e redigitar cidade */}
                {tab === "proximas" && (
                <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.1 }}>
                  <EmpresasProximasDaEmpresa
                    empresaId={empresa.empresa_id}
                    nome={empresa.nome}
                    latitude={empresa.latitude}
                    longitude={empresa.longitude}
                    cidade={empresa.cidade}
                    segmento={empresa.segmento}
                  />
                </motion.div>
                )}

                {/* Card de atividades */}
                {tab === "timeline" && (
                <motion.div className="glass-card" style={{ padding:"22px 24px", display:"flex", flexDirection:"column", maxHeight:420 }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.22 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB", marginBottom:14, display:"flex", alignItems:"center", gap:7 }}>
                    <Calendar style={{ width:15, height:15, color:"#9FD3EA" }} /> Atividades & Eventos
                  </div>

                  {/* Legenda */}
                  <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
                    {[
                      { label:"Aceito",       color:"#83DDA8", icon:<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9.5 10,2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                      { label:"Negado",       color:"#F7B8B1", icon:<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg> },
                      { label:"Talvez",       color:"#F2C879", icon:<span style={{ color:"#fff", fontSize:11, fontWeight:900, lineHeight:1 }}>?</span> },
                      { label:"Novo horário", color:"#9FD3EA", icon:<Clock style={{ width:9, height:9, color:"#fff" }}/> },
                    ].map(s => (
                      <div key={s.label} style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <div style={{ width:14, height:14, borderRadius:"50%", background:s.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{s.icon}</div>
                        <span style={{ fontSize:9, fontWeight:600, color:"#9FD3EA" }}>{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {atividades.length === 0 ? (
                    <div style={{ padding:"28px 0", textAlign:"center" }}>
                      <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(142,68,173,0.07)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
                        <Calendar style={{ width:20, height:20, color:"rgba(142,68,173,0.3)" }} />
                      </div>
                      <div style={{ fontSize:12, color:"#9FD3EA", fontWeight:600 }}>Nenhuma atividade agendada</div>
                      <div style={{ fontSize:11, color:"#9FD3EA", marginTop:3 }}>Agende pelo calendário e as respostas aparecerão aqui</div>
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:7, overflowY:"auto", flex:1 }}>
                      {atividades.map((a: any) => {
                        const STATUS: Record<string, { color:string; bg: string; border:string; label: string; icon: React.ReactNode }> = {
                          aceito:       { color:"#83DDA8", bg:"rgba(39,174,96,0.08)",  border:"rgba(39,174,96,0.28)",  label:"Aceito",       icon:<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9.5 10,2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                          negado:       { color:"#F7B8B1", bg:"rgba(231,76,60,0.08)",  border:"rgba(231,76,60,0.28)",  label:"Negado",       icon:<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg> },
                          talvez:       { color:"#F2C879", bg:"rgba(243,156,18,0.08)", border:"rgba(243,156,18,0.28)", label:"Talvez",       icon:<span style={{ color:"#fff", fontSize:11, fontWeight:900, lineHeight:1 }}>?</span> },
                          novo_horario: { color:"#9FD3EA", bg:"rgba(159,211,234,0.55)", border:"rgba(159,211,234,0.30)", label:"Novo horário", icon:<Clock style={{ width:9, height:9, color:"#fff" }}/> },
                        };
                        const cfg = STATUS[a.status_resposta] || { color:"rgba(100,120,140,0.5)", bg:"rgba(149,165,166,0.07)", border:"rgba(149,165,166,0.2)", label:"Pendente", icon:<span style={{ color:"#fff", fontSize:9 }}>–</span> };
                        const dt = a.data_hora || a.data;
                        const fmtDt = dt ? (() => { try { const d = new Date(dt); return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}) + " às " + d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}); } catch { return dt; } })() : "—";
                        return (
                          <div key={a.evento_id || a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:9, background:cfg.bg, border:`1.5px solid ${cfg.border}` }}>
                            <div style={{ width:26, height:26, borderRadius:"50%", background:cfg.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 2px 6px ${cfg.color}55` }}>
                              {cfg.icon}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12, fontWeight:700, color:"#EAF6FB", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.titulo || a.nome || "Atividade"}</div>
                              <div style={{ fontSize:10, color:"#9FD3EA", marginTop:1 }}>{fmtDt}</div>
                            </div>
                            <span style={{ fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:20, background:cfg.color, color:"#EAF6FB", flexShrink:0 }}>{cfg.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign:"center", padding:48 }}>
              <Building2 style={{ width:40, height:40, color:"#9FD3EA", margin:"0 auto 12px" }} />
              <p style={{ fontSize:14, fontWeight:600, color:"#9FD3EA" }}>Empresa não encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}