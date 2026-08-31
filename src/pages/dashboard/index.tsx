import { getToken } from "../../services/auth";
import CardUsuario from "../../components/CardUsuario";
import AbasGerenciamento, { cssAbasGerenciamento } from "../../components/AbasGerenciamento";
import FundoAzul from "../../components/FundoAzul";
  import { useState, useEffect, useMemo, useRef } from "react";
    import { useNavigate } from "react-router-dom";
    import { motion, AnimatePresence } from "framer-motion";
    import {
    Users, Building2, MessageCircle, Send, Handshake,
    LayoutDashboard, Search, Bell, Calendar, Plus,
    ClipboardList, BarChart3, RefreshCw,
    Mail, ArrowRight,
    X, CalendarCheck, Repeat, FileText, Edit3,
    Trash2, CheckCheck, AlertTriangle, Info,
    CheckCircle2, Menu, UserRoundCog
  } from "lucide-react";
  // ChevronRight saiu junto com o dropdown de período feito à mão, que virou
  // o componente Dropdown compartilhado.
  import VendasInsights from "../../components/VendasInsights";
  import Dropdown from "../../components/Dropdown";
  import { dataLocal, inicioDoDia, mesmoDia, diasDesde } from "../../utils/data";
  import useIsMobile from "../../hooks/useIsMobile";

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
      ticket_medio_estimado: number | null; responsavel_principal: string;
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

    // ── Evolução da base ────────────────────────────────────────
    // Um gráfico só, com o indicador escolhido num dropdown. O período controla
    // quantos meses entram na janela; o indicador controla o que é medido e,
    // junto, quais quatro números aparecem no rodapé.
    //
    // Regra que vale para todos: só entra indicador que tem data real por trás.
    // O backend guarda o status ATUAL da empresa e a data da última mudança
    // (`status_atualizado_em`), não o histórico completo — então dá para saber
    // em que mês algo virou Fechado ou Perdido (estados terminais), mas não
    // reconstruir quantas empresas estavam "Em contato" em abril. Indicador que
    // não pode ser calculado sem inventar não entra na lista.
    const MESES_CURTOS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const MESES_LONGOS = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

    function fimDoMes(base: Date, atras: number) {
      // Dia 0 do mês seguinte = último instante do mês alvo.
      return new Date(base.getFullYear(), base.getMonth() - atras + 1, 0, 23, 59, 59, 999);
    }

    interface Balde { rotulo: string; mes: number; inicio: Date; fim: Date }
    const noBalde = (d: Date | null, b: Balde) => !!d && d >= b.inicio && d <= b.fim;

    // Recortes de orçamento e evento — só os campos que o gráfico usa.
    interface OrcamentoLite {
      status: string; total: number | string | null;
      criado_em: string | null; data_envio: string | null; data_decisao: string | null;
    }
    interface EventoLite { tipo: string; data: string }

    type Fonte = "orcamentos" | "eventos";
    interface Estatistica { rotulo: string; valor: string; cor?: string }
    interface ContextoInd {
      empresas: Empresa[]; orcamentos: OrcamentoLite[]; eventos: EventoLite[];
      baldes: Balde[]; meses: number;
    }

    const brlCompacto = (n: number) => {
      if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}mi`;
      if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
      return `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
    };

    /** Variação assinada, com o sinal na frente do número e não do "R$". */
    function variacaoFmt(n: number, moeda: boolean) {
      const sinal = n > 0 ? "+" : n < 0 ? "−" : "";
      return sinal + (moeda ? brlCompacto(Math.abs(n)) : String(Math.abs(n)));
    }

    /**
     * Rodapé padrão: valor do mês, variação contra o mês anterior, a perda
     * correspondente ao indicador e o fechamento do período.
     *
     * A série de perda é diferente em cada indicador (descartado, recusado,
     * valor perdido...) e SEMPRE sai de dado real — onde não existe fonte, o
     * indicador simplesmente não oferece esse número em vez de estimar.
     */
    function statsPadrao(o: {
      rotuloPrincipal: string;
      valores: number[];
      rotuloPerda: string;
      perdas: number[];
      rotuloFecho?: string;
      /** Métrica de estoque (ex.: valor em negociação) fecha com o pico, não com a soma. */
      pico?: boolean;
      moeda?: boolean;
      cor: string;
    }): Estatistica[] {
      const moeda = !!o.moeda;
      const fmt = (n: number) => moeda ? brlCompacto(n) : String(n);
      const atual = o.valores[o.valores.length - 1] ?? 0;
      const anterior = o.valores[o.valores.length - 2] ?? 0;
      const delta = atual - anterior;
      const perdaMes = o.perdas[o.perdas.length - 1] ?? 0;
      const fecho = o.pico
        ? Math.max(...o.valores, 0)
        : o.valores.reduce((s, v) => s + v, 0);
      return [
        { rotulo: o.rotuloPrincipal, valor: fmt(atual), cor: atual > 0 ? o.cor : "#B6CFE4" },
        { rotulo: "Variação no mês", valor: variacaoFmt(delta, moeda),
          cor: delta > 0 ? "#2CCD93" : delta < 0 ? "#F87171" : "#B6CFE4" },
        { rotulo: o.rotuloPerda, valor: fmt(perdaMes), cor: perdaMes > 0 ? "#F87171" : "#B6CFE4" },
        { rotulo: o.rotuloFecho ?? "Total no período", valor: fmt(fecho) },
      ];
    }

    interface Indicador {
      chave: string;
      rotulo: string;
      legenda: string;
      cor: string;
      moeda?: boolean;
      /** Dados extras que precisam ser buscados antes de calcular. */
      precisa: Fonte[];
      /** Avisa sobre empresas sem `criado_em` (só faz sentido em quem usa essa data). */
      avisaSemData?: boolean;
      calcular: (c: ContextoInd) => { valores: number[]; stats: Estatistica[] };
    }

    // Contagens reaproveitadas por vários indicadores.
    const perdidasNoMes = (empresas: Empresa[], baldes: Balde[]) =>
      baldes.map(b => empresas.filter(e =>
        e.status === "Perdido" && noBalde(dataLocal(e.status_atualizado_em), b)
      ).length);
    const recusadosNoMes = (orcamentos: OrcamentoLite[], baldes: Balde[]) =>
      baldes.map(b => orcamentos.filter(o =>
        o.status === "recusado" && noBalde(dataLocal(o.data_decisao), b)
      ).length);

    const INDICADORES: Indicador[] = [
      {
        chave: "base", rotulo: "Base de clientes", legenda: "Crescimento de clientes",
        cor: "#56A4F5", precisa: [], avisaSemData: true,
        calcular: ({ empresas, baldes, meses }) => {
          const reais = empresas.filter(e => e.status !== "Rascunho");
          // Cumulativo: entrou quem nasceu até o corte, saiu quem virou Perdido até lá.
          const valores = baldes.map(b => reais.filter(e => {
            const nasceu = dataLocal(e.criado_em);
            if (!nasceu || nasceu > b.fim) return false;
            const saiu = e.status === "Perdido" ? dataLocal(e.status_atualizado_em) : null;
            return !(saiu && saiu <= b.fim);
          }).length);
          const ultimo = baldes[baldes.length - 1];
          const novos = reais.filter(e => noBalde(dataLocal(e.criado_em), ultimo)).length;
          const perdidos = reais.filter(e => e.status === "Perdido" && noBalde(dataLocal(e.status_atualizado_em), ultimo)).length;
          return {
            valores,
            stats: [
              { rotulo: "Base atual",        valor: String(reais.filter(e => e.status !== "Perdido").length) },
              { rotulo: "Novos no mês",      valor: `+${novos}`, cor: novos ? "#2CCD93" : "#B6CFE4" },
              { rotulo: "Perdidos no mês",   valor: perdidos ? `−${perdidos}` : "0", cor: perdidos ? "#F87171" : "#B6CFE4" },
              { rotulo: `Há ${meses} meses`, valor: String(valores[0] ?? 0) },
            ],
          };
        },
      },
      {
        chave: "novos", rotulo: "Leads captados", legenda: "Novos contatos entrando no funil",
        cor: "#2CCD93", precisa: [], avisaSemData: true,
        calcular: ({ empresas, baldes }) => {
          const reais = empresas.filter(e => e.status !== "Rascunho");
          const valores = baldes.map(b => reais.filter(e => noBalde(dataLocal(e.criado_em), b)).length);
          return { valores, stats: statsPadrao({
            rotuloPrincipal: "Leads no mês", valores,
            rotuloPerda: "Descartados no mês", perdas: perdidasNoMes(reais, baldes),
            cor: "#2CCD93",
          }) };
        },
      },
      {
        chave: "visitas", rotulo: "Visitas realizadas", legenda: "Visitas da agenda já cumpridas",
        cor: "#A78BFA", precisa: ["eventos"],
        calcular: ({ eventos, baldes }) => {
          const agora = new Date();
          const visitas = eventos.filter(ev => ev.tipo === "visita");
          const valores = baldes.map(b => visitas.filter(ev => {
            const d = dataLocal(ev.data);
            return noBalde(d, b) && !!d && d <= agora;   // agendada no futuro ainda não foi cumprida
          }).length);
          // O evento não guarda comparecimento, então "não compareceram" não tem
          // fonte. No lugar, o que ainda está por vir — que é acionável.
          const aFrente = baldes.map(b => visitas.filter(ev => {
            const d = dataLocal(ev.data);
            return noBalde(d, b) && !!d && d > agora;
          }).length);
          const stats = statsPadrao({
            rotuloPrincipal: "Visitas no mês", valores,
            rotuloPerda: "Ainda agendadas", perdas: aFrente,
            cor: "#A78BFA",
          });
          stats[2].cor = (aFrente[aFrente.length - 1] ?? 0) > 0 ? "#8FC4FA" : "#B6CFE4";
          return { valores, stats };
        },
      },
      {
        chave: "orcamentos", rotulo: "Orçamentos criados", legenda: "Orçamentos abertos por mês",
        cor: "#F0A05A", precisa: ["orcamentos"],
        calcular: ({ orcamentos, baldes }) => {
          const valores = baldes.map(b => orcamentos.filter(o => noBalde(dataLocal(o.criado_em), b)).length);
          return { valores, stats: statsPadrao({
            rotuloPrincipal: "Orçamentos no mês", valores,
            rotuloPerda: "Recusados no mês", perdas: recusadosNoMes(orcamentos, baldes),
            cor: "#F0A05A",
          }) };
        },
      },
      {
        chave: "propostas", rotulo: "Propostas enviadas", legenda: "Orçamentos que saíram para o cliente",
        cor: "#56A4F5", precisa: ["orcamentos"],
        calcular: ({ orcamentos, baldes }) => {
          const valores = baldes.map(b => orcamentos.filter(o => noBalde(dataLocal(o.data_envio), b)).length);
          return { valores, stats: statsPadrao({
            rotuloPrincipal: "Propostas no mês", valores,
            rotuloPerda: "Recusadas no mês", perdas: recusadosNoMes(orcamentos, baldes),
            cor: "#56A4F5",
          }) };
        },
      },
      {
        chave: "negociacao", rotulo: "Valor em negociação", legenda: "Soma das propostas em aberto",
        cor: "#F2C879", precisa: ["orcamentos"], moeda: true,
        calcular: ({ orcamentos, baldes }) => {
          // Métrica de ESTOQUE, reconstruída no fim de cada mês: já tinha saído
          // para o cliente (data_envio) e ainda não tinha decisão naquela data.
          // Um orçamento hoje aprovado esteve em negociação nos meses anteriores,
          // e é isso que data_envio + data_decisao permitem recuperar.
          const valores = baldes.map(b => orcamentos
            .filter(o => {
              const enviou = dataLocal(o.data_envio);
              if (!enviou || enviou > b.fim) return false;
              const decidiu = dataLocal(o.data_decisao);
              return !decidiu || decidiu > b.fim;
            })
            .reduce((s, o) => s + (Number(o.total) || 0), 0));
          const perdido = baldes.map(b => orcamentos
            .filter(o => o.status === "recusado" && noBalde(dataLocal(o.data_decisao), b))
            .reduce((s, o) => s + (Number(o.total) || 0), 0));
          return { valores, stats: statsPadrao({
            rotuloPrincipal: "Em negociação", valores,
            rotuloPerda: "Valor perdido", perdas: perdido,
            // Somar um estoque mês a mês contaria o mesmo orçamento várias vezes.
            rotuloFecho: "Pico no período", pico: true,
            moeda: true, cor: "#F2C879",
          }) };
        },
      },
      {
        chave: "fechados", rotulo: "Negócios fechados", legenda: "Empresas que viraram cliente",
        cor: "#2CCD93", precisa: [],
        calcular: ({ empresas, baldes }) => {
          // "Fechado" é estado terminal: a última mudança de status É o fechamento.
          const valores = baldes.map(b => empresas.filter(e =>
            e.status === "Fechado" && noBalde(dataLocal(e.status_atualizado_em), b)
          ).length);
          return { valores, stats: statsPadrao({
            rotuloPrincipal: "Fechados no mês", valores,
            rotuloPerda: "Perdidos no mês", perdas: perdidasNoMes(empresas, baldes),
            cor: "#2CCD93",
          }) };
        },
      },
      {
        chave: "perdidos", rotulo: "Negócios perdidos", legenda: "Empresas marcadas como perdidas",
        cor: "#F87171", precisa: [],
        calcular: ({ empresas, baldes }) => {
          const valores = perdidasNoMes(empresas, baldes);
          const fechados = baldes.map(b => empresas.filter(e =>
            e.status === "Fechado" && noBalde(dataLocal(e.status_atualizado_em), b)
          ).length);
          const stats = statsPadrao({
            rotuloPrincipal: "Perdidos no mês", valores,
            rotuloPerda: "Fechados no mês", perdas: fechados,
            cor: "#F87171",
          });
          // Único indicador onde subir é ruim: as cores da variação invertem, e a
          // terceira caixa é o contraponto positivo, não uma perda.
          stats[1].cor = stats[1].valor.startsWith("+") ? "#F87171"
                       : stats[1].valor.startsWith("−") ? "#2CCD93" : "#B6CFE4";
          stats[2].cor = (fechados[fechados.length - 1] ?? 0) > 0 ? "#2CCD93" : "#B6CFE4";
          return { valores, stats };
        },
      },
      {
        chave: "valor", rotulo: "Valor aprovado", legenda: "Soma dos orçamentos aprovados",
        cor: "#2CCD93", precisa: ["orcamentos"], moeda: true,
        calcular: ({ orcamentos, baldes }) => {
          const aprovados = orcamentos.filter(o => o.status === "aprovado");
          const valores = baldes.map(b => aprovados
            .filter(o => noBalde(dataLocal(o.data_decisao || o.data_envio || o.criado_em), b))
            .reduce((s, o) => s + (Number(o.total) || 0), 0));
          const perdido = baldes.map(b => orcamentos
            .filter(o => o.status === "recusado" && noBalde(dataLocal(o.data_decisao), b))
            .reduce((s, o) => s + (Number(o.total) || 0), 0));
          return { valores, stats: statsPadrao({
            rotuloPrincipal: "Aprovado no mês", valores,
            rotuloPerda: "Valor perdido", perdas: perdido,
            moeda: true, cor: "#2CCD93",
          }) };
        },
      },
    ];

    /** Marcas do eixo Y em números redondos, ~4 divisões. */
    function marcasEixo(maximo: number): number[] {
      if (maximo <= 0) return [0, 1];
      const bruto = maximo / 4;
      const expo = Math.floor(Math.log10(bruto));
      const base = Math.pow(10, expo);
      const n = bruto / base;
      const passo = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * base;
      const topo = Math.ceil(maximo / passo) * passo;
      const marcas: number[] = [];
      for (let v = 0; v <= topo + passo / 1000; v += passo) marcas.push(v);
      return marcas;
    }

    function EvolucaoDaBase({ empresas }: { empresas: Empresa[] }) {
      const isMobile = useIsMobile();
      const [meses, setMeses] = useState(6);
      const [chave, setChave] = useState("base");

      // Orçamentos e eventos só são buscados quando um indicador precisa deles —
      // quem só olha a base de clientes não paga duas requisições extras.
      const [orcamentos, setOrcamentos] = useState<OrcamentoLite[] | null>(null);
      const [eventos, setEventos] = useState<EventoLite[] | null>(null);
      const [buscando, setBuscando] = useState(false);
      const [falhou, setFalhou] = useState(false);
      const [ativo, setAtivo] = useState<number | null>(null);   // mês sob o cursor

      const indicador = INDICADORES.find(i => i.chave === chave) || INDICADORES[0];

      useEffect(() => {
        const faltam = indicador.precisa.filter(f =>
          (f === "orcamentos" ? orcamentos : eventos) === null
        );
        if (faltam.length === 0) return;
        let vivo = true;
        setBuscando(true);
        (async () => {
          const cab = { Authorization: `Bearer ${getToken() || ""}` };
          await Promise.all(faltam.map(async fonte => {
            let dados: any[] = [];
            let ok = false;
            try {
              const r = await fetch(`${API}/${fonte}`, { headers: cab });
              if (r.ok) { dados = await r.json(); ok = true; }
            } catch { /* rede fora: cai no aviso abaixo */ }
            if (!vivo) return;
            if (!ok) setFalhou(true);
            // Grava mesmo em falha (lista vazia) para não repetir a chamada em loop.
            if (fonte === "orcamentos") setOrcamentos(dados); else setEventos(dados);
          }));
          if (vivo) setBuscando(false);
        })();
        return () => { vivo = false; };
      }, [indicador, orcamentos, eventos]);

      // Sem isto, trocar de 12 para 3 meses deixaria `ativo` apontando para um
      // índice que não existe mais e o tooltip apareceria fora do gráfico.
      useEffect(() => { setAtivo(null); }, [chave, meses]);

      const baldes = useMemo<Balde[]>(() => {
        const hoje = new Date();
        return Array.from({ length: meses }, (_, i) => {
          const fim = fimDoMes(hoje, meses - 1 - i);
          return {
            rotulo: MESES_CURTOS[fim.getMonth()],
            mes: fim.getMonth(),
            inicio: new Date(fim.getFullYear(), fim.getMonth(), 1, 0, 0, 0, 0),
            fim,
          };
        });
      }, [meses]);

      const { valores, stats } = useMemo(
        () => indicador.calcular({ empresas, orcamentos: orcamentos || [], eventos: eventos || [], baldes, meses }),
        [indicador, empresas, orcamentos, eventos, baldes, meses]
      );

      const semData = useMemo(
        () => empresas.filter(e => e.status !== "Rascunho" && !e.criado_em).length,
        [empresas]
      );

      // ── Geometria do gráfico ──
      // viewBox fixo (sem preserveAspectRatio="none", que esticava os traços e
      // impediria rótulo no eixo Y) escalado por width:100%.
      const W = 680, H = 250, L = 46, R = 14, T = 18, B = 34;
      const pw = W - L - R, ph = H - T - B;
      const marcas = marcasEixo(Math.max(...valores, 0));
      const topo = marcas[marcas.length - 1] || 1;
      const x = (i: number) => L + (i * pw) / Math.max(valores.length - 1, 1);
      const y = (v: number) => T + (1 - v / topo) * ph;
      const faixa = pw / Math.max(valores.length - 1, 1);

      const linha = valores.map((v, i) => `${x(i)},${y(v)}`).join(" ");
      const area = `${linha} ${x(valores.length - 1)},${T + ph} ${x(0)},${T + ph}`;
      const fmtValor = (n: number) => indicador.moeda ? brlCompacto(n) : String(n);

      const primeiro = baldes[0], ultimo = baldes[baldes.length - 1];
      const intervalo = primeiro && ultimo
        ? `${MESES_LONGOS[primeiro.mes]} a ${MESES_LONGOS[ultimo.mes]}`
        : "";
      const vazio = valores.every(v => v === 0);

      return (
        <motion.div className="glass-card" style={{padding:"22px 24px"}} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.45}}>

            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:16}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:16,fontWeight:800,color:"#FFFFFF",letterSpacing:"-0.01em"}}>{indicador.rotulo}</div>
                <div style={{fontSize:12,color:"#B6CFE4",marginTop:3}}>{indicador.legenda} · {intervalo}</div>
              </div>
              <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap"}}>
                <Dropdown
                  valor={chave} onChange={setChave} ariaLabel="Indicador do gráfico"
                  largura={isMobile ? 170 : 196} altura={38} corAtiva={indicador.cor}
                  opcoes={INDICADORES.map(i => ({ valor: i.chave, rotulo: i.rotulo, cor: i.cor }))}
                />
                <Dropdown
                  valor={String(meses)} onChange={v => setMeses(Number(v))} ariaLabel="Período do gráfico"
                  largura={isMobile ? 110 : 124} altura={38}
                  opcoes={[3,6,12].map(n => ({ valor: String(n), rotulo: `${n} meses` }))}
                />
              </div>
            </div>

            {/* Números primeiro: o gráfico mostra a forma, as caixas dão a conta.
                Mudam junto com o indicador escolhido. */}
            <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?2:4},minmax(0,1fr))`,gap:10,marginBottom:18}}>
              {stats.map(s=>(
                <div key={s.rotulo} style={{background:"rgba(126,176,219,0.06)",border:"1px solid rgba(126,176,219,0.16)",borderRadius:12,padding:"12px 14px",minWidth:0}}>
                  <div style={{fontSize:11.5,color:"#B6CFE4",marginBottom:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.rotulo}</div>
                  <div style={{fontSize:21,fontWeight:800,color:s.cor||"#FFFFFF",letterSpacing:"-0.01em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.valor}</div>
                </div>
              ))}
            </div>

            {buscando ? (
              <div className="skeleton" style={{height:250,borderRadius:12}}/>
            ) : (
              // position:relative ancora o tooltip, que é posicionado em % do viewBox
              <div style={{position:"relative"}}>
                <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}
                     role="img" aria-label={`${indicador.rotulo} por mês: ${baldes.map((b,i)=>`${b.rotulo}, ${fmtValor(valores[i]??0)}`).join("; ")}`}>
                  <defs>
                    <linearGradient id={`grad-${indicador.chave}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={indicador.cor} stopOpacity="0.30"/>
                      <stop offset="100%" stopColor={indicador.cor} stopOpacity="0"/>
                    </linearGradient>
                  </defs>

                  {/* Grade + escala. Sem os números do eixo, dava para ver que
                      uma curva subia, não de quanto para quanto. */}
                  {marcas.map(m=>(
                    <g key={m}>
                      <line x1={L} x2={W-R} y1={y(m)} y2={y(m)} stroke="rgba(126,176,219,0.14)" strokeWidth="1"/>
                      <text x={L-8} y={y(m)+3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="#8AA9C6">
                        {indicador.moeda ? brlCompacto(m).replace("R$ ","") : m.toLocaleString("pt-BR")}
                      </text>
                    </g>
                  ))}

                  {!vazio && <polygon points={area} fill={`url(#grad-${indicador.chave})`}/>}
                  <polyline points={linha} fill="none" stroke={indicador.cor} strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round"/>

                  {valores.map((v,i)=>{
                    const fim = i === valores.length - 1;
                    const on = ativo === i;
                    return (
                      <g key={i}>
                        {on && <line x1={x(i)} x2={x(i)} y1={T} y2={T+ph} stroke={indicador.cor} strokeWidth="1" strokeDasharray="3 3" opacity="0.5"/>}
                        <circle cx={x(i)} cy={y(v)} r={fim||on?5:4}
                                fill={fim||on?indicador.cor:"#143354"} stroke={indicador.cor} strokeWidth="2"/>
                        <text x={x(i)} y={H-B+18} textAnchor="middle" fontSize="11"
                              fontWeight={fim||on?800:600} fill={fim||on?"#FFFFFF":"#B6CFE4"}>
                          {baldes[i]?.rotulo}
                        </text>
                      </g>
                    );
                  })}

                  {/* Faixas de captura: o alvo do mouse é a coluna inteira, não o
                      ponto — acertar um círculo de 4px de raio é sofrimento. */}
                  {valores.map((_,i)=>(
                    <rect key={`h${i}`} x={x(i)-faixa/2} y={T} width={faixa} height={ph}
                          fill="transparent" tabIndex={0} role="button"
                          aria-label={`${baldes[i]?.rotulo}: ${fmtValor(valores[i]??0)}`}
                          onMouseEnter={()=>setAtivo(i)} onMouseLeave={()=>setAtivo(null)}
                          onFocus={()=>setAtivo(i)} onBlur={()=>setAtivo(null)}/>
                  ))}
                </svg>

                {/* Tooltip com a variação contra o mês anterior — o mesmo número
                    da caixa "Variação no mês", mas ponto a ponto. */}
                {ativo !== null && (()=>{
                  const v = valores[ativo] ?? 0;
                  const delta = ativo > 0 ? v - (valores[ativo-1] ?? 0) : null;
                  return (
                    <div style={{
                      position:"absolute", left:`${(x(ativo)/W)*100}%`, top:`${(y(v)/H)*100}%`,
                      transform:"translate(-50%,-125%)", pointerEvents:"none", zIndex:5,
                      background:"#0A1F33", border:"1px solid rgba(126,176,219,0.30)", borderRadius:8,
                      padding:"7px 10px", fontSize:12, whiteSpace:"nowrap", color:"#FFFFFF",
                      boxShadow:"0 8px 24px rgba(3,14,26,0.55)",
                    }}>
                      <span style={{color:"#B6CFE4"}}>{baldes[ativo]?.rotulo}</span>
                      {"  "}
                      <span style={{fontWeight:800}}>{fmtValor(v)}</span>
                      {delta !== null && (
                        <>
                          {"  "}
                          <span style={{fontWeight:700,color:delta>0?"#2CCD93":delta<0?"#F87171":"#B6CFE4"}}>
                            {variacaoFmt(delta, !!indicador.moeda)}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })()}

                {vazio && (
                  <div style={{textAlign:"center",fontSize:12,color:"#B6CFE4",marginTop:-10}}>
                    Nenhum registro de “{indicador.rotulo.toLowerCase()}” neste período.
                  </div>
                )}
              </div>
            )}

            {falhou && indicador.precisa.length > 0 && (
              <div style={{marginTop:14,display:"flex",alignItems:"center",gap:7,fontSize:11,color:"#B6CFE4"}}>
                <Info style={{width:12,height:12,flexShrink:0,color:"#F0A05A"}}/>
                Não foi possível carregar os dados deste indicador — o gráfico está mostrando zero, não um resultado real.
              </div>
            )}

            {indicador.avisaSemData && semData>0&&(
              <div style={{marginTop:14,display:"flex",alignItems:"center",gap:7,fontSize:11,color:"#B6CFE4"}}>
                <Info style={{width:12,height:12,flexShrink:0,color:"#F0A05A"}}/>
                {semData} {semData===1?"empresa cadastrada antes":"empresas cadastradas antes"} do histórico existir — {semData===1?"conta":"contam"} na base atual, mas {semData===1?"não aparece":"não aparecem"} na curva.
              </div>
            )}
        </motion.div>
      );
    }

    // ── Precisam de atenção ────────────────────────────────────
    // Quatro contagens de coisa parada. Tudo sai da lista que o dashboard ja
    // carregou -- nenhuma chamada nova. Rascunhos, fechados e perdidos ficam de
    // fora: não ha o que cobrar de quem ja saiu do funil.
    // `diasDesde` e `mesmoDia` agora vêm de utils/data: as datas destes campos
    // saem de <input type="date"> e chegam como "YYYY-MM-DD", que o JS lê como
    // meia-noite UTC. Em Brasília isso virava 21h do dia anterior — um retorno
    // marcado para HOJE caía como vencido e sumia da contagem de hoje.
    function PrecisamDeAtencao({ empresas }: { empresas: Empresa[] }) {
      const alertas = useMemo(() => {
        const ativas = empresas.filter(e =>
          e.status !== "Rascunho" && e.status !== "Fechado" && e.status !== "Perdido"
        );

        return [
          {
            titulo: "Sem contato há 15+ dias",
            sub: "Risco de perder o vínculo",
            valor: ativas.filter(e => diasDesde(e.ultima_interacao) >= 15).length,
            cor: "#F0A05A",
            destaca: true,
          },
          {
            titulo: "Quentes esfriando",
            sub: "Sem contato há 5+ dias",
            valor: ativas.filter(e => e.temperatura === "Quente" && diasDesde(e.ultima_interacao) >= 5).length,
            cor: "#F87171",
            destaca: false,
          },
          {
            // Substituiu "Leads sem responsável": essa contagem não existe mais
            // como situação real. É a mesma ideia de cobrança — compromisso
            // combinado que passou da data — e sai dos dados que a tela já tem.
            titulo: "Retorno vencido",
            sub: "Follow-up passou da data",
            valor: ativas.filter(e => {
              const d = dataLocal(e.data_proxima_acao);
              return !!d && inicioDoDia(d).getTime() < inicioDoDia().getTime();
            }).length,
            cor: "#F87171",
            destaca: true,
          },
          {
            titulo: "Retornos agendados hoje",
            sub: "Follow-up marcado",
            valor: ativas.filter(e => mesmoDia(e.data_proxima_acao)).length,
            cor: "#8FC4FA",
            destaca: false,
          },
        ];
      }, [empresas]);

      return (
        <motion.div
          className="glass-card"
          style={{padding:"22px 24px",height:"100%",display:"flex",flexDirection:"column"}}
          initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.5}}
        >
          <div style={{fontSize:16,fontWeight:800,color:"#FFFFFF",letterSpacing:"-0.01em"}}>Precisam de atenção</div>
          <div style={{fontSize:12,color:"#B6CFE4",marginTop:3}}>Base em risco de esfriar</div>

          {/* as quatro linhas se espalham pelo que sobrar, para o card acompanhar
              a altura do gráfico ao lado em vez de parar no meio */}
          <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"space-around",marginTop:8}}>
          {alertas.map((a,i)=>(
            <div
              key={a.titulo}
              style={{
                display:"flex",alignItems:"center",gap:12,padding:"14px 0",
                borderTop:i===0?"none":"1px solid rgba(126,176,219,0.16)",
              }}
            >
              <span style={{width:7,height:7,borderRadius:"50%",background:a.cor,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#FFFFFF"}}>{a.titulo}</div>
                <div style={{fontSize:11,color:"#B6CFE4",marginTop:2}}>{a.sub}</div>
              </div>
              <span style={{fontSize:15,fontWeight:800,color:a.valor>0&&a.destaca?a.cor:"#FFFFFF",flexShrink:0}}>
                {a.valor}
              </span>
            </div>
          ))}
          </div>
        </motion.div>
      );
    }

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
      const [empresas, setEmpresas] = useState<Empresa[]>([]);
      const [loading, setLoading] = useState(true);
      const isMobile = useIsMobile();
      const [menuOpen, setMenuOpen] = useState(false);
      const [activeFilter, setActiveFilter] = useState<FilterKey>("total");
      // Dashboard dividido nas mesmas duas visões do Gerenciamento.
      const [abaDash, setAbaDash] = useState<"clientes"|"vendas">("clientes");
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

      const fetchData = async () => {
        setLoading(true);
        try {
          const [empRes, meRes] = await Promise.all([
            fetch(`${API}/empresas`, { headers: headers() }),
            fetch(`${API}/me`, { headers: headers() }),
          ]);
          if(empRes.ok) setEmpresas(await empRes.json());
          if(meRes.ok)  setUsuario(await meRes.json());
        } catch {}
        setLoading(false);
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
          <style>{css + cssAbasGerenciamento}</style>

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
              {navItems.map(item=>(
                <div key={item.label} className={`nav-item${item.active?" active":""}`} onClick={()=>{
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
              <AbasGerenciamento aba={abaDash} onChange={setAbaDash} compacto />

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
                        : ["Empresa","Status","Temperatura","Cidade","Ticket"].map(h=><span key={h} style={{fontSize:10,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:"#B6CFE4"}}>{h}</span>)
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
                                  <span style={{fontSize:12,fontWeight:700,color:"#FFFFFF"}}>{emp.ticket_medio_estimado?`R$ ${emp.ticket_medio_estimado.toLocaleString("pt-BR")}`:"—"}</span>
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

              <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"rgba(182,207,228,0.7)",textTransform:"uppercase",marginBottom:-4}}>
                Visão geral da base
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1fr) 330px",gap:16}}>
                <EvolucaoDaBase empresas={empresas}/>
                <PrecisamDeAtencao empresas={empresas}/>
              </div>
              </>
              )}
            </div>
          </div>
        </div>
      );
    }
      