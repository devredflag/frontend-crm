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

import { dataLocal, inicioDoDia, diasDesde, diasSemContato } from "./data";

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
  /**
   * O campo DIGITADO no cadastro. Continua existindo e continua sendo do
   * usuário — mas não use para medir atividade: veja `ultimo_contato`.
   */
  ultima_interacao: string | null;
  /**
   * Derivados no backend (ver o bloco "Contato derivado" antes de `/empresas`
   * no `main.py`): o maior entre a data digitada, o último compromisso já
   * acontecido e a última observação; a primeira dessas duas últimas; e quantos
   * toques a empresa recebeu.
   *
   * Opcionais porque o backend pode ainda não ter deployado — `diasSemContato`
   * cai no campo digitado nesse caso.
   */
  ultimo_contato?: string | null;
  primeiro_contato?: string | null;
  contatos?: number;
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
  /**
   * Subir é bom NESTA série? Decide a cor da variação mês a mês no balão.
   *
   * Não dá para deduzir do gráfico: "negócios perdidos" e "ciclo de fechamento"
   * sobem para o lado errado, e pintar toda alta de verde diria que piorar é
   * melhorar. Padrão `true` porque é o caso da maioria.
   */
  subirEBom?: boolean;
}

type ContaMes = (d: Dados, b: Janela) => number;

/**
 * Séries em que SUBIR é piorar. Decide a cor da variação no balão do gráfico.
 *
 * Lista explícita e não uma regra esperta: "perdidos" e "recusado" são os dois
 * casos hoje, e adivinhar pelo nome (algo como "contém 'perd'") quebraria em
 * silêncio no dia em que alguém criar "recuperados".
 */
const SUBIR_E_RUIM: Record<string, true> = { perdidos: true, recusado: true };

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
  if (!conta) return { chave, rotulo, cor, valores: [], subirEBom: true };
  const subirEBom = !SUBIR_E_RUIM[chave];
  const valores = baldesMensais(meses, base).map(b => conta(d, b));
  if (!comAnterior) return { chave, rotulo, cor, valores, subirEBom };
  // Os `meses` meses anteriores: a mesma grade recuada `meses` posições.
  const recuo = new Date(base.getFullYear(), base.getMonth() - meses, 1, 12, 0, 0, 0);
  const anterior = baldesMensais(meses, recuo).map(b => conta(d, b));
  return { chave, rotulo, cor, valores, anterior, subirEBom };
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
  return {
    chave: def.chave, rotulo: def.rotulo, cor: def.cor, valores, anterior,
    subirEBom: def.subirEBom,
  };
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
      chave: "parado", titulo: "Sem contato há 15+ dias", sub: "Agenda, observação ou cadastro",
      valor: ativas.filter(e => diasSemContato(e) >= DIAS_PARADA).length,
      cor: "#F0A05A", ruim: true,
    },
    {
      chave: "esfriando", titulo: "Quentes esfriando", sub: "Lead quente sem contato há 5+ dias",
      valor: ativas.filter(e => e.temperatura === "Quente" && diasSemContato(e) >= 5).length,
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
          ehAtiva(e) && diasSemContato(e) >= DIAS_PARADA).length,
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

// ─────────────────────────────────────────────────────────────────────────────
// Grade DIÁRIA — o ritmo dentro do mês
//
// Tudo acima desta linha é mensal, e por um bom motivo: o mês é a unidade em
// que se crava meta. Mas o mês também esconde a única coisa que diz se o time
// está reagindo AGORA — a inclinação dentro dele. Um mês que fechou igual ao
// anterior pode ter começado devagar e acelerado, ou o contrário, e as duas
// leituras pedem decisões opostas.
//
// ⚠️ O dia NÃO vira ponto de gráfico grande em lugar nenhum: contagem diária de
// um CRM pequeno é quase toda zero, e uma linha diária desenharia serrilha onde
// não há sinal. O diário entra como AGREGADO (média por dia, metade contra
// metade, dia da semana) e como ACUMULADO — nunca como série crua.
// ─────────────────────────────────────────────────────────────────────────────

export interface BaldeDia {
  /** Dia do mês, 1–31. */
  dia: number;
  /** 0 = domingo. */
  diaSemana: number;
  /** "12/03" */
  rotulo: string;
  inicio: Date;
  fim: Date;
}

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/**
 * Um balde por dia entre `inicio` e `fim`, sem passar de hoje.
 *
 * O corte em hoje é o que impede o mês corrente de parecer uma queda: sem ele,
 * os dias que ainda não aconteceram entram como zero e afundam qualquer média
 * ou inclinação calculada sobre eles. Quem consome sabe que a última janela é
 * parcial porque `parcial` diz isso — não porque adivinhou pelo desenho.
 */
export function baldesDiarios(inicio: Date, fim: Date, hoje: Date = new Date()): BaldeDia[] {
  const out: BaldeDia[] = [];
  const ultimo = fim < hoje ? fim : hoje;
  const cursor = inicioDoDia(inicio);
  const parada = inicioDoDia(ultimo);
  // Teto de segurança: pouco mais de dois anos de dias. Janela absurda vinda de
  // um filtro errado não pode virar laço infinito na thread da interface.
  for (let guarda = 0; cursor <= parada && guarda < 800; guarda++) {
    const d = new Date(cursor);
    out.push({
      dia: d.getDate(),
      diaSemana: d.getDay(),
      rotulo: `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}`,
      inicio: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
      fim: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export type Direcao = "acelerando" | "desacelerando" | "estável";

export interface RitmoMes {
  chave: string;
  /** Um valor por dia JÁ DECORRIDO do mês. */
  porDia: number[];
  dias: number;
  total: number;
  /** Total ÷ dias decorridos. */
  media: number;
  primeiraMetade: number;
  segundaMetade: number;
  /** (segunda − primeira) ÷ primeira. `null` quando a primeira metade é zero. */
  variacao: number | null;
  /**
   * `null` = amostra pequena demais para afirmar direção.
   *
   * Sem esse null, um mês com dois leads viraria "acelerando 100%" porque os
   * dois caíram na segunda quinzena — e é exatamente esse tipo de frase que
   * faz um painel perder a confiança de quem o lê.
   */
  direcao: Direcao | null;
  /** O mês ainda não terminou: os dias contados não são o mês inteiro. */
  parcial: boolean;
  /** Dia do mês com o maior valor, e o valor. `null` quando não houve nada. */
  diaPico: number | null;
  picoValor: number;
  diasComAlgo: number;
}

/** Piso para afirmar direção: abaixo disso, metade contra metade é ruído. */
const MINIMO_PARA_DIRECAO = 4;
/** Quanto a segunda metade precisa se afastar da primeira para não ser "estável". */
const MARGEM_DIRECAO = 0.2;

/**
 * Como uma das contagens do funil se distribuiu DENTRO de um mês.
 *
 * É o que o balão do gráfico de ritmo passa a dizer: o mês fechou em 12 leads,
 * mas 9 deles entraram na segunda quinzena — o time está reagindo, e o número
 * mensal sozinho não contava isso.
 *
 * A direção sai de METADE CONTRA METADE, e não de uma regressão. Com trinta
 * pontos quase todos zerados, a inclinação de mínimos quadrados é dominada
 * pelos poucos dias com valor e troca de sinal com um único negócio mudando de
 * dia. Somar as metades é grosseiro de propósito: é a leitura que sobrevive à
 * amostra que este CRM tem.
 */
export function ritmoDoMes(
  chave: string, d: Dados, b: Balde, hoje: Date = new Date(),
): RitmoMes {
  const conta = CONTAS[chave];
  const dias = baldesDiarios(b.inicio, b.fim, hoje);
  const porDia = conta ? dias.map(dia => conta(d, { inicio: dia.inicio, fim: dia.fim })) : [];
  const total = porDia.reduce((s, v) => s + v, 0);
  const meio = Math.floor(porDia.length / 2);
  const primeiraMetade = porDia.slice(0, meio).reduce((s, v) => s + v, 0);
  // Em contagem ímpar de dias, o do meio fica com a SEGUNDA metade: numa
  // leitura de "está acelerando?", o presente pesa mais que o passado.
  const segundaMetade = porDia.slice(meio).reduce((s, v) => s + v, 0);

  let diaPico: number | null = null;
  let picoValor = 0;
  porDia.forEach((v, i) => { if (v > picoValor) { picoValor = v; diaPico = dias[i].dia; } });

  const variacao = primeiraMetade > 0 ? (segundaMetade - primeiraMetade) / primeiraMetade : null;
  let direcao: Direcao | null = null;
  if (total >= MINIMO_PARA_DIRECAO && porDia.length >= 6) {
    if (variacao === null) direcao = segundaMetade > 0 ? "acelerando" : "estável";
    else if (variacao >= MARGEM_DIRECAO) direcao = "acelerando";
    else if (variacao <= -MARGEM_DIRECAO) direcao = "desacelerando";
    else direcao = "estável";
  }

  const inicioHoje = inicioDoDia(hoje);
  return {
    chave,
    porDia,
    dias: porDia.length,
    total,
    media: porDia.length ? total / porDia.length : 0,
    primeiraMetade,
    segundaMetade,
    variacao,
    direcao,
    parcial: inicioHoje >= inicioDoDia(b.inicio) && inicioHoje <= inicioDoDia(b.fim),
    diaPico,
    picoValor,
    diasComAlgo: porDia.filter(v => v > 0).length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// A conversão dia a dia
// ─────────────────────────────────────────────────────────────────────────────

export interface PontoConversaoDia {
  rotulo: string;
  data: Date;
  fechadosDia: number;
  perdidosDia: number;
  fechadosAcum: number;
  perdidosAcum: number;
  decididosAcum: number;
  /** Taxa ACUMULADA até o dia. `null` enquanto nada foi decidido no período. */
  taxaAcum: number | null;
}

/** Chave de dia local, para agrupar sem comparar Date a Date num laço. */
const chaveDia = (d: Date) =>
  `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;

/**
 * A curva acumulada da taxa de conversão, dia a dia dentro da janela.
 *
 * ACUMULADA, e não diária: a taxa de um dia isolado é 0% ou 100% na quase
 * totalidade dos dias deste CRM — um desenho de serrilha que não informa nada.
 * A acumulada mostra o que a pergunta pede ("como ela foi crescendo com os dias
 * passando"): cada ponto é a conversão do período ATÉ ali, então a curva é a
 * própria história da taxa se formando, e o último ponto é exatamente o número
 * grande do card.
 *
 * Antes da primeira decisão a taxa é `null`, não zero — a mesma regra do resto
 * do arquivo. Zero ali afirmaria "converteu nada" onde o certo é "nada foi
 * decidido ainda".
 */
export function conversaoDiaria(d: Dados, j: Janela, hoje: Date = new Date()): PontoConversaoDia[] {
  const fechadosPorDia: Record<string, number> = {};
  const perdidosPorDia: Record<string, number> = {};
  d.empresas.forEach(e => {
    if (e.status !== "Fechado" && e.status !== "Perdido") return;
    const dt = dataLocal(e.status_atualizado_em);
    if (!dt || !dentro(dt, j)) return;
    const k = chaveDia(dt);
    const alvo = e.status === "Fechado" ? fechadosPorDia : perdidosPorDia;
    alvo[k] = (alvo[k] || 0) + 1;
  });

  let fechadosAcum = 0, perdidosAcum = 0;
  return baldesDiarios(j.inicio, j.fim, hoje).map(dia => {
    const k = chaveDia(dia.inicio);
    const fechadosDia = fechadosPorDia[k] || 0;
    const perdidosDia = perdidosPorDia[k] || 0;
    fechadosAcum += fechadosDia;
    perdidosAcum += perdidosDia;
    const decididosAcum = fechadosAcum + perdidosAcum;
    return {
      rotulo: dia.rotulo,
      data: dia.inicio,
      fechadosDia,
      perdidosDia,
      fechadosAcum,
      perdidosAcum,
      decididosAcum,
      taxaAcum: decididosAcum > 0 ? (fechadosAcum / decididosAcum) * 100 : null,
    };
  });
}

export interface MarcoConversao {
  rotulo: string;
  data: Date;
  taxa: number;
  decididos: number;
  /** Pontos percentuais que a taxa acumulada moveu NAQUELE dia. */
  variacao: number;
  fechadosDia: number;
  perdidosDia: number;
}

/**
 * Os dias em que a taxa acumulada REALMENTE mexeu.
 *
 * Não são "os dias com mais fechamentos": num acumulado, o mesmo negócio move
 * muito no começo (quando o denominador é pequeno) e quase nada no fim. O que
 * interessa contar é o movimento da TAXA, porque é ele que aparece na curva e é
 * dele que vem a pergunta "o que aconteceu aqui?".
 *
 * O primeiro dia com decisão entra sempre: é o ponto em que a taxa nasce, e sem
 * ele a lista começaria no meio de uma história.
 */
export function marcosConversao(pontos: PontoConversaoDia[], limite = 5): MarcoConversao[] {
  const comMovimento: MarcoConversao[] = [];
  let anterior: number | null = null;
  pontos.forEach(p => {
    if (p.taxaAcum === null) return;
    const nasceu = anterior === null;
    const variacao = nasceu ? 0 : p.taxaAcum - (anterior as number);
    if (nasceu || Math.abs(variacao) > 1e-9) {
      comMovimento.push({
        rotulo: p.rotulo, data: p.data, taxa: p.taxaAcum,
        decididos: p.decididosAcum, variacao,
        fechadosDia: p.fechadosDia, perdidosDia: p.perdidosDia,
      });
    }
    anterior = p.taxaAcum;
  });
  if (comMovimento.length === 0) return [];

  const nascimento = comMovimento[0];
  const resto = comMovimento.slice(1)
    .sort((a, b) => Math.abs(b.variacao) - Math.abs(a.variacao))
    .slice(0, Math.max(limite - 1, 0));
  return [nascimento].concat(resto).sort((a, b) => a.data.getTime() - b.data.getTime());
}

export interface ResumoConversao {
  /** Frases prontas, na ordem de leitura. Vazio quando não houve decisão. */
  frases: string[];
  primeira: PontoConversaoDia | null;
  ultima: PontoConversaoDia | null;
  /** Maior e menor valor que a curva acumulada alcançou. */
  maximo: PontoConversaoDia | null;
  minimo: PontoConversaoDia | null;
  /** Diferença em PONTOS entre o primeiro dia com taxa e o último. */
  movimento: number | null;
  /** Dias corridos sem nenhuma decisão, no fim da janela. */
  diasParada: number;
}

const umaCasa = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/**
 * A leitura da curva em português.
 *
 * Mora aqui, e não no componente, pela mesma razão que o resto do arquivo: a
 * frase é uma CONCLUSÃO sobre o dado ("a taxa subiu 12 pontos com os dias
 * passando"), e conclusão escrita na marcação é conclusão que ninguém consegue
 * conferir. Saindo de função pura, o teste trava o texto contra a série.
 *
 * ⚠️ Toda frase daqui carrega o tamanho da amostra junto. "62% de conversão"
 * sobre 3 negócios e sobre 300 são a mesma frase e informações opostas, e a
 * primeira coisa que um painel perde ao esquecer isso é a confiança de quem lê.
 */
export function resumoConversao(pontos: PontoConversaoDia[]): ResumoConversao {
  const comTaxa = pontos.filter(p => p.taxaAcum !== null);
  if (comTaxa.length === 0) {
    return { frases: [], primeira: null, ultima: null, maximo: null, minimo: null,
             movimento: null, diasParada: pontos.length };
  }

  const primeira = comTaxa[0];
  const ultima = comTaxa[comTaxa.length - 1];
  let maximo = primeira, minimo = primeira;
  comTaxa.forEach(p => {
    if ((p.taxaAcum as number) > (maximo.taxaAcum as number)) maximo = p;
    if ((p.taxaAcum as number) < (minimo.taxaAcum as number)) minimo = p;
  });

  // Dias no FIM da janela sem nenhuma decisão nova: é o sinal de funil parado
  // que a taxa sozinha não dá — ela fica bonita e imóvel.
  let diasParada = 0;
  for (let i = pontos.length - 1; i >= 0; i--) {
    if (pontos[i].fechadosDia + pontos[i].perdidosDia > 0) break;
    diasParada++;
  }

  const movimento = (ultima.taxaAcum as number) - (primeira.taxaAcum as number);
  const frases: string[] = [];

  frases.push(
    `A taxa nasce em ${primeira.rotulo}, no primeiro desfecho do período: ` +
    `${umaCasa(primeira.taxaAcum as number)}% sobre ${primeira.decididosAcum} ` +
    `${primeira.decididosAcum === 1 ? "negócio decidido" : "negócios decididos"}.`
  );

  if (ultima.decididosAcum < 5) {
    frases.push(
      `Ela termina em ${umaCasa(ultima.taxaAcum as number)}%, mas sobre ` +
      `${ultima.decididosAcum} ${ultima.decididosAcum === 1 ? "negócio" : "negócios"} — ` +
      `amostra pequena demais para virar meta: um único desfecho a mais move a curva inteira.`
    );
  } else if (Math.abs(movimento) < 2) {
    frases.push(
      `De ${primeira.rotulo} a ${ultima.rotulo} ela praticamente não se moveu — fecha em ` +
      `${umaCasa(ultima.taxaAcum as number)}% sobre ${ultima.decididosAcum} decididos. ` +
      `Acumulada plana é time constante, não time parado: quem diz se produziu é o volume, ao lado.`
    );
  } else if (movimento > 0) {
    frases.push(
      `Com os dias passando ela SOBE ${umaCasa(movimento)} pontos — de ` +
      `${umaCasa(primeira.taxaAcum as number)}% para ${umaCasa(ultima.taxaAcum as number)}% ` +
      `em ${ultima.decididosAcum} negócios decididos. Cada desfecho novo entrou melhor que a média ` +
      `do que já estava na conta.`
    );
  } else {
    frases.push(
      `Com os dias passando ela CAI ${umaCasa(Math.abs(movimento))} pontos — de ` +
      `${umaCasa(primeira.taxaAcum as number)}% para ${umaCasa(ultima.taxaAcum as number)}% ` +
      `em ${ultima.decididosAcum} negócios decididos. Os desfechos recentes estão piores que os antigos.`
    );
  }

  if (maximo.rotulo !== ultima.rotulo && (maximo.taxaAcum as number) - (ultima.taxaAcum as number) >= 2) {
    frases.push(
      `O topo foi em ${maximo.rotulo}, com ${umaCasa(maximo.taxaAcum as number)}%. De lá para cá a ` +
      `curva cedeu ${umaCasa((maximo.taxaAcum as number) - (ultima.taxaAcum as number))} pontos.`
    );
  }

  if (diasParada >= 14) {
    frases.push(
      `Nenhum negócio foi decidido nos últimos ${diasParada} dias. A taxa está PARADA, não estável: ` +
      `o número acima é história, e o funil deixou de produzir desfecho.`
    );
  }

  return { frases, primeira, ultima, maximo, minimo, movimento, diasParada };
}

// ─────────────────────────────────────────────────────────────────────────────
// Padrão por dia da semana
// ─────────────────────────────────────────────────────────────────────────────

export interface LinhaDiaSemana {
  /** 0 = domingo. */
  dia: number;
  rotulo: string;
  curto: string;
  /**
   * Quantas vezes este dia da semana OCORREU na janela.
   *
   * É o denominador que faz a comparação valer. Uma janela de 6 meses costuma
   * ter 27 segundas e 26 terças; comparar os totais crus premiaria a segunda
   * por existir uma vez a mais, e o "melhor dia da semana" viraria um artefato
   * do calendário em vez de um fato sobre o time.
   */
  ocorrencias: number;
  leads: number;
  propostas: number;
  fechados: number;
  perdidos: number;
  atividades: number;
  aprovado: number;
  /** Fechados ÷ decididos NESTE dia da semana. `null` sem desfecho. */
  conversao: number | null;
  fechadosPorOcorrencia: number;
  leadsPorOcorrencia: number;
  aprovadoPorOcorrencia: number;
}

/**
 * O que acontece em cada dia da semana, dentro da janela.
 *
 * A pergunta que responde é "quando vendemos mais e quando vendemos menos, de
 * forma RECORRENTE" — recorrente é a palavra que obriga o denominador: o número
 * comparável entre linhas é sempre por ocorrência do dia, nunca o total.
 *
 * ⚠️ Fim de semana quase sempre aparece como o pior dia, e isso não é achado: é
 * o expediente. Por isso `destaquesDaSemana` só procura melhor e pior ENTRE OS
 * DIAS ÚTEIS, e o sábado/domingo continua na tabela apenas porque volume alto
 * ali é notícia por si só.
 */
export function porDiaDaSemana(d: Dados, j: Janela, hoje: Date = new Date()): LinhaDiaSemana[] {
  const linhas: LinhaDiaSemana[] = [];
  for (let i = 0; i < 7; i++) {
    linhas.push({
      dia: i, rotulo: DIAS_SEMANA[i], curto: DIAS_SEMANA_CURTO[i], ocorrencias: 0,
      leads: 0, propostas: 0, fechados: 0, perdidos: 0, atividades: 0, aprovado: 0,
      conversao: null, fechadosPorOcorrencia: 0, leadsPorOcorrencia: 0, aprovadoPorOcorrencia: 0,
    });
  }

  baldesDiarios(j.inicio, j.fim, hoje).forEach(dia => { linhas[dia.diaSemana].ocorrencias += 1; });

  const noDia = (valor: string | null | undefined): LinhaDiaSemana | null => {
    const dt = dataLocal(valor ?? null);
    if (!dt || !dentro(dt, j)) return null;
    return linhas[dt.getDay()];
  };

  d.empresas.forEach(e => {
    if (!ehReal(e)) return;
    const entrada = noDia(e.criado_em);
    if (entrada) entrada.leads += 1;
    if (e.status === "Fechado" || e.status === "Perdido") {
      const desfecho = noDia(e.status_atualizado_em);
      if (desfecho) {
        if (e.status === "Fechado") desfecho.fechados += 1;
        else desfecho.perdidos += 1;
      }
    }
  });

  d.orcamentos.forEach(o => {
    const envio = noDia(o.data_envio);
    if (envio) envio.propostas += 1;
    if (o.status === "aprovado") {
      const decisao = noDia(o.data_decisao);
      if (decisao) decisao.aprovado += num(o.total);
    }
  });

  d.eventos.forEach(ev => {
    const quando = noDia(ev.data);
    if (quando) quando.atividades += 1;
  });

  linhas.forEach(l => {
    const decididos = l.fechados + l.perdidos;
    l.conversao = decididos > 0 ? (l.fechados / decididos) * 100 : null;
    l.fechadosPorOcorrencia = l.ocorrencias ? l.fechados / l.ocorrencias : 0;
    l.leadsPorOcorrencia = l.ocorrencias ? l.leads / l.ocorrencias : 0;
    l.aprovadoPorOcorrencia = l.ocorrencias ? l.aprovado / l.ocorrencias : 0;
  });
  return linhas;
}

export interface DestaquesSemana {
  /** Melhor e pior dia ÚTIL, por fechamentos por ocorrência. */
  melhor: LinhaDiaSemana | null;
  pior: LinhaDiaSemana | null;
  /** O dia útil com mais dinheiro aprovado por ocorrência. */
  melhorEmValor: LinhaDiaSemana | null;
  /** Dia útil em que mais se PROSPECTA (leads e compromissos) por ocorrência. */
  maisEsforco: LinhaDiaSemana | null;
  /** Fechamentos na janela — o tamanho da amostra por trás de tudo. */
  fechamentos: number;
  /**
   * Falso quando a amostra não sustenta a leitura. A tela mostra a tabela assim
   * mesmo, mas SEM chamar nada de "melhor dia": dez fechamentos espalhados em
   * cinco dias úteis dão duas por dia, e o campeão é sorteio.
   */
  confiavel: boolean;
  /** Frases prontas sobre o padrão, na ordem de leitura. */
  frases: string[];
}

/** Abaixo disso o "melhor dia" é sorteio, não padrão. */
const MINIMO_FECHAMENTOS_SEMANA = 15;

export function destaquesDaSemana(linhas: LinhaDiaSemana[]): DestaquesSemana {
  const uteis = linhas.filter(l => l.dia >= 1 && l.dia <= 5 && l.ocorrencias > 0);
  const fechamentos = linhas.reduce((s, l) => s + l.fechados, 0);
  const confiavel = fechamentos >= MINIMO_FECHAMENTOS_SEMANA && uteis.length >= 4;

  const maiorPor = (f: (l: LinhaDiaSemana) => number) =>
    uteis.length ? uteis.slice().sort((a, b) => f(b) - f(a) || a.dia - b.dia)[0] : null;
  const menorPor = (f: (l: LinhaDiaSemana) => number) =>
    uteis.length ? uteis.slice().sort((a, b) => f(a) - f(b) || a.dia - b.dia)[0] : null;

  const melhor = maiorPor(l => l.fechadosPorOcorrencia);
  const pior = menorPor(l => l.fechadosPorOcorrencia);
  const melhorEmValor = maiorPor(l => l.aprovadoPorOcorrencia);
  const maisEsforco = maiorPor(l => l.leadsPorOcorrencia + l.atividades / Math.max(l.ocorrencias, 1));

  const frases: string[] = [];
  if (!confiavel) {
    frases.push(
      `São ${fechamentos} ${fechamentos === 1 ? "fechamento" : "fechamentos"} no período, espalhados por ` +
      `cinco dias úteis. A tabela abaixo está certa, mas ainda não há amostra para chamar nenhum dia de ` +
      `melhor ou pior: com esse volume, o campeão muda de nome com um negócio trocando de dia.`
    );
  } else if (melhor && pior && melhor.dia !== pior.dia) {
    const razao = pior.fechadosPorOcorrencia > 0
      ? melhor.fechadosPorOcorrencia / pior.fechadosPorOcorrencia : null;
    frases.push(
      `${melhor.rotulo} é o dia que mais fecha: ${umaCasa(melhor.fechadosPorOcorrencia)} negócios por ` +
      `${melhor.rotulo.toLowerCase()}, contra ${umaCasa(pior.fechadosPorOcorrencia)} em ` +
      `${pior.rotulo.toLowerCase()}` + (razao && razao >= 1.5 ? ` — ${umaCasa(razao)}× mais.` : ".")
    );
    if (melhorEmValor && melhorEmValor.dia !== melhor.dia) {
      frases.push(
        `O dinheiro, porém, entra em ${melhorEmValor.rotulo.toLowerCase()}: é o dia com maior valor ` +
        `aprovado por ocorrência. Fechar mais e faturar mais não caem no mesmo dia, e é o segundo que ` +
        `decide a agenda de quem negocia grande.`
      );
    }
    if (maisEsforco && maisEsforco.dia !== melhor.dia) {
      frases.push(
        `O esforço se concentra em ${maisEsforco.rotulo.toLowerCase()} — é onde entram mais leads e mais ` +
        `compromissos —, mas o retorno aparece em ${melhor.rotulo.toLowerCase()}. Esforço e resultado em ` +
        `dias diferentes é normal; o que não é normal é ninguém ter medido a distância entre os dois.`
      );
    }
  }
  frases.push(
    "Sábado e domingo ficam fora da escolha de melhor e pior: ali o que se mede é o expediente, não o " +
    "desempenho. Continuam na tabela porque volume alto no fim de semana é achado por si só."
  );

  return { melhor, pior, melhorEmValor, maisEsforco, fechamentos, confiavel, frases };
}

// ─────────────────────────────────────────────────────────────────────────────
// Clientes fora do próprio padrão
// ─────────────────────────────────────────────────────────────────────────────

export interface DesvioCliente {
  empresa_id: string;
  nome: string;
  segmento: string | null;
  /** Valor aprovado deste cliente na janela atual. */
  atual: number;
  /** O mesmo, na janela anterior de igual tamanho — o "normalmente ele compra". */
  referencia: number;
  delta: number;
  /** Δ relativo à referência, em porcentagem. */
  deltaPct: number;
  propostasAtual: number;
  propostasRef: number;
  ticketAtual: number | null;
  ticketRef: number | null;
  /**
   * A diferença aberta nas suas duas causas possíveis. Somadas dão `delta`
   * exatamente — ver o comentário da função.
   */
  porQuantidade: number;
  porTicket: number;
  /** A causa dominante, em uma palavra. */
  causa: "quantidade" | "ticket" | "ambas";
  /** Valor recusado por este cliente na janela, e o motivo da recusa mais cara. */
  recusado: number;
  motivoRecusa: string | null;
  /** Propostas dele em aberto agora — o que ainda pode virar. */
  aberto: number;
  diasSemContato: number;
  direcao: "caiu" | "cresceu";
}

/**
 * Quem comprou fora do próprio padrão — e a decomposição do porquê.
 *
 * A pergunta era "por que vendemos X para um cliente que normalmente compra Y a
 * mais". A resposta honesta que o dado sustenta não é uma causa de negócio ("o
 * concorrente baixou o preço"), que ninguém registrou em lugar nenhum — é a
 * DECOMPOSIÇÃO ARITMÉTICA da diferença, que tem exatamente duas parcelas:
 *
 *     atual − referência  =  (qa − qr)·tr  +  (ta − tr)·qa
 *                            └ quantidade ┘   └── ticket ──┘
 *
 * com q = orçamentos aprovados e t = ticket médio deles. A identidade é exata
 * (expandindo, sobra qa·ta − qr·tr), então as duas parcelas SEMPRE somam a
 * diferença; não é uma aproximação que fecha por sorte.
 *
 * A leitura muda a ação, e é por isso que separá-las importa: caiu por
 * QUANTIDADE é o cliente comprando menos vezes — sumiu contato, sumiu proposta,
 * e o remédio é follow-up. Caiu por TICKET é o mesmo cliente comprando mais
 * barato — desconto, mix ou preço de concorrente, e o remédio é conversa
 * comercial. Um "caiu 40%" sozinho apaga essa diferença e manda cobrar a pessoa
 * errada.
 *
 * O que a função acrescenta por cima da aritmética é evidência DATADA: o que
 * ele recusou no período e por qual motivo, o que dele ainda está em aberto, e
 * há quantos dias ninguém o procura. Isso é registro, não interpretação.
 *
 * ⚠️ Só entra quem comprou nas DUAS janelas. Quem não comprava antes e comprou
 * agora é cliente novo, não crescimento — e dividir por zero viraria "+∞%".
 * Quem comprava e zerou aparece, sim: é o caso mais grave da lista.
 */
export function clientesForaDoPadrao(
  d: Dados, meses: number, base: Date = new Date(), minimo = 0.15,
): DesvioCliente[] {
  const j = janelaMeses(meses, base);
  const ant = janelaAnterior(meses, base);
  const porEmpresa: Record<string, EmpresaMetrica> = {};
  d.empresas.forEach(e => { porEmpresa[e.empresa_id] = e; });

  const agregado: Record<string, {
    atual: number; referencia: number; qa: number; qr: number;
    recusado: number; motivo: { texto: string; valor: number } | null; aberto: number;
  }> = {};
  const pegar = (id: string) => agregado[id] || (agregado[id] = {
    atual: 0, referencia: 0, qa: 0, qr: 0, recusado: 0, motivo: null, aberto: 0,
  });

  d.orcamentos.forEach(o => {
    if (!porEmpresa[o.empresa_id]) return;
    const g = pegar(o.empresa_id);
    const valor = num(o.total);
    if (o.status === "aprovado") {
      if (em(o.data_decisao, j)) { g.atual += valor; g.qa += 1; }
      else if (em(o.data_decisao, ant)) { g.referencia += valor; g.qr += 1; }
    } else if (o.status === "recusado" && em(o.data_decisao, j)) {
      g.recusado += valor;
      // Fica o motivo da recusa MAIS CARA, não o da mais recente: é a que
      // explica o buraco no valor, que é o que a linha está medindo.
      const texto = (o.motivo_recusa || "").trim();
      if (texto && (!g.motivo || valor > g.motivo.valor)) g.motivo = { texto, valor };
    } else if (ORCAMENTO_ABERTO.indexOf(o.status) !== -1) {
      g.aberto += valor;
    }
  });

  const saida: DesvioCliente[] = [];
  Object.keys(agregado).forEach(id => {
    const g = agregado[id];
    const e = porEmpresa[id];
    if (!e || !ehReal(e)) return;
    if (g.referencia <= 0) return;                        // sem padrão anterior, não há desvio
    const delta = g.atual - g.referencia;
    if (Math.abs(delta) < g.referencia * minimo) return;  // variação pequena é ruído, não notícia

    const ticketRef = g.qr > 0 ? g.referencia / g.qr : null;
    const ticketAtual = g.qa > 0 ? g.atual / g.qa : null;
    // A identidade fecha mesmo com qa = 0: (0 − qr)·tr + (0 − tr)·0 = −referência.
    const porQuantidade = (g.qa - g.qr) * (ticketRef ?? 0);
    const porTicket = ((ticketAtual ?? 0) - (ticketRef ?? 0)) * g.qa;
    const dominante: "quantidade" | "ticket" =
      Math.abs(porQuantidade) >= Math.abs(porTicket) ? "quantidade" : "ticket";
    const equilibrado = Math.abs(Math.abs(porQuantidade) - Math.abs(porTicket))
      < Math.max(Math.abs(delta), 1) * 0.2;

    saida.push({
      empresa_id: id,
      nome: e.nome,
      segmento: e.segmento,
      atual: g.atual,
      referencia: g.referencia,
      delta,
      deltaPct: (delta / g.referencia) * 100,
      propostasAtual: g.qa,
      propostasRef: g.qr,
      ticketAtual,
      ticketRef,
      porQuantidade,
      porTicket,
      causa: equilibrado ? "ambas" : dominante,
      recusado: g.recusado,
      motivoRecusa: g.motivo ? g.motivo.texto : null,
      aberto: g.aberto,
      diasSemContato: diasSemContato(e),
      direcao: delta < 0 ? "caiu" : "cresceu",
    });
  });

  // Pelo tamanho do desvio em DINHEIRO, não em porcentagem: uma queda de 90% num
  // cliente de R$ 800 não é a notícia do mês, e ordenar por porcentagem
  // colocaria justamente esse no topo da tela.
  return saida.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

// ─────────────────────────────────────────────────────────────────────────────
// Equipe: comparação detalhada entre supervisores
// ─────────────────────────────────────────────────────────────────────────────

export interface LinhaEquipeDetalhe extends LinhaEquipe {
  perdidos: number;
  propostas: number;
  atividades: number;
  aberto: number;
  ticket: number | null;
  deltaAprovado: number | null;
  /** Fatia do valor aprovado total do escopo, em %. */
  participacao: number;
  /** Valor aprovado ÷ vendedores — o que cada cabeça produziu. */
  aprovadoPorVendedor: number;
  /** Atividades ÷ fechamentos. `null` sem fechamento no período. */
  esforco: number | null;
  /** Quem puxa o resultado da equipe, e quanto dele. */
  destaque: { nome: string; aprovado: number; fatia: number } | null;
  /**
   * Fatia do maior vendedor no total da equipe.
   *
   * É o número que separa "equipe boa" de "equipe com um bom vendedor". Cinco
   * pessoas em que uma faz 85% não é um time — é um risco de saída, e nenhuma
   * das outras colunas mostra isso.
   */
  concentracao: number | null;
}

/**
 * `porEquipe`, com tudo que uma comparação entre supervisores precisa.
 *
 * Mantém a regra que já valia e que é a mais fácil de perder de vista: toda
 * taxa da equipe sai dos NÚMEROS SOMADOS, nunca da média das taxas dos
 * vendedores — média de porcentagem dá o mesmo peso a quem decidiu dois
 * negócios e a quem decidiu sessenta.
 */
export function porEquipeDetalhado(linhas: LinhaVendedor[]): LinhaEquipeDetalhe[] {
  const grupos: Record<string, LinhaVendedor[]> = {};
  linhas.forEach(l => {
    const nome = l.equipe || "Sem supervisor";
    (grupos[nome] || (grupos[nome] = [])).push(l);
  });
  const totalGeral = linhas.reduce((s, l) => s + l.aprovado, 0);
  const soma = (v: LinhaVendedor[], f: (l: LinhaVendedor) => number) =>
    v.reduce((s, l) => s + f(l), 0);

  return Object.keys(grupos).map(nome => {
    const v = grupos[nome];
    const fechados = soma(v, l => l.fechados);
    const perdidos = soma(v, l => l.perdidos);
    const aprovado = soma(v, l => l.aprovado);
    const atividades = soma(v, l => l.atividades);
    const decididos = fechados + perdidos;
    // O Δ da equipe só existe quando ALGUM vendedor dela tinha base anterior.
    // Somar `null` como zero diria "não mudou" onde o certo é "não dá para saber".
    const comDelta = v.filter(l => l.deltaAprovado !== null);
    const melhor = v.slice().sort((a, b) => b.aprovado - a.aprovado)[0];
    // Reconstrói a contagem de orçamentos aprovados a partir de valor ÷ ticket:
    // é a mesma divisão que os produziu, então volta exata a menos de
    // arredondamento — e o ticket da equipe precisa desse denominador somado,
    // não da média dos tickets individuais.
    const propostasAprovadas = v.reduce(
      (s, l) => s + (l.ticket !== null && l.ticket > 0 ? Math.round(l.aprovado / l.ticket) : 0), 0);

    return {
      equipe: nome,
      vendedores: v.length,
      carteira: soma(v, l => l.carteira),
      fechados,
      perdidos,
      conversao: decididos > 0 ? (fechados / decididos) * 100 : null,
      aprovado,
      paradas: soma(v, l => l.paradas),
      propostas: soma(v, l => l.propostas),
      atividades,
      aberto: soma(v, l => l.aberto),
      ticket: propostasAprovadas > 0 ? aprovado / propostasAprovadas : null,
      deltaAprovado: comDelta.length
        ? comDelta.reduce((s, l) => s + (l.deltaAprovado as number), 0) : null,
      participacao: totalGeral > 0 ? (aprovado / totalGeral) * 100 : 0,
      aprovadoPorVendedor: v.length ? aprovado / v.length : 0,
      esforco: fechados > 0 ? atividades / fechados : null,
      destaque: melhor && aprovado > 0
        ? { nome: melhor.nome, aprovado: melhor.aprovado, fatia: (melhor.aprovado / aprovado) * 100 }
        : null,
      concentracao: melhor && aprovado > 0 ? (melhor.aprovado / aprovado) * 100 : null,
    };
  }).sort((a, b) => b.aprovado - a.aprovado || b.carteira - a.carteira
    || a.equipe.localeCompare(b.equipe, "pt-BR"));
}

/**
 * Valor aprovado mês a mês, uma série por equipe.
 *
 * Devolve séries SEPARADAS de propósito, para a tela desenhá-las como small
 * multiples e não como N linhas num eixo só. Com quatro ou cinco equipes não há
 * paleta segura para linhas irmãs nesta base de cores: o azul `#56A4F5` e o
 * roxo `#A78BFA` do CRM ficam a ΔE 0,7 sob deuteranopia — a MESMA cor para
 * parte dos usuários. Separadas, cada gráfico tem série única e a cor não
 * precisa distinguir nada.
 */
export function serieEquipeMensal(
  d: Dados, usuarios: UsuarioMetrica[], meses: number, base: Date = new Date(),
): { equipe: string; valores: number[]; total: number }[] {
  const baldes = baldesMensais(meses, base);
  const equipeDoVendedor: Record<string, string> = {};
  usuarios.forEach(u => {
    if (u.role === "vendedor" || u.role === "supervisor") {
      equipeDoVendedor[u.usuario_id] = u.supervisor_nome || "Sem supervisor";
    }
  });

  // O orçamento segue a EMPRESA, não o `vendedor_id` do próprio orçamento — a
  // mesma regra de `aplicarFiltro` e de `porVendedor`. Uma empresa que trocou de
  // mão depois da proposta pertence a quem detém a carteira hoje, senão o total
  // por equipe deixa de bater com o total por vendedor.
  const equipeDaEmpresa: Record<string, string> = {};
  d.empresas.forEach(e => {
    const eq = e.vendedor_id ? equipeDoVendedor[e.vendedor_id] : undefined;
    if (eq) equipeDaEmpresa[e.empresa_id] = eq;
  });

  const porEquipe: Record<string, number[]> = {};
  d.orcamentos.forEach(o => {
    if (o.status !== "aprovado") return;
    const equipe = equipeDaEmpresa[o.empresa_id];
    if (!equipe) return;
    const serie = porEquipe[equipe] || (porEquipe[equipe] = baldes.map(() => 0));
    baldes.forEach((b, i) => { if (em(o.data_decisao, b)) serie[i] += num(o.total); });
  });

  return Object.keys(porEquipe).map(equipe => ({
    equipe,
    valores: porEquipe[equipe],
    total: porEquipe[equipe].reduce((s, v) => s + v, 0),
  })).sort((a, b) => b.total - a.total || a.equipe.localeCompare(b.equipe, "pt-BR"));
}
