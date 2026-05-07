import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Search, Building2, Users, ClipboardList,
  Calendar, BarChart3, Plus, RefreshCw, Eye,
  ChevronRight, MapPin, TrendingUp, ArrowRight,
  Phone, Mail, MessageCircle, History, Save, X,
  CalendarClock, Clock, Filter, Edit3,
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
  .drop-active { border-color:rgba(41,128,185,0.55)!important; background:rgba(41,128,185,0.06)!important; }
  .skeleton { background:linear-gradient(90deg,rgba(200,225,240,0.4) 25%,rgba(220,240,252,0.7) 50%,rgba(200,225,240,0.4) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; }
  .move-btn { padding:4px 9px; border-radius:6px; font-size:9px; font-weight:700; cursor:pointer; border:none; transition:all 0.15s; white-space:nowrap; }
  .move-btn:hover { opacity:0.85; transform:scale(1.03); }
  .list-row { background:rgba(255,255,255,0.78); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.9); border-radius:12px; transition:all 0.18s; }
  .list-row:hover { box-shadow:0 4px 16px rgba(41,128,185,0.1); border-color:rgba(41,128,185,0.25); transform:translateY(-1px); }
  .mini-input, .mini-select { height:26px; border-radius:7px; border:1px solid rgba(200,225,240,0.85); background:rgba(255,255,255,0.78); color:#0f2133; font-size:10px; font-weight:600; outline:none; padding:0 8px; min-width:0; }
  .mini-input:focus, .mini-select:focus { border-color:rgba(41,128,185,0.55); box-shadow:0 0 0 2px rgba(41,128,185,0.08); }
  .quick-btn { width:24px; height:24px; border-radius:6px; border:1px solid rgba(200,225,240,0.75); background:rgba(255,255,255,0.72); display:flex; align-items:center; justify-content:center; cursor:pointer; color:#2980b9; text-decoration:none; transition:all 0.15s; }
  .quick-btn:hover { transform:translateY(-1px); border-color:rgba(41,128,185,0.45); background:#fff; }
  .chip-select { height:32px; border-radius:9px; border:1px solid rgba(200,225,240,0.75); background:rgba(255,255,255,0.68); color:rgba(20,45,70,0.66); font-size:11px; font-weight:700; outline:none; padding:0 9px; cursor:pointer; }
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
  data_proxima_acao?: string | null;
  status_atualizado_em?: string | null;
  motivo_perdido?: string | null;
  ultima_interacao: string | null;
  origem_lead: string;
  contato_email?: string | null;
  contato_celular?: string | null;
  contato_whatsapp?: string | null;
}

interface Usuario { nome: string; cargo: string; }

interface HistoricoStatus {
  historico_id: string;
  status_anterior: string | null;
  status_novo: string;
  observacao: string | null;
  alterado_em: string;
}

type ViewMode = "kanban" | "lista";
type SortBy = "score" | "valor" | "proxima" | "parado" | "nome";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards", active: false },
  { icon: Search, label: "Buscar Empresas", active: false },
  { icon: Building2, label: "Cadastrar Empresas", active: false },
  { icon: Users, label: "Todos os clientes", active: false },
  { icon: ClipboardList, label: "Gerenciamento de clientes", active: true },
  { icon: Calendar, label: "Calendario", active: false },
];

const PIPELINE = [
  { key:"Lead", label:"Lead", color:"#64748b", light:"rgba(148,163,184,0.12)", dot:"#94a3b8" },
  { key:"Em contato", label:"Em contato", color:"#2980b9", light:"rgba(41,128,185,0.1)", dot:"#60a5fa" },
  { key:"Visita agendada", label:"Visita agendada", color:"#0891b2", light:"rgba(8,145,178,0.1)", dot:"#22d3ee" },
  { key:"Proposta", label:"Proposta", color:"#7c3aed", light:"rgba(124,58,237,0.1)", dot:"#a78bfa" },
  { key:"Negociação", label:"Negociação", color:"#d97706", light:"rgba(217,119,6,0.1)", dot:"#fbbf24" },
  { key:"Fechado", label:"Fechado", color:"#16a34a", light:"rgba(22,163,74,0.1)", dot:"#4ade80" },
  { key:"Perdido", label:"Perdido", color:"#dc2626", light:"rgba(220,38,38,0.1)", dot:"#f87171" },
];

const TEMPS = [
  { key:"Quente", icon:"Q", color:"#c0392b", bg:"rgba(192,57,43,0.1)" },
  { key:"Morno", icon:"M", color:"#d68910", bg:"rgba(214,137,16,0.1)" },
  { key:"Frio", icon:"F", color:"#2980b9", bg:"rgba(41,128,185,0.1)" },
];

const PROXIMAS_ACOES = [
  "Ligar",
  "Enviar WhatsApp",
  "Enviar email",
  "Conectar no LinkedIn",
  "Agendar reunião",
  "Agendar visita",
  "Enviar apresentação",
  "Enviar proposta",
  "Fazer follow-up",
  "Solicitar documentos",
  "Aguardar retorno",
];

function initials(n: string) { return n?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?"; }
function avatarColor(n: string) { const c=["#2980b9","#1abc9c","#8e44ad","#e67e22","#27ae60","#e74c3c"]; return c[(n?.charCodeAt(0)||0)%c.length]; }
function porteInfo(p: string) {
  if(p==="Grande") return { color:"#7c3aed", bg:"rgba(124,58,237,0.1)" };
  if(p==="Médio") return { color:"#2980b9", bg:"rgba(41,128,185,0.1)" };
  return { color:"#16a34a", bg:"rgba(22,163,74,0.1)" };
}
function calcScore(e: Empresa) {
  let s=0;
  if(e.temperatura==="Quente")s+=30;else if(e.temperatura==="Morno")s+=18;else s+=5;
  if(e.status==="Fechado")s+=25;else if(e.status==="Proposta"||e.status==="Negociação")s+=20;else if(e.status==="Visita agendada")s+=17;else if(e.status==="Em contato")s+=14;else if(e.status==="Perdido")s-=20;else s+=5;
  if(e.porte==="Grande")s+=20;else if(e.porte==="Médio")s+=13;else s+=6;
  const t=e.ticket_medio_estimado||0;if(t>=20000)s+=15;else if(t>=5000)s+=10;else if(t>0)s+=5;
  if(e.ultima_interacao){const d=(Date.now()-new Date(e.ultima_interacao).getTime())/86400000;if(d<=7)s+=10;else if(d<=30)s+=6;else s+=2;}
  const action=nextActionInfo(e);
  if(action.status==="atrasada")s-=8;else if(action.status==="hoje")s+=6;else if(action.status==="proxima")s+=4;
  return Math.max(0, Math.min(s,100));
}
function scoreColor(s: number) {
  if(s>=70) return { color:"#16a34a", bg:"rgba(22,163,74,0.12)" };
  if(s>=40) return { color:"#d97706", bg:"rgba(217,119,6,0.12)" };
  return { color:"#dc2626", bg:"rgba(220,38,38,0.1)" };
}
function formatMoney(v?: number | null) {
  return v ? `R$ ${v.toLocaleString("pt-BR")}` : "Definir valor";
}
function parseMoney(v: string) {
  const normalized = v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
function phoneDigits(v?: string | null) {
  return (v||"").replace(/\D/g, "");
}
function whatsappUrl(v?: string | null) {
  const d = phoneDigits(v);
  if(!d) return "";
  return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
}
function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}
function formatDate(value?: string | null) {
  if(!value) return "Sem data";
  return new Date(`${dateOnly(value)}T12:00:00`).toLocaleDateString("pt-BR");
}
function daysBetween(value?: string | null) {
  if(!value) return 0;
  return Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
}
function daysInStage(e: Empresa) {
  return Math.max(0, daysBetween(e.status_atualizado_em || e.ultima_interacao));
}
function nextActionInfo(e: Empresa) {
  const date = dateOnly(e.data_proxima_acao);
  if(!date) return { label:"Sem data", status:"sem-data", color:"rgba(20,45,70,0.45)", bg:"rgba(200,225,240,0.35)" };
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(`${date}T00:00:00`);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if(diff < 0) return { label:`Atrasada ${Math.abs(diff)}d`, status:"atrasada", color:"#dc2626", bg:"rgba(220,38,38,0.1)" };
  if(diff === 0) return { label:"Hoje", status:"hoje", color:"#d97706", bg:"rgba(217,119,6,0.12)" };
  return { label:`Em ${diff}d`, status:"proxima", color:"#2980b9", bg:"rgba(41,128,185,0.1)" };
}
function uniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort((a,b)=>a.localeCompare(b,"pt-BR"));
}

export default function Gerenciamento() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuario, setUsuario] = useState<Usuario|null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTemp, setFilterTemp] = useState("Todas");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterSegmento, setFilterSegmento] = useState("Todos");
  const [filterCidade, setFilterCidade] = useState("Todas");
  const [filterOrigem, setFilterOrigem] = useState("Todas");
  const [filterAction, setFilterAction] = useState("Todas");
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [view, setView] = useState<ViewMode>("kanban");
  const [movingId, setMovingId] = useState<string|null>(null);
  const [draggedId, setDraggedId] = useState<string|null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string|null>(null);
  const [editValorId, setEditValorId] = useState<string|null>(null);
  const [valorDraft, setValorDraft] = useState("");
  const [historyEmpresa, setHistoryEmpresa] = useState<Empresa|null>(null);
  const [historyItems, setHistoryItems] = useState<HistoricoStatus[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
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

  const updateLocal = (id: string, patch: Partial<Empresa>) => {
    setEmpresas(p=>p.map(e=>e.empresa_id===id?{...e,...patch}:e));
  };

  const savePatch = async (id: string, patch: Partial<Empresa>) => {
    await fetch(`${API}/empresas/${id}`,{method:"PUT",headers:hdrs,body:JSON.stringify(patch)});
  };

  const updateStatus = async (id: string, status: string) => {
    const current = empresas.find(e=>e.empresa_id===id);
    if(!current || current.status===status) return;

    let motivo_perdido: string | null | undefined = undefined;
    if(status==="Perdido") {
      const motivo = window.prompt("Motivo da perda");
      if(motivo === null) return;
      motivo_perdido = motivo.trim() || "Nao informado";
    } else {
      motivo_perdido = null;
    }

    setMovingId(id);
    updateLocal(id,{status,motivo_perdido,status_atualizado_em:new Date().toISOString()});
    try { await savePatch(id,{status,motivo_perdido}); } catch {}
    setTimeout(()=>setMovingId(null),400);
  };

  const updateTemp = async (id: string, temperatura: string, ev?: React.MouseEvent) => {
    ev?.stopPropagation();
    updateLocal(id,{temperatura});
    try { await savePatch(id,{temperatura}); } catch {}
  };

  const saveValor = async (id: string, ev?: React.MouseEvent) => {
    ev?.stopPropagation();
    const valor = parseMoney(valorDraft);
    updateLocal(id,{ticket_medio_estimado:valor});
    setEditValorId(null);
    try { await savePatch(id,{ticket_medio_estimado:valor}); } catch {}
  };

  const updateNextAction = async (id: string, patch: Partial<Empresa>) => {
    updateLocal(id, patch);
    try { await savePatch(id, patch); } catch {}
  };

  const openHistory = async (emp: Empresa, ev: React.MouseEvent) => {
    ev.stopPropagation();
    setHistoryEmpresa(emp);
    setHistoryItems([]);
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/empresas/${emp.empresa_id}/historico-status`,{headers:hdrs});
      if(res.ok) setHistoryItems(await res.json());
    } catch {}
    setHistoryLoading(false);
  };

  const segmentos = uniqueOptions(empresas.map(e=>e.segmento));
  const cidades = uniqueOptions(empresas.map(e=>e.cidade));
  const origens = uniqueOptions(empresas.map(e=>e.origem_lead));

  const filtered = empresas
    .filter(e => {
      const q=search.toLowerCase();
      const actionStatus = nextActionInfo(e).status;
      return (!q||e.nome.toLowerCase().includes(q)||e.segmento?.toLowerCase().includes(q)||e.cidade?.toLowerCase().includes(q)||e.responsavel_principal?.toLowerCase().includes(q))
        &&(filterTemp==="Todas"||e.temperatura===filterTemp)
        &&(filterStatus==="Todos"||e.status===filterStatus)
        &&(filterSegmento==="Todos"||e.segmento===filterSegmento)
        &&(filterCidade==="Todas"||e.cidade===filterCidade)
        &&(filterOrigem==="Todas"||e.origem_lead===filterOrigem)
        &&(filterAction==="Todas"||actionStatus===filterAction);
    })
    .sort((a,b)=>{
      if(sortBy==="nome") return a.nome.localeCompare(b.nome,"pt-BR");
      if(sortBy==="valor") return (b.ticket_medio_estimado||0)-(a.ticket_medio_estimado||0);
      if(sortBy==="proxima") return (new Date(dateOnly(a.data_proxima_acao)||"2999-12-31").getTime())-(new Date(dateOnly(b.data_proxima_acao)||"2999-12-31").getTime());
      if(sortBy==="parado") return daysInStage(b)-daysInStage(a);
      return calcScore(b)-calcScore(a);
    });

  const byStatus=(s:string)=>filtered.filter(e=>e.status===s);
  const totalTicket=filtered.reduce((a,e)=>a+(e.ticket_medio_estimado||0),0);
  const avgTicket=filtered.length>0?Math.round(totalTicket/filtered.length):0;
  const totalFechado=empresas.filter(e=>e.status==="Fechado").length;
  const totalPerdido=empresas.filter(e=>e.status==="Perdido").length;
  const conversao=empresas.length>0?((totalFechado/empresas.length)*100).toFixed(1):"0";
  const perda=empresas.length>0?((totalPerdido/empresas.length)*100).toFixed(1):"0";

  const renderQuickActions = (emp: Empresa) => {
    const phone = emp.contato_celular || emp.contato_whatsapp;
    return (
      <div style={{display:"flex",gap:4}}>
        {phone&&<a className="quick-btn" href={`tel:${phoneDigits(phone)}`} onClick={e=>e.stopPropagation()} title="Ligar"><Phone style={{width:12,height:12}}/></a>}
        {emp.contato_whatsapp&&<a className="quick-btn" href={whatsappUrl(emp.contato_whatsapp)} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} title="WhatsApp"><MessageCircle style={{width:12,height:12}}/></a>}
        {emp.contato_email&&<a className="quick-btn" href={`mailto:${emp.contato_email}`} onClick={e=>e.stopPropagation()} title="Email"><Mail style={{width:12,height:12}}/></a>}
        <button className="quick-btn" onClick={e=>openHistory(emp,e)} title="Historico"><History style={{width:12,height:12}}/></button>
      </div>
    );
  };

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",position:"relative"}}>
      <style>{css}</style>

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
              if(item.label==="Calendario")navigate("/calendario");
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

      <div style={{flex:1,height:"100vh",overflow:"hidden",display:"flex",flexDirection:"column",position:"relative",zIndex:5}}>
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

          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
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
                {label:"Perda",value:`${perda}%`,color:"#dc2626"},
              ].map(s=>(
                <div key={s.label} style={{textAlign:"right"}}>
                  <div style={{fontSize:9,fontWeight:700,color:"rgba(20,45,70,0.4)",textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.label}</div>
                  <div style={{fontSize:14,fontWeight:900,color:s.color}}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,color:"rgba(20,45,70,0.45)",fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.06em"}}>
              <Filter style={{width:12,height:12}}/> Filtros
            </div>
            <select className="chip-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="Todos">Todos os status</option>
              {PIPELINE.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <select className="chip-select" value={filterSegmento} onChange={e=>setFilterSegmento(e.target.value)}>
              <option value="Todos">Todos segmentos</option>
              {segmentos.map(v=><option key={v}>{v}</option>)}
            </select>
            <select className="chip-select" value={filterCidade} onChange={e=>setFilterCidade(e.target.value)}>
              <option value="Todas">Todas cidades</option>
              {cidades.map(v=><option key={v}>{v}</option>)}
            </select>
            <select className="chip-select" value={filterOrigem} onChange={e=>setFilterOrigem(e.target.value)}>
              <option value="Todas">Todas origens</option>
              {origens.map(v=><option key={v}>{v}</option>)}
            </select>
            <select className="chip-select" value={filterAction} onChange={e=>setFilterAction(e.target.value)}>
              <option value="Todas">Todas ações</option>
              <option value="atrasada">Atrasadas</option>
              <option value="hoje">Hoje</option>
              <option value="proxima">Próximas</option>
              <option value="sem-data">Sem data</option>
            </select>
            <select className="chip-select" value={sortBy} onChange={e=>setSortBy(e.target.value as SortBy)}>
              <option value="score">Ordenar por score</option>
              <option value="valor">Maior valor</option>
              <option value="proxima">Próxima ação</option>
              <option value="parado">Mais tempo parado</option>
              <option value="nome">Nome</option>
            </select>
          </div>
        </div>

        <div style={{flex:1,overflow:"auto",padding:"18px 24px"}}>
          {view==="kanban"&&(
            <div style={{display:"flex",gap:14,minWidth:"max-content",alignItems:"flex-start"}}>
              {PIPELINE.map(col=>{
                const cards=byStatus(col.key);
                const colTicket=cards.reduce((a,e)=>a+(e.ticket_medio_estimado||0),0);
                const avgStageDays=cards.length?Math.round(cards.reduce((a,e)=>a+daysInStage(e),0)/cards.length):0;
                return(
                  <div
                    key={col.key}
                    style={{width:280,flexShrink:0,display:"flex",flexDirection:"column"}}
                    onDragOver={ev=>{ev.preventDefault();setDragOverStatus(col.key);}}
                    onDragLeave={()=>setDragOverStatus(null)}
                    onDrop={ev=>{ev.preventDefault();const id=ev.dataTransfer.getData("text/plain")||draggedId;if(id)updateStatus(id,col.key);setDraggedId(null);setDragOverStatus(null);}}
                  >
                    <div className={dragOverStatus===col.key?"drop-active":""} style={{marginBottom:12,padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.65)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.85)"}}>
                      <div style={{height:3,borderRadius:3,background:col.color,marginBottom:10}}/>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:col.dot}}/>
                        <span style={{fontSize:14,fontWeight:800,color:"#0f2133"}}>{col.label}</span>
                        <span style={{marginLeft:"auto",fontSize:11,fontWeight:800,color:col.color,background:`${col.color}18`,padding:"1px 7px",borderRadius:8}}>{cards.length}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:10,color:"rgba(20,45,70,0.45)",fontWeight:600}}>
                        <span>{colTicket>0?`R$ ${colTicket.toLocaleString("pt-BR")}`:"Sem valor"}</span>
                        <span>{avgStageDays}d médios</span>
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:10,overflowY:"auto",maxHeight:"calc(100vh - 385px)",paddingRight:2,paddingBottom:8,minHeight:120}}>
                      {loading?([1,2].map(i=><div key={i} className="skeleton" style={{height:190,borderRadius:14}}/>)):
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
                        const next=nextActionInfo(emp);
                        return(
                          <motion.div
                            key={emp.empresa_id}
                            className="kanban-card"
                            draggable
                            onDragStartCapture={ev=>{setDraggedId(emp.empresa_id);ev.dataTransfer.setData("text/plain",emp.empresa_id);ev.dataTransfer.effectAllowed="move";}}
                            onDragEndCapture={()=>{setDraggedId(null);setDragOverStatus(null);}}
                            style={{opacity:movingId===emp.empresa_id?0.45:1}}
                            initial={{opacity:0,y:10}}
                            animate={{opacity:movingId===emp.empresa_id?0.45:1,y:0}}
                            exit={{opacity:0,scale:0.95}}
                            transition={{duration:0.2,delay:idx*0.04}}
                            onClick={()=>navigate(`/clientes/${emp.empresa_id}`)}
                          >
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
                              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:next.color,fontWeight:700}}>
                                <CalendarClock style={{width:9,height:9,flexShrink:0}}/>
                                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.proxima_acao||"Sem próxima ação"} · {next.label}</span>
                              </div>
                              {emp.status==="Perdido"&&emp.motivo_perdido&&<div style={{fontSize:10,color:"#dc2626",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Motivo: {emp.motivo_perdido}</div>}
                            </div>
                            <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
                              {emp.porte&&<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:pi.bg,color:pi.color}}>{emp.porte}</span>}
                              {emp.origem_lead&&<span style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:4,background:"rgba(200,225,240,0.4)",color:"rgba(20,45,70,0.5)"}}>{emp.origem_lead}</span>}
                              <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"rgba(41,128,185,0.08)",color:"#2980b9"}}>{daysInStage(emp)}d na etapa</span>
                            </div>
                            <div style={{marginBottom:10}} onClick={e=>e.stopPropagation()}>
                              {editValorId===emp.empresa_id?(
                                <div style={{display:"flex",gap:5}}>
                                  <input className="mini-input" autoFocus value={valorDraft} onChange={e=>setValorDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveValor(emp.empresa_id);if(e.key==="Escape")setEditValorId(null);}} placeholder="Valor contrato" style={{flex:1}}/>
                                  <button className="quick-btn" onClick={e=>saveValor(emp.empresa_id,e)}><Save style={{width:12,height:12}}/></button>
                                  <button className="quick-btn" onClick={()=>setEditValorId(null)}><X style={{width:12,height:12}}/></button>
                                </div>
                              ):(
                                <button onClick={e=>{e.stopPropagation();setEditValorId(emp.empresa_id);setValorDraft(emp.ticket_medio_estimado?.toString()||"");}} style={{width:"100%",height:28,borderRadius:8,border:"1px solid rgba(39,174,96,0.25)",background:"rgba(39,174,96,0.07)",color:"#16a34a",fontSize:12,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 9px"}}>
                                  <span>{formatMoney(emp.ticket_medio_estimado)}</span><Edit3 style={{width:11,height:11}}/>
                                </button>
                              )}
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 110px",gap:5,marginBottom:10}} onClick={e=>e.stopPropagation()}>
                              <select className="mini-select" value={emp.proxima_acao||""} onChange={e=>updateNextAction(emp.empresa_id,{proxima_acao:e.target.value})}>
                                <option value="">Próxima ação</option>
                                {PROXIMAS_ACOES.map(a=><option key={a}>{a}</option>)}
                              </select>
                              <input className="mini-input" type="date" value={dateOnly(emp.data_proxima_acao)} onChange={e=>updateNextAction(emp.empresa_id,{data_proxima_acao:e.target.value || null})}/>
                            </div>
                            <div style={{height:1,background:"rgba(200,225,240,0.5)",marginBottom:10}}/>
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <div style={{display:"flex",gap:3}}>
                                {TEMPS.map(t=>(
                                  <button key={t.key} onClick={ev=>updateTemp(emp.empresa_id,t.key,ev)} style={{width:24,height:24,borderRadius:5,border:`1.5px solid ${emp.temperatura===t.key?t.color:"rgba(200,225,240,0.7)"}`,background:emp.temperatura===t.key?t.bg:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:10,fontWeight:800,color:emp.temperatura===t.key?t.color:"rgba(20,45,70,0.5)",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center"}}>{t.icon}</button>
                                ))}
                              </div>
                              <div style={{flex:1}}/>
                              {renderQuickActions(emp)}
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

          {view==="lista"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:1320}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 105px 145px 120px 100px 110px",gap:12,padding:"6px 18px",fontSize:10,fontWeight:700,color:"rgba(20,45,70,0.45)",letterSpacing:"0.07em",textTransform:"uppercase"}}>
                <span>Empresa</span><span>Status</span><span>Temperatura</span><span>Cidade</span><span>Score</span><span>Próxima ação</span><span>Valor</span><span>Parado</span><span>Ações</span>
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
                const next=nextActionInfo(emp);
                return(
                  <motion.div key={emp.empresa_id} className="list-row" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.18,delay:idx*0.03}} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 105px 145px 120px 100px 110px",gap:12,alignItems:"center",padding:"12px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                      <div style={{width:36,height:36,borderRadius:9,background:avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(emp.nome)}</div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#0f2133",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.nome}</div>
                        <div style={{fontSize:10,color:"rgba(20,45,70,0.4)"}}>{emp.segmento||"—"}</div>
                      </div>
                    </div>
                    <select value={emp.status} onChange={e=>updateStatus(emp.empresa_id,e.target.value)} style={{height:30,padding:"0 8px",borderRadius:7,border:`1px solid ${si.color}40`,background:si.light,fontSize:11,fontWeight:700,color:si.color,outline:"none",cursor:"pointer"}}>
                      {PIPELINE.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                    <div style={{display:"flex",gap:3}}>
                      {TEMPS.map(t=>(
                        <button key={t.key} onClick={ev=>updateTemp(emp.empresa_id,t.key,ev)} style={{width:26,height:26,borderRadius:6,border:`1.5px solid ${emp.temperatura===t.key?t.color:"rgba(200,225,240,0.7)"}`,background:emp.temperatura===t.key?t.bg:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:10,fontWeight:800,color:emp.temperatura===t.key?t.color:"rgba(20,45,70,0.5)",transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center"}}>{t.icon}</button>
                      ))}
                    </div>
                    <span style={{fontSize:12,color:"rgba(20,45,70,0.6)"}}>{emp.cidade||"—"}</span>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:36,height:4,borderRadius:4,background:"rgba(200,225,240,0.5)"}}>
                        <div style={{height:"100%",width:`${score}%`,borderRadius:4,background:sc.color}}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:800,color:sc.color}}>{score}</span>
                    </div>
                    <div>
                      <div style={{fontSize:11,fontWeight:800,color:next.color}}>{emp.proxima_acao||"—"}</div>
                      <div style={{fontSize:10,color:"rgba(20,45,70,0.45)"}}>{formatDate(emp.data_proxima_acao)}</div>
                    </div>
                    <div onClick={e=>e.stopPropagation()}>
                      {editValorId===emp.empresa_id?(
                        <div style={{display:"flex",gap:4}}>
                          <input className="mini-input" autoFocus value={valorDraft} onChange={e=>setValorDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveValor(emp.empresa_id);if(e.key==="Escape")setEditValorId(null);}} style={{width:76}}/>
                          <button className="quick-btn" onClick={e=>saveValor(emp.empresa_id,e)}><Save style={{width:12,height:12}}/></button>
                        </div>
                      ):(
                        <button onClick={e=>{e.stopPropagation();setEditValorId(emp.empresa_id);setValorDraft(emp.ticket_medio_estimado?.toString()||"");}} style={{height:30,width:"100%",borderRadius:8,border:"1px solid rgba(39,174,96,0.25)",background:"rgba(39,174,96,0.06)",fontSize:11,fontWeight:800,color:"#16a34a",cursor:"pointer"}}>
                          {formatMoney(emp.ticket_medio_estimado)}
                        </button>
                      )}
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:"rgba(20,45,70,0.55)"}}>{daysInStage(emp)} dias</span>
                    <div style={{display:"flex",gap:5,alignItems:"center"}}>
                      {renderQuickActions(emp)}
                      <button onClick={()=>navigate(`/clientes/${emp.empresa_id}`)} style={{width:30,height:30,borderRadius:8,border:"1px solid rgba(200,225,240,0.7)",background:"rgba(255,255,255,0.7)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                        <ChevronRight style={{width:13,height:13,color:"#2980b9"}}/>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

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
            {label:"Taxa de perda",value:`${perda}%`,color:"#dc2626"},
          ].map(s=>(
            <div key={s.label} style={{display:"flex",alignItems:"center",gap:24}}>
              <div style={{width:1,height:32,background:"rgba(200,225,240,0.6)"}}/>
              <div>
                <div style={{fontSize:9,color:"rgba(20,45,70,0.45)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.label}</div>
                <div style={{fontSize:16,fontWeight:800,color:s.color}}>{s.value}</div>
              </div>
            </div>
          ))}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            <Clock style={{width:18,height:18,color:"#2980b9"}}/>
            <div>
              <div style={{fontSize:12,fontWeight:800,color:"#2980b9"}}>{filtered.filter(e=>nextActionInfo(e).status==="atrasada").length} atrasadas</div>
              <div style={{fontSize:9,color:"rgba(20,45,70,0.4)"}}>próximas ações</div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {historyEmpresa&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{position:"fixed",inset:0,zIndex:40,background:"rgba(10,31,51,0.32)",display:"flex",justifyContent:"flex-end"}} onClick={()=>setHistoryEmpresa(null)}>
            <motion.div initial={{x:360}} animate={{x:0}} exit={{x:360}} transition={{duration:0.2}} style={{width:360,height:"100%",background:"rgba(255,255,255,0.96)",boxShadow:"-12px 0 34px rgba(10,31,51,0.18)",padding:22,overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
                <div style={{width:34,height:34,borderRadius:10,background:"rgba(41,128,185,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <History style={{width:16,height:16,color:"#2980b9"}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:900,color:"#0f2133"}}>Histórico do status</div>
                  <div style={{fontSize:11,color:"rgba(20,45,70,0.5)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{historyEmpresa.nome}</div>
                </div>
                <button onClick={()=>setHistoryEmpresa(null)} className="quick-btn"><X style={{width:13,height:13}}/></button>
              </div>
              {historyLoading?(
                <div className="skeleton" style={{height:90,borderRadius:12}}/>
              ):historyItems.length===0?(
                <div style={{padding:"30px 0",textAlign:"center",fontSize:12,fontWeight:700,color:"rgba(20,45,70,0.45)"}}>Sem movimentações registradas.</div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {historyItems.map(item=>(
                    <div key={item.historico_id} style={{border:"1px solid rgba(200,225,240,0.7)",borderRadius:12,padding:12,background:"rgba(255,255,255,0.75)"}}>
                      <div style={{fontSize:12,fontWeight:800,color:"#0f2133"}}>{item.status_anterior || "Entrada"} → {item.status_novo}</div>
                      <div style={{fontSize:10,color:"rgba(20,45,70,0.45)",marginTop:3}}>{formatDate(item.alterado_em)}</div>
                      {item.observacao&&<div style={{fontSize:11,color:"rgba(20,45,70,0.65)",marginTop:8,fontWeight:600}}>{item.observacao}</div>}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
