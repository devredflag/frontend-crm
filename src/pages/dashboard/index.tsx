import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Building2, MessageCircle, Send, Handshake,
  LayoutDashboard, Search, Bell, Calendar, Plus,
  TrendingUp, ChevronDown, ChevronRight,
  ClipboardList, BarChart3, RefreshCw,
  MapPin, Phone, Mail, User, Flame, ArrowRight,
  Eye, X,
} from "lucide-react";

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
  .metric-card { background:rgba(255,255,255,0.72); backdrop-filter:blur(16px); border:1.5px solid rgba(255,255,255,0.9); border-radius:16px; padding:18px 16px; transition:all 0.2s; cursor:pointer; user-select:none; }
  .metric-card:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(41,128,185,0.15); }
  .preview-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr; align-items:center; padding:11px 18px; border-bottom:1px solid rgba(200,225,240,0.35); cursor:pointer; transition:background 0.13s; }
  .preview-row:hover { background:rgba(41,128,185,0.04); }
  .preview-row:last-child { border-bottom:none; }
  .preview-th { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr; align-items:center; padding:8px 18px; border-bottom:1px solid rgba(200,225,240,0.5); }
  .chip { display:inline-flex; align-items:center; gap:3px; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; white-space:nowrap; }
  .action-item { padding:12px 14px; border-radius:12px; background:rgba(255,255,255,0.55); border:1px solid rgba(200,225,240,0.6); cursor:pointer; transition:all 0.18s; }
  .action-item:hover { background:rgba(255,255,255,0.85); border-color:rgba(41,128,185,0.3); transform:translateY(-1px); }
  .skeleton { background:linear-gradient(90deg,rgba(200,225,240,0.4) 25%,rgba(220,240,252,0.7) 50%,rgba(200,225,240,0.4) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(41,128,185,0.25); border-radius:4px; }
`;

interface Empresa {
  empresa_id: string;
  nome: string;
  segmento: string;
  porte: string;
  cidade: string;
  status: string;
  temperatura: string;
  ticket_medio_estimado: number | null;
  responsavel_principal: string;
  origem_lead: string;
  ultima_interacao: string | null;
  proxima_acao: string;
}

interface Contato {
  contato_id: string;
  nome: string;
  funcao: string;
  email: string;
  celular: string;
  whatsapp: string;
  decisor: boolean;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",                active: true  },
  { icon: Search,          label: "Buscar Empresas",           active: false },
  { icon: Building2,       label: "Cadastrar Empresas",        active: false },
  { icon: Users,           label: "Todos os clientes",         active: false },
  { icon: ClipboardList,   label: "Gerenciamento de clientes", active: false },
  { icon: Calendar,        label: "Calendário",                active: false },
];

function avatarColor(name: string) {
  const colors = ["#2980b9","#1abc9c","#8e44ad","#e67e22","#27ae60","#e74c3c"];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}
function initials(name: string) {
  return name?.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase() || "?";
}
function statusColor(s: string) {
  if (s === "Fechado")    return { bg:"rgba(39,174,96,0.12)",   text:"#1e8449",  border:"rgba(39,174,96,0.3)"   };
  if (s === "Proposta")   return { bg:"rgba(142,68,173,0.12)",  text:"#7d3c98",  border:"rgba(142,68,173,0.3)"  };
  if (s === "Em contato") return { bg:"rgba(41,128,185,0.12)",  text:"#1a5276",  border:"rgba(41,128,185,0.3)"  };
  return                         { bg:"rgba(149,165,166,0.15)", text:"#566573",  border:"rgba(149,165,166,0.3)" };
}
function tempIcon(t: string) { if (t==="Quente") return "🔥"; if (t==="Morno") return "🌡️"; return "❄️"; }
function tempColor(t: string) { if (t==="Quente") return "#c0392b"; if (t==="Morno") return "#d68910"; return "#2980b9"; }

function Sparkline({ color }: { color: string }) {
  return (
    <svg width="48" height="16" viewBox="0 0 48 16" fill="none">
      <polyline points="0,12 8,9 16,11 24,6 32,8 40,3 48,2" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}

type FilterKey = "total"|"lead"|"em_contato"|"proposta"|"fechado"|"quente";

export default function Dashboard() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("total");
  const [selectedAction, setSelectedAction] = useState<Empresa | null>(null);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loadingContatos, setLoadingContatos] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://backend-crm-production-157b.up.railway.app/empresas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setEmpresas(await res.json());
    } catch {}
    setLoading(false);
  };

  const fetchContatos = async (empresaId: string) => {
    setLoadingContatos(true);
    setContatos([]);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://backend-crm-production-157b.up.railway.app/contatos/${empresaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setContatos(await res.json());
    } catch {}
    setLoadingContatos(false);
  };

  const handleSelectAction = (emp: Empresa) => {
    if (selectedAction?.empresa_id === emp.empresa_id) {
      setSelectedAction(null);
      setContatos([]);
    } else {
      setSelectedAction(emp);
      fetchContatos(emp.empresa_id);
    }
  };

  const total     = empresas.length;
  const leads     = empresas.filter(e => e.status === "Lead").length;
  const emContato = empresas.filter(e => e.status === "Em contato").length;
  const propostas = empresas.filter(e => e.status === "Proposta").length;
  const fechados  = empresas.filter(e => e.status === "Fechado").length;
  const quentes   = empresas.filter(e => e.temperatura === "Quente").length;
  const ticketMedio = total > 0 ? Math.round(empresas.reduce((a,e) => a+(e.ticket_medio_estimado||0),0)/total) : 0;
  const conversao = total > 0 ? ((fechados/total)*100).toFixed(1) : "0.0";

  const metricCards = [
    { key:"total"      as FilterKey, icon:Building2,     label:"Total",       value:total,     color:"#2980b9", bg:"rgba(41,128,185,0.1)"  },
    { key:"lead"       as FilterKey, icon:Users,         label:"Leads",       value:leads,     color:"#95a5a6", bg:"rgba(149,165,166,0.1)" },
    { key:"em_contato" as FilterKey, icon:MessageCircle, label:"Em contato",  value:emContato, color:"#e67e22", bg:"rgba(230,126,34,0.1)"  },
    { key:"proposta"   as FilterKey, icon:Send,          label:"Propostas",   value:propostas, color:"#8e44ad", bg:"rgba(142,68,173,0.1)"  },
    { key:"fechado"    as FilterKey, icon:Handshake,     label:"Fechados",    value:fechados,  color:"#27ae60", bg:"rgba(39,174,96,0.1)"   },
    { key:"quente"     as FilterKey, icon:Flame,         label:"Quentes 🔥",  value:quentes,   color:"#c0392b", bg:"rgba(192,57,43,0.1)"   },
  ];

  const filterMap: Record<FilterKey, Empresa[]> = {
    total:      empresas,
    lead:       empresas.filter(e => e.status==="Lead"),
    em_contato: empresas.filter(e => e.status==="Em contato"),
    proposta:   empresas.filter(e => e.status==="Proposta"),
    fechado:    empresas.filter(e => e.status==="Fechado"),
    quente:     empresas.filter(e => e.temperatura==="Quente"),
  };

  const filterLabels: Record<FilterKey, string> = {
    total:"Todas as empresas", lead:"Leads", em_contato:"Em contato",
    proposta:"Propostas enviadas", fechado:"Clientes fechados", quente:"Leads quentes 🔥",
  };

  const previewList = filterMap[activeFilter];
  const activeCard = metricCards.find(m => m.key === activeFilter)!;
  const proximasAcoes = empresas.filter(e => e.proxima_acao).slice(0,4);

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", position:"relative" }}>
      <style>{css}</style>

      {/* Background */}
      <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(145deg,#c8e8f5 0%,#d6eef5 30%,#cceee8 65%,#c5eae0 100%)" }} />
        <div style={{ position:"absolute", inset:0, opacity:0.4, backgroundImage:"radial-gradient(circle,rgba(41,128,185,0.2) 1px,transparent 1px)", backgroundSize:"22px 22px" }} />
        {[
          { w:420,h:420, top:"-80px", left:"10%",  anim:"float1 18s ease-in-out infinite", op:0.1,  c1:"#2980b9",c2:"#1abc9c" },
          { w:280,h:280, top:"40%",   left:"-60px", anim:"float2 22s ease-in-out infinite", op:0.08, c1:"#1abc9c",c2:"#2ecc71" },
          { w:360,h:360, top:"60%",   left:"55%",   anim:"float3 26s ease-in-out infinite", op:0.07, c1:"#2980b9",c2:"#8e44ad" },
          { w:200,h:200, top:"20%",   left:"75%",   anim:"float4 20s ease-in-out infinite", op:0.09, c1:"#27ae60",c2:"#1abc9c" },
          { w:300,h:300, top:"75%",   left:"20%",   anim:"float5 24s ease-in-out infinite", op:0.07, c1:"#e67e22",c2:"#f39c12" },
        ].map((c,i) => (
          <div key={i} style={{ position:"absolute", width:c.w, height:c.h, top:c.top, left:c.left, borderRadius:"50%", background:`radial-gradient(circle at 40% 40%,${c.c1},${c.c2})`, opacity:c.op, animation:c.anim, filter:"blur(2px)" }} />
        ))}
      </div>

      {/* Sidebar */}
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
            <div key={item.label} className={`nav-item${item.active?" active":""}`} onClick={() => {
              if (item.label === "Todos os clientes") navigate("/clientes");
              if (item.label === "Cadastrar Empresas") navigate("/empresas/nova");
            }}>
              <item.icon style={{ width:16, height:16 }} />
              {item.label}
            </div>
          ))}
        </nav>
        <div style={{ marginTop:16, padding:"12px", borderRadius:12, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
          <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#2980b9,#1abc9c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>KS</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>Kauê Silva</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)" }}>Administrador</div>
          </div>
          <ChevronDown style={{ width:13, height:13, color:"rgba(255,255,255,0.4)" }} />
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, height:"100vh", overflowY:"auto", position:"relative", zIndex:5 }}>

        {/* Topbar */}
        <div style={{ position:"sticky", top:0, zIndex:20, padding:"14px 28px", background:"rgba(210,238,248,0.75)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.6)", display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:18, fontWeight:800, color:"#0f2133", letterSpacing:"-0.02em" }}>Dashboard</h1>
            <p style={{ fontSize:12, color:"rgba(20,45,70,0.5)", marginTop:1 }}>Bem-vindo de volta, Kauê! 👋</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.75)", border:"1px solid rgba(200,225,240,0.9)", borderRadius:10, padding:"0 14px", height:38, width:260 }}>
            <Search style={{ width:14, height:14, color:"rgba(20,45,70,0.35)", flexShrink:0 }} />
            <input value={searchValue} onChange={e => setSearchValue(e.target.value)} placeholder="Buscar leads, empresas..." style={{ flex:1, border:"none", background:"transparent", fontSize:13, color:"#1a2e40", outline:"none" }} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={fetchData} style={{ width:38, height:38, borderRadius:10, border:"1px solid rgba(200,225,240,0.9)", background:"rgba(255,255,255,0.75)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <RefreshCw style={{ width:15, height:15, color:"#2980b9" }} />
            </button>
            <button style={{ width:38, height:38, borderRadius:10, border:"1px solid rgba(200,225,240,0.9)", background:"rgba(255,255,255,0.75)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Bell style={{ width:16, height:16, color:"#2980b9" }} />
            </button>
            <button onClick={() => navigate("/empresas/nova")} style={{ height:38, padding:"0 14px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2980b9,#1abc9c,#2ecc71,#2980b9)", backgroundSize:"200% 200%", animation:"gradientShift 4s ease infinite", color:"#fff", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:6, boxShadow:"0 4px 14px rgba(41,128,185,0.35)" }}>
              <Plus style={{ width:15, height:15 }} /> Novo
            </button>
          </div>
        </div>

        <div style={{ padding:"22px 28px 32px", display:"flex", flexDirection:"column", gap:18 }}>

          {/* Metric cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:12 }}>
            {metricCards.map((m, i) => (
              <motion.div
                key={m.key}
                className="metric-card"
                style={{ borderColor: activeFilter===m.key ? m.color : undefined, boxShadow: activeFilter===m.key ? `0 0 0 3px ${m.color}22` : undefined }}
                initial={{ opacity:0, y:14 }}
                animate={{ opacity:1, y:0 }}
                transition={{ duration:0.35, delay:i*0.05 }}
                onClick={() => setActiveFilter(m.key)}
              >
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:m.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <m.icon style={{ width:15, height:15, color:m.color }} />
                  </div>
                  {activeFilter===m.key && <div style={{ width:8, height:8, borderRadius:"50%", background:m.color }} />}
                </div>
                {loading ? <div className="skeleton" style={{ height:24, width:"50%", marginBottom:4 }} /> : (
                  <div style={{ fontSize:24, fontWeight:900, color:"#0f2133", letterSpacing:"-0.03em" }}>{m.value}</div>
                )}
                <div style={{ fontSize:10, color:"rgba(20,45,70,0.5)", fontWeight:600, marginTop:2 }}>{m.label}</div>
                <div style={{ marginTop:8 }}><Sparkline color={m.color} /></div>
              </motion.div>
            ))}
          </div>

          {/* Painel preview central */}
          <motion.div className="glass-card" style={{ overflow:"hidden" }} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.3 }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(200,225,240,0.5)", display:"flex", alignItems:"center", justifyContent:"space-between", background:`linear-gradient(90deg,${activeCard.bg},transparent)` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:30, height:30, borderRadius:8, background:activeCard.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <activeCard.icon style={{ width:14, height:14, color:activeCard.color }} />
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#0f2133" }}>{filterLabels[activeFilter]}</div>
                  <div style={{ fontSize:11, color:"rgba(20,45,70,0.45)" }}>{previewList.length} empresa{previewList.length!==1?"s":""}</div>
                </div>
              </div>
              <button onClick={() => navigate("/clientes")} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:8, border:`1px solid ${activeCard.color}40`, background:activeCard.bg, fontSize:11, fontWeight:600, color:activeCard.color, cursor:"pointer" }}>
                Ver no CRM <ArrowRight style={{ width:11, height:11 }} />
              </button>
            </div>

            {loading ? (
              <div style={{ padding:20, display:"flex", flexDirection:"column", gap:10 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:40 }} />)}
              </div>
            ) : previewList.length === 0 ? (
              <div style={{ padding:"40px 20px", textAlign:"center" }}>
                <Building2 style={{ width:32, height:32, color:"rgba(41,128,185,0.25)", margin:"0 auto 10px" }} />
                <p style={{ fontSize:13, fontWeight:600, color:"rgba(20,45,70,0.4)" }}>Nenhuma empresa nesta categoria</p>
                <button onClick={() => navigate("/empresas/nova")} style={{ marginTop:12, padding:"7px 16px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#2980b9,#1abc9c)", color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  + Cadastrar empresa
                </button>
              </div>
            ) : (
              <>
                <div className="preview-th">
                  {["Empresa","Status","Temperatura","Cidade","Ticket"].map(h => (
                    <span key={h} style={{ fontSize:10, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:"rgba(20,45,70,0.45)" }}>{h}</span>
                  ))}
                </div>
                <div style={{ maxHeight:220, overflowY:"auto" }}>
                  <AnimatePresence mode="wait">
                    {previewList.slice(0,10).map((emp, idx) => {
                      const sc = statusColor(emp.status);
                      return (
                        <motion.div key={emp.empresa_id} className="preview-row" initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }} transition={{ duration:0.18, delay:idx*0.03 }} onClick={() => navigate(`/clientes/${emp.empresa_id}`)}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:28, height:28, borderRadius:8, background:avatarColor(emp.nome), display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", flexShrink:0 }}>{initials(emp.nome)}</div>
                            <div>
                              <div style={{ fontSize:12, fontWeight:700, color:"#0f2133" }}>{emp.nome}</div>
                              <div style={{ fontSize:10, color:"rgba(20,45,70,0.4)" }}>{emp.segmento||"—"}</div>
                            </div>
                          </div>
                          <span className="chip" style={{ background:sc.bg, color:sc.text, border:`1px solid ${sc.border}` }}>{emp.status||"—"}</span>
                          <span style={{ fontSize:12, color:tempColor(emp.temperatura) }}>{tempIcon(emp.temperatura)} {emp.temperatura||"—"}</span>
                          <span style={{ fontSize:11, color:"rgba(20,45,70,0.6)" }}>{emp.cidade||"—"}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:"#0f2133" }}>{emp.ticket_medio_estimado ? `R$ ${emp.ticket_medio_estimado.toLocaleString("pt-BR")}` : "—"}</span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.div>

          {/* Bottom row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>

            {/* Próximas Ações com contatos */}
            <motion.div className="glass-card" style={{ padding:"18px" }} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.45 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#0f2133" }}>Próximas Ações</div>
                <button onClick={() => navigate("/clientes")} style={{ display:"flex", alignItems:"center", gap:3, fontSize:10, fontWeight:600, color:"#2980b9", background:"none", border:"none", cursor:"pointer" }}>
                  Ver todas <ArrowRight style={{ width:10, height:10 }} />
                </button>
              </div>

              {loading ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:52 }} />)}
                </div>
              ) : proximasAcoes.length === 0 ? (
                <div style={{ textAlign:"center", padding:"16px 0", color:"rgba(20,45,70,0.4)", fontSize:12 }}>Nenhuma ação pendente</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {proximasAcoes.map(emp => {
                    const isSelected = selectedAction?.empresa_id === emp.empresa_id;
                    const sc = statusColor(emp.status);
                    return (
                      <div key={emp.empresa_id}>
                        <div className="action-item" onClick={() => handleSelectAction(emp)}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:32, height:32, borderRadius:9, background:avatarColor(emp.nome), display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>{initials(emp.nome)}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12, fontWeight:700, color:"#0f2133", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{emp.nome}</div>
                              <div style={{ fontSize:10, color:"rgba(20,45,70,0.5)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{emp.proxima_acao}</div>
                            </div>
                            <ChevronRight style={{ width:12, height:12, color:"rgba(20,45,70,0.3)", flexShrink:0, transform:isSelected?"rotate(90deg)":"rotate(0deg)", transition:"transform 0.2s" }} />
                          </div>
                        </div>

                        <AnimatePresence>
                          {isSelected && (
                            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} transition={{ duration:0.22 }} style={{ overflow:"hidden" }}>
                              <div style={{ margin:"6px 0 2px", padding:"14px", borderRadius:12, background:"rgba(255,255,255,0.9)", border:"1px solid rgba(200,225,240,0.8)", boxShadow:"0 4px 16px rgba(41,128,185,0.08)" }}>

                                {/* Header empresa */}
                                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                    <div style={{ width:34, height:34, borderRadius:10, background:avatarColor(emp.nome), display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff" }}>{initials(emp.nome)}</div>
                                    <div>
                                      <div style={{ fontSize:13, fontWeight:800, color:"#0f2133" }}>{emp.nome}</div>
                                      <div style={{ display:"flex", gap:5, marginTop:2 }}>
                                        <span className="chip" style={{ background:sc.bg, color:sc.text, border:`1px solid ${sc.border}` }}>{emp.status}</span>
                                        <span style={{ fontSize:10, color:tempColor(emp.temperatura), fontWeight:700 }}>{tempIcon(emp.temperatura)} {emp.temperatura}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <button onClick={e => { e.stopPropagation(); setSelectedAction(null); setContatos([]); }} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(20,45,70,0.3)" }}>
                                    <X style={{ width:14, height:14 }} />
                                  </button>
                                </div>

                                {/* Infos empresa */}
                                <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:10 }}>
                                  {emp.responsavel_principal && (
                                    <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
                                      <User style={{ width:11, height:11, color:"#2980b9", flexShrink:0 }} />
                                      <span style={{ color:"rgba(20,45,70,0.5)" }}>Responsável:</span>
                                      <span style={{ fontWeight:600, color:"#0f2133" }}>{emp.responsavel_principal}</span>
                                    </div>
                                  )}
                                  {emp.cidade && (
                                    <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
                                      <MapPin style={{ width:11, height:11, color:"#2980b9", flexShrink:0 }} />
                                      <span style={{ color:"rgba(20,45,70,0.5)" }}>Cidade:</span>
                                      <span style={{ fontWeight:600, color:"#0f2133" }}>{emp.cidade}</span>
                                    </div>
                                  )}
                                  {emp.ticket_medio_estimado && (
                                    <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
                                      <TrendingUp style={{ width:11, height:11, color:"#27ae60", flexShrink:0 }} />
                                      <span style={{ color:"rgba(20,45,70,0.5)" }}>Ticket:</span>
                                      <span style={{ fontWeight:700, color:"#27ae60" }}>R$ {emp.ticket_medio_estimado.toLocaleString("pt-BR")}</span>
                                    </div>
                                  )}
                                  <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, padding:"5px 8px", borderRadius:7, background:"rgba(230,126,34,0.07)", border:"1px solid rgba(230,126,34,0.15)" }}>
                                    <Calendar style={{ width:11, height:11, color:"#e67e22", flexShrink:0 }} />
                                    <span style={{ color:"rgba(20,45,70,0.5)" }}>Próxima ação:</span>
                                    <span style={{ fontWeight:600, color:"#e67e22" }}>{emp.proxima_acao}</span>
                                  </div>
                                </div>

                                {/* Contatos */}
                                <div style={{ borderTop:"1px solid rgba(200,225,240,0.5)", paddingTop:10 }}>
                                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"rgba(20,45,70,0.45)", marginBottom:8 }}>
                                    Contatos da empresa
                                  </div>

                                  {loadingContatos ? (
                                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                                      {[1,2].map(i => <div key={i} className="skeleton" style={{ height:36 }} />)}
                                    </div>
                                  ) : contatos.length === 0 ? (
                                    <div style={{ fontSize:11, color:"rgba(20,45,70,0.4)", padding:"8px 0", textAlign:"center" }}>
                                      Nenhum contato cadastrado
                                    </div>
                                  ) : (
                                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                                      {contatos.map(c => (
                                        <div key={c.contato_id} style={{ padding:"8px 10px", borderRadius:8, background:"rgba(41,128,185,0.04)", border:"1px solid rgba(41,128,185,0.1)" }}>
                                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                                            <div>
                                              <span style={{ fontSize:12, fontWeight:700, color:"#0f2133" }}>{c.nome}</span>
                                              {c.funcao && <span style={{ fontSize:10, color:"rgba(20,45,70,0.45)", marginLeft:6 }}>{c.funcao}</span>}
                                              {c.decisor && <span style={{ fontSize:9, fontWeight:700, color:"#8e44ad", background:"rgba(142,68,173,0.1)", padding:"1px 5px", borderRadius:4, marginLeft:5 }}>Decisor</span>}
                                            </div>
                                          </div>
                                          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                                            {(c.celular || c.whatsapp) && (
                                              <a href={`tel:${c.celular || c.whatsapp}`} onClick={e => e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#27ae60", fontWeight:600, textDecoration:"none" }}>
                                                <Phone style={{ width:11, height:11 }} />
                                                {c.celular || c.whatsapp}
                                              </a>
                                            )}
                                            {c.email && (
                                              <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#2980b9", fontWeight:600, textDecoration:"none" }}>
                                                <Mail style={{ width:11, height:11 }} />
                                                {c.email}
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <button onClick={() => navigate(`/clientes/${emp.empresa_id}`)} style={{ marginTop:10, width:"100%", height:32, borderRadius:8, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2980b9,#1abc9c)", color:"#fff", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                                  <Eye style={{ width:12, height:12 }} /> Ver perfil completo
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Por temperatura */}
            <motion.div className="glass-card" style={{ padding:"18px" }} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.5 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#0f2133", marginBottom:14 }}>Por Temperatura</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { label:"Quente 🔥", value:empresas.filter(e=>e.temperatura==="Quente").length, color:"#c0392b", bg:"rgba(192,57,43,0.07)", key:"quente" as FilterKey },
                  { label:"Morno 🌡️",  value:empresas.filter(e=>e.temperatura==="Morno").length,  color:"#d68910", bg:"rgba(214,137,16,0.07)", key:"total" as FilterKey },
                  { label:"Frio ❄️",   value:empresas.filter(e=>e.temperatura==="Frio").length,   color:"#2980b9", bg:"rgba(41,128,185,0.07)", key:"total" as FilterKey },
                ].map(t => (
                  <div key={t.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, background:t.bg, border:`1px solid ${t.color}20`, cursor:"pointer" }} onClick={() => setActiveFilter(t.key)}>
                    <div style={{ flex:1, fontSize:12, fontWeight:600, color:"#0f2133" }}>{t.label}</div>
                    <span style={{ fontSize:18, fontWeight:900, color:t.color }}>{t.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12, padding:"12px 14px", borderRadius:12, background:"rgba(41,128,185,0.06)", border:"1px solid rgba(41,128,185,0.12)" }}>
                <div style={{ fontSize:10, color:"rgba(20,45,70,0.5)", fontWeight:600, marginBottom:4 }}>TAXA DE CONVERSÃO</div>
                <div style={{ fontSize:22, fontWeight:900, color:"#2980b9" }}>{conversao}%</div>
                <div style={{ height:5, borderRadius:5, background:"rgba(41,128,185,0.12)", marginTop:6 }}>
                  <div style={{ height:"100%", width:`${Math.min(parseFloat(conversao)*5,100)}%`, borderRadius:5, background:"linear-gradient(90deg,#2980b9,#1abc9c)" }} />
                </div>
                <div style={{ fontSize:10, color:"rgba(20,45,70,0.35)", marginTop:3 }}>Meta: 20%</div>
              </div>
              <div style={{ marginTop:10, padding:"12px 14px", borderRadius:12, background:"rgba(39,174,96,0.06)", border:"1px solid rgba(39,174,96,0.15)" }}>
                <div style={{ fontSize:10, color:"rgba(20,45,70,0.5)", fontWeight:600, marginBottom:4 }}>TICKET MÉDIO</div>
                <div style={{ fontSize:18, fontWeight:900, color:"#27ae60" }}>R$ {ticketMedio.toLocaleString("pt-BR")}</div>
              </div>
            </motion.div>

            {/* Funil */}
            <motion.div className="glass-card" style={{ padding:"18px" }} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.55 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#0f2133", marginBottom:14 }}>Funil de Prospecção</div>
              {([
                { label:"Total",      value:total,     color:"#2980b9", key:"total"      as FilterKey },
                { label:"Em contato", value:emContato, color:"#1abc9c", key:"em_contato" as FilterKey },
                { label:"Proposta",   value:propostas, color:"#8e44ad", key:"proposta"   as FilterKey },
                { label:"Fechado",    value:fechados,  color:"#27ae60", key:"fechado"    as FilterKey },
              ] as {label:string;value:number;color:string;key:FilterKey}[]).map(f => (
                <div key={f.label} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, cursor:"pointer" }} onClick={() => setActiveFilter(f.key)}>
                  <div style={{ flex:1, position:"relative", height:34 }}>
                    <div style={{ position:"absolute", inset:0, borderRadius:6, background:`${f.color}15` }} />
                    <div style={{ position:"absolute", top:0, left:0, bottom:0, width:`${total>0?Math.max((f.value/total)*100,f.value>0?8:0):0}%`, borderRadius:6, background:f.color, transition:"width 0.6s ease" }} />
                    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", padding:"0 10px" }}>
                      <span style={{ fontSize:11, fontWeight:600, color:"#0f2133", whiteSpace:"nowrap" }}>{f.label}</span>
                    </div>
                  </div>
                  <span style={{ fontSize:13, fontWeight:800, color:f.color, minWidth:24, textAlign:"right" }}>{f.value}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}