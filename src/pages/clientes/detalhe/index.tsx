import { getToken } from "../../../services/auth";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { openEmail, openWhatsApp } from "../../../utils/commPrefs";
import { dataLocal, diasDesde, inicioDoDia, formatarData } from "../../../utils/data";
import { brl, brlCurto } from "../../../utils/moeda";
import { STATUS_ORCAMENTO, STATUS_ORDEM, numeroOrcamento } from "../../../utils/orcamento";
import {
  BarChart3, LayoutDashboard, Search, Building2, Users,
  ClipboardList, Calendar, ArrowLeft, Edit3,
  MapPin, Tag, Thermometer, TrendingUp, DollarSign,
  Phone, Mail, User, Clock, ChevronRight, MessageCircle, Link2,
  FileText, Hash, Globe, NotebookPen,
  Wallet, Target, CalendarCheck, ShoppingCart, Package, Filter,
} from "lucide-react";

import SelectRecipientsModal, {
  SendChannel,
  Recipient,
  EmailProvider,
} from "../../../components/SelectRecipientsModal";
import EmpresaNotificationBell from "../../../components/EmpresaNotificationBell";
import CardUsuario from "../../../components/CardUsuario";
import EmpresasProximasDaEmpresa from "../../../components/EmpresasProximasDaEmpresa";
import { DonutConversao, serieAprovadaPorMes, somaSerie } from "../../../components/GraficoAprovadoMensal";
import useValoresOrcamento, { aoMudarOrcamentos } from "../../../hooks/useValoresOrcamento";
import {
  OrcamentoDet, PainelVendas, PainelProdutos, PainelTimeline, PainelObservacoes,
  FunilOrcamentos, Colunas, Caixa, Facts, Rank, Cabecalho, Th, Chip, Vazio,
  CARD, TD, TD_NUM, num,
} from "./paineis";

import FundoAzul from "../../../components/FundoAzul";
const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:#EAF6FB; transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(159,211,234,0.08); color:#fff; }
  .nav-item.active { background:rgba(159,211,234,0.08); color:#fff; font-weight:600; }
  .glass-card { background:#143354; border:1px solid rgba(159,211,234,0.18); border-radius:16px; }
  .chip { display:inline-flex; align-items:center; gap:4px; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; }
  .info-row { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid rgba(159,211,234,0.18); }
  .info-row:last-child { border-bottom:none; }
  .send-btn { display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:8px; border:1.5px solid; font-size:11px; font-weight:700; cursor:pointer; transition:all 0.18s; font-family:'Plus Jakarta Sans',sans-serif; }
  .skeleton { background:linear-gradient(90deg,rgba(159,211,234,0.08) 25%,rgba(220,240,252,0.7) 50%,rgba(159,211,234,0.08) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
  .user-card { margin-top:16px; padding:12px; border-radius:12px; background:rgba(159,211,234,0.08); border:1px solid rgba(159,211,234,0.18); display:flex; align-items:center; gap:10px; cursor:pointer; transition:background 0.18s; }
  .user-card:hover { background:rgba(159,211,234,0.08); }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(46,111,149,0.25); border-radius:4px; }
`;

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",                path: "/dashboard" },
  { icon: TrendingUp,      label: "Insights",                  path: "/insights" },
  { icon: Search,          label: "Buscar Empresas",           path: "/buscar" },
  { icon: Building2,       label: "Cadastrar Empresas",        path: "/empresas/nova" },
  { icon: Users,           label: "Todos os clientes",         path: "/clientes" },
  { icon: ClipboardList,   label: "Gerenciamento", path: "/gerenciamento" },
  { icon: Calendar,        label: "Calendário",                path: "/calendario" },
];

interface Contato {
  contato_id: string;
  nome: string;
  funcao?: string;
  cargo?: string;
  email?: string;
  celular?: string;
  whatsapp?: string;
  telefone?: string;
  linkedin?: string;
  decisor?: boolean;
}

interface Empresa {
  empresa_id: string;
  nome: string;
  logo_url?: string | null;
  segmento: string;
  porte: string;
  cidade: string;
  estado?: string;
  status: string;
  temperatura: string;
  responsavel_principal: string;
  origem_lead: string;
  ultima_interacao: string | null;
  proxima_acao: string;
  observacoes?: string;
  cnpj?: string;
  site?: string;
  data_proxima_acao?: string | null;
  // vêm do LATERAL join do contato decisor em GET /empresas/{id}
  contato_email?: string | null;
  contato_celular?: string | null;
  // usados pela aba "Próximas" — a busca parte da coordenada desta empresa
  latitude?: number | null;
  longitude?: number | null;
  // "Cliente desde" do card de informacoes rapidas.
  criado_em?: string | null;
}

// O tipo mora no arquivo dos paineis: sao eles que consomem os campos novos
// (vendedor, itens, item principal) que o GET /orcamentos passou a devolver.
type Orcamento = OrcamentoDet;

function statusColor(s: string) {
  if (s === "Fechado")    return { bg:"rgba(39,174,96,0.12)",   text:"#83DDA8",  border:"rgba(39,174,96,0.25)"   };
  if (s === "Proposta")   return { bg:"rgba(142,68,173,0.12)",  text:"#C9B6E4",  border:"rgba(142,68,173,0.25)"  };
  if (s === "Em contato") return { bg:"rgba(41,128,185,0.12)",  text:"#1a5276",  border:"rgba(159,211,234,0.30)"  };
  return                         { bg:"rgba(149,165,166,0.15)", text:"#9FD3EA",  border:"rgba(149,165,166,0.3)"  };
}
function initials(name: string) {
  return name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
}
function avatarColor(name: string) {
  const colors = ["#9FD3EA", "#83DDA8", "#C9B6E4", "#F2C879", "#83DDA8", "#F7B8B1"];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}
const formatDate = (d: string | null) => formatarData(d);

const TABS = [
  { key: "resumo",      label: "Resumo",      icon: FileText },
  { key: "vendas",      label: "Vendas",      icon: ShoppingCart },
  { key: "produtos",    label: "Produtos",    icon: Package },
  { key: "orcamentos",  label: "Orçamentos",  icon: DollarSign },
  { key: "contatos",    label: "Contatos",    icon: Users },
  { key: "proximas",    label: "Próximas",    icon: MapPin },
  { key: "observacoes", label: "Observações", icon: NotebookPen },
  { key: "timeline",    label: "Timeline",    icon: Calendar },
];

function SendButton({
  color, bg, border, icon: Icon, label, onClick,
}: {
  color:string; bg: string; border:string;
  icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <button
      className="send-btn"
      onClick={onClick}
      style={{ background:bg, borderColor: border, color }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
    >
      <Icon style={{ width: 11, height: 11 }} />
      {label}
    </button>
  );
}

export default function EmpresaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo: string = (location.state as any)?.from ?? "/clientes";
  const [empresa, setEmpresa]     = useState<Empresa | null>(null);
  const [contatos, setContatos]   = useState<Contato[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [orcamentosErro, setOrcamentosErro] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // Aba ativa espelhada na URL (?tab=), para dar link direto de fora — o sino de
  // notificações e a tela de vendas apontam para abas específicas.
  const tabParam = new URLSearchParams(location.search).get("tab") || "";
  const tab = TABS.some(t => t.key === tabParam) ? tabParam : "resumo";
  const setTab = (key: string) =>
    navigate(`/clientes/${id}${key === "resumo" ? "" : `?tab=${key}`}`, {
      replace: true,
      state: location.state,
    });

  // canal aberto no modal
  const [sendChannel, setSendChannel] = useState<SendChannel | null>(null);
  // provider escolhido na sessão (persiste entre aberturas do modal)
  const [lastProvider, setLastProvider] = useState<EmailProvider>("outlook");

  // Orçamento virou o dado que manda nesta tela — KPIs, gráfico, funil, vendas,
  // produtos e timeline saem dele. Por isso a busca sai do useEffect: o store
  // avisa quando alguém mexe num orçamento e a ficha se refaz sem F5.
  const carregarOrcamentos = useCallback(async () => {
    try {
      const res = await fetch(`${API}/orcamentos?empresa_id=${id}`, {
        headers: { Authorization: `Bearer ${getToken() || ""}` },
      });
      if (res.ok) { setOrcamentos(await res.json()); setOrcamentosErro(false); }
      else setOrcamentosErro(true);
    } catch { setOrcamentosErro(true); }
  }, [id]);

  useEffect(() => aoMudarOrcamentos(carregarOrcamentos), [carregarOrcamentos]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [empRes, contatosRes] = await Promise.all([
          fetch(`${API}/empresas/${id}`,          { headers }),
          fetch(`${API}/empresas/${id}/contatos`, { headers }),
        ]);
        if (empRes.ok)      setEmpresa(await empRes.json());
        if (contatosRes.ok) setContatos(await contatosRes.json());
        try {
          const aRes = await fetch(`${API}/empresas/${id}/atividades`, { headers });
          if (aRes.ok) setAtividades(await aRes.json());
        } catch {}
        await carregarOrcamentos();
      } catch {}
      setLoading(false);
    };
    fetchAll();

    // Atualiza atividades a cada 20s para capturar respostas de calendário
    const refreshAtividades = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API}/empresas/${id}/atividades`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setAtividades(await res.json());
      } catch {}
    };
    const iv = setInterval(refreshAtividades, 20_000);
    return () => clearInterval(iv);
  }, [id, carregarOrcamentos]);

  const buildRecipients = (channel: SendChannel): Recipient[] =>
    contatos.map((c, i) => {
      let valor = "";
      if (channel === "email")    valor = c.email    || "";
      if (channel === "whatsapp") valor = c.whatsapp || c.celular || "";
      if (channel === "telefone") valor = c.celular  || c.telefone || "";
      if (channel === "linkedin") valor = c.linkedin || "";
      return {
        id: c.contato_id,
        nome: c.nome,
        funcao: c.funcao || c.cargo,
        valor,
        principal: i === 0,
        decisor: c.decisor,
      };
    });

  // ── único handler — recebe o provider escolhido dentro do modal ──
  const handleConfirmSend = (selected: Recipient[], provider?: EmailProvider) => {
    // salva para o próximo envio
    if (provider) setLastProvider(provider);
    setSendChannel(null);

    const resolvedProvider = provider ?? lastProvider;

    selected.forEach(r => {
      if (!r.valor) return;
      if (sendChannel === "email") {
        openEmail(r.valor, resolvedProvider as "gmail" | "outlook");
        return;
      }
      if (sendChannel === "whatsapp") {
        openWhatsApp(r.valor);
        return;
      }
      if (sendChannel === "telefone") {
        window.open(`tel:${r.valor}`, "_self");
        return;
      }
      if (sendChannel === "linkedin") {
        window.open(r.valor.startsWith("http") ? r.valor : `https://${r.valor}`);
      }
    });
  };

  const openContactEmail = (email: string, provider?: "gmail" | "outlook") => {
    openEmail(email, provider || (lastProvider as "gmail" | "outlook"));
  };

  const hdrs = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken() || ""}`,
  });

  const updateTemperatura = async (temperatura: string) => {
    if (!empresa) return;
    const anterior = empresa.temperatura;
    setEmpresa(prev => prev ? { ...prev, temperatura } : prev);
    try {
      await fetch(`${API}/empresas/${empresa.empresa_id}`, {
        method: "PUT", headers: hdrs(), body: JSON.stringify({ temperatura }),
      });
    } catch {
      setEmpresa(prev => prev ? { ...prev, temperatura: anterior } : prev);
    }
  };

  // Métricas do card "Informações rápidas". Só o que tem fonte hoje: faturamento,
  // budget e nº de vendas do mock dependem de vendas faturadas, que não existem.
  // Mesmo critério do LATERAL join do backend em GET /empresas/{id}: decisor primeiro.
  const contatoPrincipal = contatos.find(c => c.decisor) || contatos[0] || null;

  const aprovados  = orcamentos.filter(o => o.status === "aprovado");
  const recusados  = orcamentos.filter(o => o.status === "recusado");
  const emAberto   = orcamentos.filter(o => o.status === "enviado" || o.status === "em_negociacao");
  const decididos  = aprovados.length + recusados.length;
  const conversao  = decididos ? Math.round((aprovados.length / decididos) * 100) : null;

  // O dinheiro desta empresa sai do store ao vivo — a mesma fonte da lista de
  // clientes e do dashboard, para o mesmo cliente não aparecer com dois valores
  // em duas telas. Assinar o store é também o que mantém o relógio de 5s
  // ligado: sem isso, `aoMudarOrcamentos` nunca dispararia aqui.
  //
  // Ticket médio é a média do que o cliente aprovou, e só isso — o campo
  // estimado do cadastro foi removido do sistema. Sem nada aprovado, o número
  // não existe e mostramos "—" em vez de inventar.
  const valoresEmpresa = useValoresOrcamento().valorDe(id || "");
  const valorAprovado = valoresEmpresa.aprovado;
  const valorEmAberto = valoresEmpresa.emAberto;
  const ticketMedio = valoresEmpresa.ticketMedio;

  // Aprovado mês a mês desta empresa; o semestre anterior existe só para a
  // variação do KPI — sem base de comparação, qualquer número daria "+100%".
  const serieMensal   = useMemo(() => serieAprovadaPorMes(orcamentos), [orcamentos]);
  const serieAnterior = useMemo(() => serieAprovadaPorMes(orcamentos, 6, 6), [orcamentos]);
  const totalSemestre = somaSerie(serieMensal);
  const totalSemestreAnterior = somaSerie(serieAnterior);
  const variacaoSemestre = totalSemestreAnterior > 0
    ? ((totalSemestre - totalSemestreAnterior) / totalSemestreAnterior) * 100
    : null;

  const ultimoFechamento = aprovados
    .map(o => o.data_decisao || o.data_envio || o.criado_em || null)
    .filter(Boolean)
    .sort((a, b) => (dataLocal(b)?.getTime() ?? 0) - (dataLocal(a)?.getTime() ?? 0))[0] || null;
  const diasDoUltimo = ultimoFechamento ? diasDesde(ultimoFechamento) : null;
  const textoUltimo = diasDoUltimo === null || !Number.isFinite(diasDoUltimo)
    ? "nada fechado ainda"
    : diasDoUltimo === 0 ? "hoje"
    : diasDoUltimo === 1 ? "ontem"
    : `há ${diasDoUltimo} dias`;

  const kpis = [
    { lab: "Valor aprovado", icon: DollarSign, cor: "#83DDA8",
      val: valorAprovado ? brlCurto(valorAprovado) : "—",
      sub: `${aprovados.length} orçamento${aprovados.length === 1 ? "" : "s"} fechado${aprovados.length === 1 ? "" : "s"}`,
      badge: variacaoSemestre,
      title: variacaoSemestre !== null
        ? `${brl(totalSemestre)} nos últimos 6 meses contra ${brl(totalSemestreAnterior)} nos 6 anteriores`
        : "Soma dos orçamentos que esta empresa aprovou." },
    { lab: "Em aberto", icon: Wallet, cor: "#C9B6E4", badge: null,
      val: valorEmAberto ? brlCurto(valorEmAberto) : "—",
      sub: `${emAberto.length} enviado${emAberto.length === 1 ? "" : "s"} ou em negociação`,
      title: "Rascunho não entra: enquanto não foi ao cliente, não é dinheiro em jogo." },
    { lab: "Ticket médio", icon: Target, cor: "#F2C879", badge: null,
      val: ticketMedio !== null ? brlCurto(ticketMedio) : "—",
      sub: "por orçamento aprovado",
      title: ticketMedio !== null
        ? `Média de ${aprovados.length} aprovado${aprovados.length === 1 ? "" : "s"} — ${brl(valorAprovado)} no total`
        : "Aparece quando o primeiro orçamento desta empresa for aprovado." },
    { lab: "Último fechamento", icon: CalendarCheck, cor: "#9FD3EA", badge: null,
      val: formatDate(ultimoFechamento), sub: textoUltimo,
      title: "Data da última aprovação desta empresa." },
  ];

  // Compromissos daqui para a frente, do mais próximo ao mais distante.
  const proximasAcoes = useMemo(() => {
    const hoje = inicioDoDia().getTime();
    return atividades
      .map((a: any) => ({ a, d: dataLocal(a.data_hora || a.data) }))
      .filter(x => x.d && x.d.getTime() >= hoje)
      .sort((x, y) => (x.d!.getTime()) - (y.d!.getTime()))
      .slice(0, 4);
  }, [atividades]);

  // Chips de filtro: só os status que esta empresa tem. Cinco chips zerados
  // numa carteira de dois orçamentos é ruído, não filtro.
  const statusPresentes = STATUS_ORDEM.filter(st => orcamentos.some(o => o.status === st));
  const orcamentosVisiveis = filtroStatus === "todos"
    ? orcamentos
    : orcamentos.filter(o => o.status === filtroStatus);
  const totalVisivel = orcamentosVisiveis.reduce((acc, o) => acc + num(o.total), 0);

  const sc = empresa ? statusColor(empresa.status)      : statusColor("");

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", position:"relative" }}>
      <style>{css}</style>

      {/* ── Modal (único) ── */}
      <SelectRecipientsModal
        open={!!sendChannel}
        channel={sendChannel ?? "email"}
        recipients={sendChannel ? buildRecipients(sendChannel) : []}
        onConfirm={handleConfirmSend}
        onClose={() => setSendChannel(null)}
      />

      {/* Background */}
      <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
        <FundoAzul />
      </div>

      {/* ── Sidebar ── */}
      <div style={{ width:220, flexShrink:0, height:"100vh", overflowY:"auto", position:"relative", zIndex:10, background:"linear-gradient(180deg,#1a3a5c 0%,#0f2a44 60%,#0a1f33 100%)", boxShadow:"4px 0 24px rgba(0,0,0,0.18)", display:"flex", flexDirection:"column", padding:"0 12px 20px" }}>
        <div style={{ padding:"22px 4px 24px", borderBottom:"1px solid rgba(159,211,234,0.18)", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#2E6F95,#2E6F95)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(46,111,149,0.4)" }}>
              <BarChart3 style={{ width:18, height:18, color:"#fff" }} />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Prospecção</div>
              <div style={{ fontSize:11, fontWeight:700, background:"linear-gradient(90deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize:"200% 200%", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"gradientShift 4s ease infinite" }}>CRM</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, display:"flex", flexDirection:"column", gap:2 }}>
          {navItems.map(item => (
            <div key={item.label} className="nav-item" onClick={() => navigate(item.path)}>
              <item.icon style={{ width:16, height:16, flexShrink:0 }} />
              {item.label}
            </div>
          ))}
        </nav>
        <CardUsuario />
      </div>

      {/* ── Main ── */}
      <div style={{ flex:1, height:"100vh", overflowY:"auto", position:"relative", zIndex:5 }}>

        {/* Topbar */}
        <div style={{ position:"sticky", top:0, zIndex:20, padding:"14px 28px", background:"rgba(15,46,75,0.88)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(159,211,234,0.18)", display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={() => navigate(backTo)} style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <ArrowLeft style={{ width:15, height:15, color:"#9FD3EA" }} />
          </button>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:18, fontWeight:800, color:"#EAF6FB", letterSpacing:"-0.02em" }}>
              {loading ? "Carregando..." : empresa?.nome}
            </h1>
            <p style={{ fontSize:12, color:"#9FD3EA", marginTop:1, display:"flex", alignItems:"center", gap:4 }}>
              <span>Clientes</span>
              <ChevronRight style={{ width:11, height:11 }} />
              <span>{loading ? "..." : empresa?.nome}</span>
            </p>
          </div>

          {!loading && contatos.length > 0 && (
            <div style={{ display:"flex", gap:6 }}>
              <SendButton color="#9FD3EA" bg="rgba(41,128,185,0.08)" border="rgba(41,128,185,0.3)"  icon={Mail}          label="E-mail"   onClick={() => setSendChannel("email")} />
              <SendButton color="#83DDA8" bg="rgba(39,174,96,0.08)"  border="rgba(39,174,96,0.3)"   icon={MessageCircle} label="WhatsApp" onClick={() => setSendChannel("whatsapp")} />
              <SendButton color="#F2C879" bg="rgba(230,126,34,0.08)" border="rgba(230,126,34,0.3)"  icon={Phone}         label="Ligar"    onClick={() => setSendChannel("telefone")} />
            </div>
          )}

          {!loading && empresa && (
            <EmpresaNotificationBell
              empresaId={empresa.empresa_id}
              empresaNome={empresa.nome}
              onVerComunicacoes={() => navigate(`/clientes/${id}?tab=timeline`)}
            />
          )}

          <button onClick={() => navigate(`/clientes/${id}/editar`)} style={{ height:38, padding:"0 16px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize:"200% 200%", animation:"gradientShift 4s ease infinite", color:"#EAF6FB", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:6, boxShadow:"0 4px 14px rgba(159,211,234,0.30)" }}>
            <Edit3 style={{ width:14, height:14 }} /> Editar
          </button>
        </div>

        <div style={{ padding:"24px 28px 40px", display:"flex", flexDirection:"column", gap:18 }}>
          {loading ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
              {[1,2,3,4].map(i => (
                <div key={i} className="glass-card" style={{ padding:24 }}>
                  <div className="skeleton" style={{ height:20, width:"40%", marginBottom:16 }} />
                  {[1,2,3].map(j => (
                    <div key={j} className="skeleton" style={{ height:16, width:`${50+j*15}%`, marginBottom:10 }} />
                  ))}
                </div>
              ))}
            </div>
          ) : empresa ? (
            <>
              {/* Header card */}
              <motion.div className="glass-card" style={{ padding:"24px 28px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }}>
                <div style={{ display:"flex", alignItems:"center", gap:18 }}>
                  <div style={{ width:64, height:64, borderRadius:16, background:empresa.logo_url?"#0F2E4B":avatarColor(empresa.nome), border:empresa.logo_url?"1px solid rgba(126,176,219,0.22)":undefined, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:800, color:"#FFFFFF", flexShrink:0 }}>
                    {empresa.logo_url
                      ? <img src={empresa.logo_url} alt={`Logo de ${empresa.nome}`} style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
                      : initials(empresa.nome)}
                  </div>
                  <div style={{ flex:1 }}>
                    <h2 style={{ fontSize:22, fontWeight:800, color:"#EAF6FB", letterSpacing:"-0.02em" }}>{empresa.nome}</h2>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6, flexWrap:"wrap" }}>
                      <span className="chip" style={{ background:sc.bg, color:sc.text, border:`1px solid ${sc.border}` }}>{empresa.status}</span>
                      {empresa.porte && (
                        <span className="chip" style={{ background:"rgba(142,68,173,0.16)", color:"#C9B6E4" }}>{empresa.porte}</span>
                      )}
                      {/* Temperatura interativa. Os emojis saíram: renderizavam
                          em tamanhos diferentes por sistema e desalinhavam a
                          linha. A cor sólida do estado ativo já diz qual é. */}
                      {[
                        { key:"Quente", solido:"#E06B5E", bg:"rgba(224,107,94,0.14)" },
                        { key:"Morno",  solido:"#E0A040", bg:"rgba(224,160,64,0.14)" },
                        { key:"Frio",   solido:"#56A4F5", bg:"rgba(86,164,245,0.14)" },
                      ].map(t => {
                        const on = empresa.temperatura === t.key;
                        return (
                          <button key={t.key} onClick={() => updateTemperatura(t.key)}
                            aria-pressed={on}
                            style={{
                              display:"inline-flex", alignItems:"center", gap:6, padding:"5px 13px",
                              borderRadius:20, fontSize:11, fontWeight:on?800:600, cursor:"pointer",
                              border:`1.5px solid ${on ? t.solido : "rgba(159,211,234,0.18)"}`,
                              background:on ? t.solido : "rgba(159,211,234,0.08)",
                              color:on ? "#FFFFFF" : "#9FD3EA",
                              boxShadow:on ? `0 0 0 3px ${t.bg}` : "none",
                              transition:"all 0.15s",
                            }}>
                            {/* ponto de cor: dá o código visual que o emoji dava,
                                sem depender da fonte de emoji do sistema */}
                            <span style={{ width:7, height:7, borderRadius:"50%", flexShrink:0, background:on ? "#FFFFFF" : t.solido }} />
                            {t.key}
                          </button>
                        );
                      })}
                      <span style={{ fontSize:12, color:"#9FD3EA", display:"flex", alignItems:"center", gap:4 }}>
                        <MapPin style={{ width:12, height:12 }} />
                        {empresa.cidade}{empresa.estado ? `, ${empresa.estado}` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Identificação — CNPJ, site e contato principal */}
                <div style={{ marginTop:18, paddingTop:16, borderTop:"1px solid rgba(159,211,234,0.18)", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:"8px 22px" }}>
                  {[
                    { icon: Hash,  label:"CNPJ",    value: empresa.cnpj },
                    { icon: Globe, label:"Site",    value: empresa.site, href: empresa.site ? (empresa.site.startsWith("http") ? empresa.site : `https://${empresa.site}`) : undefined },
                    { icon: User,  label:"Contato", value: contatoPrincipal ? `${contatoPrincipal.nome}${contatoPrincipal.funcao || contatoPrincipal.cargo ? ` — ${contatoPrincipal.funcao || contatoPrincipal.cargo}` : ""}` : undefined },
                    { icon: Mail,  label:"E-mail",  value: contatoPrincipal?.email || empresa.contato_email || undefined },
                    { icon: Phone, label:"Telefone", value: contatoPrincipal?.celular || contatoPrincipal?.telefone || empresa.contato_celular || undefined },
                  ].map(({ icon: Icon, label, value, href }: any) => (
                    <div key={label} style={{ display:"flex", alignItems:"center", gap:7, minWidth:0 }}>
                      <Icon style={{ width:13, height:13, color:"#9FD3EA", flexShrink:0 }} />
                      <span style={{ fontSize:11, color:"#9FD3EA", fontWeight:600, flexShrink:0 }}>{label}</span>
                      {href && value ? (
                        <a href={href} target="_blank" rel="noreferrer" style={{ fontSize:12, color:"#9FD3EA", fontWeight:600, textDecoration:"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value}</a>
                      ) : (
                        <span style={{ fontSize:12, color:value ? "#EAF6FB" : "#9FD3EA", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value || "—"}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Faixa de indicadores — o resumo de carteira do painel de
                    vendas, com o recorte de um cliente só. */}
                <div style={{ marginTop:16, display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12 }}>
                  {kpis.map(k => (
                    <div key={k.lab} title={k.title} style={{ background:"rgba(18,59,94,0.55)", border:"1px solid rgba(159,211,234,0.18)", borderRadius:12, padding:14, display:"flex", gap:12, alignItems:"flex-start" }}>
                      <div style={{ width:36, height:36, borderRadius:10, display:"grid", placeItems:"center", flexShrink:0, background:`${k.cor}1f` }}>
                        <k.icon style={{ width:18, height:18, color:k.cor }} />
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:10, letterSpacing:"0.07em", textTransform:"uppercase", color:"#9FD3EA", fontWeight:800, marginBottom:3 }}>{k.lab}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          <span style={{ fontSize:18, fontWeight:900, color:"#EAF6FB", letterSpacing:"-0.02em", fontVariantNumeric:"tabular-nums" }}>{k.val}</span>
                          {k.badge !== null && (
                            <span title="Últimos 6 meses contra os 6 anteriores"
                              style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:20, fontSize:10, fontWeight:800,
                                background:k.badge >= 0 ? "rgba(44,205,147,0.14)" : "rgba(248,113,113,0.14)",
                                color:k.badge >= 0 ? "#2CCD93" : "#F87171" }}>
                              <TrendingUp style={{ width:10, height:10, transform:k.badge >= 0 ? "none" : "scaleY(-1)" }} />
                              {k.badge >= 0 ? "+" : ""}{Math.round(k.badge)}%
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:11, color:"#9FD3EA", marginTop:2 }}>{k.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Abas */}
              <div style={{ display:"flex", gap:4, overflowX:"auto", borderBottom:"1px solid rgba(159,211,234,0.18)" }}>
                {TABS.map(t => {
                  const on = tab === t.key;
                  const badge = t.key === "orcamentos" && orcamentos.length ? orcamentos.length
                              : t.key === "contatos"   && contatos.length   ? contatos.length
                              : t.key === "timeline"   && atividades.length ? atividades.length
                              : null;
                  return (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 14px", fontSize:13, fontWeight: on ? 700 : 600, color:on ? "#9FD3EA" : "#9FD3EA", background:"none", border:"none", borderBottom:`2px solid ${on ? "rgba(159,211,234,0.30)" : "transparent"}`, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'Plus Jakarta Sans',sans-serif", transition:"color 0.15s" }}>
                      <t.icon style={{ width:14, height:14 }} />
                      {t.label}
                      {badge !== null && (
                        <span style={{ fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:20, background:on ? "rgba(46,111,149,0.12)" : "rgba(149,165,166,0.15)", color: on ? "#2E6F95" : "rgba(10,37,64,0.92)" }}>{badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {tab === "resumo" && (
              <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

                <Colunas rail={<>
                  <Caixa titulo="Taxa de conversão">
                    <DonutConversao pct={conversao ?? 0} />
                    <div style={{ textAlign:"center", marginTop:10 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:"#EAF6FB", fontVariantNumeric:"tabular-nums" }}>
                        {aprovados.length} aprovado{aprovados.length === 1 ? "" : "s"}
                      </div>
                      <div style={{ fontSize:11, color:"#9FD3EA" }}>
                        {decididos ? `de ${decididos} decidido${decididos === 1 ? "" : "s"}` : "nenhum decidido ainda"}
                      </div>
                    </div>
                  </Caixa>
                  <Caixa titulo="Informações rápidas">
                    <Facts itens={[
                      { rot:"Cliente desde",    val: formatDate(empresa.criado_em || null) },
                      { rot:"Total aprovado",   val: valorAprovado ? brl(valorAprovado, 0) : "—" },
                      { rot:"Orçamentos",       val: orcamentos.length || "—" },
                      { rot:"Vendas fechadas",  val: aprovados.length || "—", cor:"#83DDA8" },
                      { rot:"Responsável",      val: empresa.responsavel_principal || "—" },
                      { rot:"Próximo contato",  val: formatDate(empresa.data_proxima_acao || null) },
                    ]} />
                  </Caixa>
                </>}>
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    {/* Próximas ações — sai da agenda, que é onde as datas
                        futuras desta empresa realmente moram. */}
                    <section style={{ ...CARD, overflow:"hidden" }}>
                      <Cabecalho titulo="Próximas ações" sub="Compromissos agendados com esta empresa">
                        <button onClick={() => navigate("/calendario")}
                          style={{ display:"flex", alignItems:"center", gap:5, height:30, padding:"0 12px", borderRadius:8, border:"1px solid rgba(159,211,234,0.30)", background:"rgba(46,111,149,0.06)", color:"#9FD3EA", fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                          Abrir calendário <ChevronRight style={{ width:12, height:12 }} />
                        </button>
                      </Cabecalho>
                      {proximasAcoes.length === 0 ? (
                        <Vazio icon={Calendar} titulo="Nada agendado daqui para a frente"
                          dica={empresa.proxima_acao ? `Próxima ação combinada: ${empresa.proxima_acao}` : "Agende pelo calendário e o compromisso aparece aqui."} />
                      ) : (
                        <div style={{ padding:"12px 18px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                          {proximasAcoes.map(({ a, d }: any) => (
                            <div key={a.evento_id || a.id} style={{ display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:10, background:"rgba(18,59,94,0.55)", border:"1px solid rgba(159,211,234,0.18)" }}>
                              <div style={{ width:30, height:30, borderRadius:9, display:"grid", placeItems:"center", flexShrink:0, background:"rgba(142,68,173,0.16)" }}>
                                <Calendar style={{ width:15, height:15, color:"#C9B6E4" }} />
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:12.5, fontWeight:700, color:"#EAF6FB", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                  {a.titulo || a.nome || "Compromisso"}
                                </div>
                                <div style={{ fontSize:11, color:"#9FD3EA", marginTop:1, fontVariantNumeric:"tabular-nums" }}>
                                  {d.toLocaleDateString("pt-BR")} · {d.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}
                                </div>
                              </div>
                              <span style={{ fontSize:11, color:"#9FD3EA", flexShrink:0 }}>
                                {(() => { const faltam = Math.round((d.getTime() - Date.now()) / 86_400_000);
                                  return faltam <= 0 ? "hoje" : faltam === 1 ? "amanhã" : `em ${faltam} dias`; })()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                </Colunas>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:18, alignItems:"start" }}>
                {/* Informações */}
                <motion.div className="glass-card" style={{ padding:"22px 24px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.07 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB", marginBottom:16, display:"flex", alignItems:"center", gap:7 }}>
                    <Building2 style={{ width:15, height:15, color:"#9FD3EA" }} /> Informações da Empresa
                  </div>
                  {[
                    { icon: Tag,         label:"Segmento",       value:empresa.segmento },
                    { icon: Building2,   label:"Porte",          value:empresa.porte },
                    { icon: MapPin,      label:"Cidade",         value:`${empresa.cidade}${empresa.estado ? ` / ${empresa.estado}` : ""}` },
                    { icon: TrendingUp,  label:"Origem do lead", value:empresa.origem_lead },
                    { icon: DollarSign,  label:"Ticket médio",   value:ticketMedio
                        ? `R$ ${ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`
                        : "Sem orçamento aprovado" },
                    { icon: Thermometer, label:"Temperatura",    value:empresa.temperatura },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="info-row">
                      <Icon style={{ width:14, height:14, color:"#9FD3EA", flexShrink:0 }} />
                      <span style={{ fontSize:12, color:"#9FD3EA", fontWeight:600, minWidth:110 }}>{label}</span>
                      <span style={{ fontSize:12, color:"#EAF6FB", fontWeight:600 }}>{value || "—"}</span>
                    </div>
                  ))}
                </motion.div>

                {/* Relacionamento */}
                <motion.div className="glass-card" style={{ padding:"22px 24px" }} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.12 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#EAF6FB", marginBottom:16, display:"flex", alignItems:"center", gap:7 }}>
                    <ClipboardList style={{ width:15, height:15, color:"#9FD3EA" }} /> Relacionamento
                  </div>
                  {[
                    { icon: User,         label:"Responsável",      value:empresa.responsavel_principal },
                    { icon: Clock,        label:"Última interação", value:formatDate(empresa.ultima_interacao) },
                    { icon: ChevronRight, label:"Próxima ação",     value:empresa.proxima_acao },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="info-row">
                      <Icon style={{ width:14, height:14, color:"#9FD3EA", flexShrink:0 }} />
                      <span style={{ fontSize:12, color:"#9FD3EA", fontWeight:600, minWidth:130 }}>{label}</span>
                      <span style={{ fontSize:12, color:"#EAF6FB", fontWeight:600 }}>{value || "—"}</span>
                    </div>
                  ))}
                </motion.div>

                </div>
              </div>
              )}

              {tab === "observacoes" && empresa && (
                <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
                  <PainelObservacoes
                    empresaId={empresa.empresa_id}
                    textoCadastro={empresa.observacoes}
                    onEditarCadastro={() => navigate(`/clientes/${id}/editar`)}
                  />
                </motion.div>
              )}

              {/* Vendas — orçamentos aprovados */}
              {tab === "vendas" && (
                <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
                  <PainelVendas orcamentos={orcamentos} />
                </motion.div>
              )}

              {/* Produtos comprados */}
              {tab === "produtos" && empresa && (
                <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
                  <PainelProdutos empresaId={empresa.empresa_id} />
                </motion.div>
              )}

              {/* Orçamentos */}
              {tab === "orcamentos" && (
                <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}
                  style={{ display:"flex", flexDirection:"column", gap:16 }}>

                  <FunilOrcamentos orcamentos={orcamentos} />

                  <Colunas rail={<>
                    <Caixa titulo="Em aberto">
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:10.5, letterSpacing:"0.07em", textTransform:"uppercase", color:"#9FD3EA", fontWeight:800 }}>Valor em negociação</div>
                        <div style={{ fontSize:19, fontWeight:900, color:"#EAF6FB", letterSpacing:"-0.02em", fontVariantNumeric:"tabular-nums", marginTop:3 }}>
                          {valorEmAberto ? brl(valorEmAberto, 0) : "—"}
                        </div>
                        <div style={{ fontSize:11.5, color:"#9FD3EA", marginTop:2 }}>
                          {emAberto.length} orçamento{emAberto.length === 1 ? "" : "s"} ativo{emAberto.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      <Facts itens={[
                        { rot:"Enviados",       val: orcamentos.filter(o => o.status === "enviado").length },
                        { rot:"Em negociação",  val: orcamentos.filter(o => o.status === "em_negociacao").length },
                        { rot:"Rascunhos",      val: orcamentos.filter(o => o.status === "rascunho").length },
                      ]} />
                    </Caixa>
                    <Caixa titulo="Status dos orçamentos">
                      <Rank vazio="Nenhum orçamento para esta empresa."
                        itens={STATUS_ORDEM
                          .map(st => ({ st, qtd: orcamentos.filter(o => o.status === st).length }))
                          .filter(x => x.qtd > 0)
                          .map(x => ({
                            rot: STATUS_ORCAMENTO[x.st].label, val: x.qtd, peso: x.qtd,
                            cor: STATUS_ORCAMENTO[x.st].color,
                          }))} />
                    </Caixa>
                  </>}>
                    <section style={{ ...CARD, overflow:"hidden" }}>
                      <Cabecalho titulo={`Orçamentos (${orcamentos.length})`} sub="Cadastro, envio e acompanhamento">
                        <button onClick={() => navigate("/gerenciamento?tab=vendas")}
                          style={{ height:30, padding:"0 12px", borderRadius:8, border:"1px solid rgba(159,211,234,0.30)", background:"rgba(46,111,149,0.06)", color:"#9FD3EA", fontSize:11.5, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                          Gerenciar vendas <ChevronRight style={{ width:12, height:12 }} />
                        </button>
                      </Cabecalho>

                      {orcamentosErro ? (
                        <Vazio icon={DollarSign} titulo="Não foi possível carregar os orçamentos." />
                      ) : orcamentos.length === 0 ? (
                        <Vazio icon={DollarSign} titulo="Nenhum orçamento para esta empresa"
                          dica="Crie o primeiro em Gerenciamento → Vendas" />
                      ) : (
                        <>
                          {/* Filtro por status. Só aparece quando há mais de um
                              status nesta carteira — chip zerado é ruído. */}
                          {statusPresentes.length > 1 && (
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center", padding:"12px 18px", borderBottom:"1px solid rgba(159,211,234,0.18)" }}>
                              <Filter style={{ width:13, height:13, color:"#9FD3EA", marginRight:2 }} />
                              {["todos", ...statusPresentes].map(st => {
                                const info = STATUS_ORCAMENTO[st];
                                const on = filtroStatus === st;
                                const qtd = st === "todos" ? orcamentos.length : orcamentos.filter(o => o.status === st).length;
                                return (
                                  <button key={st} onClick={() => setFiltroStatus(st)}
                                    style={{
                                      padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer",
                                      fontFamily:"'Plus Jakarta Sans',sans-serif",
                                      border:`1.5px solid ${on ? (info ? info.color : "rgba(159,211,234,0.45)") : "rgba(159,211,234,0.18)"}`,
                                      background:on ? (info ? info.bg : "rgba(159,211,234,0.12)") : "rgba(18,59,94,0.55)",
                                      color:on ? (info ? info.color : "#EAF6FB") : "#9FD3EA",
                                    }}>
                                    {info ? info.label : "Todos"} ({qtd})
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {orcamentosVisiveis.length === 0 ? (
                            <Vazio icon={DollarSign} titulo="Nenhum orçamento com esse status." />
                          ) : (
                            <div style={{ overflowX:"auto" }}>
                              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                                <thead><tr>
                                  <Th>#</Th><Th>Nº</Th><Th>Título / item</Th><Th r>Itens</Th>
                                  <Th>Responsável</Th><Th>Enviado em</Th><Th>Status</Th><Th r>Valor</Th>
                                </tr></thead>
                                <tbody>
                                  {orcamentosVisiveis.map((o, i) => (
                                    <tr key={o.orcamento_id}>
                                      <td style={{ ...TD_NUM, color:"#9FD3EA", width:26 }}>{i + 1}</td>
                                      <td style={TD_NUM} title="Número do orçamento">
                                        {numeroOrcamento({ orcamento_id:o.orcamento_id, criado_em:o.criado_em })}
                                      </td>
                                      <td style={{ ...TD, fontWeight:600 }}>
                                        {o.titulo || "Sem título"}
                                        {o.item_principal && (
                                          <span style={{ display:"block", fontSize:10.5, color:"#9FD3EA", fontWeight:500, marginTop:1 }}>
                                            {o.item_principal}{(o.qtd_itens || 0) > 1 ? ` +${(o.qtd_itens || 1) - 1}` : ""}
                                          </span>
                                        )}
                                        {o.motivo_recusa && (
                                          <span style={{ display:"block", fontSize:10.5, color:"#F7B8B1", fontWeight:600, marginTop:1 }}>
                                            Recusa: {o.motivo_recusa}
                                          </span>
                                        )}
                                      </td>
                                      <td style={{ ...TD_NUM, textAlign:"right" }}
                                        title={o.qtd_pecas != null ? `${o.qtd_pecas} peça(s) em ${o.qtd_itens} linha(s)` : undefined}>
                                        {o.qtd_itens ?? "—"}
                                      </td>
                                      <td style={{ ...TD, color:o.vendedor_nome ? "#EAF6FB" : "#9FD3EA", whiteSpace:"nowrap" }}>{o.vendedor_nome || "—"}</td>
                                      <td style={TD_NUM} title={o.criado_em ? `Criado em ${formatDate(o.criado_em)}` : undefined}>
                                        {formatDate(o.data_envio || null)}
                                      </td>
                                      <td style={TD}><Chip status={o.status} /></td>
                                      <td style={{ ...TD_NUM, textAlign:"right", fontWeight:700 }}>{brl(o.total, 0)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          <div style={{ padding:"12px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap", fontSize:12, color:"#9FD3EA", borderTop:"1px solid rgba(159,211,234,0.18)" }}>
                            <span>Mostrando {orcamentosVisiveis.length} de {orcamentos.length} orçamento{orcamentos.length === 1 ? "" : "s"}</span>
                            <span style={{ fontWeight:800, color:"#EAF6FB", fontVariantNumeric:"tabular-nums" }}>{brl(totalVisivel, 0)}</span>
                          </div>
                        </>
                      )}
                    </section>
                  </Colunas>
                </motion.div>
              )}

              {/* Contatos — um cartão por pessoa, tudo à vista. O sanfonado
                  economizava altura escondendo justamente o telefone e o e-mail,
                  que é o que se vem buscar aqui. */}
              {tab === "contatos" && (
                <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
                  <section style={{ ...CARD, overflow:"hidden" }}>
                    <Cabecalho titulo={`Contatos (${contatos.length})`} sub="Pessoas cadastradas nesta conta">
                      <SendButton color="#9FD3EA" bg="rgba(41,128,185,0.08)" border="rgba(41,128,185,0.25)" icon={Mail}          label="E-mail"   onClick={() => setSendChannel("email")} />
                      <SendButton color="#83DDA8" bg="rgba(39,174,96,0.08)"  border="rgba(39,174,96,0.25)"  icon={MessageCircle} label="WhatsApp" onClick={() => setSendChannel("whatsapp")} />
                      <SendButton color="#F2C879" bg="rgba(230,126,34,0.08)" border="rgba(230,126,34,0.25)" icon={Phone}         label="Ligar"    onClick={() => setSendChannel("telefone")} />
                    </Cabecalho>

                    {contatos.length === 0 ? (
                      <Vazio icon={Users} titulo="Nenhum contato cadastrado"
                        dica="Sem uma pessoa com nome e telefone, a conta não tem por onde ser trabalhada." />
                    ) : (
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(268px,1fr))", gap:12, padding:16 }}>
                        {contatos.map((c, i) => {
                          const cor = ["#9FD3EA","#83DDA8","#F2C879","#C9B6E4","#F7B8B1"][i % 5];
                          const telefone = c.celular || c.telefone;
                          const zap = c.whatsapp || c.celular;
                          return (
                            <div key={c.contato_id} style={{ background:"rgba(18,59,94,0.55)", border:"1px solid rgba(159,211,234,0.18)", borderRadius:12, padding:14 }}>
                              <div style={{ display:"flex", gap:11, alignItems:"center", marginBottom:11 }}>
                                <div style={{ width:40, height:40, borderRadius:"50%", background:cor, display:"grid", placeItems:"center", fontSize:13, fontWeight:800, color:"#0F2E4B", flexShrink:0 }}>
                                  {initials(c.nome)}
                                </div>
                                <div style={{ minWidth:0 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                                    <span style={{ fontSize:13.5, fontWeight:700, color:"#EAF6FB" }}>{c.nome}</span>
                                    {c.decisor && <span className="chip" style={{ background:"rgba(39,174,96,0.16)", color:"#83DDA8" }}>Decisor</span>}
                                  </div>
                                  <div style={{ fontSize:11.5, color:"#9FD3EA", marginTop:1 }}>{c.funcao || c.cargo || "—"}</div>
                                </div>
                              </div>

                              {[
                                { icon: Mail,          val: c.email },
                                { icon: Phone,         val: telefone },
                                { icon: MessageCircle, val: c.whatsapp },
                                { icon: Link2,         val: c.linkedin },
                              ].filter(l => l.val).map(({ icon: Icon, val }) => (
                                <div key={val as string} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:"#EAF6FB", padding:"3px 0", minWidth:0 }}>
                                  <Icon style={{ width:14, height:14, color:"#9FD3EA", flexShrink:0 }} />
                                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{val}</span>
                                </div>
                              ))}

                              <div style={{ marginTop:11, paddingTop:10, borderTop:"1px solid rgba(159,211,234,0.18)", display:"flex", gap:5 }}>
                                {c.email && (
                                  <button onClick={() => openContactEmail(c.email!)}
                                    style={{ flex:1, height:28, borderRadius:7, border:"1px solid rgba(159,211,234,0.30)", background:"rgba(46,111,149,0.08)", color:"#9FD3EA", fontSize:10.5, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4, fontFamily:"inherit" }}>
                                    <Mail style={{ width:10, height:10 }} /> E-mail
                                  </button>
                                )}
                                {zap && (
                                  <button onClick={() => openWhatsApp(zap)}
                                    style={{ flex:1, height:28, borderRadius:7, border:"1px solid rgba(39,174,96,0.25)", background:"rgba(39,174,96,0.08)", color:"#83DDA8", fontSize:10.5, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4, fontFamily:"inherit" }}>
                                    <MessageCircle style={{ width:10, height:10 }} /> WhatsApp
                                  </button>
                                )}
                                {telefone && (
                                  <button onClick={() => window.open(`tel:${telefone}`, "_self")}
                                    style={{ flex:1, height:28, borderRadius:7, border:"1px solid rgba(230,126,34,0.25)", background:"rgba(230,126,34,0.08)", color:"#F2C879", fontSize:10.5, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4, fontFamily:"inherit" }}>
                                    <Phone style={{ width:10, height:10 }} /> Ligar
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </motion.div>
              )}

              {/* Empresas próximas desta empresa — parte da coordenada dela,
                  sem obrigar o usuário a voltar para a busca e redigitar cidade */}
              {tab === "proximas" && (
                <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.1 }}>
                  <EmpresasProximasDaEmpresa
                    empresaId={empresa.empresa_id}
                    nome={empresa.nome}
                    latitude={empresa.latitude}
                    longitude={empresa.longitude}
                    cidade={empresa.cidade}
                    segmento={empresa.segmento}
                  />
                </motion.div>
              )}

              {/* Timeline montada dos orçamentos e da agenda */}
              {tab === "timeline" && (
                <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
                  <PainelTimeline orcamentos={orcamentos} atividades={atividades} />
                </motion.div>
              )}
            </>
          ) : (
            <div style={{ textAlign:"center", padding:48 }}>
              <Building2 style={{ width:40, height:40, color:"#9FD3EA", margin:"0 auto 12px" }} />
              <p style={{ fontSize:14, fontWeight:600, color:"#9FD3EA" }}>Empresa não encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}