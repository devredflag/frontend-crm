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
  v.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ");

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

// ── ContatoCard para edição ───────────────────────────────────
function ContatoCard({ contato, index, onChange, onRemove }: {
  contato: any; index: number;
  onChange: (localId: number, field: string, value: any) => void;
  onRemove: (localId: number) => void;
}) {
  const up = (f: string, v: any) => onChange(contato._localId, f, v);
  const cor = ["#2980b9","#1abc9c","#e67e22","#8e44ad","#27ae60"][index%5];
  const ini = contato.nome ? contato.nome.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase() : "?";
  return (
    <motion.div className="contact-card" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <div style={{width:38,height:38,borderRadius:"50%",background:cor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>{ini}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:"#0f2133"}}>{contato.nome||`Contato ${index+1}`}</div>
          <div style={{fontSize:11,color:"rgba(20,45,70,0.4)"}}>{contato.funcao||"Função não definida"}</div>
        </div>
        {contato.isNew&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,background:"rgba(41,128,185,0.1)",color:"#2980b9"}}>NOVO</span>}
        <div className={`checkbox-decisor${contato.decisor?" checked":""}`} onClick={()=>up("decisor",!contato.decisor)}>
          <div className="box">{contato.decisor&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="2,5 4,7.5 8,2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
          <span style={{fontSize:11,fontWeight:600,color:contato.decisor?"#27ae60":"rgba(20,45,70,0.5)"}}>Decisor</span>
        </div>
        <button onClick={()=>onRemove(contato._localId)} style={{width:32,height:32,borderRadius:8,border:"1.5px solid rgba(231,76,60,0.2)",background:"rgba(231,76,60,0.06)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#e74c3c",transition:"all 0.18s"}} onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(231,76,60,0.14)";}} onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(231,76,60,0.06)";}}>
          <Trash2 style={{width:13,height:13}}/>
        </button>
      </div>
      <div style={{marginBottom:14}}>
        <div className="field-label" style={{marginBottom:6}}>Prioridade</div>
        <div style={{display:"flex",gap:6}}>
          {(["Alta","Media","Baixa"] as const).map(p=>(
            <button key={p} className={`prio-btn ${p.toLowerCase()}${contato.prioridade===p?" active":""}`} onClick={()=>up("prioridade",p)}>{p==="Media"?"Média":p}</button>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="Nome"><IconInput icon={User} placeholder="Nome completo" value={contato.nome} onChange={(e:any)=>up("nome",e.target.value)}/></Field>
        <Field label="Função / Cargo"><IconInput icon={Briefcase} placeholder="ex: Diretor Comercial" value={contato.funcao} onChange={(e:any)=>up("funcao",e.target.value)}/></Field>
        <Field label="Email"><IconInput icon={Mail} type="email" placeholder="email@empresa.com" value={contato.email} onChange={(e:any)=>up("email",e.target.value)}/></Field>
        <Field label="Celular"><IconInput icon={Phone} placeholder="(00) 00000-0000" value={contato.celular} onChange={(e:any)=>up("celular",formatPhone(e.target.value))}/></Field>
        <Field label="WhatsApp"><IconInput icon={Phone} placeholder="(00) 00000-0000" value={contato.whatsapp} onChange={(e:any)=>up("whatsapp",formatPhone(e.target.value))}/></Field>
        <Field label="LinkedIn"><IconInput icon={Link2} placeholder="linkedin.com/in/..." value={contato.linkedin} onChange={(e:any)=>up("linkedin",e.target.value)}/></Field>
        <Field label="Canal Preferido">
          <select className="field-select" value={contato.canal_preferido} onChange={(e:any)=>up("canal_preferido",e.target.value)}>
            <option value="">Selecionar...</option>
            <option>Email</option><option>WhatsApp</option><option>Telefone</option><option>LinkedIn</option><option>Presencial</option>
          </select>
        </Field>
        <Field label="Nível de Influência">
          <select className="field-select" value={contato.nivel_influencia} onChange={(e:any)=>up("nivel_influencia",e.target.value)}>
            <option value="">Selecionar...</option>
            <option>Alto</option><option>Médio</option><option>Baixo</option>
          </select>
        </Field>
        <Field label="Último Contato"><input className="field-input" type="date" value={contato.data_ultimo_contato} onChange={(e:any)=>up("data_ultimo_contato",e.target.value)}/></Field>
        <Field label="Observações"><input className="field-input" placeholder="Notas rápidas..." value={contato.observacoes} onChange={(e:any)=>up("observacoes",e.target.value)}/></Field>
      </div>
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

              {/* Preview contatos */}
              <motion.div className="glass-card" style={{padding:"20px 24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.32,delay:0.16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#0f2133"}}>Contatos</div>
                  <span style={{padding:"3px 10px",borderRadius:20,background:"rgba(41,128,185,0.1)",color:"#2980b9",fontSize:11,fontWeight:700}}>
                    {contatos.length} contato{contatos.length!==1?"s":""}
                  </span>
                </div>
                {contatos.length===0?(
                  <div style={{padding:"16px 0",textAlign:"center",fontSize:12,color:"rgba(20,45,70,0.4)"}}>Nenhum contato cadastrado</div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {contatos.map((c,i)=>{
                      const cor=["#2980b9","#1abc9c","#e67e22","#8e44ad","#27ae60"][i%5];
                      const ini=c.nome?c.nome.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase():"?";
                      return(
                        <div key={c._localId} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.55)",border:"1px solid rgba(200,225,240,0.5)"}}>
                          <div style={{width:26,height:26,borderRadius:"50%",background:cor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}}>{ini}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:11,fontWeight:600,color:"#0f2133",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.nome||`Contato ${i+1}`}</div>
                            <div style={{fontSize:10,color:"rgba(20,45,70,0.4)"}}>{c.funcao||"—"}</div>
                          </div>
                          {c.decisor&&<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"rgba(39,174,96,0.1)",color:"#27ae60",border:"1px solid rgba(39,174,96,0.2)"}}>Decisor</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Seção contatos */}
          <motion.div style={{marginTop:20}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.32,delay:0.20}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#2980b9,#1abc9c)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(41,128,185,0.3)"}}>
                  <Users style={{width:18,height:18,color:"#fff"}}/>
                </div>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:"#0f2133"}}>Contatos Vinculados</div>
                  <div style={{fontSize:12,color:"rgba(20,45,70,0.45)"}}>Edite, adicione ou remova contatos</div>
                </div>
              </div>
              <button className="btn-grad" style={{height:40,padding:"0 18px",fontSize:13}} onClick={addContato}>
                <Plus style={{width:15,height:15}}/> Adicionar Contato
              </button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
              {contatos.map((c,i)=>(
                <ContatoCard key={c._localId} contato={c} index={i} onChange={handleContatoChange} onRemove={removeContato}/>
              ))}
              <div onClick={addContato} style={{border:"2px dashed rgba(41,128,185,0.25)",borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",padding:"32px 20px",transition:"all 0.18s",minHeight:120,background:"rgba(255,255,255,0.35)"}} onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor="rgba(41,128,185,0.5)";}} onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor="rgba(41,128,185,0.25)";}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(41,128,185,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Plus style={{width:18,height:18,color:"#2980b9"}}/>
                </div>
                <span style={{fontSize:13,fontWeight:600,color:"rgba(41,128,185,0.7)"}}>Adicionar contato</span>
              </div>
            </div>
          </motion.div>

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
