import { getToken } from "../../../services/auth";
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { openEmail, openWhatsApp } from "../../../utils/commPrefs";
import {
  BarChart3, LayoutDashboard, Search, Building2, Users,
  ClipboardList, Calendar, ArrowLeft, Edit3,
  MapPin, Tag, Thermometer, TrendingUp, DollarSign,
  Phone, Mail, User, Clock, ChevronRight, MessageCircle, Link2,
  ChevronDown, Check, X as XIcon,
  
} from "lucide-react";

import SelectRecipientsModal, {
  SendChannel,
  Recipient,
  EmailProvider,
} from "../../../components/SelectRecipientsModal";
import EmpresaNotificationBell from "../../../components/EmpresaNotificationBell";

const API = "https://backend-crm-production-157b.up.railway.app";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-30px) scale(1.05)}66%{transform:translate(-20px,20px) scale(0.97)} }
  @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(-50px,25px) scale(1.08)}70%{transform:translate(30px,-15px) scale(0.95)} }
  @keyframes float3 { 0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(25px,40px) scale(1.03)} }
  @keyframes float4 { 0%,100%{transform:translate(0,0)}30%{transform:translate(-30px,-40px)}60%{transform:translate(20px,15px)} }
  @keyframes float5 { 0%,100%{transform:translate(0,0) scale(1)}45%{transform:translate(35px,-20px) scale(1.06)}80%{transform:translate(-15px,30px) scale(0.96)} }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:rgba(255,255,255,0.65); transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(255,255,255,0.08); color:#fff; }
  .nav-item.active { background:rgba(255,255,255,0.14); color:#fff; font-weight:600; }
  .glass-card { background:rgba(255,255,255,0.72); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.9); border-radius:16px; }
  .chip { display:inline-flex; align-items:center; gap:4px; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; }
  .info-row { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid rgba(200,225,240,0.4); }
  .info-row:last-child { border-bottom:none; }
  .send-btn { display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:8px; border:1.5px solid; font-size:11px; font-weight:700; cursor:pointer; transition:all 0.18s; font-family:'Plus Jakarta Sans',sans-serif; }
  .skeleton { background:linear-gradient(90deg,rgba(200,225,240,0.4) 25%,rgba(220,240,252,0.7) 50%,rgba(200,225,240,0.4) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
  .user-card { margin-top:16px; padding:12px; border-radius:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; gap:10px; cursor:pointer; transition:background 0.18s; }
  .user-card:hover { background:rgba(255,255,255,0.12); }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(41,128,185,0.25); border-radius:4px; }
`;

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",                path: "/dashboard" },
  { icon: Search,          label: "Buscar Empresas",           path: "/buscar" },
  { icon: Building2,       label: "Cadastrar Empresas",        path: "/empresas/nova" },
  { icon: Users,           label: "Todos os clientes",         path: "/clientes" },
  { icon: ClipboardList,   label: "Gerenciamento de clientes", path: "/gerenciamento" },
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
  segmento: string;
  porte: string;
  cidade: string;
  estado?: string;
  status: string;
  temperatura: string;
  ticket_medio_estimado: number | null;
  responsavel_principal: string;
  origem_lead: string;
  ultima_interacao: string | null;
  proxima_acao: string;
  observacoes?: string;
}

interface Usuario {
  nome: string;
  email: string;
  cargo: string;
  empresa_nome: string;
}

function statusColor(s: string) {
  if (s === "Fechado")    return { bg:"rgba(39,174,96,0.12)",   text:"#1e8449",  border:"rgba(39,174,96,0.25)"   };
  if (s === "Proposta")   return { bg:"rgba(142,68,173,0.12)",  text:"#7d3c98",  border:"rgba(142,68,173,0.25)"  };
  if (s === "Em contato") return { bg:"rgba(41,128,185,0.12)",  text:"#1a5276",  border:"rgba(41,128,185,0.25)"  };
  return                         { bg:"rgba(149,165,166,0.15)", text:"#566573",  border:"rgba(149,165,166,0.3)"  };
}
function initials(name: string) {
  return name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
}
function avatarColor(name: string) {
  const colors = ["#2980b9", "#1abc9c", "#8e44ad", "#e67e22", "#27ae60", "#e74c3c"];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}
function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function SendButton({
  color, bg, border, icon: Icon, label, onClick,
}: {
  color: string; bg: string; border: string;
  icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <button
      className="send-btn"
      onClick={onClick}
      style={{ background: bg, borderColor: border, color }}
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
  const [loading, setLoading]     = useState(true);
  const [usuario, setUsuario]     = useState<Usuario | null>(null);
  const [expandedContato, setExpandedContato] = useState<string | null>(null);
  const [editValor, setEditValor] = useState(false);
  const [valorDraft, setValorDraft] = useState("");

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
        const [empRes, contatosRes, meRes] = await Promise.all([
          fetch(`${API}/empresas/${id}`,          { headers }),
          fetch(`${API}/empresas/${id}/contatos`, { headers }),
          fetch(`${API}/me`,                      { headers }),
        ]);
        if (empRes.ok)      setEmpresa(await empRes.json());
        if (contatosRes.ok) setContatos(await contatosRes.json());
        if (meRes.ok)       setUsuario(await meRes.json());
        try {
          const aRes = await fetch(`${API}/empresas/${id}/atividades`, { headers });
          if (aRes.ok) setAtividades(await aRes.json());
        } catch {}
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

  const saveValor = async () => {
    if (!empresa) return;
    const norm = valorDraft.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const valor = Number.isFinite(Number(norm)) && Number(norm) > 0 ? Number(norm) : null;
    const anterior = empresa.ticket_medio_estimado;
    setEmpresa(prev => prev ? { ...prev, ticket_medio_estimado: valor } : prev);
    setEditValor(false);
    try {
      await fetch(`${API}/empresas/${empresa.empresa_id}`, {
        method: "PUT", headers: hdrs(), body: JSON.stringify({ ticket_medio_estimado: valor }),
      });
    } catch {
      setEmpresa(prev => prev ? { ...prev, ticket_medio_estimado: anterior } : prev);
    }
  };

  const sc = empresa ? statusColor(empresa.status)      : statusColor("");
  const nomeUsuario  = usuario?.nome  || "...";
  const cargoUsuario = usuario?.cargo || "Administrador";
  const corUsuario   = usuario ? avatarColor(usuario.nome) : "#2980b9";
  const iniciaisUsu  = usuario ? initials(usuario.nome)    : "?";

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
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(145deg,#c8e8f5 0%,#d6eef5 30%,#cceee8 65%,#c5eae0 100%)" }} />
        <div style={{ position:"absolute", inset:0, opacity:0.4, backgroundImage:"radial-gradient(circle,rgba(41,128,185,0.2) 1px,transparent 1px)", backgroundSize:"22px 22px" }} />
        {[
          { w:400,h:400, top:"-60px", left:"8%",   anim:"float1 18s ease-in-out infinite", op:0.11, c1:"#2980b9",c2:"#1abc9c" },
          { w:260,h:260, top:"45%",   left:"-50px", anim:"float2 22s ease-in-out infinite", op:0.09, c1:"#1abc9c",c2:"#2ecc71" },
          { w:320,h:320, top:"65%",   left:"60%",   anim:"float3 26s ease-in-out infinite", op:0.08, c1:"#2980b9",c2:"#8e44ad" },
          { w:180,h:180, top:"15%",   left:"78%",   anim:"float4 20s ease-in-out infinite", op:0.10, c1:"#27ae60",c2:"#1abc9c" },
          { w:220,h:220, top:"80%",   left:"25%",   anim:"float5 24s ease-in-out infinite", op:0.07, c1:"#e67e22",c2:"#f39c12" },
        ].map((c, i) => (
          <div key={i} style={{ position:"absolute", width:c.w, height:c.h, top:c.top, left:c.left, borderRadius:"50%", background:`radial-gradient(circle at 40% 40%,${c.c1},${c.c2})`, opacity:c.op, animation:c.anim, filter:"blur(2px)" }} />
        ))}
      </div>

      {/* ── Sidebar ── */}
      <div style={{ width:220, flexShrink:0, height:"100vh", overflowY:"auto", position:"relative", zIndex:10, background:"linear-gradient(180deg,#1a3a5c 0%,#0f2a44 60%,#0a1f33 100%)", boxShadow:"4px 0 24px rgba(0,0,0,0.18)", display:"flex", flexDirection:"column", padding:"0 12px 20px" }}>
        <div style={{ padding:"22px 4px 24px", borderBottom:"1px solid rgba(255,255,255,0.08)", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#2980b9,#1abc9c)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(41,128,185,0.4)" }}>
              <BarChart3 style={{ width:18, height:18, color:"#fff" }} />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Prospecção</div>
              <div style={{ fontSize:11, fontWeight:700, background:"linear-gradient(90deg,#2980b9,#1abc9c,#2ecc71,#2980b9)", backgroundSize:"200% 200%", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"gradientShift 4s ease infinite" }}>CRM</div>
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
        <div className="user-card" onClick={() => navigate("/perfil")}>
          <div style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg,${corUsuario},${corUsuario}cc)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>
            {iniciaisUsu}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{nomeUsuario}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)" }}>{cargoUsuario}</div>
          </div>
          <ChevronDown style={{ width:13, height:13, color:"rgba(255,255,255,0.4)", flexShrink:0 }} />
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex:1, height:"100vh", overflowY:"auto", position:"relative", zIndex:5 }}>

        {/* Topbar */}
        <div style={{ position:"sticky", top:0, zIndex:20, padding:"14px 28px", background:"rgba(210,238,248,0.75)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.6)", display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={() => navigate(backTo)} style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(200,225,240,0.9)", background:"rgba(255,255,255,0.75)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <ArrowLeft style={{ width:15, height:15, color:"#2980b9" }} />
          </button>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:18, fontWeight:800, color:"#0f2133", letterSpacing:"-0.02em" }}>
              {loading ? "Carregando..." : empresa?.nome}
            </h1>
            <p style={{ fontSize:12, color:"rgba(20,45,70,0.5)", marginTop:1, display:"flex", alignItems:"center", gap:4 }}>
              <span>Clientes</span>
              <ChevronRight style={{ width:11, height:11 }} />
              <span>{loading ? "..." : empresa?.nome}</span>
            </p>
          </div>

          {!loading && contatos.length > 0 && (
            <div style={{ display:"flex", gap:6 }}>
              <SendButton color="#2980b9" bg="rgba(41,128,185,0.08)" border="rgba(41,128,185,0.3)"  icon={Mail}          label="E-mail"   onClick={() => setSendChannel("email")} />
              <SendButton color="#27ae60" bg="rgba(39,174,96,0.08)"  border="rgba(39,174,96,0.3)"   icon={MessageCircle} label="WhatsApp" onClick={() => setSendChannel("whatsapp")} />
              <SendButton color="#e67e22" bg="rgba(230,126,34,0.08)" border="rgba(230,126,34,0.3)"  icon={Phone}         label="Ligar"    onClick={() => setSendChannel("telefone")} />
            </div>
          )}

          {!loading && empresa && (
            <EmpresaNotificationBell
              empresaId={empresa.empresa_id}
              empresaNome={empresa.nome}
              onVerComunicacoes={() => navigate(`/clientes/${id}?tab=comunicacoes`)}
            />
          )}

          <button onClick={() => navigate(`/clientes/${id}/editar`)} style={{ height:38, padding:"0 16px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2980b9,#1abc9c,#2ecc71,#2980b9)", backgroundSize:"200% 200%", animation:"gradientShift 4s ease infinite", color:"#fff", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:6, boxShadow:"0 4px 14px rgba(41,128,185,0.35)" }}>
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
                  <div style={{ width:64, height:64, borderRadius:16, background:avatarColor(empresa.nome), display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:800, color:"#fff", flexShrink:0 }}>
                    {initials(empresa.nome)}
                  </div>
                  <div style={{ flex:1 }}>
                    <h2 style={{ fontSize:22, fontWeight:800, color:"#0f2133", letterSpacing:"-0.02em" }}>{empresa.nome}</h2>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6, flexWrap:"wrap" }}>
                      <span className="chip" style={{ background:sc.bg, color:sc.text, border:`1px solid ${sc.border}` }}>{empresa.status}</span>
                      {/* Temperatura interativa */}
                      {[
                        { key:"Quente", icon:"🔥", color:"#c0392b", bg:"rgba(192,57,43,0.13)", border:"rgba(192,57,43,0.35)" },
                        { key:"Morno",  icon:"🌡️", color:"#d68910", bg:"rgba(214,137,16,0.13)", border:"rgba(214,137,16,0.35)" },
                        { key:"Frio",   icon:"❄️", color:"#2980b9", bg:"rgba(41,128,185,0.13)", border:"rgba(41,128,185,0.35)" },
                      ].map(t => (
                        <button key={t.key} onClick={() => updateTemperatura(t.key)} style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"4px 11px", borderRadius:20, fontSize:11, fontWeight:700, border:`1.5px solid ${empresa.temperatura===t.key ? t.border : "rgba(200,225,240,0.6)"}`, background:empresa.temperatura===t.key ? t.bg : "rgba(255,255,255,0.45)", color:empresa.temperatura===t.key ? t.color : "rgba(20,45,70,0.35)", cursor:"pointer", transition:"all 0.15s" }}>
                          {t.icon} {t.key}
                        </button>
                      ))}
                      <span style={{ fontSize:12, color:"rgba(20,45,70,0.55)", display:"flex", alignItems:"center", gap:4 }}>
                        <MapPin style={{ width:12, height:12 }} />
                        {empresa.cidade}{empresa.estado ? `, ${empresa.estado}` : ""}
                      </span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:16, flexShrink:0 }}>
                    <div style={{ textAlign:"center" }}>
                      {editValor ? (
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <input
                            autoFocus
                            value={valorDraft}
                            onChange={e => setValorDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveValor(); if (e.key === "Escape") setEditValor(false); }}
                            placeholder="Ex: 5000"
                            style={{ width:90, height:30, borderRadius:8, border:"1.5px solid rgba(41,128,185,0.4)", background:"rgba(255,255,255,0.9)", fontSize:12, fontWeight:700, padding:"0 8px", outline:"none", color:"#0f2133" }}
                          />
                          <button onClick={saveValor} style={{ width:26, height:26, borderRadius:7, border:"1px solid rgba(39,174,96,0.4)", background:"rgba(39,174,96,0.1)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#27ae60" }}><Check style={{ width:12, height:12 }}/></button>
                          <button onClick={() => setEditValor(false)} style={{ width:26, height:26, borderRadius:7, border:"1px solid rgba(200,225,240,0.7)", background:"rgba(255,255,255,0.7)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(20,45,70,0.4)" }}><XIcon style={{ width:12, height:12 }}/></button>
                        </div>
                      ) : (
                        <div
                          onClick={empresa.status === "Proposta" ? () => { setEditValor(true); setValorDraft(empresa.ticket_medio_estimado?.toString() || ""); } : undefined}
                          title={empresa.status === "Proposta" ? "Clique para definir o valor" : undefined}
                          style={{ cursor: empresa.status === "Proposta" ? "pointer" : "default" }}
                        >
                          <div style={{ fontSize:20, fontWeight:800, color:"#2980b9", display:"flex", alignItems:"center", gap:4, justifyContent:"center" }}>
                            {empresa.ticket_medio_estimado
                              ? `R$ ${(empresa.ticket_medio_estimado/1000).toFixed(0)}k`
                              : empresa.status === "Proposta"
                                ? <span style={{ fontSize:13, color:"rgba(41,128,185,0.7)" }}>Definir</span>
                                : "—"
                            }
                            {empresa.status === "Proposta" && <Edit3 style={{ width:11, height:11, color:"rgba(41,128,185,0.5)" }}/>}
                          </div>
                          <div style={{ fontSize:10, color:"rgba(20,45,70,0.45)", fontWeight:600 }}>Ticket médio</div>
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:20, fontWeight:800, color:"#1abc9c" }}>{contatos.length || "—"}</div>
                      <div style={{ fontSize:10, color:"rgba(20,45,70,0.45)", fontWeight:600 }}>Contatos</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
                {/* Informações */}
                <motion.div className="glass-card" style={{ padding:"22px 24px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.07 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#0f2133", marginBottom:16, display:"flex", alignItems:"center", gap:7 }}>
                    <Building2 style={{ width:15, height:15, color:"#2980b9" }} /> Informações da Empresa
                  </div>
                  {[
                    { icon: Tag,         label:"Segmento",       value:empresa.segmento },
                    { icon: Building2,   label:"Porte",          value:empresa.porte },
                    { icon: MapPin,      label:"Cidade",         value:`${empresa.cidade}${empresa.estado ? ` / ${empresa.estado}` : ""}` },
                    { icon: TrendingUp,  label:"Origem do lead", value:empresa.origem_lead },
                    { icon: DollarSign,  label:"Ticket médio",   value:empresa.ticket_medio_estimado ? `R$ ${empresa.ticket_medio_estimado.toLocaleString("pt-BR")}` : "Não informado" },
                    { icon: Thermometer, label:"Temperatura",    value:empresa.temperatura },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="info-row">
                      <Icon style={{ width:14, height:14, color:"#2980b9", flexShrink:0 }} />
                      <span style={{ fontSize:12, color:"rgba(20,45,70,0.5)", fontWeight:600, minWidth:110 }}>{label}</span>
                      <span style={{ fontSize:12, color:"#0f2133", fontWeight:600 }}>{value || "—"}</span>
                    </div>
                  ))}
                </motion.div>

                {/* Relacionamento */}
                <motion.div className="glass-card" style={{ padding:"22px 24px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.12 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#0f2133", marginBottom:16, display:"flex", alignItems:"center", gap:7 }}>
                    <ClipboardList style={{ width:15, height:15, color:"#2980b9" }} /> Relacionamento
                  </div>
                  {[
                    { icon: User,         label:"Responsável",      value:empresa.responsavel_principal },
                    { icon: Clock,        label:"Última interação", value:formatDate(empresa.ultima_interacao) },
                    { icon: ChevronRight, label:"Próxima ação",     value:empresa.proxima_acao },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="info-row">
                      <Icon style={{ width:14, height:14, color:"#2980b9", flexShrink:0 }} />
                      <span style={{ fontSize:12, color:"rgba(20,45,70,0.5)", fontWeight:600, minWidth:130 }}>{label}</span>
                      <span style={{ fontSize:12, color:"#0f2133", fontWeight:600 }}>{value || "—"}</span>
                    </div>
                  ))}
                  {empresa.observacoes && (
                    <div style={{ marginTop:14, padding:"12px 14px", borderRadius:10, background:"rgba(41,128,185,0.06)", border:"1px solid rgba(41,128,185,0.12)" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"rgba(20,45,70,0.5)", marginBottom:5 }}>OBSERVAÇÕES</div>
                      <p style={{ fontSize:12, color:"#0f2133", lineHeight:1.6 }}>{empresa.observacoes}</p>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Contatos + Atividades */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>

                {/* Card único de contatos */}
                <motion.div className="glass-card" style={{ padding:"22px 24px", display:"flex", flexDirection:"column", maxHeight:420 }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.18 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#0f2133", display:"flex", alignItems:"center", gap:7 }}>
                      <Users style={{ width:15, height:15, color:"#2980b9" }} /> Contatos ({contatos.length})
                    </div>
                    <div style={{ display:"flex", gap:5 }}>
                      <SendButton color="#2980b9" bg="rgba(41,128,185,0.08)" border="rgba(41,128,185,0.25)" icon={Mail}          label="E-mail"   onClick={() => setSendChannel("email")} />
                      <SendButton color="#27ae60" bg="rgba(39,174,96,0.08)"  border="rgba(39,174,96,0.25)"  icon={MessageCircle} label="WhatsApp" onClick={() => setSendChannel("whatsapp")} />
                    </div>
                  </div>

                  {contatos.length === 0 ? (
                    <div style={{ padding:"24px 0", textAlign:"center", fontSize:12, color:"rgba(20,45,70,0.4)" }}>Nenhum contato cadastrado</div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:6, overflowY:"auto", flex:1 }}>
                      <AnimatePresence>
                        {contatos.map((c, i) => {
                          const expanded = expandedContato === c.contato_id;
                          const cor = ["#2980b9","#1abc9c","#e67e22","#8e44ad","#27ae60"][i % 5];
                          return (
                            <motion.div key={c.contato_id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.18 }} style={{ borderRadius:10, overflow:"hidden" }}>
                              {/* Linha compacta */}
                              <div
                                onClick={() => setExpandedContato(expanded ? null : c.contato_id)}
                                style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:"rgba(255,255,255,0.6)", border:`1.5px solid ${expanded ? "rgba(41,128,185,0.4)" : "rgba(200,225,240,0.6)"}`, borderBottom: expanded ? "1px solid rgba(200,225,240,0.4)" : undefined, borderRadius: expanded ? "10px 10px 0 0" : "10px", cursor:"pointer", transition:"all 0.15s" }}
                              >
                                <div style={{ width:32, height:32, borderRadius:"50%", background:cor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>{initials(c.nome)}</div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ fontSize:12, fontWeight:700, color:"#0f2133", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.nome}</div>
                                  <div style={{ fontSize:10, color:"rgba(20,45,70,0.45)" }}>{c.funcao || c.cargo || "—"}</div>
                                </div>
                                {c.decisor && <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:4, background:"rgba(39,174,96,0.1)", color:"#27ae60", border:"1px solid rgba(39,174,96,0.2)", flexShrink:0 }}>Decisor</span>}
                                <ChevronDown style={{ width:13, height:13, color:"rgba(20,45,70,0.3)", transform: expanded ? "rotate(180deg)" : "none", transition:"transform 0.2s", flexShrink:0 }} />
                              </div>

                              {/* Expandido */}
                              <AnimatePresence>
                                {expanded && (
                                  <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} transition={{ duration:0.2 }} style={{ overflow:"hidden" }}>
                                    <div style={{ background:"rgba(248,252,255,0.9)", border:"1.5px solid rgba(41,128,185,0.25)", borderTop:"none", borderRadius:"0 0 10px 10px", padding:"12px 14px", display:"flex", flexDirection:"column", gap:6 }}>
                                      {c.email && (
                                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                          <Mail style={{ width:11, height:11, color:"#2980b9", flexShrink:0 }} />
                                          <span style={{ fontSize:11, color:"rgba(20,45,70,0.65)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.email}</span>
                                        </div>
                                      )}
                                      {(c.celular || c.telefone) && (
                                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                          <Phone style={{ width:11, height:11, color:"#2980b9", flexShrink:0 }} />
                                          <span style={{ fontSize:11, color:"rgba(20,45,70,0.65)" }}>{c.celular || c.telefone}</span>
                                        </div>
                                      )}
                                      {c.whatsapp && (
                                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                          <MessageCircle style={{ width:11, height:11, color:"#27ae60", flexShrink:0 }} />
                                          <span style={{ fontSize:11, color:"rgba(20,45,70,0.65)" }}>{c.whatsapp}</span>
                                        </div>
                                      )}
                                      {c.linkedin && (
                                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                          <Link2 style={{ width:11, height:11, color:"#0077b5", flexShrink:0 }} />
                                          <span style={{ fontSize:11, color:"rgba(20,45,70,0.65)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.linkedin}</span>
                                        </div>
                                      )}
                                      <div style={{ display:"flex", gap:5, marginTop:4 }}>
                                        {c.email && (
                                          <button onClick={() => openContactEmail(c.email!)} style={{ flex:1, height:26, borderRadius:6, border:"1px solid rgba(41,128,185,0.25)", background:"rgba(41,128,185,0.06)", color:"#2980b9", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                                            <Mail style={{ width:9, height:9 }} /> Email
                                          </button>
                                        )}
                                        {(c.whatsapp || c.celular) && (
                                          <button onClick={() => openWhatsApp(c.whatsapp || c.celular || "")} style={{ flex:1, height:26, borderRadius:6, border:"1px solid rgba(39,174,96,0.25)", background:"rgba(39,174,96,0.06)", color:"#27ae60", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                                            <MessageCircle style={{ width:9, height:9 }} /> WhatsApp
                                          </button>
                                        )}
                                        {(c.celular || c.telefone) && (
                                          <button onClick={() => window.open(`tel:${c.celular || c.telefone}`, "_self")} style={{ flex:1, height:26, borderRadius:6, border:"1px solid rgba(230,126,34,0.25)", background:"rgba(230,126,34,0.06)", color:"#e67e22", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
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

                {/* Card de atividades */}
                <motion.div className="glass-card" style={{ padding:"22px 24px", display:"flex", flexDirection:"column", maxHeight:420 }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.22 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#0f2133", marginBottom:14, display:"flex", alignItems:"center", gap:7 }}>
                    <Calendar style={{ width:15, height:15, color:"#8e44ad" }} /> Atividades & Eventos
                  </div>

                  {/* Legenda */}
                  <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
                    {[
                      { label:"Aceito",       color:"#27ae60", icon:<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9.5 10,2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                      { label:"Negado",       color:"#e74c3c", icon:<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg> },
                      { label:"Talvez",       color:"#f39c12", icon:<span style={{ color:"#fff", fontSize:11, fontWeight:900, lineHeight:1 }}>?</span> },
                      { label:"Novo horário", color:"#2980b9", icon:<Clock style={{ width:9, height:9, color:"#fff" }}/> },
                    ].map(s => (
                      <div key={s.label} style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <div style={{ width:14, height:14, borderRadius:"50%", background:s.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{s.icon}</div>
                        <span style={{ fontSize:9, fontWeight:600, color:"rgba(20,45,70,0.5)" }}>{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {atividades.length === 0 ? (
                    <div style={{ padding:"28px 0", textAlign:"center" }}>
                      <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(142,68,173,0.07)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
                        <Calendar style={{ width:20, height:20, color:"rgba(142,68,173,0.3)" }} />
                      </div>
                      <div style={{ fontSize:12, color:"rgba(20,45,70,0.4)", fontWeight:600 }}>Nenhuma atividade agendada</div>
                      <div style={{ fontSize:11, color:"rgba(20,45,70,0.3)", marginTop:3 }}>Agende pelo calendário e as respostas aparecerão aqui</div>
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:7, overflowY:"auto", flex:1 }}>
                      {atividades.map((a: any) => {
                        const STATUS: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
                          aceito:       { color:"#27ae60", bg:"rgba(39,174,96,0.08)",  border:"rgba(39,174,96,0.28)",  label:"Aceito",       icon:<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9.5 10,2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                          negado:       { color:"#e74c3c", bg:"rgba(231,76,60,0.08)",  border:"rgba(231,76,60,0.28)",  label:"Negado",       icon:<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg> },
                          talvez:       { color:"#f39c12", bg:"rgba(243,156,18,0.08)", border:"rgba(243,156,18,0.28)", label:"Talvez",       icon:<span style={{ color:"#fff", fontSize:11, fontWeight:900, lineHeight:1 }}>?</span> },
                          novo_horario: { color:"#2980b9", bg:"rgba(41,128,185,0.08)", border:"rgba(41,128,185,0.28)", label:"Novo horário", icon:<Clock style={{ width:9, height:9, color:"#fff" }}/> },
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
                              <div style={{ fontSize:12, fontWeight:700, color:"#0f2133", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.titulo || a.nome || "Atividade"}</div>
                              <div style={{ fontSize:10, color:"rgba(20,45,70,0.5)", marginTop:1 }}>{fmtDt}</div>
                            </div>
                            <span style={{ fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:20, background:cfg.color, color:"#fff", flexShrink:0 }}>{cfg.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              </div>
            </>
          ) : (
            <div style={{ textAlign:"center", padding:48 }}>
              <Building2 style={{ width:40, height:40, color:"rgba(41,128,185,0.3)", margin:"0 auto 12px" }} />
              <p style={{ fontSize:14, fontWeight:600, color:"rgba(20,45,70,0.5)" }}>Empresa não encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}