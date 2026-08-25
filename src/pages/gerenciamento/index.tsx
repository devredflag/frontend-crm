import { getToken, setAccessToken } from "../../services/auth";
import { useState, useEffect, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Search, Building2, Users, ClipboardList,
  Calendar, BarChart3, Plus, Eye,
  ChevronRight, ChevronDown, MapPin, TrendingUp,
  X,
  CalendarClock, Clock, Filter, AlertCircle, Menu, UserRoundCog, FileText,
} from "lucide-react";
import useIsMobile from "../../hooks/useIsMobile";
import VendasPanel from "./VendasPanel";
import CardUsuario from "../../components/CardUsuario";
import AbasGerenciamento, { cssAbasGerenciamento } from "../../components/AbasGerenciamento";

import FundoAzul from "../../components/FundoAzul";
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
  @keyframes pulse-red { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.3)}50%{box-shadow:0 0 0 6px rgba(220,38,38,0)} }

  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:#EAF6FB; transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(159,211,234,0.08); color:#fff; }
  .nav-item.active { background:rgba(159,211,234,0.08); color:#fff; font-weight:600; }

  .kanban-card {
    background:rgba(18,59,94,0.55);
    border:1px solid rgba(159,211,234,0.18);
    border-radius:14px;
    padding:13px 13px 10px;
    cursor:pointer;
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
    position:relative;
    overflow:hidden;
    z-index:1;
  }
  .kanban-card:hover {
    transform:translateY(-2px);
    box-shadow:0 16px 40px rgba(41,128,185,0.18);
    border-color:rgba(159,211,234,0.30);
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

  .drop-active { border-color:rgba(159,211,234,0.30)!important; background:rgba(46,111,149,0.06)!important; }
  .skeleton { background:linear-gradient(90deg,rgba(159,211,234,0.08) 25%,rgba(220,240,252,0.7) 50%,rgba(159,211,234,0.08) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; }

  .list-row { background:rgba(18,59,94,0.55); backdrop-filter:blur(12px); border:1px solid rgba(159,211,234,0.18); border-radius:12px; transition:all 0.18s; }
  .list-row:hover { box-shadow:0 4px 16px rgba(41,128,185,0.1); border-color:rgba(159,211,234,0.30); transform:translateY(-1px); }

  .mini-status-select { width:100%; height:30px; border-radius:8px; border:1px solid rgba(159,211,234,0.18); background:rgba(18,59,94,0.55); font-size:11px; font-weight:700; outline:none; padding:0 26px 0 10px; cursor:pointer; appearance:none; }
  .mini-status-select:focus { border-color:rgba(159,211,234,0.30); box-shadow:0 0 0 2px rgba(41,128,185,0.08); }

  .mini-input { height:30px; border-radius:8px; border:1px solid rgba(159,211,234,0.18); background:rgba(18,59,94,0.55); font-size:11px; font-weight:500; outline:none; padding:0 8px; width:100%; color:#EAF6FB; transition:border-color 0.15s; }
  .mini-input:focus { border-color:rgba(159,211,234,0.30); box-shadow:0 0 0 2px rgba(41,128,185,0.08); }
  .mini-input[type="date"] { padding:0 6px; font-size:10.5px; }

  .mini-select { height:30px; border-radius:8px; border:1px solid rgba(159,211,234,0.18); background:rgba(18,59,94,0.55); font-size:11px; font-weight:600; outline:none; padding:0 8px; cursor:pointer; width:100%; color:#EAF6FB; transition:border-color 0.15s; }
  .mini-select:focus { border-color:rgba(159,211,234,0.30); }

  .quick-btn { width:24px; height:24px; border-radius:6px; border:1px solid rgba(159,211,234,0.18); background:rgba(18,59,94,0.55); display:flex; align-items:center; justify-content:center; cursor:pointer; color:#9FD3EA; text-decoration:none; transition:all 0.15s; }
  .quick-btn:hover { transform:translateY(-1px); border-color:rgba(159,211,234,0.30); background:rgba(18,59,94,0.55); }

  .filtro-select { width:100%; height:36px; border-radius:10px; border:1px solid rgba(126,176,219,0.22); background:#123253; color:#FFFFFF; font-size:12px; font-weight:600; outline:none; padding:0 10px; cursor:pointer; font-family:inherit; user-select:none; }
  .filtro-select:focus-visible { border-color:rgba(126,176,219,0.45); outline:2px solid rgba(86,164,245,0.35); outline-offset:1px; }
  .filtro-rotulo { font-size:10px; font-weight:800; letter-spacing:0.07em; text-transform:uppercase; color:#9FB8D0; margin-bottom:6px; }
  .filtro-pill { padding:6px 11px; border-radius:9px; border:1px solid rgba(126,176,219,0.22); background:transparent; color:#C7DCEF; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:6px; transition:all 0.15s; }
  .filtro-pill:hover { border-color:rgba(126,176,219,0.45); }

  .overdue-btn { display:flex; align-items:center; gap:6px; padding:6px 14px; border-radius:10px; border:1.5px solid rgba(220,38,38,0.35); background:rgba(220,38,38,0.07); cursor:pointer; transition:all 0.18s; animation:pulse-red 2.5s infinite; }
  .overdue-btn:hover { background:rgba(220,38,38,0.14); border-color:rgba(220,38,38,0.55); transform:translateY(-1px); animation:none; }

  .overdue-row { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; border:1px solid rgba(220,38,38,0.2); background:rgba(18,59,94,0.55); transition:all 0.15s; }
  .overdue-row:hover { border-color:rgba(220,38,38,0.4); box-shadow:0 3px 12px rgba(220,38,38,0.1); }

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

type ViewMode = "kanban" | "lista";
type SortBy = "score" | "valor" | "proxima" | "parado" | "nome";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards", active: false },
  { icon: Search, label: "Buscar Empresas", active: false },
  { icon: Building2, label: "Cadastrar Empresas", active: false },
  { icon: Users, label: "Todos os clientes", active: false },
  { icon: ClipboardList, label: "Gerenciamento", active: true },
  { icon: Calendar, label: "Calendario", active: false },
];

// Uma cor por etapa, do azul (entrada) ao verde (fechado). As quatro primeiras
// tinham caido todas no mesmo #9FD3EA na conversao de paleta, e por isso o
// topo da coluna, o contador e o botao de adicionar saiam cinza.
const PIPELINE = [
  { key:"Lead", label:"Lead", color:"#8FC4FA", light:"rgba(143,196,250,0.12)", dot:"#8FC4FA" },
  { key:"Em contato", label:"Em contato", color:"#56A4F5", light:"rgba(86,164,245,0.12)", dot:"#56A4F5" },
  { key:"Visita agendada", label:"Visita agendada", color:"#22D3EE", light:"rgba(34,211,238,0.12)", dot:"#22D3EE" },
  { key:"Proposta", label:"Proposta", color:"#A78BFA", light:"rgba(167,139,250,0.12)", dot:"#A78BFA" },
  { key:"Negociação", label:"Negociação", color:"#F0A05A", light:"rgba(240,160,90,0.12)", dot:"#F0A05A" },
  { key:"Fechado", label:"Fechado", color:"#2CCD93", light:"rgba(44,205,147,0.12)", dot:"#2CCD93" },
  { key:"Perdido", label:"Perdido", color:"#F87171", light:"rgba(248,113,113,0.12)", dot:"#F87171" },
];

// ✅ MUDANÇA 1: Ícones de temperatura alterados para emojis
const TEMPS = [
  { key:"Quente", color:"#F87171", bg:"rgba(248,113,113,0.12)" },
  { key:"Morno",  color:"#F0A05A", bg:"rgba(240,160,90,0.12)" },
  { key:"Frio",   color:"#8FC4FA", bg:"rgba(86,164,245,0.12)" },
];

// ── Select do painel de filtros ──────────────────────────────
// O <select> nativo abre uma lista pintada pelo sistema — branca, com fonte do
// SO — dentro de um painel escuro. Aqui a lista é nossa, então segue a paleta.
function SelectFiltro({ value, onChange, opcoes }: {
  value: string;
  onChange: (v: string) => void;
  opcoes: { valor: string; label: string }[];
}) {
  const [aberto, setAberto] = useState(false);
  const [marcado, setMarcado] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const listaId = useId();

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const escolher = (v: string) => { onChange(v); setAberto(false); setMarcado(-1); };
  const atual = opcoes.find(o => o.valor === value);

  const teclado = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAberto(true); setMarcado(m => (m + 1) % opcoes.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAberto(true); setMarcado(m => (m - 1 + opcoes.length) % opcoes.length); }
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (aberto && marcado >= 0) escolher(opcoes[marcado].valor); else setAberto(o => !o);
    } else if (e.key === "Escape") setAberto(false);
  };

  return (
    <div ref={boxRef} style={{position:"relative"}}>
      <div
        role="combobox" aria-expanded={aberto} aria-controls={listaId} aria-haspopup="listbox" tabIndex={0}
        className="filtro-select"
        onClick={()=>setAberto(o=>!o)}
        onKeyDown={teclado}
        style={{display:"flex",alignItems:"center",gap:6,borderColor:aberto?"rgba(126,176,219,0.45)":undefined}}
      >
        <span style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {atual?.label ?? opcoes[0]?.label}
        </span>
        <ChevronDown style={{width:12,height:12,flexShrink:0,color:"#9FB8D0",transform:aberto?"rotate(180deg)":"none",transition:"transform 0.18s"}}/>
      </div>

      <AnimatePresence>
        {aberto&&(
          <motion.div
            id={listaId} role="listbox"
            initial={{opacity:0,y:-5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:0.14}}
            style={{
              position:"absolute",top:"calc(100% + 5px)",left:0,right:0,zIndex:70,
              background:"#1A3F63",border:"1px solid rgba(126,176,219,0.30)",borderRadius:10,
              boxShadow:"0 14px 34px rgba(3,14,26,0.60)",maxHeight:200,overflowY:"auto",padding:4,
            }}
          >
            {opcoes.map((o,i)=>{
              const escolhido = o.valor === value;
              return (
                <div
                  key={o.valor} role="option" aria-selected={escolhido}
                  onMouseDown={e=>{e.preventDefault();escolher(o.valor);}}
                  onMouseEnter={()=>setMarcado(i)}
                  title={o.label}
                  style={{
                    padding:"7px 9px",borderRadius:8,fontSize:12,cursor:"pointer",
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                    fontWeight:escolhido?700:500,
                    color:escolhido?"#8FC4FA":"#FFFFFF",
                    background:escolhido?"rgba(86,164,245,0.16)":(marcado===i?"rgba(126,176,219,0.10)":"transparent"),
                  }}
                >
                  {o.label}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function initials(n: string) { return n?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?"; }
function avatarColor(n: string) { const c=["#9FD3EA","#83DDA8","#C9B6E4","#F2C879","#83DDA8","#F7B8B1"]; return c[(n?.charCodeAt(0)||0)%c.length]; }
function porteInfo(p: string) {
  if(p==="Grande") return { color:"#9FD3EA", bg:"rgba(124,58,237,0.1)" };
  if(p==="Médio") return { color:"#9FD3EA", bg:"rgba(159,211,234,0.55)" };
  return { color:"#83DDA8", bg:"rgba(22,163,74,0.1)" };
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
  if(s>=70) return { color:"#83DDA8", bg:"rgba(22,163,74,0.12)" };
  if(s>=40) return { color:"#F2C879", bg:"rgba(217,119,6,0.12)" };
  return { color:"#F7B8B1", bg:"rgba(220,38,38,0.1)" };
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
  if(!date) return { label:"Sem data", status:"sem-data", color:"#9FD3EA", bg:"#9FD3EA" };
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(`${date}T00:00:00`);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if(diff < 0) return { label:`Atrasada ${Math.abs(diff)}d`, status:"atrasada", color:"#F7B8B1", bg:"rgba(220,38,38,0.1)" };
  if(diff === 0) return { label:"Hoje", status:"hoje", color:"#F2C879", bg:"rgba(217,119,6,0.12)" };
  return { label:`Em ${diff}d`, status:"proxima", color:"#9FD3EA", bg:"rgba(159,211,234,0.55)" };
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
  // Todos os filtros moram num painel unico, aberto pelo botao ao lado da busca.
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const filtrosRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewMode>("kanban");
  const [movingId, setMovingId] = useState<string|null>(null);
  const [draggedId, setDraggedId] = useState<string|null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string|null>(null);

  // ✅ MUDANÇA 3: Painel de atrasadas
  const [showOverduePanel, setShowOverduePanel] = useState(false);

  // Abas do Gerenciamento: carteira de clientes x orçamentos/vendas.
  const [aba, setAba] = useState<"clientes"|"vendas">("clientes");
  // Separa quem ainda é lead novo de quem já virou cliente em andamento.
  const [filtroLead, setFiltroLead] = useState<"todos"|"leads"|"clientes">("todos");

  // Token sempre fresco — garante que salva mesmo após re-login
  const hdrs = () => ({
    "Content-Type":"application/json",
    Authorization:`Bearer ${getToken()||""}`,
  });

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (filtrosRef.current && !filtrosRef.current.contains(e.target as Node)) setFiltrosAbertos(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

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

  const filtrosAtivos = [
    filtroLead !== "todos", filterTemp !== "Todas", filterStatus !== "Todos",
    filterSegmento !== "Todos", filterCidade !== "Todas", filterOrigem !== "Todas",
    filterAction !== "Todas",
  ].filter(Boolean).length;

  const limparFiltros = () => {
    setFiltroLead("todos"); setFilterTemp("Todas"); setFilterStatus("Todos");
    setFilterSegmento("Todos"); setFilterCidade("Todas"); setFilterOrigem("Todas");
    setFilterAction("Todas"); setSortBy("score");
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
        <FundoAzul />
        {[
          {w:420,h:420,top:"-80px",left:"10%",anim:"float1 18s ease-in-out infinite",op:0.1,c1:"#9FD3EA",c2:"#83DDA8"},
          {w:280,h:280,top:"40%",left:"-60px",anim:"float2 22s ease-in-out infinite",op:0.08,c1:"#83DDA8",c2:"#83DDA8"},
          {w:360,h:360,top:"60%",left:"55%",anim:"float3 26s ease-in-out infinite",op:0.07,c1:"#9FD3EA",c2:"#C9B6E4"},
          {w:200,h:200,top:"20%",left:"75%",anim:"float4 20s ease-in-out infinite",op:0.09,c1:"#83DDA8",c2:"#83DDA8"},
          {w:300,h:300,top:"75%",left:"20%",anim:"float5 24s ease-in-out infinite",op:0.07,c1:"#F2C879",c2:"#F2C879"},
        ].map((c,i)=>(
          <div key={i} style={{position:"absolute",width:c.w,height:c.h,top:c.top,left:c.left,borderRadius:"50%",background:`radial-gradient(circle at 40% 40%,${c.c1},${c.c2})`,opacity:c.op,animation:c.anim,filter:"blur(2px)"}}/>
        ))}
      </div>

      {/* Sidebar */}
      {isMobile && menuOpen && (
        <div onClick={()=>setMenuOpen(false)} style={{position:"fixed",inset:0,background:"rgba(10,31,51,0.45)",zIndex:999}}/>
      )}
      <div style={{width:220,flexShrink:0,height:"100vh",overflowY:"auto",zIndex:1000,background:"linear-gradient(180deg,#1a3a5c 0%,#0f2a44 60%,#0a1f33 100%)",boxShadow:"4px 0 24px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",padding:"0 12px 20px",
        position: isMobile ? "fixed" : "relative", top:0, left:0,
        transform: isMobile && !menuOpen ? "translateX(-100%)" : "translateX(0)",
        transition:"transform 0.28s ease"}}>
        <div style={{padding:"22px 4px 24px",borderBottom:"1px solid rgba(159,211,234,0.18)",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#2E6F95,#2E6F95)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(46,111,149,0.4)"}}>
              <BarChart3 style={{width:18,height:18,color:"#fff"}}/>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>Prospecção</div>
              <div style={{fontSize:11,fontWeight:700,background:"linear-gradient(90deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)",backgroundSize:"200% 200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"gradientShift 4s ease infinite"}}>CRM</div>
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
        <div style={{padding:isMobile?"10px 14px":"10px 28px",background:"rgba(15,46,75,0.92)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(126,176,219,0.16)",flexShrink:0,position:"relative",zIndex:30}}>
          <div style={{display:"flex",alignItems:"center",gap:isMobile?10:16,marginBottom:10}}>
            {isMobile && (
              <button onClick={()=>setMenuOpen(true)} style={{width:36,height:36,borderRadius:10,border:"1px solid rgba(126,176,219,0.16)",background:"#123253",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Menu style={{width:18,height:18,color:"#B6CFE4"}}/>
              </button>
            )}
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <h1 style={{fontSize:18,fontWeight:800,color:"#FFFFFF",letterSpacing:"-0.02em"}}>
                  {aba==="clientes"?"Pipeline de Vendas":"Orçamentos e vendas"}
                </h1>
                {aba==="clientes"
                  ? <TrendingUp style={{width:17,height:17,color:"#2CCD93"}}/>
                  : <FileText style={{width:17,height:17,color:"#8FC4FA"}}/>}
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {aba==="clientes" && (<>
              <div style={{display:"flex",gap:3,background:"#0F2E4B",borderRadius:10,padding:3,border:"1px solid rgba(126,176,219,0.16)"}}>
                {(["kanban","lista"] as const).map(v=>(
                  <button key={v} onClick={()=>setView(v)} style={{padding:"5px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,background:view===v?"#1A3F63":"transparent",color:view===v?"#FFFFFF":"#B6CFE4",fontWeight:view===v?700:600,transition:"all 0.18s"}}>
                    {v==="kanban"?"Visão do funil":"Lista"}
                  </button>
                ))}
              </div>
              <button onClick={()=>navigate("/empresas/nova")} style={{height:38,padding:"0 16px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#2CCD93,#2CCD93,#56A4F5,#2CCD93)",backgroundSize:"200% 200%",animation:"gradientShift 4s ease infinite",color:"#FFFFFF",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 14px rgba(44,205,147,0.28)"}}>
                <Plus style={{width:15,height:15}}/> Nova oportunidade
              </button>
              </>)}
            </div>
          </div>

          {/* Busca + um unico botao de filtros. Antes eram duas linhas de chips e
              selects soltos no cabecalho, disputando espaco com os numeros. */}
          {aba==="clientes" && (
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{position:"relative",width:240}}>
              <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"#B6CFE4"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empresa..." style={{width:"100%",height:36,paddingLeft:28,borderRadius:10,border:"1px solid rgba(126,176,219,0.22)",background:"#123253",fontSize:12,color:"#FFFFFF",outline:"none"}}/>
            </div>

            <div ref={filtrosRef} style={{position:"relative"}}>
              <button
                onClick={()=>setFiltrosAbertos(o=>!o)}
                style={{
                  display:"flex",alignItems:"center",gap:7,height:36,padding:"0 14px",borderRadius:10,cursor:"pointer",
                  border:`1px solid ${filtrosAtivos>0?"rgba(86,164,245,0.55)":"rgba(126,176,219,0.22)"}`,
                  background:filtrosAtivos>0?"rgba(86,164,245,0.14)":"#123253",
                  color:filtrosAtivos>0?"#8FC4FA":"#C7DCEF",fontSize:12,fontWeight:700,fontFamily:"inherit",
                }}
              >
                <Filter style={{width:13,height:13}}/> Filtros
                {filtrosAtivos>0&&(
                  <span style={{minWidth:18,height:18,padding:"0 5px",borderRadius:9,background:"#56A4F5",color:"#062033",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {filtrosAtivos}
                  </span>
                )}
                <ChevronDown style={{width:12,height:12,transform:filtrosAbertos?"rotate(180deg)":"none",transition:"transform 0.18s"}}/>
              </button>

              <AnimatePresence>
                {filtrosAbertos&&(
                  <motion.div
                    initial={{opacity:0,y:-8,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8,scale:0.98}}
                    transition={{duration:0.16,ease:[0.4,0,0.2,1]}}
                    style={{
                      position:"absolute",top:"calc(100% + 8px)",left:0,zIndex:60,width:320,
                      background:"#16395E",border:"1px solid rgba(126,176,219,0.30)",borderRadius:16,
                      boxShadow:"0 20px 50px rgba(3,14,26,0.60)",padding:"16px 16px 14px",transformOrigin:"top left",
                    }}
                  >
                    <div style={{marginBottom:14}}>
                      <div className="filtro-rotulo">Tipo</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {([
                          {key:"todos"    as const, label:"Todos"},
                          {key:"leads"    as const, label:"Novos leads"},
                          {key:"clientes" as const, label:"Clientes"},
                        ]).map(f=>{
                          const ativo=filtroLead===f.key;
                          return(
                            <button key={f.key} className="filtro-pill" onClick={()=>setFiltroLead(f.key)}
                              style={ativo?{borderColor:"rgba(86,164,245,0.55)",background:"rgba(86,164,245,0.16)",color:"#8FC4FA"}:undefined}>
                              {f.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{marginBottom:14}}>
                      <div className="filtro-rotulo">Temperatura</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {["Todas","Quente","Morno","Frio"].map(t=>{
                          const info=TEMPS.find(x=>x.key===t);
                          const ativo=filterTemp===t;
                          return(
                            <button key={t} className="filtro-pill" onClick={()=>setFilterTemp(t)}
                              style={ativo?{borderColor:(info?.color||"#56A4F5")+"88",background:info?.bg||"rgba(86,164,245,0.16)",color:info?.color||"#8FC4FA"}:undefined}>
                              {info&&<span style={{width:6,height:6,borderRadius:"50%",background:info.color,flexShrink:0}}/>}
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <div>
                        <div className="filtro-rotulo">Status</div>
                        <SelectFiltro value={filterStatus} onChange={setFilterStatus}
                          opcoes={[{valor:"Todos",label:"Todos"},...PIPELINE.map(pp=>({valor:pp.key,label:pp.label}))]}/>
                      </div>
                      <div>
                        <div className="filtro-rotulo">Ação</div>
                        <SelectFiltro value={filterAction} onChange={setFilterAction} opcoes={[
                          {valor:"Todas",label:"Todas"},
                          {valor:"atrasada",label:"Atrasadas"},
                          {valor:"hoje",label:"Hoje"},
                          {valor:"proxima",label:"Próximas"},
                          {valor:"sem-data",label:"Sem data"},
                        ]}/>
                      </div>
                      <div>
                        <div className="filtro-rotulo">Segmento</div>
                        <SelectFiltro value={filterSegmento} onChange={setFilterSegmento}
                          opcoes={[{valor:"Todos",label:"Todos"},...segmentos.map(v=>({valor:v,label:v}))]}/>
                      </div>
                      <div>
                        <div className="filtro-rotulo">Cidade</div>
                        <SelectFiltro value={filterCidade} onChange={setFilterCidade}
                          opcoes={[{valor:"Todas",label:"Todas"},...cidades.map(v=>({valor:v,label:v}))]}/>
                      </div>
                      <div>
                        <div className="filtro-rotulo">Origem</div>
                        <SelectFiltro value={filterOrigem} onChange={setFilterOrigem}
                          opcoes={[{valor:"Todas",label:"Todas"},...origens.map(v=>({valor:v,label:v}))]}/>
                      </div>
                      <div>
                        <div className="filtro-rotulo">Ordenar por</div>
                        <SelectFiltro value={sortBy} onChange={v=>setSortBy(v as SortBy)} opcoes={[
                          {valor:"score",label:"Score"},
                          {valor:"valor",label:"Maior valor"},
                          {valor:"proxima",label:"Próxima ação"},
                          {valor:"parado",label:"Mais tempo parado"},
                          {valor:"nome",label:"Nome"},
                        ]}/>
                      </div>
                    </div>

                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginTop:14,paddingTop:12,borderTop:"1px solid rgba(126,176,219,0.16)"}}>
                      <span style={{fontSize:11,color:"#9FB8D0"}}>
                        {filtered.length} empresa{filtered.length!==1?"s":""}
                      </span>
                      <button
                        onClick={limparFiltros}
                        disabled={filtrosAtivos===0}
                        style={{background:"none",border:"none",fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:filtrosAtivos?"pointer":"default",color:filtrosAtivos?"#8FC4FA":"rgba(159,184,208,0.45)",padding:0}}
                      >
                        Limpar filtros
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          )}
        </div>

        {/* Abas: Clientes x Vendas — as duas areas navegaveis da tela */}
        <div style={{padding:isMobile?"12px 14px":"14px 24px",flexShrink:0,borderBottom:"1px solid rgba(159,211,234,0.18)"}}>
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
                    <div className={dragOverStatus===col.key?"drop-active":""} style={{marginBottom:12,padding:"12px 14px",borderRadius:12,background:"rgba(18,59,94,0.55)",backdropFilter:"blur(12px)",border:"1px solid rgba(159,211,234,0.18)"}}>
                      <div style={{height:3,borderRadius:3,background:col.color,marginBottom:10}}/>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:col.dot}}/>
                        <span style={{fontSize:14,fontWeight:800,color:"#EAF6FB"}}>{col.label}</span>
                        <span style={{marginLeft:"auto",fontSize:11,fontWeight:800,color:col.color,background:`${col.color}18`,padding:"1px 7px",borderRadius:8}}>{cards.length}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:10,color:"#9FD3EA",fontWeight:600}}>
                        <span>{colTicket>0?`R$ ${colTicket.toLocaleString("pt-BR")}`:"Sem valor"}</span>
                        <span>{avgStageDays}d médios</span>
                      </div>
                    </div>

                    {/* Cards */}
                    <div style={{display:"flex",flexDirection:"column",gap:8,paddingRight:2,paddingBottom:8,minHeight:120}}>
                      {loading?([1,2].map(i=><div key={i} className="skeleton" style={{height:100,borderRadius:14}}/>)):
                      cards.length===0?(
                        <div style={{padding:"28px 0",textAlign:"center",border:"2px dashed rgba(159,211,234,0.18)",borderRadius:14,background:"rgba(159,211,234,0.08)"}}>
                          <Building2 style={{width:22,height:22,color:"#9FD3EA",margin:"0 auto 8px"}}/>
                          <p style={{fontSize:10,color:"#9FD3EA",fontWeight:600}}>Sem oportunidades</p>
                          <button onClick={()=>navigate("/empresas/nova")} style={{marginTop:8,padding:"4px 10px",borderRadius:6,border:"none",background:col.color,color:"#062033",fontSize:9,fontWeight:800,cursor:"pointer"}}>+ Adicionar</button>
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
                                <div style={{width:32,height:32,borderRadius:9,background:avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#EAF6FB",flexShrink:0,boxShadow:`0 3px 8px ${avatarColor(emp.nome)}40`}}>{initials(emp.nome)}</div>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:12,fontWeight:700,color:"#EAF6FB",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.nome}</div>
                                  <div style={{fontSize:10,color:"#9FD3EA",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.segmento||"—"}</div>
                                </div>
                                <div style={{flexShrink:0,padding:"2px 6px",borderRadius:6,background:sc.bg,color:sc.color,fontSize:9,fontWeight:800}}>{score}</div>
                              </div>

                              {/* Info compacta */}
                              <div style={{display:"flex",flexDirection:"column",gap:3,marginBottom:7}}>
                                {emp.cidade&&(
                                  <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#9FD3EA"}}>
                                    <MapPin style={{width:9,height:9,flexShrink:0,color:"#9FD3EA"}}/>
                                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.cidade}</span>
                                    {emp.responsavel_principal&&<><span style={{color:"#9FD3EA"}}>·</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#9FD3EA"}}>{emp.responsavel_principal}</span></>}
                                  </div>
                                )}
                                {/* ✅ Próxima ação + status badge */}
                                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10}}>
                                  <CalendarClock style={{width:9,height:9,flexShrink:0,color:next.color}}/>
                                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#EAF6FB",flex:1}}>{emp.proxima_acao||"Sem próxima ação"}</span>
                                  <span style={{flexShrink:0,padding:"1px 6px",borderRadius:5,background:next.bg,color:next.color,fontWeight:700,fontSize:9}}>{next.label}</span>
                                </div>
                                {emp.status==="Perdido"&&emp.motivo_perdido&&(
                                  <div style={{fontSize:9,color:"#F7B8B1",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Motivo: {emp.motivo_perdido}</div>
                                )}
                              </div>

                              {/* Tags compactas */}
                              <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:6}}>
                                {emp.porte&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:4,background:pi.bg,color:pi.color}}>{emp.porte}</span>}
                                {emp.origem_lead&&<span style={{fontSize:9,fontWeight:600,padding:"1px 5px",borderRadius:4,background:"rgba(159,211,234,0.08)",color:"#9FD3EA"}}>{emp.origem_lead}</span>}
                                {/* ✅ MUDANÇA 5: dia / dias correto */}
                                <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:4,background:"rgba(46,111,149,0.08)",color:"#9FD3EA"}}>{daysLabel(daysInStage(emp))}</span>
                              </div>
                            </div>

                            {/* ── SEÇÃO EXPANSÍVEL NO HOVER ── */}
                            <div className="card-expand-section">
                            <div style={{height:1,background:"rgba(159,211,234,0.08)",marginBottom:8}}/>
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
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 105px 145px 100px 110px",gap:12,padding:"6px 18px",fontSize:10,fontWeight:700,color:"#9FD3EA",letterSpacing:"0.07em",textTransform:"uppercase",minWidth:isMobile?900:undefined}}>
                <span>Empresa</span><span>Status</span><span>Cidade</span><span>Score</span><span>Próxima ação</span><span>Parado</span><span>Ações</span>
              </div>
              {loading?([1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:64,borderRadius:12}}/>)):
              filtered.length===0?(
                <div style={{textAlign:"center",padding:"60px 0",color:"#9FD3EA"}}>
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
                      <div style={{width:36,height:36,borderRadius:9,background:avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#EAF6FB",flexShrink:0}}>{initials(emp.nome)}</div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#EAF6FB",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.nome}</div>
                        <div style={{fontSize:10,color:"#9FD3EA"}}>{emp.segmento||"—"}</div>
                      </div>
                    </div>
                    <select value={emp.status} onChange={e=>updateStatus(emp.empresa_id,e.target.value)} style={{height:30,padding:"0 8px",borderRadius:7,border:`1px solid ${si.color}40`,background:si.light,fontSize:11,fontWeight:700,color:si.color,outline:"none",cursor:"pointer"}}>
                      {PIPELINE.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                    <span style={{fontSize:12,color:"#EAF6FB"}}>{emp.cidade||"—"}</span>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:36,height:4,borderRadius:4,background:"rgba(159,211,234,0.08)"}}>
                        <div style={{height:"100%",width:`${score}%`,borderRadius:4,background:sc.color}}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:800,color:sc.color}}>{score}</span>
                    </div>
                    <div>
                      <div style={{fontSize:11,fontWeight:800,color:next.color}}>{emp.proxima_acao||"—"}</div>
                      <div style={{fontSize:10,color:"#9FD3EA"}}>{formatDate(emp.data_proxima_acao)}</div>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:"#9FD3EA"}}>{daysInStage(emp)} {daysInStage(emp)===1?"dia":"dias"}</span>
                    <div style={{display:"flex",gap:5,alignItems:"center"}}>
                      <button onClick={()=>navigate(`/clientes/${emp.empresa_id}`,{state:{from:"/gerenciamento"}})} style={{width:30,height:30,borderRadius:8,border:"1px solid rgba(159,211,234,0.18)",background:"rgba(18,59,94,0.55)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                        <ChevronRight style={{width:13,height:13,color:"#9FD3EA"}}/>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{padding:"9px 28px",background:"rgba(15,46,75,0.92)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(126,176,219,0.16)",display:"flex",alignItems:"center",gap:22,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <TrendingUp style={{width:15,height:15,color:"#2CCD93",flexShrink:0}}/>
            <span style={{fontSize:11,color:"#B6CFE4",fontWeight:600}}>Total do pipeline</span>
            <span style={{fontSize:15,fontWeight:800,color:"#FFFFFF",letterSpacing:"-0.01em"}}>R$ {totalTicket.toLocaleString("pt-BR")}</span>
          </div>
          {[
            {label:"Oportunidades",value:String(filtered.length),color:"#FFFFFF"},
            {label:"Ticket médio",value:`R$ ${avgTicket.toLocaleString("pt-BR")}`,color:"#FFFFFF"},
            {label:"Taxa de fechamento",value:`${conversao}%`,color:"#2CCD93"},
            {label:"Taxa de perda",value:`${perda}%`,color:"#F87171"},
          ].map(s=>(
            <div key={s.label} style={{display:"flex",alignItems:"center",gap:22}}>
              <div style={{width:1,height:20,background:"rgba(126,176,219,0.20)"}}/>
              <div style={{display:"flex",alignItems:"baseline",gap:7}}>
                <span style={{fontSize:11,color:"#B6CFE4",fontWeight:600,whiteSpace:"nowrap"}}>{s.label}</span>
                <span style={{fontSize:15,fontWeight:800,color:s.color}}>{s.value}</span>
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
              <Clock style={{width:16,height:16,color:"#F7B8B1"}}/>
              <div>
                <div style={{fontSize:13,fontWeight:800,color:"#F7B8B1"}}>{overdueEmpresas.length} {overdueEmpresas.length===1?"atrasada":"atrasadas"}</div>
                <div style={{fontSize:9,color:"#9FD3EA"}}>clique para ver</div>
              </div>
              {overdueEmpresas.length>0&&<AlertCircle style={{width:14,height:14,color:"#F7B8B1"}}/>}
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
              style={{width:400,height:"100%",background:"#0F2E4B",boxShadow:"-16px 0 40px rgba(10,31,51,0.2)",display:"flex",flexDirection:"column"}}
              onClick={e=>e.stopPropagation()}
            >
              {/* Header do painel */}
              <div style={{padding:"20px 20px 16px",borderBottom:"1px solid rgba(220,38,38,0.12)",background:"rgba(18,59,94,0.55)"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                  <div style={{width:38,height:38,borderRadius:11,background:"rgba(220,38,38,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <AlertCircle style={{width:18,height:18,color:"#F7B8B1"}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:900,color:"#EAF6FB"}}>Ações Atrasadas</div>
                    <div style={{fontSize:11,color:"#9FD3EA"}}>{overdueEmpresas.length} {overdueEmpresas.length===1?"empresa precisa":"empresas precisam"} de atenção</div>
                  </div>
                  <button onClick={()=>setShowOverduePanel(false)} className="quick-btn" style={{width:30,height:30}}><X style={{width:14,height:14}}/></button>
                </div>
                <p style={{fontSize:11,color:"#9FD3EA",lineHeight:1.5}}>
                  Essas empresas têm ações que passaram da data prevista. Acesse o perfil da empresa ou a agenda para registrar o contato.
                </p>
              </div>

              {/* Lista de atrasadas */}
              <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:8}}>
                {overdueEmpresas.length===0?(
                  <div style={{padding:"40px 0",textAlign:"center",color:"#9FD3EA"}}>
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
                      <div style={{width:36,height:36,borderRadius:9,background:avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#EAF6FB",flexShrink:0}}>{initials(emp.nome)}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:"#EAF6FB",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.nome}</div>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
                          <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:4,background:si.light,color:si.color}}>{emp.status}</span>
                          <span style={{fontSize:10,color:"#F7B8B1",fontWeight:700}}>
                            {emp.proxima_acao||"Ação sem nome"} · há {daysLate} {daysLate===1?"dia":"dias"}
                          </span>
                        </div>
                        <div style={{fontSize:9,color:"#9FD3EA",marginTop:1}}>
                          Previsto: {formatDate(emp.data_proxima_acao)} · {emp.responsavel_principal||"Sem responsável"}
                        </div>
                      </div>
                      {/* Ações rápidas */}
                      <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                        <button
                          onClick={()=>navigate(`/clientes/${emp.empresa_id}`,{state:{from:"/gerenciamento"}})}
                          style={{height:26,padding:"0 9px",borderRadius:7,border:"1px solid rgba(159,211,234,0.30)",background:"rgba(46,111,149,0.08)",color:"#9FD3EA",fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}
                        >
                          <Eye style={{width:10,height:10}}/> Ver empresa
                        </button>
                        <button
                          onClick={()=>navigate("/calendario")}
                          style={{height:26,padding:"0 9px",borderRadius:7,border:"1px solid rgba(22,163,74,0.3)",background:"rgba(22,163,74,0.08)",color:"#83DDA8",fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}
                        >
                          <Calendar style={{width:10,height:10}}/> Ver agenda
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer do painel */}
              <div style={{padding:"14px 16px",borderTop:"1px solid rgba(159,211,234,0.18)",background:"rgba(18,59,94,0.55)",display:"flex",gap:8}}>
                <button
                  onClick={()=>{setShowOverduePanel(false);setFilterAction("atrasada");}}
                  style={{flex:1,height:38,borderRadius:10,border:"none",background:"linear-gradient(135deg,#F7B8B1,#F7B8B1)",color:"#EAF6FB",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
                >
                  <Filter style={{width:13,height:13}}/> Filtrar atrasadas no pipeline
                </button>
                <button
                  onClick={()=>navigate("/calendario")}
                  style={{height:38,padding:"0 16px",borderRadius:10,border:"1px solid rgba(159,211,234,0.30)",background:"rgba(46,111,149,0.08)",color:"#9FD3EA",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}
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