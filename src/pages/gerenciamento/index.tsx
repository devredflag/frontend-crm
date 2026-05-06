import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Search, Building2, Users, ClipboardList,
  Calendar, BarChart3, Plus, RefreshCw, Eye,
  ChevronRight, Filter,
} from "lucide-react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
  @keyframes float1 { 0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-20px)} }
  @keyframes float2 { 0%,100%{transform:translate(0,0)}50%{transform:translate(-20px,30px)} }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:rgba(255,255,255,0.65); transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(255,255,255,0.08); color:#fff; }
  .nav-item.active { background:rgba(255,255,255,0.14); color:#fff; font-weight:600; }
  .kanban-card { background:rgba(255,255,255,0.82); border:1px solid rgba(200,225,240,0.7); border-radius:12px; padding:14px; cursor:pointer; transition:all 0.18s; }
  .kanban-card:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(41,128,185,0.12); border-color:rgba(41,128,185,0.25); }
  .skeleton { background:linear-gradient(90deg,rgba(200,225,240,0.4) 25%,rgba(220,240,252,0.7) 50%,rgba(200,225,240,0.4) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
  .temp-btn { padding:6px 10px; border-radius:8px; border:none; cursor:pointer; font-size:11px; font-weight:600; transition:all 0.18s; display:flex; align-items:center; gap:4px; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(41,128,185,0.25); border-radius:4px; }
`;

const API = "https://backend-crm-production-157b.up.railway.app";

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
  proxima_acao: string;
  ultima_interacao: string | null;
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
  { key:"Lead",       label:"Lead",        color:"#95a5a6", bg:"rgba(149,165,166,0.1)"  },
  { key:"Em contato", label:"Em contato",  color:"#2980b9", bg:"rgba(41,128,185,0.1)"   },
  { key:"Proposta",   label:"Proposta",    color:"#8e44ad", bg:"rgba(142,68,173,0.1)"   },
  { key:"Negociação", label:"Negociação",  color:"#e67e22", bg:"rgba(230,126,34,0.1)"   },
  { key:"Fechado",    label:"Fechado ✓",   color:"#27ae60", bg:"rgba(39,174,96,0.1)"    },
];

const TEMPS = [
  { key:"Quente", icon:"🔥", color:"#c0392b", bg:"rgba(192,57,43,0.1)"  },
  { key:"Morno",  icon:"🌡️", color:"#d68910", bg:"rgba(214,137,16,0.1)" },
  { key:"Frio",   icon:"❄️", color:"#2980b9", bg:"rgba(41,128,185,0.1)"  },
];

function initials(n: string) { return n?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?"; }
function avatarColor(n: string) { const c=["#2980b9","#1abc9c","#8e44ad","#e67e22","#27ae60","#e74c3c"]; return c[(n?.charCodeAt(0)||0)%c.length]; }
function tempInfo(t: string) { return TEMPS.find(x=>x.key===t)||TEMPS[2]; }
function calcScore(e: Empresa) {
  let s=0;
  if(e.temperatura==="Quente")s+=30;else if(e.temperatura==="Morno")s+=18;else s+=5;
  if(e.status==="Fechado")s+=25;else if(e.status==="Proposta"||e.status==="Negociação")s+=20;else if(e.status==="Em contato")s+=14;else s+=5;
  if(e.porte==="Grande")s+=20;else if(e.porte==="Médio")s+=13;else s+=6;
  const t=e.ticket_medio_estimado||0;if(t>=20000)s+=15;else if(t>=5000)s+=10;else if(t>0)s+=5;
  if(e.ultima_interacao){const d=(Date.now()-new Date(e.ultima_interacao).getTime())/86400000;if(d<=7)s+=10;else if(d<=30)s+=6;else s+=2;}
  return Math.min(s,100);
}
function scoreColor(s: number) { if(s>=70)return"#27ae60";if(s>=40)return"#e67e22";return"#e74c3c"; }

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
      const [e, m] = await Promise.all([
        fetch(`${API}/empresas`, { headers: hdrs }),
        fetch(`${API}/me`, { headers: hdrs }),
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
    setMovingId(null);
  };

  const updateTemp = async (id: string, temperatura: string) => {
    setEmpresas(p=>p.map(e=>e.empresa_id===id?{...e,temperatura}:e));
    try { await fetch(`${API}/empresas/${id}`,{method:"PUT",headers:hdrs,body:JSON.stringify({temperatura})}); } catch {}
  };

  const filtered = empresas.filter(e => {
    const q=search.toLowerCase();
    return (!q||e.nome.toLowerCase().includes(q)||e.segmento?.toLowerCase().includes(q)) && (filterTemp==="Todas"||e.temperatura===filterTemp);
  });

  const byStatus = (s: string) => filtered.filter(e=>e.status===s);
  const totalTicket = empresas.reduce((a,e)=>a+(e.ticket_medio_estimado||0),0);

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",position:"relative"}}>
      <style>{css}</style>

      {/* BG */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(145deg,#c8e8f5 0%,#d6eef5 30%,#cceee8 65%,#c5eae0 100%)"}}/>
        <div style={{position:"absolute",inset:0,opacity:0.4,backgroundImage:"radial-gradient(circle,rgba(41,128,185,0.2) 1px,transparent 1px)",backgroundSize:"22px 22px"}}/>
        <div style={{position:"absolute",width:400,height:400,top:"-60px",left:"8%",borderRadius:"50%",background:"radial-gradient(circle,#2980b9,#1abc9c)",opacity:0.08,animation:"float1 18s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:300,height:300,bottom:"10%",right:"5%",borderRadius:"50%",background:"radial-gradient(circle,#1abc9c,#2ecc71)",opacity:0.07,animation:"float2 22s ease-in-out infinite"}}/>
      </div>

      {/* Sidebar */}
      <div style={{width:220,flexShrink:0,height:"100vh",overflowY:"auto",position:"relative",zIndex:10,background:"linear-gradient(180deg,#1a3a5c 0%,#0f2a44 60%,#0a1f33 100%)",boxShadow:"4px 0 24px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",padding:"0 12px 20px"}}>
        <div style={{padding:"22px 4px 24px",borderBottom:"1px solid rgba(255,255,255,0.08)",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#2980b9,#1abc9c)",display:"flex",alignItems:"center",justifyContent:"center"}}>
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
              <item.icon style={{width:16,height:16,flexShrink:0}}/>
              {item.label}
            </div>
          ))}
        </nav>
        <div onClick={()=>navigate("/perfil")} style={{marginTop:16,padding:"12px",borderRadius:12,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",gap:10,cursor:"pointer",transition:"background 0.18s"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.12)")} onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,0.06)")}>
          <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${avatarColor(usuario?.nome||"")},#1abc9c)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>
            {initials(usuario?.nome||"?")}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{usuario?.nome||"..."}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.45)"}}>{usuario?.cargo||"Administrador"}</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,height:"100vh",overflow:"hidden",display:"flex",flexDirection:"column",position:"relative",zIndex:5}}>

        {/* Topbar */}
        <div style={{padding:"14px 28px",background:"rgba(210,238,248,0.85)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.6)",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
          <div style={{flex:1}}>
            <h1 style={{fontSize:18,fontWeight:800,color:"#0f2133"}}>Gerenciamento de Clientes</h1>
            <p style={{fontSize:12,color:"rgba(20,45,70,0.5)",marginTop:1}}>Pipeline comercial e gestão de temperatura</p>
          </div>
          <button onClick={fetchAll} style={{width:36,height:36,borderRadius:10,border:"1px solid rgba(200,225,240,0.9)",background:"rgba(255,255,255,0.75)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <RefreshCw style={{width:15,height:15,color:"#2980b9"}}/>
          </button>
          <div style={{display:"flex",gap:4,background:"rgba(255,255,255,0.6)",borderRadius:10,padding:4}}>
            {(["kanban","lista"] as const).map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{padding:"5px 14px",borderRadius:7,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:view===v?"#2980b9":"transparent",color:view===v?"#fff":"rgba(20,45,70,0.6)",transition:"all 0.18s"}}>
                {v==="kanban"?"Pipeline":"Lista"}
              </button>
            ))}
          </div>
          <button onClick={()=>navigate("/empresas/nova")} style={{height:38,padding:"0 16px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#2980b9,#1abc9c,#2ecc71,#2980b9)",backgroundSize:"200% 200%",animation:"gradientShift 4s ease infinite",color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
            <Plus style={{width:15,height:15}}/> Nova empresa
          </button>
        </div>

        {/* Métricas */}
        <div style={{padding:"12px 28px",borderBottom:"1px solid rgba(200,225,240,0.4)",display:"flex",gap:10,flexShrink:0,background:"rgba(210,238,248,0.4)",overflowX:"auto"}}>
          {PIPELINE.map(p=>{
            const count=empresas.filter(e=>e.status===p.key).length;
            const ticket=empresas.filter(e=>e.status===p.key).reduce((a,e)=>a+(e.ticket_medio_estimado||0),0);
            return(
              <div key={p.key} style={{flexShrink:0,minWidth:120,padding:"10px 14px",borderRadius:12,background:"rgba(255,255,255,0.7)",border:`1px solid ${p.color}20`}}>
                <div style={{fontSize:9,fontWeight:700,color:p.color,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{p.label}</div>
                <div style={{fontSize:20,fontWeight:900,color:"#0f2133"}}>{count}</div>
                {ticket>0&&<div style={{fontSize:9,color:"rgba(20,45,70,0.4)",marginTop:1}}>R$ {ticket.toLocaleString("pt-BR")}</div>}
              </div>
            );
          })}
          <div style={{flexShrink:0,padding:"10px 14px",borderRadius:12,background:"rgba(255,255,255,0.7)",border:"1px solid rgba(41,128,185,0.15)",minWidth:120}}>
            <div style={{fontSize:9,fontWeight:700,color:"#2980b9",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>Pipeline Total</div>
            <div style={{fontSize:16,fontWeight:900,color:"#27ae60"}}>R$ {totalTicket.toLocaleString("pt-BR")}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{padding:"10px 28px",borderBottom:"1px solid rgba(200,225,240,0.3)",display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
          <div style={{position:"relative",flex:1,maxWidth:300}}>
            <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"rgba(20,45,70,0.35)"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empresa..." style={{width:"100%",height:32,paddingLeft:28,borderRadius:8,border:"1px solid rgba(200,225,240,0.9)",background:"rgba(255,255,255,0.8)",fontSize:12,color:"#1a2e40",outline:"none"}}/>
          </div>
          <span style={{fontSize:11,fontWeight:600,color:"rgba(20,45,70,0.5)"}}>Temperatura:</span>
          {["Todas",...TEMPS.map(t=>t.key)].map(t=>{
            const info=TEMPS.find(x=>x.key===t);
            return(
              <button key={t} className="temp-btn" onClick={()=>setFilterTemp(t)} style={{background:filterTemp===t?(info?.bg||"rgba(41,128,185,0.1)"):"rgba(255,255,255,0.6)",color:filterTemp===t?(info?.color||"#2980b9"):"rgba(20,45,70,0.5)",border:`1px solid ${filterTemp===t?(info?.color||"#2980b9")+"40":"rgba(200,225,240,0.7)"}`}}>
                {info?.icon||<Filter style={{width:10,height:10}}/>} {t}
              </button>
            );
          })}
          <span style={{marginLeft:"auto",fontSize:11,color:"rgba(20,45,70,0.4)"}}>{filtered.length} empresa{filtered.length!==1?"s":""}</span>
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:"auto",padding:"18px 28px"}}>

          {/* KANBAN */}
          {view==="kanban"&&(
            <div style={{display:"flex",gap:14,minWidth:"max-content",height:"100%"}}>
              {PIPELINE.map(col=>{
                const cards=byStatus(col.key);
                return(
                  <div key={col.key} style={{width:230,flexShrink:0,display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{padding:"9px 14px",borderRadius:10,background:`${col.color}15`,border:`1px solid ${col.color}25`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span style={{fontSize:12,fontWeight:700,color:col.color}}>{col.label}</span>
                      <span style={{fontSize:11,fontWeight:800,color:col.color,background:`${col.color}20`,padding:"2px 8px",borderRadius:10}}>{cards.length}</span>
                    </div>
                    <div style={{flex:1,display:"flex",flexDirection:"column",gap:7,overflowY:"auto",paddingBottom:8}}>
                      {loading?([1,2].map(i=><div key={i} className="skeleton" style={{height:110,borderRadius:12}}/>)):
                      cards.length===0?(
                        <div style={{padding:"20px 0",textAlign:"center",border:"2px dashed rgba(200,225,240,0.5)",borderRadius:12}}>
                          <p style={{fontSize:10,color:"rgba(20,45,70,0.3)",fontWeight:600}}>Nenhuma empresa</p>
                        </div>
                      ):cards.map((emp,idx)=>{
                        const score=calcScore(emp);
                        return(
                          <motion.div key={emp.empresa_id} className="kanban-card" initial={{opacity:0,y:8}} animate={{opacity:movingId===emp.empresa_id?0.4:1,y:0}} transition={{duration:0.2,delay:idx*0.03}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                              <div style={{width:28,height:28,borderRadius:7,background:avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(emp.nome)}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:11,fontWeight:700,color:"#0f2133",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.nome}</div>
                                <div style={{fontSize:9,color:"rgba(20,45,70,0.4)"}}>{emp.segmento||"—"}</div>
                              </div>
                            </div>
                            {/* Temperatura */}
                            <div style={{display:"flex",gap:4,marginBottom:7}}>
                              {TEMPS.map(t=>(
                                <button key={t.key} onClick={()=>updateTemp(emp.empresa_id,t.key)} style={{flex:1,padding:"3px 0",borderRadius:5,border:`1.5px solid ${emp.temperatura===t.key?t.color:"transparent"}`,background:emp.temperatura===t.key?t.bg:"rgba(200,225,240,0.2)",cursor:"pointer",fontSize:11,transition:"all 0.15s"}}>
                                  {t.icon}
                                </button>
                              ))}
                            </div>
                            {/* Score bar */}
                            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
                              <div style={{flex:1,height:4,borderRadius:4,background:"rgba(200,225,240,0.5)"}}>
                                <div style={{height:"100%",width:`${score}%`,borderRadius:4,background:scoreColor(score)}}/>
                              </div>
                              <span style={{fontSize:9,fontWeight:800,color:scoreColor(score)}}>{score}</span>
                            </div>
                            {emp.ticket_medio_estimado&&<div style={{fontSize:9,fontWeight:700,color:"#27ae60",marginBottom:5}}>R$ {emp.ticket_medio_estimado.toLocaleString("pt-BR")}</div>}
                            {emp.proxima_acao&&<div style={{fontSize:9,color:"rgba(20,45,70,0.5)",padding:"3px 7px",borderRadius:5,background:"rgba(230,126,34,0.07)",marginBottom:7,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>→ {emp.proxima_acao}</div>}
                            {/* Ações */}
                            <div style={{display:"flex",gap:4}}>
                              <button onClick={()=>navigate(`/clientes/${emp.empresa_id}`)} style={{width:26,height:26,borderRadius:6,border:"1px solid rgba(41,128,185,0.2)",background:"rgba(41,128,185,0.08)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                                <Eye style={{width:11,height:11,color:"#2980b9"}}/>
                              </button>
                              <div style={{flex:1,display:"flex",gap:3}}>
                                {PIPELINE.filter(p=>p.key!==emp.status).slice(0,2).map(p=>(
                                  <button key={p.key} onClick={()=>updateStatus(emp.empresa_id,p.key)} style={{flex:1,padding:"3px 4px",borderRadius:5,border:`1px solid ${p.color}30`,background:`${p.color}10`,cursor:"pointer",fontSize:8,fontWeight:700,color:p.color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                    →{p.label.replace(" ✓","").split(" ")[0]}
                                  </button>
                                ))}
                              </div>
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
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {loading?([1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:68,borderRadius:12}}/>)):
              filtered.length===0?(
                <div style={{textAlign:"center",padding:"48px 0",color:"rgba(20,45,70,0.4)"}}>
                  <Building2 style={{width:36,height:36,margin:"0 auto 12px",opacity:0.3}}/>
                  <p style={{fontSize:14,fontWeight:600}}>Nenhuma empresa encontrada</p>
                </div>
              ):filtered.map((emp,idx)=>{
                const score=calcScore(emp);
                const statusInfo=PIPELINE.find(p=>p.key===emp.status)||PIPELINE[0];
                return(
                  <motion.div key={emp.empresa_id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.18,delay:idx*0.03}} style={{padding:"12px 18px",borderRadius:12,background:"rgba(255,255,255,0.72)",border:"1px solid rgba(255,255,255,0.9)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:36,height:36,borderRadius:9,background:avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(emp.nome)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#0f2133"}}>{emp.nome}</div>
                      <div style={{fontSize:10,color:"rgba(20,45,70,0.45)"}}>{emp.segmento||"—"} · {emp.cidade||"—"}</div>
                    </div>
                    <select value={emp.status} onChange={e=>{e.stopPropagation();updateStatus(emp.empresa_id,e.target.value);}} style={{height:30,padding:"0 8px",borderRadius:7,border:`1px solid ${statusInfo.color}40`,background:`${statusInfo.color}10`,fontSize:11,fontWeight:700,color:statusInfo.color,outline:"none",cursor:"pointer"}}>
                      {PIPELINE.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                    <div style={{display:"flex",gap:4}}>
                      {TEMPS.map(t=>(
                        <button key={t.key} onClick={()=>updateTemp(emp.empresa_id,t.key)} style={{width:26,height:26,borderRadius:6,border:`1.5px solid ${emp.temperatura===t.key?t.color:"transparent"}`,background:emp.temperatura===t.key?t.bg:"rgba(200,225,240,0.2)",cursor:"pointer",fontSize:12,transition:"all 0.15s"}}>
                          {t.icon}
                        </button>
                      ))}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5,minWidth:70}}>
                      <div style={{width:44,height:4,borderRadius:4,background:"rgba(200,225,240,0.5)"}}>
                        <div style={{height:"100%",width:`${score}%`,borderRadius:4,background:scoreColor(score)}}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:800,color:scoreColor(score)}}>{score}</span>
                    </div>
                    {emp.ticket_medio_estimado&&<span style={{fontSize:11,fontWeight:700,color:"#27ae60",minWidth:75,textAlign:"right"}}>R$ {emp.ticket_medio_estimado.toLocaleString("pt-BR")}</span>}
                    <button onClick={()=>navigate(`/clientes/${emp.empresa_id}`)} style={{width:30,height:30,borderRadius:8,border:"1px solid rgba(41,128,185,0.2)",background:"rgba(41,128,185,0.08)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                      <ChevronRight style={{width:13,height:13,color:"#2980b9"}}/>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}