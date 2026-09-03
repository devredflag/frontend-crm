import { getToken } from "../../services/auth";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, TrendingUp, Search, Building2, Users, ClipboardList,
  Calendar, BarChart3, ChevronLeft, ChevronRight,
  Plus, X, Phone, Eye, Users2, FileText, Trash2, Clock,
  Mail, CheckCircle2, Link2, ChevronDown, Menu, UserRoundCog,
} from "lucide-react";
import useIsMobile from "../../hooks/useIsMobile";
import useEmpresasAoVivo from "../../hooks/useEmpresasAoVivo";
import { OutlookIcon, GoogleIcon } from "../../components/LogosMarcas";
import CardUsuario, { useUsuarioLogado, podeVerInsights } from "../../components/CardUsuario";

import FundoAzul from "../../components/FundoAzul";
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:#EAF6FB; transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(159,211,234,0.08); color:#fff; }
  .nav-item.active { background:rgba(159,211,234,0.08); color:#fff; font-weight:600; }
  .glass { background:#143354; border:1px solid rgba(159,211,234,0.18); border-radius:16px; }
  .day-cell { border-right:1px solid rgba(159,211,234,0.18); border-bottom:1px solid rgba(159,211,234,0.18); min-height:100px; padding:6px; cursor:pointer; transition:background 0.13s; }
  .day-cell:hover { background:rgba(46,111,149,0.04); }
  .day-cell.today { background:rgba(46,111,149,0.06); }
  .day-cell.other-month { opacity:0.4; }
  .hour-slot { border-bottom:1px solid rgba(159,211,234,0.18); display:flex; align-items:stretch; min-height:56px; cursor:pointer; transition:background 0.13s; }
  .hour-slot:hover { background:rgba(46,111,149,0.03); }
  .view-btn { padding:6px 14px; border-radius:8px; border:none; cursor:pointer; font-size:12px; font-weight:600; transition:all 0.18s; }
  .tipo-btn { padding:8px 12px; border-radius:10px; border:2px solid transparent; cursor:pointer; font-size:12px; font-weight:600; transition:all 0.18s; display:flex; align-items:center; gap:6px; }
  .tipo-btn.selected { border-color:currentColor; }
  .input-field { width:100%; height:44px; padding:0 14px; border-radius:10px; border:1px solid rgba(159,211,234,0.18); background:rgba(18,59,94,0.55); font-size:13px; color:#EAF6FB; outline:none; transition:border 0.18s; }
  .input-field:focus { border-color:rgba(159,211,234,0.30); box-shadow:0 0 0 3px rgba(41,128,185,0.1); }
  .textarea-field { width:100%; padding:10px 14px; border-radius:10px; border:1px solid rgba(159,211,234,0.18); background:rgba(18,59,94,0.55); font-size:13px; color:#EAF6FB; outline:none; resize:vertical; min-height:70px; transition:border 0.18s; }
  .textarea-field:focus { border-color:rgba(159,211,234,0.30); box-shadow:0 0 0 3px rgba(41,128,185,0.1); }
  .select-field { width:100%; height:44px; padding:0 14px; border-radius:10px; border:1px solid rgba(159,211,234,0.18); background:rgba(18,59,94,0.55); font-size:13px; color:#EAF6FB; outline:none; cursor:pointer; }
  .connect-card { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:12px; border:1.5px solid; cursor:pointer; transition:all 0.18s; }
  .connect-card:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(3,14,26,0.45); }
  .toggle-box { display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:12px; border:1.5px solid rgba(159,211,234,0.18); background:rgba(18,59,94,0.55); cursor:pointer; transition:all 0.18s; margin-bottom:8px; }
  .toggle-box:hover { border-color:rgba(159,211,234,0.30); }
  .toggle-box.active { border-color:rgba(159,211,234,0.30); background:rgba(46,111,149,0.06); }
  .email-option { padding:10px 14px; cursor:pointer; font-size:13px; color:#EAF6FB; transition:background 0.13s; display:flex; flex-direction:column; gap:2px; }
  .email-option:hover { background:rgba(46,111,149,0.06); }
  .email-option:not(:last-child) { border-bottom:1px solid rgba(159,211,234,0.18); }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(46,111,149,0.25); border-radius:4px; }
`;

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

// Cada tipo tem hue própria e três tons: `color` é o acento (ícone, borda),
// `bg` o fundo da marcação e `texto` a cor do rótulo em cima dele.
//
// Antes três dos cinco tipos dividiam o MESMO texto (#9FD3EA) — dava para ver
// que havia um evento, não de que tipo era — e o fundo ficava em 0.12 de alpha,
// que sobre o naval do calendário praticamente sumia. "Call" era o oposto:
// 0.55 de azul claro com texto azul claro por cima, ilegível pelo excesso.
// Agora o fundo vai a 0.26 (marcação visível sem virar bloco sólido) e o texto
// é um tom claro da própria hue, com contraste folgado.
const TIPOS = [
  { key:"call",    label:"Call",     icon:Phone,    color:"#56A4F5", bg:"rgba(86,164,245,0.26)",  texto:"#CFE4FF" },
  { key:"visita",  label:"Visita",   icon:Eye,      color:"#2CCD93", bg:"rgba(44,205,147,0.24)",  texto:"#B3F0D9" },
  { key:"reuniao", label:"Reunião",  icon:Users2,   color:"#A78BFA", bg:"rgba(167,139,250,0.26)", texto:"#DCD2FF" },
  { key:"proposta",label:"Proposta", icon:FileText, color:"#F0A05A", bg:"rgba(240,160,90,0.26)",  texto:"#FFDCC0" },
  { key:"outro",   label:"Outro",    icon:Calendar, color:"#8FA9C4", bg:"rgba(143,169,196,0.26)", texto:"#DCE7F2" },
];

const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const HORAS = Array.from({length:14}, (_,i) => i + 7);

interface Evento {
  evento_id: string; titulo: string; tipo: string; data: string;
  hora_inicio: string; hora_fim: string | null;
  empresa_id: string | null; empresa_nome: string | null; descricao: string | null;
}
interface Empresa { empresa_id: string; nome: string; }
interface Contato { contato_id: string; nome: string; email: string | null; empresa_id: string; }

function tipoInfo(tipo: string) { return TIPOS.find(t => t.key === tipo) || TIPOS[4]; }
function padZero(n: number) { return n.toString().padStart(2,"0"); }
function toDateStr(y: number, m: number, d: number) { return `${y}-${padZero(m+1)}-${padZero(d)}`; }
function isToday(y: number, m: number, d: number) {
  const now = new Date();
  return now.getFullYear()===y && now.getMonth()===m && now.getDate()===d;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards", active: false },
  { icon: TrendingUp, label: "Insights", active: false },
  { icon: Search, label: "Buscar Empresas", active: false },
  { icon: Building2, label: "Cadastrar Empresas", active: false },
  { icon: Users, label: "Todos os clientes", active: false },
  { icon: ClipboardList, label: "Gerenciamento", active: false },
  { icon: Calendar, label: "Calendário", active: true },
];


// ─────────────────────────────────────────────────────────────
// EmailsConvidadosField — suporte a múltiplos e-mails
// ─────────────────────────────────────────────────────────────
interface EmailsFieldProps {
  emails: string[];
  setEmails: (v: string[]) => void;
  contatos: Contato[];
  empresaNome: string;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

function EmailsConvidadosField({ emails, setEmails, contatos, empresaNome, dropdownRef }: EmailsFieldProps) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const contatosDisponiveis = contatos.filter(c => c.email && !emails.includes(c.email!));
  const filtrados = input
    ? contatosDisponiveis.filter(c =>
        c.email!.toLowerCase().includes(input.toLowerCase()) ||
        c.nome.toLowerCase().includes(input.toLowerCase())
      )
    : contatosDisponiveis;

  const addEmail = (email: string) => {
    const trimmed = email.trim().replace(/,\s*$/, "");
    if (trimmed && !emails.includes(trimmed)) setEmails([...emails, trimmed]);
    setInput(""); setShowDropdown(false);
  };

  const removeEmail = (email: string) => setEmails(emails.filter(e => e !== email));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault(); addEmail(input);
    }
    if (e.key === "Backspace" && !input && emails.length > 0) removeEmail(emails[emails.length - 1]);
  };

  return (
    <div style={{ marginTop:10 }}>
      <label style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#9FD3EA", display:"block", marginBottom:6 }}>
        E-mails dos convidados (opcional)
      </label>

      {/* Chips de emails adicionados */}
      {emails.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
          {emails.map(email => (
            <div key={email} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px 4px 8px", borderRadius:20, background:"rgba(46,111,149,0.1)", border:"1px solid rgba(159,211,234,0.30)" }}>
              <Mail style={{ width:11, height:11, color:"#9FD3EA", flexShrink:0 }}/>
              <span style={{ fontSize:12, fontWeight:600, color:"#9FD3EA", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{email}</span>
              <button type="button" onClick={() => removeEmail(email)} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", flexShrink:0 }}>
                <X style={{ width:11, height:11, color:"#9FD3EA" }}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input + botão dropdown */}
      <div ref={dropdownRef} style={{ position:"relative" }}>
        <div style={{ display:"flex", gap:8 }}>
          <input
            className="input-field"
            type="email"
            value={input}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            onChange={e => { setInput(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder={emails.length > 0 ? "Adicionar outro e-mail..." : "Digite ou selecione e-mails..."}
            style={{ flex:1 }}
          />
          {input.trim() && (
            <button type="button" onClick={() => addEmail(input)}
              style={{ height:44, padding:"0 14px", borderRadius:10, border:"none", background:"#2E6F95", color:"#EAF6FB", fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>
              + Adicionar
            </button>
          )}
          {contatosDisponiveis.length > 0 && (
            <button type="button" onClick={e => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
              style={{ height:44, padding:"0 12px", borderRadius:10, border:"1px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:600, color:"#9FD3EA", flexShrink:0 }}>
              <Users2 style={{ width:13, height:13 }}/>Contatos<ChevronDown style={{ width:12, height:12 }}/>
            </button>
          )}
        </div>

        <AnimatePresence>
          {showDropdown && filtrados.length > 0 && (
            <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }} transition={{ duration:0.15 }}
              onClick={e => e.stopPropagation()}
              style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:300, background:"#0F2E4B", border:"1px solid rgba(159,211,234,0.18)", borderRadius:12, boxShadow:"0 8px 32px rgba(46,111,149,0.15)", overflow:"hidden", maxHeight:200, overflowY:"auto" }}>
              {empresaNome && (
                <div style={{ padding:"8px 14px 4px", fontSize:10, fontWeight:700, color:"#9FD3EA", letterSpacing:"0.06em", textTransform:"uppercase" }}>{empresaNome}</div>
              )}
              {filtrados.map(c => (
                <div key={c.contato_id} className="email-option"
                  onMouseDown={e => { e.preventDefault(); e.stopPropagation(); addEmail(c.email!); }}>
                  <span style={{ fontWeight:600, color:"#EAF6FB" }}>{c.nome}</span>
                  <span style={{ fontSize:12, color:"#9FD3EA" }}>{c.email}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {emails.length === 0 && !input && (
          <div style={{ marginTop:6, fontSize:11, color:"#9FD3EA" }}>
            Pressione Enter ou vírgula para adicionar. Múltiplos convidados permitidos.
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

export default function Calendario() {
  const navigate = useNavigate();
  // Insights e tela de gestao: fica fora do menu de quem nao e gerente.
  const podeInsights = podeVerInsights(useUsuarioLogado());
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const today = new Date();
  const [view, setView] = useState<"mes"|"semana"|"dia">("mes");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  // Empresa cadastrada em outra aba aparece no seletor sem precisar de F5.
  useEmpresasAoVivo<Empresa>(setEmpresas);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [usuario, setUsuario] = useState<{nome:string;cargo:string}|null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editEvento, setEditEvento] = useState<Evento|null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ titulo:"", tipo:"call", data:"", hora_inicio:"09:00", hora_fim:"10:00", empresa_id:"", empresa_nome:"", descricao:"" });

  const [outlookConectado, setOutlookConectado] = useState(false);
  const [googleConectado, setGoogleConectado] = useState(false);
  const [agendarOutlook, setAgendarOutlook] = useState(false);
  const [agendarGoogle, setAgendarGoogle] = useState(false);
  const [emailsConvidados, setEmailsConvidados] = useState<string[]>([]);
  const [conectandoOutlook, setConectandoOutlook] = useState(false);
  const [conectandoGoogle, setConectandoGoogle] = useState(false);
  const emailDropdownRef = useRef<HTMLDivElement>(null);

  // Carga inicial só na montagem: fetchAll/checkIntegrations são recriados a cada
  // render — incluí-los nas deps refetcharia em loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); checkIntegrations(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emailDropdownRef.current && !emailDropdownRef.current.contains(e.target as Node)) {
        // fecha dropdown interno gerenciado pelo EmailsConvidadosField
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (form.empresa_id) fetchContatosEmpresa(form.empresa_id);
    else setContatos([]);
    // Deve reagir só à troca de empresa. fetchContatosEmpresa é recriado a cada
    // render e nas deps refetcharia os contatos em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.empresa_id]);

  const authHeaders = () => ({ "Content-Type":"application/json", Authorization:`Bearer ${getToken()||""}` });

  const fetchAll = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const h = authHeaders();
      // As empresas vem do store ao vivo; aqui ficam eventos e /me.
      const [evRes, meRes] = await Promise.all([
        fetch(`${API}/eventos`, { headers: h }),
        fetch(`${API}/me`, { headers: h }),
      ]);
      if (evRes.ok) setEventos(await evRes.json());
      if (meRes.ok) setUsuario(await meRes.json());
    } catch {}
  };

  const fetchContatosEmpresa = async (empresaId: string) => {
    try {
      const res = await fetch(`${API}/empresas/${empresaId}/contatos`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setContatos(data.filter((c: Contato) => c.email));
      }
    } catch {}
  };

  const checkIntegrations = async () => {
    if (!getToken()) return;
    try {
      const h = authHeaders();
      const [outlookRes, googleRes] = await Promise.all([
        fetch(`${API}/auth/outlook/status`, { headers: h }),
        fetch(`${API}/auth/google/status`, { headers: h }),
      ]);
      if (outlookRes.ok) { const d = await outlookRes.json(); setOutlookConectado(d.conectado); }
      if (googleRes.ok)  { const d = await googleRes.json(); setGoogleConectado(d.conectado); }
    } catch {}
  };

  const conectarOutlook = async () => {
    setConectandoOutlook(true);
    try {
      const res = await fetch(`${API}/auth/outlook/login`, { headers: authHeaders() });
      const data = await res.json();
      if (data.auth_url) window.location.href = data.auth_url;
    } catch { setConectandoOutlook(false); }
  };

  const desconectarOutlook = async () => {
    await fetch(`${API}/auth/outlook/disconnect`, { method:"DELETE", headers: authHeaders() });
    setOutlookConectado(false); setAgendarOutlook(false);
  };

  const conectarGoogle = async () => {
    setConectandoGoogle(true);
    try {
      const res = await fetch(`${API}/auth/google/login`, { headers: authHeaders() });
      const data = await res.json();
      if (data.auth_url) window.location.href = data.auth_url;
    } catch { setConectandoGoogle(false); }
  };

  const desconectarGoogle = async () => {
    await fetch(`${API}/auth/google/disconnect`, { method:"DELETE", headers: authHeaders() });
    setGoogleConectado(false); setAgendarGoogle(false);
  };

  const openNew = (date: string, hour?: string) => {
    setEditEvento(null); setAgendarOutlook(false); setAgendarGoogle(false);
    setEmailsConvidados([]); setContatos([]);
    setForm({ titulo:"", tipo:"call", data:date, hora_inicio:hour||"09:00", hora_fim:hour?`${padZero(parseInt(hour)+1)}:00`:"10:00", empresa_id:"", empresa_nome:"", descricao:"" });
    setShowModal(true);
  };

  const openEdit = (ev: Evento, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditEvento(ev); setAgendarOutlook(false); setAgendarGoogle(false); setEmailsConvidados([]);
    if (ev.empresa_id) fetchContatosEmpresa(ev.empresa_id); else setContatos([]);
    setForm({ titulo:ev.titulo, tipo:ev.tipo, data:ev.data, hora_inicio:ev.hora_inicio?.slice(0,5)||"09:00", hora_fim:ev.hora_fim?.slice(0,5)||"10:00", empresa_id:ev.empresa_id||"", empresa_nome:ev.empresa_nome||"", descricao:ev.descricao||"" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.titulo || !form.data) return;
    setSaving(true);
    try {
      const body = { ...form, empresa_id:form.empresa_id||null, empresa_nome:form.empresa_nome||null };
      const url = editEvento ? `${API}/eventos/${editEvento.evento_id}` : `${API}/eventos`;
      const res = await fetch(url, { method:editEvento?"PUT":"POST", headers:authHeaders(), body:JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        const eventoId = editEvento ? editEvento.evento_id : data.id;
        const reuniaoPayload = {
          titulo: form.titulo,
          descricao: form.descricao || "",
          data: form.data,
          hora_inicio: form.hora_inicio,
          hora_fim: form.hora_fim,
          emails_convidados: emailsConvidados.length > 0 ? emailsConvidados : null,
          email_convidado: emailsConvidados[0] || null,
        };

        if (agendarOutlook && outlookConectado && eventoId) {
          await fetch(`${API}/eventos/${eventoId}/agendar-outlook`, { method:"POST", headers:authHeaders(), body:JSON.stringify(reuniaoPayload) });
        }
        if (agendarGoogle && googleConectado && eventoId) {
          await fetch(`${API}/eventos/${eventoId}/agendar-google`, { method:"POST", headers:authHeaders(), body:JSON.stringify(reuniaoPayload) });
        }
        setShowModal(false); fetchAll();
      }
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir este evento?")) return;
    await fetch(`${API}/eventos/${id}`, { method:"DELETE", headers:authHeaders() });
    setShowModal(false); fetchAll();
  };

  const eventosNoDia = (d: string) => eventos.filter(e => e.data === d);
  const eventosNaHora = (d: string, h: number) => eventos.filter(e => e.data===d && parseInt(e.hora_inicio)===h);

  const prev = () => { const d=new Date(currentDate); if(view==="mes")d.setMonth(d.getMonth()-1); else if(view==="semana")d.setDate(d.getDate()-7); else d.setDate(d.getDate()-1); setCurrentDate(d); };
  const next = () => { const d=new Date(currentDate); if(view==="mes")d.setMonth(d.getMonth()+1); else if(view==="semana")d.setDate(d.getDate()+7); else d.setDate(d.getDate()+1); setCurrentDate(d); };

  const headerLabel = () => {
    if (view==="mes") return `${MESES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view==="dia") return `${currentDate.getDate()} de ${MESES[currentDate.getMonth()]}`;
    const start=new Date(currentDate); start.setDate(start.getDate()-start.getDay());
    const end=new Date(start); end.setDate(end.getDate()+6);
    return `${start.getDate()} - ${end.getDate()} de ${MESES[end.getMonth()]}`;
  };

  const buildMonth = () => {
    const y=currentDate.getFullYear(), m=currentDate.getMonth();
    const first=new Date(y,m,1).getDay(), last=new Date(y,m+1,0).getDate();
    const days: {y:number;m:number;d:number;cur:boolean}[] = [];
    for(let i=0;i<first;i++){const p=new Date(y,m,-first+i+1);days.push({y:p.getFullYear(),m:p.getMonth(),d:p.getDate(),cur:false});}
    for(let d=1;d<=last;d++)days.push({y,m,d,cur:true});
    while(days.length%7!==0){const n=new Date(y,m+1,days.length-first-last+1);days.push({y:n.getFullYear(),m:n.getMonth(),d:n.getDate(),cur:false});}
    return days;
  };

  const buildWeek = () => {
    const start=new Date(currentDate); start.setDate(start.getDate()-start.getDay());
    return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d;});
  };

  const EventChip = ({ev,onClick}:{ev:Evento;onClick:(e:React.MouseEvent)=>void}) => {
    const t=tipoInfo(ev.tipo);
    return (
      // barra de acento à esquerda: identifica o tipo mesmo quando a célula do
      // dia é estreita e o rótulo sai cortado
      <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 7px",borderRadius:5,background:t.bg,borderLeft:`3px solid ${t.color}`,color:t.texto,fontSize:10,fontWeight:700,cursor:"pointer",marginBottom:2,overflow:"hidden"}}>
        <t.icon style={{width:9,height:9,flexShrink:0,color:t.color}}/>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.hora_inicio?.slice(0,5)} {ev.titulo}</span>
      </div>
    );
  };

  const salvarLabel = () => {
    if (saving) return "Salvando...";
    if (editEvento) return "Salvar alterações";
    if (agendarOutlook && agendarGoogle) return "Criar + Outlook + Google";
    if (agendarOutlook) return "Criar evento + Outlook";
    if (agendarGoogle) return "Criar evento + Google";
    return "Criar evento";
  };

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",position:"relative"}}>
      <style>{css}</style>
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}>
        <FundoAzul />
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
          {navItems.filter(nav => nav.label !== "Insights" || podeInsights).map(item=>(
            <div key={item.label} className={`nav-item${item.active?" active":""}`} onClick={()=>{
              if(item.label==="Dashboards")navigate("/dashboard");
              if(item.label==="Insights")navigate("/insights");
              if(item.label==="Buscar Empresas")navigate("/buscar");
              if(item.label==="Todos os clientes")navigate("/clientes");
              if(item.label==="Cadastrar Empresas")navigate("/empresas/nova");
              if(item.label==="Gerenciamento")navigate("/gerenciamento");
            }}>
              <item.icon style={{width:16,height:16}}/>{item.label}
            </div>
          ))}
          {((usuario as any)?.is_gerente || (usuario as any)?.is_supervisor) && (
            <div className="nav-item" onClick={()=>navigate("/equipe")}>
              <UserRoundCog style={{width:16,height:16}}/>Equipe
            </div>
          )}
        </nav>
        <CardUsuario />
      </div>

      {/* Main */}
      <div style={{flex:1,height:"100vh",overflowY:"auto",position:"relative",zIndex:5,display:"flex",flexDirection:"column"}}>
        <div style={{position:"sticky",top:0,zIndex:20,padding:isMobile?"12px 14px":"14px 28px",background:"rgba(15,46,75,0.88)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(159,211,234,0.18)",display:"flex",alignItems:"center",gap:isMobile?10:14,flexShrink:0}}>
          {isMobile && (
            <button onClick={()=>setMenuOpen(true)} style={{width:36,height:36,borderRadius:10,border:"1px solid rgba(159,211,234,0.18)",background:"rgba(18,59,94,0.55)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Menu style={{width:18,height:18,color:"#9FD3EA"}}/>
            </button>
          )}
          <div style={{flex:1,minWidth:0}}>
            <h1 style={{fontSize:18,fontWeight:800,color:"#FFFFFF"}}>Calendário</h1>
            <p style={{fontSize:12,color:"#B6CFE4",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Agenda e planejamento de atividades</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button type="button" onClick={prev} style={{width:32,height:32,borderRadius:8,border:"1px solid rgba(126,176,219,0.22)",background:"#123253",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronLeft style={{width:15,height:15,color:"#9FD3EA"}}/></button>
            <span style={{fontSize:14,fontWeight:700,color:"#FFFFFF",minWidth:200,textAlign:"center"}}>{headerLabel()}</span>
            <button type="button" onClick={next} style={{width:32,height:32,borderRadius:8,border:"1px solid rgba(126,176,219,0.22)",background:"#123253",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronRight style={{width:15,height:15,color:"#9FD3EA"}}/></button>
            <button type="button" onClick={()=>setCurrentDate(new Date())} style={{padding:"6px 12px",borderRadius:8,border:"1px solid rgba(159,211,234,0.30)",background:"rgba(46,111,149,0.08)",color:"#9FD3EA",fontSize:12,fontWeight:600,cursor:"pointer"}}>Hoje</button>
          </div>
          <div style={{display:"flex",gap:4,background:"#0F2E4B",borderRadius:10,padding:4}}>
            {(["mes","semana","dia"] as const).map(v=>(
              <button type="button" key={v} className="view-btn" onClick={()=>setView(v)} style={{background:view===v?"#1A3F63":"transparent",color:view===v?"#FFFFFF":"#B6CFE4",fontWeight:view===v?700:600}}>
                {v==="mes"?"Mês":v==="semana"?"Semana":"Dia"}
              </button>
            ))}
          </div>
          <button type="button" onClick={()=>openNew(toDateStr(today.getFullYear(),today.getMonth(),today.getDate()))} style={{height:38,padding:"0 16px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)",backgroundSize:"200% 200%",animation:"gradientShift 4s ease infinite",color:"#EAF6FB",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
            <Plus style={{width:15,height:15}}/> Novo evento
          </button>
        </div>

        {/* Integration Bar */}
        <div style={{padding:"10px 28px",background:"rgba(11,35,58,0.92)",borderBottom:"1px solid rgba(126,176,219,0.16)",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <span style={{fontSize:11,fontWeight:700,color:"#B6CFE4",letterSpacing:"0.05em",textTransform:"uppercase",marginRight:4}}>Calendários</span>
          <div className="connect-card" onClick={outlookConectado?desconectarOutlook:conectarOutlook}
            style={{borderColor:outlookConectado?"rgba(0,120,212,0.65)":"rgba(126,176,219,0.22)",background:outlookConectado?"rgba(0,120,212,0.16)":"#123253"}}>
            <OutlookIcon size={16}/>
            <span style={{fontSize:12,fontWeight:600,color:outlookConectado?"#50B3FF":"#FFFFFF"}}>
              {conectandoOutlook?"Conectando...":outlookConectado?"Outlook conectado":"Conectar Outlook"}
            </span>
            {outlookConectado?<CheckCircle2 style={{width:13,height:13,color:"#50B3FF"}}/>:<Link2 style={{width:13,height:13,color:"#B6CFE4"}}/>}
          </div>
          <div className="connect-card" onClick={googleConectado?desconectarGoogle:conectarGoogle}
            style={{borderColor:googleConectado?"rgba(66,133,244,0.65)":"rgba(126,176,219,0.22)",background:googleConectado?"rgba(66,133,244,0.16)":"#123253"}}>
            <GoogleIcon size={16}/>
            <span style={{fontSize:12,fontWeight:600,color:googleConectado?"#6BA3F7":"#FFFFFF"}}>
              {conectandoGoogle?"Conectando...":googleConectado?"Google conectado":"Conectar Google"}
            </span>
            {googleConectado?<CheckCircle2 style={{width:13,height:13,color:"#6BA3F7"}}/>:<Link2 style={{width:13,height:13,color:"#B6CFE4"}}/>}
          </div>
        </div>

        <div style={{flex:1,padding:"20px 28px",overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div className="glass" style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>

            {view==="mes"&&(
              <>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid rgba(159,211,234,0.18)"}}>
                  {DIAS_SEMANA.map(d=><div key={d} style={{padding:"10px 0",textAlign:"center",fontSize:11,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:"#B6CFE4"}}>{d}</div>)}
                </div>
                <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(7,1fr)",gridAutoRows:"1fr",overflow:"auto"}}>
                  {buildMonth().map((day,i)=>{
                    const dateStr=toDateStr(day.y,day.m,day.d);
                    const evs=eventosNoDia(dateStr);
                    const tod=isToday(day.y,day.m,day.d);
                    return (
                      <div key={i} className={`day-cell${!day.cur?" other-month":""}${tod?" today":""}`} onClick={()=>openNew(dateStr)}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:26,height:26,borderRadius:"50%",background:tod?"rgba(86,164,245,0.25)":"transparent",border:tod?"1px solid #56A4F5":"1px solid transparent",color:"#FFFFFF",fontSize:13,fontWeight:700,marginBottom:4}}>{day.d}</div>
                        {evs.slice(0,3).map(ev=><EventChip key={ev.evento_id} ev={ev} onClick={e=>openEdit(ev,e)}/>)}
                        {evs.length>3&&<div style={{fontSize:9,color:"#9FD3EA",fontWeight:600}}>+{evs.length-3} mais</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {view==="semana"&&(
              <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
                <div style={{display:"grid",gridTemplateColumns:"60px repeat(7,1fr)",borderBottom:"1px solid rgba(159,211,234,0.18)",flexShrink:0}}>
                  <div/>
                  {buildWeek().map((d,i)=>{
                    const tod=isToday(d.getFullYear(),d.getMonth(),d.getDate());
                    return (
                      <div key={i} style={{padding:"10px 0",textAlign:"center",borderLeft:"1px solid rgba(159,211,234,0.18)"}}>
                        <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"#9FD3EA"}}>{DIAS_SEMANA[d.getDay()]}</div>
                        <div style={{width:28,height:28,borderRadius:"50%",background:tod?"rgba(86,164,245,0.25)":"transparent",border:tod?"1px solid #56A4F5":"1px solid transparent",color:"#FFFFFF",fontSize:14,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",margin:"4px auto 0"}}>{d.getDate()}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{flex:1,overflow:"auto"}}>
                  {HORAS.map(hora=>(
                    <div key={hora} style={{display:"grid",gridTemplateColumns:"60px repeat(7,1fr)",minHeight:56}}>
                      <div style={{padding:"6px 8px 0",fontSize:11,fontWeight:600,color:"#9FD3EA",textAlign:"right",borderRight:"1px solid rgba(159,211,234,0.18)",flexShrink:0}}>{padZero(hora)}:00</div>
                      {buildWeek().map((d,i)=>{
                        const dateStr=toDateStr(d.getFullYear(),d.getMonth(),d.getDate());
                        const evs=eventosNaHora(dateStr,hora);
                        return (
                          <div key={i} className="hour-slot" style={{borderLeft:"1px solid rgba(159,211,234,0.18)",padding:"3px",flexDirection:"column",alignItems:"stretch",justifyContent:"flex-start"}} onClick={()=>openNew(dateStr,`${padZero(hora)}:00`)}>
                            {evs.map(ev=><EventChip key={ev.evento_id} ev={ev} onClick={e=>openEdit(ev,e)}/>)}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view==="dia"&&(
              <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
                <div style={{padding:"14px 20px",borderBottom:"1px solid rgba(159,211,234,0.18)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                  <div style={{width:40,height:40,borderRadius:12,background:isToday(currentDate.getFullYear(),currentDate.getMonth(),currentDate.getDate())?"rgba(86,164,245,0.25)":"rgba(86,164,245,0.10)",border:isToday(currentDate.getFullYear(),currentDate.getMonth(),currentDate.getDate())?"1px solid #56A4F5":"1px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:"#FFFFFF"}}>{currentDate.getDate()}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#EAF6FB"}}>{DIAS_SEMANA[currentDate.getDay()]}, {currentDate.getDate()} de {MESES[currentDate.getMonth()]}</div>
                    <div style={{fontSize:11,color:"#9FD3EA"}}>{eventosNoDia(toDateStr(currentDate.getFullYear(),currentDate.getMonth(),currentDate.getDate())).length} evento(s)</div>
                  </div>
                </div>
                <div style={{flex:1,overflow:"auto"}}>
                  {HORAS.map(hora=>{
                    const dateStr=toDateStr(currentDate.getFullYear(),currentDate.getMonth(),currentDate.getDate());
                    const evs=eventosNaHora(dateStr,hora);
                    const isNow=new Date().getHours()===hora&&isToday(currentDate.getFullYear(),currentDate.getMonth(),currentDate.getDate());
                    return (
                      <div key={hora} style={{display:"flex",minHeight:72,borderBottom:"1px solid rgba(159,211,234,0.18)",background:isNow?"rgba(46,111,149,0.03)":"transparent"}} onClick={()=>openNew(dateStr,`${padZero(hora)}:00`)}>
                        <div style={{width:72,padding:"10px 12px 0",fontSize:12,fontWeight:600,color:isNow?"#9FD3EA":"#9FD3EA",textAlign:"right",flexShrink:0,borderRight:"2px solid "+(isNow?"#9FD3EA":"#9FD3EA")}}>{padZero(hora)}:00</div>
                        <div style={{flex:1,padding:"6px 12px",display:"flex",flexDirection:"column",gap:4,cursor:"pointer"}}>
                          {evs.map(ev=>{
                            const t=tipoInfo(ev.tipo);
                            return (
                              <motion.div key={ev.evento_id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} onClick={e=>openEdit(ev,e)} style={{padding:"8px 14px",borderRadius:10,background:t.bg,border:`1px solid ${t.color}55`,borderLeft:`4px solid ${t.color}`,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                                <div style={{width:28,height:28,borderRadius:8,background:t.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><t.icon style={{width:13,height:13,color:"#0A2338"}}/></div>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:13,fontWeight:700,color:"#FFFFFF"}}>{ev.titulo}</div>
                                  <div style={{fontSize:11,color:"#C3D8EA",display:"flex",gap:8}}>
                                    <span><Clock style={{width:10,height:10,display:"inline",marginRight:3}}/>{ev.hora_inicio?.slice(0,5)}{ev.hora_fim?` – ${ev.hora_fim.slice(0,5)}`:""}</span>
                                    {ev.empresa_nome&&<span>· {ev.empresa_nome}</span>}
                                  </div>
                                </div>
                                <span style={{fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:6,background:`${t.color}33`,border:`1px solid ${t.color}66`,color:t.texto}}>{t.label}</span>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {showModal&&(
          <motion.div
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:"fixed",inset:0,zIndex:100,background:"rgba(10,30,50,0.45)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
            onMouseDown={e=>{ if(e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{opacity:0,scale:0.94,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.94}} transition={{duration:0.22}}
              onMouseDown={e=>e.stopPropagation()}
              onClick={e=>e.stopPropagation()}
              style={{width:"100%",maxWidth:540,borderRadius:20,background:"#0F2E4B",border:"1px solid rgba(159,211,234,0.18)",boxShadow:"0 24px 80px rgba(46,111,149,0.2)",padding:28,maxHeight:"90vh",overflowY:"auto"}}
            >
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                <div style={{fontSize:16,fontWeight:800,color:"#EAF6FB"}}>{editEvento?"Editar evento":"Novo evento"}</div>
                <div style={{display:"flex",gap:8}}>
                  {editEvento&&(
                    <button type="button" onClick={()=>handleDelete(editEvento.evento_id)} style={{width:34,height:34,borderRadius:8,border:"1px solid rgba(231,76,60,0.3)",background:"rgba(231,76,60,0.08)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                      <Trash2 style={{width:14,height:14,color:"#F7B8B1"}}/>
                    </button>
                  )}
                  <button type="button" onClick={()=>setShowModal(false)} style={{width:34,height:34,borderRadius:8,border:"1px solid rgba(159,211,234,0.18)",background:"rgba(18,59,94,0.55)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                    <X style={{width:14,height:14,color:"#9FD3EA"}}/>
                  </button>
                </div>
              </div>

              <div style={{marginBottom:16}}>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#9FD3EA",display:"block",marginBottom:8}}>Tipo</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {TIPOS.map(t=>(
                    <button type="button" key={t.key} className={`tipo-btn${form.tipo===t.key?" selected":""}`} aria-pressed={form.tipo===t.key} style={{background:form.tipo===t.key?t.color:"rgba(18,59,94,0.55)",color:form.tipo===t.key?"#0A2338":t.texto,borderColor:form.tipo===t.key?t.color:"rgba(159,211,234,0.18)",fontWeight:form.tipo===t.key?800:600}} onClick={()=>setForm({...form,tipo:t.key})}>
                      <t.icon style={{width:13,height:13}}/>{t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{marginBottom:14}}>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#9FD3EA",display:"block",marginBottom:6}}>Título *</label>
                <input
                  className="input-field"
                  value={form.titulo}
                  onChange={e=>setForm({...form,titulo:e.target.value})}
                  onKeyDown={e=>{ if(e.key==="Enter") e.preventDefault(); }}
                  placeholder="Ex: Call com João - TechSolutions"
                />
              </div>

              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                <div>
                  <label style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#9FD3EA",display:"block",marginBottom:6}}>Data *</label>
                  <input type="date" className="input-field" value={form.data} onChange={e=>setForm({...form,data:e.target.value})}/>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#9FD3EA",display:"block",marginBottom:6}}>Início</label>
                  <input type="time" className="input-field" value={form.hora_inicio} onChange={e=>setForm({...form,hora_inicio:e.target.value})}/>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#9FD3EA",display:"block",marginBottom:6}}>Fim</label>
                  <input type="time" className="input-field" value={form.hora_fim} onChange={e=>setForm({...form,hora_fim:e.target.value})}/>
                </div>
              </div>

              <div style={{marginBottom:14}}>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#9FD3EA",display:"block",marginBottom:6}}>Empresa (opcional)</label>
                <select className="select-field" value={form.empresa_id} onChange={e=>{
                  const emp=empresas.find(em=>em.empresa_id===e.target.value);
                  setForm({...form,empresa_id:e.target.value,empresa_nome:emp?.nome||""});
                  setEmailsConvidados([]);
                }}>
                  <option value="">Selecione uma empresa...</option>
                  {empresas.map(emp=><option key={emp.empresa_id} value={emp.empresa_id}>{emp.nome}</option>)}
                </select>
              </div>

              <div style={{marginBottom:16}}>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#9FD3EA",display:"block",marginBottom:6}}>Descrição</label>
                <textarea
                  className="textarea-field"
                  value={form.descricao}
                  onChange={e=>setForm({...form,descricao:e.target.value})}
                  placeholder="Detalhes do evento..."
                />
              </div>

              {/* Seção agendar em */}
              <div style={{marginBottom:20}}>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#9FD3EA",display:"block",marginBottom:8}}>
                  <Mail style={{width:11,height:11,display:"inline",marginRight:4}}/>Também agendar em
                </label>

                <div className={`toggle-box${agendarOutlook?" active":""}`} onClick={()=>{if(!outlookConectado){conectarOutlook();return;}setAgendarOutlook(!agendarOutlook);}}>
                  <OutlookIcon size={18}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:outlookConectado?"#EAF6FB":"#9FD3EA"}}>Outlook Calendar</div>
                    <div style={{fontSize:11,color:"#9FD3EA"}}>{outlookConectado?"Cria o evento e envia convite ao cliente":"Clique para conectar primeiro"}</div>
                  </div>
                  <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${agendarOutlook&&outlookConectado?"#9FD3EA":"rgba(159,211,234,0.18)"}`,background:agendarOutlook&&outlookConectado?"#9FD3EA":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {agendarOutlook&&outlookConectado&&<CheckCircle2 style={{width:12,height:12,color:"#fff"}}/>}
                  </div>
                </div>

                <div className={`toggle-box${agendarGoogle?" active":""}`} onClick={()=>{if(!googleConectado){conectarGoogle();return;}setAgendarGoogle(!agendarGoogle);}}>
                  <GoogleIcon size={18}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:googleConectado?"#EAF6FB":"#9FD3EA"}}>Google Calendar</div>
                    <div style={{fontSize:11,color:"#9FD3EA"}}>{googleConectado?"Cria o evento e envia convite ao cliente":"Clique para conectar primeiro"}</div>
                  </div>
                  <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${agendarGoogle&&googleConectado?"#4285F4":"rgba(159,211,234,0.18)"}`,background:agendarGoogle&&googleConectado?"#4285F4":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {agendarGoogle&&googleConectado&&<CheckCircle2 style={{width:12,height:12,color:"#fff"}}/>}
                  </div>
                </div>

                {(agendarOutlook || agendarGoogle) && (
                  <EmailsConvidadosField
                    emails={emailsConvidados}
                    setEmails={setEmailsConvidados}
                    contatos={contatos}
                    empresaNome={form.empresa_nome}
                    dropdownRef={emailDropdownRef}
                  />
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving||!form.titulo||!form.data}
                style={{width:"100%",height:48,borderRadius:12,border:"none",cursor:saving||!form.titulo||!form.data?"not-allowed":"pointer",background:saving||!form.titulo||!form.data?"rgba(159,211,234,0.30)":"linear-gradient(135deg,rgba(159,211,234,0.30),rgba(159,211,234,0.30),#83DDA8,rgba(159,211,234,0.30))",backgroundSize:"200% 200%",animation:"gradientShift 4s ease infinite",color:"#EAF6FB",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
              >
                {salvarLabel()}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}