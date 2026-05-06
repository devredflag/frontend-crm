import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Search, Building2, Users, ClipboardList,
  Calendar, BarChart3, Plus, RefreshCw, Eye, Edit3,
  ChevronRight, MapPin, Phone, TrendingUp, ArrowRight,
  Flame, Thermometer, Snowflake,
} from "lucide-react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:rgba(255,255,255,0.65); transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(255,255,255,0.08); color:#fff; }
  .nav-item.active { background:rgba(255,255,255,0.14); color:#fff; font-weight:600; }
  .kanban-col { flex:1; min-width:240px; max-width:300px; display:flex; flex-direction:column; gap:0; }
  .kanban-card { background:#fff; border:1px solid rgba(220,230,240,0.8); border-radius:14px; padding:16px; cursor:pointer; transition:all 0.2s; position:relative; overflow:hidden; }
  .kanban-card:hover { transform:translateY(-3px); box-shadow:0 12px 32px rgba(0,0,0,0.1); border-color:rgba(41,128,185,0.3); }
  .kanban-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; border-radius:14px 14px 0 0; }
  .skeleton { background:linear-gradient(90deg,rgba(220,230,240,0.6) 25%,rgba(240,248,255,0.9) 50%,rgba(220,230,240,0.6) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; }
  .temp-pill { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:20px; font-size:10px; font-weight:700; cursor:pointer; border:1.5px solid transparent; transition:all 0.15s; }
  .temp-pill:hover { opacity:0.8; }
  .move-btn { padding:4px 8px; border-radius:6px; font-size:9px; font-weight:700; cursor:pointer; border:none; transition:all 0.15s; white-space:nowrap; }
  .move-btn:hover { opacity:0.8; transform:scale(1.03); }
  .list-row { background:#fff; border:1px solid rgba(220,230,240,0.8); border-radius:12px; padding:14px 18px; display:flex; align-items:center; gap:14px; transition:all 0.18s; }
  .list-row:hover { box-shadow:0 4px 16px rgba(0,0,0,0.07); border-color:rgba(41,128,185,0.25); }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(41,128,185,0.2); border-radius:4px; }
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
  origem_lead: string;
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
  { key:"Lead",       label:"Lead",        color:"#64748b", light:"#f1f5f9", dot:"#94a3b8"  },
  { key:"Em contato", label:"Em contato",  color:"#2980b9", light:"#eff6ff", dot:"#60a5fa"  },
  { key:"Proposta",   label:"Proposta",    color:"#7c3aed", light:"#f5f3ff", dot:"#a78bfa"  },
  { key:"Negociação", label:"Negociação",  color:"#d97706", light:"#fffbeb", dot:"#fbbf24"  },
  { key:"Fechado",    label:"Fechado",     color:"#16a34a", light:"#f0fdf4", dot:"#4ade80"  },
];

const TEMPS = [
  { key:"Quente", icon:"🔥", color:"#c0392b", bg:"rgba(192,57,43,0.1)"  },
  { key:"Morno",  icon:"🌡️", color:"#d68910", bg:"rgba(214,137,16,0.1)" },
  { key:"Frio",   icon:"❄️", color:"#2980b9", bg:"rgba(41,128,185,0.1)"  },
];

function initials(n: string) { return n?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?"; }
function avatarColor(n: string) {
  const palette = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#84cc16"];
  return palette[(n?.charCodeAt(0)||0) % palette.length];
}
function tempInfo(t: string) { return TEMPS.find(x=>x.key===t)||TEMPS[2]; }
function porteInfo(p: string) {
  if (p==="Grande") return { color:"#7c3aed", bg:"#f5f3ff" };
  if (p==="Médio")  return { color:"#0ea5e9", bg:"#eff6ff" };
  return { color:"#16a34a", bg:"#f0fdf4" };
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
  if(s>=70) return { color:"#16a34a", bg:"#dcfce7", label:"Alto" };
  if(s>=40) return { color:"#d97706", bg:"#fef3c7", label:"Médio" };
  return { color:"#dc2626", bg:"#fee2e2", label:"Baixo" };
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
    setTimeout(()=>setMovingId(null), 400);
  };

  const updateTemp = async (id: string, temperatura: string, ev: React.MouseEvent) => {
    ev.stopPropagation();
    setEmpresas(p=>p.map(e=>e.empresa_id===id?{...e,temperatura}:e));
    try { await fetch(`${API}/empresas/${id}`,{method:"PUT",headers:hdrs,body:JSON.stringify({temperatura})}); } catch {}
  };

  const filtered = empresas.filter(e => {
    const q=search.toLowerCase();
    return (!q||e.nome.toLowerCase().includes(q)||e.segmento?.toLowerCase().includes(q)||e.cidade?.toLowerCase().includes(q))
      && (filterTemp==="Todas"||e.temperatura===filterTemp);
  });

  const byStatus = (s: string) => filtered.filter(e=>e.status===s);
  const totalTicket = filtered.reduce((a,e)=>a+(e.ticket_medio_estimado||0),0);
  const avgTicket = filtered.length>0 ? Math.round(totalTicket/filtered.length) : 0;
  const totalFechado = empresas.filter(e=>e.status==="Fechado").length;
  const conversao = empresas.length>0 ? ((totalFechado/empresas.length)*100).toFixed(1) : "0";

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:"#f8fafc"}}>
      <style>{css}</style>

      {/* Sidebar */}
      <div style={{width:220,flexShrink:0,height:"100vh",overflowY:"auto",background:"linear-gradient(180deg,#1a3a5c 0%,#0f2a44 60%,#0a1f33 100%)",boxShadow:"4px 0 24px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",padding:"0 12px 20px",position:"relative",zIndex:10}}>
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
      <div style={{flex:1,height:"100vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>

        {/* Header */}
        <div style={{padding:"20px 28px 16px",background:"#fff",borderBottom:"1px solid #e2e8f0",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:16}}>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:600,color:"#94a3b8",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:4}}>Pipeline</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <h1 style={{fontSize:24,fontWeight:900,color:"#0f172a",letterSpacing:"-0.03em"}}>Pipeline de Vendas</h1>
                <TrendingUp style={{width:20,height:20,color:"#10b981"}}/>
              </div>
              <p style={{fontSize:13,color:"#64748b",marginTop:3}}>Acompanhe suas oportunidades e mova os negócios adiante.</p>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={fetchAll} style={{width:38,height:38,borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <RefreshCw style={{width:15,height:15,color:"#64748b"}}/>
              </button>
              <div style={{display:"flex",gap:3,background:"#f1f5f9",borderRadius:10,padding:3}}>
                {(["kanban","lista"] as const).map(v=>(
                  <button key={v} onClick={()=>setView(v)} style={{padding:"6px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:view===v?"#fff":"transparent",color:view===v?"#0f172a":"#64748b",boxShadow:view===v?"0 1px 3px rgba(0,0,0,0.1)":"none",transition:"all 0.18s"}}>
                    {v==="kanban"?"Visão do funil":"Lista"}
                  </button>
                ))}
              </div>
              <button onClick={()=>navigate("/empresas/nova")} style={{height:38,padding:"0 16px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 12px rgba(99,102,241,0.35)"}}>
                <Plus style={{width:15,height:15}}/> Nova oportunidade
              </button>
            </div>
          </div>

          {/* Filters */}
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{position:"relative",width:260}}>
              <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#94a3b8"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empresa, segmento..." style={{width:"100%",height:36,paddingLeft:30,borderRadius:9,border:"1px solid #e2e8f0",background:"#f8fafc",fontSize:12,color:"#1a2e40",outline:"none"}}/>
            </div>
            <span style={{fontSize:12,fontWeight:600,color:"#64748b"}}>Temperatura:</span>
            {["Todas","Quente","Morno","Frio"].map(t=>{
              const info = TEMPS.find(x=>x.key===t);
              const active = filterTemp===t;
              return(
                <button key={t} onClick={()=>setFilterTemp(t)} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${active?(info?.color||"#6366f1")+"50":"#e2e8f0"}`,background:active?(info?.bg||"rgba(99,102,241,0.08)"):"#fff",color:active?(info?.color||"#6366f1"):"#64748b",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4,transition:"all 0.15s"}}>
                  {info?.icon} {t}
                </button>
              );
            })}
            <span style={{marginLeft:"auto",fontSize:12,color:"#94a3b8"}}>{filtered.length} empresa{filtered.length!==1?"s":""}</span>
          </div>
        </div>

        {/* Kanban / Lista */}
        <div style={{flex:1,overflow:"auto",padding:"20px 24px"}}>

          {/* KANBAN */}
          {view==="kanban"&&(
            <div style={{display:"flex",gap:16,minWidth:"max-content",height:"100%",alignItems:"flex-start"}}>
              {PIPELINE.map(col=>{
                const cards = byStatus(col.key);
                const colTicket = cards.reduce((a,e)=>a+(e.ticket_medio_estimado||0),0);
                return(
                  <div key={col.key} className="kanban-col" style={{minWidth:265,maxWidth:290}}>
                    {/* Column header */}
                    <div style={{marginBottom:14}}>
                      <div style={{height:3,borderRadius:3,background:col.color,marginBottom:12}}/>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:col.dot}}/>
                        <span style={{fontSize:14,fontWeight:800,color:"#0f172a"}}>{col.label}</span>
                      </div>
                      <div style={{display:"flex",gap:12}}>
                        <span style={{fontSize:11,color:"#64748b"}}>{cards.length} oportunidade{cards.length!==1?"s":""}</span>
                        {colTicket>0&&<span style={{fontSize:11,color:"#64748b",fontWeight:600}}>R$ {colTicket.toLocaleString("pt-BR")}</span>}
                      </div>
                    </div>

                    {/* Cards */}
                    <div style={{display:"flex",flexDirection:"column",gap:10,overflowY:"auto",maxHeight:"calc(100vh - 280px)",paddingBottom:8,paddingRight:2}}>
                      {loading?([1,2].map(i=><div key={i} className="skeleton" style={{height:160,borderRadius:14}}/>)):
                      cards.length===0?(
                        <div style={{padding:"28px 0",textAlign:"center",border:"2px dashed #e2e8f0",borderRadius:14,background:"#f8fafc"}}>
                          <Building2 style={{width:24,height:24,color:"#cbd5e1",margin:"0 auto 8px"}}/>
                          <p style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>Sem oportunidades</p>
                          <button onClick={()=>navigate("/empresas/nova")} style={{marginTop:8,padding:"4px 10px",borderRadius:6,border:"none",background:col.color,color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer"}}>+ Adicionar</button>
                        </div>
                      ):cards.map((emp,idx)=>{
                        const sc = scoreColor(calcScore(emp));
                        const score = calcScore(emp);
                        const ti = tempInfo(emp.temperatura);
                        const pi = porteInfo(emp.porte);
                        const isMoving = movingId===emp.empresa_id;
                        return(
                          <motion.div
                            key={emp.empresa_id}
                            className="kanban-card"
                            style={{borderTopColor:col.color, opacity:isMoving?0.5:1}}
                            initial={{opacity:0,y:12}}
                            animate={{opacity:isMoving?0.5:1,y:0}}
                            exit={{opacity:0,scale:0.95}}
                            transition={{duration:0.2,delay:idx*0.04}}
                            onClick={()=>navigate(`/clientes/${emp.empresa_id}`)}
                          >
                            {/* Card header */}
                            <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:12}}>
                              <div style={{width:38,height:38,borderRadius:10,background:avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0,boxShadow:`0 4px 10px ${avatarColor(emp.nome)}50`}}>
                                {initials(emp.nome)}
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:700,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.nome}</div>
                                <div style={{fontSize:11,color:"#64748b",marginTop:1}}>{emp.segmento||"—"}</div>
                              </div>
                              {/* Score badge */}
                              <div style={{flexShrink:0,padding:"2px 7px",borderRadius:6,background:sc.bg,color:sc.color,fontSize:10,fontWeight:800}}>{score}</div>
                            </div>

                            {/* Info grid */}
                            <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
                              {emp.cidade&&(
                                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#64748b"}}>
                                  <MapPin style={{width:10,height:10,flexShrink:0}}/>
                                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.cidade}</span>
                                </div>
                              )}
                              {emp.responsavel_principal&&(
                                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#64748b"}}>
                                  <Users style={{width:10,height:10,flexShrink:0}}/>
                                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.responsavel_principal}</span>
                                </div>
                              )}
                              {emp.proxima_acao&&(
                                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#f59e0b"}}>
                                  <ArrowRight style={{width:10,height:10,flexShrink:0}}/>
                                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:600}}>{emp.proxima_acao}</span>
                                </div>
                              )}
                            </div>

                            {/* Tags row */}
                            <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>
                              {emp.porte&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:5,background:pi.bg,color:pi.color}}>{emp.porte}</span>}
                              {emp.origem_lead&&<span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:5,background:"#f1f5f9",color:"#64748b"}}>{emp.origem_lead}</span>}
                            </div>

                            {/* Ticket */}
                            {emp.ticket_medio_estimado&&(
                              <div style={{fontSize:16,fontWeight:900,color:"#16a34a",marginBottom:12,letterSpacing:"-0.02em"}}>
                                R$ {emp.ticket_medio_estimado.toLocaleString("pt-BR")}
                              </div>
                            )}

                            {/* Divider */}
                            <div style={{height:1,background:"#f1f5f9",marginBottom:12}}/>

                            {/* Bottom actions */}
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              {/* Temperatura */}
                              <div style={{display:"flex",gap:3}}>
                                {TEMPS.map(t=>(
                                  <button key={t.key} onClick={ev=>updateTemp(emp.empresa_id,t.key,ev)} style={{width:26,height:26,borderRadius:6,border:`1.5px solid ${emp.temperatura===t.key?t.color:"#e2e8f0"}`,background:emp.temperatura===t.key?t.bg:"#f8fafc",cursor:"pointer",fontSize:12,transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                    {t.icon}
                                  </button>
                                ))}
                              </div>
                              <div style={{flex:1}}/>
                              {/* Mover + ver */}
                              {PIPELINE.filter(p=>p.key!==emp.status).slice(0,1).map(p=>(
                                <button key={p.key} onClick={ev=>{ev.stopPropagation();updateStatus(emp.empresa_id,p.key);}} className="move-btn" style={{background:p.color,color:"#fff",padding:"4px 9px",borderRadius:6,fontSize:9,fontWeight:700}}>
                                  → {p.label}
                                </button>
                              ))}
                              <button onClick={ev=>{ev.stopPropagation();navigate(`/clientes/${emp.empresa_id}`);}} style={{width:26,height:26,borderRadius:6,border:"1px solid #e2e8f0",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                                <Eye style={{width:12,height:12,color:"#64748b"}}/>
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
              {/* Header */}
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 100px 100px 80px",gap:12,padding:"8px 18px",fontSize:10,fontWeight:700,color:"#94a3b8",letterSpacing:"0.07em",textTransform:"uppercase"}}>
                <span>Empresa</span><span>Status</span><span>Temperatura</span><span>Cidade</span><span>Score</span><span>Ticket</span><span>Ver</span>
              </div>
              {loading?([1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:64,borderRadius:12}}/>)):
              filtered.length===0?(
                <div style={{textAlign:"center",padding:"60px 0",color:"#94a3b8"}}>
                  <Building2 style={{width:40,height:40,margin:"0 auto 12px",opacity:0.3}}/>
                  <p style={{fontSize:14,fontWeight:600}}>Nenhuma empresa encontrada</p>
                </div>
              ):filtered.map((emp,idx)=>{
                const score=calcScore(emp);
                const sc=scoreColor(score);
                const si=PIPELINE.find(p=>p.key===emp.status)||PIPELINE[0];
                return(
                  <motion.div key={emp.empresa_id} className="list-row" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.18,delay:idx*0.03}} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 100px 100px 80px",gap:12,alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                      <div style={{width:36,height:36,borderRadius:9,background:avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(emp.nome)}</div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.nome}</div>
                        <div style={{fontSize:10,color:"#94a3b8"}}>{emp.segmento||"—"}</div>
                      </div>
                    </div>
                    <select value={emp.status} onChange={e=>{e.stopPropagation();updateStatus(emp.empresa_id,e.target.value);}} style={{height:30,padding:"0 8px",borderRadius:7,border:`1px solid ${si.color}40`,background:`${si.light}`,fontSize:11,fontWeight:700,color:si.color,outline:"none",cursor:"pointer"}}>
                      {PIPELINE.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                    <div style={{display:"flex",gap:3}}>
                      {TEMPS.map(t=>(
                        <button key={t.key} onClick={ev=>updateTemp(emp.empresa_id,t.key,ev)} style={{width:26,height:26,borderRadius:6,border:`1.5px solid ${emp.temperatura===t.key?t.color:"#e2e8f0"}`,background:emp.temperatura===t.key?t.bg:"#f8fafc",cursor:"pointer",fontSize:11,transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {t.icon}
                        </button>
                      ))}
                    </div>
                    <span style={{fontSize:12,color:"#64748b"}}>{emp.cidade||"—"}</span>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:36,height:4,borderRadius:4,background:"#e2e8f0"}}>
                        <div style={{height:"100%",width:`${score}%`,borderRadius:4,background:sc.color}}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:800,color:sc.color}}>{score}</span>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:"#16a34a"}}>{emp.ticket_medio_estimado?`R$ ${emp.ticket_medio_estimado.toLocaleString("pt-BR")}`:"—"}</span>
                    <button onClick={()=>navigate(`/clientes/${emp.empresa_id}`)} style={{width:30,height:30,borderRadius:8,border:"1px solid #e2e8f0",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                      <ChevronRight style={{width:13,height:13,color:"#64748b"}}/>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom stats bar */}
        <div style={{padding:"12px 28px",background:"#fff",borderTop:"1px solid #e2e8f0",display:"flex",alignItems:"center",gap:32,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <TrendingUp style={{width:18,height:18,color:"#fff"}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:"#94a3b8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Total do pipeline</div>
              <div style={{fontSize:20,fontWeight:900,color:"#0f172a",letterSpacing:"-0.02em"}}>R$ {totalTicket.toLocaleString("pt-BR")}</div>
            </div>
          </div>
          <div style={{width:1,height:36,background:"#e2e8f0"}}/>
          <div>
            <div style={{fontSize:10,color:"#94a3b8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Oportunidades</div>
            <div style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>{filtered.length}</div>
          </div>
          <div style={{width:1,height:36,background:"#e2e8f0"}}/>
          <div>
            <div style={{fontSize:10,color:"#94a3b8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Ticket médio</div>
            <div style={{fontSize:18,fontWeight:800,color:"#0f172a"}}>R$ {avgTicket.toLocaleString("pt-BR")}</div>
          </div>
          <div style={{width:1,height:36,background:"#e2e8f0"}}/>
          <div>
            <div style={{fontSize:10,color:"#94a3b8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Taxa de fechamento</div>
            <div style={{fontSize:18,fontWeight:800,color:"#16a34a"}}>{conversao}%</div>
          </div>
          <div style={{width:1,height:36,background:"#e2e8f0"}}/>
          {/* Mini sparkline */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <svg width="80" height="28" viewBox="0 0 80 28" fill="none">
              <polyline points="0,22 13,16 26,18 40,10 53,13 66,6 80,4" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="0,22 13,16 26,18 40,10 53,13 66,6 80,4" stroke="rgba(16,185,129,0.15)" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"#10b981"}}>+ {conversao}%</div>
              <div style={{fontSize:9,color:"#94a3b8"}}>vs. mês anterior</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}