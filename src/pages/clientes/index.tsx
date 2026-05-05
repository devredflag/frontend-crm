import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Search, Building2, Users, ClipboardList,
  Calendar, BarChart3, ChevronDown, Plus, Filter,
  Thermometer, Eye, Edit3, Trash2,
  CheckSquare, ArrowUpDown, RefreshCw,
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
  .client-row { display:grid; grid-template-columns: 2.4fr 1.1fr 1fr 1fr 1fr 0.8fr 120px; align-items:center; padding:14px 20px; border-bottom:1px solid rgba(200,225,240,0.4); cursor:pointer; transition:background 0.15s; user-select:none; }
  .client-row:hover { background:rgba(41,128,185,0.04); }
  .client-row:last-child { border-bottom:none; }
  .th { display:grid; grid-template-columns: 2.4fr 1.1fr 1fr 1fr 1fr 0.8fr 120px; align-items:center; padding:10px 20px; border-bottom:1px solid rgba(200,225,240,0.5); }
  .chip { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
  .chip-btn { display:inline-flex; align-items:center; gap:5px; padding:5px 12px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; border:none; cursor:pointer; transition:opacity 0.15s; }
  .chip-btn:hover { opacity:0.85; }
  .action-btn { width:30px; height:30px; border-radius:8px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.15s; }
  .skeleton { background: linear-gradient(90deg, rgba(200,225,240,0.4) 25%, rgba(220,240,252,0.7) 50%, rgba(200,225,240,0.4) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(41,128,185,0.25); border-radius:4px; }
`;

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",                active: false },
  { icon: Search,          label: "Buscar Empresas",           active: false },
  { icon: Building2,       label: "Cadastrar Empresas",        active: false },
  { icon: Users,           label: "Todos os clientes",         active: true  },
  { icon: ClipboardList,   label: "Gerenciamento de clientes", active: false },
  { icon: Calendar,        label: "Calendário",                active: false },
];

function statusColor(s: string) {
  if (s === "Fechado")    return { bg:"rgba(39,174,96,0.12)",   text:"#1e8449",  border:"rgba(39,174,96,0.25)"   };
  if (s === "Proposta")   return { bg:"rgba(142,68,173,0.12)",  text:"#7d3c98",  border:"rgba(142,68,173,0.25)"  };
  if (s === "Em contato") return { bg:"rgba(41,128,185,0.12)",  text:"#1a5276",  border:"rgba(41,128,185,0.25)"  };
  return                         { bg:"rgba(149,165,166,0.15)", text:"#566573",  border:"rgba(149,165,166,0.3)"  };
}

function tempColor(t: string) {
  if (t === "Quente") return { text:"#c0392b", bg:"rgba(192,57,43,0.1)",  icon:"🔥" };
  if (t === "Morno")  return { text:"#d68910", bg:"rgba(214,137,16,0.1)", icon:"🌡️" };
  return                     { text:"#2980b9", bg:"rgba(41,128,185,0.1)", icon:"❄️" };
}

function porteColor(p: string) {
  if (p === "Grande") return "#8e44ad";
  if (p === "Médio")  return "#2980b9";
  return "#27ae60";
}

function initials(name: string) {
  return name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();
}

function avatarColor(name: string) {
  const colors = ["#2980b9","#1abc9c","#8e44ad","#e67e22","#27ae60","#e74c3c"];
  return colors[name.charCodeAt(0) % colors.length];
}

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
  contatos_count?: number;
}

interface DropdownState {
  id: string;
  type: "status" | "temp";
  top: number;
  left: number;
}

const MOCK: Empresa[] = [
  { empresa_id:"1", nome:"TechSolutions Ltda", segmento:"Tecnologia", porte:"Grande", cidade:"São Paulo", status:"Em contato", temperatura:"Quente", ticket_medio_estimado:15000, responsavel_principal:"André Ferreira", origem_lead:"LinkedIn", ultima_interacao:"2025-06-10", proxima_acao:"Enviar proposta", contatos_count:3 },
];

const STATUS_OPTS = ["Todos","Lead","Em contato","Proposta","Fechado"];
const TEMP_OPTS   = ["Todas","Frio","Morno","Quente"];
const STATUS_EDIT = ["Lead","Em contato","Proposta","Fechado"];
const TEMP_EDIT   = ["Frio","Morno","Quente"];

export default function TodosClientes() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterTemp, setFilterTemp] = useState("Todas");
  const [sortField, setSortField] = useState<keyof Empresa>("nome");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [clickTimer, setClickTimer] = useState<Record<string, number>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null);
  const [dropdown, setDropdown] = useState<DropdownState | null>(null);

  useEffect(() => { fetchEmpresas(); }, []);

  useEffect(() => {
    if (!dropdown) return;
    const close = () => setDropdown(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [dropdown]);

  const fetchEmpresas = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://backend-crm-production-157b.up.railway.app/empresas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEmpresas(data);
    } catch {
      setEmpresas(MOCK);
    }
    setLoading(false);
  };

  const updateField = async (id: string, field: "status" | "temperatura", value: string) => {
    setEmpresas(prev => prev.map(e => e.empresa_id === id ? { ...e, [field]: value } : e));
    setDropdown(null);
    try {
      const token = localStorage.getItem("token");
      await fetch(`https://backend-crm-production-157b.up.railway.app/empresas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: value }),
      });
    } catch {}
  };

  const openDropdown = (e: React.MouseEvent<HTMLButtonElement>, id: string, type: "status" | "temp") => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdown(prev =>
      prev?.id === id && prev?.type === type
        ? null
        : { id, type, top: rect.bottom + 4, left: rect.left }
    );
  };

  const handleRowClick = (id: string) => {
    const now = Date.now();
    const last = clickTimer[id] || 0;
    if (now - last < 400) navigate(`/clientes/${id}`);
    setClickTimer({ ...clickTimer, [id]: now });
  };

  const handleEdit = (e: React.MouseEvent, id: string) => { e.stopPropagation(); navigate(`/clientes/${id}/editar`); };
  const handleView = (e: React.MouseEvent, id: string) => { e.stopPropagation(); navigate(`/clientes/${id}`); };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    try {
      const token = localStorage.getItem("token");
      await fetch(`https://backend-crm-production-157b.up.railway.app/empresas/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setEmpresas(empresas.filter(e => e.empresa_id !== id));
    } catch {
      setEmpresas(empresas.filter(e => e.empresa_id !== id));
    }
    setDeleteConfirm(null);
  };

  const toggleSort = (field: keyof Empresa) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const filtered = empresas
    .filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q || e.nome.toLowerCase().includes(q) || e.cidade?.toLowerCase().includes(q) || e.segmento?.toLowerCase().includes(q);
      const matchStatus = filterStatus === "Todos" || e.status === filterStatus;
      const matchTemp = filterTemp === "Todas" || e.temperatura === filterTemp;
      return matchSearch && matchStatus && matchTemp;
    })
    .sort((a, b) => {
      const va = String(a[sortField] || "");
      const vb = String(b[sortField] || "");
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const SortTh = ({ label, field }: { label: string; field: keyof Empresa }) => (
    <button onClick={() => toggleSort(field)} style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", fontSize:11, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:"rgba(20,45,70,0.5)" }}>
      {label}
      <ArrowUpDown style={{ width:10, height:10, opacity: sortField===field ? 1 : 0.4, color: sortField===field ? "#2980b9" : "inherit" }} />
    </button>
  );

  const counts = {
    total: empresas.length,
    lead: empresas.filter(e => e.status==="Lead").length,
    contato: empresas.filter(e => e.status==="Em contato").length,
    proposta: empresas.filter(e => e.status==="Proposta").length,
    fechado: empresas.filter(e => e.status==="Fechado").length,
  };

  const dropdownOptions = dropdown?.type === "status" ? STATUS_EDIT : TEMP_EDIT;
  const getColor = (v: string) => dropdown?.type === "status" ? statusColor(v) : tempColor(v);

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", position:"relative" }}>
      <style>{css}</style>

      {/* Dropdown portal */}
      {dropdown && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position:"fixed", top: dropdown.top, left: dropdown.left, zIndex:9999, background:"white", borderRadius:10, boxShadow:"0 8px 24px rgba(0,0,0,0.14)", border:"1px solid rgba(200,225,240,0.9)", overflow:"hidden", minWidth:150 }}
        >
          {dropdownOptions.map(opt => {
            const c = getColor(opt);
            return (
              <div
                key={opt}
                onClick={() => updateField(dropdown.id, dropdown.type === "status" ? "status" : "temperatura", opt)}
                style={{ padding:"9px 16px", fontSize:12, fontWeight:600, cursor:"pointer", color:c.text, transition:"background 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.background = c.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}
              >
                {"icon" in c ? `${(c as any).icon} ` : ""}{opt}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(145deg,#c8e8f5 0%,#d6eef5 30%,#cceee8 65%,#c5eae0 100%)" }} />
        <div style={{ position:"absolute", inset:0, opacity:0.4, backgroundImage:"radial-gradient(circle,rgba(41,128,185,0.2) 1px,transparent 1px)", backgroundSize:"22px 22px" }} />
        {[
          { w:400,h:400, top:"-60px",  left:"8%",   anim:"float1 18s ease-in-out infinite", op:0.11, c1:"#2980b9",c2:"#1abc9c" },
          { w:260,h:260, top:"45%",    left:"-50px", anim:"float2 22s ease-in-out infinite", op:0.09, c1:"#1abc9c",c2:"#2ecc71" },
          { w:320,h:320, top:"65%",    left:"60%",   anim:"float3 26s ease-in-out infinite", op:0.08, c1:"#2980b9",c2:"#8e44ad" },
          { w:180,h:180, top:"15%",    left:"78%",   anim:"float4 20s ease-in-out infinite", op:0.10, c1:"#27ae60",c2:"#1abc9c" },
          { w:220,h:220, top:"80%",    left:"25%",   anim:"float5 24s ease-in-out infinite", op:0.07, c1:"#e67e22",c2:"#f39c12" },
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
              if (item.label === "Dashboards") navigate("/dashboard");
              if (item.label === "Cadastrar Empresas") navigate("/empresas/nova");
              if (item.label === "Todos os clientes") navigate("/clientes");
            }}>
              <item.icon style={{ width:16, height:16, flexShrink:0 }} />
              {item.label}
            </div>
          ))}
        </nav>
        <div style={{ marginTop:16, padding:"12px", borderRadius:12, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
          <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#2980b9,#1abc9c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>KS</div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>Kauê Silva</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)" }}>Administrador</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, height:"100vh", overflowY:"auto", position:"relative", zIndex:5 }}>
        <div style={{ position:"sticky", top:0, zIndex:20, padding:"14px 28px", background:"rgba(210,238,248,0.75)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.6)", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:18, fontWeight:800, color:"#0f2133", letterSpacing:"-0.02em" }}>Todos os Clientes</h1>
            <p style={{ fontSize:12, color:"rgba(20,45,70,0.5)", marginTop:1 }}>{filtered.length} empresa{filtered.length!==1?"s":""} encontrada{filtered.length!==1?"s":""}</p>
          </div>
          <button onClick={fetchEmpresas} style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(200,225,240,0.9)", background:"rgba(255,255,255,0.75)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <RefreshCw style={{ width:15, height:15, color:"#2980b9" }} />
          </button>
          <button onClick={() => navigate("/empresas/nova")} style={{ height:38, padding:"0 16px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2980b9,#1abc9c,#2ecc71,#2980b9)", backgroundSize:"200% 200%", animation:"gradientShift 4s ease infinite", color:"#fff", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:6, boxShadow:"0 4px 14px rgba(41,128,185,0.35)" }}>
            <Plus style={{ width:15, height:15 }} /> Nova empresa
          </button>
        </div>

        <div style={{ padding:"22px 28px 40px", display:"flex", flexDirection:"column", gap:18 }}>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {[
              { label:"Total",      value:counts.total,    color:"#2980b9" },
              { label:"Leads",      value:counts.lead,     color:"#95a5a6" },
              { label:"Em contato", value:counts.contato,  color:"#2980b9" },
              { label:"Proposta",   value:counts.proposta, color:"#8e44ad" },
              { label:"Fechados",   value:counts.fechado,  color:"#27ae60" },
            ].map(s => (
              <div key={s.label} style={{ padding:"6px 14px", borderRadius:20, background:"rgba(255,255,255,0.72)", border:`1px solid ${s.color}25`, backdropFilter:"blur(8px)", display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ fontSize:16, fontWeight:900, color:s.color }}>{s.value}</span>
                <span style={{ fontSize:11, fontWeight:600, color:"rgba(20,45,70,0.5)" }}>{s.label}</span>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:220, position:"relative" }}>
              <Search style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:"rgba(20,45,70,0.35)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, cidade, segmento..." style={{ width:"100%", height:38, paddingLeft:34, paddingRight:14, borderRadius:10, border:"1px solid rgba(200,225,240,0.9)", background:"rgba(255,255,255,0.78)", fontSize:13, color:"#1a2e40", outline:"none" }} />
            </div>
            <div style={{ position:"relative" }}>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ height:38, padding:"0 32px 0 12px", borderRadius:10, border:"1px solid rgba(200,225,240,0.9)", background:"rgba(255,255,255,0.78)", fontSize:13, color:"#1a2e40", outline:"none", cursor:"pointer", appearance:"none" }}>
                {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", width:13, height:13, color:"rgba(20,45,70,0.4)", pointerEvents:"none" }} />
            </div>
            <div style={{ position:"relative" }}>
              <select value={filterTemp} onChange={e => setFilterTemp(e.target.value)} style={{ height:38, padding:"0 32px 0 12px", borderRadius:10, border:"1px solid rgba(200,225,240,0.9)", background:"rgba(255,255,255,0.78)", fontSize:13, color:"#1a2e40", outline:"none", cursor:"pointer", appearance:"none" }}>
                {TEMP_OPTS.map(t => <option key={t}>{t}</option>)}
              </select>
              <Thermometer style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", width:13, height:13, color:"rgba(20,45,70,0.4)", pointerEvents:"none" }} />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5, padding:"0 12px", height:38, borderRadius:10, background:"rgba(255,255,255,0.6)", border:"1px solid rgba(200,225,240,0.7)", fontSize:12, color:"rgba(20,45,70,0.5)" }}>
              <Filter style={{ width:13, height:13 }} /> {filtered.length} resultado{filtered.length!==1?"s":""}
            </div>
          </div>

          <motion.div className="glass-card" style={{ overflow:"visible" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.38 }}>
            <div className="th">
              <SortTh label="Empresa" field="nome" />
              <SortTh label="Segmento" field="segmento" />
              <SortTh label="Status" field="status" />
              <SortTh label="Temperatura" field="temperatura" />
              <SortTh label="Cidade" field="cidade" />
              <SortTh label="Ticket" field="ticket_medio_estimado" />
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:"rgba(20,45,70,0.5)" }}>Ações</span>
            </div>

            {loading ? (
              Array.from({length:6}).map((_,i) => (
                <div key={i} className="client-row" style={{ cursor:"default" }}>
                  {Array.from({length:7}).map((_,j) => (
                    <div key={j} className="skeleton" style={{ height:18, width:`${60+Math.random()*30}%` }} />
                  ))}
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div style={{ padding:"48px 20px", textAlign:"center" }}>
                <Building2 style={{ width:36, height:36, color:"rgba(41,128,185,0.3)", margin:"0 auto 12px" }} />
                <p style={{ fontSize:14, fontWeight:600, color:"rgba(20,45,70,0.5)" }}>Nenhuma empresa encontrada</p>
                <p style={{ fontSize:12, color:"rgba(20,45,70,0.35)", marginTop:4 }}>Tente ajustar os filtros ou cadastre uma nova empresa</p>
              </div>
            ) : (
              <AnimatePresence>
                {filtered.map((emp, idx) => {
                  const sc = statusColor(emp.status);
                  const tc = tempColor(emp.temperatura);
                  const pc = porteColor(emp.porte);
                  const isDeleting = deleteConfirm === emp.empresa_id;

                  return (
                    <motion.div
                      key={emp.empresa_id}
                      className="client-row"
                      initial={{ opacity:0, x:-8 }}
                      animate={{ opacity:1, x:0 }}
                      exit={{ opacity:0, height:0 }}
                      transition={{ duration:0.2, delay:idx*0.03 }}
                      onClick={() => handleRowClick(emp.empresa_id)}
                    >
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:10, background:avatarColor(emp.nome), display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>
                          {initials(emp.nome)}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#0f2133" }}>{emp.nome}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                            <span style={{ fontSize:10, fontWeight:600, color:pc, background:`${pc}15`, padding:"1px 6px", borderRadius:4 }}>{emp.porte}</span>
                            {emp.contatos_count !== undefined && (
                              <span style={{ fontSize:10, color:"rgba(20,45,70,0.4)" }}>{emp.contatos_count} contato{emp.contatos_count!==1?"s":""}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span style={{ fontSize:12, color:"rgba(20,45,70,0.6)", fontWeight:500 }}>{emp.segmento || "—"}</span>

                      {/* Status dropdown */}
                      <div onClick={e => e.stopPropagation()}>
                        <button
                          className="chip-btn"
                          style={{ background:sc.bg, color:sc.text, border:`1px solid ${sc.border}` }}
                          onClick={e => openDropdown(e, emp.empresa_id, "status")}
                        >
                          {emp.status || "—"} <ChevronDown style={{ width:10, height:10 }} />
                        </button>
                      </div>

                      {/* Temperatura dropdown */}
                      <div onClick={e => e.stopPropagation()}>
                        <button
                          className="chip-btn"
                          style={{ background:tc.bg, color:tc.text }}
                          onClick={e => openDropdown(e, emp.empresa_id, "temp")}
                        >
                          {tc.icon} {emp.temperatura || "—"} <ChevronDown style={{ width:10, height:10 }} />
                        </button>
                      </div>

                      <span style={{ fontSize:12, color:"rgba(20,45,70,0.6)", fontWeight:500 }}>{emp.cidade || "—"}</span>

                      <span style={{ fontSize:12, fontWeight:700, color:"#0f2133" }}>
                        {emp.ticket_medio_estimado ? `R$ ${emp.ticket_medio_estimado.toLocaleString("pt-BR")}` : "—"}
                      </span>

                      <div style={{ display:"flex", alignItems:"center", gap:5 }} onClick={e => e.stopPropagation()}>
                        <button className="action-btn" style={{ background:"rgba(41,128,185,0.08)", color:"#2980b9" }} onClick={e => handleView(e, emp.empresa_id)} title="Ver perfil">
                          <Eye style={{ width:13, height:13 }} />
                        </button>
                        <button className="action-btn" style={{ background:"rgba(142,68,173,0.08)", color:"#8e44ad" }} onClick={e => handleEdit(e, emp.empresa_id)} title="Editar">
                          <Edit3 style={{ width:13, height:13 }} />
                        </button>
                        <button className="action-btn" style={{ background: isDeleting ? "rgba(231,76,60,0.2)" : "rgba(231,76,60,0.08)", color:"#e74c3c" }} onClick={e => handleDelete(e, emp.empresa_id)} title={isDeleting ? "Confirmar exclusão" : "Excluir"} onBlur={() => setTimeout(() => setDeleteConfirm(null), 200)}>
                          {isDeleting ? <CheckSquare style={{ width:13, height:13 }} /> : <Trash2 style={{ width:13, height:13 }} />}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </motion.div>

          <p style={{ textAlign:"center", fontSize:11, color:"rgba(20,45,70,0.35)" }}>
            💡 Clique no <strong>status</strong> ou <strong>temperatura</strong> para editar direto na tabela
          </p>
        </div>
      </div>
    </div>
  );
}
