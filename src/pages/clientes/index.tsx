import { getToken } from "../../services/auth";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Search, Building2, Users, ClipboardList,
  Calendar, BarChart3, ChevronDown, Plus, Filter,
  Eye, Edit3, Trash2, ArrowUpDown, RefreshCw,
  Star, AlertTriangle, X, FileText, Map as MapIcon, List, Menu, Navigation, UserRoundCog,
} from "lucide-react";
import MapaProximidade from "../../components/MapaProximidade";
import ListaEmpresasProximas from "../../components/ListaEmpresasProximas";
import useIsMobile from "../../hooks/useIsMobile";

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
  @keyframes pulseDraft { 0%,100%{opacity:1} 50%{opacity:0.6} }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:rgba(255,255,255,0.65); transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(255,255,255,0.08); color:#fff; }
  .nav-item.active { background:rgba(255,255,255,0.14); color:#fff; font-weight:600; }
  .glass-card { background:rgba(255,255,255,0.72); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.9); border-radius:16px; }
  .client-row { display:grid; grid-template-columns:2.4fr 1fr 1fr 1fr 1fr 120px; align-items:center; padding:14px 20px; border-bottom:1px solid rgba(200,225,240,0.4); cursor:pointer; transition:background 0.15s; user-select:none; }
  .client-row:hover { background:rgba(41,128,185,0.04); }
  .client-row.draft-row { background:rgba(142,68,173,0.03); border-left:3px solid rgba(142,68,173,0.25); }
  .client-row.draft-row:hover { background:rgba(142,68,173,0.07); }
  .client-row:last-child { border-bottom:none; }
  .th { display:grid; grid-template-columns:2.4fr 1fr 1fr 1fr 1fr 120px; align-items:center; padding:10px 20px; border-bottom:1px solid rgba(200,225,240,0.5); }
  .chip { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
  .action-btn { width:30px; height:30px; border-radius:8px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
  .action-btn:hover { transform:translateY(-1px); }
  .filter-tab { padding:6px 14px; border-radius:20px; border:1.5px solid; cursor:pointer; font-size:12px; font-weight:600; transition:all 0.18s; white-space:nowrap; }
  .skeleton { background:linear-gradient(90deg,rgba(200,225,240,0.4) 25%,rgba(220,240,252,0.7) 50%,rgba(200,225,240,0.4) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(41,128,185,0.25); border-radius:4px; }
  @media (max-width:768px) {
    .th, .client-row { grid-template-columns: 1.6fr 1fr 92px !important; padding-left:14px !important; padding-right:14px !important; }
    .th > *:nth-child(2), .th > *:nth-child(3), .th > *:nth-child(4),
    .client-row > *:nth-child(2), .client-row > *:nth-child(3), .client-row > *:nth-child(4) { display:none !important; }
  }
`;

const API = "https://backend-crm-production-157b.up.railway.app";

interface Empresa {
  empresa_id: string; nome: string; segmento: string; porte: string;
  cidade: string; status: string; temperatura: string;
  ticket_medio_estimado: number | null; responsavel_principal: string;
  origem_lead: string; ultima_interacao: string | null; proxima_acao: string;
  endereco?: string | null; endereco_completo?: string | null;
  latitude?: number | null; longitude?: number | null;
}
interface Usuario { nome: string; cargo: string; }

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",                active: false },
  { icon: Search,          label: "Buscar Empresas",           active: false },
  { icon: Building2,       label: "Cadastrar Empresas",        active: false },
  { icon: Users,           label: "Todos os clientes",         active: true  },
  { icon: ClipboardList,   label: "Gerenciamento de clientes", active: false },
  { icon: Calendar,        label: "Calendário",                active: false },
];

const PORTE_OPTS = ["Todos","Pequeno","Médio","Grande"];

function calcScore(emp: Empresa): number {
  let s = 0;
  if(emp.temperatura==="Quente") s+=30; else if(emp.temperatura==="Morno") s+=18; else s+=5;
  if(emp.status==="Fechado") s+=25; else if(emp.status==="Proposta") s+=20; else if(emp.status==="Em contato") s+=14; else s+=5;
  if(emp.porte==="Grande") s+=20; else if(emp.porte==="Médio") s+=13; else s+=6;
  const t = emp.ticket_medio_estimado||0;
  if(t>=20000) s+=15; else if(t>=5000) s+=10; else if(t>0) s+=5;
  if(emp.ultima_interacao) {
    const d = (Date.now()-new Date(emp.ultima_interacao).getTime())/86400000;
    if(d<=7) s+=10; else if(d<=30) s+=6; else s+=2;
  }
  return Math.min(s,100);
}

function scoreColor(s: number) {
  if(s>=70) return { color:"#27ae60", bg:"rgba(39,174,96,0.12)", label:"Alto" };
  if(s>=40) return { color:"#e67e22", bg:"rgba(230,126,34,0.12)", label:"Médio" };
  return { color:"#e74c3c", bg:"rgba(231,76,60,0.12)", label:"Baixo" };
}
function porteColor(p: string) {
  if(p==="Grande") return "#8e44ad"; if(p==="Médio") return "#2980b9"; return "#27ae60";
}
function initials(n: string) { return n?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?"; }
function avatarColor(n: string) { const c=["#2980b9","#1abc9c","#8e44ad","#e67e22","#27ae60","#e74c3c"]; return c[(n?.charCodeAt(0)||0)%c.length]; }

function ScoreBar({ score }: { score: number }) {
  const sc = scoreColor(score);
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:6,borderRadius:6,background:"rgba(200,225,240,0.5)",maxWidth:60}}>
        <div style={{height:"100%",width:`${score}%`,borderRadius:6,background:sc.color,transition:"width 0.4s ease"}}/>
      </div>
      <span style={{fontSize:12,fontWeight:800,color:sc.color,minWidth:28}}>{score}</span>
    </div>
  );
}

function DeleteModal({ empresa, onConfirm, onCancel, deleting }: {
  empresa: Empresa; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(10,31,51,0.4)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center"}}
      onClick={deleting?undefined:onCancel}>
      <motion.div initial={{scale:0.88,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.92,opacity:0,y:12}}
        transition={{duration:0.2,ease:[0.4,0,0.2,1]}} onClick={e=>e.stopPropagation()}
        style={{width:420,background:"rgba(255,255,255,0.97)",backdropFilter:"blur(24px)",borderRadius:20,border:"1.5px solid rgba(220,38,38,0.2)",boxShadow:"0 24px 64px rgba(10,31,51,0.2)",padding:"28px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:4,background:"linear-gradient(90deg,#dc2626,#ef4444)",borderRadius:"20px 20px 0 0"}}/>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{width:60,height:60,borderRadius:16,background:"rgba(220,38,38,0.08)",border:"1.5px solid rgba(220,38,38,0.2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
            <AlertTriangle style={{width:28,height:28,color:"#dc2626"}}/>
          </div>
          <div style={{fontSize:17,fontWeight:800,color:"#0f2133",marginBottom:6}}>Confirmar Exclusão</div>
          <div style={{fontSize:13,color:"rgba(20,45,70,0.55)",lineHeight:1.55}}>Tem certeza que deseja excluir a empresa</div>
          <div style={{marginTop:8,padding:"10px 16px",borderRadius:10,background:"rgba(220,38,38,0.06)",border:"1px solid rgba(220,38,38,0.15)"}}>
            <div style={{fontSize:15,fontWeight:800,color:"#dc2626"}}>{empresa.nome}</div>
            {empresa.segmento&&<div style={{fontSize:11,color:"rgba(20,45,70,0.5)",marginTop:3}}>{empresa.segmento} · {empresa.cidade||"—"}</div>}
          </div>
          <div style={{marginTop:10,fontSize:12,color:"rgba(220,38,38,0.7)",fontWeight:600}}>⚠️ Esta ação não pode ser desfeita.</div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} disabled={deleting}
            style={{flex:1,height:44,borderRadius:10,border:"1.5px solid rgba(200,225,240,0.9)",background:"rgba(255,255,255,0.8)",fontSize:13,fontWeight:600,color:"rgba(20,45,70,0.6)",cursor:deleting?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,opacity:deleting?0.5:1}}>
            <X style={{width:14,height:14}}/> Cancelar
          </button>
          <button onClick={onConfirm} disabled={deleting}
            style={{flex:2,height:44,borderRadius:10,border:"none",background:deleting?"rgba(220,38,38,0.5)":"linear-gradient(135deg,#dc2626,#ef4444)",fontSize:13,fontWeight:700,color:"#fff",cursor:deleting?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:"0 4px 14px rgba(220,38,38,0.3)"}}>
            <Trash2 style={{width:14,height:14}}/>{deleting?"Excluindo...":"Sim, excluir empresa"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function TodosClientes() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuario, setUsuario] = useState<Usuario|null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPorte, setFilterPorte] = useState("Todos");
  const [filterRascunho, setFilterRascunho] = useState(false);
  const [sortField, setSortField] = useState<"nome"|"score"|"ticket_medio_estimado"|"porte">("score");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [view, setView] = useState<"lista"|"mapa"|"proximas">("lista");
  const [geocode, setGeocode] = useState<{rodando:boolean; feitas:number; restantes:number|null}|null>(null);
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Empresa|null>(null);
  const [deleting, setDeleting] = useState(false);

  const token = () => getToken()||"";
  const headers = () => ({ Authorization:`Bearer ${token()}` });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [empRes, meRes] = await Promise.all([
        fetch(`${API}/empresas`, { headers: headers() }),
        fetch(`${API}/me`, { headers: headers() }),
      ]);
      if(empRes.ok) setEmpresas(await empRes.json());
      if(meRes.ok)  setUsuario(await meRes.json());
    } catch {}
    setLoading(false);
  };

  const confirmDelete = async () => {
    if(!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/empresas/${deleteTarget.empresa_id}`, { method:"DELETE", headers: headers() });
      if(!res.ok) { const err = await res.json().catch(()=>({})); throw new Error(err.detail||`Erro ${res.status}`); }
      setEmpresas(prev=>prev.filter(e=>e.empresa_id!==deleteTarget.empresa_id));
      setDeleteTarget(null);
    } catch(e) { alert(e instanceof Error?e.message:"Erro ao excluir empresa"); }
    finally { setDeleting(false); }
  };

  // Geocodifica empresas sem coordenada (lote a lote) e recarrega o mapa
  const geocodificar = async () => {
    if (geocode?.rodando) return;
    setGeocode({ rodando: true, feitas: 0, restantes: null });
    let feitas = 0;
    try {
      for (let i = 0; i < 200; i++) {
        const res = await fetch(`${API}/empresas/geocodificar?limite=15`, { method: "POST", headers: headers() });
        if (!res.ok) break;
        const d = await res.json();
        feitas += d.geocodificadas || 0;
        setGeocode({ rodando: true, feitas, restantes: d.restantes ?? null });
        if (!d.restantes || !d.processadas) break;
      }
    } catch {}
    await fetchAll();
    setGeocode({ rodando: false, feitas, restantes: 0 });
  };

  const toggleSort = (field: typeof sortField) => {
    if(sortField===field) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const empresasComScore = empresas.map(e=>({...e, score:calcScore(e)}));
  const totalRascunhos = empresas.filter(e=>e.status==="Rascunho").length;

  const filtered = empresasComScore
    .filter(e => {
      const q = search.toLowerCase();
      const ms = !q || e.nome.toLowerCase().includes(q) || e.cidade?.toLowerCase().includes(q) || e.segmento?.toLowerCase().includes(q);
      const mp = filterPorte==="Todos" || e.porte===filterPorte;
      const mr = filterRascunho ? e.status==="Rascunho" : true;
      return ms && mp && mr;
    })
    .sort((a,b) => {
      let va: any, vb: any;
      if(sortField==="score") { va=a.score; vb=b.score; }
      else if(sortField==="ticket_medio_estimado") { va=a.ticket_medio_estimado||0; vb=b.ticket_medio_estimado||0; }
      else { va=String(a[sortField]||""); vb=String(b[sortField]||""); }
      if(typeof va==="number") return sortDir==="asc"?va-vb:vb-va;
      return sortDir==="asc"?va.localeCompare(vb):vb.localeCompare(va);
    });

  const SortTh = ({ label, field }: { label:string; field:typeof sortField }) => (
    <button onClick={()=>toggleSort(field)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase" as const,color:"rgba(20,45,70,0.5)"}}>
      {label}<ArrowUpDown style={{width:10,height:10,opacity:sortField===field?1:0.4,color:sortField===field?"#2980b9":"inherit"}}/>
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
    <div style={{display:"flex",height:"100vh",overflow:"hidden",position:"relative"}}>
      <style>{css}</style>

      <AnimatePresence>
        {deleteTarget&&(
          <DeleteModal empresa={deleteTarget} onConfirm={confirmDelete}
            onCancel={()=>{if(!deleting)setDeleteTarget(null);}} deleting={deleting}/>
        )}
      </AnimatePresence>

      {/* Background */}
      <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(145deg,#c8e8f5 0%,#d6eef5 30%,#cceee8 65%,#c5eae0 100%)"}}/>
        <div style={{position:"absolute",inset:0,opacity:0.4,backgroundImage:"radial-gradient(circle,rgba(41,128,185,0.2) 1px,transparent 1px)",backgroundSize:"22px 22px"}}/>
        {[
          {w:400,h:400,top:"-60px",left:"8%",anim:"float1 18s ease-in-out infinite",op:0.11,c1:"#2980b9",c2:"#1abc9c"},
          {w:260,h:260,top:"45%",left:"-50px",anim:"float2 22s ease-in-out infinite",op:0.09,c1:"#1abc9c",c2:"#2ecc71"},
          {w:320,h:320,top:"65%",left:"60%",anim:"float3 26s ease-in-out infinite",op:0.08,c1:"#2980b9",c2:"#8e44ad"},
          {w:180,h:180,top:"15%",left:"78%",anim:"float4 20s ease-in-out infinite",op:0.10,c1:"#27ae60",c2:"#1abc9c"},
          {w:220,h:220,top:"80%",left:"25%",anim:"float5 24s ease-in-out infinite",op:0.07,c1:"#e67e22",c2:"#f39c12"},
        ].map((c,i)=>(
          <div key={i} style={{position:"absolute",width:c.w,height:c.h,top:c.top,left:c.left,borderRadius:"50%",background:`radial-gradient(circle at 40% 40%,${c.c1},${c.c2})`,opacity:c.op,animation:c.anim,filter:"blur(2px)"}}/>
        ))}
      </div>

      {/* Backdrop mobile */}
      {isMobile && menuOpen && (
        <div onClick={()=>setMenuOpen(false)} style={{position:"fixed",inset:0,background:"rgba(10,31,51,0.45)",zIndex:999}}/>
      )}

      {/* Sidebar */}
      <div style={{width:220,flexShrink:0,height:"100vh",overflowY:"auto",zIndex:1000,background:"linear-gradient(180deg,#1a3a5c 0%,#0f2a44 60%,#0a1f33 100%)",boxShadow:"4px 0 24px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",padding:"0 12px 20px",
        position: isMobile ? "fixed" : "relative", top:0, left:0,
        transform: isMobile && !menuOpen ? "translateX(-100%)" : "translateX(0)",
        transition:"transform 0.28s ease"}}>
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
              if(item.label==="Buscar Empresas")navigate("/buscar");
              if(item.label==="Cadastrar Empresas")navigate("/empresas/nova");
              if(item.label==="Todos os clientes")navigate("/clientes");
              if(item.label==="Gerenciamento de clientes")navigate("/gerenciamento");
              if(item.label==="Calendário")navigate("/calendario");
            }}>
              <item.icon style={{width:16,height:16,flexShrink:0}}/>{item.label}
            </div>
          ))}
          {(usuario as any)?.is_gerente && (
            <div className="nav-item" onClick={()=>navigate("/equipe")}>
              <UserRoundCog style={{width:16,height:16,flexShrink:0}}/>Equipe
            </div>
          )}
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
      <div style={{flex:1,height:"100vh",overflowY:"auto",position:"relative",zIndex:5}}>

        {/* Topbar */}
        <div style={{position:"sticky",top:0,zIndex:20,padding:isMobile?"12px 14px":"14px 28px",background:"rgba(210,238,248,0.75)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.6)",display:"flex",alignItems:"center",gap:isMobile?10:14}}>
          {isMobile && (
            <button onClick={()=>setMenuOpen(true)} style={{width:36,height:36,borderRadius:10,border:"1px solid rgba(200,225,240,0.9)",background:"rgba(255,255,255,0.75)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Menu style={{width:18,height:18,color:"#2980b9"}}/>
            </button>
          )}
          <div style={{flex:1,minWidth:0}}>
            <h1 style={{fontSize:18,fontWeight:800,color:"#0f2133",letterSpacing:"-0.02em"}}>Todos os Clientes</h1>
            <p style={{fontSize:12,color:"rgba(20,45,70,0.5)",marginTop:1}}>{filtered.length} empresa{filtered.length!==1?"s":""} encontrada{filtered.length!==1?"s":""}</p>
          </div>
          {/* Toggle Lista / Mapa */}
          <div style={{display:"flex",padding:3,borderRadius:10,background:"rgba(255,255,255,0.6)",border:"1px solid rgba(200,225,240,0.9)",gap:2}}>
            {([
              {k:"lista",icon:List,label:"Lista"},
              {k:"mapa", icon:MapIcon,label:"Mapa"},
              {k:"proximas", icon:Navigation,label:"Próximas"},
            ] as const).map(o=>(
              <button key={o.k} onClick={()=>setView(o.k)}
                style={{display:"flex",alignItems:"center",gap:5,height:30,padding:"0 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,
                  background: view===o.k ? "linear-gradient(135deg,#2980b9,#1abc9c)" : "transparent",
                  color: view===o.k ? "#fff" : "rgba(20,45,70,0.55)"}}>
                <o.icon style={{width:13,height:13}}/> {o.label}
              </button>
            ))}
          </div>
          <button onClick={fetchAll} style={{width:36,height:36,borderRadius:10,border:"1px solid rgba(200,225,240,0.9)",background:"rgba(255,255,255,0.75)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <RefreshCw style={{width:15,height:15,color:"#2980b9"}}/>
          </button>
          <button onClick={()=>navigate("/empresas/nova")} title="Nova empresa" style={{height:38,padding:isMobile?"0 12px":"0 16px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#2980b9,#1abc9c,#2ecc71,#2980b9)",backgroundSize:"200% 200%",animation:"gradientShift 4s ease infinite",color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 14px rgba(41,128,185,0.35)",whiteSpace:"nowrap",flexShrink:0}}>
            <Plus style={{width:15,height:15}}/>{!isMobile && " Nova empresa"}
          </button>
        </div>

        <div style={{padding:isMobile?"16px 14px 32px":"22px 28px 40px",display:"flex",flexDirection:"column",gap:18}}>

          {/* Summary chips */}
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[
              {label:"Total",value:counts.total,color:"#2980b9"},
              {label:"Leads",value:counts.lead,color:"#95a5a6"},
              {label:"Em contato",value:counts.contato,color:"#e67e22"},
              {label:"Proposta",value:counts.proposta,color:"#8e44ad"},
              {label:"Fechados",value:counts.fechado,color:"#27ae60"},
            ].map(s=>(
              <div key={s.label} style={{padding:"6px 14px",borderRadius:20,background:"rgba(255,255,255,0.72)",border:`1px solid ${s.color}25`,backdropFilter:"blur(8px)",display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:16,fontWeight:900,color:s.color}}>{s.value}</span>
                <span style={{fontSize:11,fontWeight:600,color:"rgba(20,45,70,0.5)"}}>{s.label}</span>
              </div>
            ))}
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,padding:"6px 14px",borderRadius:20,background:"rgba(255,255,255,0.72)",border:"1px solid rgba(200,225,240,0.5)"}}>
              <Star style={{width:12,height:12,color:"#e67e22"}}/>
              <span style={{fontSize:11,fontWeight:600,color:"rgba(20,45,70,0.5)"}}>Score:</span>
              {[{l:"Alto",c:"#27ae60"},{l:"Médio",c:"#e67e22"},{l:"Baixo",c:"#e74c3c"}].map(s=>(
                <span key={s.l} style={{fontSize:10,fontWeight:700,color:s.c,background:`${s.c}15`,padding:"2px 7px",borderRadius:10}}>{s.l}</span>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:220,position:"relative"}}>
              <Search style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"rgba(20,45,70,0.35)"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome, cidade, segmento..."
                style={{width:"100%",height:38,paddingLeft:34,paddingRight:14,borderRadius:10,border:"1px solid rgba(200,225,240,0.9)",background:"rgba(255,255,255,0.78)",fontSize:13,color:"#1a2e40",outline:"none"}}/>
            </div>
            <div style={{position:"relative"}}>
              <select value={filterPorte} onChange={e=>setFilterPorte(e.target.value)}
                style={{height:38,padding:"0 32px 0 12px",borderRadius:10,border:"1px solid rgba(200,225,240,0.9)",background:"rgba(255,255,255,0.78)",fontSize:13,color:"#1a2e40",outline:"none",cursor:"pointer",appearance:"none"}}>
                {PORTE_OPTS.map(s=><option key={s}>{s}</option>)}
              </select>
              <ChevronDown style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"rgba(20,45,70,0.4)",pointerEvents:"none"}}/>
            </div>

            {/* ── FILTRO RASCUNHO ── */}
            <button
              onClick={()=>setFilterRascunho(!filterRascunho)}
              className="filter-tab"
              style={{
                borderColor: filterRascunho ? "rgba(142,68,173,0.5)" : "rgba(200,225,240,0.9)",
                background: filterRascunho ? "rgba(142,68,173,0.1)" : "rgba(255,255,255,0.78)",
                color: filterRascunho ? "#8e44ad" : "rgba(20,45,70,0.6)",
                display:"flex",alignItems:"center",gap:6,
              }}
            >
              <FileText style={{width:13,height:13}}/>
              Rascunhos
              {totalRascunhos > 0 && (
                <span style={{
                  fontSize:10,fontWeight:800,padding:"1px 6px",borderRadius:10,
                  background: filterRascunho ? "rgba(142,68,173,0.2)" : "rgba(142,68,173,0.12)",
                  color:"#8e44ad",animation:"pulseDraft 2s ease infinite"
                }}>
                  {totalRascunhos}
                </span>
              )}
              {filterRascunho && <X style={{width:11,height:11}}/>}
            </button>

            <div style={{display:"flex",alignItems:"center",gap:5,padding:"0 12px",height:38,borderRadius:10,background:"rgba(255,255,255,0.6)",border:"1px solid rgba(200,225,240,0.7)",fontSize:12,color:"rgba(20,45,70,0.5)"}}>
              <Filter style={{width:13,height:13}}/> {filtered.length} resultado{filtered.length!==1?"s":""}
            </div>
          </div>

          {/* Banner quando filtro rascunho ativo */}
          <AnimatePresence>
            {filterRascunho && (
              <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:12,background:"rgba(142,68,173,0.07)",border:"1.5px solid rgba(142,68,173,0.2)"}}>
                <FileText style={{width:16,height:16,color:"#8e44ad",flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:600,color:"#8e44ad"}}>
                  Exibindo apenas cadastros salvos como rascunho — complete as informações para transformar em lead
                </span>
                <button onClick={()=>setFilterRascunho(false)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center"}}>
                  <X style={{width:14,height:14,color:"#8e44ad"}}/>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mapa de proximidade (custo zero) */}
          {view === "mapa" ? (
            <motion.div className="glass-card" style={{padding:"18px 20px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.38}}>
              <MapaProximidade empresas={filtered} onGeocodificar={geocodificar} geocode={geocode} />
            </motion.div>
          ) : view === "proximas" ? (
            /* Empresas próximas da minha localização atual (Geolocation + Waze) */
            <motion.div className="glass-card" style={{padding:"18px 20px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.38}}>
              <ListaEmpresasProximas empresas={filtered} />
            </motion.div>
          ) : (
          /* Table */
          <motion.div className="glass-card" style={{overflow:"hidden"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.38}}>
            <div className="th">
              <SortTh label="Empresa" field="nome"/>
              <SortTh label="Porte" field="porte"/>
              <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase" as const,color:"rgba(20,45,70,0.5)"}}>Segmento</span>
              <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase" as const,color:"rgba(20,45,70,0.5)"}}>Cidade</span>
              <SortTh label="Score ★" field="score"/>
              <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase" as const,color:"rgba(20,45,70,0.5)"}}>Ações</span>
            </div>

            {loading ? (
              Array.from({length:5}).map((_,i)=>(
                <div key={i} className="client-row" style={{cursor:"default"}}>
                  {Array.from({length:6}).map((_,j)=>(
                    <div key={j} className="skeleton" style={{height:18,width:`${60+Math.random()*30}%`}}/>
                  ))}
                </div>
              ))
            ) : filtered.length===0 ? (
              <div style={{padding:"48px 20px",textAlign:"center"}}>
                <Building2 style={{width:36,height:36,color:"rgba(41,128,185,0.3)",margin:"0 auto 12px"}}/>
                <p style={{fontSize:14,fontWeight:600,color:"rgba(20,45,70,0.5)"}}>
                  {filterRascunho ? "Nenhum rascunho encontrado" : "Nenhuma empresa encontrada"}
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {filtered.map((emp,idx)=>{
                  const pc = porteColor(emp.porte);
                  const sc = scoreColor(emp.score);
                  const isDraft = emp.status === "Rascunho";
                  return (
                    <motion.div key={emp.empresa_id}
                      className={`client-row${isDraft?" draft-row":""}`}
                      initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} exit={{opacity:0,height:0}}
                      transition={{duration:0.2,delay:idx*0.03}}
                      onClick={()=>navigate(isDraft?`/clientes/${emp.empresa_id}/editar`:`/clientes/${emp.empresa_id}`,{state:{from:"/clientes"}})}>

                      {/* Nome */}
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:34,height:34,borderRadius:10,background:isDraft?"rgba(142,68,173,0.15)":avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isDraft?"#8e44ad":"#fff",flexShrink:0,border:isDraft?"1.5px dashed rgba(142,68,173,0.4)":"none"}}>
                          {isDraft ? <FileText style={{width:14,height:14}}/> : initials(emp.nome)}
                        </div>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{fontSize:13,fontWeight:700,color:"#0f2133"}}>{emp.nome}</div>
                            {isDraft && (
                              <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"rgba(142,68,173,0.12)",color:"#8e44ad",border:"1px solid rgba(142,68,173,0.2)",animation:"pulseDraft 2s ease infinite"}}>RASCUNHO</span>
                            )}
                          </div>
                          {emp.responsavel_principal&&<div style={{fontSize:10,color:"rgba(20,45,70,0.4)"}}>{emp.responsavel_principal}</div>}
                        </div>
                      </div>

                      {/* Porte */}
                      <span className="chip" style={{background:`${pc}15`,color:pc,border:`1px solid ${pc}30`}}>{emp.porte||"—"}</span>
                      {/* Segmento */}
                      <span style={{fontSize:12,color:"rgba(20,45,70,0.6)",fontWeight:500}}>{emp.segmento||"—"}</span>
                      {/* Cidade */}
                      <span style={{fontSize:12,color:"rgba(20,45,70,0.6)",fontWeight:500}}>{emp.cidade||"—"}</span>

                      {/* Score ou badge rascunho */}
                      {isDraft ? (
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:11,color:"rgba(20,45,70,0.4)",fontStyle:"italic"}}>Incompleto</span>
                        </div>
                      ) : (
                        <div style={{display:"flex",flexDirection:"column",gap:3}}>
                          <ScoreBar score={emp.score}/>
                          <span style={{fontSize:9,fontWeight:700,color:sc.color,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{sc.label}</span>
                        </div>
                      )}

                      {/* Ações */}
                      <div style={{display:"flex",alignItems:"center",gap:5}} onClick={e=>e.stopPropagation()}>
                        <button className="action-btn" style={{background:"rgba(41,128,185,0.08)",color:"#2980b9"}}
                          onClick={e=>{e.stopPropagation();navigate(isDraft?`/clientes/${emp.empresa_id}/editar`:`/clientes/${emp.empresa_id}`,{state:{from:"/clientes"}});}} title="Ver perfil">
                          <Eye style={{width:13,height:13}}/>
                        </button>
                        <button className="action-btn" style={{background:"rgba(142,68,173,0.08)",color:"#8e44ad"}}
                          onClick={e=>{e.stopPropagation();navigate(`/clientes/${emp.empresa_id}/editar`);}} title="Editar">
                          <Edit3 style={{width:13,height:13}}/>
                        </button>
                        <button className="action-btn" style={{background:"rgba(231,76,60,0.08)",color:"#e74c3c"}}
                          onClick={e=>{e.stopPropagation();setDeleteTarget(emp);}} title="Excluir empresa">
                          <Trash2 style={{width:13,height:13}}/>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}