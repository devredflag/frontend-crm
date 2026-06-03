import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Users, LayoutDashboard, Search, Calendar,
  ClipboardList, BarChart3, ChevronDown, ArrowLeft,
  Plus, Trash2, Globe, Link2, Phone, Mail,
  MapPin, Briefcase, Hash, User, Thermometer,
  Target, Clock, Star, CheckSquare,
  FileText, Bell, Save, CheckCircle, XCircle, Loader,
  AlertTriangle, ChevronUp,
} from "lucide-react";

// ── Import do modal de alterações não salvas ──────────────────
import UnsavedChangesModal, { UnsavedChangesAction } from "../../../components/UnsavedChangesModal";
// Ajuste o caminho acima conforme onde você colocou o componente

const API = "https://backend-crm-production-157b.up.railway.app";

const SEGMENTOS_PADRAO = [
  "Academias e Fitness","Administracao de Condominios","Advocacia","Agencia de Marketing",
  "Agencia de Publicidade","Agronegocio","Alimentos e Bebidas","Arquitetura e Urbanismo",
  "Assistencia Tecnica","Atacado e Distribuicao","Automacao Industrial","Autopecas",
  "Bares e Restaurantes","Beleza e Estetica","Biotecnologia","Clinicas Medicas",
  "Comercio Exterior","Comercio Varejista","Concessionarias","Construcao Civil",
  "Consultoria Empresarial","Contabilidade","Coworking","Cursos e Treinamentos",
  "Decoracao","Distribuidora","E-commerce","Educacao","Energia","Energia Solar",
  "Engenharia","Entretenimento","Escritorio de Projetos","Eventos",
  "Farmacias e Drogarias","Financeiro","Franquias","Gestao de Pessoas","Hotelaria",
  "Imobiliarias","Industria Alimenticia","Industria Automotiva","Industria Farmaceutica",
  "Industria Metalurgica","Industria Textil","Logistica e Transporte","Manutencao Predial",
  "Maquinas e Equipamentos","Materiais de Construcao","Moda e Vestuario","Moveis Planejados",
  "Odontologia","Pet Shop","Produtos Agropecuarios","Recursos Humanos","Saude",
  "Seguranca Eletronica","Seguros","Servicos de Limpeza","Servicos Financeiros",
  "Software e SaaS","Supermercados","Tecnologia da Informacao","Telecomunicacoes",
  "Turismo","Venda de Gado","Vendas B2B","Veterinaria","Agropecuaria",
  "Clinicas Odontologicas","Confeitaria","Delivery","Grafica","Hospitais",
  "Jardinagem e Paisagismo","Laboratorios","Laticinios","Lavanderias","Marcenaria",
  "Padarias","Papelarias","Postos de Combustivel","Serralheria","Transportadoras",
];

const PROXIMAS_ACOES = [
  "Ligar","Enviar WhatsApp","Enviar email","Conectar no LinkedIn",
  "Agendar reuniao","Enviar apresentacao","Enviar proposta","Fazer follow-up",
  "Agendar visita","Solicitar documentos","Aguardar retorno","Sem proxima acao",
];

const uniqueSorted = (items: string[]) =>
  Array.from(new Set(items.filter(Boolean).map((item) => item.trim())))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const formatCnpj = (value: string) =>
  onlyDigits(value).slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");

const formatCep = (value: string) =>
  onlyDigits(value).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

const formatPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return digits.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
};

const normalizeSegmento = (value: string) =>
  value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

const todayInputValue = () => new Date().toISOString().slice(0, 10);
const dateInputToIso = (value: string) =>
  value ? `${value}T00:00:00` : new Date().toISOString();

// ── CSS ───────────────────────────────────────────────────────
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
  @keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(41,128,185,0.25)}50%{box-shadow:0 0 0 8px rgba(41,128,185,0)}}

  .nav-item{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:10px;cursor:pointer;font-size:13.5px;font-weight:500;color:rgba(255,255,255,0.65);transition:all 0.18s;user-select:none;}
  .nav-item:hover{background:rgba(255,255,255,0.08);color:#fff;}
  .nav-item.active{background:rgba(255,255,255,0.14);color:#fff;font-weight:600;}
  .glass-card{background:rgba(255,255,255,0.72);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.9);border-radius:16px;}
  .field-group{display:flex;flex-direction:column;gap:5px;}
  .field-label{font-size:10px;font-weight:700;letter-spacing:0.06em;color:rgba(15,33,51,0.45);text-transform:uppercase;}
  .field-input{height:44px;padding:0 14px;border-radius:10px;border:1.5px solid rgba(200,225,240,0.8);background:rgba(255,255,255,0.75);font-size:13px;color:#0f2133;outline:none;transition:border-color 0.18s,box-shadow 0.18s;width:100%;}
  .field-input:focus{border-color:rgba(41,128,185,0.55);box-shadow:0 0 0 3px rgba(41,128,185,0.1);}
  .field-select{height:44px;padding:0 14px;border-radius:10px;border:1.5px solid rgba(200,225,240,0.8);background:rgba(255,255,255,0.75);font-size:13px;color:#0f2133;outline:none;transition:border-color 0.18s,box-shadow 0.18s;width:100%;cursor:pointer;appearance:none;}
  .field-select:focus{border-color:rgba(41,128,185,0.55);box-shadow:0 0 0 3px rgba(41,128,185,0.1);}
  .field-textarea{padding:12px 14px;border-radius:10px;border:1.5px solid rgba(200,225,240,0.8);background:rgba(255,255,255,0.75);font-size:13px;color:#0f2133;outline:none;transition:border-color 0.18s,box-shadow 0.18s;width:100%;resize:vertical;min-height:80px;}
  .field-textarea:focus{border-color:rgba(41,128,185,0.55);box-shadow:0 0 0 3px rgba(41,128,185,0.1);}
  .field-input-icon{position:relative;display:flex;align-items:center;}
  .field-input-icon .icon{position:absolute;left:12px;color:rgba(20,45,70,0.3);pointer-events:none;}
  .field-input-icon .field-input{padding-left:36px;}

  .seg-wrapper{position:relative;}
  .seg-input-wrap{position:relative;display:flex;align-items:center;}
  .seg-input{height:44px;padding:0 40px 0 36px;border-radius:10px;border:1.5px solid rgba(200,225,240,0.8);background:rgba(255,255,255,0.75);font-size:13px;color:#0f2133;outline:none;transition:border-color 0.18s,box-shadow 0.18s;width:100%;}
  .seg-input:focus{border-color:rgba(41,128,185,0.55);box-shadow:0 0 0 3px rgba(41,128,185,0.1);}
  .seg-input.open{border-color:rgba(41,128,185,0.55);box-shadow:0 0 0 3px rgba(41,128,185,0.1);border-bottom-left-radius:0;border-bottom-right-radius:0;}
  .seg-icon-left{position:absolute;left:12px;color:rgba(20,45,70,0.3);pointer-events:none;width:14px;height:14px;}
  .seg-chevron{position:absolute;right:12px;color:rgba(20,45,70,0.35);pointer-events:none;width:15px;height:15px;transition:transform 0.2s;}
  .seg-chevron.open{transform:rotate(180deg);}
  .seg-dropdown{position:absolute;top:calc(100% - 1px);left:0;right:0;z-index:999;background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);border:1.5px solid rgba(41,128,185,0.45);border-top:1px solid rgba(200,225,240,0.5);border-bottom-left-radius:10px;border-bottom-right-radius:10px;box-shadow:0 12px 40px rgba(20,45,70,0.14);max-height:240px;overflow-y:auto;}
  .seg-option{padding:10px 14px;font-size:13px;color:#1a2e40;cursor:pointer;transition:background 0.12s;display:flex;align-items:center;gap:8px;}
  .seg-option:hover,.seg-option.highlighted{background:rgba(41,128,185,0.07);color:#2980b9;}
  .seg-option.selected{background:rgba(41,128,185,0.1);color:#2980b9;font-weight:700;}
  .seg-option-new{padding:10px 14px;font-size:13px;cursor:pointer;transition:background 0.12s;display:flex;align-items:center;gap:8px;color:#e67e22;font-weight:600;border-top:1px solid rgba(200,225,240,0.5);}
  .seg-option-new:hover{background:rgba(230,126,34,0.07);}
  .seg-empty{padding:14px;font-size:12px;color:rgba(20,45,70,0.4);text-align:center;}

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
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:rgba(41,128,185,0.25);border-radius:4px;}
`;

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",                path: "/dashboard",      active: false },
  { icon: Search,          label: "Buscar Empresas",           path: null,              active: false },
  { icon: Building2,       label: "Cadastrar Empresas",        path: "/empresas/nova",  active: true  },
  { icon: Users,           label: "Todos os clientes",         path: "/clientes",       active: false },
  { icon: ClipboardList,   label: "Gerenciamento de clientes", path: "/gerenciamento",  active: false },
  { icon: Calendar,        label: "Calendário",                path: "/calendario",     active: false },
];

const contatoVazio = () => ({
  id: Date.now() + Math.random(),
  nome: "", funcao: "", email: "", celular: "", whatsapp: "",
  linkedin: "", observacoes: "", prioridade: "Media",
  nivel_influencia: "", decisor: false, canal_preferido: "", data_ultimo_contato: "",
});

type ValidacaoStatus = "idle" | "buscando" | "encontrado" | "novo" | "erro";

// ── Componente: Modal de Validação ────────────────────────────
function ValidacaoModal({
  status, segmento, onConfirm, onCancel,
}: {
  status: ValidacaoStatus;
  segmento: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const configs = {
    buscando: {
      icon: <Loader className="spin" style={{width:32,height:32,color:"#2980b9"}}/>,
      title: "Validando Segmento",
      sub: `Verificando "${segmento}" na base de dados...`,
      color: "#2980b9",
      bg: "rgba(41,128,185,0.08)",
      border: "rgba(41,128,185,0.2)",
      showButtons: false,
    },
    encontrado: {
      icon: <CheckCircle style={{width:32,height:32,color:"#27ae60"}}/>,
      title: "Segmento Confirmado",
      sub: `"${segmento}" foi encontrado e validado com sucesso.`,
      color: "#27ae60",
      bg: "rgba(39,174,96,0.08)",
      border: "rgba(39,174,96,0.25)",
      showButtons: true,
    },
    novo: {
      icon: <Star style={{width:32,height:32,color:"#e67e22"}}/>,
      title: "Segmento Novo",
      sub: `"${segmento}" não existe na base. Deseja adicioná-lo?`,
      color: "#e67e22",
      bg: "rgba(230,126,34,0.08)",
      border: "rgba(230,126,34,0.25)",
      showButtons: true,
    },
    erro: {
      icon: <XCircle style={{width:32,height:32,color:"#dc2626"}}/>,
      title: "Segmento Inválido",
      sub: `"${segmento}" não é um segmento reconhecido. Por favor, escolha um da lista ou use um nome mais específico.`,
      color: "#dc2626",
      bg: "rgba(220,38,38,0.06)",
      border: "rgba(220,38,38,0.2)",
      showButtons: false,
    },
  };

  const cfg = configs[status as keyof typeof configs];
  if (!cfg) return null;

  return (
    <motion.div
      initial={{opacity:0}}
      animate={{opacity:1}}
      exit={{opacity:0}}
      style={{
        position:"fixed",inset:0,zIndex:9999,
        display:"flex",alignItems:"center",justifyContent:"center",
        background:"rgba(10,31,51,0.35)",backdropFilter:"blur(6px)",
      }}
      onClick={status==="buscando"?undefined:onCancel}
    >
      <motion.div
        initial={{scale:0.88,opacity:0,y:20}}
        animate={{scale:1,opacity:1,y:0}}
        exit={{scale:0.92,opacity:0,y:12}}
        transition={{duration:0.22,ease:[0.4,0,0.2,1]}}
        onClick={e=>e.stopPropagation()}
        style={{
          width:420,background:"rgba(248,252,255,0.97)",
          backdropFilter:"blur(24px)",
          borderRadius:20,
          border:`1.5px solid ${cfg.border}`,
          boxShadow:`0 24px 64px rgba(10,31,51,0.22), 0 0 0 1px ${cfg.border}`,
          padding:"32px 28px 24px",
          overflow:"hidden",
          position:"relative",
        }}
      >
        <div style={{position:"absolute",top:0,left:0,right:0,height:4,background:`linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)`,borderRadius:"20px 20px 0 0"}}/>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{width:64,height:64,borderRadius:18,background:cfg.bg,border:`1.5px solid ${cfg.border}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
            {cfg.icon}
          </div>
          <div style={{fontSize:17,fontWeight:800,color:"#0f2133",marginBottom:6}}>{cfg.title}</div>
          <div style={{fontSize:13,color:"rgba(20,45,70,0.55)",lineHeight:1.55,maxWidth:320,margin:"0 auto"}}>{cfg.sub}</div>
        </div>
        {status==="buscando"&&(
          <div style={{marginBottom:8}}>
            <div style={{height:3,borderRadius:3,background:"rgba(200,225,240,0.5)",overflow:"hidden"}}>
              <motion.div initial={{x:"-100%"}} animate={{x:"100%"}} transition={{repeat:Infinity,duration:1.2,ease:"easeInOut"}} style={{height:"100%",width:"60%",borderRadius:3,background:`linear-gradient(90deg,transparent,${cfg.color},transparent)`}}/>
            </div>
          </div>
        )}
        {cfg.showButtons&&(
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <button onClick={onCancel} className="btn-ghost" style={{flex:1,height:44,fontSize:13}}>Cancelar</button>
            <button onClick={onConfirm} className="btn-grad" style={{flex:2,height:44,fontSize:13}}>
              {status==="encontrado"?<><Save style={{width:14,height:14}}/> Salvar empresa</>:<><Plus style={{width:14,height:14}}/> Adicionar e salvar</>}
            </button>
          </div>
        )}
        {status==="erro"&&(
          <button onClick={onCancel} className="btn-ghost" style={{width:"100%",height:44,fontSize:13,marginTop:8}}>Voltar e corrigir</button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Componente: Autocomplete de Segmento ──────────────────────
function SegmentoAutocomplete({
  value, onChange, opcoes, hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  opcoes: string[];
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!value.trim()) return opcoes.slice(0, 80);
    const q = normalizeSegmento(value);
    return opcoes.filter(o => normalizeSegmento(o).includes(q)).slice(0, 60);
  }, [value, opcoes]);

  const exactMatch = useMemo(() =>
    opcoes.some(o => normalizeSegmento(o) === normalizeSegmento(value)),
    [value, opcoes]
  );

  const showNew = value.trim() && !exactMatch && filtered.length < 60;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const select = (v: string) => { onChange(v); setOpen(false); setHighlighted(-1); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const total = filtered.length + (showNew ? 1 : 0);
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => (h + 1) % total); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => (h - 1 + total) % total); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && highlighted < filtered.length) select(filtered[highlighted]);
      else if (highlighted === filtered.length && showNew) select(value.trim());
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="seg-wrapper" ref={wrapRef}>
      <div className="seg-input-wrap">
        <Briefcase className="seg-icon-left"/>
        <input
          ref={inputRef}
          className={`seg-input${open?" open":""}`}
          placeholder="Selecione ou digite um segmento"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          style={hasError&&!value.trim()?{borderColor:"rgba(231,76,60,0.6)",background:"rgba(231,76,60,0.03)"}:{}}
        />
        <ChevronDown className={`seg-chevron${open?" open":""}`}/>
      </div>
      <AnimatePresence>
        {open&&(
          <motion.div className="seg-dropdown" initial={{opacity:0,y:-6,scaleY:0.95}} animate={{opacity:1,y:0,scaleY:1}} exit={{opacity:0,y:-6,scaleY:0.95}} transition={{duration:0.15,ease:[0.4,0,0.2,1]}} style={{transformOrigin:"top"}}>
            {filtered.length===0&&!showNew&&<div className="seg-empty">Nenhum segmento encontrado</div>}
            {filtered.map((opt, i) => (
              <div key={opt} className={`seg-option${normalizeSegmento(opt)===normalizeSegmento(value)?" selected":""}${highlighted===i?" highlighted":""}`} onMouseDown={e=>{e.preventDefault();select(opt);}} onMouseEnter={()=>setHighlighted(i)}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"rgba(41,128,185,0.35)",flexShrink:0}}/>{opt}
              </div>
            ))}
            {showNew&&(
              <div className={`seg-option-new${highlighted===filtered.length?" highlighted":""}`} onMouseDown={e=>{e.preventDefault();select(value.trim());}} onMouseEnter={()=>setHighlighted(filtered.length)}>
                <Plus style={{width:13,height:13}}/> Adicionar "{value.trim()}" como novo segmento
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
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
function IconInput({ icon: Icon, ...props }: any) {
  return (
    <div className="field-input-icon">
      <Icon className="icon" style={{ width: 14, height: 14 }} />
      <input className="field-input" {...props} />
    </div>
  );
}

// ── ContatoCard ───────────────────────────────────────────────
function ContatoCard({ contato, index, onChange, onRemove }: {
  contato: any; index: number;
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (id: number) => void;
}) {
  const up = (field: string, value: any) => onChange(index, field, value);
  const color = ["#2980b9","#1abc9c","#e67e22","#8e44ad","#27ae60"][index % 5];
  const initials = contato.nome ? contato.nome.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  return (
    <motion.div className="contact-card" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <div style={{width:38,height:38,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>{initials}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:"#0f2133"}}>{contato.nome||`Contato ${index+1}`}</div>
          <div style={{fontSize:11,color:"rgba(20,45,70,0.4)"}}>{contato.funcao||"Função não definida"}</div>
        </div>
        <div className={`checkbox-decisor${contato.decisor?" checked":""}`} onClick={()=>up("decisor",!contato.decisor)}>
          <div className="box">
            {contato.decisor&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="2,5 4,7.5 8,2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span style={{fontSize:11,fontWeight:600,color:contato.decisor?"#27ae60":"rgba(20,45,70,0.5)"}}>Decisor</span>
        </div>
        <button onClick={()=>onRemove(contato.id)} style={{width:32,height:32,borderRadius:8,border:"1.5px solid rgba(231,76,60,0.2)",background:"rgba(231,76,60,0.06)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#e74c3c",transition:"all 0.18s"}} onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(231,76,60,0.14)";}} onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(231,76,60,0.06)";}}>
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
export default function NovaEmpresa() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as any)?.prefill || null;

  const [loading, setLoading] = useState(false);
  const [segmentos, setSegmentos] = useState<string[]>(SEGMENTOS_PADRAO);
  const [contatos, setContatos] = useState(() =>
    prefill?.telefone
      ? [{ ...contatoVazio(), celular: prefill.telefone, whatsapp: prefill.telefone }]
      : [contatoVazio()]
  );

  // ── States novos: proteção de navegação ──────────────────
  const [showUnsaved, setShowUnsaved] = useState(false);
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);
  const [formTouched, setFormTouched] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  // Estado da validação
  const [validacaoStatus, setValidacaoStatus] = useState<ValidacaoStatus>("idle");
  const [validacaoSegmento, setValidacaoSegmento] = useState("");
  const submitCallbackRef = useRef<(() => Promise<void>) | null>(null);

  const [empresa, setEmpresa] = useState({
    nome: prefill?.nome || "",
    segmento: "", porte: "",
    cidade: prefill?.cidade || "",
    endereco: prefill?.endereco || "",
    cep: prefill?.cep || "",
    bairro: prefill?.bairro || "",
    regiao: "", observacoes: "",
    cnpj: "",
    site: prefill?.site || "",
    linkedin_empresa: "", responsavel_principal: "",
    status: "Lead", origem_lead: prefill ? "Google Maps" : "",
    ultima_interacao: todayInputValue(), proxima_acao: "", temperatura: "",
  });

  // campos extras do Google Places (não editáveis no form)
  const placesExtra = prefill ? {
    google_place_id: prefill.google_place_id,
    latitude: prefill.latitude,
    longitude: prefill.longitude,
    google_rating: prefill.google_rating,
    google_rating_count: prefill.google_rating_count,
    business_status: prefill.business_status,
  } : {};

  // ── setEmp marca o form como tocado ──────────────────────
  const setEmp = (key: string, val: string) => {
    setEmpresa(p => ({ ...p, [key]: val }));
    setFormTouched(true);
  };

  const segmentosOrdenados = useMemo(() => uniqueSorted(segmentos), [segmentos]);

  const segmentoExiste = useMemo(() =>
    segmentosOrdenados.some(s => normalizeSegmento(s) === normalizeSegmento(empresa.segmento)),
    [empresa.segmento, segmentosOrdenados]
  );

  useEffect(() => {
    let ativo = true;
    const load = async () => {
      try {
        const res = await fetch(`${API}/segmentos`);
        if (!res.ok) return;
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data.segmentos || [];
        if (ativo) setSegmentos(prev => uniqueSorted([...prev, ...arr]));
      } catch {}
    };
    load();
    return () => { ativo = false; };
  }, []);

  const handleContatoChange = (index: number, field: string, value: any) => {
    const novos = [...contatos];
    novos[index] = { ...novos[index], [field]: value };
    setContatos(novos);
    setFormTouched(true);
  };
  const addContato = () => { setContatos(prev => [...prev, contatoVazio()]); setFormTouched(true); };
  const removeContato = (id: number) => setContatos(prev => prev.filter(c => c.id !== id));

  // ── Lógica principal de submit ────────────────────────────
  const doSave = async (segmentoValidado: string) => {
    setLoading(true);
    try {
      const empresaRes = await fetch(`${API}/empresas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: empresa.nome, segmento: segmentoValidado,
          porte: empresa.porte, cidade: empresa.cidade, endereco: empresa.endereco,
          cep: empresa.cep, bairro: empresa.bairro, regiao: empresa.regiao,
          observacoes: empresa.observacoes, cnpj: empresa.cnpj,
          site: empresa.site, linkedin_empresa: empresa.linkedin_empresa,
          responsavel_principal: empresa.responsavel_principal,
          status: "Lead", origem_lead: empresa.origem_lead || "Manual",
          ultima_interacao: dateInputToIso(empresa.ultima_interacao),
          proxima_acao: empresa.proxima_acao, temperatura: empresa.temperatura || "Frio",
          ...placesExtra,
        }),
      });
      const empresaData = await empresaRes.json();
      if (!empresaRes.ok) throw new Error(empresaData.detail || "Erro ao criar empresa");
      const empresaId = empresaData.empresa_id ?? empresaData.id;

      if (empresaId) {
        for (const c of contatos.filter(c => c.nome.trim())) {
          await fetch(`${API}/contatos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              empresa_id: empresaId, nome: c.nome, funcao: c.funcao,
              email: c.email, celular: c.celular, whatsapp: c.whatsapp,
              linkedin: c.linkedin, observacoes: c.observacoes, prioridade: c.prioridade,
              nivel_influencia: c.nivel_influencia, decisor: c.decisor,
              canal_preferido: c.canal_preferido, data_ultimo_contato: c.data_ultimo_contato || null,
            }),
          });
        }
      }
      setFormTouched(false);
      navigate("/dashboard");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const camposObrigatorios = {
    nome: empresa.nome.trim(),
    segmento: empresa.segmento.trim(),
    porte: empresa.porte,
    cidade: empresa.cidade.trim(),
    endereco: empresa.endereco.trim(),
    cep: empresa.cep.trim(),
    bairro: empresa.bairro.trim(),
  };

  const handleSubmit = async () => {
    if (!empresa.nome.trim()) { alert("Nome da empresa é obrigatório"); return; }

    const todosCamposPreenchidos = Object.values(camposObrigatorios).every(Boolean);

    if (!todosCamposPreenchidos) {
      setShowErrors(true);
      await handleAutoRascunho();
      return;
    }

    setShowErrors(false);
    const seg = empresa.segmento.trim();
    setValidacaoSegmento(seg);

    if (segmentoExiste) {
      setValidacaoStatus("buscando");
      await new Promise(r => setTimeout(r, 700));
      setValidacaoStatus("encontrado");
      submitCallbackRef.current = async () => { await doSave(seg); };
    } else {
      setValidacaoStatus("buscando");
      try {
        const res = await fetch(`${API}/segmentos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: seg }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const nomeValidado = data.nome || seg;
          setSegmentos(prev => uniqueSorted([...prev, nomeValidado]));
          setEmp("segmento", nomeValidado);
          setValidacaoSegmento(nomeValidado);
          setValidacaoStatus("novo");
          submitCallbackRef.current = async () => { await doSave(nomeValidado); };
        } else {
          setValidacaoStatus("erro");
        }
      } catch {
        setValidacaoStatus("erro");
      }
    }
  };

  const handleConfirmValidacao = async () => {
    setValidacaoStatus("idle");
    if (submitCallbackRef.current) {
      await submitCallbackRef.current();
      submitCallbackRef.current = null;
    }
  };

  const handleCancelValidacao = () => {
    setValidacaoStatus("idle");
    submitCallbackRef.current = null;
  };

  // ── Navegação protegida ───────────────────────────────────
  const handleNavigateAway = (path: string) => {
    if (!formTouched) { navigate(path); return; }
    setPendingNavPath(path);
    setShowUnsaved(true);
  };

  // ── Ação do modal de alterações não salvas ────────────────
  const handleUnsavedAction = async (action: UnsavedChangesAction) => {
    setShowUnsaved(false);
    if (action === "save") {
      await handleSubmit();
    } else if (action === "draft") {
      await handleSaveDraft();
    } else if (action === "discard") {
      setFormTouched(false);
      navigate(pendingNavPath || "/dashboard");
    }
    // "continue" → só fecha o modal, não faz nada
  };

  // ── Payload base para rascunho ───────────────────────────
  const buildRascunhoPayload = () => ({
    nome: empresa.nome,
    segmento: empresa.segmento?.trim() || null,
    porte: empresa.porte || "Pequeno",
    cidade: empresa.cidade,
    endereco: empresa.endereco,
    cep: empresa.cep,
    bairro: empresa.bairro,
    regiao: empresa.regiao,
    observacoes: empresa.observacoes,
    cnpj: empresa.cnpj,
    site: empresa.site,
    linkedin_empresa: empresa.linkedin_empresa,
    responsavel_principal: empresa.responsavel_principal,
    status: "Rascunho",
    origem_lead: empresa.origem_lead || "Manual",
    ultima_interacao: dateInputToIso(empresa.ultima_interacao),
    proxima_acao: empresa.proxima_acao,
    temperatura: empresa.temperatura || "Frio",
    ...placesExtra,
  });

  // ── Salvar como rascunho (modal unsaved) ─────────────────
  const handleSaveDraft = async () => {
    if (!empresa.nome.trim()) {
      alert("Informe ao menos o nome da empresa para salvar o rascunho");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/empresas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRascunhoPayload()),
      });
      if (!res.ok) throw new Error("Erro ao salvar rascunho");
      setFormTouched(false);
      navigate(pendingNavPath || "/dashboard");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao salvar rascunho");
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-rascunho quando campos obrigatórios incompletos ─
  const handleAutoRascunho = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/empresas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRascunhoPayload()),
      });
      if (!res.ok) throw new Error("Erro ao salvar rascunho");
      const data = await res.json();
      const empresaId = data.empresa_id ?? data.id;
      setFormTouched(false);
      navigate(`/clientes/${empresaId}/editar`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao salvar rascunho");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",position:"relative"}}>
      <style>{css}</style>

      {/* ── Modal: alterações não salvas ── */}
      <UnsavedChangesModal
        open={showUnsaved}
        canSave={!!empresa.nome.trim() && !!empresa.segmento.trim()}
        onAction={handleUnsavedAction}
      />

      {/* ── Modal: validação de segmento ── */}
      <AnimatePresence>
        {validacaoStatus !== "idle" && (
          <ValidacaoModal
            status={validacaoStatus}
            segmento={validacaoSegmento}
            onConfirm={handleConfirmValidacao}
            onCancel={handleCancelValidacao}
          />
        )}
      </AnimatePresence>

      {/* Fundo animado */}
      <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(145deg,#c8e8f5 0%,#d6eef5 30%,#cceee8 65%,#c5eae0 100%)"}}/>
        <div style={{position:"absolute",inset:0,opacity:0.4,backgroundImage:"radial-gradient(circle,rgba(41,128,185,0.2) 1px,transparent 1px)",backgroundSize:"22px 22px"}}/>
        {[
          {w:420,h:420,top:"-80px",left:"10%",anim:"float1 18s ease-in-out infinite",op:0.12,c1:"#2980b9",c2:"#1abc9c"},
          {w:280,h:280,top:"40%",left:"-60px",anim:"float2 22s ease-in-out infinite",op:0.1,c1:"#1abc9c",c2:"#2ecc71"},
          {w:360,h:360,top:"60%",left:"55%",anim:"float3 26s ease-in-out infinite",op:0.09,c1:"#2980b9",c2:"#8e44ad"},
          {w:200,h:200,top:"20%",left:"75%",anim:"float4 20s ease-in-out infinite",op:0.11,c1:"#27ae60",c2:"#1abc9c"},
          {w:300,h:300,top:"75%",left:"20%",anim:"float5 24s ease-in-out infinite",op:0.08,c1:"#e67e22",c2:"#f39c12"},
        ].map((c,i)=>(
          <div key={i} style={{position:"absolute",width:c.w,height:c.h,top:c.top,left:c.left,borderRadius:"50%",background:`radial-gradient(circle at 40% 40%,${c.c1},${c.c2})`,opacity:c.op,animation:c.anim,filter:"blur(2px)"}}/>
        ))}
      </div>

      {/* Sidebar */}
      <div style={{width:220,flexShrink:0,minHeight:"100vh",overflowY:"auto",position:"sticky",top:0,zIndex:10,background:"linear-gradient(180deg,#1a3a5c 0%,#0f2a44 60%,#0a1f33 100%)",boxShadow:"4px 0 24px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",padding:"0 12px 20px"}}>
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
            // ── handleNavigateAway protege a navegação do sidebar ──
            <div key={item.label} onClick={()=>item.path&&handleNavigateAway(item.path)} className={`nav-item${item.active?" active":""}`} style={{cursor:item.path?"pointer":"default"}}>
              <item.icon style={{width:16,height:16}}/>{item.label}
            </div>
          ))}
        </nav>
      </div>

      {/* Área principal */}
      <div style={{flex:1,minHeight: "100vh",overflowY:"auto",position:"relative",zIndex:1}}>

        {/* Top bar */}
        <div style={{position:"sticky",top:0,zIndex:20,padding:"14px 28px",background:"rgba(210,238,248,0.75)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.6)",display:"flex",alignItems:"center",gap:16}}>
          {/* ── Botão Voltar protegido ── */}
          <button className="btn-ghost" style={{height:38,padding:"0 14px",fontSize:13}} onClick={()=>handleNavigateAway("/dashboard")}>
            <ArrowLeft style={{width:15,height:15}}/> Voltar
          </button>
          <div style={{flex:1}}>
            <h1 style={{fontSize:18,fontWeight:800,color:"#0f2133",letterSpacing:"-0.02em"}}>Cadastrar Empresa</h1>
            <p style={{fontSize:12,color:"rgba(20,45,70,0.5)",marginTop:1}}>Preencha os dados da empresa e adicione os contatos vinculados</p>
          </div>
          <button className="btn-grad" style={{height:38,padding:"0 18px",fontSize:13,opacity:loading?0.7:1}} onClick={handleSubmit} disabled={loading}>
            <Save style={{width:15,height:15}}/> {loading?"Salvando...":"Salvar Empresa"}
          </button>
        </div>

        {/* Conteúdo */}
        <div style={{padding:"24px 28px 48px"}}>

          {/* Banner campos incompletos */}
          <AnimatePresence>
            {showErrors && (
              <motion.div
                initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:12,background:"rgba(231,76,60,0.07)",border:"1.5px solid rgba(231,76,60,0.22)",marginBottom:18}}
              >
                <AlertTriangle style={{width:16,height:16,color:"#e74c3c",flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:600,color:"#c0392b"}}>
                  Campos obrigatórios não preenchidos — empresa salva como <strong>rascunho</strong>. Complete os campos em vermelho para converter em Lead.
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:20,alignItems:"start"}}>

            {/* Coluna esquerda */}
            <div style={{display:"flex",flexDirection:"column",gap:16}}>

              {/* Informações Principais */}
              <motion.div className="glass-card" style={{padding:"24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.38}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"rgba(41,128,185,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Building2 style={{width:17,height:17,color:"#2980b9"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#0f2133"}}>Informações Principais</div>
                    <div style={{fontSize:11,color:"rgba(20,45,70,0.45)"}}>Dados obrigatórios da empresa</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div style={{gridColumn:"1 / -1"}}>
                    <Field label="Nome da Empresa *">
                      <IconInput icon={Building2} placeholder="Nome completo da empresa" value={empresa.nome} onChange={(e:any)=>setEmp("nome",e.target.value)}/>
                    </Field>
                  </div>
                  <Field label="Segmento *">
                    <SegmentoAutocomplete
                      value={empresa.segmento}
                      onChange={v=>setEmp("segmento",v)}
                      opcoes={segmentosOrdenados}
                      hasError={showErrors}
                    />
                    {empresa.segmento.trim()&&!segmentoExiste&&(
                      <div style={{marginTop:5,fontSize:10,fontWeight:600,color:"#e67e22",display:"flex",alignItems:"center",gap:4}}>
                        <AlertTriangle style={{width:11,height:11}}/> Segmento novo — será validado ao salvar
                      </div>
                    )}
                    {empresa.segmento.trim()&&segmentoExiste&&(
                      <div style={{marginTop:5,fontSize:10,fontWeight:600,color:"#27ae60",display:"flex",alignItems:"center",gap:4}}>
                        <CheckCircle style={{width:11,height:11}}/> Segmento reconhecido
                      </div>
                    )}
                  </Field>
                  <Field label="Porte *">
                    <select className="field-select" value={empresa.porte} onChange={e=>setEmp("porte",e.target.value)} style={showErrors&&!empresa.porte?{borderColor:"rgba(231,76,60,0.6)",background:"rgba(231,76,60,0.03)"}:{}}>
                      <option value="">Selecionar porte...</option>
                      <option>Pequeno</option><option>Médio</option><option>Grande</option>
                    </select>
                  </Field>
                  <Field label="CNPJ">
                    <IconInput icon={Hash} placeholder="00.000.000/0000-00" value={empresa.cnpj} onChange={(e:any)=>setEmp("cnpj",formatCnpj(e.target.value))}/>
                  </Field>
                  <Field label="Responsável Principal">
                    <IconInput icon={User} placeholder="Nome do responsável" value={empresa.responsavel_principal} onChange={(e:any)=>setEmp("responsavel_principal",e.target.value)}/>
                  </Field>
                  <Field label="Site">
                    <IconInput icon={Globe} type="url" placeholder="https://empresa.com.br" value={empresa.site} onChange={(e:any)=>setEmp("site",e.target.value)}/>
                  </Field>
                  <Field label="LinkedIn da Empresa">
                    <IconInput icon={Link2} placeholder="linkedin.com/company/..." value={empresa.linkedin_empresa} onChange={(e:any)=>setEmp("linkedin_empresa",e.target.value)}/>
                  </Field>
                </div>
              </motion.div>

              {/* Localização */}
              <motion.div className="glass-card" style={{padding:"24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.38,delay:0.08}}>
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
                  <Field label="Cidade *"><IconInput icon={MapPin} placeholder="Nome da cidade" value={empresa.cidade} onChange={(e:any)=>setEmp("cidade",e.target.value)} style={showErrors&&!empresa.cidade.trim()?{borderColor:"rgba(231,76,60,0.6)",background:"rgba(231,76,60,0.03)"}:{}}/></Field>
                  <Field label="CEP *"><input className="field-input" placeholder="00000-000" value={empresa.cep} onChange={e=>setEmp("cep",formatCep(e.target.value))} style={showErrors&&!empresa.cep.trim()?{borderColor:"rgba(231,76,60,0.6)",background:"rgba(231,76,60,0.03)"}:{}}/></Field>
                  <div style={{gridColumn:"1 / -1"}}>
                    <Field label="Endereço *"><input className="field-input" placeholder="Rua, número, complemento" value={empresa.endereco} onChange={e=>setEmp("endereco",e.target.value)} style={showErrors&&!empresa.endereco.trim()?{borderColor:"rgba(231,76,60,0.6)",background:"rgba(231,76,60,0.03)"}:{}}/></Field>
                  </div>
                  <Field label="Bairro *"><input className="field-input" placeholder="Bairro" value={empresa.bairro} onChange={e=>setEmp("bairro",e.target.value)} style={showErrors&&!empresa.bairro.trim()?{borderColor:"rgba(231,76,60,0.6)",background:"rgba(231,76,60,0.03)"}:{}}/></Field>
                  <Field label="Região"><input className="field-input" placeholder="ex: Sul, Norte, Centro..." value={empresa.regiao} onChange={e=>setEmp("regiao",e.target.value)}/></Field>
                </div>
              </motion.div>

              {/* Observações */}
              <motion.div className="glass-card" style={{padding:"24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.38,delay:0.14}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"rgba(142,68,173,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <FileText style={{width:17,height:17,color:"#8e44ad"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#0f2133"}}>Observações</div>
                    <div style={{fontSize:11,color:"rgba(20,45,70,0.45)"}}>Notas internas sobre o lead</div>
                  </div>
                </div>
                <Field label="Observações">
                  <textarea className="field-textarea" placeholder="Contexto do lead, pontos importantes, histórico relevante..." value={empresa.observacoes} onChange={e=>setEmp("observacoes",e.target.value)}/>
                </Field>
              </motion.div>
            </div>

            {/* Coluna direita */}
            <div style={{display:"flex",flexDirection:"column",gap:16}}>

              {/* Dados de Prospecção */}
              <motion.div className="glass-card" style={{padding:"24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.38,delay:0.06}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"rgba(230,126,34,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Target style={{width:17,height:17,color:"#e67e22"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#0f2133"}}>Dados de Prospecção</div>
                    <div style={{fontSize:11,color:"rgba(20,45,70,0.45)"}}>Status e qualificação do lead</div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <Field label="Status do Lead">
                    <input className="field-input" value="Lead" disabled style={{background:"rgba(39,174,96,0.08)",color:"#1f7a4d",fontWeight:700}}/>
                  </Field>
                  <Field label="Temperatura do Lead">
                    <div style={{display:"flex",gap:6,marginTop:2}}>
                      {(["Frio","Morno","Quente"] as const).map(t=>(
                        <button key={t} className={`temp-btn ${t.toLowerCase()}${empresa.temperatura===t?" active":""}`} onClick={()=>setEmpresa({...empresa,temperatura:t})}>
                          <Thermometer style={{width:12,height:12}}/>{t}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Origem do Lead">
                    <select className="field-select" value={empresa.origem_lead} onChange={e=>setEmpresa({...empresa,origem_lead:e.target.value})}>
                      <option value="">Selecionar origem...</option>
                      <option>Indicação</option><option>LinkedIn</option><option>Site</option>
                      <option>Prospecção ativa</option><option>Evento</option>
                      <option>Cold Email</option><option>Outro</option>
                    </select>
                  </Field>
                </div>
              </motion.div>

              {/* Acompanhamento */}
              <motion.div className="glass-card" style={{padding:"24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.38,delay:0.12}}>
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
                  <Field label="Primeira Interação">
                    <input className="field-input" type="date" value={empresa.ultima_interacao} onChange={e=>setEmpresa({...empresa,ultima_interacao:e.target.value})}/>
                  </Field>
                  <Field label="Próxima Ação">
                    <select className="field-select" value={empresa.proxima_acao} onChange={e=>setEmpresa({...empresa,proxima_acao:e.target.value})}>
                      <option value="">Selecionar próxima ação...</option>
                      {PROXIMAS_ACOES.map(a=><option key={a}>{a}</option>)}
                    </select>
                  </Field>
                </div>
              </motion.div>

              {/* Preview contatos */}
              <motion.div className="glass-card" style={{padding:"20px 24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.38,delay:0.18}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#0f2133"}}>Contatos</div>
                  <span style={{padding:"3px 10px",borderRadius:20,background:"rgba(41,128,185,0.1)",color:"#2980b9",fontSize:11,fontWeight:700}}>
                    {contatos.length} adicionado{contatos.length!==1?"s":""}
                  </span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {contatos.map((c,i)=>{
                    const color=["#2980b9","#1abc9c","#e67e22","#8e44ad","#27ae60"][i%5];
                    const ini=c.nome?c.nome.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase():"?";
                    return(
                      <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.55)",border:"1px solid rgba(200,225,240,0.5)"}}>
                        <div style={{width:26,height:26,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}}>{ini}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,fontWeight:600,color:"#0f2133",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.nome||`Contato ${i+1}`}</div>
                          <div style={{fontSize:10,color:"rgba(20,45,70,0.4)"}}>{c.funcao||"—"}</div>
                        </div>
                        {c.decisor&&<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"rgba(39,174,96,0.1)",color:"#27ae60",border:"1px solid rgba(39,174,96,0.2)"}}>Decisor</span>}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Seção contatos */}
          <motion.div style={{marginTop:20}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.38,delay:0.22}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#2980b9,#1abc9c)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(41,128,185,0.3)"}}>
                  <Users style={{width:18,height:18,color:"#fff"}}/>
                </div>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:"#0f2133"}}>Contatos Vinculados</div>
                  <div style={{fontSize:12,color:"rgba(20,45,70,0.45)"}}>Adicione todos os contatos desta empresa</div>
                </div>
              </div>
              <button className="btn-grad" style={{height:40,padding:"0 18px",fontSize:13}} onClick={addContato}>
                <Plus style={{width:15,height:15}}/> Adicionar Contato
              </button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:16}}>
              {contatos.map((c,i)=>(
                <ContatoCard key={c.id} contato={c} index={i} onChange={handleContatoChange} onRemove={removeContato}/>
              ))}
              <div onClick={addContato} style={{border:"2px dashed rgba(41,128,185,0.25)",borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",padding:"32px 20px",transition:"all 0.18s",minHeight:120,background:"rgba(255,255,255,0.35)"}} onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor="rgba(41,128,185,0.5)";(e.currentTarget as HTMLDivElement).style.background="rgba(41,128,185,0.04)";}} onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor="rgba(41,128,185,0.25)";(e.currentTarget as HTMLDivElement).style.background="rgba(255,255,255,0.35)";}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(41,128,185,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Plus style={{width:18,height:18,color:"#2980b9"}}/>
                </div>
                <span style={{fontSize:13,fontWeight:600,color:"rgba(41,128,185,0.7)"}}>Adicionar contato</span>
              </div>
            </div>
          </motion.div>

          {/* Rodapé */}
          <div style={{marginTop:28,display:"flex",justifyContent:"flex-end",gap:10}}>
            {/* ── Botão Cancelar protegido ── */}
            <button className="btn-ghost" style={{height:44,padding:"0 20px",fontSize:13}} onClick={()=>handleNavigateAway("/dashboard")}>Cancelar</button>
            <button className="btn-grad" style={{height:44,padding:"0 28px",fontSize:14,opacity:loading?0.75:1}} onClick={handleSubmit} disabled={loading}>
              <Save style={{width:16,height:16}}/> {loading?"Salvando...":"Salvar Empresa"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}