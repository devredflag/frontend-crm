import { getToken } from "../../services/auth";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CardUsuario from "../../components/CardUsuario";
import FundoAzul from "../../components/FundoAzul";
import {
  LayoutDashboard, Search, Building2, Users, ClipboardList,
  Calendar, BarChart3, ChevronDown, Plus, Filter,
  Eye, Edit3, Trash2, CheckSquare, ArrowUpDown, RefreshCw,
  Star, UserRoundCog,
} from "lucide-react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:#EAF6FB; transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(159,211,234,0.08); color:#fff; }
  .nav-item.active { background:rgba(159,211,234,0.08); color:#fff; font-weight:600; }
  .glass-card { background:#143354; border:1px solid rgba(159,211,234,0.18); border-radius:16px; }
  .client-row { display:grid; grid-template-columns:2.4fr 1fr 1fr 1fr 1fr 120px; align-items:center; padding:14px 20px; border-bottom:1px solid rgba(159,211,234,0.18); cursor:pointer; transition:background 0.15s; user-select:none; }
  .client-row:hover { background:rgba(46,111,149,0.04); }
  .client-row:last-child { border-bottom:none; }
  .th { display:grid; grid-template-columns:2.4fr 1fr 1fr 1fr 1fr 120px; align-items:center; padding:10px 20px; border-bottom:1px solid rgba(159,211,234,0.18); }
  .chip { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
  .action-btn { width:30px; height:30px; border-radius:8px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.15s; }
  .skeleton { background:linear-gradient(90deg,rgba(159,211,234,0.08) 25%,rgba(220,240,252,0.7) 50%,rgba(159,211,234,0.08) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(46,111,149,0.25); border-radius:4px; }
`;

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

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

interface Usuario {
  nome: string;
  cargo: string;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",                active: false },
  { icon: Search,          label: "Buscar Empresas",           active: false },
  { icon: Building2,       label: "Cadastrar Empresas",        active: false },
  { icon: Users,           label: "Todos os clientes",         active: false },
  { icon: ClipboardList,   label: "Gerenciamento", active: false },
  { icon: Calendar,        label: "Calendário",                active: false },
];

const PORTE_OPTS = ["Todos","Pequeno","Médio","Grande"];

function calcScore(emp: Empresa): number {
  let score = 0;
  // Temperatura (30pts)
  if (emp.temperatura === "Quente") score += 30;
  else if (emp.temperatura === "Morno") score += 18;
  else score += 5;
  // Status (25pts)
  if (emp.status === "Fechado")    score += 25;
  else if (emp.status === "Proposta")   score += 20;
  else if (emp.status === "Em contato") score += 14;
  else score += 5;
  // Porte (20pts)
  if (emp.porte === "Grande") score += 20;
  else if (emp.porte === "Médio") score += 13;
  else score += 6;
  // Ticket (15pts)
  const t = emp.ticket_medio_estimado || 0;
  if (t >= 20000) score += 15;
  else if (t >= 5000) score += 10;
  else if (t > 0) score += 5;
  // Interação recente (10pts)
  if (emp.ultima_interacao) {
    const days = (Date.now() - new Date(emp.ultima_interacao).getTime()) / 86400000;
    if (days <= 7) score += 10;
    else if (days <= 30) score += 6;
    else score += 2;
  }
  return Math.min(score, 100);
}

function scoreColor(s: number) {
  if (s >= 70) return { color:"#83DDA8", bg:"rgba(39,174,96,0.12)", label:"Alto" };
  if (s >= 40) return { color:"#F2C879", bg:"rgba(230,126,34,0.12)", label:"Médio" };
  return { color:"#F7B8B1", bg:"rgba(231,76,60,0.12)", label:"Baixo" };
}

function porteColor(p: string) {
  if (p === "Grande") return "#C9B6E4";
  if (p === "Médio")  return "#9FD3EA";
  return "#83DDA8";
}

function initials(name: string) {
  return name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";
}
function avatarColor(name: string) {
  const c=["#9FD3EA","#83DDA8","#C9B6E4","#F2C879","#83DDA8","#F7B8B1"];
  return c[(name?.charCodeAt(0)||0)%c.length];
}

function ScoreBar({ score }: { score: number }) {
  const sc = scoreColor(score);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, height:6, borderRadius:6, background:"rgba(159,211,234,0.08)", maxWidth:60 }}>
        <div style={{ height:"100%", width:`${score}%`, borderRadius:6, background:sc.color, transition:"width 0.4s ease" }} />
      </div>
      <span style={{ fontSize:12, fontWeight:800, color:sc.color, minWidth:28 }}>{score}</span>
    </div>
  );
}

export default function TodosClientes() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuario, setUsuario] = useState<Usuario|null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPorte, setFilterPorte] = useState("Todos");
  const [sortField, setSortField] = useState<"nome"|"score"|"ticket_medio_estimado"|"porte">("score");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null);

  const token = getToken()||"";
  const headers = { Authorization:`Bearer ${token}` };

  // Carga inicial só na montagem: fetchAll depende de `headers`, recriado a cada
  // render — incluí-lo nas deps refetcharia em loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [empRes, meRes] = await Promise.all([
        fetch(`${API}/empresas`, { headers }),
        fetch(`${API}/me`, { headers }),
      ]);
      if (empRes.ok) setEmpresas(await empRes.json());
      if (meRes.ok)  setUsuario(await meRes.json());
    } catch {}
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    try {
      await fetch(`${API}/empresas/${id}`, { method:"DELETE", headers });
      setEmpresas(empresas.filter(e => e.empresa_id !== id));
    } catch {}
    setDeleteConfirm(null);
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const empresasComScore = empresas.map(e => ({ ...e, score: calcScore(e) }));

  const filtered = empresasComScore
    .filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q || e.nome.toLowerCase().includes(q) || e.cidade?.toLowerCase().includes(q) || e.segmento?.toLowerCase().includes(q);
      const matchPorte = filterPorte === "Todos" || e.porte === filterPorte;
      return matchSearch && matchPorte;
    })
    .sort((a, b) => {
      let va: any, vb: any;
      if (sortField === "score") { va = a.score; vb = b.score; }
      else if (sortField === "ticket_medio_estimado") { va = a.ticket_medio_estimado||0; vb = b.ticket_medio_estimado||0; }
      else { va = String(a[sortField]||""); vb = String(b[sortField]||""); }
      if (typeof va === "number") return sortDir==="asc" ? va-vb : vb-va;
      return sortDir==="asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const SortTh = ({ label, field }: { label:string; field:typeof sortField }) => (
    <button onClick={() => toggleSort(field)} style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", fontSize:11, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:"#9FD3EA" }}>
      {label}
      <ArrowUpDown style={{ width:10, height:10, opacity:sortField===field?1:0.4, color:sortField===field?"#9FD3EA":"inherit" }} />
    </button>
  );

  const counts = {
    total: empresas.length,
    lead: empresas.filter(e=>e.status==="Lead").length,
    contato: empresas.filter(e=>e.status==="Em contato").length,
    proposta: empresas.filter(e=>e.status==="Proposta").length,
    fechado: empresas.filter(e=>e.status==="Fechado").length,
  };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", position:"relative" }}>
      <style>{css}</style>

      {/* Background */}
      <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
        <FundoAzul />
      </div>

      {/* Sidebar */}
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
            <div key={item.label} className={`nav-item${item.active?" active":""}`} onClick={() => {
              if (item.label==="Dashboards") navigate("/dashboard");
              if (item.label==="Buscar Empresas") navigate("/buscar");
              if (item.label==="Cadastrar Empresas") navigate("/empresas/nova");
              if (item.label==="Todos os clientes") navigate("/clientes");
              if (item.label==="Gerenciamento") navigate("/gerenciamento");
              if (item.label==="Calendário") navigate("/calendario");
            }}>
              <item.icon style={{ width:16, height:16, flexShrink:0 }} />
              {item.label}
            </div>
          ))}
          {((usuario as any)?.is_gerente || (usuario as any)?.is_supervisor) && (
            <div className="nav-item" onClick={() => navigate("/equipe")}>
              <UserRoundCog style={{ width:16, height:16, flexShrink:0 }} />
              Equipe
            </div>
          )}
        </nav>
        <CardUsuario />
      </div>

      {/* Main */}
      <div style={{ flex:1, height:"100vh", overflowY:"auto", position:"relative", zIndex:5 }}>

        {/* Topbar */}
        <div style={{ position:"sticky", top:0, zIndex:20, padding:"14px 28px", background:"rgba(15,46,75,0.88)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(159,211,234,0.18)", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:18, fontWeight:800, color:"#EAF6FB", letterSpacing:"-0.02em" }}>Todos os Clientes</h1>
            <p style={{ fontSize:12, color:"#9FD3EA", marginTop:1 }}>{filtered.length} empresa{filtered.length!==1?"s":""} encontrada{filtered.length!==1?"s":""}</p>
          </div>
          <button onClick={fetchAll} style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <RefreshCw style={{ width:15, height:15, color:"#9FD3EA" }} />
          </button>
          <button onClick={() => navigate("/empresas/nova")} style={{ height:38, padding:"0 16px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize:"200% 200%", animation:"gradientShift 4s ease infinite", color:"#EAF6FB", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:6, boxShadow:"0 4px 14px rgba(159,211,234,0.30)" }}>
            <Plus style={{ width:15, height:15 }} /> Nova empresa
          </button>
        </div>

        <div style={{ padding:"22px 28px 40px", display:"flex", flexDirection:"column", gap:18 }}>

          {/* Summary chips */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {[
              { label:"Total",      value:counts.total,    color:"#9FD3EA" },
              { label:"Leads",      value:counts.lead,     color:"#9FD3EA" },
              { label:"Em contato", value:counts.contato,  color:"#F2C879" },
              { label:"Proposta",   value:counts.proposta, color:"#9FD3EA" },
              { label:"Fechados",   value:counts.fechado,  color:"#83DDA8" },
            ].map(s => (
              <div key={s.label} style={{ padding:"6px 14px", borderRadius:20, background:"rgba(18,59,94,0.55)", border:`1px solid ${s.color}25`, backdropFilter:"blur(8px)", display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ fontSize:16, fontWeight:900, color:s.color }}>{s.value}</span>
                <span style={{ fontSize:11, fontWeight:600, color:"#9FD3EA" }}>{s.label}</span>
              </div>
            ))}

            {/* Score legend */}
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8, padding:"6px 14px", borderRadius:20, background:"rgba(18,59,94,0.55)", border:"1px solid rgba(159,211,234,0.18)" }}>
              <Star style={{ width:12, height:12, color:"#F2C879" }} />
              <span style={{ fontSize:11, fontWeight:600, color:"#9FD3EA" }}>Score:</span>
              {[{l:"Alto",c:"#83DDA8"},{l:"Médio",c:"#F2C879"},{l:"Baixo",c:"#F7B8B1"}].map(s=>(
                <span key={s.l} style={{ fontSize:10, fontWeight:700, color:s.c, background:`${s.c}15`, padding:"2px 7px", borderRadius:10 }}>{s.l}</span>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:220, position:"relative" }}>
              <Search style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:"#9FD3EA" }} />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome, cidade, segmento..." style={{ width:"100%", height:38, paddingLeft:34, paddingRight:14, borderRadius:10, border:"1px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)", fontSize:13, color:"#EAF6FB", outline:"none" }} />
            </div>
            <div style={{ position:"relative" }}>
              <select value={filterPorte} onChange={e=>setFilterPorte(e.target.value)} style={{ height:38, padding:"0 32px 0 12px", borderRadius:10, border:"1px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)", fontSize:13, color:"#EAF6FB", outline:"none", cursor:"pointer", appearance:"none" }}>
                {PORTE_OPTS.map(s=><option key={s}>{s}</option>)}
              </select>
              <ChevronDown style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", width:13, height:13, color:"#9FD3EA", pointerEvents:"none" }} />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5, padding:"0 12px", height:38, borderRadius:10, background:"rgba(18,59,94,0.55)", border:"1px solid rgba(159,211,234,0.18)", fontSize:12, color:"#9FD3EA" }}>
              <Filter style={{ width:13, height:13 }} /> {filtered.length} resultado{filtered.length!==1?"s":""}
            </div>
          </div>

          {/* Table */}
          <motion.div className="glass-card" style={{ overflow:"hidden" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.38 }}>
            <div className="th">
              <SortTh label="Empresa" field="nome" />
              <SortTh label="Porte" field="porte" />
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:"#9FD3EA" }}>Segmento</span>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:"#9FD3EA" }}>Cidade</span>
              <SortTh label="Score ★" field="score" />
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:"#9FD3EA" }}>Ações</span>
            </div>

            {loading ? (
              Array.from({length:5}).map((_,i) => (
                <div key={i} className="client-row" style={{ cursor:"default" }}>
                  {Array.from({length:6}).map((_,j) => (
                    <div key={j} className="skeleton" style={{ height:18, width:`${60+Math.random()*30}%` }} />
                  ))}
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div style={{ padding:"48px 20px", textAlign:"center" }}>
                <Building2 style={{ width:36, height:36, color:"#9FD3EA", margin:"0 auto 12px" }} />
                <p style={{ fontSize:14, fontWeight:600, color:"#9FD3EA" }}>Nenhuma empresa encontrada</p>
              </div>
            ) : (
              <AnimatePresence>
                {filtered.map((emp, idx) => {
                  const pc = porteColor(emp.porte);
                  const sc = scoreColor(emp.score);
                  const isDeleting = deleteConfirm === emp.empresa_id;
                  return (
                    <motion.div
                      key={emp.empresa_id}
                      className="client-row"
                      initial={{ opacity:0, x:-8 }}
                      animate={{ opacity:1, x:0 }}
                      exit={{ opacity:0, height:0 }}
                      transition={{ duration:0.2, delay:idx*0.03 }}
                      onClick={() => navigate(`/clientes/${emp.empresa_id}`)}
                    >
                      {/* Nome */}
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:10, background:avatarColor(emp.nome), display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#EAF6FB", flexShrink:0 }}>
                          {initials(emp.nome)}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB" }}>{emp.nome}</div>
                          {emp.responsavel_principal && <div style={{ fontSize:10, color:"#9FD3EA" }}>{emp.responsavel_principal}</div>}
                        </div>
                      </div>

                      {/* Porte */}
                      <span className="chip" style={{ background:`${pc}15`, color:pc, border:`1px solid ${pc}30` }}>{emp.porte||"—"}</span>

                      {/* Segmento */}
                      <span style={{ fontSize:12, color:"#EAF6FB", fontWeight:500 }}>{emp.segmento||"—"}</span>

                      {/* Cidade */}
                      <span style={{ fontSize:12, color:"#EAF6FB", fontWeight:500 }}>{emp.cidade||"—"}</span>

                      {/* Score */}
                      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                        <ScoreBar score={emp.score} />
                        <span style={{ fontSize:9, fontWeight:700, color:sc.color, textTransform:"uppercase", letterSpacing:"0.05em" }}>{sc.label}</span>
                      </div>

                      {/* Ações */}
                      <div style={{ display:"flex", alignItems:"center", gap:5 }} onClick={e=>e.stopPropagation()}>
                        <button className="action-btn" style={{ background:"rgba(46,111,149,0.08)", color:"#9FD3EA" }} onClick={e=>{e.stopPropagation();navigate(`/clientes/${emp.empresa_id}`)}} title="Ver perfil">
                          <Eye style={{ width:13, height:13 }} />
                        </button>
                        <button className="action-btn" style={{ background:"rgba(142,68,173,0.08)", color:"#9FD3EA" }} onClick={e=>{e.stopPropagation();navigate(`/clientes/${emp.empresa_id}/editar`)}} title="Editar">
                          <Edit3 style={{ width:13, height:13 }} />
                        </button>
                        <button className="action-btn" style={{ background:isDeleting?"rgba(231,76,60,0.2)":"rgba(231,76,60,0.08)", color:"#F7B8B1" }} onClick={e=>handleDelete(e,emp.empresa_id)} title={isDeleting?"Confirmar exclusão":"Excluir"} onBlur={()=>setTimeout(()=>setDeleteConfirm(null),200)}>
                          {isDeleting ? <CheckSquare style={{ width:13, height:13 }} /> : <Trash2 style={{ width:13, height:13 }} />}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}