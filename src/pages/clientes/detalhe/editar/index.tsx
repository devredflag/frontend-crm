import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Users, LayoutDashboard, Search, Calendar,
  ClipboardList, BarChart3, ChevronDown, ArrowLeft,
  Plus, Trash2, Globe, Link2, Phone, Mail,
  MapPin, Briefcase, Hash, User, Thermometer,
  Target, Clock, FileText, Save, CheckCircle,
  XCircle, Loader, AlertTriangle, Star,
} from "lucide-react";

const API = "https://backend-crm-production-157b.up.railway.app";

const SEGMENTOS_PADRAO = [
  "Academias e Fitness","Administracao de Condominios","Advocacia","Agencia de Marketing",
  "Agencia de Publicidade","Agronegocio","Alimentos e Bebidas","Arquitetura e Urbanismo",
  "Assistencia Tecnica","Atacado e Distribuicao","Automacao Industrial","Automotivo","Autopecas",
  "Bares e Restaurantes","Beleza e Estetica","Biotecnologia","Clinicas Medicas",
  "Comercio Exterior","Comercio Varejista","Concessionarias","Construcao Civil",
  "Consultoria Empresarial","Contabilidade","Coworking","Cursos e Treinamentos",
  "Decoracao","Distribuidora","E-commerce","Educacao","Energia","Energia Solar",
  "Engenharia","Entretenimento","Eventos","Farmacias e Drogarias","Financeiro",
  "Franquias","Gestao de Pessoas","Hotelaria","Imobiliarias","Industria Alimenticia",
  "Industria Automotiva","Industria Farmaceutica","Industria Metalurgica","Industria Textil",
  "Logistica e Transporte","Manutencao Predial","Maquinas e Equipamentos",
  "Materiais de Construcao","Moda e Vestuario","Moveis Planejados","Odontologia",
  "Pet Shop","Recursos Humanos","Saude","Seguranca Eletronica","Seguros",
  "Servicos de Limpeza","Servicos Financeiros","Software e SaaS","Supermercados",
  "Tecnologia da Informacao","Telecomunicacoes","Turismo","Vendas B2B","Veterinaria",
  "Agropecuaria","Clinicas Odontologicas","Confeitaria","Delivery","Grafica","Hospitais",
  "Laboratorios","Lavanderias","Marcenaria","Padarias","Postos de Combustivel","Transportadoras",
];

const PROXIMAS_ACOES = [
  "Ligar","Enviar WhatsApp","Enviar email","Conectar no LinkedIn",
  "Agendar reuniao","Enviar apresentacao","Enviar proposta","Fazer follow-up",
  "Agendar visita","Solicitar documentos","Aguardar retorno",
];

const STATUS_OPTS = ["Lead","Em contato","Visita agendada","Proposta","Negociação","Fechado","Perdido"];
const ORIGEM_OPTS = ["Indicação","LinkedIn","Site","Prospecção ativa","Evento","Cold Email","Outro"];

const uniqueSorted = (items: string[]) =>
  Array.from(new Set(items.filter(Boolean).map(i => i.trim()))).sort((a,b) => a.localeCompare(b,"pt-BR"));

const normalizeStr = (v: string) =>
  v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");

const onlyDigits = (v: string) => v.replace(/\D/g,"");
const formatPhone = (v: string) => {
  const d = onlyDigits(v).slice(0,11);
  if(d.length<=2) return d;
  if(d.length<=6) return d.replace(/^(\d{2})(\d+)/,"($1) $2");
  if(d.length<=10) return d.replace(/^(\d{2})(\d{4})(\d+)/,"($1) $2-$3");
  return d.replace(/^(\d{2})(\d{5})(\d+)/,"($1) $2-$3");
};
const formatCnpj = (v: string) =>
  onlyDigits(v).slice(0,14)
    .replace(/^(\d{2})(\d)/,"$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/,"$1.$2.$3")
    .replace(/\.(\d{3})(\d)/,".$1/$2")
    .replace(/(\d{4})(\d)/,"$1-$2");
const formatCep = (v: string) =>
  onlyDigits(v).slice(0,8).replace(/^(\d{5})(\d)/,"$1-$2");

function dateOnly(v?: string | null) { return v ? v.slice(0,10) : ""; }

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes float1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-30px) scale(1.05)}66%{transform:translate(-20px,20px) scale(0.97)}}
  @keyframes float2{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(-50px,25px) scale(1.08)}70%{transform:translate(30px,-15px) scale(0.95)}}
  @keyframes float3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(25px,40px) scale(1.03)}}
  @keyframes float4{0%,100%{transform:translate(0,0)}30%{transform:translate(-30px,-40px)}60%{transform:translate(20px,15px)}}
  @keyframes float5{0%,100%{transform:translate(0,0) scale(1)}45%{transform:translate(35px,-20px) scale(1.06)}80%{transform:translate(-15px,30px) scale(0.96)}}
  @keyframes gradientShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}

  .nav-item{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:10px;cursor:pointer;font-size:13.5px;font-weight:500;color:rgba(255,255,255,0.65);transition:all 0.18s;user-select:none;}
  .nav-item:hover{background:rgba(255,255,255,0.08);color:#fff;}
  .nav-item.active{background:rgba(255,255,255,0.14);color:#fff;font-weight:600;}
  .glass-card{background:rgba(255,255,255,0.72);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.9);border-radius:16px;}
  .field-group{display:flex;flex-direction:column;gap:5px;}
  .field-label{font-size:10px;font-weight:700;letter-spacing:0.06em;color:rgba(15,33,51,0.45);text-transform:uppercase;}
  .field-input{height:44px;padding:0 14px;border-radius:10px;border:1.5px solid rgba(200,225,240,0.8);background:rgba(255,255,255,0.75);font-size:13px;color:#0f2133;outline:none;transition:border-color 0.18s,box-shadow 0.18s;width:100%;}
  .field-input:focus{border-color:rgba(41,128,185,0.55);box-shadow:0 0 0 3px rgba(41,128,185,0.1);}
  .field-select{height:44px;padding:0 14px;border-radius:10px;border:1.5px solid rgba(200,225,240,0.8);background:rgba(255,255,255,0.75);font-size:13px;color:#0f2133;outline:none;transition:border-color 0.18s;width:100%;cursor:pointer;appearance:none;}
  .field-select:focus{border-color:rgba(41,128,185,0.55);box-shadow:0 0 0 3px rgba(41,128,185,0.1);}
  .field-textarea{padding:12px 14px;border-radius:10px;border:1.5px solid rgba(200,225,240,0.8);background:rgba(255,255,255,0.75);font-size:13px;color:#0f2133;outline:none;transition:border-color 0.18s;width:100%;resize:vertical;min-height:80px;}
  .field-textarea:focus{border-color:rgba(41,128,185,0.55);box-shadow:0 0 0 3px rgba(41,128,185,0.1);}
  .field-input-icon{position:relative;display:flex;align-items:center;}
  .field-input-icon .icon{position:absolute;left:12px;color:rgba(20,45,70,0.3);pointer-events:none;}
  .field-input-icon .field-input{padding-left:36px;}

  .seg-wrapper{position:relative;}
  .seg-input{height:44px;padding:0 40px 0 36px;border-radius:10px;border:1.5px solid rgba(200,225,240,0.8);background:rgba(255,255,255,0.75);font-size:13px;color:#0f2133;outline:none;transition:border-color 0.18s,box-shadow 0.18s;width:100%;}
  .seg-input:focus,.seg-input.open{border-color:rgba(41,128,185,0.55);box-shadow:0 0 0 3px rgba(41,128,185,0.1);}
  .seg-input.open{border-bottom-left-radius:0;border-bottom-right-radius:0;}
  .seg-icon-left{position:absolute;left:12px;color:rgba(20,45,70,0.3);pointer-events:none;width:14px;height:14px;}
  .seg-chevron{position:absolute;right:12px;color:rgba(20,45,70,0.35);pointer-events:none;width:15px;height:15px;transition:transform 0.2s;}
  .seg-chevron.open{transform:rotate(180deg);}
  .seg-dropdown{position:absolute;top:calc(100% - 1px);left:0;right:0;z-index:999;background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);border:1.5px solid rgba(41,128,185,0.45);border-top:1px solid rgba(200,225,240,0.5);border-bottom-left-radius:10px;border-bottom-right-radius:10px;box-shadow:0 12px 40px rgba(20,45,70,0.14);max-height:240px;overflow-y:auto;}
  .seg-option{padding:10px 14px;font-size:13px;color:#1a2e40;cursor:pointer;transition:background 0.12s;display:flex;align-items:center;gap:8px;}
  .seg-option:hover,.seg-option.highlighted{background:rgba(41,128,185,0.07);color:#2980b9;}
  .seg-option.selected{background:rgba(41,128,185,0.1);color:#2980b9;font-weight:700;}
  .seg-option-new{padding:10px 14px;font-size:13px;cursor:pointer;transition:background 0.12s;display:flex;align-items:center;gap:8px;color:#e67e22;font-weight:600;border-top:1px solid rgba(200,225,240,0.5);}
  .seg-option-new:hover{background:rgba(230,126,34,0.07);}

  .contact-card{background:rgba(255,255,255,0.6);border:1.5px solid rgba(200,225,240,0.7);border-radius:14px;padding:20px;transition:box-shadow 0.2s;}
  .contact-card:hover{box-shadow:0 6px 24px rgba(41,128,185,0.12);}
  .temp-btn{flex:1;height:38px;border-radius:8px;border:1.5px solid rgba(200,225,240,0.8);background:rgba(255,255,255,0.75);font-size:12px;font-weight:600;cursor:pointer;transition:all 0.18s;display:flex;align-items:center;justify-content:center;gap:5px;}
  .temp-btn.frio.active{background:rgba(52,152,219,0.12);border-color:#3498db;color:#2980b9;}
  .temp-btn.morno.active{background:rgba(230,126,34,0.12);border-color:#e67e22;color:#e67e22;}
  .temp-btn.quente.active{background:rgba(231,76,60,0.12);border-color:#e74c3c;color:#e74c3c;}
  .temp-btn:not(.active){color:rgba(20,45,70,0.4);}
  .prio-btn{flex:1;height:34px;border-radius:8px;border:1.5px solid rgba(200,225,240,0.8);background:rgba(255,255,255,0.75);font-size:11px;font-weight:600;cursor:pointer;transition:all 0.18s;}
  .prio-btn.alta.active{background:rgba(231,76,60,0.12);border-color:#e74c3c;color:#e74c3c;}
  .prio-btn.media.active{background:rgba(230,126,34,0.12);border-color:#e67e22;color:#e67e22;}
  .prio-btn.baixa.active{background:rgba(39,174,96,0.12);border-color:#27ae60;color:#27ae60;}
  .prio-btn:not(.active){color:rgba(20,45,70,0.4);}
  .checkbox-decisor{display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 12px;border-radius:8px;border:1.5px solid rgba(200,225,240,0.8);background:rgba(255,255,255,0.75);transition:all 0.18s;}
  .checkbox-decisor.checked{border-color:#27ae60;background:rgba(39,174,96,0.08);}
  .checkbox-decisor .box{width:16px;height:16px;border-radius:4px;border:1.5px solid rgba(200,225,240,0.9);background:#fff;display:flex;align-items:center;justify-content:center;transition:all 0.18s;flex-shrink:0;}
  .checkbox-decisor.checked .box{background:#27ae60;border-color:#27ae60;}
  .btn-grad{border:none;cursor:pointer;border-radius:10px;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;display:flex;align-items:center;justify-content:center;gap:7px;background:linear-gradient(135deg,#2980b9,#1abc9c,#2ecc71,#2980b9);background-size:200% 200%;animation:gradientShift 4s ease infinite;box-shadow:0 4px 14px rgba(41,128,185,0.35);transition:transform 0.15s,box-shadow 0.15s;}
  .btn-grad:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(41,128,185,0.42);}
  .btn-ghost{border:1.5px solid rgba(200,225,240,0.9);background:rgba(255,255,255,0.75);cursor:pointer;border-radius:10px;font-family:'Plus Jakarta Sans',sans-serif;font-weight:600;color:rgba(20,45,70,0.65);display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.18s;}
  .btn-ghost:hover{background:rgba(255,255,255,0.95);border-color:rgba(41,128,185,0.3);color:#2980b9;}
  .spin{animation:spin 0.9s linear infinite;}
  .toast{position:fixed;bottom:28px;right:28px;z-index:9999;padding:12px 18px;border-radius:12px;display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;box-shadow:0 8px 28px rgba(0,0,0,0.15);animation:slideIn 0.25s ease;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:rgba(41,128,185,0.25);border-radius:4px;}
`;

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",                path: "/dashboard" },
  { icon: Search,          label: "Buscar Empresas",           path: null },
  { icon: Building2,       label: "Cadastrar Empresas",        path: "/empresas/nova" },
  { icon: Users,           label: "Todos os clientes",         path: "/clientes" },
  { icon: ClipboardList,   label: "Gerenciamento de clientes", path: "/gerenciamento" },
  { icon: Calendar,        label: "Calendário",                path: "/calendario" },
];

// ── Contato vazio ─────────────────────────────────────────────
const contatoVazio = () => ({
  _localId: Date.now() + Math.random(),
  contato_id: null as string | null,
  nome: "", funcao: "", email: "", celular: "", whatsapp: "",
  linkedin: "", observacoes: "", prioridade: "Media",
  nivel_influencia: "", decisor: false, canal_preferido: "",
  data_ultimo_contato: "", isNew: true,
});

type Toast = { id: number; msg: string; type: "success" | "error" };

// ── Autocomplete de Segmento ──────────────────────────────────
function SegmentoAutocomplete({ value, onChange, opcoes }: { value: string; onChange: (v: string) => void; opcoes: string[] }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if(!value.trim()) return opcoes.slice(0,80);
    const q = normalizeStr(value);
    return opcoes.filter(o => normalizeStr(o).includes(q)).slice(0,60);
  }, [value, opcoes]);

  const exact = useMemo(() => opcoes.some(o => normalizeStr(o) === normalizeStr(value)), [value, opcoes]);
  const showNew = value.trim() && !exact && filtered.length < 60;

  useEffect(() => {
    const h = (e: MouseEvent) => { if(wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const select = (v: string) => { onChange(v); setOpen(false); setHi(-1); };

  const onKey = (e: React.KeyboardEvent) => {
    const tot = filtered.length + (showNew ? 1 : 0);
    if(e.key==="ArrowDown"){ e.preventDefault(); setHi(h=>(h+1)%tot); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); setHi(h=>(h-1+tot)%tot); }
    else if(e.key==="Enter"){ e.preventDefault(); if(hi>=0&&hi<filtered.length) select(filtered[hi]); else if(hi===filtered.length&&showNew) select(value.trim()); }
    else if(e.key==="Escape") setOpen(false);
  };

  return (
    <div className="seg-wrapper" ref={wrapRef}>
      <div style={{position:"relative",display:"flex",alignItems:"center"}}>
        <Briefcase className="seg-icon-left"/>
        <input className={`seg-input${open?" open":""}`} placeholder="Selecione ou digite um segmento" value={value} onChange={e=>{onChange(e.target.value);setOpen(true);setHi(-1);}} onFocus={()=>setOpen(true)} onKeyDown={onKey} autoComplete="off"/>
        <ChevronDown className={`seg-chevron${open?" open":""}`}/>
      </div>
      <AnimatePresence>
        {open&&(
          <motion.div className="seg-dropdown" initial={{opacity:0,y:-6,scaleY:0.95}} animate={{opacity:1,y:0,scaleY:1}} exit={{opacity:0,y:-6,scaleY:0.95}} transition={{duration:0.14}} style={{transformOrigin:"top"}}>
            {filtered.length===0&&!showNew&&<div style={{padding:"14px",fontSize:12,color:"rgba(20,45,70,0.4)",textAlign:"center"}}>Nenhum segmento encontrado</div>}
            {filtered.map((opt,i)=>(
              <div key={opt} className={`seg-option${normalizeStr(opt)===normalizeStr(value)?" selected":""}${hi===i?" highlighted":""}`} onMouseDown={e=>{e.preventDefault();select(opt);}} onMouseEnter={()=>setHi(i)}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"rgba(41,128,185,0.35)",flexShrink:0}}/>{opt}
              </div>
            ))}
            {showNew&&(
              <div className={`seg-option-new${hi===filtered.length?" highlighted":""}`} onMouseDown={e=>{e.preventDefault();select(value.trim());}} onMouseEnter={()=>setHi(filtered.length)}>
                <Plus style={{width:13,height:13}}/> Adicionar "{value.trim()}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field-group"><label className="field-label">{label}</label>{children}</div>;
}
function IconInput({ icon: Icon, ...props }: any) {
  return <div className="field-input-icon"><Icon className="icon" style={{width:14,height:14}}/><input className="field-input" {...props}/></div>;
}

// ── Contatos em card único colapsável ────────────────────────
function ContatosSingleCard({ contatos, onAdd, onChange, onRemove }: {
  contatos: any[];
  onAdd: () => void;
  onChange: (localId: number, field: string, value: any) => void;
  onRemove: (localId: number) => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const prevLen = useRef(contatos.length);
  const CORES = ["#2980b9","#1abc9c","#e67e22","#8e44ad","#27ae60"];

  useEffect(() => {
    if (contatos.length > prevLen.current) {
      const newest = [...contatos].reverse().find(c => c.isNew);
      if (newest) setExpandedId(newest._localId);
    }
    prevLen.current = contatos.length;
  }, [contatos.length]);

  const up = (localId: number, f: string, v: any) => onChange(localId, f, v);

  return (
    <motion.div className="glass-card" style={{padding:"24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.32,delay:0.20}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#2980b9,#1abc9c)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(41,128,185,0.3)"}}>
            <Users style={{width:18,height:18,color:"#fff"}}/>
          </div>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:"#0f2133"}}>Contatos Vinculados</div>
            <div style={{fontSize:11,color:"rgba(20,45,70,0.45)"}}>{contatos.length} contato{contatos.length!==1?"s":""} · clique para expandir</div>
          </div>
        </div>
        <button className="btn-grad" style={{height:36,padding:"0 14px",fontSize:12}} onClick={onAdd}>
          <Plus style={{width:13,height:13}}/> Adicionar
        </button>
      </div>

      {contatos.length === 0 ? (
        <div style={{padding:"36px 0",textAlign:"center"}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:"rgba(41,128,185,0.07)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
            <Users style={{width:22,height:22,color:"rgba(41,128,185,0.3)"}}/>
          </div>
          <div style={{fontSize:13,color:"rgba(20,45,70,0.4)",fontWeight:600}}>Nenhum contato cadastrado</div>
          <div style={{fontSize:11,color:"rgba(20,45,70,0.3)",marginTop:4}}>Clique em "Adicionar" para criar o primeiro</div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <AnimatePresence>
            {contatos.map((c, i) => {
              const cor = CORES[i % CORES.length];
              const ini = c.nome ? c.nome.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase() : "?";
              const expanded = expandedId === c._localId;
              return (
                <motion.div key={c._localId} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.97}} transition={{duration:0.2}} style={{borderRadius:12,overflow:"hidden"}}>
                  <div onClick={()=>setExpandedId(expanded?null:c._localId)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(255,255,255,0.65)",border:`1.5px solid ${expanded?"rgba(41,128,185,0.4)":"rgba(200,225,240,0.7)"}`,borderBottom:expanded?"1px solid rgba(200,225,240,0.4)":undefined,borderRadius:expanded?"12px 12px 0 0":"12px",cursor:"pointer",transition:"all 0.18s"}}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:cor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{ini}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#0f2133",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.nome||`Contato ${i+1}`}</div>
                      <div style={{fontSize:10,color:"rgba(20,45,70,0.45)"}}>{c.funcao||"Função não definida"}</div>
                    </div>
                    {c.isNew&&<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"rgba(41,128,185,0.1)",color:"#2980b9",flexShrink:0}}>NOVO</span>}
                    {c.decisor&&<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"rgba(39,174,96,0.1)",color:"#27ae60",border:"1px solid rgba(39,174,96,0.2)",flexShrink:0}}>Decisor</span>}
                    <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,flexShrink:0,background:c.prioridade==="Alta"?"rgba(231,76,60,0.08)":c.prioridade==="Baixa"?"rgba(39,174,96,0.08)":"rgba(230,126,34,0.08)",color:c.prioridade==="Alta"?"#e74c3c":c.prioridade==="Baixa"?"#27ae60":"#e67e22"}}>
                      {c.prioridade==="Media"?"Média":c.prioridade||"Média"}
                    </span>
                    <ChevronDown style={{width:14,height:14,color:"rgba(20,45,70,0.3)",transform:expanded?"rotate(180deg)":"none",transition:"transform 0.2s",flexShrink:0}}/>
                  </div>
                  <AnimatePresence>
                    {expanded&&(
                      <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} transition={{duration:0.22}} style={{overflow:"hidden"}}>
                        <div style={{background:"rgba(248,252,255,0.9)",border:"1.5px solid rgba(41,128,185,0.3)",borderTop:"none",borderRadius:"0 0 12px 12px",padding:"16px"}}>
                          <div style={{marginBottom:12}}>
                            <div className="field-label" style={{marginBottom:6}}>Prioridade</div>
                            <div style={{display:"flex",gap:6}}>
                              {(["Alta","Media","Baixa"] as const).map(p=>(
                                <button key={p} className={`prio-btn ${p.toLowerCase()}${c.prioridade===p?" active":""}`} onClick={()=>up(c._localId,"prioridade",p)}>{p==="Media"?"Média":p}</button>
                              ))}
                            </div>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                            <Field label="Nome"><IconInput icon={User} placeholder="Nome completo" value={c.nome} onChange={(e:any)=>up(c._localId,"nome",e.target.value)}/></Field>
                            <Field label="Função / Cargo"><IconInput icon={Briefcase} placeholder="ex: Diretor Comercial" value={c.funcao} onChange={(e:any)=>up(c._localId,"funcao",e.target.value)}/></Field>
                            <Field label="Email"><IconInput icon={Mail} type="email" placeholder="email@empresa.com" value={c.email} onChange={(e:any)=>up(c._localId,"email",e.target.value)}/></Field>
                            <Field label="Celular"><IconInput icon={Phone} placeholder="(00) 00000-0000" value={c.celular} onChange={(e:any)=>up(c._localId,"celular",formatPhone(e.target.value))}/></Field>
                            <Field label="WhatsApp"><IconInput icon={Phone} placeholder="(00) 00000-0000" value={c.whatsapp} onChange={(e:any)=>up(c._localId,"whatsapp",formatPhone(e.target.value))}/></Field>
                            <Field label="LinkedIn"><IconInput icon={Link2} placeholder="linkedin.com/in/..." value={c.linkedin} onChange={(e:any)=>up(c._localId,"linkedin",e.target.value)}/></Field>
                            <Field label="Canal Preferido">
                              <select className="field-select" value={c.canal_preferido} onChange={(e:any)=>up(c._localId,"canal_preferido",e.target.value)}>
                                <option value="">Selecionar...</option>
                                <option>Email</option><option>WhatsApp</option><option>Telefone</option><option>LinkedIn</option><option>Presencial</option>
                              </select>
                            </Field>
                            <Field label="Nível de Influência">
                              <select className="field-select" value={c.nivel_influencia} onChange={(e:any)=>up(c._localId,"nivel_influencia",e.target.value)}>
                                <option value="">Selecionar...</option>
                                <option>Alto</option><option>Médio</option><option>Baixo</option>
                              </select>
                            </Field>
                            <Field label="Último Contato"><input className="field-input" type="date" value={c.data_ultimo_contato} onChange={(e:any)=>up(c._localId,"data_ultimo_contato",e.target.value)}/></Field>
                            <Field label="Observações"><input className="field-input" placeholder="Notas rápidas..." value={c.observacoes} onChange={(e:any)=>up(c._localId,"observacoes",e.target.value)}/></Field>
                          </div>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12,paddingTop:10,borderTop:"1px solid rgba(200,225,240,0.5)"}}>
                            <div className={`checkbox-decisor${c.decisor?" checked":""}`} onClick={()=>up(c._localId,"decisor",!c.decisor)}>
                              <div className="box">{c.decisor&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="2,5 4,7.5 8,2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
                              <span style={{fontSize:11,fontWeight:600,color:c.decisor?"#27ae60":"rgba(20,45,70,0.5)"}}>Decisor</span>
                            </div>
                            <button onClick={()=>onRemove(c._localId)} style={{height:32,padding:"0 12px",borderRadius:8,border:"1.5px solid rgba(231,76,60,0.25)",background:"rgba(231,76,60,0.06)",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:"#e74c3c",fontSize:12,fontWeight:600}}>
                              <Trash2 style={{width:12,height:12}}/> Remover contato
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ── Status das atividades ─────────────────────────────────────
const STATUS_ATIV: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  aceito:       { label:"Aceito",       color:"#27ae60", bg:"rgba(39,174,96,0.08)",  border:"rgba(39,174,96,0.3)",
    icon:<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9.5 10,2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  negado:       { label:"Negado",       color:"#e74c3c", bg:"rgba(231,76,60,0.08)", border:"rgba(231,76,60,0.3)",
    icon:<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg> },
  talvez:       { label:"Talvez",       color:"#f39c12", bg:"rgba(243,156,18,0.08)", border:"rgba(243,156,18,0.3)",
    icon:<span style={{color:"#fff",fontSize:13,fontWeight:900,lineHeight:1}}>?</span> },
  novo_horario: { label:"Novo horário", color:"#2980b9", bg:"rgba(41,128,185,0.08)", border:"rgba(41,128,185,0.3)",
    icon:<Clock style={{width:11,height:11,color:"#fff"}}/> },
};

function AtividadesCard({ atividades }: { atividades: any[] }) {
  const fmt = (dt: string) => {
    if(!dt) return "—";
    try {
      const d = new Date(dt);
      return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}) + " às " + d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
    } catch { return dt; }
  };

  return (
    <motion.div className="glass-card" style={{padding:"24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.32,delay:0.24}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#8e44ad,#2980b9)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(142,68,173,0.3)"}}>
          <Calendar style={{width:18,height:18,color:"#fff"}}/>
        </div>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:"#0f2133"}}>Atividades & Eventos</div>
          <div style={{fontSize:11,color:"rgba(20,45,70,0.45)"}}>Respostas do calendário</div>
        </div>
      </div>

      {/* Legenda */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {Object.entries(STATUS_ATIV).map(([k,v])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:16,height:16,borderRadius:"50%",background:v.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{v.icon}</div>
            <span style={{fontSize:9,fontWeight:600,color:"rgba(20,45,70,0.5)"}}>{v.label}</span>
          </div>
        ))}
      </div>

      {atividades.length === 0 ? (
        <div style={{padding:"28px 0",textAlign:"center"}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:"rgba(142,68,173,0.07)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
            <Calendar style={{width:22,height:22,color:"rgba(142,68,173,0.3)"}}/>
          </div>
          <div style={{fontSize:13,color:"rgba(20,45,70,0.4)",fontWeight:600}}>Nenhuma atividade agendada</div>
          <div style={{fontSize:11,color:"rgba(20,45,70,0.3)",marginTop:4}}>Agende pelo calendário e as respostas aparecerão aqui</div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {atividades.map((a: any) => {
            const cfg = STATUS_ATIV[a.status] || STATUS_ATIV.talvez;
            return (
              <div key={a.atividade_id||a.id||Math.random()} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,background:cfg.bg,border:`1.5px solid ${cfg.border}`,transition:"all 0.18s"}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:cfg.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 2px 8px ${cfg.color}55`}}>
                  {cfg.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#0f2133",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.titulo||a.nome||"Atividade"}</div>
                  <div style={{fontSize:10,color:"rgba(20,45,70,0.5)",marginTop:1}}>{fmt(a.data_hora||a.data)}</div>
                </div>
                <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,background:cfg.color,color:"#fff",flexShrink:0,boxShadow:`0 2px 6px ${cfg.color}44`,whiteSpace:"nowrap"}}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function EmpresaEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [segmentos, setSegmentos] = useState<string[]>(SEGMENTOS_PADRAO);
  const [contatos, setContatos] = useState<any[]>([]);
  const [deletedContatoIds, setDeletedContatoIds] = useState<string[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [usuario, setUsuario] = useState<any>(null);

  const [form, setForm] = useState({
    nome:"", segmento:"", porte:"", cidade:"", endereco:"",
    cep:"", bairro:"", regiao:"", observacoes:"", cnpj:"",
    site:"", linkedin_empresa:"", responsavel_principal:"",
    ticket_medio_estimado:"", status:"", origem_lead:"",
    proxima_acao:"", temperatura:"", ultima_interacao:"",
    data_proxima_acao:"",
  });

  const setF = (k: string, v: string) => setForm(p=>({...p,[k]:v}));

  const segmentosOrdenados = useMemo(() => uniqueSorted(segmentos), [segmentos]);
  const segmentoExiste = useMemo(() =>
    segmentosOrdenados.some(s => normalizeStr(s) === normalizeStr(form.segmento)),
    [form.segmento, segmentosOrdenados]
  );

  const addToast = (msg: string, type: "success" | "error") => {
    const t = { id: Date.now(), msg, type };
    setToasts(prev => [...prev, t]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3500);
  };

  const token = () => localStorage.getItem("token") || "";
  const hdrs = () => ({ "Content-Type":"application/json", Authorization:`Bearer ${token()}` });

  useEffect(() => {
    const load = async () => {
      try {
        const [empRes, meRes, segRes] = await Promise.all([
          fetch(`${API}/empresas/${id}`, { headers: hdrs() }),
          fetch(`${API}/me`, { headers: hdrs() }),
          fetch(`${API}/segmentos`),
        ]);
        if(!empRes.ok) { navigate("/clientes"); return; }
        const emp = await empRes.json();
        setForm({
          nome: emp.nome||"", segmento: emp.segmento||"", porte: emp.porte||"",
          cidade: emp.cidade||"", endereco: emp.endereco||"", cep: emp.cep||"",
          bairro: emp.bairro||"", regiao: emp.regiao||"", observacoes: emp.observacoes||"",
          cnpj: emp.cnpj||"", site: emp.site||"", linkedin_empresa: emp.linkedin_empresa||"",
          responsavel_principal: emp.responsavel_principal||"",
          ticket_medio_estimado: emp.ticket_medio_estimado?.toString()||"",
          status: emp.status||"", origem_lead: emp.origem_lead||"",
          proxima_acao: emp.proxima_acao||"", temperatura: emp.temperatura||"",
          ultima_interacao: dateOnly(emp.ultima_interacao),
          data_proxima_acao: dateOnly(emp.data_proxima_acao),
        });
        if(meRes.ok) setUsuario(await meRes.json());
        if(segRes.ok) {
          const segData = await segRes.json();
          const arr = Array.isArray(segData) ? segData : segData.segmentos||[];
          setSegmentos(prev => uniqueSorted([...prev,...arr]));
        }
        // Carregar contatos
        try {
          const cRes = await fetch(`${API}/empresas/${id}/contatos`, { headers: hdrs() });
          if(cRes.ok) {
            const cData = await cRes.json();
            setContatos(cData.map((c: any) => ({
              ...c,
              _localId: c.contato_id || Date.now() + Math.random(),
              isNew: false,
            })));
          }
        } catch {}
        // Carregar atividades vinculadas
        try {
          const aRes = await fetch(`${API}/empresas/${id}/atividades`, { headers: hdrs() });
          if(aRes.ok) setAtividades(await aRes.json());
        } catch {}
      } catch { navigate("/clientes"); }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleContatoChange = (localId: number, field: string, value: any) => {
    setContatos(prev => prev.map(c => c._localId===localId ? {...c,[field]:value} : c));
  };

  const addContato = () => setContatos(prev => [...prev, contatoVazio()]);

  const removeContato = (localId: number) => {
    const c = contatos.find(x => x._localId===localId);
    if(c?.contato_id) setDeletedContatoIds(prev => [...prev, c.contato_id]);
    setContatos(prev => prev.filter(x => x._localId!==localId));
  };

  const handleSubmit = async () => {
    if(!form.nome.trim()) { addToast("Nome da empresa é obrigatório","error"); return; }
    if(!form.segmento.trim()) { addToast("Segmento é obrigatório","error"); return; }
    setSaving(true);
    try {
      // 1. Validar segmento novo se necessário
      let segValidado = form.segmento.trim();
      if(!segmentoExiste) {
        const segRes = await fetch(`${API}/segmentos`, {
          method:"POST", headers: hdrs(),
          body: JSON.stringify({ nome: segValidado }),
        });
        if(segRes.ok) {
          const d = await segRes.json();
          segValidado = d.nome || segValidado;
          setSegmentos(prev => uniqueSorted([...prev, segValidado]));
        }
      }

      // 2. Salvar empresa
      const body: any = {
        nome: form.nome, segmento: segValidado, porte: form.porte,
        cidade: form.cidade, endereco: form.endereco, cep: form.cep,
        bairro: form.bairro, regiao: form.regiao, observacoes: form.observacoes,
        cnpj: form.cnpj, site: form.site, linkedin_empresa: form.linkedin_empresa,
        responsavel_principal: form.responsavel_principal,
        ticket_medio_estimado: form.ticket_medio_estimado ? parseFloat(form.ticket_medio_estimado) : null,
        status: form.status, origem_lead: form.origem_lead,
        proxima_acao: form.proxima_acao, temperatura: form.temperatura,
      };
      if(form.ultima_interacao) body.ultima_interacao = `${form.ultima_interacao}T00:00:00`;
      if(form.data_proxima_acao) body.data_proxima_acao = form.data_proxima_acao;

      const empRes = await fetch(`${API}/empresas/${id}`, {
        method:"PUT", headers: hdrs(), body: JSON.stringify(body),
      });
      if(!empRes.ok) throw new Error("Erro ao salvar empresa");

      // 3. Deletar contatos removidos
      for(const cid of deletedContatoIds) {
        await fetch(`${API}/contatos/${cid}`, { method:"DELETE", headers: hdrs() }).catch(()=>{});
      }

      // 4. Atualizar/criar contatos
      for(const c of contatos) {
        const payload = {
          empresa_id: id, nome: c.nome, funcao: c.funcao,
          email: c.email, celular: c.celular, whatsapp: c.whatsapp,
          linkedin: c.linkedin, observacoes: c.observacoes, prioridade: c.prioridade,
          nivel_influencia: c.nivel_influencia, decisor: c.decisor,
          canal_preferido: c.canal_preferido,
          data_ultimo_contato: c.data_ultimo_contato || null,
        };
        if(c.contato_id) {
          await fetch(`${API}/contatos/${c.contato_id}`, {
            method:"PUT", headers: hdrs(), body: JSON.stringify(payload),
          }).catch(()=>{});
        } else if(c.nome.trim()) {
          await fetch(`${API}/contatos`, {
            method:"POST", headers: hdrs(), body: JSON.stringify(payload),
          }).catch(()=>{});
        }
      }

      addToast("Empresa salva com sucesso ✓","success");
      setTimeout(() => navigate(`/clientes/${id}`), 800);
    } catch(err) {
      addToast(err instanceof Error ? err.message : "Erro ao salvar","error");
    } finally {
      setSaving(false);
    }
  };

  const initials = (n: string) => n?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";
  const avatarColor = (n: string) => { const c=["#2980b9","#1abc9c","#8e44ad","#e67e22","#27ae60","#e74c3c"]; return c[(n?.charCodeAt(0)||0)%c.length]; };

  if(loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(145deg,#c8e8f5,#c5eae0)"}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
        <Loader className="spin" style={{width:28,height:28,color:"#2980b9"}}/>
        <div style={{fontSize:13,color:"rgba(20,45,70,0.5)",fontWeight:600}}>Carregando empresa...</div>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",position:"relative"}}>
      <style>{css}</style>

      {/* Toasts */}
      <div style={{position:"fixed",bottom:28,right:28,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
        <AnimatePresence>
          {toasts.map(t=>(
            <motion.div key={t.id} className="toast" initial={{x:80,opacity:0}} animate={{x:0,opacity:1}} exit={{x:80,opacity:0}}
              style={{background:t.type==="success"?"rgba(39,174,96,0.95)":"rgba(220,38,38,0.95)",color:"#fff"}}>
              {t.type==="success"?<CheckCircle style={{width:16,height:16}}/>:<XCircle style={{width:16,height:16}}/>}
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Fundo animado */}
      <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(145deg,#c8e8f5 0%,#d6eef5 30%,#cceee8 65%,#c5eae0 100%)"}}/>
        <div style={{position:"absolute",inset:0,opacity:0.4,backgroundImage:"radial-gradient(circle,rgba(41,128,185,0.2) 1px,transparent 1px)",backgroundSize:"22px 22px"}}/>
        {[
          {w:420,h:420,top:"-80px",left:"10%",anim:"float1 18s ease-in-out infinite",op:0.1,c1:"#2980b9",c2:"#1abc9c"},
          {w:280,h:280,top:"40%",left:"-60px",anim:"float2 22s ease-in-out infinite",op:0.08,c1:"#1abc9c",c2:"#2ecc71"},
          {w:360,h:360,top:"60%",left:"55%",anim:"float3 26s ease-in-out infinite",op:0.07,c1:"#2980b9",c2:"#8e44ad"},
          {w:200,h:200,top:"20%",left:"75%",anim:"float4 20s ease-in-out infinite",op:0.09,c1:"#27ae60",c2:"#1abc9c"},
        ].map((c,i)=>(
          <div key={i} style={{position:"absolute",width:c.w,height:c.h,top:c.top,left:c.left,borderRadius:"50%",background:`radial-gradient(circle at 40% 40%,${c.c1},${c.c2})`,opacity:c.op,animation:c.anim,filter:"blur(2px)"}}/>
        ))}
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
            <div key={item.label} className="nav-item" onClick={()=>item.path&&navigate(item.path)}>
              <item.icon style={{width:16,height:16}}/>{item.label}
            </div>
          ))}
        </nav>
        <div onClick={()=>navigate("/perfil")} style={{marginTop:16,padding:"12px",borderRadius:12,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.12)")} onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,0.06)")}>
          <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${avatarColor(usuario?.nome||"")},#1abc9c)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{initials(usuario?.nome||"?")}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{usuario?.nome||"..."}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.45)"}}>{usuario?.cargo||"Administrador"}</div>
          </div>
        </div>
      </div>

      {/* Área principal */}
      <div style={{flex:1,height:"100vh",overflowY:"auto",position:"relative",zIndex:5}}>

        {/* Top bar */}
        <div style={{position:"sticky",top:0,zIndex:20,padding:"14px 28px",background:"rgba(210,238,248,0.75)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.6)",display:"flex",alignItems:"center",gap:16}}>
          <button className="btn-ghost" style={{height:38,padding:"0 14px",fontSize:13}} onClick={()=>navigate(`/clientes/${id}`)}>
            <ArrowLeft style={{width:15,height:15}}/> Voltar
          </button>
          <div style={{flex:1}}>
            <h1 style={{fontSize:18,fontWeight:800,color:"#0f2133",letterSpacing:"-0.02em"}}>Editar Empresa</h1>
            <p style={{fontSize:12,color:"rgba(20,45,70,0.5)",marginTop:1}}>{form.nome||"..."} — todas as alterações são salvas no banco de dados</p>
          </div>
          <button className="btn-grad" style={{height:38,padding:"0 18px",fontSize:13,opacity:saving?0.7:1}} onClick={handleSubmit} disabled={saving}>
            {saving?<Loader className="spin" style={{width:14,height:14}}/>:<Save style={{width:15,height:15}}/>}
            {saving?"Salvando...":"Salvar Alterações"}
          </button>
        </div>

        {/* Conteúdo */}
        <div style={{padding:"24px 28px 48px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:20,alignItems:"start"}}>

            {/* Coluna esquerda */}
            <div style={{display:"flex",flexDirection:"column",gap:16}}>

              {/* Informações Principais */}
              <motion.div className="glass-card" style={{padding:"24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.32}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"rgba(41,128,185,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Building2 style={{width:17,height:17,color:"#2980b9"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#0f2133"}}>Informações Principais</div>
                    <div style={{fontSize:11,color:"rgba(20,45,70,0.45)"}}>Dados da empresa</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div style={{gridColumn:"1 / -1"}}>
                    <Field label="Nome da Empresa *">
                      <IconInput icon={Building2} placeholder="Nome completo" value={form.nome} onChange={(e:any)=>setF("nome",e.target.value)}/>
                    </Field>
                  </div>
                  <Field label="Segmento *">
                    <SegmentoAutocomplete value={form.segmento} onChange={v=>setF("segmento",v)} opcoes={segmentosOrdenados}/>
                    {form.segmento.trim()&&!segmentoExiste&&(
                      <div style={{marginTop:5,fontSize:10,fontWeight:600,color:"#e67e22",display:"flex",alignItems:"center",gap:4}}>
                        <AlertTriangle style={{width:11,height:11}}/> Segmento novo — será validado ao salvar
                      </div>
                    )}
                    {form.segmento.trim()&&segmentoExiste&&(
                      <div style={{marginTop:5,fontSize:10,fontWeight:600,color:"#27ae60",display:"flex",alignItems:"center",gap:4}}>
                        <CheckCircle style={{width:11,height:11}}/> Segmento reconhecido
                      </div>
                    )}
                  </Field>
                  <Field label="Porte">
                    <select className="field-select" value={form.porte} onChange={e=>setF("porte",e.target.value)}>
                      <option value="">Selecionar...</option>
                      <option>Pequeno</option><option>Médio</option><option>Grande</option>
                    </select>
                  </Field>
                  <Field label="CNPJ">
                    <IconInput icon={Hash} placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e:any)=>setF("cnpj",formatCnpj(e.target.value))}/>
                  </Field>
                  <Field label="Responsável Principal">
                    <IconInput icon={User} placeholder="Nome do responsável" value={form.responsavel_principal} onChange={(e:any)=>setF("responsavel_principal",e.target.value)}/>
                  </Field>
                  <Field label="Ticket Médio (R$)">
                    <input className="field-input" type="number" placeholder="0,00" value={form.ticket_medio_estimado} onChange={e=>setF("ticket_medio_estimado",e.target.value)}/>
                  </Field>
                  <Field label="Site">
                    <IconInput icon={Globe} type="url" placeholder="https://empresa.com.br" value={form.site} onChange={(e:any)=>setF("site",e.target.value)}/>
                  </Field>
                  <Field label="LinkedIn da Empresa">
                    <IconInput icon={Link2} placeholder="linkedin.com/company/..." value={form.linkedin_empresa} onChange={(e:any)=>setF("linkedin_empresa",e.target.value)}/>
                  </Field>
                </div>
              </motion.div>

              {/* Localização */}
              <motion.div className="glass-card" style={{padding:"24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.32,delay:0.06}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"rgba(26,188,156,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <MapPin style={{width:17,height:17,color:"#1abc9c"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#0f2133"}}>Localização</div>
                    <div style={{fontSize:11,color:"rgba(20,45,70,0.45)"}}>Endereço completo</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <Field label="Cidade"><IconInput icon={MapPin} placeholder="Nome da cidade" value={form.cidade} onChange={(e:any)=>setF("cidade",e.target.value)}/></Field>
                  <Field label="CEP"><input className="field-input" placeholder="00000-000" value={form.cep} onChange={e=>setF("cep",formatCep(e.target.value))}/></Field>
                  <div style={{gridColumn:"1 / -1"}}><Field label="Endereço"><input className="field-input" placeholder="Rua, número, complemento" value={form.endereco} onChange={e=>setF("endereco",e.target.value)}/></Field></div>
                  <Field label="Bairro"><input className="field-input" placeholder="Bairro" value={form.bairro} onChange={e=>setF("bairro",e.target.value)}/></Field>
                  <Field label="Região"><input className="field-input" placeholder="ex: Sul, Norte, Centro..." value={form.regiao} onChange={e=>setF("regiao",e.target.value)}/></Field>
                </div>
              </motion.div>

              {/* Observações */}
              <motion.div className="glass-card" style={{padding:"24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.32,delay:0.12}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"rgba(142,68,173,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <FileText style={{width:17,height:17,color:"#8e44ad"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#0f2133"}}>Observações</div>
                    <div style={{fontSize:11,color:"rgba(20,45,70,0.45)"}}>Notas internas</div>
                  </div>
                </div>
                <Field label="Observações">
                  <textarea className="field-textarea" placeholder="Contexto do lead, pontos importantes..." value={form.observacoes} onChange={e=>setF("observacoes",e.target.value)}/>
                </Field>
              </motion.div>
            </div>

            {/* Coluna direita */}
            <div style={{display:"flex",flexDirection:"column",gap:16}}>

              {/* Dados de Prospecção */}
              <motion.div className="glass-card" style={{padding:"24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.32,delay:0.04}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"rgba(230,126,34,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Target style={{width:17,height:17,color:"#e67e22"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#0f2133"}}>Dados de Prospecção</div>
                    <div style={{fontSize:11,color:"rgba(20,45,70,0.45)"}}>Status e qualificação</div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <Field label="Status">
                    <select className="field-select" value={form.status} onChange={e=>setF("status",e.target.value)}>
                      <option value="">Selecionar...</option>
                      {STATUS_OPTS.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </Field>
                  <Field label="Temperatura">
                    <div style={{display:"flex",gap:6,marginTop:2}}>
                      {(["Frio","Morno","Quente"] as const).map(t=>(
                        <button key={t} className={`temp-btn ${t.toLowerCase()}${form.temperatura===t?" active":""}`} onClick={()=>setF("temperatura",t)}>
                          <Thermometer style={{width:12,height:12}}/>{t}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Origem do Lead">
                    <select className="field-select" value={form.origem_lead} onChange={e=>setF("origem_lead",e.target.value)}>
                      <option value="">Selecionar...</option>
                      {ORIGEM_OPTS.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </Field>
                </div>
              </motion.div>

              {/* Acompanhamento */}
              <motion.div className="glass-card" style={{padding:"24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.32,delay:0.10}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"rgba(39,174,96,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Clock style={{width:17,height:17,color:"#27ae60"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#0f2133"}}>Acompanhamento</div>
                    <div style={{fontSize:11,color:"rgba(20,45,70,0.45)"}}>Ações e datas</div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <Field label="Última Interação">
                    <input className="field-input" type="date" value={form.ultima_interacao} onChange={e=>setF("ultima_interacao",e.target.value)}/>
                  </Field>
                  <Field label="Data Próxima Ação">
                    <input className="field-input" type="date" value={form.data_proxima_acao} onChange={e=>setF("data_proxima_acao",e.target.value)}/>
                  </Field>
                  <Field label="Próxima Ação">
                    <select className="field-select" value={form.proxima_acao} onChange={e=>setF("proxima_acao",e.target.value)}>
                      <option value="">Selecionar...</option>
                      {PROXIMAS_ACOES.map(a=><option key={a}>{a}</option>)}
                    </select>
                  </Field>
                </div>
              </motion.div>

            </div>
          </div>

          {/* Contatos + Atividades */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginTop:20}}>
            <ContatosSingleCard contatos={contatos} onAdd={addContato} onChange={handleContatoChange} onRemove={removeContato}/>
            <AtividadesCard atividades={atividades}/>
          </div>

          {/* Rodapé */}
          <div style={{marginTop:28,display:"flex",justifyContent:"flex-end",gap:10}}>
            <button className="btn-ghost" style={{height:44,padding:"0 20px",fontSize:13}} onClick={()=>navigate(`/clientes/${id}`)}>Cancelar</button>
            <button className="btn-grad" style={{height:44,padding:"0 28px",fontSize:14,opacity:saving?0.75:1}} onClick={handleSubmit} disabled={saving}>
              {saving?<Loader className="spin" style={{width:15,height:15}}/>:<Save style={{width:16,height:16}}/>}
              {saving?"Salvando...":"Salvar Alterações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}