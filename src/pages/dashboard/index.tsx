import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Building2, MessageCircle, MapPin, Send, Handshake,
  LayoutDashboard, Search, Bell, Calendar, Plus,
  TrendingUp, TrendingDown, ChevronDown,
  ClipboardList, BarChart3,
  Phone, Eye, ArrowRight, RefreshCw,
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
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:rgba(255,255,255,0.65); transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(255,255,255,0.08); color:#fff; }
  .nav-item.active { background:rgba(255,255,255,0.14); color:#fff; font-weight:600; }
  .metric-card { background:rgba(255,255,255,0.72); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.9); border-radius:16px; padding:20px 18px; transition:transform 0.2s, box-shadow 0.2s; cursor:default; }
  .metric-card:hover { transform:translateY(-3px); box-shadow:0 12px 36px rgba(41,128,185,0.18); }
  .glass-card { background:rgba(255,255,255,0.72); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.9); border-radius:16px; }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(41,128,185,0.25); border-radius:4px; }
  .skeleton { background:linear-gradient(90deg,rgba(200,225,240,0.4) 25%,rgba(220,240,252,0.7) 50%,rgba(200,225,240,0.4) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
  @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
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

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",               active: true  },
  { icon: Search,          label: "Buscar Empresas",          active: false },
  { icon: Building2,       label: "Cadastrar Empresas",       active: false },
  { icon: Users,           label: "Todos os clientes",        active: false },
  { icon: ClipboardList,   label: "Gerenciamento de clientes",active: false },
  { icon: Calendar,        label: "Calendário",               active: false },
];

function avatarColor(name: string) {
  const colors = ["#2980b9","#1abc9c","#8e44ad","#e67e22","#27ae60","#e74c3c"];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

function initials(name: string) {
  return name?.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase() || "?";
}

function statusTagColor(s: string) {
  if (s === "Fechado")    return { color:"#1e8449", bg:"rgba(39,174,96,0.12)"   };
  if (s === "Proposta")   return { color:"#7d3c98", bg:"rgba(142,68,173,0.12)" };
  if (s === "Em contato") return { color:"#1a5276", bg:"rgba(41,128,185,0.12)" };
  return                         { color:"#566573", bg:"rgba(149,165,166,0.15)"};
}

function Sparkline({ up }: { up: boolean }) {
  const color = up ? "#27ae60" : "#e74c3c";
  const points = up
    ? "0,18 8,14 16,16 24,10 32,12 40,6 48,8 56,4 64,2"
    : "0,4 8,6 16,4 24,10 32,8 40,14 48,12 56,16 64,18";
  return (
    <svg width="64" height="20" viewBox="0 0 64 20" fill="none">
      <polyline points={points} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

function BarChartViz({ empresas }: { empresas: Empresa[] }) {
  const statuses = ["Lead","Em contato","Proposta","Fechado"];
  const counts = statuses.map(s => empresas.filter(e => e.status === s).length);
  const max = Math.max(...counts, 1);
  const colors = ["#95a5a6","#2980b9","#8e44ad","#27ae60"];
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:12, height:80, padding:"0 4px" }}>
      {statuses.map((s, i) => (
        <div key={s} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ fontSize:11, fontWeight:700, color:colors[i] }}>{counts[i]}</div>
          <div style={{ width:"100%", height:`${Math.max((counts[i]/max)*70, 4)}px`, borderRadius:"4px 4px 0 0", background:colors[i], opacity:0.8 }} />
          <div style={{ fontSize:9, color:"rgba(20,45,70,0.4)", textAlign:"center", lineHeight:1.2 }}>{s}</div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
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
      const data = await res.json();
      setEmpresas(data);
    } catch {}
    setLoading(false);
  };

  // Métricas calculadas
  const total = empresas.length;
  const emContato = empresas.filter(e => e.status === "Em contato").length;
  const propostas = empresas.filter(e => e.status === "Proposta").length;
  const fechados = empresas.filter(e => e.status === "Fechado").length;
  const leads = empresas.filter(e => e.status === "Lead").length;
  const quentes = empresas.filter(e => e.temperatura === "Quente").length;
  const ticketTotal = empresas.reduce((acc, e) => acc + (e.ticket_medio_estimado || 0), 0);
  const conversao = total > 0 ? ((fechados / total) * 100).toFixed(1) : "0.0";

  const metrics = [
    { icon: Building2,     label: "Total de empresas",   value: total,      up: true,  color:"#2980b9", bg:"rgba(41,128,185,0.1)"  },
    { icon: Users,         label: "Leads",               value: leads,      up: true,  color:"#95a5a6", bg:"rgba(149,165,166,0.1)" },
    { icon: MessageCircle, label: "Em contato",          value: emContato,  up: true,  color:"#e67e22", bg:"rgba(230,126,34,0.1)"  },
    { icon: Send,          label: "Propostas",           value: propostas,  up: true,  color:"#8e44ad", bg:"rgba(142,68,173,0.1)"  },
    { icon: Handshake,     label: "Fechados",            value: fechados,   up: true,  color:"#27ae60", bg:"rgba(39,174,96,0.1)"   },
    { icon: MapPin,        label: "Leads quentes 🔥",   value: quentes,    up: true,  color:"#c0392b", bg:"rgba(192,57,43,0.1)"   },
  ];

  const funnelData = [
    { label:"Total",         value:total,     pct:100,                                    color:"#2980b9" },
    { label:"Em contato",    value:emContato, pct:total>0?Math.round((emContato/total)*100):0, color:"#1abc9c" },
    { label:"Em negociação", value:propostas, pct:total>0?Math.round((propostas/total)*100):0, color:"#e67e22" },
    { label:"Proposta",      value:propostas, pct:total>0?Math.round((propostas/total)*100):0, color:"#8e44ad" },
    { label:"Fechado",       value:fechados,  pct:total>0?Math.round((fechados/total)*100):0,  color:"#27ae60" },
  ];

  const destaques = [...empresas]
    .sort((a, b) => {
      const order: Record<string, number> = { Quente:0, Morno:1, Frio:2 };
      return (order[a.temperatura] ?? 3) - (order[b.temperatura] ?? 3);
    })
    .slice(0, 3);

  const comProximaAcao = empresas
    .filter(e => e.proxima_acao)
    .slice(0, 3);

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", position:"relative" }}>
      <style>{css}</style>

      {/* Background */}
      <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(145deg,#c8e8f5 0%,#d6eef5 30%,#cceee8 65%,#c5eae0 100%)" }} />
        <div style={{ position:"absolute", inset:0, opacity:0.4, backgroundImage:"radial-gradient(circle,rgba(41,128,185,0.2) 1px,transparent 1px)", backgroundSize:"22px 22px" }} />
        {[
          { w:420,h:420, top:"-80px",  left:"10%",  anim:"float1 18s ease-in-out infinite",    op:0.12, c1:"#2980b9",c2:"#1abc9c" },
          { w:280,h:280, top:"40%",    left:"-60px", anim:"float2 22s ease-in-out infinite",    op:0.1,  c1:"#1abc9c",c2:"#2ecc71" },
          { w:360,h:360, top:"60%",    left:"55%",   anim:"float3 26s ease-in-out infinite",    op:0.09, c1:"#2980b9",c2:"#8e44ad" },
          { w:200,h:200, top:"20%",    left:"75%",   anim:"float4 20s ease-in-out infinite",    op:0.11, c1:"#27ae60",c2:"#1abc9c" },
          { w:300,h:300, top:"75%",    left:"20%",   anim:"float5 24s ease-in-out infinite",    op:0.08, c1:"#e67e22",c2:"#f39c12" },
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
            <div style={{ fontSize:12, fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Kauê Silva</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)" }}>Administrador</div>
          </div>
          <ChevronDown style={{ width:13, height:13, color:"rgba(255,255,255,0.4)", flexShrink:0 }} />
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, height:"100vh", overflowY:"auto", position:"relative", zIndex:5 }}>

        {/* Top bar */}
        <div style={{ position:"sticky", top:0, zIndex:20, padding:"14px 28px", background:"rgba(210,238,248,0.75)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.6)", display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:18, fontWeight:800, color:"#0f2133", letterSpacing:"-0.02em" }}>Dashboard</h1>
            <p style={{ fontSize:12, color:"rgba(20,45,70,0.5)", marginTop:1 }}>Bem-vindo de volta, Kauê! 👋</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.75)", border:"1px solid rgba(200,225,240,0.9)", borderRadius:10, padding:"0 14px", height:38, width:260 }}>
            <Search style={{ width:14, height:14, color:"rgba(20,45,70,0.35)", flexShrink:0 }} />
            <input value={searchValue} onChange={e => setSearchValue(e.target.value)} placeholder="Buscar leads, empresas..." style={{ flex:1, border:"none", background:"transparent", fontSize:13, color:"#1a2e40", outline:"none" }} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={fetchData} style={{ width:38, height:38, borderRadius:10, border:"1px solid rgba(200,225,240,0.9)", background:"rgba(255,255,255,0.75)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <RefreshCw style={{ width:15, height:15, color:"#2980b9" }} />
            </button>
            <button style={{ width:38, height:38, borderRadius:10, border:"1px solid rgba(200,225,240,0.9)", background:"rgba(255,255,255,0.75)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
              <Bell style={{ width:16, height:16, color:"#2980b9" }} />
            </button>
            <button onClick={() => navigate("/empresas/nova")} style={{ height:38, padding:"0 14px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2980b9,#1abc9c,#2ecc71,#2980b9)", backgroundSize:"200% 200%", animation:"gradientShift 4s ease infinite", color:"#fff", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:6, boxShadow:"0 4px 14px rgba(41,128,185,0.35)" }}>
              <Plus style={{ width:15, height:15 }} /> Novo
            </button>
          </div>
        </div>

        <div style={{ padding:"24px 28px 32px" }}>

          {/* Métricas */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:14, marginBottom:22 }}>
            {metrics.map((m, i) => (
              <motion.div key={m.label} className="metric-card" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.38, delay:i*0.06 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:m.bg, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                  <m.icon style={{ width:17, height:17, color:m.color }} />
                </div>
                {loading ? (
                  <div className="skeleton" style={{ height:28, width:"60%", marginBottom:6 }} />
                ) : (
                  <div style={{ fontSize:26, fontWeight:900, color:"#0f2133", letterSpacing:"-0.03em", lineHeight:1 }}>{m.value}</div>
                )}
                <div style={{ fontSize:11, color:"rgba(20,45,70,0.55)", fontWeight:500, marginTop:4, lineHeight:1.3 }}>{m.label}</div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:10 }}>
                  <span style={{ display:"flex", alignItems:"center", gap:2, fontSize:10, fontWeight:600, color:m.up?"#27ae60":"#e74c3c" }}>
                    {m.up ? <TrendingUp style={{ width:10, height:10 }} /> : <TrendingDown style={{ width:10, height:10 }} />}
                    {m.up ? "+" : "-"}
                  </span>
                  <Sparkline up={m.up} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Middle row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:16, marginBottom:16 }}>

            {/* Chart */}
            <motion.div className="glass-card" style={{ padding:"22px 24px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.42, delay:0.38 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#0f2133" }}>Distribuição por Status</div>
                  <div style={{ fontSize:11, color:"rgba(20,45,70,0.45)", marginTop:2 }}>Empresas cadastradas</div>
                </div>
                <button onClick={() => navigate("/clientes")} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, border:"1px solid rgba(200,225,240,0.9)", background:"rgba(255,255,255,0.7)", fontSize:11, fontWeight:600, color:"rgba(20,45,70,0.6)", cursor:"pointer" }}>
                  Ver todas <ArrowRight style={{ width:11, height:11 }} />
                </button>
              </div>
              {loading ? (
                <div className="skeleton" style={{ height:80 }} />
              ) : (
                <BarChartViz empresas={empresas} />
              )}
              <div style={{ display:"flex", alignItems:"center", gap:16, marginTop:16, paddingTop:14, borderTop:"1px solid rgba(200,225,240,0.5)", flexWrap:"wrap" }}>
                {[
                  { label:"Ticket total estimado", value:`R$ ${ticketTotal.toLocaleString("pt-BR")}`, color:"#2980b9" },
                  { label:"Taxa de conversão", value:`${conversao}%`, color:"#27ae60" },
                  { label:"Leads quentes", value:`${quentes} 🔥`, color:"#c0392b" },
                ].map(s => (
                  <div key={s.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ fontSize:13, fontWeight:800, color:s.color }}>{s.value}</span>
                    <span style={{ fontSize:10, color:"rgba(20,45,70,0.45)" }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Funil */}
            <motion.div className="glass-card" style={{ padding:"22px 20px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.42, delay:0.44 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#0f2133", marginBottom:18 }}>Funil de Prospecção</div>
              {funnelData.map(f => (
                <div key={f.label} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ flex:1, position:"relative", height:38 }}>
                    <div style={{ position:"absolute", inset:0, borderRadius:6, background:`${f.color}18` }} />
                    <div style={{ position:"absolute", top:0, left:0, bottom:0, width:`${Math.max(f.pct, 4)}%`, borderRadius:6, background:f.color, transition:"width 0.6s ease" }} />
                    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", padding:"0 10px", overflow:"hidden" }}>
                      <span style={{ fontSize:12, fontWeight:600, color:"#0f2133", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{f.label}</span>
                    </div>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:"#0f2133", minWidth:28, textAlign:"right" }}>{f.value}</span>
                </div>
              ))}
              <div style={{ marginTop:18, paddingTop:14, borderTop:"1px solid rgba(200,225,240,0.5)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:"rgba(20,45,70,0.65)" }}>Taxa de Conversão</span>
                  <span style={{ fontSize:13, fontWeight:800, color:"#2980b9" }}>{conversao}%</span>
                </div>
                <div style={{ height:6, borderRadius:6, background:"rgba(41,128,185,0.12)" }}>
                  <div style={{ height:"100%", width:`${Math.min(parseFloat(conversao)*5, 100)}%`, borderRadius:6, background:"linear-gradient(90deg,#2980b9,#1abc9c)" }} />
                </div>
                <div style={{ fontSize:10, color:"rgba(20,45,70,0.4)", marginTop:4 }}>Meta: 20%</div>
              </div>
            </motion.div>
          </div>

          {/* Bottom row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>

            {/* Próximas ações */}
            <motion.div className="glass-card" style={{ padding:"20px 20px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.42, delay:0.5 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#0f2133" }}>Próximas Ações</div>
                <button onClick={() => navigate("/clientes")} style={{ display:"flex", alignItems:"center", gap:3, fontSize:10, fontWeight:600, color:"#2980b9", background:"none", border:"none", cursor:"pointer" }}>
                  Ver todas <ArrowRight style={{ width:10, height:10 }} />
                </button>
              </div>
              {loading ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:52 }} />)}
                </div>
              ) : comProximaAcao.length === 0 ? (
                <div style={{ textAlign:"center", padding:"20px 0", color:"rgba(20,45,70,0.4)", fontSize:12 }}>Nenhuma ação pendente</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {comProximaAcao.map(e => (
                    <div key={e.empresa_id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:"rgba(255,255,255,0.55)", border:"1px solid rgba(200,225,240,0.6)", cursor:"pointer" }} onClick={() => navigate(`/clientes/${e.empresa_id}`)}>
                      <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, background:"rgba(41,128,185,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Phone style={{ width:14, height:14, color:"#2980b9" }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"#0f2133", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.nome}</div>
                        <div style={{ fontSize:10, color:"rgba(20,45,70,0.45)", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.proxima_acao}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Por temperatura */}
            <motion.div className="glass-card" style={{ padding:"20px 20px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.42, delay:0.56 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#0f2133" }}>Por Temperatura</div>
              </div>
              {loading ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:44 }} />)}
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[
                    { label:"Quente 🔥", value:empresas.filter(e=>e.temperatura==="Quente").length, color:"#c0392b", bg:"rgba(192,57,43,0.1)" },
                    { label:"Morno 🌡️",  value:empresas.filter(e=>e.temperatura==="Morno").length,  color:"#d68910", bg:"rgba(214,137,16,0.1)" },
                    { label:"Frio ❄️",   value:empresas.filter(e=>e.temperatura==="Frio").length,   color:"#2980b9", bg:"rgba(41,128,185,0.1)" },
                  ].map(t => (
                    <div key={t.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:"rgba(255,255,255,0.55)", border:"1px solid rgba(200,225,240,0.6)" }}>
                      <div style={{ flex:1, fontSize:12, fontWeight:600, color:"#0f2133" }}>{t.label}</div>
                      <span style={{ fontSize:16, fontWeight:800, color:t.color }}>{t.value}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:4, padding:"10px 12px", borderRadius:10, background:"rgba(41,128,185,0.06)", border:"1px solid rgba(41,128,185,0.12)" }}>
                    <div style={{ fontSize:10, color:"rgba(20,45,70,0.5)", marginBottom:2 }}>Ticket médio total estimado</div>
                    <div style={{ fontSize:15, fontWeight:800, color:"#2980b9" }}>R$ {total > 0 ? Math.round(ticketTotal/total).toLocaleString("pt-BR") : "0"}</div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Leads em destaque */}
            <motion.div className="glass-card" style={{ padding:"20px 20px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.42, delay:0.62 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#0f2133" }}>Leads em Destaque</div>
                <button onClick={() => navigate("/clientes")} style={{ display:"flex", alignItems:"center", gap:3, fontSize:10, fontWeight:600, color:"#2980b9", background:"none", border:"none", cursor:"pointer" }}>
                  Ver todos <ArrowRight style={{ width:10, height:10 }} />
                </button>
              </div>
              {loading ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:52 }} />)}
                </div>
              ) : destaques.length === 0 ? (
                <div style={{ textAlign:"center", padding:"20px 0", color:"rgba(20,45,70,0.4)", fontSize:12 }}>Nenhuma empresa cadastrada</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {destaques.map(e => {
                    const tc = statusTagColor(e.status);
                    return (
                      <div key={e.empresa_id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, background:"rgba(255,255,255,0.55)", border:"1px solid rgba(200,225,240,0.6)", cursor:"pointer" }} onClick={() => navigate(`/clientes/${e.empresa_id}`)}>
                        <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, background:avatarColor(e.nome), display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>{initials(e.nome)}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"#0f2133", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.nome}</div>
                          <div style={{ fontSize:10, color:"rgba(20,45,70,0.45)", marginTop:1 }}>{e.segmento || e.cidade || "—"}</div>
                        </div>
                        <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:6, background:tc.bg, color:tc.color, border:`1px solid ${tc.color}30`, whiteSpace:"nowrap" }}>{e.status}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}