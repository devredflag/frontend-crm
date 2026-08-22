import { getToken, setAccessToken } from "../../services/auth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Search, Building2, Users, ClipboardList,
  Calendar, BarChart3, Plus, RefreshCw, Eye,
  ChevronRight, MapPin, TrendingUp,
  X,
  CalendarClock, Clock, Filter, AlertCircle, Menu, UserRoundCog, FileText,
} from "lucide-react";
import useIsMobile from "../../hooks/useIsMobile";
import VendasPanel from "./VendasPanel";
import MapaProximidade from "../../components/MapaProximidade";
import ListaEmpresasProximas from "../../components/ListaEmpresasProximas";
import CardUsuario from "../../components/CardUsuario";
import AbasGerenciamento, { cssAbasGerenciamento } from "../../components/AbasGerenciamento";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes pulse-red { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.3)}50%{box-shadow:0 0 0 6px rgba(220,38,38,0)} }

  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:8px; cursor:pointer; font-size:13.5px; font-weight:500; color:#ffffff; transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:#ffffff; color:#fff; }
  .nav-item.active { background:#ffffff; color:#fff; font-weight:600; }

  .kanban-card {
    background:#ffffff;
    border:1px solid #E3E6E9;
    border-radius:8px;
    padding:13px 13px 10px;
    cursor:pointer;
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
    position:relative;
    overflow:hidden;
    z-index:1;
  }
  .kanban-card:hover {
    transform:translateY(-2px);
    box-shadow: none;
    border-color:#2563EB;
    z-index:10;
    overflow:visible;
  }

  .card-expand-section {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.24s ease;
    pointer-events: none;
  }
  .kanban-card:hover .card-expand-section {
    max-height: 260px;
    opacity: 1;
    pointer-events: all;
  }

  .drop-active { border-color:#2563EB!important; background:#EFF4FE!important; }
  .skeleton { background:#E3E6E9; background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; }

  .list-row { background:#ffffff; border:1px solid #ffffff; border-radius:8px; transition:all 0.18s; }
  .list-row:hover { box-shadow:0 4px 16px #EFF4FE; border-color:#EFF4FE; transform:translateY(-1px); }

  .mini-status-select { width:100%; height:30px; border-radius:8px; border:1px solid #E3E6E9; background:#ffffff; font-size:11px; font-weight:700; outline:none; padding:0 26px 0 10px; cursor:pointer; appearance:none; }
  .mini-status-select:focus { border-color:#2563EB; box-shadow:0 0 0 2px #EFF4FE; }

  .mini-input { height:30px; border-radius:8px; border:1px solid #E3E6E9; background:#ffffff; font-size:11px; font-weight:500; outline:none; padding:0 8px; width:100%; color:#16191D; transition:border-color 0.15s; }
  .mini-input:focus { border-color:#2563EB; box-shadow:0 0 0 2px #EFF4FE; }
  .mini-input[type="date"] { padding:0 6px; font-size:10.5px; }

  .mini-select { height:30px; border-radius:8px; border:1px solid #E3E6E9; background:#ffffff; font-size:11px; font-weight:600; outline:none; padding:0 8px; cursor:pointer; width:100%; color:#16191D; transition:border-color 0.15s; }
  .mini-select:focus { border-color:#2563EB; }

  .quick-btn { width:24px; height:24px; border-radius:6px; border:1px solid #E3E6E9; background:#ffffff; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#2563EB; text-decoration:none; transition:all 0.15s; }
  .quick-btn:hover { transform:translateY(-1px); border-color:#2563EB; background:#fff; }

  .chip-select { height:32px; border-radius:9px; border:1px solid #E3E6E9; background:#ffffff; color:#16191D; font-size:11px; font-weight:700; outline:none; padding:0 9px; cursor:pointer; }

  .overdue-btn { display:flex; align-items:center; gap:6px; padding:6px 14px; border-radius:8px; border:1.5px solid rgba(220,38,38,0.35); background:rgba(220,38,38,0.07); cursor:pointer; transition:all 0.18s; animation:pulse-red 2.5s infinite; }
  .overdue-btn:hover { background:rgba(220,38,38,0.14); border-color:rgba(220,38,38,0.55); transform:translateY(-1px); animation:none; }

  .overdue-row { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:8px; border:1px solid rgba(220,38,38,0.2); background:#ffffff; transition:all 0.15s; }
  .overdue-row:hover { border-color:rgba(220,38,38,0.4); box-shadow:0 3px 12px rgba(220,38,38,0.1); }

  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:#EFF4FE; border-radius:4px; }
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

interface Usuario { nome: string; cargo: string; is_gerente?: boolean; }

type ViewMode = "kanban" | "lista" | "mapa" | "proximas";
type SortBy = "score" | "valor" | "proxima" | "parado" | "nome";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards", active: false },
  { icon: Search, label: "Buscar Empresas", active: false },
  { icon: Building2, label: "Cadastrar Empresas", active: false },
  { icon: Users, label: "Todos os clientes", active: false },
  { icon: ClipboardList, label: "Gerenciamento", active: true },
  { icon: Calendar, label: "Calendario", active: false },
];

const PIPELINE = [
  { key:"Lead", label:"Lead", color:"#64748b", light:"rgba(148,163,184,0.12)", dot:"#94a3b8" },
  { key:"Em contato", label:"Em contato", color:"#2563EB", light:"#EFF4FE", dot:"#60a5fa" },
  { key:"Visita agendada", label:"Visita agendada", color:"#0891b2", light:"rgba(8,145,178,0.1)", dot:"#22d3ee" },
  { key:"Proposta", label:"Proposta", color:"#7c3aed", light:"rgba(124,58,237,0.1)", dot:"#a78bfa" },
  { key:"Negociação", label:"Negociação", color:"#d97706", light:"rgba(217,119,6,0.1)", dot:"#fbbf24" },
  { key:"Fechado", label:"Fechado", color:"#16a34a", light:"rgba(22,163,74,0.1)", dot:"#4ade80" },
  { key:"Perdido", label:"Perdido", color:"#B42318", light:"rgba(220,38,38,0.1)", dot:"#f87171" },
];

// ✅ MUDANÇA 1: Ícones de temperatura alterados para emojis
const TEMPS = [
  { key:"Quente", icon:"🔥", color:"#B42318", bg:"rgba(192,57,43,0.1)" },
  { key:"Morno",  icon:"🌡️", color:"#d68910", bg:"rgba(214,137,16,0.1)" },
  { key:"Frio",   icon:"❄️", color:"#2563EB", bg:"#EFF4FE" },
];

function initials(n: string) { return n?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?"; }
function avatarColor(n: string) { const c=["#2563EB","#2563EB","#5B6570","#8A5A00","#0F7B4F","#B42318"]; return c[(n?.charCodeAt(0)||0)%c.length]; }
function porteInfo(p: string) {
  if(p==="Grande") return { color:"#7c3aed", bg:"rgba(124,58,237,0.1)" };
  if(p==="Médio") return { color:"#2563EB", bg:"#EFF4FE" };
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
  return { color:"#B42318", bg:"rgba(220,38,38,0.1)" };
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

// ✅ MUDANÇA 2: Pluralização correta de "dia" / "dias"
function daysLabel(d: number) {
  if(d === 0) return "0 dias na etapa";
  return `${d} ${d === 1 ? "dia" : "dias"} na etapa`;
}

function nextActionInfo(e: Empresa) {
  const date = dateOnly(e.data_proxima_acao);
  if(!date) return { label:"Sem data", status:"sem-data", color:"#5B6570", bg:"#E3E6E9" };
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(`${date}T00:00:00`);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if(diff < 0) return { label:`Atrasada ${Math.abs(diff)}d`, status:"atrasada", color:"#B42318", bg:"rgba(220,38,38,0.1)" };
  if(diff === 0) return { label:"Hoje", status:"hoje", color:"#d97706", bg:"rgba(217,119,6,0.12)" };
  return { label:`Em ${diff}d`, status:"proxima", color:"#2563EB", bg:"#EFF4FE" };
}
function uniqueOptions(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort((a,b)=>a.localeCompare(b,"pt-BR"));
}

export default function Gerenciamento() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
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

  // ✅ MUDANÇA 3: Painel de atrasadas
  const [showOverduePanel, setShowOverduePanel] = useState(false);

  // Abas do Gerenciamento: carteira de clientes x orçamentos/vendas.
  const [aba, setAba] = useState<"clientes"|"vendas">("clientes");
  // Progresso da geocodificação em lote, usada pela visão de mapa.
  const [geocode, setGeocode] = useState<{rodando:boolean;feitas:number;restantes:number|null}|null>(null);
  // Separa quem ainda é lead novo de quem já virou cliente em andamento.
  const [filtroLead, setFiltroLead] = useState<"todos"|"leads"|"clientes">("todos");

  // Token sempre fresco — garante que salva mesmo após re-login
  const hdrs = () => ({
    "Content-Type":"application/json",
    Authorization:`Bearer ${getToken()||""}`,
  });

  // Carga inicial só na montagem: fetchAll é recriado a cada render — incluí-lo
  // nas deps refetcharia em loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [e,m] = await Promise.all([
        fetch(`${API}/empresas`,{headers:hdrs()}),
        fetch(`${API}/me`,{headers:hdrs()}),
      ]);
      if(e.ok) setEmpresas(await e.json());
      if(m.ok) setUsuario(await m.json());
    } catch {}
    setLoading(false);
  };

  // Geocodifica empresas sem coordenada (em lotes) e recarrega o mapa.
  const geocodificar = async () => {
    if (geocode?.rodando) return;
    setGeocode({ rodando: true, feitas: 0, restantes: null });
    let feitas = 0;
    try {
      for (let i = 0; i < 200; i++) {
        const res = await fetch(`${API}/empresas/geocodificar?limite=15`, { method: "POST", headers: hdrs() });
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

  const updateLocal = (id: string, patch: Partial<Empresa>) => {
    setEmpresas(p=>p.map(e=>e.empresa_id===id?{...e,...patch}:e));
  };

  const savePatch = async (id: string, patch: Partial<Empresa>) => {
    const res = await fetch(`${API}/empresas/${id}`,{method:"PUT",headers:hdrs(),body:JSON.stringify(patch)});
    if(res.status === 401) {
      setAccessToken(null);
      navigate("/login");
      return;
    }
    if(!res.ok) throw new Error(`Erro ao salvar: ${res.status}`);
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
        &&(filterAction==="Todas"||actionStatus===filterAction)
        // Lead novo = ainda na 1a etapa do funil; cliente = já avançou dela.
        &&(filtroLead==="todos"||(filtroLead==="leads"?e.status==="Lead":e.status!=="Lead"));
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

  // ✅ MUDANÇA 3: Lista de empresas com ação atrasada
  const overdueEmpresas = empresas.filter(e => nextActionInfo(e).status === "atrasada")
    .sort((a,b) => {
      const da = dateOnly(a.data_proxima_acao) || "";
      const db = dateOnly(b.data_proxima_acao) || "";
      return da.localeCompare(db);
    });

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",position:"relative"}}>
      <style>{css + cssAbasGerenciamento}</style>

      {/* Background */}
      <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",inset:0,background:"#F6F7F8"}}/>
        
      </div>

      {/* Sidebar */}
      {isMobile && menuOpen && (
        <div onClick={()=>setMenuOpen(false)} style={{position:"fixed",inset:0,background:"rgba(10,31,51,0.45)",zIndex:999}}/>
      )}
      <div style={{width:220,flexShrink:0,height:"100vh",overflowY:"auto",zIndex:1000,background:"#1a3a5c",boxShadow:"none",display:"flex",flexDirection:"column",padding:"0 12px 20px",
        position: isMobile ? "fixed" : "relative", top:0, left:0,
        transform: isMobile && !menuOpen ? "translateX(-100%)" : "translateX(0)",
        transition:"transform 0.28s ease"}}>
        <div style={{padding:"22px 4px 24px",borderBottom:"1px solid #ffffff",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:8,background:"#2563EB",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"none"}}>
              <BarChart3 style={{width:18,height:18,color:"#fff"}}/>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>Prospecção</div>
              <div style={{fontSize:11,fontWeight:700,background:"#2563EB",backgroundSize:"200% 200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"gradientShift 4s ease infinite"}}>CRM</div>
            </div>
          </div>
        </div>
        <nav style={{flex:1,display:"flex",flexDirection:"column",gap:2}}>
          {navItems.map(item=>(
            <div key={item.label} className={`nav-item${item.active?" active":""}`} onClick={()=>{
              if(item.label==="Dashboards")navigate("/dashboard");
              if(item.label==="Buscar Empresas")navigate("/buscar");
              if(item.label==="Todos os clientes")navigate("/clientes");
              if(item.label==="Cadastrar Empresas")navigate("/empresas/nova");
              if(item.label==="Gerenciamento")navigate("/gerenciamento");
              if(item.label==="Calendario")navigate("/calendario");
            }}>
              <item.icon style={{width:16,height:16,flexShrink:0}}/>{item.label}
            </div>
          ))}
          {(usuario?.is_gerente || (usuario as any)?.is_supervisor) && (
            <div className="nav-item" onClick={()=>navigate("/equipe")}>
              <UserRoundCog style={{width:16,height:16,flexShrink:0}}/>Equipe
            </div>
          )}
        </nav>
        <CardUsuario />
      </div>

      {/* Main content */}
      <div style={{flex:1,height:"100vh",overflow:"hidden",display:"flex",flexDirection:"column",position:"relative",zIndex:5}}>

        {/* Header */}
        <div style={{padding:isMobile?"12px 14px":"16px 28px",background:"rgba(210,238,248,0.85)", borderBottom:"1px solid #ffffff",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:isMobile?10:16,marginBottom:14}}>
            {isMobile && (
              <button onClick={()=>setMenuOpen(true)} style={{width:36,height:36,borderRadius:8,border:"1px solid #E3E6E9",background:"#ffffff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Menu style={{width:18,height:18,color:"#2563EB"}}/>
              </button>
            )}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:700,color:"#5B6570",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3}}>Gerenciamento</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <h1 style={{fontSize:22,fontWeight:900,color:"#16191D",letterSpacing:"-0.03em"}}>
                  {aba==="clientes"?"Pipeline de Vendas":"Orçamentos e vendas"}
                </h1>
                {aba==="clientes"
                  ? <TrendingUp style={{width:18,height:18,color:"#0F7B4F"}}/>
                  : <FileText style={{width:18,height:18,color:"#2563EB"}}/>}
              </div>
              <p style={{fontSize:12,color:"#5B6570",marginTop:2}}>
                {aba==="clientes"
                  ? "Acompanhe suas oportunidades e mova os negócios adiante."
                  : "Monte orçamentos, envie para o cliente e acompanhe o fechamento."}
              </p>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={fetchAll} style={{width:38,height:38,borderRadius:8,border:"1px solid #E3E6E9",background:"#ffffff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <RefreshCw style={{width:15,height:15,color:"#2563EB"}}/>
              </button>
              {aba==="clientes" && (<>
              <div style={{display:"flex",gap:3,background:"#ffffff",borderRadius:8,padding:3,border:"1px solid #E3E6E9"}}>
                {(["kanban","lista","mapa","proximas"] as const).map(v=>(
                  <button key={v} onClick={()=>setView(v)} style={{padding:"5px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:view===v?"#2563EB":"transparent",color:view===v?"#fff":"#5B6570",transition:"all 0.18s"}}>
                    {v==="kanban"?"Visão do funil":v==="lista"?"Lista":v==="mapa"?"Mapa":"Próximas"}
                  </button>
                ))}
              </div>
              <button onClick={()=>navigate("/empresas/nova")} style={{height:38,padding:"0 16px",borderRadius:8,border:"none",cursor:"pointer",background:"#2563EB",backgroundSize:"200% 200%",animation:"gradientShift 4s ease infinite",color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6,boxShadow:"none"}}>
                <Plus style={{width:15,height:15}}/> Nova oportunidade
              </button>
              </>)}
            </div>
          </div>

          {/* Busca, filtros e stats só valem para a carteira de clientes */}
          {aba==="clientes" && (<>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
            <div style={{position:"relative",width:240}}>
              <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"#5B6570"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empresa..." style={{width:"100%",height:34,paddingLeft:28,borderRadius:9,border:"1px solid #E3E6E9",background:"#ffffff",fontSize:12,color:"#16191D",outline:"none"}}/>
            </div>
            {/* Novos leads x clientes já em andamento — conversa com a aba de vendas */}
            {([
              {key:"todos"    as const, label:"Todos"},
              {key:"leads"    as const, label:"Novos leads"},
              {key:"clientes" as const, label:"Clientes"},
            ]).map(f=>{
              const active=filtroLead===f.key;
              return(
                <button key={f.key} onClick={()=>setFiltroLead(f.key)} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${active?"rgba(142,68,173,0.45)":"#E3E6E9"}`,background:active?"rgba(142,68,173,0.1)":"#ffffff",color:active?"#7d3c98":"#5B6570",fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.15s"}}>
                  {f.label}
                </button>
              );
            })}
            {["Todas","Quente","Morno","Frio"].map(t=>{
              const info=TEMPS.find(x=>x.key===t);
              const active=filterTemp===t;
              return(
                <button key={t} onClick={()=>setFilterTemp(t)} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${active?(info?.color||"#2563EB")+"50":"#E3E6E9"}`,background:active?(info?.bg||"#EFF4FE"):"#ffffff",color:active?(info?.color||"#2563EB"):"#5B6570",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4,transition:"all 0.15s"}}>
                  {info?.icon} {t}
                </button>
              );
            })}
            <div style={{marginLeft:"auto",display:"flex",gap:16,alignItems:"center"}}>
              {[
                {label:"Pipeline",value:`R$ ${totalTicket.toLocaleString("pt-BR")}`,color:"#2563EB"},
                {label:"Ticket médio",value:`R$ ${avgTicket.toLocaleString("pt-BR")}`,color:"#5B6570"},
                {label:"Conversão",value:`${conversao}%`,color:"#0F7B4F"},
                {label:"Perda",value:`${perda}%`,color:"#B42318"},
              ].map(s=>(
                <div key={s.label} style={{textAlign:"right"}}>
                  <div style={{fontSize:9,fontWeight:700,color:"#5B6570",textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.label}</div>
                  <div style={{fontSize:14,fontWeight:900,color:s.color}}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,color:"#5B6570",fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.06em"}}>
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
          </>)}
        </div>

        {/* Abas: Clientes x Vendas — as duas areas navegaveis da tela */}
        <div style={{padding:isMobile?"12px 14px":"14px 24px",flexShrink:0,borderBottom:"1px solid #E3E6E9"}}>
          <AbasGerenciamento aba={aba} onChange={setAba} />
        </div>

        {aba==="vendas" ? (
          <VendasPanel empresas={empresas.map(e=>({empresa_id:e.empresa_id,nome:e.nome}))} />
        ) : (
        <>
        {/* Board */}
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
                    {/* Column header */}
                    <div className={dragOverStatus===col.key?"drop-active":""} style={{marginBottom:12,padding:"12px 14px",borderRadius:8,background:"#ffffff", border:"1px solid #ffffff"}}>
                      <div style={{height:3,borderRadius:3,background:col.color,marginBottom:10}}/>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:col.dot}}/>
                        <span style={{fontSize:14,fontWeight:800,color:"#16191D"}}>{col.label}</span>
                        <span style={{marginLeft:"auto",fontSize:11,fontWeight:800,color:col.color,background:`${col.color}18`,padding:"1px 7px",borderRadius:8}}>{cards.length}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:10,color:"#5B6570",fontWeight:600}}>
                        <span>{colTicket>0?`R$ ${colTicket.toLocaleString("pt-BR")}`:"Sem valor"}</span>
                        <span>{avgStageDays}d médios</span>
                      </div>
                    </div>

                    {/* Cards */}
                    <div style={{display:"flex",flexDirection:"column",gap:8,paddingRight:2,paddingBottom:8,minHeight:120}}>
                      {loading?([1,2].map(i=><div key={i} className="skeleton" style={{height:100,borderRadius:8}}/>)):
                      cards.length===0?(
                        <div style={{padding:"28px 0",textAlign:"center",border:"2px dashed #E3E6E9",borderRadius:8,background:"#ffffff"}}>
                          <Building2 style={{width:22,height:22,color:"#2563EB",margin:"0 auto 8px"}}/>
                          <p style={{fontSize:10,color:"#5B6570",fontWeight:600}}>Sem oportunidades</p>
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
                            onDragStart={(ev: any)=>{
                              setDraggedId(emp.empresa_id);
                              ev.dataTransfer.setData("text/plain",emp.empresa_id);
                              ev.dataTransfer.effectAllowed="move";
                            }}
                            onDragEnd={()=>{setDraggedId(null);setDragOverStatus(null);}}
                            style={{opacity:movingId===emp.empresa_id?0.45:1,cursor:draggedId===emp.empresa_id?"grabbing":"grab"}}
                            initial={{opacity:0,y:10}}
                            animate={{opacity:movingId===emp.empresa_id?0.45:1,y:0}}
                            exit={{opacity:0,scale:0.95}}
                            transition={{duration:0.2,delay:idx*0.04}}
                            onClick={()=>navigate(`/clientes/${emp.empresa_id}`,{state:{from:"/gerenciamento"}})}
                          >
                            {/* Top accent bar */}
                            <div style={{position:"absolute",top:0,left:0,right:0,height:3,borderRadius:"14px 14px 0 0",background:col.color}}/>

                            {/* ── SEÇÃO SEMPRE VISÍVEL ── */}
                            <div style={{paddingTop:4}}>
                              {/* Nome + score */}
                              <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:7}}>
                                <div style={{width:32,height:32,borderRadius:9,background:avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0,boxShadow:`0 3px 8px ${avatarColor(emp.nome)}40`}}>{initials(emp.nome)}</div>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:12,fontWeight:700,color:"#16191D",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.nome}</div>
                                  <div style={{fontSize:10,color:"#5B6570",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.segmento||"—"}</div>
                                </div>
                                <div style={{flexShrink:0,padding:"2px 6px",borderRadius:6,background:sc.bg,color:sc.color,fontSize:9,fontWeight:800}}>{score}</div>
                              </div>

                              {/* Info compacta */}
                              <div style={{display:"flex",flexDirection:"column",gap:3,marginBottom:7}}>
                                {emp.cidade&&(
                                  <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#5B6570"}}>
                                    <MapPin style={{width:9,height:9,flexShrink:0,color:"#2563EB"}}/>
                                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.cidade}</span>
                                    {emp.responsavel_principal&&<><span style={{color:"#5B6570"}}>·</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#5B6570"}}>{emp.responsavel_principal}</span></>}
                                  </div>
                                )}
                                {/* ✅ Próxima ação + status badge */}
                                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10}}>
                                  <CalendarClock style={{width:9,height:9,flexShrink:0,color:next.color}}/>
                                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#5B6570",flex:1}}>{emp.proxima_acao||"Sem próxima ação"}</span>
                                  <span style={{flexShrink:0,padding:"1px 6px",borderRadius:5,background:next.bg,color:next.color,fontWeight:700,fontSize:9}}>{next.label}</span>
                                </div>
                                {emp.status==="Perdido"&&emp.motivo_perdido&&(
                                  <div style={{fontSize:9,color:"#B42318",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Motivo: {emp.motivo_perdido}</div>
                                )}
                              </div>

                              {/* Tags compactas */}
                              <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:6}}>
                                {emp.porte&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:4,background:pi.bg,color:pi.color}}>{emp.porte}</span>}
                                {emp.origem_lead&&<span style={{fontSize:9,fontWeight:600,padding:"1px 5px",borderRadius:4,background:"#E3E6E9",color:"#5B6570"}}>{emp.origem_lead}</span>}
                                {/* ✅ MUDANÇA 5: dia / dias correto */}
                                <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:4,background:"#EFF4FE",color:"#2563EB"}}>{daysLabel(daysInStage(emp))}</span>
                              </div>
                            </div>

                            {/* ── SEÇÃO EXPANSÍVEL NO HOVER ── */}
                            <div className="card-expand-section">
                            <div style={{height:1,background:"#E3E6E9",marginBottom:8}}/>
                            {/* Mover etapa */}
                            <div onClick={e=>e.stopPropagation()} style={{position:"relative"}}>
                              <select
                                className="mini-status-select"
                                value={emp.status}
                                onChange={e=>updateStatus(emp.empresa_id, e.target.value)}
                                style={{borderColor:`${col.color}50`,background:`${col.color}10`,color:col.color}}
                              >
                                {PIPELINE.map(p=>(
                                  <option key={p.key} value={p.key}>
                                    {p.key===emp.status ? `● ${p.label}` : `→ Mover para ${p.label}`}
                                  </option>
                                ))}
                              </select>
                              <ChevronRight style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%) rotate(90deg)",width:12,height:12,color:col.color,pointerEvents:"none"}}/>
                            </div>
                            </div>{/* fim card-expand-section */}
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
            <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:1320,overflowX:isMobile?"auto":undefined}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 105px 145px 100px 110px",gap:12,padding:"6px 18px",fontSize:10,fontWeight:700,color:"#5B6570",letterSpacing:"0.07em",textTransform:"uppercase",minWidth:isMobile?900:undefined}}>
                <span>Empresa</span><span>Status</span><span>Cidade</span><span>Score</span><span>Próxima ação</span><span>Parado</span><span>Ações</span>
              </div>
              {loading?([1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:64,borderRadius:8}}/>)):
              filtered.length===0?(
                <div style={{textAlign:"center",padding:"60px 0",color:"#5B6570"}}>
                  <Building2 style={{width:36,height:36,margin:"0 auto 12px",opacity:0.3}}/>
                  <p style={{fontSize:14,fontWeight:600}}>Nenhuma empresa encontrada</p>
                </div>
              ):filtered.map((emp,idx)=>{
                const score=calcScore(emp);
                const sc=scoreColor(score);
                const si=PIPELINE.find(p=>p.key===emp.status)||PIPELINE[0];
                const next=nextActionInfo(emp);
                return(
                  <motion.div key={emp.empresa_id} className="list-row" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.18,delay:idx*0.03}} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 105px 145px 100px 110px",gap:12,alignItems:"center",padding:"12px 18px",minWidth:isMobile?900:undefined}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                      <div style={{width:36,height:36,borderRadius:9,background:avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(emp.nome)}</div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#16191D",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.nome}</div>
                        <div style={{fontSize:10,color:"#5B6570"}}>{emp.segmento||"—"}</div>
                      </div>
                    </div>
                    <select value={emp.status} onChange={e=>updateStatus(emp.empresa_id,e.target.value)} style={{height:30,padding:"0 8px",borderRadius:7,border:`1px solid ${si.color}40`,background:si.light,fontSize:11,fontWeight:700,color:si.color,outline:"none",cursor:"pointer"}}>
                      {PIPELINE.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                    <span style={{fontSize:12,color:"#5B6570"}}>{emp.cidade||"—"}</span>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:36,height:4,borderRadius:4,background:"#E3E6E9"}}>
                        <div style={{height:"100%",width:`${score}%`,borderRadius:4,background:sc.color}}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:800,color:sc.color}}>{score}</span>
                    </div>
                    <div>
                      <div style={{fontSize:11,fontWeight:800,color:next.color}}>{emp.proxima_acao||"—"}</div>
                      <div style={{fontSize:10,color:"#5B6570"}}>{formatDate(emp.data_proxima_acao)}</div>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:"#5B6570"}}>{daysInStage(emp)} {daysInStage(emp)===1?"dia":"dias"}</span>
                    <div style={{display:"flex",gap:5,alignItems:"center"}}>
                      <button onClick={()=>navigate(`/clientes/${emp.empresa_id}`,{state:{from:"/gerenciamento"}})} style={{width:30,height:30,borderRadius:8,border:"1px solid #E3E6E9",background:"#ffffff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                        <ChevronRight style={{width:13,height:13,color:"#2563EB"}}/>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Mapa de proximidade das empresas da carteira */}
          {view==="mapa"&&(
            <div style={{background:"#ffffff", border:"1px solid #ffffff",borderRadius:8,padding:"18px 20px"}}>
              <MapaProximidade empresas={filtered} onGeocodificar={geocodificar} geocode={geocode} />
            </div>
          )}

          {/* Empresas próximas da minha localização atual (Geolocation + Waze) */}
          {view==="proximas"&&(
            <div style={{background:"#ffffff", border:"1px solid #ffffff",borderRadius:8,padding:"18px 20px"}}>
              <ListaEmpresasProximas empresas={filtered} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"12px 28px",background:"rgba(210,238,248,0.85)", borderTop:"1px solid #ffffff",display:"flex",alignItems:"center",gap:24,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:38,height:38,borderRadius:8,background:"#2563EB",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <TrendingUp style={{width:16,height:16,color:"#fff"}}/>
            </div>
            <div>
              <div style={{fontSize:9,color:"#5B6570",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>Total do pipeline</div>
              <div style={{fontSize:18,fontWeight:900,color:"#16191D",letterSpacing:"-0.02em"}}>R$ {totalTicket.toLocaleString("pt-BR")}</div>
            </div>
          </div>
          {[
            {label:"Oportunidades",value:String(filtered.length),color:"#16191D"},
            {label:"Ticket médio",value:`R$ ${avgTicket.toLocaleString("pt-BR")}`,color:"#5B6570"},
            {label:"Taxa de fechamento",value:`${conversao}%`,color:"#0F7B4F"},
            {label:"Taxa de perda",value:`${perda}%`,color:"#B42318"},
          ].map(s=>(
            <div key={s.label} style={{display:"flex",alignItems:"center",gap:24}}>
              <div style={{width:1,height:32,background:"#E3E6E9"}}/>
              <div>
                <div style={{fontSize:9,color:"#5B6570",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.label}</div>
                <div style={{fontSize:16,fontWeight:800,color:s.color}}>{s.value}</div>
              </div>
            </div>
          ))}

          {/* ✅ MUDANÇA 3: Botão de atrasadas clicável com animação */}
          <div style={{marginLeft:"auto"}}>
            <button
              className="overdue-btn"
              onClick={()=>setShowOverduePanel(true)}
              disabled={overdueEmpresas.length===0}
              style={{opacity:overdueEmpresas.length===0?0.5:1,cursor:overdueEmpresas.length===0?"default":"pointer"}}
            >
              <Clock style={{width:16,height:16,color:"#B42318"}}/>
              <div>
                <div style={{fontSize:13,fontWeight:800,color:"#B42318"}}>{overdueEmpresas.length} {overdueEmpresas.length===1?"atrasada":"atrasadas"}</div>
                <div style={{fontSize:9,color:"#5B6570"}}>clique para ver</div>
              </div>
              {overdueEmpresas.length>0&&<AlertCircle style={{width:14,height:14,color:"#B42318"}}/>}
            </button>
          </div>
        </div>
        </>
        )}
      </div>

      {/* ✅ MUDANÇA 3: Painel lateral de ações atrasadas */}
      <AnimatePresence>
        {showOverduePanel&&(
          <motion.div
            initial={{opacity:0}}
            animate={{opacity:1}}
            exit={{opacity:0}}
            style={{position:"fixed",inset:0,zIndex:40,background:"rgba(10,31,51,0.32)",display:"flex",justifyContent:"flex-end"}}
            onClick={()=>setShowOverduePanel(false)}
          >
            <motion.div
              initial={{x:400}}
              animate={{x:0}}
              exit={{x:400}}
              transition={{duration:0.22,ease:[0.4,0,0.2,1]}}
              style={{width:400,height:"100%",background:"rgba(248,252,255,0.98)",boxShadow:"none",display:"flex",flexDirection:"column"}}
              onClick={e=>e.stopPropagation()}
            >
              {/* Header do painel */}
              <div style={{padding:"20px 20px 16px",borderBottom:"1px solid rgba(220,38,38,0.12)",background:"#ffffff"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                  <div style={{width:38,height:38,borderRadius:8,background:"rgba(220,38,38,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <AlertCircle style={{width:18,height:18,color:"#B42318"}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:900,color:"#16191D"}}>Ações Atrasadas</div>
                    <div style={{fontSize:11,color:"#5B6570"}}>{overdueEmpresas.length} {overdueEmpresas.length===1?"empresa precisa":"empresas precisam"} de atenção</div>
                  </div>
                  <button onClick={()=>setShowOverduePanel(false)} className="quick-btn" style={{width:30,height:30}}><X style={{width:14,height:14}}/></button>
                </div>
                <p style={{fontSize:11,color:"#5B6570",lineHeight:1.5}}>
                  Essas empresas têm ações que passaram da data prevista. Acesse o perfil da empresa ou a agenda para registrar o contato.
                </p>
              </div>

              {/* Lista de atrasadas */}
              <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:8}}>
                {overdueEmpresas.length===0?(
                  <div style={{padding:"40px 0",textAlign:"center",color:"#5B6570"}}>
                    <div style={{fontSize:32,marginBottom:8}}>✅</div>
                    <p style={{fontSize:13,fontWeight:700}}>Sem ações atrasadas</p>
                    <p style={{fontSize:11,marginTop:4}}>Tudo em dia!</p>
                  </div>
                ):overdueEmpresas.map((emp,idx)=>{
                  const si=PIPELINE.find(p=>p.key===emp.status)||PIPELINE[0];
                  const daysLate = dateOnly(emp.data_proxima_acao)
                    ? Math.abs(Math.round((new Date(`${dateOnly(emp.data_proxima_acao)}T00:00:00`).getTime()-Date.now())/86400000))
                    : 0;
                  return(
                    <motion.div
                      key={emp.empresa_id}
                      className="overdue-row"
                      initial={{opacity:0,x:20}}
                      animate={{opacity:1,x:0}}
                      transition={{delay:idx*0.04}}
                    >
                      <div style={{width:36,height:36,borderRadius:9,background:avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>{initials(emp.nome)}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:"#16191D",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.nome}</div>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
                          <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:4,background:si.light,color:si.color}}>{emp.status}</span>
                          <span style={{fontSize:10,color:"#B42318",fontWeight:700}}>
                            {emp.proxima_acao||"Ação sem nome"} · há {daysLate} {daysLate===1?"dia":"dias"}
                          </span>
                        </div>
                        <div style={{fontSize:9,color:"#5B6570",marginTop:1}}>
                          Previsto: {formatDate(emp.data_proxima_acao)} · {emp.responsavel_principal||"Sem responsável"}
                        </div>
                      </div>
                      {/* Ações rápidas */}
                      <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                        <button
                          onClick={()=>navigate(`/clientes/${emp.empresa_id}`,{state:{from:"/gerenciamento"}})}
                          style={{height:26,padding:"0 9px",borderRadius:7,border:"1px solid #2563EB",background:"#EFF4FE",color:"#2563EB",fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}
                        >
                          <Eye style={{width:10,height:10}}/> Ver empresa
                        </button>
                        <button
                          onClick={()=>navigate("/calendario")}
                          style={{height:26,padding:"0 9px",borderRadius:7,border:"1px solid rgba(22,163,74,0.3)",background:"rgba(22,163,74,0.08)",color:"#16a34a",fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}
                        >
                          <Calendar style={{width:10,height:10}}/> Ver agenda
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer do painel */}
              <div style={{padding:"14px 16px",borderTop:"1px solid #E3E6E9",background:"#ffffff",display:"flex",gap:8}}>
                <button
                  onClick={()=>{setShowOverduePanel(false);setFilterAction("atrasada");}}
                  style={{flex:1,height:38,borderRadius:8,border:"none",background:"#B42318",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
                >
                  <Filter style={{width:13,height:13}}/> Filtrar atrasadas no pipeline
                </button>
                <button
                  onClick={()=>navigate("/calendario")}
                  style={{height:38,padding:"0 16px",borderRadius:8,border:"1px solid #2563EB",background:"#EFF4FE",color:"#2563EB",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}
                >
                  <Calendar style={{width:13,height:13}}/> Agenda
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}