import { getToken } from "../../services/auth";
import CardUsuario, { useUsuarioLogado } from "../../components/CardUsuario";
import AbasGerenciamento, { cssAbasGerenciamento } from "../../components/AbasGerenciamento";
import FundoAzul from "../../components/FundoAzul";
  import { useState, useEffect, useRef } from "react";
    import { useNavigate } from "react-router-dom";
    import { motion, AnimatePresence } from "framer-motion";
    import {
    Users, Building2, MessageCircle, Send, Handshake,
    LayoutDashboard, TrendingUp, Search, Bell, Calendar, Plus,
    ClipboardList, BarChart3, RefreshCw,
    Mail, ArrowRight,
    X, CalendarCheck, Repeat, FileText, Edit3,
    Trash2, CheckCheck, AlertTriangle, Info,
    CheckCircle2, Menu, UserRoundCog
  } from "lucide-react";
  import VendasInsights, { cssVendasInsights } from "../../components/VendasInsights";
  import { brlCompacto } from "../../utils/moeda";
  import useIsMobile from "../../hooks/useIsMobile";
  import useValoresOrcamento from "../../hooks/useValoresOrcamento";
  import useEmpresasAoVivo, { notificarEmpresas } from "../../hooks/useEmpresasAoVivo";

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
      @keyframes pulseDraft { 0%,100%{opacity:1} 50%{opacity:0.55} }
      @keyframes bellShake { 0%,100%{transform:rotate(0)}20%{transform:rotate(-12deg)}40%{transform:rotate(12deg)}60%{transform:rotate(-8deg)}80%{transform:rotate(8deg)} }
      .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:#FFFFFF; transition:all 0.18s; user-select:none; }
      .nav-item:hover { background:rgba(126,176,219,0.08); color:#fff; }
      .nav-item.active { background:rgba(126,176,219,0.08); color:#fff; font-weight:600; }
      .glass-card { background:#143354; border:1px solid rgba(126,176,219,0.16); border-radius:16px; }
      .metric-card { background:#143354; border:1.5px solid rgba(126,176,219,0.16); border-radius:16px; padding:16px 14px; transition:all 0.2s; cursor:pointer; user-select:none; }
      .metric-card:hover { transform:translateY(-2px); box-shadow:0 10px 30px rgba(3,14,26,0.45); }
      .preview-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr; column-gap:14px; align-items:center; padding:11px 18px; border-bottom:1px solid rgba(126,176,219,0.16); cursor:pointer; transition:background 0.13s; }
      .preview-row:hover { background:rgba(126,176,219,0.07); }
      .preview-row.draft-row { background:rgba(167,139,250,0.03); border-left:3px solid rgba(167,139,250,0.3); }
      .preview-row.draft-row:hover { background:rgba(167,139,250,0.07); }
      .preview-row:last-child { border-bottom:none; }
      .preview-th { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 1fr; column-gap:14px; align-items:center; padding:8px 18px; border-bottom:1px solid rgba(126,176,219,0.16); }
      .chip { display:inline-flex; align-items:center; gap:3px; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; white-space:nowrap; }
      .preview-row > .chip, .preview-row > button { justify-self:start; }
      .action-item { padding:12px 14px; border-radius:12px; background:#143354; border:1px solid rgba(126,176,219,0.16); cursor:pointer; transition:all 0.18s; }
      .action-item:hover { background:#143354; border-color:rgba(126,176,219,0.30); transform:translateY(-1px); }
      .notif-item { padding:12px 14px; border-bottom:1px solid rgba(126,176,219,0.16); transition:background 0.13s; display:flex; gap:10px; align-items:flex-start; }
      .notif-item:hover { background:rgba(126,176,219,0.06); }
      .notif-item:last-child { border-bottom:none; }
      .skeleton { background:linear-gradient(90deg,rgba(126,176,219,0.08) 25%,rgba(126,176,219,0.24) 50%,rgba(126,176,219,0.08) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
      ::-webkit-scrollbar { width:4px; height:4px; }
      ::-webkit-scrollbar-track { background:transparent; }
      ::-webkit-scrollbar-thumb { background:rgba(86,164,245,0.25); border-radius:4px; }
    `;

    const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

    interface Empresa {
      empresa_id: string; nome: string; segmento: string; porte: string;
      cidade: string; status: string; temperatura: string;
      responsavel_principal: string;
      origem_lead: string; ultima_interacao: string | null; proxima_acao: string;
      criado_em: string | null; status_atualizado_em: string | null;
      data_proxima_acao: string | null; vendedor_id: string | null;
    }
    interface Usuario { nome: string; email: string; cargo: string; empresa_nome: string; is_gerente?: boolean; }
    interface Notificacao {
      notificacao_id: string; tipo: string; titulo: string; mensagem: string;
      empresa_id: string | null; empresa_nome: string | null;
      lida: boolean; criado_em: string;
    }

    const navItems = [
      { icon: LayoutDashboard, label: "Dashboards",                active: true  },
      { icon: TrendingUp,      label: "Insights",                  active: false },
      { icon: Search,          label: "Buscar Empresas",           active: false },
      { icon: Building2,       label: "Cadastrar Empresas",        active: false },
      { icon: Users,           label: "Todos os clientes",         active: false },
      { icon: ClipboardList,   label: "Gerenciamento", active: false },
      { icon: Calendar,        label: "Calendário",                active: false },
    ];

    function avatarColor(n: string) {
      const c=["#B6CFE4","#2CCD93","#A78BFA","#F0A05A","#2CCD93","#F87171"];
      return c[(n?.charCodeAt(0)||0)%c.length];
    }
    function initials(n: string) { return n?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?"; }

    function statusColor(s: string) {
      if(s==="Rascunho")        return { bg:"rgba(167,139,250,0.12)",  text:"#A78BFA",  border:"rgba(167,139,250,0.3)"  };
      if(s==="Fechado")         return { bg:"rgba(44,205,147,0.12)",   text:"#2CCD93",  border:"rgba(44,205,147,0.3)"   };
      if(s==="Negociação")      return { bg:"rgba(240,160,90,0.12)",   text:"#F0A05A",  border:"rgba(240,160,90,0.3)"   };
      if(s==="Proposta")        return { bg:"rgba(167,139,250,0.12)",  text:"#A78BFA",  border:"rgba(167,139,250,0.3)"  };
      if(s==="Visita agendada") return { bg:"rgba(44,205,147,0.12)",  text:"#2CCD93",  border:"rgba(44,205,147,0.3)"  };
      if(s==="Em contato")      return { bg:"rgba(86,164,245,0.12)",  text:"#56A4F5",  border:"rgba(126,176,219,0.30)"  };
      return                           { bg:"rgba(126,176,219,0.12)", text:"#B6CFE4",  border:"rgba(126,176,219,0.30)" };
    }
    function tempColor(t: string) { if(t==="Quente")return"#F87171"; if(t==="Morno")return"#F0A05A"; return"#B6CFE4"; }

    function Sparkline({ color }: { color:string }) {
      return (
        <svg width="48" height="16" viewBox="0 0 48 16" fill="none">
          <polyline points="0,12 8,9 16,11 24,6 32,8 40,3 48,2" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
        </svg>
      );
    }

    function notifIcon(tipo: string) {
      if(tipo==="rascunho_aviso")    return <AlertTriangle style={{width:14,height:14,color:"#F0A05A"}}/>;
      if(tipo==="rascunho_excluido") return <Trash2 style={{width:14,height:14,color:"#F87171"}}/>;
      if(tipo==="email_interaction") return <Mail style={{width:14,height:14,color:"#B6CFE4"}}/>;
      if(tipo==="calendar_accepted") return <CheckCircle2 style={{width:14,height:14,color:"#2CCD93"}}/>;
      if(tipo==="calendar_declined") return <X style={{width:14,height:14,color:"#F87171"}}/>;
      if(tipo==="calendar_tentative")return <AlertTriangle style={{width:14,height:14,color:"#F0A05A"}}/>;
      return <Info style={{width:14,height:14,color:"#B6CFE4"}}/>;
    }
    function notifColor(tipo: string) {
      if(tipo==="rascunho_aviso")    return { bg:"rgba(240,160,90,0.08)",  border:"rgba(240,160,90,0.2)",  dot:"#F0A05A" };
      if(tipo==="rascunho_excluido") return { bg:"rgba(248,113,113,0.08)",   border:"rgba(248,113,113,0.2)",   dot:"#F87171" };
      if(tipo==="email_interaction") return { bg:"rgba(86,164,245,0.08)",  border:"rgba(126,176,219,0.30)",  dot:"rgba(126,176,219,0.30)" };
      if(tipo==="calendar_accepted") return { bg:"rgba(44,205,147,0.08)",   border:"rgba(44,205,147,0.2)",   dot:"#2CCD93" };
      if(tipo==="calendar_declined") return { bg:"rgba(248,113,113,0.08)",   border:"rgba(248,113,113,0.2)",   dot:"#F87171" };
      if(tipo==="calendar_tentative")return { bg:"rgba(240,160,90,0.08)",  border:"rgba(240,160,90,0.2)",  dot:"#F0A05A" };
      return { bg:"rgba(86,164,245,0.08)", border:"rgba(126,176,219,0.30)", dot:"rgba(126,176,219,0.30)" };
    }
    function timeAgo(dateStr: string) {
      const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
      if(diff < 60) return "agora";
      if(diff < 3600) return `${Math.floor(diff/60)}min atrás`;
      if(diff < 86400) return `${Math.floor(diff/3600)}h atrás`;
      return `${Math.floor(diff/86400)}d atrás`;
    }

    type FilterKey = "total"|"rascunho"|"lead"|"em_contato"|"visita"|"proposta"|"negociacao"|"fechado"|"quente";

    export default function Dashboard() {
      const navigate = useNavigate();
  // Insights e tela de gestao: fica fora do menu de quem nao e gerente.
  const ehGerenteMenu = !!useUsuarioLogado()?.is_gerente;
      const [empresas, setEmpresas] = useState<Empresa[]>([]);
      // Lista viva: o dashboard acompanha o funil sem precisar de F5.
      const empresasVivas = useEmpresasAoVivo<Empresa>(setEmpresas);
      const loading = empresasVivas.carregando;
      const isMobile = useIsMobile();
      const [menuOpen, setMenuOpen] = useState(false);
      const [activeFilter, setActiveFilter] = useState<FilterKey>("total");
      // Dashboard dividido nas mesmas duas visões do Gerenciamento.
      const [abaDash, setAbaDash] = useState<"clientes"|"vendas">("clientes");
      // Valor por empresa na tabela de prévia — dos orçamentos, não do cadastro.
      const valores = useValoresOrcamento();
      const [searchValue, setSearchValue] = useState("");
      const [usuario, setUsuario] = useState<Usuario|null>(null);

      // Notificações
      const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
      const [naoLidas, setNaoLidas] = useState(0);
      const [showNotif, setShowNotif] = useState(false);
      const notifRef = useRef<HTMLDivElement>(null);

      useEffect(() => { fetchData(); fetchNotificacoes();
      const interval = setInterval(() => {fetchNotificacoes();}, 5000);
      return () => clearInterval(interval);
      // Carga inicial + polling montados uma vez: fetchData/fetchNotificacoes são
      // recriados a cada render e recriariam o setInterval a cada ciclo.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      useEffect(() => {
        const handler = (e: MouseEvent) => {
          if(notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
      }, []);

      const token = () => getToken() || "";
      const headers = () => ({ Authorization: `Bearer ${token()}` });
      const jsonHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

      // As empresas vem do store ao vivo; o botao de recarregar do topo chama
      // isto, entao aqui fica o pedido explicito de releitura + o /me.
      const fetchData = async () => {
        notificarEmpresas();
        try {
          const meRes = await fetch(`${API}/me`, { headers: headers() });
          if(meRes.ok) setUsuario(await meRes.json());
        } catch {}
      };

      const fetchNotificacoes = async () => {
        try {
          const [notifRes, countRes] = await Promise.all([
            fetch(`${API}/notificacoes`, { headers: headers() }),
            fetch(`${API}/notificacoes/nao-lidas`, { headers: headers() }),
          ]);
          if(notifRes.ok) setNotificacoes(await notifRes.json());
          if(countRes.ok) { const d = await countRes.json(); setNaoLidas(d.total); }
        } catch {}
      };

      const marcarTodasLidas = async () => {
        await fetch(`${API}/notificacoes/ler-todas`, { method: "PUT", headers: jsonHeaders() });
        setNotificacoes(prev => prev.map(n => ({...n, lida:true})));
        setNaoLidas(0);
      };

      const marcarLida = async (id: string) => {
        await fetch(`${API}/notificacoes/${id}/ler`, { method: "PUT", headers: headers() });
        setNotificacoes(prev => prev.map(n => n.notificacao_id===id ? {...n, lida:true} : n));
        setNaoLidas(prev => Math.max(0, prev-1));
      };

      const deletarNotificacao = async (id: string, lida: boolean) => {
        await fetch(`${API}/notificacoes/${id}`, { method: "DELETE", headers: headers() });
        setNotificacoes(prev => prev.filter(n => n.notificacao_id !== id));
        if(!lida) setNaoLidas(prev => Math.max(0, prev-1));
      };

      const rascunhos  = empresas.filter(e=>e.status==="Rascunho");
      const total      = empresas.filter(e=>e.status!=="Rascunho").length;
      const leads      = empresas.filter(e=>e.status==="Lead").length;
      const emContato  = empresas.filter(e=>e.status==="Em contato").length;
      const visitas    = empresas.filter(e=>e.status==="Visita agendada").length;
      const propostas  = empresas.filter(e=>e.status==="Proposta").length;
      const negociacao = empresas.filter(e=>e.status==="Negociação").length;
      const fechados   = empresas.filter(e=>e.status==="Fechado").length;

      const metricCards = [
        { key:"total"      as FilterKey, icon:Building2,     label:"Total",            value:total,            color:"#56A4F5", bg:"rgba(86,164,245,0.12)"   },
        { key:"rascunho"   as FilterKey, icon:FileText,      label:"Rascunhos",        value:rascunhos.length, color:"#A78BFA", bg:"rgba(167,139,250,0.12)"  },
        { key:"lead"       as FilterKey, icon:Users,         label:"Leads",            value:leads,            color:"#56A4F5", bg:"rgba(86,164,245,0.12)" },
        { key:"em_contato" as FilterKey, icon:MessageCircle, label:"Em contato",       value:emContato,        color:"#F0A05A", bg:"rgba(240,160,90,0.12)"  },
        { key:"visita"     as FilterKey, icon:CalendarCheck, label:"Visita agendada",  value:visitas,          color:"#2CCD93", bg:"rgba(44,205,147,0.12)"   },
        { key:"proposta"   as FilterKey, icon:Send,          label:"Propostas",        value:propostas,        color:"#F0A05A", bg:"rgba(240,160,90,0.12)"  },
        { key:"negociacao" as FilterKey, icon:Repeat,        label:"Negociação",       value:negociacao,       color:"#F0A05A", bg:"rgba(240,160,90,0.12)"   },
        { key:"fechado"    as FilterKey, icon:Handshake,     label:"Fechados",         value:fechados,         color:"#2CCD93", bg:"rgba(44,205,147,0.12)"   },
      ];

      const filterMap: Record<FilterKey, Empresa[]> = {
        total:      empresas.filter(e=>e.status!=="Rascunho"),
        rascunho:   rascunhos,
        lead:       empresas.filter(e=>e.status==="Lead"),
        em_contato: empresas.filter(e=>e.status==="Em contato"),
        visita:     empresas.filter(e=>e.status==="Visita agendada"),
        proposta:   empresas.filter(e=>e.status==="Proposta"),
        negociacao: empresas.filter(e=>e.status==="Negociação"),
        fechado:    empresas.filter(e=>e.status==="Fechado"),
        quente:     empresas.filter(e=>e.temperatura==="Quente"&&e.status!=="Rascunho"),
      };

      const filterLabels: Record<FilterKey, string> = {
        total:"Todas as empresas", rascunho:"Rascunhos pendentes", lead:"Leads",
        em_contato:"Em contato", visita:"Visita agendada", proposta:"Propostas enviadas",
        negociacao:"Em negociação", fechado:"Clientes fechados", quente:"Leads quentes",
      };

      const previewList = filterMap[activeFilter];
      const activeCard  = metricCards.find(m=>m.key===activeFilter) || metricCards[0];

      return (
        <div style={{display:"flex",height:"100vh",overflow:"hidden",position:"relative"}}>
          <style>{css + cssAbasGerenciamento + cssVendasInsights}</style>

          {/* Background */}
          <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
            <FundoAzul />
            {[
              {w:420,h:420,top:"-80px",left:"10%",anim:"float1 18s ease-in-out infinite",op:0.1,c1:"#B6CFE4",c2:"#2CCD93"},
              {w:280,h:280,top:"40%",left:"-60px",anim:"float2 22s ease-in-out infinite",op:0.08,c1:"#2CCD93",c2:"#2CCD93"},
              {w:360,h:360,top:"60%",left:"55%",anim:"float3 26s ease-in-out infinite",op:0.07,c1:"#B6CFE4",c2:"#A78BFA"},
              {w:200,h:200,top:"20%",left:"75%",anim:"float4 20s ease-in-out infinite",op:0.09,c1:"#2CCD93",c2:"#2CCD93"},
              {w:300,h:300,top:"75%",left:"20%",anim:"float5 24s ease-in-out infinite",op:0.07,c1:"#F0A05A",c2:"#F0A05A"},
            ].map((c,i)=>(
              <div key={i} style={{position:"absolute",width:c.w,height:c.h,top:c.top,left:c.left,borderRadius:"50%",background:`radial-gradient(circle at 40% 40%,${c.c1},${c.c2})`,opacity:c.op,animation:c.anim,filter:"blur(2px)"}}/>
            ))}
          </div>

          {/* Backdrop mobile */}
          {isMobile && menuOpen && (
            <div onClick={()=>setMenuOpen(false)} style={{position:"fixed",inset:0,background:"rgba(10,31,51,0.45)",zIndex:999}}/>
          )}

          {/* Sidebar */}
          <div style={{width:220,flexShrink:0,height:"100vh",overflowY:"auto",zIndex:1000,background:"linear-gradient(180deg,#10314F 0%,#0F2E4B 55%,#0D2942 100%)",boxShadow:"1px 0 0 rgba(126,176,219,0.10), 6px 0 28px rgba(3,14,26,0.40)",display:"flex",flexDirection:"column",padding:"0 12px 20px",
            position: isMobile ? "fixed" : "relative", top:0, left:0,
            transform: isMobile && !menuOpen ? "translateX(-100%)" : "translateX(0)",
            transition:"transform 0.28s ease"}}>
            <div style={{padding:"22px 4px 24px",borderBottom:"1px solid rgba(126,176,219,0.16)",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#56A4F5,#56A4F5)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 14px rgba(3,14,26,0.45)"}}>
                  <BarChart3 style={{width:18,height:18,color:"#fff"}}/>
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>Prospecção</div>
                  <div style={{fontSize:11,fontWeight:700,background:"linear-gradient(90deg,#56A4F5,#56A4F5,#2CCD93,#56A4F5)",backgroundSize:"200% 200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"gradientShift 4s ease infinite"}}>CRM</div>
                </div>
              </div>
            </div>
            <nav style={{flex:1,display:"flex",flexDirection:"column",gap:2}}>
              {navItems.filter(nav => nav.label !== "Insights" || ehGerenteMenu).map(item=>(
                <div key={item.label} className={`nav-item${item.active?" active":""}`} onClick={()=>{
                  if(item.label==="Insights")navigate("/insights");
                  if(item.label==="Buscar Empresas")navigate("/buscar");
                  if(item.label==="Todos os clientes")navigate("/clientes");
                  if(item.label==="Cadastrar Empresas")navigate("/empresas/nova");
                  if(item.label==="Calendário")navigate("/calendario");
                  if(item.label==="Gerenciamento")navigate("/gerenciamento");
                }}>
                  <item.icon style={{width:16,height:16}}/>{item.label}
                </div>
              ))}
              {(usuario?.is_gerente || (usuario as any)?.is_supervisor) && (
                <div className="nav-item" onClick={()=>navigate("/equipe")}>
                  <UserRoundCog style={{width:16,height:16}}/>Equipe
                </div>
              )}
            </nav>
            <CardUsuario />
          </div>

          {/* Main */}
          <div style={{flex:1,height:"100vh",overflowY:"auto",position:"relative",zIndex:5}}>

            {/* Topbar */}
            <div style={{position:"sticky",top:0,zIndex:20,padding:isMobile?"12px 14px":"14px 28px",background:"rgba(15,46,75,0.88)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(126,176,219,0.16)",display:"flex",alignItems:"center",gap:isMobile?10:16}}>
              {isMobile && (
                <button onClick={()=>setMenuOpen(true)} style={{width:36,height:36,borderRadius:10,border:"1px solid rgba(126,176,219,0.16)",background:"#143354",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Menu style={{width:18,height:18,color:"#B6CFE4"}}/>
                </button>
              )}
              <div style={{flex:1,minWidth:0}}>
                <h1 style={{fontSize:18,fontWeight:800,color:"#FFFFFF",letterSpacing:"-0.02em"}}>Dashboard</h1>
              </div>
              {!isMobile && (
              <div style={{display:"flex",alignItems:"center",gap:8,background:"#143354",border:"1px solid rgba(126,176,219,0.16)",borderRadius:10,padding:"0 14px",height:38,width:260}}>
                <Search style={{width:14,height:14,color:"#B6CFE4",flexShrink:0}}/>
                <input value={searchValue} onChange={e=>setSearchValue(e.target.value)} placeholder="Buscar leads, empresas..." style={{flex:1,border:"none",background:"transparent",fontSize:13,color:"#FFFFFF",outline:"none"}}/>
              </div>
              )}
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button onClick={()=>{fetchData();fetchNotificacoes();}} style={{width:38,height:38,borderRadius:10,border:"1px solid rgba(126,176,219,0.16)",background:"#143354",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <RefreshCw style={{width:15,height:15,color:"#B6CFE4"}}/>
                </button>

                {/* ── SINO DE NOTIFICAÇÕES ── */}
                <div ref={notifRef} style={{position:"relative"}}>
                  <button
                    onClick={()=>setShowNotif(!showNotif)}
                    style={{width:38,height:38,borderRadius:10,border:"1px solid rgba(126,176,219,0.16)",background:"#143354",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}
                  >
                    <Bell style={{width:16,height:16,color:"#B6CFE4",animation:naoLidas>0?"bellShake 1.5s ease infinite":"none"}}/>
                    {naoLidas > 0 && (
                      <span style={{position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:"50%",background:"#F87171",color:"#0A2540",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid #0F2E4B"}}>
                        {naoLidas > 9 ? "9+" : naoLidas}
                      </span>
                    )}
                  </button>

                  {/* Painel de notificações */}
                  <AnimatePresence>
                    {showNotif && (
                      <motion.div
                        initial={{opacity:0,y:-8,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8,scale:0.96}}
                        transition={{duration:0.18}}
                        style={{position:"absolute",top:"calc(100% + 10px)",right:0,width:360,background:"#0F2E4B",border:"1px solid rgba(126,176,219,0.16)",borderRadius:16,boxShadow:"0 16px 48px rgba(3,14,26,0.55)",overflow:"hidden",zIndex:200}}
                      >
                        {/* Header */}
                        <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(126,176,219,0.16)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <Bell style={{width:14,height:14,color:"#B6CFE4"}}/>
                            <span style={{fontSize:13,fontWeight:700,color:"#FFFFFF"}}>Notificações</span>
                            {naoLidas > 0 && (
                              <span style={{fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:10,background:"rgba(248,113,113,0.12)",color:"#F87171"}}>
                                {naoLidas} nova{naoLidas!==1?"s":""}
                              </span>
                            )}
                          </div>
                          {naoLidas > 0 && (
                            <button onClick={marcarTodasLidas} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:600,color:"#B6CFE4",background:"none",border:"none",cursor:"pointer"}}>
                              <CheckCheck style={{width:12,height:12}}/> Marcar todas como lidas
                            </button>
                          )}
                        </div>

                        {/* Lista */}
                        <div style={{maxHeight:380,overflowY:"auto"}}>
                          {notificacoes.length === 0 ? (
                            <div style={{padding:"32px 20px",textAlign:"center"}}>
                              <Bell style={{width:28,height:28,color:"rgba(126,176,219,0.55)",margin:"0 auto 10px"}}/>
                              <p style={{fontSize:12,color:"#B6CFE4",fontWeight:500}}>Nenhuma notificação</p>
                            </div>
                          ) : (
                            notificacoes.map(n => {
                              const nc = notifColor(n.tipo);
                              return (
                                <div key={n.notificacao_id} className="notif-item"
                                  style={{background:n.lida?"transparent":nc.bg, cursor:"pointer"}}
                                  onClick={()=>{
                                  if(!n.lida) marcarLida(n.notificacao_id);
                                  setShowNotif(false);
                                  if(n.empresa_id) {
                                    const comTab = ["email_interaction","calendar_accepted","calendar_declined","calendar_tentative"];
                                    navigate(comTab.includes(n.tipo) ? `/clientes/${n.empresa_id}?tab=comunicacoes` : `/clientes/${n.empresa_id}`);
                                  }
                                }}>
                                  {/* Ícone */}
                                  <div style={{width:32,height:32,borderRadius:9,background:n.lida?"rgba(126,176,219,0.08)":nc.bg,border:`1px solid ${nc.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                                    {notifIcon(n.tipo)}
                                  </div>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:6}}>
                                      <div style={{fontSize:12,fontWeight:n.lida?500:700,color:"#FFFFFF",lineHeight:1.4}}>{n.titulo}</div>
                                      <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                                        {!n.lida && <div style={{width:6,height:6,borderRadius:"50%",background:nc.dot,flexShrink:0}}/>}
                                        <span style={{fontSize:10,color:"#B6CFE4",whiteSpace:"nowrap"}}>{timeAgo(n.criado_em)}</span>
                                      </div>
                                    </div>
                                    <div style={{fontSize:11,color:"#B6CFE4",marginTop:3,lineHeight:1.5}}>{n.mensagem}</div>
                                    {n.empresa_nome && (
                                      <div style={{marginTop:4,fontSize:10,fontWeight:600,color:"#B6CFE4"}}>{n.empresa_nome}</div>
                                    )}
                                  </div>
                                  <button
                                    onClick={e=>{e.stopPropagation();deletarNotificacao(n.notificacao_id,n.lida);}}
                                    style={{background:"none",border:"none",cursor:"pointer",padding:2,color:"#B6CFE4",flexShrink:0,marginTop:2}}
                                  >
                                    <X style={{width:13,height:13}}/>
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button onClick={()=>navigate("/empresas/nova")} style={{height:38,padding:"0 14px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#2CCD93,#2CCD93,#56A4F5,#2CCD93)",backgroundSize:"200% 200%",animation:"gradientShift 4s ease infinite",color:"#FFFFFF",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 14px rgba(44,205,147,0.28)"}}>
                  <Plus style={{width:15,height:15}}/> Novo
                </button>
              </div>
            </div>

            <div style={{padding:isMobile?"16px 14px 32px":"22px 28px 32px",display:"flex",flexDirection:"column",gap:18}}>

              {/* Abas: visao de clientes x visao de vendas */}
              <AbasGerenciamento aba={abaDash} onChange={setAbaDash} variante="dashboard" />

              {abaDash==="vendas" ? <VendasInsights /> : (
              <>

              {/* Banner rascunhos */}
              <AnimatePresence>
                {rascunhos.length > 0 && (
                  <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                    style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",borderRadius:14,background:"rgba(167,139,250,0.07)",border:"1.5px solid rgba(167,139,250,0.22)",backdropFilter:"blur(8px)"}}>
                    <div style={{width:40,height:40,borderRadius:11,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,animation:"pulseDraft 2.5s ease infinite"}}>
                      <FileText style={{width:18,height:18,color:"#B6CFE4"}}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#FFFFFF"}}>{rascunhos.length} rascunho{rascunhos.length!==1?"s":""} pendente{rascunhos.length!==1?"s":""}</div>
                      <div style={{fontSize:11,color:"#B6CFE4",marginTop:1}}>Complete as informações obrigatórias para transformar em lead</div>
                    </div>
                    <button onClick={()=>setActiveFilter("rascunho")}
                      style={{padding:"7px 14px",borderRadius:8,border:"1.5px solid rgba(167,139,250,0.3)",background:"rgba(167,139,250,0.1)",color:"#B6CFE4",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}
                      onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(167,139,250,0.18)";}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(167,139,250,0.1)";}}>
                      Ver rascunhos
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Metric cards */}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:12}}>
                {metricCards.map((m,i)=>(
                  <motion.div key={m.key} className="metric-card"
                    style={{borderColor:activeFilter===m.key?m.color:undefined,boxShadow:activeFilter===m.key?`0 0 0 3px ${m.color}22`:undefined,outline:m.key==="rascunho"&&m.value>0&&activeFilter!=="rascunho"?`1.5px dashed rgba(167,139,250,0.35)`:undefined}}
                    initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.35,delay:i*0.04}}
                    onClick={()=>setActiveFilter(m.key)}
                  >
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{width:32,height:32,borderRadius:9,background:m.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <m.icon style={{width:15,height:15,color:m.color}}/>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        {m.key==="rascunho"&&m.value>0&&(
                          <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"rgba(167,139,250,0.12)",color:"#B6CFE4",border:"1px solid rgba(167,139,250,0.2)",animation:"pulseDraft 2s ease infinite"}}>PENDENTE</span>
                        )}
                        {activeFilter===m.key&&<div style={{width:8,height:8,borderRadius:"50%",background:m.color}}/>}
                      </div>
                    </div>
                    {loading?<div className="skeleton" style={{height:24,width:"50%",marginBottom:4}}/>:(
                      <div style={{fontSize:24,fontWeight:900,color:"#FFFFFF",letterSpacing:"-0.03em"}}>{m.value}</div>
                    )}
                    <div style={{fontSize:10,color:"#B6CFE4",fontWeight:600,marginTop:2}}>{m.label}</div>
                    <div style={{marginTop:8}}><Sparkline color={m.color}/></div>
                  </motion.div>
                ))}
              </div>

              {/* Painel preview */}
              <motion.div className="glass-card" style={{overflow:"hidden"}} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.3}}>
                <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(126,176,219,0.16)",display:"flex",alignItems:"center",justifyContent:"space-between",background:`linear-gradient(90deg,${activeCard.bg},transparent)`}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:30,height:30,borderRadius:8,background:activeCard.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <activeCard.icon style={{width:14,height:14,color:activeCard.color}}/>
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#FFFFFF"}}>{filterLabels[activeFilter]}</div>
                      <div style={{fontSize:11,color:"#B6CFE4"}}>{previewList.length} empresa{previewList.length!==1?"s":""}</div>
                    </div>
                  </div>
                  <button onClick={()=>navigate(activeFilter==="rascunho" ? "/clientes" : "/gerenciamento")}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,border:`1px solid ${activeCard.color}40`,background:activeCard.bg,fontSize:11,fontWeight:600,color:"#FFFFFF",cursor:"pointer"}}>
                    Ver no CRM <ArrowRight style={{width:11,height:11}}/>
                  </button>
                </div>

                {loading?(
                  <div style={{padding:20,display:"flex",flexDirection:"column",gap:10}}>
                    {[1,2,3].map(i=><div key={i} className="skeleton" style={{height:40}}/>)}
                  </div>
                ):previewList.length===0?(
                  <div style={{padding:"40px 20px",textAlign:"center"}}>
                    <Building2 style={{width:32,height:32,color:"rgba(126,176,219,0.55)",margin:"0 auto 10px"}}/>
                    <p style={{fontSize:13,fontWeight:600,color:"#B6CFE4"}}>
                      {activeFilter==="rascunho" ? "Nenhum rascunho pendente" : "Nenhuma empresa nesta categoria"}
                    </p>
                    <button onClick={()=>navigate("/empresas/nova")} style={{marginTop:12,padding:"7px 16px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#56A4F5,#56A4F5)",color:"#FFFFFF",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                      + Cadastrar empresa
                    </button>
                  </div>
                ):(
                  <>
                    <div className="preview-th">
                      {activeFilter==="rascunho"
                        ? ["Empresa","Segmento","Cidade","Status","Completar"].map(h=><span key={h} style={{fontSize:10,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:"#B6CFE4"}}>{h}</span>)
                        : ["Empresa","Status","Temperatura","Cidade","Valor"].map(h=><span key={h} style={{fontSize:10,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:"#B6CFE4"}}>{h}</span>)
                      }
                    </div>
                    <div style={{maxHeight:220,overflowY:"auto"}}>
                      <AnimatePresence mode="wait">
                        {previewList.slice(0,10).map((emp,idx)=>{
                          const sc=statusColor(emp.status);
                          const isDraft=emp.status==="Rascunho";
                          return(
                            <motion.div key={emp.empresa_id} className={`preview-row${isDraft?" draft-row":""}`}
                              initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} exit={{opacity:0}}
                              transition={{duration:0.18,delay:idx*0.03}}
                              onClick={()=>navigate(isDraft?`/clientes/${emp.empresa_id}/editar`:`/clientes/${emp.empresa_id}`)}>
                              <div style={{display:"flex",alignItems:"center",gap:10}}>
                                <div style={{width:28,height:28,borderRadius:8,background:isDraft?"rgba(167,139,250,0.15)":avatarColor(emp.nome),display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:isDraft?"#56A4F5":"#143354",flexShrink:0,border:isDraft?"1.5px dashed rgba(167,139,250,0.4)":"none"}}>
                                  {isDraft?<FileText style={{width:12,height:12}}/>:initials(emp.nome)}
                                </div>
                                <div>
                                  <div style={{fontSize:12,fontWeight:700,color:"#FFFFFF"}}>{emp.nome}</div>
                                  <div style={{fontSize:10,color:"#B6CFE4"}}>{emp.segmento||"Segmento não definido"}</div>
                                </div>
                              </div>
                              {isDraft?(
                                <>
                                  <span style={{fontSize:11,color:"#B6CFE4"}}>{emp.segmento||"—"}</span>
                                  <span style={{fontSize:11,color:"#B6CFE4"}}>{emp.cidade||"—"}</span>
                                  <span className="chip" style={{background:sc.bg,color:sc.text,border:`1px solid ${sc.border}`,animation:"pulseDraft 2s ease infinite"}}>{emp.status}</span>
                                  <button onClick={e=>{e.stopPropagation();navigate(`/clientes/${emp.empresa_id}/editar`);}}
                                    style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:7,border:"1.5px solid rgba(167,139,250,0.3)",background:"rgba(167,139,250,0.08)",color:"#B6CFE4",fontSize:11,fontWeight:700,cursor:"pointer"}}
                                    onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(167,139,250,0.16)";}}
                                    onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(167,139,250,0.08)";}}>
                                    <Edit3 style={{width:10,height:10}}/> Completar
                                  </button>
                                </>
                              ):(
                                <>
                                  <span className="chip" style={{background:sc.bg,color:sc.text,border:`1px solid ${sc.border}`}}>{emp.status||"—"}</span>
                                  <span style={{display:"inline-flex",alignItems:"center",gap:7,fontSize:11,color:emp.temperatura?tempColor(emp.temperatura):"#B6CFE4"}}>
                                    {emp.temperatura&&<span style={{width:6,height:6,borderRadius:"50%",background:tempColor(emp.temperatura),flexShrink:0}}/>}
                                    {emp.temperatura||"—"}
                                  </span>
                                  <span style={{fontSize:11,color:"#FFFFFF"}}>{emp.cidade||"—"}</span>
                                  {/* Em aberto e o que ainda pode fechar; sem nada
                                      em aberto, mostra o que ja fechou. */}
                                  {(()=>{
                                    const v=valores.valorDe(emp.empresa_id);
                                    const aberto=v.emAberto>0;
                                    const valor=aberto?v.emAberto:v.aprovado;
                                    return (
                                      <span title={valor>0?(aberto?"Orçamentos enviados e em negociação":"Orçamentos aprovados"):"Nenhum orçamento"}
                                        style={{fontSize:12,fontWeight:700,color:valor>0?(aberto?"#FFFFFF":"#83DDA8"):"#B6CFE4"}}>
                                        {valor>0?brlCompacto(valor):"—"}
                                      </span>
                                    );
                                  })()}
                                </>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </motion.div>

              </>
              )}
            </div>
          </div>
        </div>
      );
    }
      