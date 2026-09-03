import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { getToken } from "../../services/auth";
import useIsMobile from "../../hooks/useIsMobile";
import { openEmail, openWhatsApp } from "../../utils/commPrefs";
import {
  Plus, Send, Trash2, X, FileText, Package, Check, AlertCircle, Loader2,
  DollarSign, Wallet, Target, CalendarCheck, ArrowRight, Filter,
  ChevronDown, ChevronLeft, ChevronRight, Download, Upload, FileSpreadsheet,
  AlertTriangle, Hash, Building2, TrendingUp, Wrench,
} from "lucide-react";
import Dropdown from "../../components/Dropdown";
import { dataLocal, diasDesde, formatarData } from "../../utils/data";
import { brl, brlCurto } from "../../utils/moeda";
import { STATUS_ORCAMENTO as STATUS_INFO, STATUS_ORDEM, numeroOrcamento } from "../../utils/orcamento";
import GraficoAprovadoMensal, { DonutConversao, serieAprovadaPorMes, somaSerie } from "../../components/GraficoAprovadoMensal";
import { notificarOrcamentos, aoMudarOrcamentos } from "../../hooks/useValoresOrcamento";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

// Linhas por pagina da lista de orcamentos. A carteira inteira numa pagina so
// funcionava com dez orcamentos; nao funciona mais quando a conta cresce, e a
// rolagem infinita esconde o rodape com a soma.
const POR_PAGINA = 10;


const css = `
  /* flex-shrink:0 e o que faz a lista aparecer inteira: o painel e uma coluna
     flex com overflow:auto, e sem isso os cards encolhem para caber na altura
     da tela em vez de deixarem o painel rolar -- com overflow:hidden no card,
     o que sobra some. O backdrop-filter saiu junto: o fundo agora e opaco
     (nao havia o que borrar) e ele criava bloco de contencao para position:fixed,
     que foi o que cortou os modais de importacao e de orcamento. */
  .vp-card { background:#143354; border:1px solid rgba(126,176,219,0.16); border-radius:16px; flex-shrink:0; }
  .vp-inner { background:rgba(18,59,94,0.55); border:1px solid rgba(159,211,234,0.18); border-radius:12px; }
  .vp-num { font-variant-numeric:tabular-nums; }
  .vp-table { width:100%; border-collapse:collapse; font-size:12.5px; }
  .vp-table thead th { text-align:left; padding:10px 14px; font-size:10px; letter-spacing:0.07em; text-transform:uppercase; color:#9FD3EA; font-weight:800; border-bottom:1px solid rgba(159,211,234,0.18); white-space:nowrap; }
  .vp-table tbody td { padding:11px 14px; border-bottom:1px solid rgba(159,211,234,0.18); color:#EAF6FB; }
  .vp-table tbody tr:last-child td { border-bottom:0; }
  .vp-table tbody tr { transition:background 0.14s; }
  .vp-table tbody tr:hover { background:rgba(46,111,149,0.05); }
  .vp-table .r { text-align:right; }
  .vp-table .c { text-align:center; }
  .vp-row-link { cursor:pointer; }
  .vp-ghost { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; color:#EAF6FB; border:1px solid rgba(159,211,234,0.18); border-radius:9px; padding:6px 11px; background:rgba(18,59,94,0.55); cursor:pointer; transition:all 0.15s; font-family:inherit; }
  .vp-ghost:hover { color:#EAF6FB; border-color:rgba(159,211,234,0.30); }
  .vp-icon-btn { display:flex; align-items:center; justify-content:center; border:none; cursor:pointer; border-radius:8px; transition:all 0.15s; }
  .vp-icon-btn:hover { filter:brightness(0.94); }
  /* Remover/excluir em repouso e neutro -- pintado de vermelho o tempo todo,
     cada linha da lista lia como alerta. O vermelho entra so no hover, quando
     a acao esta a um clique de acontecer. */
  .vp-btn-remover { background:rgba(159,211,234,0.08); color:#9FD3EA; border:1px solid rgba(159,211,234,0.18); }
  .vp-btn-remover:hover { background:rgba(220,38,38,0.16); color:#FFC9C2; border-color:rgba(220,38,38,0.45); filter:none; }
  .vp-btn-remover:focus-visible { outline:2px solid rgba(220,38,38,0.5); outline-offset:2px; }
  .vp-chip { padding:5px 12px; border-radius:20px; border:1.5px solid rgba(159,211,234,0.18); background:rgba(18,59,94,0.55); font-size:11px; font-weight:700; cursor:pointer; transition:all 0.15s; color:#EAF6FB; font-family:inherit; }
  .vp-chip:hover { border-color:rgba(159,211,234,0.30); }
  .vp-tab { display:flex; align-items:center; gap:6px; padding:10px 4px; margin-right:18px; border:none; background:none; cursor:pointer; font-family:inherit; font-size:13px; border-bottom:2.5px solid transparent; margin-bottom:-1px; transition:color 0.15s; }
  .vp-facts > div { display:flex; justify-content:space-between; gap:10px; padding:7px 0; font-size:12.5px; border-bottom:1px solid rgba(159,211,234,0.18); }
  .vp-facts > div:last-child { border-bottom:0; }
  .vp-catalogo-btn:hover:not(:disabled) { border-color:rgba(159,211,234,0.30) !important; box-shadow:0 4px 14px rgba(41,128,185,0.20) !important; transform:translateY(-1px); }
  .vp-catalogo-btn:focus-visible { outline:2px solid rgba(159,211,234,0.30); outline-offset:2px; }
  .vp-catalogo-item:hover { background:rgba(46,111,149,0.07); }
  .vp-catalogo-item:focus-visible { outline:2px solid rgba(159,211,234,0.30); outline-offset:-2px; }
  .vp-catalogo-item:last-child { border-bottom:0; }
  .vp-avulso:focus-visible { outline:2px solid rgba(159,211,234,0.30); outline-offset:2px; }
  .vp-import-row:nth-child(even) { background:rgba(46,111,149,0.035); }
  .vp-pag { width:27px; height:27px; border-radius:8px; border:1px solid rgba(159,211,234,0.18); background:rgba(18,59,94,0.55); color:#9FD3EA; cursor:pointer; font-family:inherit; font-size:11.5px; font-weight:700; display:inline-flex; align-items:center; justify-content:center; transition:all 0.15s; }
  .vp-pag:hover:not(:disabled) { color:#EAF6FB; border-color:rgba(159,211,234,0.30); }
  .vp-pag:disabled { opacity:0.35; cursor:default; }
  .vp-pag.on { background:rgba(46,111,149,0.30); border-color:rgba(159,211,234,0.45); color:#EAF6FB; }
  /* Chips de tipo dentro do seletor de catalogo. Menores que o .vp-chip da
     lista de orcamentos: ali sao filtro de tela, aqui vivem dentro de um
     dropdown e competem por espaco com o campo de busca. */
  .vp-tipo { padding:4px 10px; border-radius:16px; border:1.5px solid rgba(159,211,234,0.22); background:#0F2E4B; font-size:10.5px; font-weight:700; cursor:pointer; transition:all 0.14s; color:#9FD3EA; font-family:inherit; white-space:nowrap; display:inline-flex; align-items:center; gap:5px; }
  .vp-tipo:hover { border-color:rgba(159,211,234,0.40); color:#EAF6FB; }
  .vp-tipo.on { background:rgba(46,111,149,0.34); border-color:rgba(159,211,234,0.50); color:#EAF6FB; }
  .vp-tipo:focus-visible { outline:2px solid rgba(159,211,234,0.45); outline-offset:2px; }
`;

type TipoCatalogo = "equipamento" | "servico";

interface Equipamento {
  equipamento_id: string;
  codigo: string | null;      // SKU — identifica o item numa reimportação
  nome: string;
  descricao: string | null;
  preco_base: number;
  quantidade: number;         // saldo em estoque (sempre 0 em serviço)
  // Opcional porque o backend pode estar atrás num deploy: sem o campo, tudo
  // cai em "equipamento", que é onde esses itens sempre estiveram.
  tipo?: TipoCatalogo;
  ativo: boolean;
}

/** Serviço e equipamento moram na mesma tabela; só o rótulo e o estoque mudam. */
const CATALOGO: Record<TipoCatalogo, {
  titulo: string; sub: string; rotulo: string; coluna: string;
  placeholder: string; icone: any; temEstoque: boolean;
  vazio: string; vazioSub: string; arquivo: string;
}> = {
  equipamento: {
    titulo: "Catálogo de equipamentos",
    sub: "Itens reutilizáveis na montagem dos orçamentos.",
    rotulo: "equipamento", coluna: "Equipamento",
    placeholder: "Nome do equipamento", icone: Package, temEstoque: true,
    vazio: "Nenhum equipamento no catálogo.",
    vazioSub: "Cadastre os itens que você costuma orçar.",
    arquivo: "modelo-catalogo-prospectageo.xlsx",
  },
  servico: {
    titulo: "Catálogo de serviços",
    sub: "Mão de obra que entra no orçamento junto com o equipamento — instalação, manutenção, treinamento.",
    rotulo: "serviço", coluna: "Serviço",
    placeholder: "Nome do serviço", icone: Wrench, temEstoque: false,
    vazio: "Nenhum serviço no catálogo.",
    vazioSub: "Cadastre o que você cobra além do equipamento.",
    arquivo: "modelo-servicos-prospectageo.xlsx",
  },
};

/** Item sem `tipo` (backend antigo) conta como equipamento. */
const tipoDe = (e: Equipamento): TipoCatalogo => e.tipo === "servico" ? "servico" : "equipamento";
interface Item {
  equipamento_id: string | null;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
}
interface Orcamento {
  orcamento_id: string;
  empresa_id: string;
  empresa_nome: string | null;
  titulo: string | null;
  observacoes: string | null;
  status: string;
  total: number;
  data_envio: string | null;
  data_decisao: string | null;
  criado_em: string | null;
  motivo_recusa: string | null;
  itens?: Item[];
  // Vem resolvido do GET /orcamentos. Opcionais de proposito: se o backend for
  // atras do front num deploy, a coluna mostra "—" em vez de quebrar a lista.
  vendedor_nome?: string | null;
  qtd_itens?: number | null;
  qtd_pecas?: number | null;
  item_principal?: string | null;
}
interface Insights {
  por_status: Record<string, { total: number; valor: number }>;
  total_orcamentos: number;
  valor_em_aberto: number;
  valor_aprovado: number;
  taxa_conversao: number;
  equipamentos_mais_orcados: { nome: string; quantidade: number; valor: number }[];
}
interface EmpresaOpt { empresa_id: string; nome: string }

// GET /orcamentos/{id}/previa-email — conteúdo pronto para envio manual.
interface PreviaEmail {
  destino: string | null;
  telefone: string | null;
  empresa_nome: string;
  assunto: string;
  texto: string;
}

const formatDate = (v?: string | null) => formatarData(v);

export default function VendasPanel({ empresas, statusInicial }: {
  empresas: EmpresaOpt[];
  /** Recorte ja escolhido em outra tela (deep link `?status=`). */
  statusInicial?: string;
}) {
  const isMobile = useIsMobile();
  const [sub, setSub] = useState<"orcamentos" | "equipamentos" | "servicos">("orcamentos");
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState(
    statusInicial && STATUS_ORDEM.includes(statusInicial) ? statusInicial : "todos");
  const [pagina, setPagina] = useState(1);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [editando, setEditando] = useState<Orcamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  // Quando o Resend recusa, o orçamento NÃO vira "enviado" (seria mentira: o
  // cliente não recebeu). Guardamos o motivo e a prévia para o vendedor mandar
  // por conta própria.
  const [falhaEnvio, setFalhaEnvio] = useState<{ id: string; motivo: string; previa: PreviaEmail | null } | null>(null);
  // Recusa pede um motivo antes de gravar — vira modal, nao window.prompt.
  const [recusando, setRecusando] = useState<Orcamento | null>(null);
  const [recusaEmCurso, setRecusaEmCurso] = useState(false);

  const hdrs = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken() || ""}`,
  });

  // GET /equipamentos sem `?tipo=` traz os dois catalogos numa requisicao so;
  // a separacao e aqui. Duas chamadas para dois recortes da mesma tabela
  // custariam o dobro para mostrar a mesma coisa.
  const soEquipamentos = useMemo(
    () => equipamentos.filter(e => tipoDe(e) === "equipamento"), [equipamentos]);
  const soServicos = useMemo(
    () => equipamentos.filter(e => tipoDe(e) === "servico"), [equipamentos]);

  // Quando este painel buscou por conta propria. Serve para ele nao repetir a
  // busca quando o aviso de mudanca chegar logo depois — nesse caso quem mudou
  // foi ele mesmo, e a lista ja esta vindo.
  const ultimaBusca = useRef(0);

  const fetchTudo = useCallback(async () => {
    ultimaBusca.current = Date.now();
    setLoading(true);
    try {
      const [oRes, eRes, iRes] = await Promise.all([
        fetch(`${API}/orcamentos`, { headers: hdrs() }),
        fetch(`${API}/equipamentos`, { headers: hdrs() }),
        fetch(`${API}/vendas/insights`, { headers: hdrs() }),
      ]);
      if (oRes.ok) setOrcamentos(await oRes.json());
      if (eRes.ok) setEquipamentos(await eRes.json());
      if (iRes.ok) setInsights(await iRes.json());
    } catch {
      setErro("Não foi possível carregar os dados de vendas.");
    }
    setLoading(false);
  }, []);

  // Recarrega este painel E avisa as telas que mostram o mesmo dinheiro por
  // outro angulo (o funil ao lado, o dashboard): mudar um orcamento para "em
  // negociacao" tem que mexer no numero de la na hora, sem F5.
  const recarregarTudo = useCallback(() => {
    // Avisa antes de esperar a propria recarga: as duas buscas correm em
    // paralelo e o numero de la nao fica atras do daqui.
    notificarOrcamentos();
    return fetchTudo();
  }, [fetchTudo]);

  // Carga inicial só na montagem.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchTudo(); }, []);

  // Orcamento mudou e nao foi aqui: outra pessoa mexeu, e o polling do store
  // percebeu. A lista e os insights sao copia local deste painel, entao
  // precisam ser rebuscados na mao — o store so cuida dos valores agregados.
  useEffect(() => aoMudarOrcamentos(() => {
    if (Date.now() - ultimaBusca.current < 2000) return;
    fetchTudo();
  }), [fetchTudo]);

  // Valor aprovado por mes, dos ultimos 6 meses. A conta mora no componente
  // do grafico, junto com o desenho.
  const serieMensal = useMemo(() => serieAprovadaPorMes(orcamentos), [orcamentos]);
  // O semestre anterior existe so para a variacao do KPI — e a leitura de
  // "estamos melhores ou piores", que o numero sozinho nao da.
  const serieAnterior = useMemo(() => serieAprovadaPorMes(orcamentos, 6, 6), [orcamentos]);
  const totalSemestre = somaSerie(serieMensal);
  const totalSemestreAnterior = somaSerie(serieAnterior);
  // Sem semestre anterior nao ha comparacao: qualquer numero daria "+100%" e
  // nao diria nada. Nesse caso o KPI fica sem selo.
  const variacaoSemestre = totalSemestreAnterior > 0
    ? ((totalSemestre - totalSemestreAnterior) / totalSemestreAnterior) * 100
    : null;

  const aprovados = orcamentos.filter(o => o.status === "aprovado");
  const ticketMedio = aprovados.length ? (insights?.valor_aprovado || 0) / aprovados.length : 0;
  const ultimaVenda = aprovados
    .map(o => o.data_decisao || o.data_envio)
    .filter(Boolean)
    .sort((a, b) => (dataLocal(b)?.getTime() ?? 0) - (dataLocal(a)?.getTime() ?? 0))[0] || null;
  // "ha 7 dias" responde antes da data: o que se quer saber e se esfriou.
  const diasUltima = ultimaVenda ? diasDesde(ultimaVenda) : null;
  const textoUltima = diasUltima === null || !Number.isFinite(diasUltima)
    ? "nada fechado ainda"
    : diasUltima === 0 ? "hoje"
    : diasUltima === 1 ? "ontem"
    : `há ${diasUltima} dias`;

  const visiveis = filtroStatus === "todos"
    ? orcamentos
    : orcamentos.filter(o => o.status === filtroStatus);

  // Paginacao. `paginaAtual` e derivada, nao o estado cru: excluir a ultima
  // linha de uma pagina nao pode deixar a lista vazia numa pagina que sumiu.
  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const primeiroDaPagina = (paginaAtual - 1) * POR_PAGINA;
  const naPagina = visiveis.slice(primeiroDaPagina, primeiroDaPagina + POR_PAGINA);
  const paginasVisiveis = (() => {
    const largura = 5;
    const fim = Math.min(totalPaginas, Math.max(1, paginaAtual - 2) + largura - 1);
    const ini = Math.max(1, fim - largura + 1);
    return Array.from({ length: fim - ini + 1 }, (_, i) => ini + i);
  })();

  const aplicarStatus = async (id: string, status: string, motivo_recusa: string | null) => {
    try {
      const res = await fetch(`${API}/orcamentos/${id}/status`, {
        method: "PUT", headers: hdrs(), body: JSON.stringify({ status, motivo_recusa }),
      });
      if (res.ok) recarregarTudo(); else setErro("Não foi possível mudar o status.");
    } catch { setErro("Erro de conexão ao mudar o status."); }
  };

  const mudarStatus = (id: string, status: string) => {
    // Recusar abre o modal; o status só é gravado quando ele for confirmado.
    // Fechar sem confirmar não muda nada — o dropdown segue o dado, não o clique.
    if (status === "recusado") {
      setRecusando(orcamentos.find(o => o.orcamento_id === id) || null);
      return;
    }
    aplicarStatus(id, status, null);
  };

  const confirmarRecusa = async (motivo: string) => {
    if (!recusando) return;
    setRecusaEmCurso(true);
    await aplicarStatus(recusando.orcamento_id, "recusado", motivo.trim() || null);
    setRecusaEmCurso(false);
    setRecusando(null);
  };

  const enviar = async (id: string) => {
    setEnviandoId(id); setErro(null); setFalhaEnvio(null);
    try {
      const res = await fetch(`${API}/orcamentos/${id}/enviar`, { method: "POST", headers: hdrs() });
      if (res.ok) { recarregarTudo(); setEnviandoId(null); return; }
      const d = await res.json().catch(() => ({}));
      const motivo = typeof d.detail === "string" ? d.detail : "Não foi possível enviar o orçamento.";
      // 502 = o email não saiu, mas o orçamento está íntegro. Oferecemos o
      // caminho manual em vez de deixar o vendedor sem saída.
      if (res.status === 502) {
        let previa: PreviaEmail | null = null;
        try {
          const pRes = await fetch(`${API}/orcamentos/${id}/previa-email`, { headers: hdrs() });
          if (pRes.ok) previa = await pRes.json();
        } catch { /* sem prévia, mostramos só o motivo */ }
        setFalhaEnvio({ id, motivo, previa });
      } else {
        setErro(motivo);
      }
    } catch { setErro("Erro de conexão ao enviar."); }
    setEnviandoId(null);
  };

  // Depois de enviar por fora, o vendedor marca o status na mão — o sistema não
  // tem como saber que o email saiu por outro canal.
  const marcarComoEnviado = async (id: string) => {
    try {
      const res = await fetch(`${API}/orcamentos/${id}/status`, {
        method: "PUT", headers: hdrs(), body: JSON.stringify({ status: "enviado" }),
      });
      if (res.ok) { setFalhaEnvio(null); recarregarTudo(); }
      else setErro("Não foi possível atualizar o status.");
    } catch { setErro("Erro de conexão ao atualizar o status."); }
  };

  const excluir = async (id: string) => {
    if (!window.confirm("Excluir este orçamento?")) return;
    try {
      const res = await fetch(`${API}/orcamentos/${id}`, { method: "DELETE", headers: hdrs() });
      if (res.ok) recarregarTudo();
    } catch { setErro("Erro ao excluir."); }
  };

  const abrirExistente = async (id: string) => {
    try {
      const res = await fetch(`${API}/orcamentos/${id}`, { headers: hdrs() });
      if (res.ok) setEditando(await res.json());
    } catch { setErro("Erro ao abrir o orçamento."); }
  };

  const abrirNovo = () => setEditando({
    orcamento_id: "", empresa_id: "", empresa_nome: null, titulo: "", observacoes: "",
    status: "rascunho", total: 0, data_envio: null, data_decisao: null,
    criado_em: null, motivo_recusa: null, itens: [],
  });

  const kpis = [
    { lab: "Valor aprovado", val: brlCurto(insights?.valor_aprovado), sub: `${aprovados.length} orçamento${aprovados.length === 1 ? "" : "s"} fechado${aprovados.length === 1 ? "" : "s"}`, icon: DollarSign, cor: "#83DDA8",
      badge: variacaoSemestre,
      title: variacaoSemestre !== null
        ? `${brl(totalSemestre)} nos últimos 6 meses contra ${brl(totalSemestreAnterior)} nos 6 anteriores`
        : "Soma de tudo que a carteira já aprovou." },
    { lab: "Em aberto",      val: brlCurto(insights?.valor_em_aberto), sub: "enviados e em negociação",  icon: Wallet,        cor: "#C9B6E4",
      badge: null, title: "Rascunho não entra: enquanto não foi ao cliente, não é dinheiro em jogo." },
    { lab: "Ticket médio",   val: brlCurto(ticketMedio),               sub: "por orçamento aprovado",    icon: Target,        cor: "#F2C879",
      badge: null, title: "Valor aprovado dividido pela quantidade de orçamentos aprovados." },
    { lab: "Último fechamento", val: formatDate(ultimaVenda),          sub: textoUltima, icon: CalendarCheck, cor: "#9FD3EA",
      badge: null, title: "Data da última aprovação da carteira." },
  ];

  return (
    <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px 14px 32px" : "18px 24px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{css}</style>

      {/* Faixa de indicadores */}
      <section className="vp-card" style={{ padding: isMobile ? 16 : 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color:"#EAF6FB", letterSpacing: "-0.01em" }}>Resumo da carteira</h3>
            <p style={{ fontSize: 12.5, color:"#9FD3EA", marginTop: 2 }}>
              {orcamentos.length} orçamento{orcamentos.length === 1 ? "" : "s"}
              {insights ? ` · ${insights.taxa_conversao}% de conversão` : ""}
            </p>
          </div>
          <button
            onClick={abrirNovo}
            style={{ display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 18px", borderRadius: 10, border:"none", cursor: "pointer", color:"#EAF6FB", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background:"linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite", boxShadow: "0 4px 14px rgba(159,211,234,0.30)" }}
          >
            <Plus style={{ width: 15, height: 15 }} /> Novo orçamento
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          {kpis.map(k => (
            <div key={k.lab} className="vp-inner" title={k.title} style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0, background:`${k.cor}1f` }}>
                <k.icon style={{ width: 18, height: 18, color:k.cor }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color:"#9FD3EA", fontWeight: 800, marginBottom: 3 }}>{k.lab}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span className="vp-num" style={{ fontSize: 18, fontWeight: 900, color:"#EAF6FB", letterSpacing: "-0.02em" }}>{k.val}</span>
                  {k.badge !== null && (
                    <span title="Últimos 6 meses contra os 6 anteriores"
                      style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 20, fontSize: 10, fontWeight: 800,
                        background: k.badge >= 0 ? "rgba(44,205,147,0.14)" : "rgba(248,113,113,0.14)",
                        color: k.badge >= 0 ? "#2CCD93" : "#F87171" }}>
                      <TrendingUp style={{ width: 10, height: 10, transform: k.badge >= 0 ? "none" : "scaleY(-1)" }} />
                      {k.badge >= 0 ? "+" : ""}{Math.round(k.badge)}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color:"#9FD3EA", marginTop: 2 }}>{k.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Abas do módulo */}
      <div style={{ display: "flex", alignItems: "center", borderBottom:"1px solid rgba(159,211,234,0.18)" }}>
        {([
          { key: "orcamentos" as const, label: "Orçamentos", icon: FileText },
          { key: "equipamentos" as const, label: "Equipamentos", icon: Package },
          { key: "servicos" as const, label: "Serviços", icon: Wrench },
        ]).map(t => {
          const on = sub === t.key;
          return (
            <button key={t.key} onClick={() => setSub(t.key)} className="vp-tab"
              style={{ color:on ? "#9FD3EA" : "#9FD3EA", fontWeight: on ? 800 : 600, borderBottomColor: on ? "#9FD3EA" : "transparent" }}>
              <t.icon style={{ width: 15, height: 15 }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {recusando && (
        <MotivoRecusaOrcamento
          orcamento={recusando}
          numero={numeroOrcamento(recusando)}
          salvando={recusaEmCurso}
          onCancelar={() => setRecusando(null)}
          onConfirmar={confirmarRecusa}
        />
      )}

      {falhaEnvio && (
        <FalhaEnvioOrcamento
          falha={falhaEnvio}
          onFechar={() => setFalhaEnvio(null)}
          onMarcarEnviado={() => marcarComoEnviado(falhaEnvio.id)}
        />
      )}

      {erro && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background:"rgba(220,38,38,0.07)", border:"1px solid rgba(220,38,38,0.25)" }}>
          <AlertCircle style={{ width: 15, height: 15, color:"#F7B8B1", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color:"#F7B8B1", flex: 1 }}>{erro}</span>
          <button onClick={() => setErro(null)} className="vp-icon-btn" style={{ background:"none", color:"#F7B8B1", width: 24, height: 24 }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 260, borderRadius: 16 }} />
      ) : sub === "equipamentos" || sub === "servicos" ? (
        <CatalogoItens
          tipo={sub === "servicos" ? "servico" : "equipamento"}
          itens={sub === "servicos" ? soServicos : soEquipamentos}
          hdrs={hdrs} onMudou={fetchTudo} onErro={setErro}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "minmax(0,1fr) 280px", gap: 16, alignItems: "start" }}>

          {/* Tabela de orçamentos */}
          <section className="vp-card" style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 18px", borderBottom:"1px solid rgba(159,211,234,0.18)", flexWrap: "wrap" }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 800, color:"#EAF6FB", letterSpacing: "-0.01em" }}>
                {filtroStatus === "todos" ? "Todos os orçamentos" : STATUS_INFO[filtroStatus].label}
              </h3>
              <button className="vp-ghost" onClick={() => setMostrarFiltros(v => !v)}>
                <Filter style={{ width: 14, height: 14 }} /> Filtros
              </button>
            </div>

            {mostrarFiltros && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "12px 18px", borderBottom:"1px solid rgba(159,211,234,0.18)" }}>
                {["todos", ...STATUS_ORDEM].map(s => {
                  const info = STATUS_INFO[s];
                  const on = filtroStatus === s;
                  const qtd = s === "todos" ? orcamentos.length : orcamentos.filter(o => o.status === s).length;
                  return (
                    <button key={s} onClick={() => { setFiltroStatus(s); setPagina(1); }} className="vp-chip"
                      style={on ? { borderColor: info ? info.color:"#9FD3EA", background: info ? info.bg : "rgba(159,211,234,0.55)", color: info ? info.color:"#9FD3EA" } : undefined}>
                      {info ? info.label : "Todos"} ({qtd})
                    </button>
                  );
                })}
              </div>
            )}

            {visiveis.length === 0 ? (
              <div style={{ padding: "56px 20px", textAlign: "center", color:"#9FD3EA" }}>
                <FileText style={{ width: 30, height: 30, marginBottom: 8 }} />
                <p style={{ fontSize: 13, fontWeight: 700 }}>Nenhum orçamento aqui.</p>
                <p style={{ fontSize: 11.5, marginTop: 4 }}>Clique em "Novo orçamento" para começar.</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table className="vp-table">
                    <thead>
                      <tr>
                        <th style={{ width: 28 }}>#</th>
                        <th>Nº</th>
                        <th>Empresa</th>
                        <th>Título / item</th>
                        <th className="r">Itens</th>
                        <th>Vendedor</th>
                        <th>Enviado</th>
                        <th className="r">Valor</th>
                        <th className="c">Status</th>
                        <th className="r">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {naPagina.map((o, i) => {
                        const info = STATUS_INFO[o.status] || STATUS_INFO.rascunho;
                        return (
                          <tr key={o.orcamento_id}>
                            <td className="vp-num" style={{ color:"#9FD3EA" }}>{primeiroDaPagina + i + 1}</td>
                            <td className="vp-num vp-row-link" onClick={() => abrirExistente(o.orcamento_id)} style={{ color:"#EAF6FB", whiteSpace: "nowrap" }}>
                              {numeroOrcamento(o)}
                            </td>
                            <td className="vp-row-link" onClick={() => abrirExistente(o.orcamento_id)} style={{ fontWeight: 700 }}>
                              {o.empresa_nome || "—"}
                            </td>
                            <td className="vp-row-link" onClick={() => abrirExistente(o.orcamento_id)} style={{ color:"#EAF6FB" }}>
                              {o.titulo || "Orçamento"}
                              {/* Item de maior valor do orçamento: diz do que a
                                  proposta trata sem obrigar a abri-la. */}
                              {o.item_principal && (
                                <span style={{ display: "block", fontSize: 10.5, color:"#9FD3EA", marginTop: 1 }}>
                                  {o.item_principal}
                                  {(o.qtd_itens || 0) > 1 ? ` +${(o.qtd_itens || 1) - 1}` : ""}
                                </span>
                              )}
                              {o.motivo_recusa && (
                                <span style={{ display: "block", fontSize: 10.5, color:"#F7B8B1", marginTop: 1, fontWeight: 600 }}>
                                  Recusa: {o.motivo_recusa}
                                </span>
                              )}
                            </td>
                            <td className="vp-num r" style={{ color:"#EAF6FB" }}
                              title={o.qtd_pecas != null ? `${o.qtd_pecas} peça(s) em ${o.qtd_itens} linha(s)` : undefined}>
                              {o.qtd_itens != null ? o.qtd_itens : "—"}
                            </td>
                            <td style={{ color: o.vendedor_nome ? "#EAF6FB" : "#9FD3EA", whiteSpace: "nowrap" }}>{o.vendedor_nome || "—"}</td>
                            <td className="vp-num" style={{ color:"#EAF6FB", whiteSpace: "nowrap" }}>{formatDate(o.data_envio)}</td>
                            <td className="vp-num r" style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{brl(o.total)}</td>
                            <td className="c">
                              {/* Envolve num inline-block para o `text-align:center`
                                  da celula alcancar o dropdown, que e bloco. */}
                              <div style={{ display: "inline-block", verticalAlign: "middle" }}>
                                <Dropdown
                                  valor={o.status}
                                  opcoes={STATUS_ORDEM.map(s => ({
                                    valor: s, rotulo: STATUS_INFO[s].label, cor: STATUS_INFO[s].color,
                                  }))}
                                  onChange={v => mudarStatus(o.orcamento_id, v)}
                                  ariaLabel={`Status do orçamento ${numeroOrcamento(o)}`}
                                  corAtiva={info.color}
                                  altura={30}
                                  largura={158}
                                />
                              </div>
                            </td>
                            <td className="r">
                              <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                                <button onClick={() => enviar(o.orcamento_id)} disabled={enviandoId === o.orcamento_id}
                                  title="Enviar por email ao contato da empresa" className="vp-icon-btn"
                                  style={{ width: 28, height: 28, background:"rgba(46,111,149,0.12)", color:"#9FD3EA", cursor: enviandoId === o.orcamento_id ? "wait" : "pointer" }}>
                                  {enviandoId === o.orcamento_id
                                    ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                                    : <Send style={{ width: 13, height: 13 }} />}
                                </button>
                                <button onClick={() => excluir(o.orcamento_id)} title="Excluir orçamento"
                                  aria-label={`Excluir orçamento ${numeroOrcamento(o)}`}
                                  className="vp-icon-btn vp-btn-remover" style={{ width: 28, height: 28 }}>
                                  <Trash2 style={{ width: 13, height: 13 }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 12, color:"#9FD3EA", borderTop:"1px solid rgba(159,211,234,0.18)" }}>
                  <span>
                    Mostrando {primeiroDaPagina + 1} a {primeiroDaPagina + naPagina.length} de {visiveis.length} orçamento{visiveis.length === 1 ? "" : "s"}
                    {filtroStatus !== "todos" ? ` (${orcamentos.length} no total)` : ""}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* A soma e do filtro inteiro, nao da pagina: o que interessa
                        e quanto vale o recorte, nao quanto coube na tela. */}
                    <span className="vp-num" style={{ fontWeight: 800, color:"#EAF6FB" }}
                      title="Soma de todos os orçamentos do filtro atual">
                      {brl(visiveis.reduce((s, o) => s + Number(o.total || 0), 0))}
                    </span>
                    {totalPaginas > 1 && (
                      <div style={{ display: "flex", gap: 5 }}>
                        <button className="vp-pag" onClick={() => setPagina(paginaAtual - 1)}
                          disabled={paginaAtual === 1} aria-label="Página anterior">
                          <ChevronLeft style={{ width: 13, height: 13 }} />
                        </button>
                        {paginasVisiveis.map(n => (
                          <button key={n} onClick={() => setPagina(n)}
                            className={`vp-pag${n === paginaAtual ? " on" : ""}`}
                            aria-current={n === paginaAtual ? "page" : undefined}
                            aria-label={`Página ${n}`}>
                            {n}
                          </button>
                        ))}
                        <button className="vp-pag" onClick={() => setPagina(paginaAtual + 1)}
                          disabled={paginaAtual === totalPaginas} aria-label="Próxima página">
                          <ChevronRight style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Rail lateral */}
          <aside style={{ display: isMobile ? "grid" : "flex", gridTemplateColumns: isMobile ? "repeat(auto-fit,minmax(230px,1fr))" : undefined, flexDirection: isMobile ? undefined : "column", gap: 16 }}>

            {/* Conversão */}
            <div className="vp-card" style={{ padding: 16 }}>
              <h4 style={{ fontSize: 12.5, fontWeight: 800, color:"#EAF6FB", marginBottom: 14 }}>Taxa de conversão</h4>
              <DonutConversao pct={insights?.taxa_conversao || 0} />
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <div className="vp-num" style={{ fontSize: 13, fontWeight: 800, color:"#EAF6FB" }}>
                  {insights?.por_status?.aprovado?.total || 0} aprovado{(insights?.por_status?.aprovado?.total || 0) === 1 ? "" : "s"}
                </div>
                <div className="vp-num" style={{ fontSize: 11, color:"#9FD3EA" }}>
                  de {(insights?.por_status?.aprovado?.total || 0) + (insights?.por_status?.recusado?.total || 0)} decidido(s)
                </div>
              </div>
            </div>

            {/* Série mensal */}
            <GraficoAprovadoMensal serie={serieMensal} />

            {/* Equipamentos mais orçados */}
            <div className="vp-card" style={{ padding: 16 }}>
              <h4 style={{ fontSize: 12.5, fontWeight: 800, color:"#EAF6FB", marginBottom: 10 }}>Mais orçados</h4>
              {!insights || insights.equipamentos_mais_orcados.length === 0 ? (
                <p style={{ fontSize: 11.5, color:"#9FD3EA", fontWeight: 600, padding: "12px 0" }}>Nada orçado ainda.</p>
              ) : (
                <dl className="vp-facts">
                  {insights.equipamentos_mais_orcados.slice(0, 5).map(e => (
                    <div key={e.nome}>
                      <dt style={{ color:"#EAF6FB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.nome}</dt>
                      <dd className="vp-num" style={{ fontWeight: 800, color:"#9FD3EA", flexShrink: 0 }}>{e.quantidade}x</dd>
                    </div>
                  ))}
                </dl>
              )}
              <button onClick={() => setSub("equipamentos")} className="vp-ghost" style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>
                Ver catálogo <ArrowRight style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </aside>
        </div>
      )}

      {editando && (
        <EditorOrcamento
          orcamento={editando}
          empresas={empresas}
          equipamentos={equipamentos.filter(e => e.ativo)}
          hdrs={hdrs}
          onFechar={() => setEditando(null)}
          onSalvo={() => { setEditando(null); recarregarTudo(); }}
          onErro={setErro}
        />
      )}
    </div>
  );
}

// ── Catálogo de equipamentos ──────────────────────────────────
function CatalogoItens({
  tipo, itens, hdrs, onMudou, onErro,
}: {
  tipo: TipoCatalogo;
  itens: Equipamento[];
  hdrs: () => Record<string, string>;
  onMudou: () => void;
  onErro: (m: string) => void;
}) {
  const cfg = CATALOGO[tipo];
  const Icone = cfg.icone;
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [preco, setPreco] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  // O modelo vem do backend (gerado a partir dos campos reais do catálogo) e
  // exige o header de autenticação — por isso não é um <a href> simples.
  const baixarModelo = async () => {
    setBaixando(true);
    try {
      const res = await fetch(`${API}/equipamentos/modelo-importacao?tipo=${tipo}`, {
        headers: { Authorization: hdrs().Authorization },
      });
      if (!res.ok) { onErro("Não foi possível gerar o modelo de importação."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = cfg.arquivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { onErro("Erro de conexão ao baixar o modelo."); }
    setBaixando(false);
  };

  const adicionar = async () => {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      const res = await fetch(`${API}/equipamentos`, {
        method: "POST", headers: hdrs(),
        body: JSON.stringify({
          nome: nome.trim(),
          codigo: codigo.trim() || null,
          preco_base: Number(preco.replace(",", ".")) || 0,
          quantidade: cfg.temEstoque ? Number(quantidade) || 0 : 0,
          tipo,
        }),
      });
      if (res.ok) { setNome(""); setCodigo(""); setPreco(""); setQuantidade(""); onMudou(); }
      else {
        const d = await res.json().catch(() => ({}));
        onErro(typeof d.detail === "string" ? d.detail : `Não foi possível cadastrar o ${cfg.rotulo}.`);
      }
    } catch { onErro("Erro de conexão ao cadastrar."); }
    setSalvando(false);
  };

  const desativar = async (id: string) => {
    try {
      const res = await fetch(`${API}/equipamentos/${id}`, { method: "DELETE", headers: hdrs() });
      if (res.ok) onMudou();
    } catch { onErro("Erro ao desativar."); }
  };

  const inputStyle = { height: 40, padding: "0 14px", borderRadius: 10, border:"1.5px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)", fontSize: 13, outline:"none", fontFamily: "inherit", color:"#EAF6FB" } as const;

  return (
    <section className="vp-card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "15px 18px", borderBottom:"1px solid rgba(159,211,234,0.18)", display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ fontSize: 14.5, fontWeight: 800, color:"#EAF6FB", letterSpacing: "-0.01em" }}>{cfg.titulo}</h3>
          <p style={{ fontSize: 12, color:"#9FD3EA", marginTop: 2 }}>{cfg.sub}</p>
        </div>
        {/* Estoque/catálogo em Excel: baixar o modelo oficial e importar de volta */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={baixarModelo} disabled={baixando} className="vp-ghost" style={{ height: 36, padding: "0 12px" }}>
            {baixando
              ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
              : <Download style={{ width: 13, height: 13 }} />}
            Baixar modelo
          </button>
          <button onClick={() => setImportando(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 9, border:"1.5px solid rgba(159,211,234,0.30)", background:"linear-gradient(135deg,rgba(46,111,149,0.12),rgba(26,188,156,0.10))", color:"#9FD3EA", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            <Upload style={{ width: 13, height: 13 }} /> Importar Excel
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "14px 18px", borderBottom:"1px solid rgba(159,211,234,0.18)" }}>
        <input value={codigo} onChange={e => setCodigo(e.target.value)} onKeyDown={e => e.key === "Enter" && adicionar()}
          placeholder="Código / SKU" aria-label={`Código ou SKU do ${cfg.rotulo}`} style={{ ...inputStyle, width: 130 }} />
        <input value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key === "Enter" && adicionar()}
          placeholder={cfg.placeholder} aria-label={cfg.placeholder} style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
        {/* Serviço não tem saldo para controlar: o campo sai do formulário em
            vez de ficar aceitando um número que ninguém usa. */}
        {cfg.temEstoque && (
          <input value={quantidade} onChange={e => setQuantidade(e.target.value.replace(/[^\d]/g, ""))} onKeyDown={e => e.key === "Enter" && adicionar()}
            placeholder="Qtd." aria-label="Quantidade em estoque" className="vp-num" style={{ ...inputStyle, width: 84, textAlign: "center" }} />
        )}
        <input value={preco} onChange={e => setPreco(e.target.value.replace(/[^\d.,]/g, ""))} onKeyDown={e => e.key === "Enter" && adicionar()}
          placeholder={cfg.temEstoque ? "Preço base" : "Valor"} aria-label={cfg.temEstoque ? "Preço base" : "Valor do serviço"} className="vp-num" style={{ ...inputStyle, width: 130 }} />
        <button onClick={adicionar} disabled={salvando || !nome.trim()}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 18px", height: 40, borderRadius: 10, border:"none", color:"#EAF6FB", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", background:"linear-gradient(135deg,#2E6F95,#2E6F95)", cursor: salvando || !nome.trim() ? "not-allowed" : "pointer", opacity: salvando || !nome.trim() ? 0.5 : 1 }}>
          <Plus style={{ width: 14, height: 14 }} /> Cadastrar
        </button>
      </div>

      {itens.length === 0 ? (
        <div style={{ padding: "56px 20px", textAlign: "center", color:"#9FD3EA" }}>
          <Icone style={{ width: 30, height: 30, marginBottom: 8 }} />
          <p style={{ fontSize: 13, fontWeight: 700 }}>{cfg.vazio}</p>
          <p style={{ fontSize: 11.5, marginTop: 4 }}>{cfg.vazioSub}</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="vp-table">
            <thead>
              <tr>
                <th>Código</th><th>{cfg.coluna}</th><th>Descrição</th>
                {cfg.temEstoque && <th className="c">Estoque</th>}
                <th className="r">{cfg.temEstoque ? "Preço base" : "Valor"}</th>
                <th className="r">Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.map(e => (
                <tr key={e.equipamento_id}>
                  <td className="vp-num" style={{ color:e.codigo ? "#EAF6FB" : "#9FD3EA", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {e.codigo || "—"}
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Icone style={{ width: 14, height: 14, color:"#9FD3EA", flexShrink: 0 }} />
                      {e.nome}
                    </span>
                  </td>
                  <td style={{ color:"#EAF6FB" }}>{e.descricao || "—"}</td>
                  {cfg.temEstoque && (
                    <td className="vp-num c" style={{ fontWeight: 700, color:e.quantidade > 0 ? "#83DDA8" : "#9FD3EA" }}>
                      {e.quantidade ?? 0}
                    </td>
                  )}
                  <td className="vp-num r" style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{brl(e.preco_base)}</td>
                  <td className="r">
                    <button onClick={() => desativar(e.equipamento_id)} className="vp-icon-btn vp-btn-remover"
                      title="Desativar — orçamentos antigos continuam intactos"
                      aria-label={`Desativar ${e.nome}`}
                      style={{ width: 28, height: 28, marginLeft: "auto" }}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {importando && (
        <ImportarCatalogo
          tipo={tipo}
          hdrs={hdrs}
          onFechar={() => setImportando(false)}
          onImportado={() => { setImportando(false); onMudou(); }}
        />
      )}
    </section>
  );
}

// ── Importação de catálogo/estoque por Excel ──────────────────
// Dois passos com o MESMO arquivo: o primeiro POST valida e devolve a prévia
// (nada é gravado), o segundo confirma. O mapeamento das colunas é feito no
// backend pelo NOME do cabeçalho — reordenar colunas no Excel não embaralha os
// dados. Aqui só mostramos o que o servidor entendeu antes de gravar.
interface LinhaPrevia {
  linha: number;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  quantidade: number;
  preco_base: number;
  acao: "criar" | "atualizar";
}
interface Previa {
  colunas_reconhecidas: Record<string, number>;
  linha_cabecalho: number;
  total_linhas: number;
  validos: LinhaPrevia[];
  erros: string[];
  resumo: { validos: number; com_erro: number; criar: number; atualizar: number };
}

function ImportarCatalogo({
  tipo, hdrs, onFechar, onImportado,
}: {
  tipo: TipoCatalogo;
  hdrs: () => Record<string, string>;
  onFechar: () => void;
  onImportado: () => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const enviar = async (f: File, confirmar: boolean) => {
    setOcupado(true);
    setErro(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", f);
      // Só o Authorization: o Content-Type do multipart é montado pelo browser.
      const res = await fetch(`${API}/equipamentos/importar?confirmar=${confirmar}&tipo=${tipo}`, {
        method: "POST",
        headers: { Authorization: hdrs().Authorization },
        body: fd,
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Traduz o erro técnico do backend em algo acionável, sem "Erro 500".
        setErro(typeof dados.detail === "string"
          ? dados.detail
          : "Não foi possível ler a planilha. Confira se é um arquivo .xlsx válido.");
        if (confirmar) setPrevia(p => p);
        return;
      }
      if (confirmar) {
        setSucesso(`Importação concluída: ${dados.criados} item(ns) criado(s) e ${dados.atualizados} atualizado(s).`);
        setTimeout(onImportado, 1400);
      } else {
        setPrevia(dados as Previa);
      }
    } catch {
      setErro("Erro de conexão ao enviar a planilha.");
    }
    setOcupado(false);
  };

  const escolher = (f: File | null) => {
    setPrevia(null); setErro(null); setSucesso(null); setArquivo(f);
    if (f) enviar(f, false);
  };

  const podeGravar = !!previa && previa.resumo.com_erro === 0 && previa.resumo.validos > 0;

  return createPortal(
    <div onClick={onFechar}
      style={{ position: "fixed", inset: 0, zIndex: 70, background:"rgba(10,31,51,0.42)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", background:"#143354", borderRadius: 18, padding: 24, boxShadow: "0 24px 64px rgba(10,31,51,0.32)" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background:"rgba(39,174,96,0.14)", display: "grid", placeItems: "center" }}>
            <FileSpreadsheet style={{ width: 17, height: 17, color:"#83DDA8" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color:"#EAF6FB" }}>
              Importar {tipo === "servico" ? "serviços" : "catálogo"} do Excel
            </div>
            <div style={{ fontSize: 11.5, color:"#9FD3EA", marginTop: 1 }}>
              As colunas são reconhecidas pelo nome do cabeçalho — pode reordená-las à vontade.
            </div>
          </div>
          <button onClick={onFechar} className="vp-icon-btn" aria-label="Fechar"
            style={{ width: 30, height: 30, background:"rgba(159,211,234,0.08)", color:"#EAF6FB" }}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* Passo 1 — escolher o arquivo */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={ocupado}
          style={{
            width: "100%", padding: "22px 16px", borderRadius: 12, cursor: ocupado ? "wait" : "pointer",
            border:"1.5px dashed rgba(159,211,234,0.30)", background:"rgba(46,111,149,0.05)",
            fontFamily: "inherit", textAlign: "center",
          }}
        >
          <Upload style={{ width: 20, height: 20, color:"#9FD3EA" }} />
          <div style={{ fontSize: 13, fontWeight: 800, color:"#9FD3EA", marginTop: 6 }}>
            {arquivo ? arquivo.name : "Escolher planilha (.xlsx)"}
          </div>
          <div style={{ fontSize: 11, color:"#9FD3EA", marginTop: 2 }}>
            {arquivo ? "Clique para trocar o arquivo" : "Use o modelo de importação para garantir os nomes das colunas"}
          </div>
        </button>
        <input ref={inputRef} type="file" accept=".xlsx,.xlsm" style={{ display: "none" }}
          onChange={e => escolher(e.target.files?.[0] || null)} />

        {ocupado && !sucesso && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 12.5, fontWeight: 700, color:"#EAF6FB" }}>
            <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
            Lendo e validando a planilha…
          </div>
        )}

        {erro && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, padding: "11px 13px", borderRadius: 10, background:"rgba(220,38,38,0.07)", border:"1px solid rgba(220,38,38,0.2)" }}>
            <AlertTriangle style={{ width: 15, height: 15, color:"#F7B8B1", flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color:"#F7B8B1", lineHeight: 1.45 }}>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, padding: "11px 13px", borderRadius: 10, background:"rgba(39,174,96,0.09)", border:"1px solid rgba(39,174,96,0.25)" }}>
            <Check style={{ width: 15, height: 15, color:"#83DDA8", flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color:"#83DDA8" }}>{sucesso}</span>
          </div>
        )}

        {/* Passo 2 — prévia do que será gravado */}
        {previa && !sucesso && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {[
                { rotulo: "Linhas lidas", valor: previa.total_linhas, cor: "#9FD3EA" },
                { rotulo: "Válidas", valor: previa.resumo.validos, cor: "#83DDA8" },
                { rotulo: "Com erro", valor: previa.resumo.com_erro, cor: previa.resumo.com_erro ? "#F7B8B1" : "#9FD3EA" },
                { rotulo: "Novos", valor: previa.resumo.criar, cor: "#9FD3EA" },
                { rotulo: "Atualizados", valor: previa.resumo.atualizar, cor: "#F2C879" },
              ].map(c => (
                <div key={c.rotulo} style={{ flex: "1 1 96px", padding: "9px 11px", borderRadius: 10, background:"rgba(18,59,94,0.55)", border:"1px solid rgba(159,211,234,0.18)" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color:"#9FD3EA" }}>{c.rotulo}</div>
                  <div className="vp-num" style={{ fontSize: 18, fontWeight: 900, color:c.cor }}>{c.valor}</div>
                </div>
              ))}
            </div>

            {/* Prova de que o servidor casou cada coluna pelo cabeçalho */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12, fontSize: 11, color:"#9FD3EA" }}>
              <Hash style={{ width: 12, height: 12 }} />
              <span style={{ fontWeight: 700 }}>Colunas reconhecidas:</span>
              {Object.keys(previa.colunas_reconhecidas).map(nome => (
                <span key={nome} style={{ padding: "2px 8px", borderRadius: 20, background:"rgba(46,111,149,0.1)", color:"#9FD3EA", fontWeight: 700 }}>{nome}</span>
              ))}
            </div>

            {previa.erros.length > 0 && (
              <div style={{ marginBottom: 12, padding: "11px 13px", borderRadius: 10, background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.2)" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color:"#F7B8B1", marginBottom: 6 }}>
                  {previa.resumo.com_erro} problema(s) — corrija na planilha e envie de novo:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
                  {previa.erros.map((e, i) => (
                    <li key={i} style={{ fontSize: 12, color:"#F7B8B1", lineHeight: 1.45 }}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {previa.validos.length > 0 && (
              <div style={{ maxHeight: 240, overflowY: "auto", borderRadius: 10, border:"1px solid rgba(159,211,234,0.18)" }}>
                <table className="vp-table">
                  <thead>
                    <tr><th>Linha</th><th>Código</th><th>Nome</th><th className="r">Qtd</th><th className="r">Preço</th><th>Ação</th></tr>
                  </thead>
                  <tbody>
                    {previa.validos.map(l => (
                      <tr key={l.linha} className="vp-import-row">
                        <td className="vp-num" style={{ color:"#9FD3EA" }}>{l.linha}</td>
                        <td className="vp-num">{l.codigo || "—"}</td>
                        <td style={{ fontWeight: 700 }}>{l.nome}</td>
                        <td className="vp-num r">{l.quantidade}</td>
                        <td className="vp-num r" style={{ whiteSpace: "nowrap" }}>{brl(l.preco_base)}</td>
                        <td>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 20,
                            background:l.acao === "criar" ? "rgba(46,111,149,0.12)" : "rgba(214,137,16,0.14)",
                            color:l.acao === "criar" ? "#9FD3EA" : "#a9700c" }}>
                            {l.acao === "criar" ? "novo" : "atualiza"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {previa.resumo.validos === 0 && previa.resumo.com_erro === 0 && (
              <div style={{ padding: "26px 14px", textAlign: "center", fontSize: 12.5, fontWeight: 700, color:"#9FD3EA" }}>
                A planilha não tem nenhuma linha preenchida.
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18, paddingTop: 14, borderTop:"1px solid rgba(126,176,219,0.16)", position: "sticky", bottom: -24, background:"#143354", paddingBottom: 24, marginBottom: -24, marginInline: -24, paddingInline: 24 }}>
          <button onClick={onFechar} className="vp-ghost" style={{ height: 40, padding: "0 16px", fontSize: 13 }}>
            {sucesso ? "Fechar" : "Cancelar"}
          </button>
          <button
            onClick={() => arquivo && enviar(arquivo, true)}
            disabled={!podeGravar || ocupado || !!sucesso}
            title={previa && previa.resumo.com_erro > 0 ? "Corrija os erros antes de importar" : undefined}
            style={{
              display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 20px", borderRadius: 10,
              border:"none", color:"#EAF6FB", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              background:"linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize: "200% 200%",
              animation: "gradientShift 4s ease infinite",
              cursor: podeGravar && !ocupado && !sucesso ? "pointer" : "not-allowed",
              opacity: podeGravar && !ocupado && !sucesso ? 1 : 0.5,
            }}>
            {ocupado
              ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
              : <Check style={{ width: 14, height: 14 }} />}
            Confirmar importação
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Editor de orçamento ───────────────────────────────────────
function EditorOrcamento({
  orcamento, empresas, equipamentos, hdrs, onFechar, onSalvo, onErro,
}: {
  orcamento: Orcamento;
  empresas: EmpresaOpt[];
  equipamentos: Equipamento[];
  hdrs: () => Record<string, string>;
  onFechar: () => void;
  onSalvo: () => void;
  onErro: (m: string) => void;
}) {
  const novo = !orcamento.orcamento_id;
  const [empresaId, setEmpresaId] = useState(orcamento.empresa_id || "");
  const [titulo, setTitulo] = useState(orcamento.titulo || "");
  const [observacoes, setObservacoes] = useState(orcamento.observacoes || "");
  const [itens, setItens] = useState<Item[]>(orcamento.itens || []);
  const [salvando, setSalvando] = useState(false);

  const total = itens.reduce((s, i) => s + (i.quantidade || 1) * (i.preco_unitario || 0), 0);

  const addDoCatalogo = (equipamentoId: string) => {
    const eq = equipamentos.find(e => e.equipamento_id === equipamentoId);
    if (!eq) return;
    setItens(prev => [...prev, {
      equipamento_id: eq.equipamento_id, descricao: eq.nome,
      quantidade: 1, preco_unitario: Number(eq.preco_base) || 0,
    }]);
  };

  const mudarItem = (idx: number, patch: Partial<Item>) =>
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const salvar = async () => {
    if (!empresaId) { onErro("Escolha a empresa do orçamento."); return; }
    setSalvando(true);
    try {
      const body = JSON.stringify({
        empresa_id: empresaId,
        titulo: titulo.trim() || "Orçamento",
        observacoes,
        itens: itens.map(i => ({
          equipamento_id: i.equipamento_id,
          descricao: i.descricao.trim() || "Item",
          quantidade: Math.max(1, Number(i.quantidade) || 1),
          preco_unitario: Number(i.preco_unitario) || 0,
        })),
      });
      const res = novo
        ? await fetch(`${API}/orcamentos`, { method: "POST", headers: hdrs(), body })
        : await fetch(`${API}/orcamentos/${orcamento.orcamento_id}`, { method: "PUT", headers: hdrs(), body });
      if (res.ok) onSalvo();
      else {
        const d = await res.json().catch(() => ({}));
        onErro(d.detail || "Não foi possível salvar o orçamento.");
      }
    } catch { onErro("Erro de conexão ao salvar."); }
    setSalvando(false);
  };

  const label = { fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color:"#9FD3EA", textTransform: "uppercase" } as const;
  const field = { width: "100%", height: 42, padding: "0 12px", borderRadius: 10, border:"1.5px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)", fontSize: 13, marginTop: 5, outline:"none", fontFamily: "inherit", color:"#EAF6FB" } as const;

  return createPortal(
    <div onClick={onFechar}
      style={{ position: "fixed", inset: 0, zIndex: 60, background:"rgba(10,31,51,0.42)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 660, maxHeight: "90vh", overflowY: "auto", background:"#143354", borderRadius: 18, padding: 24, boxShadow: "0 24px 64px rgba(10,31,51,0.32)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background:"rgba(46,111,149,0.12)", display: "grid", placeItems: "center" }}>
            <FileText style={{ width: 17, height: 17, color:"#9FD3EA" }} />
          </div>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 900, color:"#EAF6FB" }}>
            {novo ? "Novo orçamento" : "Editar orçamento"}
          </div>
          <button onClick={onFechar} className="vp-icon-btn" style={{ width: 30, height: 30, background:"rgba(159,211,234,0.08)", color:"#EAF6FB" }}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={label} htmlFor="orc-empresa">Empresa</label>
            {/* Era um <select> nativo: no Windows a lista abre branca, com a
                fonte do sistema, destoando do resto da tela. */}
            <div style={{ marginTop: 5 }}>
              <Dropdown
                id="orc-empresa" ariaLabel="Empresa do orçamento"
                valor={empresaId} onChange={setEmpresaId} disabled={!novo}
                placeholder="Selecione a empresa…"
                busca={empresas.length > 8}
                opcoes={empresas.map(e => ({ valor: e.empresa_id, rotulo: e.nome, icone: Building2 }))}
              />
            </div>
          </div>

          <div>
            <label style={label} htmlFor="orc-titulo">Título</label>
            <input id="orc-titulo" value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="Ex.: Locação de equipamentos — evento de junho" style={field} />
          </div>

          <div>
            {/* ITENS — o caminho principal é pegar do catálogo; item avulso é a
                alternativa. Antes os dois pareciam a mesma coisa e o usuário
                achava que precisava digitar tudo à mão. */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={label}>Itens do orçamento</span>
              {itens.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, color:"#9FD3EA", background:"rgba(46,111,149,0.1)", padding: "2px 8px", borderRadius: 20 }}>
                  {itens.length}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "stretch" }}>
              <SeletorCatalogo equipamentos={equipamentos} onEscolher={addDoCatalogo} />
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
                <button
                  onClick={() => setItens(prev => [...prev, { equipamento_id: null, descricao: "", quantidade: 1, preco_unitario: 0 }])}
                  className="vp-ghost vp-avulso" style={{ height: 38, padding: "0 14px", whiteSpace: "nowrap" }}>
                  <Plus style={{ width: 13, height: 13 }} /> Item avulso
                </button>
                <span style={{ fontSize: 9.5, fontWeight: 600, color:"#9FD3EA", textAlign: "center" }}>
                  fora do catálogo
                </span>
              </div>
            </div>

            {itens.length === 0 ? (
              <div style={{ padding: "18px 12px", textAlign: "center", borderRadius: 10, border:"1.5px dashed rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)" }}>
                <Package style={{ width: 22, height: 22, color:"#9FD3EA" }} />
                <p style={{ fontSize: 12, fontWeight: 700, color:"#9FD3EA", marginTop: 6 }}>
                  Nenhum item ainda.
                </p>
                <p style={{ fontSize: 11, color:"#9FD3EA", marginTop: 2 }}>
                  {equipamentos.length > 0
                    ? "Comece por “Adicionar do catálogo” — os preços já vêm preenchidos."
                    : "Cadastre equipamentos no catálogo para reaproveitá-los aqui."}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Cabeçalho das colunas. Sem ele, o item avulso entra como
                    "Descrição · 1 · 0" e não dá para saber qual campo é a
                    quantidade e qual é o preço. */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "0 2px 2px" }}>
                  <span style={{ width: 24, flexShrink: 0 }} />
                  <span style={{ ...label, flex: 1, minWidth: 0 }}>Descrição</span>
                  <span style={{ ...label, width: 62, flexShrink: 0, textAlign: "center" }}>Qtd.</span>
                  <span style={{ ...label, width: 104, flexShrink: 0, textAlign: "right" }}>Valor unit.</span>
                  <span style={{ width: 32, flexShrink: 0 }} />
                </div>
                {itens.map((it, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {/* Origem do item: do catálogo (ícone cheio) ou avulso (contorno) */}
                    <span
                      aria-hidden
                      title={it.equipamento_id ? "Item do catálogo" : "Item avulso"}
                      style={{
                        width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center",
                        background:it.equipamento_id ? "rgba(46,111,149,0.12)" : "transparent",
                        border:it.equipamento_id ? "none" : "1.5px dashed rgba(159,211,234,0.18)",
                      }}
                    >
                      {it.equipamento_id
                        ? <Package style={{ width: 12, height: 12, color:"#9FD3EA" }} />
                        : <Plus style={{ width: 11, height: 11, color:"#9FD3EA" }} />}
                    </span>
                    <input value={it.descricao} onChange={e => mudarItem(idx, { descricao: e.target.value })}
                      placeholder="Ex.: Gerador 15 kVA" aria-label="Descrição do item"
                      style={{ ...field, marginTop: 0, flex: 1, minWidth: 0, height: 36, fontSize: 12 }} />
                    <input type="number" min={1} value={it.quantidade} aria-label="Quantidade"
                      onChange={e => mudarItem(idx, { quantidade: Number(e.target.value) })} className="vp-num"
                      style={{ ...field, marginTop: 0, width: 62, height: 36, fontSize: 12, textAlign: "center", padding: "0 6px" }} />
                    <input type="number" min={0} step="0.01" value={it.preco_unitario} aria-label="Preço unitário"
                      onChange={e => mudarItem(idx, { preco_unitario: Number(e.target.value) })} className="vp-num"
                      style={{ ...field, marginTop: 0, width: 104, height: 36, fontSize: 12, textAlign: "right", padding: "0 8px" }} />
                    {/* Botão neutro: o vermelho só aparece no hover (regra
                        .vp-btn-remover). Pintado o tempo todo, cada linha da
                        lista virava um alerta. */}
                    <button onClick={() => setItens(prev => prev.filter((_, i) => i !== idx))}
                      className="vp-icon-btn vp-btn-remover" aria-label="Remover item" title="Remover item"
                      style={{ width: 32, height: 36, flexShrink: 0 }}>
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={label} htmlFor="orc-obs">Observações</label>
            <textarea id="orc-obs" value={observacoes} onChange={e => setObservacoes(e.target.value)}
              placeholder="Condições de pagamento, prazo de entrega…"
              style={{ ...field, height: "auto", minHeight: 70, padding: "10px 12px", resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 10, borderTop:"1px solid rgba(159,211,234,0.18)", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color:"#9FD3EA", textTransform: "uppercase", letterSpacing: "0.07em" }}>Total</div>
              <div className="vp-num" style={{ fontSize: 21, fontWeight: 900, color:"#EAF6FB", letterSpacing: "-0.02em" }}>{brl(total)}</div>
            </div>
            <button onClick={onFechar} className="vp-ghost" style={{ height: 42, padding: "0 18px", fontSize: 13 }}>Cancelar</button>
            <button onClick={salvar} disabled={salvando}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 20px", height: 42, borderRadius: 10, border:"none", color:"#EAF6FB", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background:"linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite", cursor: salvando ? "wait" : "pointer", opacity: salvando ? 0.7 : 1 }}>
              {salvando
                ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                : <Check style={{ width: 14, height: 14 }} />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Seletor de catálogo ───────────────────────────────────────
// Ação PRINCIPAL da área de itens. Era um <select> nativo que se confundia com
// os outros campos do formulário; virou um botão em destaque que abre uma lista
// com busca, mostrando nome, descrição e preço de cada item de forma legível
// (o <select> nativo só permite uma linha de texto por opção).
function SeletorCatalogo({
  equipamentos, onEscolher,
}: {
  equipamentos: Equipamento[];
  onEscolher: (equipamentoId: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  // "todos" e o padrao: com o catalogo pequeno, abrir ja filtrado esconderia
  // metade dos itens de quem so quer olhar a lista.
  const [filtroTipo, setFiltroTipo] = useState<TipoCatalogo | "todos">("todos");
  const caixa = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  // Tipo e busca se combinam: buscar DENTRO do tipo escolhido. Filtrar so por
  // um dos dois faria o contador e a lista discordarem.
  const doTipo = useMemo(
    () => filtroTipo === "todos" ? equipamentos : equipamentos.filter(e => tipoDe(e) === filtroTipo),
    [equipamentos, filtroTipo]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return doTipo;
    return doTipo.filter(e =>
      e.nome.toLowerCase().includes(q) ||
      (e.descricao || "").toLowerCase().includes(q) ||
      (e.codigo || "").toLowerCase().includes(q)
    );
  }, [doTipo, busca]);

  // Agrupado por tipo, na ordem em que a venda acontece: o equipamento primeiro,
  // o servico que vai junto com ele depois. Misturado, "Instalação" no meio de
  // bombas e painéis não se lê como serviço.
  const grupos = useMemo(() => ([
    { tipo: "equipamento" as TipoCatalogo, itens: filtrados.filter(e => tipoDe(e) === "equipamento") },
    { tipo: "servico" as TipoCatalogo, itens: filtrados.filter(e => tipoDe(e) === "servico") },
  ].filter(g => g.itens.length > 0)), [filtrados]);

  const vazio = equipamentos.length === 0;
  const qtdServicos = equipamentos.filter(e => tipoDe(e) === "servico").length;
  const qtdEquipamentos = equipamentos.length - qtdServicos;

  // O subtitulo do botao conta o RECORTE ATIVO, nao o catalogo inteiro: com o
  // filtro em "Servicos", dizer "12 itens disponiveis" contradiz a lista logo
  // abaixo, que mostra 2.
  const resumo = (() => {
    if (vazio) return "Nenhum item cadastrado ainda";
    const n = doTipo.length;
    const unidade = n === 1 ? "item" : "itens";
    if (filtroTipo === "servico") return `${n} ${n === 1 ? "serviço" : "serviços"} — preço já preenchido`;
    if (filtroTipo === "equipamento") return `${n} ${unidade} — preço já preenchido`;
    return `${n} ${unidade} ${n === 1 ? "disponível" : "disponíveis"}`
      + (qtdServicos > 0 ? `, ${qtdServicos} serviço${qtdServicos === 1 ? "" : "s"}` : "")
      + " — preço já preenchido";
  })();

  const ABAS_TIPO: { chave: TipoCatalogo | "todos"; rotulo: string; qtd: number }[] = [
    { chave: "todos", rotulo: "Todos", qtd: equipamentos.length },
    { chave: "equipamento", rotulo: "Materiais/Equipamentos", qtd: qtdEquipamentos },
    { chave: "servico", rotulo: "Serviços", qtd: qtdServicos },
  ];

  return (
    <div ref={caixa} style={{ position: "relative", flex: 1, minWidth: 230 }}>
      <button
        type="button"
        onClick={() => { if (!vazio) { setAberto(a => !a); setBusca(""); setFiltroTipo("todos"); } }}
        disabled={vazio}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className="vp-catalogo-btn"
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          height: 52, padding: "0 14px", borderRadius: 12, cursor: vazio ? "not-allowed" : "pointer",
          fontFamily: "inherit", textAlign: "left", opacity: vazio ? 0.6 : 1,
          border:`1.5px solid ${aberto ? "rgba(159,211,234,0.45)" : "rgba(159,211,234,0.22)"}`,
          background:"#123253",
          boxShadow: aberto ? "0 0 0 3px rgba(86,164,245,0.16)" : "none",
          transition: "all 0.16s ease",
        }}
      >
        <span aria-hidden style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "grid", placeItems: "center",
          background:"linear-gradient(135deg,#2E6F95,#2E6F95)", boxShadow: "0 3px 10px rgba(46,111,149,0.35)",
        }}>
          <Package style={{ width: 16, height: 16, color:"#fff" }} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 800, color:"#EAF6FB", letterSpacing: "-0.01em" }}>
            Adicionar do catálogo
          </span>
          {/* era rgba(21,84,127,0.62) — azul escuro sobre fundo naval, ilegível */}
          <span style={{ display: "block", fontSize: 10.5, fontWeight: 600, color:"#9FD3EA", marginTop: 1 }}>
            {resumo}
          </span>
        </span>
        <ChevronDown style={{ width: 15, height: 15, color:"#9FD3EA", flexShrink: 0, transform: aberto ? "rotate(180deg)" : "none", transition: "transform 0.16s" }} />
      </button>

      {aberto && (
        // Painel OPACO: com fundo translúcido o formulário atrás vazava por
        // baixo dos itens e a lista virava um borrão.
        <div role="listbox" aria-label="Itens do catálogo" style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20,
          maxHeight: 300, overflowY: "auto", borderRadius: 12, background:"#12385C",
          border:"1px solid rgba(159,211,234,0.45)", boxShadow: "0 18px 48px rgba(3,14,26,0.55)",
        }}>
          <div style={{ position: "sticky", top: 0, background:"#12385C", padding: 8, borderBottom:"1px solid rgba(159,211,234,0.22)", zIndex: 1 }}>
            {/* Segmentacao por tipo ACIMA da busca: primeiro se escolhe onde
                procurar, depois o que procurar. O contador de cada chip mostra
                o tamanho do recorte antes de entrar nele. */}
            <div role="tablist" aria-label="Tipo de item" style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {ABAS_TIPO.map(t => (
                <button
                  key={t.chave} type="button" role="tab"
                  aria-selected={filtroTipo === t.chave}
                  onClick={() => setFiltroTipo(t.chave)}
                  className={`vp-tipo${filtroTipo === t.chave ? " on" : ""}`}
                >
                  {t.rotulo}
                  <span style={{ opacity: 0.75, fontWeight: 800 }}>{t.qtd}</span>
                </button>
              ))}
            </div>
            <input
              autoFocus value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar no catálogo…" aria-label="Buscar no catálogo"
              style={{
                width: "100%", height: 34, padding: "0 12px", borderRadius: 8, fontSize: 12,
                border:"1.5px solid rgba(159,211,234,0.22)", background:"#0F2E4B",
                outline:"none", fontFamily: "inherit", color:"#EAF6FB",
              }}
            />
          </div>
          {filtrados.length === 0 ? (
            <div style={{ padding: "22px 14px", textAlign: "center", fontSize: 12, fontWeight: 600, color:"#9FD3EA" }}>
              {/* Sem esta distincao, filtrar em "Servicos" num catalogo so de
                  equipamentos dizia 'nenhum item para ""' e parecia bug. */}
              {busca.trim()
                ? <>Nenhum item encontrado para “{busca}”{filtroTipo !== "todos" ? " neste tipo" : ""}.</>
                : filtroTipo === "servico" ? "Nenhum serviço no catálogo."
                : filtroTipo === "equipamento" ? "Nenhum equipamento no catálogo."
                : "Nenhum item no catálogo."}
            </div>
          ) : grupos.map(g => (
            <div key={g.tipo}>
              {/* O cabeçalho só aparece quando há os dois grupos: com um tipo
                  só ele vira ruído em cima de uma lista que já é homogênea. */}
              {grupos.length > 1 && (
                <div style={{
                  padding: "7px 12px", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.09em",
                  textTransform: "uppercase", color:"#9FD3EA", background:"rgba(46,111,149,0.16)",
                  borderBottom:"1px solid rgba(159,211,234,0.18)",
                }}>
                  {g.tipo === "servico" ? "Serviços" : "Equipamentos"}
                </div>
              )}
              {g.itens.map(eq => (
            <button
              key={eq.equipamento_id} role="option" aria-selected={false} type="button"
              onClick={() => { onEscolher(eq.equipamento_id); setAberto(false); }}
              className="vp-catalogo-item"
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                border:"none", borderBottom:"1px solid rgba(159,211,234,0.18)", background:"none",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              }}
            >
              {g.tipo === "servico"
                ? <Wrench style={{ width: 14, height: 14, color:"#C9B6E4", flexShrink: 0 }} />
                : <Package style={{ width: 14, height: 14, color:"#9FD3EA", flexShrink: 0 }} />}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color:"#EAF6FB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {eq.nome}
                  {eq.codigo && (
                    <span style={{ fontSize: 10, fontWeight: 700, color:"#9FD3EA", marginLeft: 6 }}>{eq.codigo}</span>
                  )}
                </span>
                {eq.descricao && (
                  <span style={{ display: "block", fontSize: 11, color:"#9FD3EA", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {eq.descricao}
                  </span>
                )}
              </span>
              <span className="vp-num" style={{ fontSize: 12.5, fontWeight: 800, color:"#83DDA8", whiteSpace: "nowrap", flexShrink: 0 }}>
                {brl(eq.preco_base)}
              </span>
            </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Falha no envio automático do orçamento ────────────────────────────────
// O orçamento continua como estava (não vira "enviado", porque o cliente não
// recebeu). Aqui o vendedor vê o motivo e manda pelo próprio email/WhatsApp,
// com o conteúdo já pronto.
function FalhaEnvioOrcamento({
  falha, onFechar, onMarcarEnviado,
}: {
  falha: { id: string; motivo: string; previa: PreviaEmail | null };
  onFechar: () => void;
  onMarcarEnviado: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const p = falha.previa;

  const copiar = async () => {
    if (!p) return;
    try {
      await navigator.clipboard.writeText(p.texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch { /* sem clipboard: o texto fica visível para copiar à mão */ }
  };

  return (
    <div style={{ padding: "13px 15px", borderRadius: 12, background:"rgba(217,119,6,0.07)", border:"1px solid rgba(217,119,6,0.3)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <AlertTriangle style={{ width: 16, height: 16, color:"#F2C879", flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color:"#F2C879" }}>
            O email automático não saiu — o orçamento continua intacto
          </div>
          <div style={{ fontSize: 12, color:"#EAF6FB", marginTop: 4, lineHeight: 1.5 }}>
            {falha.motivo}
          </div>
        </div>
        <button onClick={onFechar} className="vp-icon-btn" aria-label="Fechar"
          style={{ background:"none", color:"#F2C879", width: 24, height: 24, flexShrink: 0 }}>
          <X style={{ width: 13, height: 13 }} />
        </button>
      </div>

      {p && (
        <>
          <div style={{ fontSize: 11.5, fontWeight: 700, color:"#EAF6FB", margin: "12px 0 7px" }}>
            Enviar você mesmo para {p.empresa_nome}:
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {p.destino && (
              <button onClick={() => openEmail(p.destino!, undefined, p.assunto, p.texto)} className="vp-ghost" style={{ height: 34 }}>
                <Send style={{ width: 12, height: 12 }} /> Abrir no meu email
              </button>
            )}
            {p.telefone && (
              <button onClick={() => openWhatsApp(p.telefone!)} className="vp-ghost" style={{ height: 34 }}>
                <Send style={{ width: 12, height: 12 }} /> WhatsApp
              </button>
            )}
            <button onClick={copiar} className="vp-ghost" style={{ height: 34 }}>
              {copiado ? <><Check style={{ width: 12, height: 12 }} /> Copiado</> : "Copiar texto"}
            </button>
            <button onClick={onMarcarEnviado}
              title="Use depois de enviar por fora — o sistema não tem como saber sozinho"
              style={{ height: 34, padding: "0 14px", borderRadius: 9, border:"none", cursor: "pointer", background:"#F2C879", color:"#0A2540", fontSize: 12, fontWeight: 700, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Check style={{ width: 12, height: 12 }} /> Já enviei — marcar como enviado
            </button>
          </div>
          <pre style={{ marginTop: 10, padding: "10px 12px", borderRadius: 9, background:"rgba(18,59,94,0.55)", border:"1px solid rgba(159,211,234,0.18)", fontSize: 11.5, lineHeight: 1.55, color:"#EAF6FB", whiteSpace: "pre-wrap", fontFamily: "inherit", maxHeight: 180, overflowY: "auto" }}>
            {p.texto}
          </pre>
        </>
      )}
    </div>
  );
}

// Motivo da recusa. Era um `window.prompt`: caixa pintada pelo sistema, fora do
// tema, e que nao dizia para onde o texto ia parar.
//
// O campo continua OPCIONAL de proposito. As vezes o vendedor so sabe que
// perdeu, e obrigar a justificar faria ele desistir de marcar — status
// desatualizado e pior que motivo em branco.
function MotivoRecusaOrcamento({
  orcamento, numero, salvando, onCancelar, onConfirmar,
}: {
  orcamento: Orcamento;
  numero: string;
  salvando: boolean;
  onCancelar: () => void;
  onConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { campo.current?.focus(); }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !salvando) onCancelar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onCancelar, salvando]);

  const rotulo = { fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: "#9FD3EA", textTransform: "uppercase" } as const;

  return createPortal(
    <div onClick={() => { if (!salvando) onCancelar(); }}
      style={{ position: "fixed", inset: 0, zIndex: 80, background:"rgba(10,31,51,0.42)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal aria-label="Motivo da recusa"
        style={{ width: "100%", maxWidth: 460, background:"#143354", borderRadius: 18, padding: 24, boxShadow: "0 24px 64px rgba(10,31,51,0.32)" }}>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background:"rgba(220,38,38,0.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <AlertTriangle style={{ width: 17, height: 17, color:"#F7B8B1" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color:"#EAF6FB" }}>Marcar como recusado</div>
            <div style={{ fontSize: 11.5, color:"#9FD3EA", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {numero} · {orcamento.empresa_nome || "sem empresa"}
            </div>
          </div>
          <button onClick={onCancelar} disabled={salvando} className="vp-icon-btn" aria-label="Fechar"
            style={{ width: 30, height: 30, background:"rgba(159,211,234,0.08)", color:"#EAF6FB", flexShrink: 0 }}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        <label style={rotulo} htmlFor="motivo-recusa">Motivo da recusa (opcional)</label>
        <textarea id="motivo-recusa" ref={campo} value={motivo} onChange={e => setMotivo(e.target.value)}
          placeholder="Preço acima do concorrente, prazo de entrega, adiou a compra…"
          style={{ width: "100%", minHeight: 84, padding: "10px 12px", borderRadius: 10, border:"1.5px solid rgba(159,211,234,0.18)", background:"rgba(18,59,94,0.55)", fontSize: 13, marginTop: 5, outline:"none", fontFamily: "inherit", color:"#EAF6FB", resize: "vertical" }} />

        <div style={{ fontSize: 11, color:"#9FD3EA", marginTop: 8, lineHeight: 1.5 }}>
          Fica na linha deste orçamento, embaixo do título. Se o status mudar de
          novo, o motivo é apagado.
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button onClick={onCancelar} disabled={salvando} className="vp-ghost" style={{ height: 40, padding: "0 16px", fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={() => onConfirmar(motivo)} disabled={salvando}
            style={{ display: "flex", alignItems: "center", gap: 6, height: 40, padding: "0 18px", borderRadius: 10, border:"none", background:"rgba(220,38,38,0.16)", color:"#FFC9C2", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: salvando ? "wait" : "pointer", opacity: salvando ? 0.7 : 1 }}>
            {salvando
              ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
              : <X style={{ width: 14, height: 14 }} />}
            Marcar como recusado
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
