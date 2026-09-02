import { getToken } from "../../../../services/auth";
import CardUsuario from "../../../../components/CardUsuario";
import FundoAzul from "../../../../components/FundoAzul";
import { FUNDO_AZUL } from "../../../../components/FundoAzul";
  import { useEffect, useMemo, useRef, useState } from "react";
  import { useParams, useNavigate } from "react-router-dom";
  import { motion, AnimatePresence } from "framer-motion";
  import {
    Building2, Users, LayoutDashboard, TrendingUp, Search, Calendar,
    ClipboardList, BarChart3, ChevronDown, ArrowLeft,
    Plus, Trash2, Globe, Link2, Phone, Mail,
    MapPin, Briefcase, Hash, User, Thermometer,
    Target, Clock, FileText, Save, CheckCircle,
    XCircle, Loader, AlertTriangle,
  } from "lucide-react";

  const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

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
    @keyframes gradientShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}

    .nav-item{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:10px;cursor:pointer;font-size:13.5px;font-weight:500;color:#EAF6FB;transition:all 0.18s;user-select:none;}
    .nav-item:hover{background:rgba(159,211,234,0.08);color:#fff;}
    .nav-item.active{background:rgba(159,211,234,0.08);color:#fff;font-weight:600;}
    .glass-card{background:#143354;border:1px solid rgba(159,211,234,0.18);border-radius:16px;}
    .field-group{display:flex;flex-direction:column;gap:5px;}
    .field-label{font-size:10px;font-weight:700;letter-spacing:0.06em;color:#9FD3EA;text-transform:uppercase;}
    .field-input{height:44px;padding:0 14px;border-radius:10px;border:1.5px solid rgba(159,211,234,0.18);background:rgba(18,59,94,0.55);font-size:13px;color:#EAF6FB;outline:none;transition:border-color 0.18s,box-shadow 0.18s;width:100%;}
    .field-input:focus{border-color:rgba(159,211,234,0.30);box-shadow:0 0 0 3px rgba(41,128,185,0.1);}
    .field-select{height:44px;padding:0 14px;border-radius:10px;border:1.5px solid rgba(159,211,234,0.18);background:rgba(18,59,94,0.55);font-size:13px;color:#EAF6FB;outline:none;transition:border-color 0.18s;width:100%;cursor:pointer;appearance:none;}
    .field-select:focus{border-color:rgba(159,211,234,0.30);box-shadow:0 0 0 3px rgba(41,128,185,0.1);}
    .field-textarea{padding:12px 14px;border-radius:10px;border:1.5px solid rgba(159,211,234,0.18);background:rgba(18,59,94,0.55);font-size:13px;color:#EAF6FB;outline:none;transition:border-color 0.18s;width:100%;resize:vertical;min-height:80px;}
    .field-textarea:focus{border-color:rgba(159,211,234,0.30);box-shadow:0 0 0 3px rgba(41,128,185,0.1);}
    .field-input-icon{position:relative;display:flex;align-items:center;}
    .field-input-icon .icon{position:absolute;left:12px;color:#9FD3EA;pointer-events:none;}
    .field-input-icon .field-input{padding-left:36px;}

    .seg-wrapper{position:relative;}
    .seg-input{height:44px;padding:0 40px 0 36px;border-radius:10px;border:1.5px solid rgba(159,211,234,0.18);background:rgba(18,59,94,0.55);font-size:13px;color:#EAF6FB;outline:none;transition:border-color 0.18s,box-shadow 0.18s;width:100%;}
    .seg-input:focus,.seg-input.open{border-color:rgba(159,211,234,0.30);box-shadow:0 0 0 3px rgba(41,128,185,0.1);}
    .seg-input.open{border-bottom-left-radius:0;border-bottom-right-radius:0;}
    .seg-icon-left{position:absolute;left:12px;color:#9FD3EA;pointer-events:none;width:14px;height:14px;}
    .seg-chevron{position:absolute;right:12px;color:#9FD3EA;pointer-events:none;width:15px;height:15px;transition:transform 0.2s;}
    .seg-chevron.open{transform:rotate(180deg);}
    .seg-dropdown{position:absolute;top:calc(100% - 1px);left:0;right:0;z-index:999;background:#16395E;border:1.5px solid rgba(159,211,234,0.30);border-top:1px solid rgba(159,211,234,0.18);border-bottom-left-radius:10px;border-bottom-right-radius:10px;box-shadow:0 12px 40px rgba(159,211,234,0.55);max-height:240px;overflow-y:auto;}
    .seg-option{padding:10px 14px;font-size:13px;color:#EAF6FB;cursor:pointer;transition:background 0.12s;display:flex;align-items:center;gap:8px;}
    .seg-option:hover,.seg-option.highlighted{background:rgba(46,111,149,0.07);color:#9FD3EA;}
    .seg-option.selected{background:rgba(46,111,149,0.1);color:#9FD3EA;font-weight:700;}
    .seg-option-new{padding:10px 14px;font-size:13px;cursor:pointer;transition:background 0.12s;display:flex;align-items:center;gap:8px;color:#F2C879;font-weight:600;border-top:1px solid rgba(159,211,234,0.18);}
    .seg-option-new:hover{background:rgba(230,126,34,0.07);}

    .contact-card{background:rgba(18,59,94,0.55);border:1.5px solid rgba(159,211,234,0.18);border-radius:14px;padding:20px;transition:box-shadow 0.2s;}
    .contact-card:hover{box-shadow:0 6px 24px rgba(41,128,185,0.12);}
    .temp-btn{flex:1;height:38px;border-radius:8px;border:1.5px solid rgba(159,211,234,0.18);background:rgba(18,59,94,0.55);font-size:12px;font-weight:600;cursor:pointer;transition:all 0.18s;display:flex;align-items:center;justify-content:center;gap:5px;}
    .temp-btn.frio.active{background:rgba(52,152,219,0.12);border-color:rgba(159,211,234,0.30);color:#9FD3EA;}
    .temp-btn.morno.active{background:rgba(230,126,34,0.12);border-color:#F2C879;color:#F2C879;}
    .temp-btn.quente.active{background:rgba(231,76,60,0.12);border-color:#F7B8B1;color:#F7B8B1;}
    .temp-btn:not(.active){color:#9FD3EA;}
    .prio-btn{flex:1;height:34px;border-radius:8px;border:1.5px solid rgba(159,211,234,0.18);background:rgba(18,59,94,0.55);font-size:11px;font-weight:600;cursor:pointer;transition:all 0.18s;}
    .prio-btn.alta.active{background:rgba(231,76,60,0.12);border-color:#F7B8B1;color:#F7B8B1;}
    .prio-btn.media.active{background:rgba(230,126,34,0.12);border-color:#F2C879;color:#F2C879;}
    .prio-btn.baixa.active{background:rgba(39,174,96,0.12);border-color:#83DDA8;color:#83DDA8;}
    .prio-btn:not(.active){color:#9FD3EA;}
    .checkbox-decisor{display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 12px;border-radius:8px;border:1.5px solid rgba(159,211,234,0.18);background:rgba(18,59,94,0.55);transition:all 0.18s;}
    .checkbox-decisor.checked{border-color:#83DDA8;background:rgba(39,174,96,0.08);}
    .checkbox-decisor .box{width:16px;height:16px;border-radius:4px;border:1.5px solid rgba(159,211,234,0.18);background:rgba(18,59,94,0.55);display:flex;align-items:center;justify-content:center;transition:all 0.18s;flex-shrink:0;}
    .checkbox-decisor.checked .box{background:#83DDA8;border-color:#83DDA8;}
    .btn-grad{border:none;cursor:pointer;border-radius:10px;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;display:flex;align-items:center;justify-content:center;gap:7px;background:linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95);background-size:200% 200%;animation:gradientShift 4s ease infinite;box-shadow:0 4px 14px rgba(41,128,185,0.35);transition:transform 0.15s,box-shadow 0.15s;}
    .btn-grad:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(41,128,185,0.42);}
    .btn-ghost{border:1.5px solid rgba(159,211,234,0.18);background:rgba(18,59,94,0.55);cursor:pointer;border-radius:10px;font-family:'Plus Jakarta Sans',sans-serif;font-weight:600;color:#EAF6FB;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.18s;}
    .btn-ghost:hover{background:rgba(18,59,94,0.55);border-color:rgba(159,211,234,0.30);color:#9FD3EA;}
    .spin{animation:spin 0.9s linear infinite;}
    .toast{position:fixed;bottom:28px;right:28px;z-index:9999;padding:12px 18px;border-radius:12px;display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;box-shadow:0 8px 28px rgba(0,0,0,0.15);animation:slideIn 0.25s ease;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:rgba(46,111,149,0.25);border-radius:4px;}
  `;

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboards",                path: "/dashboard" },
    { icon: TrendingUp,      label: "Insights",                  path: "/insights" },
    { icon: Search,          label: "Buscar Empresas",           path: null },
    { icon: Building2,       label: "Cadastrar Empresas",        path: "/empresas/nova" },
    { icon: Users,           label: "Todos os clientes",         path: "/clientes" },
    { icon: ClipboardList,   label: "Gerenciamento", path: "/gerenciamento" },
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
              {filtered.length===0&&!showNew&&<div style={{padding:"14px",fontSize:12,color:"#9FD3EA",textAlign:"center"}}>Nenhum segmento encontrado</div>}
              {filtered.map((opt,i)=>(
                <div key={opt} className={`seg-option${normalizeStr(opt)===normalizeStr(value)?" selected":""}${hi===i?" highlighted":""}`} onMouseDown={e=>{e.preventDefault();select(opt);}} onMouseEnter={()=>setHi(i)}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:"rgba(46,111,149,0.35)",flexShrink:0}}/>{opt}
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
    const cor = ["#9FD3EA","#83DDA8","#F2C879","#C9B6E4","#83DDA8"][index%5];
    const ini = contato.nome ? contato.nome.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase() : "?";
    return (
      <motion.div className="contact-card" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:cor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#EAF6FB",flexShrink:0}}>{ini}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"#EAF6FB"}}>{contato.nome||`Contato ${index+1}`}</div>
            <div style={{fontSize:11,color:"#9FD3EA"}}>{contato.funcao||"Função não definida"}</div>
          </div>
          {contato.isNew&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:4,background:"rgba(46,111,149,0.1)",color:"#9FD3EA"}}>NOVO</span>}
          <div className={`checkbox-decisor${contato.decisor?" checked":""}`} onClick={()=>up("decisor",!contato.decisor)}>
            <div className="box">{contato.decisor&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="2,5 4,7.5 8,2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
            <span style={{fontSize:11,fontWeight:600,color:contato.decisor?"#83DDA8":"#9FD3EA"}}>Decisor</span>
          </div>
          <button onClick={()=>onRemove(contato._localId)} style={{width:32,height:32,borderRadius:8,border:"1.5px solid rgba(231,76,60,0.2)",background:"rgba(231,76,60,0.06)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#F7B8B1",transition:"all 0.18s"}} onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(231,76,60,0.14)";}} onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(231,76,60,0.06)";}}>
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
    // Empresa que chegou como rascunho (criada pela busca, em lote ou avulsa).
    const [eraRascunho, setEraRascunho] = useState(false);
    const [segmentos, setSegmentos] = useState<string[]>(SEGMENTOS_PADRAO);
    const [contatos, setContatos] = useState<any[]>([]);
    const [deletedContatoIds, setDeletedContatoIds] = useState<string[]>([]);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const [form, setForm] = useState({
      nome:"", segmento:"", porte:"", cidade:"", endereco:"", numero:"",
      cep:"", bairro:"", regiao:"", observacoes:"", cnpj:"",
      site:"", linkedin_empresa:"", responsavel_principal:"",
      status:"", origem_lead:"",
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

    const token = () => getToken() || "";
    const hdrs = () => ({ "Content-Type":"application/json", Authorization:`Bearer ${token()}` });

    useEffect(() => {
      const load = async () => {
        try {
          const [empRes, segRes] = await Promise.all([
            fetch(`${API}/empresas/${id}`, { headers: hdrs() }),
            fetch(`${API}/segmentos`),
          ]);
          if(!empRes.ok) { navigate("/clientes"); return; }
          const emp = await empRes.json();
          // Salvar esta ficha e o ato que tira a empresa do rascunho. Guardamos
          // porque depois do setForm o status ja foi trocado para "Lead".
          setEraRascunho(emp.status === "Rascunho" || emp.status_cadastro === "rascunho");
          setForm({
            nome: emp.nome||"", segmento: emp.segmento||"", porte: emp.porte||"",
            cidade: emp.cidade||"", endereco: emp.endereco||"", numero: emp.numero||"", cep: emp.cep||"",
            bairro: emp.bairro||"", regiao: emp.regiao||"", observacoes: emp.observacoes||"",
            cnpj: emp.cnpj||"", site: emp.site||"", linkedin_empresa: emp.linkedin_empresa||"",
            responsavel_principal: emp.responsavel_principal||"",
            // "Rascunho" nao esta em STATUS_OPTS, entao o <select> ficaria com
            // um valor que nenhuma opcao representa: a tela mostraria a primeira
            // opcao e o save mandaria "Rascunho" de volta -- a empresa nunca
            // sairia do rascunho por mais que o usuario salvasse. Ao abrir a
            // ficha ja propomos "Lead", que e a primeira etapa real do funil.
            status: emp.status === "Rascunho" ? "Lead" : (emp.status||""),
            origem_lead: emp.origem_lead||"",
            proxima_acao: emp.proxima_acao||"", temperatura: emp.temperatura||"",
            ultima_interacao: dateOnly(emp.ultima_interacao),
            data_proxima_acao: dateOnly(emp.data_proxima_acao),
          });
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
      // Deve recarregar só quando muda a empresa da rota. `hdrs` e `navigate` são
      // recriados a cada render e nas deps recarregariam o formulário em loop,
      // descartando edições em andamento.
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
          cidade: form.cidade, endereco: form.endereco, numero: form.numero, cep: form.cep,
          bairro: form.bairro, regiao: form.regiao, observacoes: form.observacoes,
          cnpj: form.cnpj, site: form.site, linkedin_empresa: form.linkedin_empresa,
          responsavel_principal: form.responsavel_principal,
          status: form.status, origem_lead: form.origem_lead,
          proxima_acao: form.proxima_acao, temperatura: form.temperatura,
        };
        // Salvar e o que promove o rascunho. Sem mandar `status_cadastro`, a
        // empresa entraria no funil mas continuaria contada como rascunho pelo
        // backend (/empresas/rascunhos e o painel do gerente filtram por ele) --
        // apareceria nos dois lugares ao mesmo tempo.
        if(eraRascunho) body.status_cadastro = "ativo";
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


    if(loading) return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:FUNDO_AZUL.background, backgroundSize: FUNDO_AZUL.backgroundSize}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
          <Loader className="spin" style={{width:28,height:28,color:"#9FD3EA"}}/>
          <div style={{fontSize:13,color:"#9FD3EA",fontWeight:600}}>Carregando empresa...</div>
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
                style={{background:t.type==="success"?"rgba(39,174,96,0.95)":"rgba(220,38,38,0.95)",color:"#EAF6FB"}}>
                {t.type==="success"?<CheckCircle style={{width:16,height:16}}/>:<XCircle style={{width:16,height:16}}/>}
                {t.msg}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Fundo animado */}
        <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
          <FundoAzul />
        </div>

        {/* Sidebar */}
        <div style={{width:220,flexShrink:0,height:"100vh",overflowY:"auto",position:"relative",zIndex:10,background:"linear-gradient(180deg,#1a3a5c 0%,#0f2a44 60%,#0a1f33 100%)",boxShadow:"4px 0 24px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",padding:"0 12px 20px"}}>
          <div style={{padding:"22px 4px 24px",borderBottom:"1px solid rgba(159,211,234,0.18)",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#2E6F95,#2E6F95)",display:"flex",alignItems:"center",justifyContent:"center"}}>
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
              <div key={item.label} className="nav-item" onClick={()=>item.path&&navigate(item.path)}>
                <item.icon style={{width:16,height:16}}/>{item.label}
              </div>
            ))}
          </nav>
          <CardUsuario />
        </div>

        {/* Área principal */}
        <div style={{flex:1,height:"100vh",overflowY:"auto",position:"relative",zIndex:5}}>

          {/* Top bar */}
          <div style={{position:"sticky",top:0,zIndex:20,padding:"14px 28px",background:"rgba(15,46,75,0.88)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(159,211,234,0.18)",display:"flex",alignItems:"center",gap:16}}>
            <button className="btn-ghost" style={{height:38,padding:"0 14px",fontSize:13}} onClick={()=>navigate(`/clientes/${id}`)}>
              <ArrowLeft style={{width:15,height:15}}/> Voltar
            </button>
            <div style={{flex:1}}>
              <h1 style={{fontSize:18,fontWeight:800,color:"#EAF6FB",letterSpacing:"-0.02em"}}>Editar Empresa</h1>
              <p style={{fontSize:12,color:"#9FD3EA",marginTop:1}}>{form.nome||"..."} — todas as alterações são salvas no banco de dados</p>
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
                    <div style={{width:36,height:36,borderRadius:10,background:"rgba(46,111,149,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Building2 style={{width:17,height:17,color:"#9FD3EA"}}/>
                    </div>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:"#EAF6FB"}}>Informações Principais</div>
                      <div style={{fontSize:11,color:"#9FD3EA"}}>Dados da empresa</div>
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
                        <div style={{marginTop:5,fontSize:10,fontWeight:600,color:"#F2C879",display:"flex",alignItems:"center",gap:4}}>
                          <AlertTriangle style={{width:11,height:11}}/> Segmento novo — será validado ao salvar
                        </div>
                      )}
                      {form.segmento.trim()&&segmentoExiste&&(
                        <div style={{marginTop:5,fontSize:10,fontWeight:600,color:"#83DDA8",display:"flex",alignItems:"center",gap:4}}>
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
                      <MapPin style={{width:17,height:17,color:"#9FD3EA"}}/>
                    </div>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:"#EAF6FB"}}>Localização</div>
                      <div style={{fontSize:11,color:"#9FD3EA"}}>Endereço completo</div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <Field label="Cidade"><IconInput icon={MapPin} placeholder="Nome da cidade" value={form.cidade} onChange={(e:any)=>setF("cidade",e.target.value)}/></Field>
                    <Field label="CEP"><input className="field-input" placeholder="00000-000" value={form.cep} onChange={e=>setF("cep",formatCep(e.target.value))}/></Field>
                    <div style={{gridColumn:"1 / -1",display:"grid",gridTemplateColumns:"1fr 120px",gap:12}}><Field label="Endereço"><input className="field-input" placeholder="Rua, número, complemento" value={form.endereco} onChange={e=>setF("endereco",e.target.value)}/></Field>
                      <Field label="Número"><input className="field-input" placeholder="212" inputMode="numeric" value={form.numero||""} onChange={e=>setF("numero",e.target.value)}/></Field>
                    </div>
                    <Field label="Bairro"><input className="field-input" placeholder="Bairro" value={form.bairro} onChange={e=>setF("bairro",e.target.value)}/></Field>
                    <Field label="Região"><input className="field-input" placeholder="ex: Sul, Norte, Centro..." value={form.regiao} onChange={e=>setF("regiao",e.target.value)}/></Field>
                  </div>
                </motion.div>

                {/* Observações */}
                <motion.div className="glass-card" style={{padding:"24px"}} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.32,delay:0.12}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
                    <div style={{width:36,height:36,borderRadius:10,background:"rgba(142,68,173,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <FileText style={{width:17,height:17,color:"#9FD3EA"}}/>
                    </div>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:"#EAF6FB"}}>Observações</div>
                      <div style={{fontSize:11,color:"#9FD3EA"}}>Notas internas</div>
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
                      <Target style={{width:17,height:17,color:"#F2C879"}}/>
                    </div>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:"#EAF6FB"}}>Dados de Prospecção</div>
                      <div style={{fontSize:11,color:"#9FD3EA"}}>Status e qualificação</div>
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
                      <Clock style={{width:17,height:17,color:"#83DDA8"}}/>
                    </div>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:"#EAF6FB"}}>Acompanhamento</div>
                      <div style={{fontSize:11,color:"#9FD3EA"}}>Ações e datas</div>
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
                    <div style={{fontSize:13,fontWeight:700,color:"#EAF6FB"}}>Contatos</div>
                    <span style={{padding:"3px 10px",borderRadius:20,background:"rgba(46,111,149,0.1)",color:"#9FD3EA",fontSize:11,fontWeight:700}}>
                      {contatos.length} contato{contatos.length!==1?"s":""}
                    </span>
                  </div>
                  {contatos.length===0?(
                    <div style={{padding:"16px 0",textAlign:"center",fontSize:12,color:"#9FD3EA"}}>Nenhum contato cadastrado</div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {contatos.map((c,i)=>{
                        const cor=["#9FD3EA","#83DDA8","#F2C879","#C9B6E4","#83DDA8"][i%5];
                        const ini=c.nome?c.nome.split(" ").map((w:string)=>w[0]).join("").slice(0,2).toUpperCase():"?";
                        return(
                          <div key={c._localId} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:"rgba(18,59,94,0.55)",border:"1px solid rgba(159,211,234,0.18)"}}>
                            <div style={{width:26,height:26,borderRadius:"50%",background:cor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#EAF6FB",flexShrink:0}}>{ini}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:11,fontWeight:600,color:"#EAF6FB",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.nome||`Contato ${i+1}`}</div>
                              <div style={{fontSize:10,color:"#9FD3EA"}}>{c.funcao||"—"}</div>
                            </div>
                            {c.decisor&&<span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"rgba(39,174,96,0.1)",color:"#83DDA8",border:"1px solid rgba(39,174,96,0.2)"}}>Decisor</span>}
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
                  <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#2E6F95,#2E6F95)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(46,111,149,0.3)"}}>
                    <Users style={{width:18,height:18,color:"#fff"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:16,fontWeight:800,color:"#EAF6FB"}}>Contatos Vinculados</div>
                    <div style={{fontSize:12,color:"#9FD3EA"}}>Edite, adicione ou remova contatos</div>
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
                <div onClick={addContato} style={{border:"2px dashed rgba(159,211,234,0.30)",borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",padding:"32px 20px",transition:"all 0.18s",minHeight:120,background:"rgba(159,211,234,0.08)"}} onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor="rgba(41,128,185,0.5)";}} onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor="rgba(41,128,185,0.25)";}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(46,111,149,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Plus style={{width:18,height:18,color:"#9FD3EA"}}/>
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:"#9FD3EA"}}>Adicionar contato</span>
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