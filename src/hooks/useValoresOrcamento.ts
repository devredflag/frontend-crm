import { useSyncExternalStore } from "react";
import { getToken } from "../services/auth";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

// De quanto em quanto tempo os orçamentos são reconferidos enquanto a aba está
// visível. Mesmo ritmo do polling de notificações do dashboard, para as duas
// coisas da tela envelhecerem juntas.
const INTERVALO_MS = 5000;

// "Em aberto" é só o que já foi para o cliente e ainda não tem decisão
// (enviado + em negociação). Rascunho fica de fora de propósito: enquanto não
// sai daqui, não é dinheiro em jogo — contar rascunho infla o pipeline com
// intenção, que era exatamente o problema do ticket estimado.
const ABERTOS = ["enviado", "em_negociacao"];

interface OrcamentoLite {
  orcamento_id: string;
  empresa_id: string;
  status: string;
  total: number | string | null;
  atualizado_em?: string | null;
}

export interface ValorEmpresa {
  /** Enviados e em negociação — o que ainda pode fechar. */
  emAberto: number;
  qtdAbertos: number;
  /** Já aprovados — o que fechou. */
  aprovado: number;
  qtdAprovados: number;
  recusado: number;
  /** aprovado / qtdAprovados. Null quando a empresa nunca fechou nada. */
  ticketMedio: number | null;
  /** Peso da empresa no funil: o que está em jogo + o que já fechou. */
  total: number;
}

const VAZIO: ValorEmpresa = {
  emAberto: 0, qtdAbertos: 0, aprovado: 0, qtdAprovados: 0,
  recusado: 0, ticketMedio: null, total: 0,
};

export interface ValoresOrcamento {
  /** Valor de uma empresa; devolve zeros para quem não tem orçamento. */
  valorDe: (empresaId: string) => ValorEmpresa;
  /** Soma de `valorDe` sobre um conjunto de empresas. */
  somar: (empresaIds: string[]) => ValorEmpresa;
  /** Todos os orçamentos da conta, agregados. */
  geral: ValorEmpresa;
  carregando: boolean;
  erro: boolean;
  /** Rebusca agora. Raramente necessário: o polling e `notificarOrcamentos` cobrem. */
  recarregar: () => void;
}

function agregar(orcamentos: OrcamentoLite[]): ValorEmpresa {
  const v: ValorEmpresa = { ...VAZIO };
  for (const o of orcamentos) {
    const total = Number(o.total || 0);
    if (ABERTOS.includes(o.status)) { v.emAberto += total; v.qtdAbertos += 1; }
    else if (o.status === "aprovado") { v.aprovado += total; v.qtdAprovados += 1; }
    else if (o.status === "recusado") { v.recusado += total; }
  }
  v.ticketMedio = v.qtdAprovados ? v.aprovado / v.qtdAprovados : null;
  v.total = v.emAberto + v.aprovado;
  return v;
}

/** Junta dois agregados já prontos, sem repassar a lista de orçamentos. */
function juntar(a: ValorEmpresa, b: ValorEmpresa): ValorEmpresa {
  const emAberto = a.emAberto + b.emAberto;
  const aprovado = a.aprovado + b.aprovado;
  const qtdAprovados = a.qtdAprovados + b.qtdAprovados;
  return {
    emAberto, qtdAbertos: a.qtdAbertos + b.qtdAbertos,
    aprovado, qtdAprovados,
    recusado: a.recusado + b.recusado,
    ticketMedio: qtdAprovados ? aprovado / qtdAprovados : null,
    total: emAberto + aprovado,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Store único, fora do React.
//
// O mesmo dinheiro aparece no funil, no dashboard e no painel de Vendas, que
// não compartilham árvore de componentes — um contexto não alcançaria os três.
// Aqui existe UMA cópia dos valores, UMA requisição por ciclo (não importa
// quantas telas estejam montadas) e um relógio que só corre com a aba visível.
// ─────────────────────────────────────────────────────────────────────────────

interface Estado {
  porEmpresa: Map<string, ValorEmpresa>;
  geral: ValorEmpresa;
  carregando: boolean;
  erro: boolean;
}

let estado: Estado = { porEmpresa: new Map(), geral: VAZIO, carregando: true, erro: false };

/** Instâncias do hook — re-renderizam quando o estado troca. */
const inscritos = new Set<() => void>();
/** Telas que querem saber que os orçamentos MUDARAM, não só que foram relidos. */
const inscritosEmMudanca = new Set<() => void>();

let assinatura: string | null = null;
let emVoo: Promise<void> | null = null;
let relogio: ReturnType<typeof setInterval> | null = null;

function publicar(mudanca: Partial<Estado>) {
  estado = { ...estado, ...mudanca };
  inscritos.forEach(avisar => avisar());
}

/**
 * Impressão digital da lista. Todo caminho de escrita do backend faz
 * `atualizado_em = NOW()`, inclusive quando só os itens mudam, então isto pega
 * qualquer alteração — e não só status e valor.
 */
function digital(lista: OrcamentoLite[]) {
  return lista
    .map(o => `${o.orcamento_id}:${o.status}:${o.total}:${o.atualizado_em || ""}`)
    .sort()
    .join("|");
}

/** Relê os orçamentos. Chamadas simultâneas viram uma requisição só. */
function buscar(): Promise<void> {
  if (emVoo) return emVoo;
  emVoo = (async () => {
    try {
      const res = await fetch(`${API}/orcamentos`, {
        headers: { Authorization: `Bearer ${getToken() || ""}` },
      });
      if (!res.ok) throw new Error(String(res.status));
      const lista: OrcamentoLite[] = await res.json();

      const nova = digital(lista);
      // Na primeira carga nada "mudou" — só passou a existir.
      const mudou = assinatura !== null && nova !== assinatura;
      assinatura = nova;

      const porId = new Map<string, OrcamentoLite[]>();
      for (const o of lista) {
        if (!o.empresa_id) continue;
        const jaTem = porId.get(o.empresa_id);
        if (jaTem) jaTem.push(o); else porId.set(o.empresa_id, [o]);
      }
      const mapa = new Map<string, ValorEmpresa>();
      porId.forEach((orcs, id) => mapa.set(id, agregar(orcs)));

      publicar({ porEmpresa: mapa, geral: agregar(lista), carregando: false, erro: false });
      if (mudou) inscritosEmMudanca.forEach(avisar => avisar());
    } catch {
      // Falha de rede não apaga o que já está na tela: só marca o erro.
      publicar({ carregando: false, erro: true });
    } finally {
      emVoo = null;
    }
  })();
  return emVoo;
}

function aoFicarVisivel() {
  if (document.visibilityState === "visible") buscar();
}

function ligarRelogio() {
  if (relogio) return;
  relogio = setInterval(() => {
    // Aba escondida não gasta requisição; ao voltar, `aoFicarVisivel` recarrega.
    if (document.visibilityState === "visible") buscar();
  }, INTERVALO_MS);
  // Os dois eventos disparam juntos no alt-tab, mas `buscar` funde chamadas
  // simultâneas numa requisição só, então não há pedido repetido.
  window.addEventListener("focus", aoFicarVisivel);
  document.addEventListener("visibilitychange", aoFicarVisivel);
}

function desligarRelogio() {
  if (relogio) { clearInterval(relogio); relogio = null; }
  window.removeEventListener("focus", aoFicarVisivel);
  document.removeEventListener("visibilitychange", aoFicarVisivel);
}

function assinarEstado(aoTrocar: () => void) {
  inscritos.add(aoTrocar);
  if (inscritos.size === 1) ligarRelogio();
  buscar();
  return () => {
    inscritos.delete(aoTrocar);
    if (inscritos.size === 0) desligarRelogio();
  };
}

/**
 * Chame depois de criar, editar, enviar, excluir ou mudar o status de um
 * orçamento: relê na hora, sem esperar o próximo ciclo do relógio.
 */
export function notificarOrcamentos() {
  buscar();
}

/**
 * Avisa quando os orçamentos mudaram de fato — inclusive por mão de outra
 * pessoa, detectado pelo polling. Serve para telas que guardam a lista inteira
 * (o painel de Vendas) e precisam rebuscar a própria cópia.
 *
 * Devolve a função de cancelamento; use dentro de um `useEffect`.
 */
export function aoMudarOrcamentos(callback: () => void) {
  inscritosEmMudanca.add(callback);
  return () => { inscritosEmMudanca.delete(callback); };
}

const lerEstado = () => estado;

/**
 * Valores por empresa, tirados dos orçamentos que existem de verdade — não de
 * um número digitado no cadastro. Atualiza sozinho: a cada 5s com a aba
 * visível, ao voltar o foco, e no instante em que alguém mexe num orçamento.
 */
export default function useValoresOrcamento(): ValoresOrcamento {
  const atual = useSyncExternalStore(assinarEstado, lerEstado, lerEstado);

  const valorDe = (empresaId: string) => atual.porEmpresa.get(empresaId) || VAZIO;
  const somar = (empresaIds: string[]) =>
    empresaIds.reduce((acc, id) => juntar(acc, valorDe(id)), { ...VAZIO });

  return {
    valorDe,
    somar,
    geral: atual.geral,
    carregando: atual.carregando,
    erro: atual.erro,
    recarregar: buscar,
  };
}
