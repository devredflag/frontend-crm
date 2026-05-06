import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Search, Building2, Users, ClipboardList,
  Calendar, BarChart3, Plus, RefreshCw, Eye,
  ChevronRight, MapPin, TrendingUp, ArrowRight,
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
  .kanban-card { background:rgba(255,255,255,0.88); border:1px solid rgba(200,225,240,0.7); border-radius:14px; padding:16px; cursor:pointer; transition:all 0.2s; position:relative; overflow:hidden; }
  .kanban-card:hover { transform:translateY(-3px); box-shadow:0 12px 32px rgba(41,128,185,0.15); border-color:rgba(41,128,185,0.35); }
  .skeleton { background:linear-gradient(90deg,rgba(200,225,240,0.4) 25%,rgba(220,240,252,0.7) 50%,rgba(200,225,240,0.4) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; }
  .move-btn { padding:4px 9px; border-radius:6px; font-size:9px; font-weight:700; cursor:pointer; border:none; transition:all 0.15s; white-space:nowrap; }
  .move-btn:hover { opacity:0.85; transform:scale(1.03); }
  .list-row { background:rgba(255,255,255,0.78); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.9); border-radius:12px; transition:all 0.18s; }
  .list-row:hover { box-shadow:0 4px 16px rgba(41,128,185,0.1); border-color:rgba(41,128,185,0.25); transform:translateY(-1px); }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(41,128,185,0.25); border-radius:4px; }
`;

const API = "https://backend-crm-production-157b.up.railway.app";

interface Empresa {
  empresa_id: string; nome: string; segmento: string; porte: string;
  cidade: string; status: string; temperatura: string;
  ticket_medio_estimado: number | null; responsavel_principal: string;
  proxima_acao: string; ultima_interacao: string | null; origem_lead: string;
}
interface Usuario { nome: string; cargo: string; }

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",                active: false },
  { icon: Search,          label: "Buscar Empresas",           active: false },
  { icon: Building2,       label: "Cadastrar Empresas",        active: false },
  { icon: Users,           label: "Todos os clientes",         active: false },
  { icon: ClipboardList,   label: "Gerenciamento de clientes", active: true  },
  { icon: Calendar,        label: "Calendário",                active: false },
];

const PIPELINE = [
  { key:"Lead",       label:"Lead",        color:"#64748b", light:"rgba(148,163,184,0.12)", dot:"#94a3b8" },
  { key:"Em contato", label:"Em contato",  color:"#2980b9", light:"rgba(41,128,185,0.1)",   dot:"#60a5fa" },
  { key:"Proposta",   label:"Proposta",    color:"#7c3aed", light:"rgba(124,58,237,0.1)",   dot:"#a78bfa" },
  { key:"Negociação", label:"Negociação",  color:"#d97706", light:"rgba(217,119,6,0.1)",    dot:"#fbbf24" },
  { key:"Fechado",    label:"Fechado",     color:"#16a34a", light:"rgba(22,163,74,0.1)",    dot:"#4ade80" },
];

const TEMPS = [
  { key:"Quente", icon:"🔥", color:"#c0392b", bg:"rgba(192,57,43,0.1)"  },
  { key:"Morno",  icon:"🌡️", color:"#d68910", bg:"rgba(214,137,16,0.1)" },
  { key:"Frio",   icon:"❄️", color:"#2980b9", bg:"rgba(41,128,185,0.1)" },
];

function initials(n: string) { return n?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?"; }
function avatarColor(n: string) { const c=["#2980b9","#1abc9c","#8e44ad","#e67e22","#27ae60","#e74c3c"]; return c[(n?.charCodeAt(0)||0)%c.length]; }
function porteInfo(p: string) {
  if(p==="Grande") return { color:"#7c3aed", bg:"rgba(124,58,237,0.1)" };
  if(p==="Médio")  return { color:"#2980b9", bg:"rgba(41,128,185,0.1)" };
  return { color:"#16a34a", bg:"rgba(22,163,74,0.1)" };
}
function calcScore(e: Empresa) {
  let s=0;
  if(e.temperatura==="Quente")s+=30;else if(e.temperatura==="Morno")s+=18;else s+=5;
  if(e.status==="Fechado")s+=25;else if(e.status==="Proposta"||e.status==="Negociação")s+=20;else if(e.status==="Em contato")s+=14;else s+=5;
  if(e.porte==="Grande")s+=20;else if(e.porte==="Médio")s+=13;else s+=6;
  const t=e.ticket_medio_estimado||0;if(t>=20000)s+=15;else if(t>=5000)s+=10;else if(t>0)s+=5;
  if(e.ultima_interacao){const d=(Date.now()-new Date(e.ultima_interacao).getTime())/86400000;if(d<=7)s+=10;else if(d<=30)s+=6;else s+=2;}
  return Math.min(s,100);
}
function scoreColor(s: number) {
  if(s>=70) return { color:"#16a34a", bg:"rgba(22,163,74,0.12)" };
  if(s>=40) return { color:"#d97706", bg:"rgba(217,119,6,0.12)"  };
  return       { color:"#dc2626", bg:"rgba(220,38,38,0.1)"   };
}

export default function Gerenciamento() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuario, setUsuario] = useState<Usuario|null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTemp, setFilterTemp] = useState("Todas");
  const [view, setView] = useState<"kanban"|"lista">("kanban");
  const [movingId, setMovingId] = useState<string|null>(null);
  const token = localStorage.getItem("token")||"";
  const hdrs = { "Content-Type":"application/json", Authorization:`Bearer ${token}` };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [e,m] = await Promise.all([
        fetch(`${API}/empresas`,{headers:hdrs}),
        fetch(`${API}/me`,{headers:hdrs}),
      ]);
      if(e.ok) setEmpresas(await e.json());
      if(m.ok) setUsuario(await m.json());
    } catch {}
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setMovingId(id);
    setEmpresas(p=>p.map(e=>e.empresa_id===id?{...e,status}:e));
    try { await fetch(`${API}/empresas/${id}`,{method:"PUT",headers:hdrs,body:JSON.stringify({status})}); } catch {}
    setTimeout(()=>setMovingId(null),400);
  };

  const updateTemp = async (id: string, temperatura: string, ev: React.MouseEvent) => {
    ev.stopPropagation();
    setEmpresas(p=>p.map(e=>e.empresa_id===id?{...e,temperatura}:e));
    try { await fetch(`${API}/empresas/${id}`,{method:"PUT",headers:hdrs,body:JSON.stringify({temperatura})}); } catch {}
  };

  const filtered = empresas.filter(e => {
    const q=search.toLowerCase();
    return (!q||e.nome.toLowerCase().includes(q)||e.segmento?.toLowerCase().includes(q)||e.cidade?.toLowerCase().includes(q))
      &&(filterTemp==="Todas"||e.temperatura===filterTemp);
  });

  const byStatus=(s:string)=>filtered.filter(e=>e.status===s);
  const totalTicket=filtered.reduce((a,e)=>a+(e.ticket_medio_estimado||0),0);
  const avgTicket=filtered.length>0?Math.round(totalTicket/filtered.length):0;
  const totalFechado=empresas.filter(e=>e.status==="Fechado").length;
  const conversao=empresas.length>0?((totalFechado/empresas.length)*100).toFixed(1):"0";

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",position:"relative"}}>
      <style>{css}</style>

      {/* Background */}
      <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(145deg,#c8e8f5 0%,#d6eef5 30%,#cceee8 65%,#c5eae0 100%)"}}/>
        <div style={{position:"absolute",inset:0,opacity:0.4,backgroundImage:"radial-gradient(circle,rgba(41,128,185,0.2) 1px,transparent 1px)",backgroundSize:"22px 22px"}}/>
        {[
          {w:420,h:420,top:"-80px",left:"10%",anim:"float1 18s ease-in-out infinite",op:0.1,c1:"#2980b9",c2:"#1abc9c"},
          {w:280,h:280,top:"40%",left:"-60px",anim:"float2 22s ease-in-out infinite",op:0.08,c1:"#1abc9c",c2:"#2ecc71"},
          {w:360,h:360,top:"60%",left:"55%",anim:"float3 26s ease-in-out infinite",op:0.07,c1:"#2980b9",c2:"#8e44ad"},
          {w:200,h:200,top:"20%",left:"75%",anim:"float4 20s ease-in-out infinite",op:0.09,c1:"#27ae60",c2:"#1abc9c"},
          {w:300,h:300,top:"75%",left:"20%",anim:"float5 24s ease-in-out infinite",op:0.07,c1:"#e67e22",c2:"#f39c12"},
        ].map((c,i)=>(
          <div key={i} style={{position:"absolute",width:c.w,height:c.h,top:c.top,left:c.left,borderRadius:"50%",background:`radial-gradient(circle at 40% 40%,${c.c1},${c.c2})`,opacity:c.op,animation:c.anim,filter:"blur(2px)"}}/>
        ))}
      </div>

      {/* Sidebar */}
      <div style={{width:220,flexShrink:0,height:"100vh",overflowY:"auto",position:"relative",zIndex:10,background:"linear-gradient(180deg,#1a3a5c 0%,#0f2a44 60%,#0a1f33 100%)",boxShadow:"4px 0 24px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",padding:"0 12px 20px"}}>
        <div style={{padding:"22px 4px 24px",borderBottom:"1px solid rgba(255,255,255,0.08)",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#2980b9,#1abc9c)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(41,128,185,0.4)"}}>
              <BarChart3 style={{width:18,height:18,color:"#fff"}}/>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>Prospecção</div>
              <div style={{fontSize:11,fontWeight:700,background:"linear-gradient(90deg,#2980b9,#1abc9c,#2ecc71,#2980b9)",backgroundSize:"200% 200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"gradientShift 4s ease infinite"}}>CRM</div>
            </div>
          </div>
        </div>
        <nav style={{flex:1,display:"flex",flexDirection:"column",gap:2}}>
          {navItems.map(item=>(
            <div key={item.label} className={`nav-item${item.active?" active":""}`} onClick={()=>{
              if(item.label==="Dashboards")navigate("/dashboard");
              if(item.label==="Todos os clientes")navigate("/clientes");
              if(item.label==="Cadastrar Empresas")navigate("/empresas/nova");
              if(item.label==="Calendário")navigate("/calendario");
            }}>
              <item.icon style={{width:16,height:16,flexShrink:0}}/>{item.label}
            </div>
          ))}
        </nav>
        <div onClick={()=>navigate("/perfil")} style={{marginTop:16,padding:"12px",borderRadius:12,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",gap:10,cursor:"pointer",transition:"background 0.18s"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.12)")} onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,0.06)")}>
          <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${avatarColor(usuario?.nome||"")},#1abc9c)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(usuario?.nome||"?")}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{usuario?.nome||"..."}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.45)"}}>{usuario?.cargo||"Administrador"}</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,height:"100vh",overflow:"hidden",display:"flex",flexDirection:"column",position:"relative",zIndex:5}}>

        {/* Header */}
        <div style={{padding:"16px 28px",background:"rgba(210,238,248,0.85)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.6)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:14}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(20,45,70,0.45)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3}}>Pipeline</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <h1 style={{fontSize:22,fontWeight:900,color:"#0f2133",letterSpacing:"-0.03em"}}>Pipeline de Vendas</h1>
                <TrendingUp style={{width:18,height:18,color:"#27ae60"}}/>
              </div>
              <p style={{fontSize:12,color:"rgba(20,45,70,0.5)",marginTop:2}}>Acompanhe suas oportunidades e mova os negócios adiante.</p>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={fetchAll} style={{width:38,height:38,borderRadius:10,border:"1px solid rgba(200,225,240,0.9)",background:"rgba(255,255,255,0.75)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <RefreshCw style={{width:15,height:15,color:"#2980b9"}}/>
              </button>
              <div style={{display:"flex",gap:3,background:"rgba(255,255,255,0.55)",borderRadius:10,padding:3,border:"1px solid rgba(200,225,240,0.6)"}}>
                {(["kanban","lista"] as const).map(v=>(
                  <button key={v} onClick={()=>setView(v)} style={{padding:"5px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:view===v?"#2980b9":"transparent",color:view===v?"#fff":"rgba(20,45,70,0.6)",transition:"all 0.18s"}}>
                    {v==="kanban"?"Visão do funil":"Lista"}
                  </button>
                ))}
              </div>
              <button onClick={()=>navigate("/empresas/nova")} style={{height:38,padding:"0 16px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#2980b9,#1abc9c,#2ecc71,#2980b9)",backgroundSize:"200% 200%",animation:"gradientShift 4s ease infinite",color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 14px rgba(41,128,185,0.35)"}}>
                <Plus style={{width:15,height:15}}/> Nova oportunidade
              </button>
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{position:"relative",width:240}}>
              <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"rgba(20,45,70,0.35)"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empresa..." style={{width:"100%",height:34,paddingLeft:28,borderRadius:9,border:"1px solid rgba(200,225,240,0.9)",background:"rgba(255,255,255,0.8)",fontSize:12,color:"#1a2e40",outline:"none"}}/>
            </div>
            {["Todas","Quente","Morno","Frio"].map(t=>{
              const info=TEMPS.find(x=>x.key===t);
              const active=filterTemp===t;
              return(
                <button key={t} onClick={()=>setFilterTemp(t)} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${active?(info?.color||"#2980b9")+"50":"rgba(200,225,240,0.7)"}`,background:active?(info?.bg||"rgba(41,128,185,0.1)"):"rgba(255,255,255,0.6)",color:active?(info?.color||"#2980b9"):"rgba(20,45,70,0.55)",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4,transition:"all 0.15s"}}>
                  {info?.icon} {t}
                </button>
              );
            })}
            <div style={{marginLeft:"auto",display:"flex",gap:16,alignItems:"center"}}>
              {[
                {label:"Pipeline",value:`R$ ${totalTicket.toLocaleString("pt-BR")}`,color:"#2980b9"},
                {label:"Ticket médio",value:`R$ ${avgTicket.toLocaleString("pt-BR")}`,color:"#8e44ad"},
                {label:"Conversão",value:`${conversao}%`,color:"#27ae60"},
              ].map(s=>(
                <div key={s.label} style={{textAlign:"right"}}>
                  <div style={{fontSize:9,fontWeight:700,color:"rgba(20,45,70,0.4)",textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.label}</div>
                  <div style={{fontSize:14,fontWeight:900,color:s.color}}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:"auto",padding:"18px 24px"}}>

          {/* KANBAN */}
          {view==="kanban"&&(
            <div style={{display:"flex",gap:14,minWidth:"max-content",alignItems:"flex-start"}}>
              {PIPELINE.map(col=>{
                const cards=byStatus(col.key);
                const colTicket=cards.reduce((a,e)=>a+(e.ticket_medio_estimado||0),0);
                return(
                  <div key={col.key} style={{width:265,flexShrink:0,display:"flex",flexDirection:"column"}}>
                    <div style={{marginBottom:12,padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.65)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.85)"}}>
                      <div style={{height:3,borderRadius:3,background:col.color,marginBottom:10}}/>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:col.dot}}/>
                        <span style={{fontSize:14,fontWeight:800,color:"#0f2133"}}>{col.label}</span>
                        <span style={{marginLeft:"auto",fontSize:11,fontWeight:800,color:col.color,background:`${col.color}18`,padding:"1px 7px",borderRadius:8}}>{cards.length}</span>
                      </div>
                      {colTicket>0&&<div style={{fontSize:10,color:"rgba(20,45,70,0.45)",fontWeight:600}}>R$ {colTicket.toLocaleString("pt-BR")}</div>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:10,overflowY:"auto",maxHeight:"calc(100vh - 320px)",paddingRight:2,paddingBottom:8}}>
                      {loading?([1,2].map(i=><div key={i} className="skeleton" style={{height:170,borderRadius:14}}/>)):
                      cards.length===0?(
                        <div style={{padding:"28px 0",textAlign:"center",border:"2px dashed rgba(200,225,240,0.6)",borderRadius:14,background:"rgba(255,255,255,0.35)"}}>
                          <Building2 style={{width:22,height:22,color:"rgba(41,128,185,0.3)",margin:"0 auto 8px"}}/>
                          <p style={{fontSize:10,color:"rgba(20,45,70,0.35)",fontWeight:600}}>Sem oportunidades</p>
                          <button onClick={()=>navigate("/empresas/nova")} style={{marginTop:8,padding:"4px 10px",borderRadius:6,border:"none",background:col.color,color:"#fff",fontSize:9,fontWeight:700,cursor:"pointer"}}>+ Adicionar</button>
                        </div>
                      ):cards.map((emp,idx)=>{
                        const score=calcScore(emp);
                        const sc=scoreColor(score);
                        const pi=porteInfo(emp.porte);
                        const ti=TEMPS.find(t=>t.key===emp.temperatura)||TEMPS[2];
                        return(
                          <motion.div key={emp.empresa_id} className="kanban-card" style={{opacity:movingId===emp.empresa_id?0.45:1}} initial={{opacity:0,y:10}} animate={{opacity:movingId===emp.empresa_id?0.45:1,y:0}} exit={{opacity:0,scale:0.95}} transition={{duration:0.2,delay:idx*0.04}} onClick={()=>navigate(`/clientes/${emp.empresa_id}`)}>
                            <div style={{position:"absolute",top:0,left:0,right:0,height:3,borderRadius:"14px 14px 0 0",background:col.color}}/>
                            <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10,paddingTop:4}}>
                              <div style={{width:36,height:36,borderRadius:10,background:avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0,boxShadow:`0 4px 10px ${avatarColor(emp.nome)}40`}}>{initials(emp.nome)}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:700,color:"#0f2133",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.nome}</div>
                                <div style={{fontSize:10,color:"rgba(20,45,70,0.45)",marginTop:1}}>{emp.segmento||"—"}</div>
                              </div>
                              <div style={{flexShrink:0,padding:"2px 6px",borderRadius:6,background:sc.bg,color:sc.color,fontSize:9,fontWeight:800}}>{score}</div>
                            </div>
                            <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:10}}>
                              {emp.cidade&&<div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"rgba(20,45,70,0.55)"}}><MapPin style={{width:9,height:9,flexShrink:0,color:"#2980b9"}}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.cidade}</span></div>}
                              {emp.responsavel_principal&&<div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"rgba(20,45,70,0.55)"}}><Users style={{width:9,height:9,flexShrink:0,color:"#8e44ad"}}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.responsavel_principal}</span></div>}
                              {emp.proxima_acao&&<div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#e67e22",fontWeight:600}}><ArrowRight style={{width:9,height:9,flexShrink:0}}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.proxima_acao}</span></div>}
                            </div>
                            <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
                              {emp.porte&&<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:pi.bg,color:pi.color}}>{emp.porte}</span>}
                              {emp.origem_lead&&<span style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:4,background:"rgba(200,225,240,0.4)",color:"rgba(20,45,70,0.5)"}}>{emp.origem_lead}</span>}
                            </div>
                            {emp.ticket_medio_estimado&&<div style={{fontSize:15,fontWeight:900,color:"#27ae60",marginBottom:10,letterSpacing:"-0.02em"}}>R$ {emp.ticket_medio_estimado.toLocaleString("pt-BR")}</div>}
                            <div style={{height:1,background:"rgba(200,225,240,0.5)",marginBottom:10}}/>
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <div style={{display:"flex",gap:3}}>
                                {TEMPS.map(t=>(
                                  <button key={t.key} onClick={ev=>updateTemp(emp.empresa_id,t.key,ev)} style={{width:24,height:24,borderRadius:5,border:`1.5px solid ${emp.temperatura===t.key?t.color:"rgba(200,225,240,0.7)"}`,background:emp.temperatura===t.key?t.bg:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:11,transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center"}}>{t.icon}</button>
                                ))}
                              </div>
                              <div style={{flex:1}}/>
                              {PIPELINE.filter(p=>p.key!==emp.status).slice(0,1).map(p=>(
                                <button key={p.key} onClick={ev=>{ev.stopPropagation();updateStatus(emp.empresa_id,p.key);}} className="move-btn" style={{background:p.color,color:"#fff"}}>→ {p.label}</button>
                              ))}
                              <button onClick={ev=>{ev.stopPropagation();navigate(`/clientes/${emp.empresa_id}`);}} style={{width:24,height:24,borderRadius:6,border:"1px solid rgba(200,225,240,0.7)",background:"rgba(255,255,255,0.7)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                                <Eye style={{width:11,height:11,color:"#2980b9"}}/>
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LISTA */}
          {view==="lista"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:1100}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 100px 100px 80px",gap:12,padding:"6px 18px",fontSize:10,fontWeight:700,color:"rgba(20,45,70,0.45)",letterSpacing:"0.07em",textTransform:"uppercase"}}>
                <span>Empresa</span><span>Status</span><span>Temperatura</span><span>Cidade</span><span>Score</span><span>Ticket</span><span>Ver</span>
              </div>
              {loading?([1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:64,borderRadius:12}}/>)):
              filtered.length===0?(
                <div style={{textAlign:"center",padding:"60px 0",color:"rgba(20,45,70,0.4)"}}>
                  <Building2 style={{width:36,height:36,margin:"0 auto 12px",opacity:0.3}}/>
                  <p style={{fontSize:14,fontWeight:600}}>Nenhuma empresa encontrada</p>
                </div>
              ):filtered.map((emp,idx)=>{
                const score=calcScore(emp);
                const sc=scoreColor(score);
                const si=PIPELINE.find(p=>p.key===emp.status)||PIPELINE[0];
                return(
                  <motion.div key={emp.empresa_id} className="list-row" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.18,delay:idx*0.03}} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 100px 100px 80px",gap:12,alignItems:"center",padding:"12px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                      <div style={{width:36,height:36,borderRadius:9,background:avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(emp.nome)}</div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#0f2133",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.nome}</div>
                        <div style={{fontSize:10,color:"rgba(20,45,70,0.4)"}}>{emp.segmento||"—"}</div>
                      </div>
                    </div>
                    <select value={emp.status} onChange={e=>{e.stopPropagation();updateStatus(emp.empresa_id,e.target.value);}} style={{height:30,padding:"0 8px",borderRadius:7,border:`1px solid ${si.color}40`,background:si.light,fontSize:11,fontWeight:700,color:si.color,outline:"none",cursor:"pointer"}}>
                      {PIPELINE.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                    <div style={{display:"flex",gap:3}}>
                      {TEMPS.map(t=>(
                        <button key={t.key} onClick={ev=>updateTemp(emp.empresa_id,t.key,ev)} style={{width:26,height:26,borderRadius:6,border:`1.5px solid ${emp.temperatura===t.key?t.color:"rgba(200,225,240,0.7)"}`,background:emp.temperatura===t.key?t.bg:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:11,transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center"}}>{t.icon}</button>
                      ))}
                    </div>
                    <span style={{fontSize:12,color:"rgba(20,45,70,0.6)"}}>{emp.cidade||"—"}</span>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:36,height:4,borderRadius:4,background:"rgba(200,225,240,0.5)"}}>
                        <div style={{height:"100%",width:`${score}%`,borderRadius:4,background:sc.color}}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:800,color:sc.color}}>{score}</span>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:"#27ae60"}}>{emp.ticket_medio_estimado?`R$ ${emp.ticket_medio_estimado.toLocaleString("pt-BR")}`:"—"}</span>
                    <button onClick={()=>navigate(`/clientes/${emp.empresa_id}`)} style={{width:30,height:30,borderRadius:8,border:"1px solid rgba(200,225,240,0.7)",background:"rgba(255,255,255,0.7)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                      <ChevronRight style={{width:13,height:13,color:"#2980b9"}}/>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom stats */}
        <div style={{padding:"12px 28px",background:"rgba(210,238,248,0.85)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,0.6)",display:"flex",alignItems:"center",gap:24,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#2980b9,#1abc9c)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <TrendingUp style={{width:16,height:16,color:"#fff"}}/>
            </div>
            <div>
              <div style={{fontSize:9,color:"rgba(20,45,70,0.45)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>Total do pipeline</div>
              <div style={{fontSize:18,fontWeight:900,color:"#0f2133",letterSpacing:"-0.02em"}}>R$ {totalTicket.toLocaleString("pt-BR")}</div>
            </div>
          </div>
          {[
            {label:"Oportunidades",value:String(filtered.length),color:"#0f2133"},
            {label:"Ticket médio",value:`R$ ${avgTicket.toLocaleString("pt-BR")}`,color:"#8e44ad"},
            {label:"Taxa de fechamento",value:`${conversao}%`,color:"#27ae60"},
          ].map((s,i)=>(
            <div key={s.label} style={{display:"flex",alignItems:"center",gap:24}}>
              <div style={{width:1,height:32,background:"rgba(200,225,240,0.6)"}}/>
              <div>
                <div style={{fontSize:9,color:"rgba(20,45,70,0.45)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.label}</div>
                <div style={{fontSize:16,fontWeight:800,color:s.color}}>{s.value}</div>
              </div>
            </div>
          ))}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            <svg width="70" height="24" viewBox="0 0 70 24" fill="none">
              <polyline points="0,20 12,14 24,16 35,8 47,11 58,5 70,3" stroke="#27ae60" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="0,20 12,14 24,16 35,8 47,11 58,5 70,3" stroke="rgba(39,174,96,0.15)" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <div style={{fontSize:12,fontWeight:800,color:"#27ae60"}}>+{conversao}%</div>
              <div style={{fontSize:9,color:"rgba(20,45,70,0.4)"}}>vs. mês anterior</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}