/**
 * Aritmética da tela de Insights.
 *
 * Está fora do React de propósito. O backend recusa subir fora do Railway e o
 * `.env.dev` está sem banco, então NADA desta tela pode ser conferido no
 * navegador durante o desenvolvimento — a única verificação possível é
 * executar a conta contra entradas conhecidas. Por isso todo número da tela
 * nasce aqui, em função pura, e `metricas.test.ts` exercita cada uma.
 * Componente que faz conta na marcação volta a ser inverificável.
 *
 * ── A regra que governa o arquivo inteiro ───────────────────────────────────
 * Só existe métrica com dado real por trás. O backend guarda o status ATUAL da
 * empresa e a data da última mudança (`status_atualizado_em`), não o caminho
 * que ela fez entre as etapas. Então dá para medir desfecho (fechou/perdeu),
 * o retrato do funil hoje e qualquer coisa datada (orçamento, evento) — mas
 * NÃO a passagem histórica entre etapas. Onde a conta exigiria inventar, a
 * função devolve `null` e a tela escreve "sem base".
 *
 * ── Fluxo x estoque ────────────────────────────────────────────────────────
 * A distinção mais importante daqui, e a que mais gera número errado quando
 * ignorada:
 *
 *   FLUXO   é o que ACONTECEU dentro da janela (leads captados, negócios
 *           fechados, valor aprovado). Recortar por janela é natural, e o
 *           período anterior é a janela imediatamente antes.
 *   ESTOQUE é o que EXISTIA num instante (pipeline em aberto, tamanho da
 *           base). Somar estoque mês a mês contaria o mesmo orçamento várias
 *           vezes; o certo é reconstruí-lo no instante do corte. Aqui isso é
 *           possível porque `data_envio`/`data_decisao` (e `criado_em`/
 *           `status_atualizado_em`) permitem dizer se o item já tinha entrado
 *           e ainda não tinha saído naquela data.
 *
 * Onde o estoque NÃO é reconstruível — `data_proxima_acao` guarda só o valor
 * de hoje, sem histórico — a métrica existe, mas sem comparação. Ela declara
 * `comparavel: false` e a tela omite o Δ em vez de comparar com o presente e
 * chamar isso de passado.
 */

import { dataLocal, inicioDoDia, diasDesde } from "./data";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de entrada — o recorte que a tela usa de cada rota, nada além
// ─────────────────────────────────────────────────────────────────────────────

export interface EmpresaMetrica {
  empresa_id: string;
  nome: string;
  segmento: string | null;
  porte: string | null;
  cidade: string | null;
  status: string;
  temperatura: string | null;
  origem_lead: string | null;
  motivo_perdido: string | null;
  ultima_interacao: string | null;
  criado_em: string | null;
  status_atualizado_em: string | null;
  data_proxima_acao: string | null;
  vendedor_id: string | null;
  contato_email?: string | null;
  contato_celular?: string | null;
  contato_whatsapp?: string | null;
}

export interface OrcamentoMetrica {
  orcamento_id: string;
  empresa_id: string;
  vendedor_id: string | null;
  status: string;
  total: number | string | null;
  motivo_recusa?: string | null;
  criado_em: string | null;
  data_envio: string | null;
  data_decisao: string | null;
}

export interface EventoMetrica {
  evento_id: string;
  tipo: string;
  data: string;
  empresa_id: string | null;
  status_resposta?: string | null;
}

export interface UsuarioMetrica {
  usuario_id: string;
  nome: string;
  role: string;
  ativo: boolean;
  supervisor_id?: string | null;
  supervisor_nome?: string | null;
}

/** Tudo que a tela carregou, já no escopo que o backend permitiu ver. */
export interface Dados {
  empresas: EmpresaMetrica[];
  orcamentos: OrcamentoMetrica[];
  eventos: EventoMetrica[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Vocabulário
// ─────────────────────────────────────────────────────────────────────────────

/** Etapas do funil, na ordem. "Perdido" é saída, não etapa — fica fora. */
export const ETAPAS_FUNIL = [
  "Lead", "Em contato", "Visita agendada", "Proposta", "Negociação", "Fechado",
] as const;

/** Orçamento que já saiu para o cliente e ainda não teve decisão. */
export const ORCAMENTO_ABERTO = ["enviado", "em_negociacao"];

const SEM_CATEGORIA = "Não informado";

/** Rascunho é cadastro pela metade, não negócio: nunca entra em métrica. */
export const ehReal = (e: EmpresaMetrica) => e.status !== "Rascunho";

/** Ainda em jogo: não fechou nem se perdeu, então há follow-up a cobrar. */
export const ehAtiva = (e: EmpresaMetrica) =>
  ehReal(e) && e.status !== "Fechado" && e.status !== "Perdido";

const num = (v: number | string | null | undefined) => Number(v || 0) || 0;

// ─────────────────────────────────────────────────────────────────────────────
// Janelas de tempo
// ─────────────────────────────────────────────────────────────────────────────

export interface Janela {
  inicio: Date;
  /** Inclusivo. Para a janela atual é o fim do mês corrente, não "agora": um
   *  negócio fechado hoje precisa cair na janela que o mês corrente representa. */
  fim: Date;
}

export interface Balde {
  rotulo: string;
  /** 0–11. A tela usa para escrever o nome do mês por extenso. */
  mes: number;
  ano: number;
  inicio: Date;
  fim: Date;
}

const MESES_CURTOS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

/** Último instante do mês `atras` meses antes de `base`. */
function fimDoMes(base: Date, atras: number): Date {
  // Dia 0 do mês seguinte = último instante do mês alvo.
  return new Date(base.getFullYear(), base.getMonth() - atras + 1, 0, 23, 59, 59, 999);
}

function inicioDoMes(base: Date, atras: number): Date {
  return new Date(base.getFullYear(), base.getMonth() - atras, 1, 0, 0, 0, 0);
}

/** Os `meses` meses que terminam no mês de `base`, um balde por mês. */
export function baldesMensais(meses: number, base: Date = new Date()): Balde[] {
  const out: Balde[] = [];
  for (let i = 0; i < meses; i++) {
    const atras = meses - 1 - i;
    const fim = fimDoMes(base, atras);
    out.push({
      rotulo: MESES_CURTOS[fim.getMonth()],
      mes: fim.getMonth(),
      ano: fim.getFullYear(),
      inicio: inicioDoMes(base, atras),
      fim,
    });
  }
  return out;
}

/** A janela de `meses` meses terminada no mês de `base`. */
export function janelaMeses(meses: number, base: Date = new Date()): Janela {
  return { inicio: inicioDoMes(base, meses - 1), fim: fimDoMes(base, 0) };
}

/**
 * A janela de mesmo tamanho imediatamente anterior.
 *
 * Contada em MESES, não em milissegundos: subtrair a duração daria janelas
 * desalinhadas do calendário (fevereiro tem 28 dias) e o mesmo mês apareceria
 * nas duas pontas. Aqui "os 6 meses anteriores aos 6 atuais" são exatamente
 * os 6 meses de calendário que vêm antes.
 */
export function janelaAnterior(meses: number, base: Date = new Date()): Janela {
  return { inicio: inicioDoMes(base, meses * 2 - 1), fim: fimDoMes(base, meses) };
}

export const dentro = (d: Date | null, j: Janela) => !!d && d >= j.inicio && d <= j.fim;

/** Atalho: o campo de data da API cai dentro da janela? */
const em = (valor: string | null | undefined, j: Janela) => dentro(dataLocal(valor ?? null), j);

// ─────────────────────────────────────────────────────────────────────────────
// Filtro global
// ─────────────────────────────────────────────────────────────────────────────

export interface Filtro {
  /** Tamanho da janela em meses. */
  meses: number;
  /** `usuario_id`, ou "todos". */
  vendedor: string;
  /** Nome do segmento, ou "todos". */
  segmento: string;
}

export const FILTRO_PADRAO: Filtro = { meses: 6, vendedor: "todos", segmento: "todos" };

/**
 * Aplica vendedor e segmento — nunca o período.
 *
 * O período NÃO entra aqui porque cada métrica o usa por uma data diferente:
 * lead captado olha `criado_em`, negócio fechado olha `status_atualizado_em`,
 * proposta olha `data_envio`. Um recorte único no começo escolheria uma dessas
 * datas para todas e silenciosamente zeraria as outras — um orçamento aprovado
 * este mês some da conta porque a empresa dele foi cadastrada no ano passado.
 * Quem sabe qual data usar é cada métrica, e é lá que a janela é aplicada.
 *
 * O escopo hierárquico (gerente vê a conta, supervisor vê a equipe) já veio
 * resolvido do backend por `escopo_vendedores` — este filtro só estreita o que
 * chegou, nunca alarga.
 */
export function aplicarFiltro(dados: Dados, filtro: Filtro): Dados {
  const { vendedor, segmento } = filtro;
  if (vendedor === "todos" && segmento === "todos") return dados;

  const empresas = dados.empresas.filter(e =>
    (vendedor === "todos" || e.vendedor_id === vendedor) &&
    (segmento === "todos" || (e.segmento || SEM_CATEGORIA) === segmento)
  );

  // Orçamento e evento seguem a EMPRESA, não o próprio dono. Um orçamento tem
  // `vendedor_id` próprio, que pode divergir de quem detém a carteira (a
  // empresa trocou de mão depois da proposta). Filtrar cada um pelo seu campo
  // faria o total por vendedor não bater com o total da carteira dele.
  const idsEmpresa: Record<string, true> = {};
  empresas.forEach(e => { idsEmpresa[e.empresa_id] = true; });

  return {
    empresas,
    orcamentos: dados.orcamentos.filter(o => idsEmpresa[o.empresa_id]),
    eventos: dados.eventos.filter(ev => !ev.empresa_id || idsEmpresa[ev.empresa_id]),
  };
}

/** Segmentos presentes na base, para popular o filtro. */
export function segmentosDisponiveis(empresas: EmpresaMetrica[]): string[] {
  const vistos: Record<string, true> = {};
  empresas.filter(ehReal).forEach(e => { vistos[(e.segmento || SEM_CATEGORIA)] = true; });
  return Object.keys(vistos).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// ─────────────────────────────────────────────────────────────────────────────
// Medidas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * O resultado de uma métrica.
 *
 * `amostra` fica junto do valor de propósito, e a tela mostra os dois: uma
 * conversão de 100% sobre dois negócios não é a mesma informação que 100%
 * sobre duzentos, e meta cravada sem olhar o denominador é meta chutada.
 */
export interface Medida {
  /** null = não havia amostra. Diferente de 0, que é um resultado. */
  valor: number | null;
  amostra: number;
  /** O denominador em palavras — "12 de 37 com desfecho". */
  base: string;
}

const semBase = (texto: string): Medida => ({ valor: null, amostra: 0, base: texto });

const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

function razao(parte: number, todo: number, base: string): Medida {
  if (todo <= 0) return semBase(base);
  return { valor: (parte / todo) * 100, amostra: todo, base };
}

function mediaDe(valores: number[], base: string): Medida {
  if (valores.length === 0) return semBase(base);
  const soma = valores.reduce((s, v) => s + v, 0);
  return { valor: soma / valores.length, amostra: valores.length, base };
}

/** Dias de calendário entre duas datas da API; null se faltar uma ou se inverter. */
export function diasEntre(de?: string | null, ate?: string | null): number | null {
  const a = dataLocal(de ?? null), b = dataLocal(ate ?? null);
  if (!a || !b) return null;
  const d = Math.round((inicioDoDia(b).getTime() - inicioDoDia(a).getTime()) / 86_400_000);
  return d < 0 ? null : d;
}

// ── as métricas, uma função por número ──────────────────────────────────────

/** Fechados ÷ decididos. Empresa ainda no funil não decidiu nada e fica fora. */
export function taxaConversao(d: Dados, j: Janela): Medida {
  const decididos = d.empresas.filter(e =>
    ehReal(e) && (e.status === "Fechado" || e.status === "Perdido") && em(e.status_atualizado_em, j)
  );
  const fechados = decididos.filter(e => e.status === "Fechado").length;
  return razao(fechados, decididos.length,
    decididos.length ? `${fechados} de ${decididos.length} com desfecho` : "nenhum negócio decidido");
}

/** Dias entre o cadastro da empresa e o dia em que ela virou Fechado. */
export function cicloMedio(d: Dados, j: Janela): Medida {
  const ciclos: number[] = [];
  d.empresas.forEach(e => {
    if (!ehReal(e) || e.status !== "Fechado" || !em(e.status_atualizado_em, j)) return;
    const dias = diasEntre(e.criado_em, e.status_atualizado_em);
    if (dias !== null) ciclos.push(dias);
  });
  return mediaDe(ciclos, ciclos.length
    ? `média de ${plural(ciclos.length, "fechamento", "fechamentos")}`
    : "nenhum fechamento com data");
}

const aprovadosNa = (d: Dados, j: Janela) =>
  d.orcamentos.filter(o => o.status === "aprovado" && em(o.data_decisao, j));

/** Valor aprovado ÷ quantidade de orçamentos aprovados. */
export function ticketMedio(d: Dados, j: Janela): Medida {
  const ap = aprovadosNa(d, j);
  if (ap.length === 0) return semBase("nenhum orçamento aprovado");
  const total = ap.reduce((s, o) => s + num(o.total), 0);
  return { valor: total / ap.length, amostra: ap.length,
    base: `${plural(ap.length, "orçamento aprovado", "orçamentos aprovados")}` };
}

/** Soma do que foi aprovado na janela. */
export function valorAprovado(d: Dados, j: Janela): Medida {
  const ap = aprovadosNa(d, j);
  return { valor: ap.reduce((s, o) => s + num(o.total), 0), amostra: ap.length,
    base: ap.length ? `${plural(ap.length, "orçamento", "orçamentos")} no período` : "nada aprovado no período" };
}

/** Soma do que foi recusado na janela — o contraponto de `valorAprovado`. */
export function valorPerdido(d: Dados, j: Janela): Medida {
  const rec = d.orcamentos.filter(o => o.status === "recusado" && em(o.data_decisao, j));
  return { valor: rec.reduce((s, o) => s + num(o.total), 0), amostra: rec.length,
    base: rec.length ? `${plural(rec.length, "proposta recusada", "propostas recusadas")}` : "nada recusado no período" };
}

/**
 * ESTOQUE. Valor que já tinha saído para o cliente e ainda não tinha decisão
 * no INSTANTE do corte — não o que está aberto hoje.
 *
 * É isso que torna o Δ possível: um orçamento hoje aprovado esteve em aberto
 * nos meses anteriores, e `data_envio` + `data_decisao` recuperam esse estado.
 * Rascunho fica de fora: enquanto não sai daqui, não é dinheiro em jogo.
 */
export function pipelineEm(d: Dados, instante: Date): Medida {
  const abertos = d.orcamentos.filter(o => {
    const enviou = dataLocal(o.data_envio);
    if (!enviou || enviou > instante) return false;
    const decidiu = dataLocal(o.data_decisao);
    return !decidiu || decidiu > instante;
  });
  return { valor: abertos.reduce((s, o) => s + num(o.total), 0), amostra: abertos.length,
    base: abertos.length ? `${plural(abertos.length, "proposta sem decisão", "propostas sem decisão")}` : "nenhuma proposta em aberto" };
}

/** Empresas que entraram na base dentro da janela. */
export function novosLeads(d: Dados, j: Janela): Medida {
  const novos = d.empresas.filter(e => ehReal(e) && em(e.criado_em, j)).length;
  return { valor: novos, amostra: novos,
    base: novos ? `${plural(novos, "empresa cadastrada", "empresas cadastradas")}` : "nenhuma entrada no período" };
}

/** Aprovados ÷ decididos. Mede a PROPOSTA; a conversão mede o funil inteiro. */
export function taxaAprovacaoProposta(d: Dados, j: Janela): Medida {
  const decid = d.orcamentos.filter(o =>
    (o.status === "aprovado" || o.status === "recusado") && em(o.data_decisao, j));
  const ap = decid.filter(o => o.status === "aprovado").length;
  return razao(ap, decid.length,
    decid.length ? `${ap} de ${decid.length} decididas` : "nenhuma proposta decidida");
}

/** Dias que o cliente leva entre receber a proposta e responder. */
export function tempoRespostaCliente(d: Dados, j: Janela): Medida {
  const dias: number[] = [];
  d.orcamentos.forEach(o => {
    if (!em(o.data_decisao, j)) return;
    const t = diasEntre(o.data_envio, o.data_decisao);
    if (t !== null) dias.push(t);
  });
  return mediaDe(dias, dias.length
    ? `${plural(dias.length, "proposta respondida", "propostas respondidas")}`
    : "nenhuma proposta respondida");
}

/** Dias que a proposta leva entre ser criada e sair para o cliente. É o único
 *  trecho do ciclo que depende só do time — o resto depende do cliente. */
export function tempoAteEnvio(d: Dados, j: Janela): Medida {
  const dias: number[] = [];
  d.orcamentos.forEach(o => {
    if (!em(o.data_envio, j)) return;
    const t = diasEntre(o.criado_em, o.data_envio);
    if (t !== null) dias.push(t);
  });
  return mediaDe(dias, dias.length
    ? `${plural(dias.length, "proposta enviada", "propostas enviadas")}`
    : "nenhuma proposta enviada");
}

/**
 * SNAPSHOT SEM HISTÓRICO. Empresas ativas com retorno marcado para hoje ou
 * depois ÷ total de ativas.
 *
 * `data_proxima_acao` guarda só o valor de hoje — não há como saber qual era
 * em março. Por isso esta é a única métrica do painel sem comparação: ver
 * `comparavel: false` no catálogo.
 */
export function coberturaFollowUp(d: Dados): Medida {
  const ativas = d.empresas.filter(ehAtiva);
  const hoje = inicioDoDia().getTime();
  const cobertas = ativas.filter(e => {
    const p = dataLocal(e.data_proxima_acao);
    return !!p && inicioDoDia(p).getTime() >= hoje;
  }).length;
  return razao(cobertas, ativas.length,
    ativas.length ? `${cobertas} de ${ativas.length} empresas ativas` : "nenhuma empresa ativa");
}

/** Empresas ativas sem e-mail nem telefone de contato: não dá para trabalhar. */
export function coberturaContato(d: Dados): Medida {
  const ativas = d.empresas.filter(ehAtiva);
  const com = ativas.filter(e =>
    !!(e.contato_email || e.contato_celular || e.contato_whatsapp)).length;
  return razao(com, ativas.length,
    ativas.length ? `${com} de ${ativas.length} com contato` : "nenhuma empresa ativa");
}

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de indicadores
// ─────────────────────────────────────────────────────────────────────────────

export type Formato = "pct" | "moeda" | "dias" | "inteiro";

export interface DefinicaoKpi {
  chave: string;
  rotulo: string;
  cor: string;
  formato: Formato;
  /** Ver o cabeçalho do arquivo. Estoque é medido num instante, fluxo na janela. */
  tipo: "fluxo" | "estoque";
  /** false quando o passado não é reconstruível — a tela omite o Δ. */
  comparavel: boolean;
  /** Falso para "negócios perdidos" e para os tempos: subir é piorar. */
  subirEBom: boolean;
  comoCalcula: string;
  medir: (d: Dados, j: Janela) => Medida;
}

/** Estoque medido no fim da janela; a assinatura fica igual à do fluxo. */
const noFim = (f: (d: Dados, instante: Date) => Medida) =>
  (d: Dados, j: Janela) => f(d, j.fim);

export const KPIS: DefinicaoKpi[] = [
  {
    chave: "conversao", rotulo: "Taxa de conversão", cor: "#2CCD93",
    formato: "pct", tipo: "fluxo", comparavel: true, subirEBom: true,
    comoCalcula: "Fechados ÷ (fechados + perdidos), pela data em que o desfecho aconteceu. Empresa ainda no funil não entra: ela não decidiu nada.",
    medir: taxaConversao,
  },
  {
    chave: "valor", rotulo: "Valor aprovado", cor: "#2CCD93",
    formato: "moeda", tipo: "fluxo", comparavel: true, subirEBom: true,
    comoCalcula: "Soma dos orçamentos aprovados cuja decisão caiu no período.",
    medir: valorAprovado,
  },
  {
    chave: "ticket", rotulo: "Ticket médio", cor: "#F2C879",
    formato: "moeda", tipo: "fluxo", comparavel: true, subirEBom: true,
    comoCalcula: "Valor aprovado ÷ quantidade de orçamentos aprovados no período.",
    medir: ticketMedio,
  },
  {
    chave: "pipeline", rotulo: "Pipeline em aberto", cor: "#56A4F5",
    formato: "moeda", tipo: "estoque", comparavel: true, subirEBom: true,
    comoCalcula: "Propostas que já tinham saído para o cliente e ainda não tinham decisão no fim do período. Rascunho fica de fora: enquanto não sai daqui, não é dinheiro em jogo.",
    medir: noFim(pipelineEm),
  },
  {
    chave: "ciclo", rotulo: "Ciclo de fechamento", cor: "#8FC4FA",
    formato: "dias", tipo: "fluxo", comparavel: true, subirEBom: false,
    comoCalcula: "Dias entre o cadastro da empresa e o dia em que ela virou Fechado. Só conta quem tem as duas datas.",
    medir: cicloMedio,
  },
  {
    chave: "novos", rotulo: "Leads captados", cor: "#22D3EE",
    formato: "inteiro", tipo: "fluxo", comparavel: true, subirEBom: true,
    comoCalcula: "Empresas cadastradas dentro do período. Rascunho não conta.",
    medir: novosLeads,
  },
  {
    chave: "aprovacao", rotulo: "Aprovação de proposta", cor: "#A78BFA",
    formato: "pct", tipo: "fluxo", comparavel: true, subirEBom: true,
    comoCalcula: "Orçamentos aprovados ÷ (aprovados + recusados). Mede a proposta; a taxa de conversão mede o funil inteiro.",
    medir: taxaAprovacaoProposta,
  },
  {
    chave: "resposta", rotulo: "Resposta do cliente", cor: "#F0A05A",
    formato: "dias", tipo: "fluxo", comparavel: true, subirEBom: false,
    comoCalcula: "Dias entre enviar a proposta e o cliente decidir. É o número que diz quando cobrar — sem ele o follow-up é chute.",
    medir: tempoRespostaCliente,
  },
  {
    chave: "envio", rotulo: "Tempo até enviar", cor: "#F0A05A",
    formato: "dias", tipo: "fluxo", comparavel: true, subirEBom: false,
    comoCalcula: "Dias entre criar o orçamento e enviá-lo. É o único trecho do ciclo que depende só do time — o resto depende do cliente.",
    medir: tempoAteEnvio,
  },
  {
    chave: "followup", rotulo: "Cobertura de follow-up", cor: "#F0A05A",
    formato: "pct", tipo: "estoque", comparavel: false, subirEBom: true,
    comoCalcula: "Empresas ainda no funil com retorno marcado para hoje ou depois ÷ total de ativas. Sem comparação: o sistema guarda só a próxima ação de hoje, não a de meses atrás.",
    medir: d => coberturaFollowUp(d),
  },
  {
    chave: "contato", rotulo: "Base com contato", cor: "#8FC4FA",
    formato: "pct", tipo: "estoque", comparavel: false, subirEBom: true,
    comoCalcula: "Empresas ativas com e-mail, celular ou WhatsApp ÷ total de ativas. Sem comparação: o cadastro guarda o contato atual, não quando ele foi preenchido.",
    medir: d => coberturaContato(d),
  },
];

/** Os seis que abrem a tela. Os demais aparecem nas abas de detalhe. */
export const KPIS_DESTAQUE = ["conversao", "valor", "ticket", "pipeline", "ciclo", "novos"];

export interface KpiCalculado {
  def: DefinicaoKpi;
  atual: Medida;
  /** null quando a métrica não é comparável ou o período anterior não teve amostra. */
  anterior: Medida | null;
  /** Diferença absoluta (pontos percentuais em `pct`). null sem comparação. */
  delta: number | null;
  /** Série mensal do indicador dentro da janela. `null` = mês sem amostra. */
  serie: (number | null)[];
}

/**
 * Calcula um indicador na janela, na janela anterior e mês a mês.
 *
 * A série mensal reaproveita `medir` com uma janela de um mês só — assim a
 * sparkline e o número grande NUNCA podem divergir: são a mesma função. A
 * alternativa (uma conta para o card e outra para o gráfico) é como um total
 * deixa de bater com a soma das partes.
 *
 * Cuidado com estoque: a série de um estoque é o valor NO FIM de cada mês, e
 * `noFim` já entrega isso — passar um balde mensal devolve o estoque naquele
 * corte, não o que entrou no mês. É o comportamento certo, e é por isso que a
 * sparkline de "Pipeline em aberto" é uma linha de nível e não de fluxo.
 */
export function calcularKpi(def: DefinicaoKpi, d: Dados, meses: number, base: Date = new Date()): KpiCalculado {
  const atual = def.medir(d, janelaMeses(meses, base));
  const anterior = def.comparavel ? def.medir(d, janelaAnterior(meses, base)) : null;
  // Preserva o `null`: ver o comentário de `Serie.valores`. Achatar em zero
  // aqui é o bug clássico do painel de vendas — mês sem negócio decidido
  // apareceria como despencada de conversão.
  const serie = baldesMensais(meses, base).map(b => def.medir(d, b).valor);
  const delta = anterior && atual.valor !== null && anterior.valor !== null
    ? atual.valor - anterior.valor
    : null;
  return { def, atual, anterior, delta, serie };
}

export function calcularKpis(chaves: string[], d: Dados, meses: number, base: Date = new Date()): KpiCalculado[] {
  const out: KpiCalculado[] = [];
  chaves.forEach(c => {
    const def = KPIS.filter(k => k.chave === c)[0];
    if (def) out.push(calcularKpi(def, d, meses, base));
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Séries mensais para os gráficos
// ─────────────────────────────────────────────────────────────────────────────

export interface Serie {
  chave: string;
  rotulo: string;
  cor: string;
  /**
   * `null` é BURACO na curva, não zero.
   *
   * A distinção é o motivo desta tela existir. Numa contagem ou numa soma, o
   * zero é um resultado: não entrou lead nenhum em março. Numa TAXA, mês sem
   * amostra não é "conversão de 0%" — é "não dá para saber", e desenhar zero
   * ali afirma exatamente o oposto do que aconteceu, no gráfico que o gerente
   * usa para decidir se o time piorou.
   *
   * A regra sai de graça das próprias métricas: elas já devolvem `null` sem
   * amostra e um número quando há resultado, então a série só precisa não
   * achatar esse `null` para zero.
   */
  valores: (number | null)[];
  /** Mesma série na janela anterior, alinhada mês a mês, para sobrepor. */
  anterior?: (number | null)[];
}

type ContaMes = (d: Dados, b: Janela) => number;

const CONTAS: Record<string, ContaMes> = {
  leads:     (d, b) => d.empresas.filter(e => ehReal(e) && em(e.criado_em, b)).length,
  propostas: (d, b) => d.orcamentos.filter(o => em(o.data_envio, b)).length,
  fechados:  (d, b) => d.empresas.filter(e => e.status === "Fechado" && em(e.status_atualizado_em, b)).length,
  perdidos:  (d, b) => d.empresas.filter(e => e.status === "Perdido" && em(e.status_atualizado_em, b)).length,
  aprovado:  (d, b) => aprovadosNa(d, b).reduce((s, o) => s + num(o.total), 0),
  recusado:  (d, b) => d.orcamentos.filter(o => o.status === "recusado" && em(o.data_decisao, b))
                        .reduce((s, o) => s + num(o.total), 0),
  negociacao: (d, b) => pipelineEm(d, b.fim).valor ?? 0,
};

/**
 * Monta uma série mensal, opcionalmente com o mesmo recorte do período
 * anterior alinhado posição a posição.
 *
 * Alinhar por POSIÇÃO e não por mês é o que faz a sobreposição significar algo:
 * o 1º ponto da linha cinza é o 1º mês do período anterior, comparado com o 1º
 * mês do atual. Alinhar por nome do mês só funcionaria com janela de 12 meses.
 */
export function serieMensal(
  chave: string, rotulo: string, cor: string,
  d: Dados, meses: number, base: Date = new Date(), comAnterior = false,
): Serie {
  const conta = CONTAS[chave];
  if (!conta) return { chave, rotulo, cor, valores: [] };
  const valores = baldesMensais(meses, base).map(b => conta(d, b));
  if (!comAnterior) return { chave, rotulo, cor, valores };
  // Os `meses` meses anteriores: a mesma grade recuada `meses` posições.
  const recuo = new Date(base.getFullYear(), base.getMonth() - meses, 1, 12, 0, 0, 0);
  const anterior = baldesMensais(meses, recuo).map(b => conta(d, b));
  return { chave, rotulo, cor, valores, anterior };
}

/**
 * A série mensal de um KPI, com a do período anterior alinhada por posição.
 *
 * É o que permite a caixa de indicador COMANDAR o gráfico grande: clicar em
 * "Ticket médio" desenha o ticket mês a mês. O número do card e a curva saem
 * da mesma `def.medir`, então não há como divergirem — que é o modo clássico
 * de um dashboard perder a confiança de quem o lê.
 */
export function serieKpi(
  def: DefinicaoKpi, d: Dados, meses: number, base: Date = new Date(),
): Serie {
  const valores = baldesMensais(meses, base).map(b => def.medir(d, b).valor);
  const recuo = new Date(base.getFullYear(), base.getMonth() - meses, 1, 12, 0, 0, 0);
  const anterior = def.comparavel
    ? baldesMensais(meses, recuo).map(b => def.medir(d, b).valor)
    : undefined;
  return { chave: def.chave, rotulo: def.rotulo, cor: def.cor, valores, anterior };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fila de cobrança
// ─────────────────────────────────────────────────────────────────────────────

export interface Alerta {
  chave: string;
  titulo: string;
  sub: string;
  valor: number;
  cor: string;
  /** true quando o número alto é problema — a tela só pinta esses. */
  ruim: boolean;
}

/**
 * As contagens de coisa parada.
 *
 * Snapshot de hoje, sem janela: cobrança é sobre o que está pendente AGORA, e
 * um follow-up vencido em março que já foi resolvido não é dívida. Fechadas,
 * perdidas e rascunhos ficam de fora — não há o que cobrar de quem saiu do
 * funil.
 *
 * As datas destes campos saem de `<input type="date">` e chegam como
 * "YYYY-MM-DD", que o JavaScript lê como meia-noite UTC. Em Brasília isso vira
 * 21h do dia anterior, e um retorno marcado para HOJE cairia como vencido —
 * por isso tudo passa por `dataLocal`/`inicioDoDia` e nada usa `new Date` cru.
 */
export function alertasDeAtencao(d: Dados, hoje: Date = new Date()): Alerta[] {
  const ativas = d.empresas.filter(ehAtiva);
  const corte = inicioDoDia(hoje).getTime();
  const diaDe = (v: string | null) => {
    const x = dataLocal(v);
    return x ? inicioDoDia(x).getTime() : null;
  };
  return [
    {
      chave: "vencido", titulo: "Retorno vencido", sub: "O follow-up passou da data",
      valor: ativas.filter(e => { const t = diaDe(e.data_proxima_acao); return t !== null && t < corte; }).length,
      cor: "#F87171", ruim: true,
    },
    {
      chave: "hoje", titulo: "Retornos de hoje", sub: "Marcados para agora",
      valor: ativas.filter(e => diaDe(e.data_proxima_acao) === corte).length,
      cor: "#8FC4FA", ruim: false,
    },
    {
      chave: "parado", titulo: "Sem contato há 15+ dias", sub: "Risco de perder o vínculo",
      valor: ativas.filter(e => diasDesde(e.ultima_interacao) >= DIAS_PARADA).length,
      cor: "#F0A05A", ruim: true,
    },
    {
      chave: "esfriando", titulo: "Quentes esfriando", sub: "Lead quente sem contato há 5+ dias",
      valor: ativas.filter(e => e.temperatura === "Quente" && diasDesde(e.ultima_interacao) >= 5).length,
      cor: "#F87171", ruim: true,
    },
    {
      chave: "semagenda", titulo: "Sem nada agendado", sub: "Nenhum compromisso à frente",
      valor: ativasSemAgenda(d, hoje).valor ?? 0,
      cor: "#F0A05A", ruim: true,
    },
    {
      chave: "semplano", titulo: "Sem próxima ação", sub: "Ninguém definiu o passo seguinte",
      valor: ativas.filter(e => !e.data_proxima_acao).length,
      cor: "#F0A05A", ruim: true,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Recortes por categoria
// ─────────────────────────────────────────────────────────────────────────────

export interface LinhaCategoria {
  categoria: string;
  total: number;
  fechados: number;
  perdidos: number;
  /** null quando nada foi decidido nesta categoria — diferente de 0%. */
  conversao: number | null;
  /** Valor aprovado das empresas desta categoria. */
  valor: number;
}

type ChaveCategoria = "segmento" | "porte" | "cidade" | "origem_lead" | "temperatura" | "motivo_perdido";

/**
 * Agrupa empresas por um campo e mede o desfecho de cada grupo.
 *
 * Mede quem FECHA, não quem entra: é a diferença entre "de onde vêm mais
 * leads" e "de onde vem receita", e só a segunda decide onde o time gasta a
 * próxima hora.
 *
 * O período recorta pela ENTRADA da empresa (`criado_em`), não pelo desfecho:
 * a pergunta aqui é "os leads que captei neste período, em que deram", e
 * misturar entradas de janelas diferentes no mesmo denominador tornaria as
 * taxas incomparáveis entre si.
 */
export function porCategoria(
  d: Dados, chave: ChaveCategoria, j: Janela | null = null, limite = 8,
): LinhaCategoria[] {
  const valorPorEmpresa: Record<string, number> = {};
  d.orcamentos.forEach(o => {
    if (o.status !== "aprovado") return;
    valorPorEmpresa[o.empresa_id] = (valorPorEmpresa[o.empresa_id] || 0) + num(o.total);
  });

  const grupos: Record<string, LinhaCategoria> = {};
  d.empresas.forEach(e => {
    if (!ehReal(e)) return;
    if (j && !em(e.criado_em, j)) return;
    // "Perdido" é o único recorte em que a ausência do campo é a informação:
    // perdeu e ninguém escreveu por quê. Nos demais, sem valor é sem valor.
    if (chave === "motivo_perdido" && e.status !== "Perdido") return;
    const bruto = (e[chave] || "").trim();
    const nome = bruto || (chave === "motivo_perdido" ? "Motivo não registrado" : SEM_CATEGORIA);
    const g = grupos[nome] || (grupos[nome] = {
      categoria: nome, total: 0, fechados: 0, perdidos: 0, conversao: null, valor: 0,
    });
    g.total += 1;
    if (e.status === "Fechado") g.fechados += 1;
    if (e.status === "Perdido") g.perdidos += 1;
    g.valor += valorPorEmpresa[e.empresa_id] || 0;
  });

  const linhas = Object.keys(grupos).map(k => {
    const g = grupos[k];
    const decid = g.fechados + g.perdidos;
    g.conversao = decid > 0 ? (g.fechados / decid) * 100 : null;
    return g;
  });

  // Ordena por VALOR primeiro. Quantidade desempata; nome desempata a
  // quantidade, para a lista não reordenar sozinha a cada polling.
  linhas.sort((a, b) => b.valor - a.valor || b.total - a.total
    || a.categoria.localeCompare(b.categoria, "pt-BR"));
  return linhas.slice(0, limite);
}

/** Motivos de recusa das propostas — o espelho de `motivo_perdido` no orçamento. */
export function motivosRecusa(d: Dados, j: Janela | null = null, limite = 8) {
  const grupos: Record<string, { motivo: string; total: number; valor: number }> = {};
  d.orcamentos.forEach(o => {
    if (o.status !== "recusado") return;
    if (j && !em(o.data_decisao, j)) return;
    const nome = (o.motivo_recusa || "").trim() || "Motivo não registrado";
    const g = grupos[nome] || (grupos[nome] = { motivo: nome, total: 0, valor: 0 });
    g.total += 1;
    g.valor += num(o.total);
  });
  const linhas = Object.keys(grupos).map(k => grupos[k]);
  linhas.sort((a, b) => b.valor - a.valor || b.total - a.total
    || a.motivo.localeCompare(b.motivo, "pt-BR"));
  return linhas.slice(0, limite);
}

// ─────────────────────────────────────────────────────────────────────────────
// Funil
// ─────────────────────────────────────────────────────────────────────────────

export interface EtapaFunil {
  etapa: string;
  quantidade: number;
  fatia: number;
  valor: number;
  /**
   * Dias medianos que quem está NA etapa já passou nela.
   *
   * Não é "tempo de passagem pela etapa" — para isso seria preciso o histórico
   * de status, que o backend não expõe em lote. É o tempo de PERMANÊNCIA de
   * quem está parado ali agora, medido por `status_atualizado_em`, e é
   * exatamente o número que aponta onde o funil está entupido.
   *
   * Mediana e não média: uma empresa esquecida há 400 dias arrasta a média da
   * etapa inteira e esconde que as outras estão saudáveis.
   */
  diasParado: number | null;
}

/** Mediana de uma lista já não vazia. */
function mediana(v: number[]): number {
  const s = v.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Retrato do funil AGORA — não taxa de passagem.
 *
 * Não recebe janela: contar "quem está em Proposta hoje" dentro de um recorte
 * de tempo não significa nada. O período da tela move os fluxos; o retrato é
 * sempre do instante presente, e a tela diz isso.
 */
export function retratoFunil(d: Dados): EtapaFunil[] {
  const valorPorEmpresa: Record<string, number> = {};
  d.orcamentos.forEach(o => {
    if (o.status !== "aprovado" && ORCAMENTO_ABERTO.indexOf(o.status) === -1) return;
    valorPorEmpresa[o.empresa_id] = (valorPorEmpresa[o.empresa_id] || 0) + num(o.total);
  });

  const reais = d.empresas.filter(ehReal);
  return ETAPAS_FUNIL.map(etapa => {
    const naEtapa = reais.filter(e => e.status === etapa);
    const paradas: number[] = [];
    naEtapa.forEach(e => {
      const dias = diasDesde(e.status_atualizado_em);
      if (isFinite(dias)) paradas.push(dias);
    });
    return {
      etapa,
      quantidade: naEtapa.length,
      fatia: reais.length > 0 ? (naEtapa.length / reais.length) * 100 : 0,
      valor: naEtapa.reduce((s, e) => s + (valorPorEmpresa[e.empresa_id] || 0), 0),
      diasParado: paradas.length ? mediana(paradas) : null,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Envelhecimento das propostas
// ─────────────────────────────────────────────────────────────────────────────

export interface FaixaAging {
  rotulo: string;
  quantidade: number;
  valor: number;
  /** true a partir de 16 dias: a tela pinta como cobrança atrasada. */
  alerta: boolean;
}

/**
 * Propostas em aberto por quanto tempo esperam resposta.
 *
 * Estoque puro, medido hoje — por isso não recebe janela. Os cortes (7/15/30)
 * são de calendário comercial: uma semana, duas, um mês. `tempoRespostaCliente`
 * diz qual é o normal desta conta; estas faixas dizem quem já passou dele.
 */
export function agingPropostas(d: Dados, hoje: Date = new Date()): FaixaAging[] {
  const faixas: FaixaAging[] = [
    { rotulo: "até 7 dias",   quantidade: 0, valor: 0, alerta: false },
    { rotulo: "8 a 15 dias",  quantidade: 0, valor: 0, alerta: false },
    { rotulo: "16 a 30 dias", quantidade: 0, valor: 0, alerta: true },
    { rotulo: "mais de 30",   quantidade: 0, valor: 0, alerta: true },
  ];
  d.orcamentos.forEach(o => {
    if (ORCAMENTO_ABERTO.indexOf(o.status) === -1) return;
    const enviou = dataLocal(o.data_envio);
    if (!enviou) return;   // em aberto mas sem data de envio: não dá para envelhecer
    const dias = Math.floor((inicioDoDia(hoje).getTime() - inicioDoDia(enviou).getTime()) / 86_400_000);
    const i = dias <= 7 ? 0 : dias <= 15 ? 1 : dias <= 30 ? 2 : 3;
    faixas[i].quantidade += 1;
    faixas[i].valor += num(o.total);
  });
  return faixas;
}

// ─────────────────────────────────────────────────────────────────────────────
// Time
// ─────────────────────────────────────────────────────────────────────────────

export interface LinhaVendedor {
  id: string;
  nome: string;
  ativo: boolean;
  equipe: string | null;
  carteira: number;
  fechados: number;
  /** Exposto, e não reconstruído a partir de `conversao`: quem tem zero
   *  fechamentos tem conversão 0, e dividir por ela perderia os perdidos dele
   *  na hora de somar a equipe — a equipe apareceria melhor do que é. */
  perdidos: number;
  conversao: number | null;
  aberto: number;
  aprovado: number;
  /** Δ do valor aprovado contra o período anterior. null sem base anterior. */
  deltaAprovado: number | null;
  ticket: number | null;
  propostas: number;
  atividades: number;
  paradas: number;
}

const DIAS_PARADA = 15;

/**
 * Uma linha por vendedor no escopo.
 *
 * `usuarios` já vem escopado pelo backend — gerente recebe a conta inteira,
 * supervisor recebe a si mesmo mais os vendedores que apontam para ele. Esta
 * função NÃO reimplementa esse recorte: ela mede exatamente quem chegou. É a
 * mesma regra do backend (`escopo_vendedores` é a fonte única de escopo), e
 * ramificar em `is_gerente` aqui reabriria a divergência que ela fechou.
 *
 * Carteira é ESTOQUE (quem está com quem hoje); fechados, valor e atividades
 * são FLUXO da janela. Estão na mesma linha porque a pergunta do gerente é
 * "quanto esta carteira produziu no período", e as duas metades respondem
 * juntas — a tabela rotula qual coluna é qual.
 */
export function porVendedor(
  d: Dados, usuarios: UsuarioMetrica[], meses: number, base: Date = new Date(),
): LinhaVendedor[] {
  const j = janelaMeses(meses, base);
  const ant = janelaAnterior(meses, base);

  const linhas = usuarios
    .filter(u => u.role === "vendedor" || u.role === "supervisor")
    .map(u => {
      const carteira = d.empresas.filter(e => ehReal(e) && e.vendedor_id === u.usuario_id);
      const idsEmpresa: Record<string, true> = {};
      carteira.forEach(e => { idsEmpresa[e.empresa_id] = true; });
      const meus = d.orcamentos.filter(o => idsEmpresa[o.empresa_id]);

      const fechados = carteira.filter(e =>
        e.status === "Fechado" && em(e.status_atualizado_em, j)).length;
      const perdidos = carteira.filter(e =>
        e.status === "Perdido" && em(e.status_atualizado_em, j)).length;

      const apr = meus.filter(o => o.status === "aprovado" && em(o.data_decisao, j));
      const aprovado = apr.reduce((s, o) => s + num(o.total), 0);
      const aprovadoAnt = meus
        .filter(o => o.status === "aprovado" && em(o.data_decisao, ant))
        .reduce((s, o) => s + num(o.total), 0);

      const aberto = meus
        .filter(o => ORCAMENTO_ABERTO.indexOf(o.status) !== -1)
        .reduce((s, o) => s + num(o.total), 0);

      return {
        id: u.usuario_id,
        nome: u.nome,
        ativo: u.ativo,
        equipe: u.supervisor_nome || null,
        carteira: carteira.length,
        fechados,
        perdidos,
        conversao: fechados + perdidos > 0 ? (fechados / (fechados + perdidos)) * 100 : null,
        aberto,
        aprovado,
        // Sem nada no período anterior o Δ seria "+100%" a partir do zero, que
        // não informa nada. Só compara quem tem os dois lados.
        deltaAprovado: aprovadoAnt > 0 ? aprovado - aprovadoAnt : null,
        ticket: apr.length ? aprovado / apr.length : null,
        propostas: meus.filter(o => em(o.data_envio, j)).length,
        atividades: d.eventos.filter(ev =>
          !!ev.empresa_id && idsEmpresa[ev.empresa_id] && em(ev.data, j)).length,
        paradas: carteira.filter(e =>
          ehAtiva(e) && diasDesde(e.ultima_interacao) >= DIAS_PARADA).length,
      };
    });

  // Quem trouxe mais dinheiro primeiro; carteira desempata, nome desempata a
  // carteira — sem isso a tabela reordena sozinha a cada atualização.
  linhas.sort((a, b) => b.aprovado - a.aprovado || b.carteira - a.carteira
    || a.nome.localeCompare(b.nome, "pt-BR"));
  return linhas;
}

export interface LinhaEquipe {
  equipe: string;
  vendedores: number;
  carteira: number;
  fechados: number;
  conversao: number | null;
  aprovado: number;
  paradas: number;
}

/**
 * As mesmas linhas somadas por supervisor.
 *
 * Só faz sentido para quem enxerga mais de uma equipe — ou seja, o gerente.
 * A tela decide pelo DADO (`equipesComparaveis`), não pela função do usuário:
 * um supervisor recebe do backend apenas a própria equipe, então o
 * agrupamento devolveria um grupo só. Testar o dado em vez do papel evita uma
 * segunda regra de hierarquia no frontend, que poderia divergir do backend.
 */
export function porEquipe(linhas: LinhaVendedor[]): LinhaEquipe[] {
  const grupos: Record<string, LinhaEquipe & { perdidos: number }> = {};
  linhas.forEach(l => {
    const nome = l.equipe || "Sem supervisor";
    const g = grupos[nome] || (grupos[nome] = {
      equipe: nome, vendedores: 0, carteira: 0, fechados: 0,
      conversao: null, aprovado: 0, paradas: 0, perdidos: 0,
    });
    g.vendedores += 1;
    g.carteira += l.carteira;
    g.fechados += l.fechados;
    g.perdidos += l.perdidos;
    g.aprovado += l.aprovado;
    g.paradas += l.paradas;
  });
  // A conversão da equipe sai dos NÚMEROS somados, nunca da média das taxas
  // dos vendedores: média de porcentagem sobre amostras de tamanhos diferentes
  // dá peso igual a quem decidiu 2 negócios e a quem decidiu 60.
  return Object.keys(grupos).map(k => {
    const g = grupos[k];
    const decid = g.fechados + g.perdidos;
    return {
      equipe: g.equipe, vendedores: g.vendedores, carteira: g.carteira,
      fechados: g.fechados, aprovado: g.aprovado, paradas: g.paradas,
      conversao: decid > 0 ? (g.fechados / decid) * 100 : null,
    };
  }).sort((a, b) => b.aprovado - a.aprovado || b.carteira - a.carteira
    || a.equipe.localeCompare(b.equipe, "pt-BR"));
}

/** Há mais de uma equipe no escopo? É o que libera a comparação entre times. */
export function equipesComparaveis(linhas: LinhaVendedor[]): boolean {
  const vistas: Record<string, true> = {};
  linhas.forEach(l => { if (l.equipe) vistas[l.equipe] = true; });
  return Object.keys(vistas).length > 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Atividades
// ─────────────────────────────────────────────────────────────────────────────

/** Os mesmos tipos e cores do calendário — o mesmo evento não pode ter duas caras. */
export const TIPOS_ATIVIDADE = [
  { chave: "call",     rotulo: "Calls",     cor: "#56A4F5" },
  { chave: "visita",   rotulo: "Visitas",   cor: "#2CCD93" },
  { chave: "reuniao",  rotulo: "Reuniões",  cor: "#A78BFA" },
  { chave: "proposta", rotulo: "Propostas", cor: "#F0A05A" },
];

export interface SerieAtividade {
  chave: string;
  rotulo: string;
  cor: string;
  /** Só o que já foi cumprido: evento com data no futuro ainda não aconteceu. */
  valores: number[];
  total: number;
  /**
   * O que está marcado daqui para a frente — TODO ele, sem recorte de janela.
   *
   * Limitar à janela zeraria o número na prática: a janela termina no fim do
   * mês corrente, então só sobreviveriam os compromissos das próximas semanas
   * e uma visita marcada para o mês que vem sumiria. "Ainda agendadas" é o que
   * está na agenda, e agenda é para a frente.
   */
  aFrente: number;
}

/**
 * Uma série por tipo de atividade.
 *
 * São desenhadas como gráficos pequenos separados (small multiples), e não
 * como quatro linhas num gráfico só, por um motivo medido e não estético: as
 * cores do calendário são as do CRM, e o azul da call contra o roxo da reunião
 * têm ΔE 11 em OKLab para visão normal e 0,7 sob deuteranopia — as duas linhas
 * seriam literalmente a mesma cor para parte dos usuários. Separadas, cada
 * gráfico tem uma série só e a cor não precisa distinguir nada.
 */
export function atividadesPorTipo(
  d: Dados, meses: number, base: Date = new Date(),
): SerieAtividade[] {
  const baldes = baldesMensais(meses, base);
  const agora = base;
  return TIPOS_ATIVIDADE.map(t => {
    const meus = d.eventos.filter(ev => ev.tipo === t.chave);
    const valores = baldes.map(b => meus.filter(ev => {
      const dt = dataLocal(ev.data);
      return dentro(dt, b) && !!dt && dt <= agora;   // agendada no futuro ainda não foi cumprida
    }).length);
    return {
      chave: t.chave, rotulo: t.rotulo, cor: t.cor, valores,
      total: valores.reduce((s, v) => s + v, 0),
      aFrente: meus.filter(ev => {
        const dt = dataLocal(ev.data);
        return !!dt && dt > agora;
      }).length,
    };
  });
}

/**
 * Quantas atividades foram registradas para cada negócio fechado no período.
 *
 * É o custo de aquisição em esforço: se sobe sem a conversão subir junto, o
 * time está trabalhando mais para ganhar o mesmo.
 */
export function esforcoPorFechamento(d: Dados, j: Janela): Medida {
  const fechados = d.empresas.filter(e =>
    e.status === "Fechado" && em(e.status_atualizado_em, j)).length;
  const atividades = d.eventos.filter(ev => em(ev.data, j)).length;
  if (fechados === 0) return semBase("nenhum fechamento no período");
  return { valor: atividades / fechados, amostra: fechados,
    base: `${atividades} atividades ÷ ${plural(fechados, "fechamento", "fechamentos")}` };
}

/** Empresas ativas sem nenhuma atividade agendada daqui para a frente. */
export function ativasSemAgenda(d: Dados, hoje: Date = new Date()): Medida {
  const ativas = d.empresas.filter(ehAtiva);
  const comAgenda: Record<string, true> = {};
  d.eventos.forEach(ev => {
    const dt = dataLocal(ev.data);
    if (ev.empresa_id && dt && inicioDoDia(dt) >= inicioDoDia(hoje)) comAgenda[ev.empresa_id] = true;
  });
  const sem = ativas.filter(e => !comAgenda[e.empresa_id]).length;
  return { valor: sem, amostra: ativas.length,
    base: ativas.length ? `de ${ativas.length} empresas ativas` : "nenhuma empresa ativa" };
}

/**
 * Taxa de aceite dos convites de reunião enviados.
 *
 * `status_resposta` só existe em evento com convidado; quem não tem convite
 * fica fora do denominador — contá-los como "não respondeu" transformaria
 * compromisso interno em recusa do cliente.
 */
export function taxaAceiteConvite(d: Dados, j: Janela): Medida {
  const comConvite = d.eventos.filter(ev => !!ev.status_resposta && em(ev.data, j));
  const aceitos = comConvite.filter(ev => ev.status_resposta === "aceito").length;
  return razao(aceitos, comConvite.length,
    comConvite.length ? `${aceitos} de ${comConvite.length} convites` : "nenhum convite enviado");
}
