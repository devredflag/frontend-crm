/**
 * Testes da aritmética de Insights.
 *
 * Existem porque esta tela NÃO pode ser conferida no navegador durante o
 * desenvolvimento: o backend recusa subir fora do Railway e o `.env.dev` está
 * sem banco. Sem isto, todo número da tela seria "parece certo".
 *
 * Toda data é fixada — `BASE` é 15/06/2026. Teste de métrica temporal que usa
 * `new Date()` real passa hoje e quebra na virada do mês, e a falha aparece
 * como um número errado em produção, não como teste vermelho.
 */

import {
  janelaMeses, janelaAnterior, baldesMensais, dentro,
  aplicarFiltro, segmentosDisponiveis,
  taxaConversao, cicloMedio, ticketMedio, valorAprovado, valorPerdido,
  pipelineEm, novosLeads, taxaAprovacaoProposta, tempoRespostaCliente,
  tempoAteEnvio, coberturaFollowUp, coberturaContato,
  calcularKpi, serieKpi, serieMensal, porCategoria, motivosRecusa,
  retratoFunil, agingPropostas, porVendedor, porEquipe, equipesComparaveis,
  atividadesPorTipo, esforcoPorFechamento, ativasSemAgenda, taxaAceiteConvite,
  KPIS, KPIS_DESTAQUE, diasEntre,
  baldesDiarios, ritmoDoMes, conversaoDiaria, marcosConversao, resumoConversao,
  porDiaDaSemana, destaquesDaSemana, clientesForaDoPadrao, porEquipeDetalhado,
  serieEquipeMensal, alertasDeAtencao,
} from "./metricas";
import type {
  Dados, EmpresaMetrica, OrcamentoMetrica, EventoMetrica, UsuarioMetrica,
} from "./metricas";

/** 15 de junho de 2026, meio-dia. Meio do mês, longe de qualquer virada. */
const BASE = new Date(2026, 5, 15, 12, 0, 0);

// ── construtores enxutos ────────────────────────────────────────────────────

let seq = 0;
const id = () => `id-${++seq}`;

function empresa(p: Partial<EmpresaMetrica> = {}): EmpresaMetrica {
  return {
    empresa_id: id(), nome: "Empresa", segmento: null, porte: null, cidade: null,
    status: "Lead", temperatura: null, origem_lead: null, motivo_perdido: null,
    ultima_interacao: null, criado_em: null, status_atualizado_em: null,
    data_proxima_acao: null, vendedor_id: null,
    ...p,
  };
}

function orcamento(p: Partial<OrcamentoMetrica> = {}): OrcamentoMetrica {
  return {
    orcamento_id: id(), empresa_id: "sem-empresa", vendedor_id: null,
    status: "rascunho", total: 0, criado_em: null, data_envio: null, data_decisao: null,
    ...p,
  };
}

function evento(p: Partial<EventoMetrica> = {}): EventoMetrica {
  return { evento_id: id(), tipo: "call", data: "2026-06-10", empresa_id: null, ...p };
}

function usuario(p: Partial<UsuarioMetrica> = {}): UsuarioMetrica {
  return { usuario_id: id(), nome: "Fulano", role: "vendedor", ativo: true, ...p };
}

const dados = (p: Partial<Dados> = {}): Dados =>
  ({ empresas: [], orcamentos: [], eventos: [], ...p });

// ═════════════════════════════════════════════════════════════════════════════
describe("janelas", () => {
  it("a janela de 6 meses vai do 1º de janeiro ao fim de junho", () => {
    const j = janelaMeses(6, BASE);
    expect(j.inicio.getFullYear()).toBe(2026);
    expect(j.inicio.getMonth()).toBe(0);      // janeiro
    expect(j.inicio.getDate()).toBe(1);
    expect(j.fim.getMonth()).toBe(5);         // junho
    expect(j.fim.getDate()).toBe(30);         // junho tem 30
  });

  it("o fim da janela é o fim do MÊS, não 'agora' — fechar hoje conta", () => {
    const j = janelaMeses(6, BASE);
    // 20/06 ainda não chegou em relação a BASE (15/06), mas cai na janela.
    expect(dentro(new Date(2026, 5, 20), j)).toBe(true);
    expect(dentro(new Date(2026, 6, 1), j)).toBe(false);
  });

  it("a janela anterior encosta na atual sem sobrepor nem deixar buraco", () => {
    const j = janelaMeses(6, BASE);
    const a = janelaAnterior(6, BASE);
    expect(a.inicio.getFullYear()).toBe(2025);
    expect(a.inicio.getMonth()).toBe(6);      // julho/2025
    expect(a.fim.getMonth()).toBe(11);        // dezembro/2025
    expect(a.fim.getTime()).toBeLessThan(j.inicio.getTime());
    // Um dia depois do fim da anterior já é o começo da atual.
    expect(new Date(a.fim.getTime() + 1).getTime()).toBe(j.inicio.getTime());
  });

  it("a janela anterior é contada em meses de calendário, não em duração", () => {
    // Fevereiro tem 28 dias: subtrair milissegundos desalinharia a grade.
    const a = janelaAnterior(3, new Date(2026, 4, 10));   // maio
    expect(a.inicio.getMonth()).toBe(11);     // dezembro/2025
    expect(a.inicio.getFullYear()).toBe(2025);
    expect(a.fim.getMonth()).toBe(1);         // fevereiro/2026
    expect(a.fim.getDate()).toBe(28);
  });

  it("baldesMensais devolve um balde por mês, terminando no mês de base", () => {
    const b = baldesMensais(3, BASE);
    expect(b.map(x => x.rotulo)).toEqual(["Abr", "Mai", "Jun"]);
    expect(b[0].inicio.getMonth()).toBe(3);
    expect(b[2].fim.getMonth()).toBe(5);
  });

  it("baldesMensais atravessa a virada de ano", () => {
    const b = baldesMensais(3, new Date(2026, 1, 10));   // fevereiro/2026
    expect(b.map(x => x.rotulo)).toEqual(["Dez", "Jan", "Fev"]);
    expect(b[0].ano).toBe(2025);
    expect(b[2].ano).toBe(2026);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("filtro global", () => {
  const d = dados({
    empresas: [
      empresa({ empresa_id: "A", vendedor_id: "v1", segmento: "Construção" }),
      empresa({ empresa_id: "B", vendedor_id: "v2", segmento: "Construção" }),
      empresa({ empresa_id: "C", vendedor_id: "v1", segmento: "Logística" }),
    ],
    orcamentos: [
      orcamento({ empresa_id: "A" }), orcamento({ empresa_id: "B" }), orcamento({ empresa_id: "C" }),
    ],
    eventos: [evento({ empresa_id: "A" }), evento({ empresa_id: "B" }), evento({ empresa_id: null })],
  });

  it("filtrar por vendedor leva junto os orçamentos das empresas dele", () => {
    const r = aplicarFiltro(d, { meses: 6, vendedor: "v1", segmento: "todos" });
    expect(r.empresas.map(e => e.empresa_id)).toEqual(["A", "C"]);
    expect(r.orcamentos.map(o => o.empresa_id)).toEqual(["A", "C"]);
  });

  it("o orçamento segue a EMPRESA, não o próprio vendedor_id", () => {
    // A empresa A é do v1; a proposta ficou marcada com v2 (a carteira trocou
    // de mão depois). Filtrando por v1, a proposta tem de vir junto — senão o
    // total por vendedor não bate com o total da carteira dele.
    const dd = dados({
      empresas: [empresa({ empresa_id: "A", vendedor_id: "v1" })],
      orcamentos: [orcamento({ empresa_id: "A", vendedor_id: "v2", total: 500 })],
    });
    const r = aplicarFiltro(dd, { meses: 6, vendedor: "v1", segmento: "todos" });
    expect(r.orcamentos).toHaveLength(1);
  });

  it("evento sem empresa sobrevive a qualquer filtro de carteira", () => {
    const r = aplicarFiltro(d, { meses: 6, vendedor: "v1", segmento: "todos" });
    expect(r.eventos.filter(e => e.empresa_id === null)).toHaveLength(1);
  });

  it("vendedor e segmento se acumulam", () => {
    const r = aplicarFiltro(d, { meses: 6, vendedor: "v1", segmento: "Construção" });
    expect(r.empresas.map(e => e.empresa_id)).toEqual(["A"]);
  });

  it("'todos' em ambos devolve o mesmo objeto, sem copiar", () => {
    expect(aplicarFiltro(d, { meses: 6, vendedor: "todos", segmento: "todos" })).toBe(d);
  });

  it("segmentosDisponiveis ignora rascunho e ordena em pt-BR", () => {
    const dd = dados({ empresas: [
      empresa({ segmento: "Óptica" }), empresa({ segmento: "Agro" }),
      empresa({ segmento: "Zoo", status: "Rascunho" }), empresa({ segmento: null }),
    ]});
    expect(segmentosDisponiveis(dd.empresas)).toEqual(["Agro", "Não informado", "Óptica"]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("taxa de conversão", () => {
  it("é fechados ÷ decididos, ignorando quem ainda está no funil", () => {
    const d = dados({ empresas: [
      empresa({ status: "Fechado", status_atualizado_em: "2026-05-10" }),
      empresa({ status: "Fechado", status_atualizado_em: "2026-04-10" }),
      empresa({ status: "Perdido", status_atualizado_em: "2026-03-10" }),
      empresa({ status: "Negociação", status_atualizado_em: "2026-05-10" }),  // não decidiu
    ]});
    const m = taxaConversao(d, janelaMeses(6, BASE));
    expect(m.valor).toBeCloseTo(66.666, 2);
    expect(m.amostra).toBe(3);
    expect(m.base).toBe("2 de 3 com desfecho");
  });

  it("desfecho fora da janela não conta", () => {
    const d = dados({ empresas: [
      empresa({ status: "Fechado", status_atualizado_em: "2025-01-10" }),
    ]});
    expect(taxaConversao(d, janelaMeses(6, BASE)).valor).toBeNull();
  });

  it("sem amostra devolve null, não zero", () => {
    const m = taxaConversao(dados(), janelaMeses(6, BASE));
    expect(m.valor).toBeNull();
    expect(m.base).toBe("nenhum negócio decidido");
  });

  it("rascunho nunca entra na conta", () => {
    const d = dados({ empresas: [
      empresa({ status: "Rascunho", status_atualizado_em: "2026-05-10" }),
      empresa({ status: "Perdido", status_atualizado_em: "2026-05-10" }),
    ]});
    expect(taxaConversao(d, janelaMeses(6, BASE)).amostra).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("ciclo médio", () => {
  it("mede do cadastro até o fechamento", () => {
    const d = dados({ empresas: [
      empresa({ status: "Fechado", criado_em: "2026-05-01", status_atualizado_em: "2026-05-11" }),
      empresa({ status: "Fechado", criado_em: "2026-04-01", status_atualizado_em: "2026-04-21" }),
    ]});
    expect(cicloMedio(d, janelaMeses(6, BASE)).valor).toBe(15);
  });

  it("fechamento sem data de cadastro fica fora da média", () => {
    const d = dados({ empresas: [
      empresa({ status: "Fechado", criado_em: null, status_atualizado_em: "2026-05-11" }),
      empresa({ status: "Fechado", criado_em: "2026-05-01", status_atualizado_em: "2026-05-11" }),
    ]});
    const m = cicloMedio(d, janelaMeses(6, BASE));
    expect(m.valor).toBe(10);
    expect(m.amostra).toBe(1);
    expect(m.base).toBe("média de 1 fechamento");
  });

  it("diasEntre recusa data invertida em vez de devolver negativo", () => {
    expect(diasEntre("2026-05-10", "2026-05-01")).toBeNull();
    expect(diasEntre("2026-05-01", "2026-05-01")).toBe(0);
    expect(diasEntre(null, "2026-05-01")).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("dinheiro", () => {
  const d = dados({ orcamentos: [
    orcamento({ status: "aprovado", total: 1000, data_decisao: "2026-05-10" }),
    orcamento({ status: "aprovado", total: 3000, data_decisao: "2026-04-10" }),
    orcamento({ status: "aprovado", total: 9999, data_decisao: "2025-01-10" }),  // fora
    orcamento({ status: "recusado", total: 500,  data_decisao: "2026-05-12" }),
    orcamento({ status: "rascunho", total: 7777 }),
  ]});
  const j = janelaMeses(6, BASE);

  it("valorAprovado soma só o aprovado com decisão na janela", () => {
    expect(valorAprovado(d, j).valor).toBe(4000);
  });

  it("ticketMedio é o valor sobre a quantidade", () => {
    const m = ticketMedio(d, j);
    expect(m.valor).toBe(2000);
    expect(m.base).toBe("2 orçamentos aprovados");
  });

  it("valorPerdido é o espelho, e ambos ignoram rascunho", () => {
    expect(valorPerdido(d, j).valor).toBe(500);
  });

  it("total em texto ou nulo vira número sem quebrar", () => {
    const dd = dados({ orcamentos: [
      orcamento({ status: "aprovado", total: "1500.50", data_decisao: "2026-05-10" }),
      orcamento({ status: "aprovado", total: null,      data_decisao: "2026-05-10" }),
    ]});
    expect(valorAprovado(dd, j).valor).toBeCloseTo(1500.5, 2);
    expect(ticketMedio(dd, j).valor).toBeCloseTo(750.25, 2);
  });

  it("sem aprovação o ticket é null e o valor é 0 — são coisas diferentes", () => {
    const vazio = dados();
    expect(ticketMedio(vazio, j).valor).toBeNull();
    expect(valorAprovado(vazio, j).valor).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("pipeline — estoque reconstruído", () => {
  const d = dados({ orcamentos: [
    // Enviado em março, aprovado em maio: esteve em aberto em março e abril.
    orcamento({ status: "aprovado", total: 1000, data_envio: "2026-03-05", data_decisao: "2026-05-20" }),
    // Enviado em maio, sem decisão: continua aberto.
    orcamento({ status: "enviado",  total: 2000, data_envio: "2026-05-05" }),
    // Rascunho: nunca saiu, nunca conta.
    orcamento({ status: "rascunho", total: 9000 }),
  ]});

  it("no fim de abril o orçamento que ainda não foi decidido conta", () => {
    expect(pipelineEm(d, new Date(2026, 3, 30, 23, 59)).valor).toBe(1000);
  });

  it("no fim de junho ele já saiu e o outro entrou", () => {
    expect(pipelineEm(d, new Date(2026, 5, 30, 23, 59)).valor).toBe(2000);
  });

  it("antes de existir, nada conta", () => {
    expect(pipelineEm(d, new Date(2026, 0, 31, 23, 59)).valor).toBe(0);
  });

  it("rascunho fica fora mesmo depois de a data passar", () => {
    const m = pipelineEm(d, new Date(2026, 5, 30, 23, 59));
    expect(m.amostra).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("tempos de proposta", () => {
  const d = dados({ orcamentos: [
    orcamento({ status: "aprovado", criado_em: "2026-05-01", data_envio: "2026-05-03", data_decisao: "2026-05-13" }),
    orcamento({ status: "recusado", criado_em: "2026-05-01", data_envio: "2026-05-05", data_decisao: "2026-05-11" }),
  ]});
  const j = janelaMeses(6, BASE);

  it("resposta do cliente é do envio até a decisão", () => {
    expect(tempoRespostaCliente(d, j).valor).toBe(8);   // (10 + 6) / 2
  });

  it("tempo até enviar é da criação até o envio — a parte que é do time", () => {
    expect(tempoAteEnvio(d, j).valor).toBe(3);          // (2 + 4) / 2
  });

  it("proposta sem data de envio não entra em nenhum dos dois", () => {
    const dd = dados({ orcamentos: [
      orcamento({ status: "aprovado", criado_em: "2026-05-01", data_decisao: "2026-05-13" }),
    ]});
    expect(tempoRespostaCliente(dd, j).valor).toBeNull();
    expect(tempoAteEnvio(dd, j).valor).toBeNull();
  });

  it("taxa de aprovação da proposta olha só as decididas", () => {
    const m = taxaAprovacaoProposta(d, j);
    expect(m.valor).toBe(50);
    expect(m.base).toBe("1 de 2 decididas");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("coberturas — snapshot sem histórico", () => {
  it("follow-up conta retorno de hoje em diante sobre as ativas", () => {
    const hoje = new Date();
    const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
    const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
    const iso = (x: Date) =>
      `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    const d = dados({ empresas: [
      empresa({ status: "Lead", data_proxima_acao: iso(amanha) }),
      empresa({ status: "Lead", data_proxima_acao: iso(hoje) }),     // hoje conta
      empresa({ status: "Lead", data_proxima_acao: iso(ontem) }),    // vencido não
      empresa({ status: "Lead", data_proxima_acao: null }),
      empresa({ status: "Fechado", data_proxima_acao: null }),       // saiu do funil
    ]});
    const m = coberturaFollowUp(d);
    expect(m.valor).toBe(50);
    expect(m.base).toBe("2 de 4 empresas ativas");
  });

  it("cobertura de contato aceita qualquer um dos três campos", () => {
    const d = dados({ empresas: [
      empresa({ status: "Lead", contato_email: "a@b.c" }),
      empresa({ status: "Lead", contato_celular: "11999" }),
      empresa({ status: "Lead", contato_whatsapp: "11999" }),
      empresa({ status: "Lead" }),
    ]});
    expect(coberturaContato(d).valor).toBe(75);
  });

  it("as duas são declaradas incomparáveis no catálogo", () => {
    const incomparaveis = KPIS.filter(k => !k.comparavel).map(k => k.chave);
    expect(incomparaveis.sort()).toEqual(["contato", "followup"]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("calcularKpi", () => {
  const d = dados({ empresas: [
    // Janela atual (jan–jun/2026): 2 fechados, 2 perdidos → 50%
    empresa({ status: "Fechado", status_atualizado_em: "2026-05-10" }),
    empresa({ status: "Fechado", status_atualizado_em: "2026-04-10" }),
    empresa({ status: "Perdido", status_atualizado_em: "2026-03-10" }),
    empresa({ status: "Perdido", status_atualizado_em: "2026-02-10" }),
    // Janela anterior (jul–dez/2025): 1 fechado, 3 perdidos → 25%
    empresa({ status: "Fechado", status_atualizado_em: "2025-10-10" }),
    empresa({ status: "Perdido", status_atualizado_em: "2025-09-10" }),
    empresa({ status: "Perdido", status_atualizado_em: "2025-08-10" }),
    empresa({ status: "Perdido", status_atualizado_em: "2025-11-10" }),
  ]});

  it("compara com a janela anterior e devolve o Δ em pontos", () => {
    const k = calcularKpi(KPIS.filter(x => x.chave === "conversao")[0], d, 6, BASE);
    expect(k.atual.valor).toBe(50);
    expect(k.anterior!.valor).toBe(25);
    expect(k.delta).toBe(25);
  });

  it("a série mensal tem um ponto por mês da janela", () => {
    const k = calcularKpi(KPIS.filter(x => x.chave === "novos")[0], d, 6, BASE);
    expect(k.serie).toHaveLength(6);
  });

  it("a série sai da MESMA função do número grande", () => {
    // O total de leads captados na janela tem de bater com a soma da série —
    // é a garantia de que o card e a sparkline não podem divergir.
    const dd = dados({ empresas: [
      empresa({ criado_em: "2026-02-03" }), empresa({ criado_em: "2026-02-20" }),
      empresa({ criado_em: "2026-05-09" }),
    ]});
    const k = calcularKpi(KPIS.filter(x => x.chave === "novos")[0], dd, 6, BASE);
    // Contagem nunca devolve null: zero lead num mês É um resultado.
    expect(k.serie.indexOf(null)).toBe(-1);
    expect(k.serie.reduce((s: number, v) => s + (v ?? 0), 0)).toBe(k.atual.valor);
  });

  it("mês sem amostra vira BURACO na série de taxa, não 0%", () => {
    // Só março teve desfecho. Os outros cinco meses não tiveram nenhum — e
    // "0% de conversão" ali afirmaria que o time perdeu tudo, que é o oposto
    // de "não houve negócio decidido".
    const dd = dados({ empresas: [
      empresa({ status: "Fechado", status_atualizado_em: "2026-03-10" }),
      empresa({ status: "Perdido", status_atualizado_em: "2026-03-12" }),
    ]});
    const k = calcularKpi(KPIS.filter(x => x.chave === "conversao")[0], dd, 6, BASE);
    expect(k.serie).toEqual([null, null, 50, null, null, null]);
  });

  it("mas zero continua zero onde zero é resultado", () => {
    const dd = dados({ empresas: [empresa({ criado_em: "2026-03-10" })] });
    const k = calcularKpi(KPIS.filter(x => x.chave === "novos")[0], dd, 6, BASE);
    expect(k.serie).toEqual([0, 0, 1, 0, 0, 0]);
  });

  it("métrica incomparável não produz anterior nem Δ", () => {
    const k = calcularKpi(KPIS.filter(x => x.chave === "followup")[0], d, 6, BASE);
    expect(k.anterior).toBeNull();
    expect(k.delta).toBeNull();
  });

  it("sem amostra no período anterior o Δ é omitido, não vira +100%", () => {
    const dd = dados({ empresas: [empresa({ status: "Fechado", status_atualizado_em: "2026-05-10" })] });
    const k = calcularKpi(KPIS.filter(x => x.chave === "conversao")[0], dd, 6, BASE);
    expect(k.atual.valor).toBe(100);
    expect(k.delta).toBeNull();
  });

  it("a série de um ESTOQUE é o nível no fim de cada mês, não o que entrou", () => {
    const dd = dados({ orcamentos: [
      orcamento({ status: "enviado", total: 100, data_envio: "2026-04-05" }),
    ]});
    const k = calcularKpi(KPIS.filter(x => x.chave === "pipeline")[0], dd, 6, BASE);
    // Abril, maio e junho carregam o MESMO orçamento — é nível, não fluxo.
    expect(k.serie).toEqual([0, 0, 0, 100, 100, 100]);
  });

  it("todas as chaves de destaque existem no catálogo", () => {
    KPIS_DESTAQUE.forEach(c => {
      expect(KPIS.filter(k => k.chave === c)).toHaveLength(1);
    });
  });

  it("nenhuma chave do catálogo está duplicada", () => {
    const chaves = KPIS.map(k => k.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("séries mensais", () => {
  const d = dados({
    empresas: [
      empresa({ criado_em: "2026-04-02" }), empresa({ criado_em: "2026-06-02" }),
      empresa({ criado_em: "2026-01-02" }),
      empresa({ status: "Fechado", criado_em: "2026-01-02", status_atualizado_em: "2026-05-02" }),
    ],
    orcamentos: [orcamento({ status: "enviado", data_envio: "2026-06-01", total: 50 })],
  });

  it("distribui por mês na ordem da janela", () => {
    const s = serieMensal("leads", "Leads", "#000", d, 6, BASE);
    // Janeiro tem duas: a solta e a que veio a fechar em maio — captacao
    // conta pela ENTRADA, e fechar depois nao tira a empresa do mes em que entrou.
    expect(s.valores).toEqual([2, 0, 0, 1, 0, 1]);   // jan, fev, mar, abr, mai, jun
  });

  it("a série anterior tem o mesmo tamanho e cobre a janela recuada", () => {
    const s = serieMensal("leads", "Leads", "#000", d, 6, BASE, true);
    expect(s.anterior).toHaveLength(6);
    expect(s.anterior).toEqual([0, 0, 0, 0, 0, 0]);   // jul–dez/2025, sem nada
  });

  it("a comparação alinha por POSIÇÃO, não por nome do mês", () => {
    // Um lead em julho/2025 tem de cair na posição 0 da série anterior —
    // jul/2025 é o 1º mês do período anterior, comparado com jan/2026.
    const dd = dados({ empresas: [empresa({ criado_em: "2025-07-15" })] });
    const s = serieMensal("leads", "Leads", "#000", dd, 6, BASE, true);
    expect(s.anterior![0]).toBe(1);
  });

  it("a série de fechados usa a data do desfecho, não a do cadastro", () => {
    const s = serieMensal("fechados", "Fechados", "#000", d, 6, BASE);
    expect(s.valores).toEqual([0, 0, 0, 0, 1, 0]);    // maio
  });

  it("a série sabe se subir é bom, para o balão pintar a variação certo", () => {
    // Sem isto, um mês com mais negócios PERDIDOS apareceria em verde.
    expect(serieMensal("leads", "Leads", "#000", d, 6, BASE).subirEBom).toBe(true);
    expect(serieMensal("perdidos", "Perdidos", "#000", d, 6, BASE).subirEBom).toBe(false);
    expect(serieMensal("recusado", "Recusado", "#000", d, 6, BASE).subirEBom).toBe(false);
  });

  it("serieKpi herda a direção do próprio indicador", () => {
    // "Ciclo de fechamento" cai para melhorar: subir tem de sair em vermelho.
    const ciclo = KPIS.filter(k => k.chave === "ciclo")[0];
    expect(serieKpi(ciclo, d, 6, BASE).subirEBom).toBe(false);
    const valor = KPIS.filter(k => k.chave === "valor")[0];
    expect(serieKpi(valor, d, 6, BASE).subirEBom).toBe(true);
  });

  it("chave desconhecida devolve série vazia em vez de quebrar", () => {
    expect(serieMensal("inexistente", "x", "#000", d, 6, BASE).valores).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("recortes por categoria", () => {
  const d = dados({
    empresas: [
      empresa({ empresa_id: "A", segmento: "Construção", status: "Fechado", criado_em: "2026-02-01" }),
      empresa({ empresa_id: "B", segmento: "Construção", status: "Perdido", criado_em: "2026-02-01",
                motivo_perdido: "Preço" }),
      empresa({ empresa_id: "C", segmento: "Logística",  status: "Fechado", criado_em: "2026-03-01" }),
      empresa({ empresa_id: "D", segmento: null,         status: "Lead",    criado_em: "2026-03-01" }),
      empresa({ empresa_id: "E", segmento: "Construção", status: "Perdido", criado_em: "2026-03-01" }),
    ],
    orcamentos: [
      orcamento({ empresa_id: "A", status: "aprovado", total: 800, data_decisao: "2026-04-01" }),
      orcamento({ empresa_id: "C", status: "aprovado", total: 5000, data_decisao: "2026-04-01" }),
    ],
  });

  it("ordena por valor aprovado, não por volume de entrada", () => {
    const r = porCategoria(d, "segmento");
    // Construção tem 3 empresas e R$ 800; Logística tem 1 e R$ 5.000.
    expect(r[0].categoria).toBe("Logística");
    expect(r[1].categoria).toBe("Construção");
  });

  it("a conversão sai dos decididos daquele grupo", () => {
    const constr = porCategoria(d, "segmento").filter(x => x.categoria === "Construção")[0];
    expect(constr.total).toBe(3);
    expect(constr.fechados).toBe(1);
    expect(constr.perdidos).toBe(2);
    expect(constr.conversao).toBeCloseTo(33.333, 2);
  });

  it("grupo sem nada decidido tem conversão null, não 0%", () => {
    const dd = dados({ empresas: [empresa({ segmento: "Novo", status: "Lead" })] });
    expect(porCategoria(dd, "segmento")[0].conversao).toBeNull();
  });

  it("campo vazio vira 'Não informado' em vez de sumir", () => {
    const r = porCategoria(d, "segmento").map(x => x.categoria);
    expect(r).toContain("Não informado");
  });

  it("motivo de perda só olha perdidas, e a ausência do motivo é a informação", () => {
    const r = porCategoria(d, "motivo_perdido");
    expect(r.map(x => x.categoria).sort()).toEqual(["Motivo não registrado", "Preço"]);
    expect(r.reduce((s, x) => s + x.total, 0)).toBe(2);   // só as duas perdidas
  });

  it("a janela recorta pela ENTRADA da empresa", () => {
    const j = { inicio: new Date(2026, 2, 1), fim: new Date(2026, 2, 31, 23, 59, 59) };
    const r = porCategoria(d, "segmento", j);
    expect(r.reduce((s, x) => s + x.total, 0)).toBe(3);   // C, D, E
  });

  it("respeita o limite e a ordem é estável para valores iguais", () => {
    const dd = dados({ empresas: [
      empresa({ segmento: "Zeta" }), empresa({ segmento: "Alfa" }), empresa({ segmento: "Beta" }),
    ]});
    expect(porCategoria(dd, "segmento", null, 2).map(x => x.categoria)).toEqual(["Alfa", "Beta"]);
  });

  it("motivosRecusa espelha o motivo_perdido no orçamento", () => {
    const dd = dados({ orcamentos: [
      orcamento({ status: "recusado", total: 100, motivo_recusa: "Prazo",  data_decisao: "2026-05-01" }),
      orcamento({ status: "recusado", total: 900, motivo_recusa: "Preço",  data_decisao: "2026-05-01" }),
      orcamento({ status: "recusado", total: 50,  motivo_recusa: null,     data_decisao: "2026-05-01" }),
      orcamento({ status: "aprovado", total: 999, data_decisao: "2026-05-01" }),
    ]});
    const r = motivosRecusa(dd, janelaMeses(6, BASE));
    expect(r[0].motivo).toBe("Preço");
    expect(r.map(x => x.motivo)).toContain("Motivo não registrado");
    expect(r).toHaveLength(3);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("retrato do funil", () => {
  const d = dados({
    empresas: [
      empresa({ empresa_id: "A", status: "Lead",       status_atualizado_em: "2026-06-14" }),
      empresa({ empresa_id: "B", status: "Lead",       status_atualizado_em: "2026-06-13" }),
      empresa({ empresa_id: "C", status: "Proposta",   status_atualizado_em: "2026-06-10" }),
      empresa({ empresa_id: "D", status: "Perdido",    status_atualizado_em: "2026-05-10" }),
      empresa({ empresa_id: "E", status: "Rascunho" }),
    ],
    orcamentos: [
      orcamento({ empresa_id: "C", status: "enviado",  total: 1200 }),
      orcamento({ empresa_id: "C", status: "rascunho", total: 9000 }),   // não conta
    ],
  });
  const f = retratoFunil(d);
  const etapa = (n: string) => f.filter(x => x.etapa === n)[0];

  it("tem as seis etapas, sem Perdido", () => {
    expect(f.map(x => x.etapa)).toEqual(
      ["Lead", "Em contato", "Visita agendada", "Proposta", "Negociação", "Fechado"]);
  });

  it("a fatia é sobre a base real — rascunho fora, perdido dentro do total", () => {
    // 4 empresas reais (A, B, C, D); 2 em Lead → 50%.
    expect(etapa("Lead").fatia).toBe(50);
  });

  it("o valor da etapa soma orçamento aberto e aprovado, nunca rascunho", () => {
    expect(etapa("Proposta").valor).toBe(1200);
  });

  it("etapa vazia é 0 e não some da lista", () => {
    expect(etapa("Negociação").quantidade).toBe(0);
    expect(etapa("Negociação").diasParado).toBeNull();
  });
});

describe("funil — dias parado usa mediana", () => {
  it("um caso extremo não arrasta a etapa inteira", () => {
    const hoje = new Date();
    const atras = (n: number) => {
      const x = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - n);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    };
    const d = dados({ empresas: [
      empresa({ status: "Lead", status_atualizado_em: atras(1) }),
      empresa({ status: "Lead", status_atualizado_em: atras(3) }),
      empresa({ status: "Lead", status_atualizado_em: atras(400) }),
    ]});
    const lead = retratoFunil(d).filter(x => x.etapa === "Lead")[0];
    expect(lead.diasParado).toBe(3);        // mediana; a média daria ~134
  });

  it("com número par de empresas a mediana é a média das duas do meio", () => {
    const hoje = new Date();
    const atras = (n: number) => {
      const x = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - n);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    };
    const d = dados({ empresas: [
      empresa({ status: "Lead", status_atualizado_em: atras(2) }),
      empresa({ status: "Lead", status_atualizado_em: atras(4) }),
    ]});
    expect(retratoFunil(d).filter(x => x.etapa === "Lead")[0].diasParado).toBe(3);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("envelhecimento das propostas", () => {
  const hoje = new Date(2026, 5, 15);
  const d = dados({ orcamentos: [
    orcamento({ status: "enviado",       total: 10, data_envio: "2026-06-12" }),  // 3 dias
    orcamento({ status: "em_negociacao", total: 20, data_envio: "2026-06-05" }),  // 10 dias
    orcamento({ status: "enviado",       total: 30, data_envio: "2026-05-25" }),  // 21 dias
    orcamento({ status: "enviado",       total: 40, data_envio: "2026-04-01" }),  // 75 dias
    orcamento({ status: "aprovado",      total: 99, data_envio: "2026-04-01",
                data_decisao: "2026-04-10" }),                                    // decidido, fora
    orcamento({ status: "enviado",       total: 88 }),                            // sem envio, fora
  ]});
  const f = agingPropostas(d, hoje);

  it("cada proposta cai numa faixa só", () => {
    expect(f.map(x => x.quantidade)).toEqual([1, 1, 1, 1]);
  });

  it("os limites são inclusivos nos cortes de 7, 15 e 30", () => {
    const limites = dados({ orcamentos: [
      orcamento({ status: "enviado", data_envio: "2026-06-08" }),   // exatamente 7
      orcamento({ status: "enviado", data_envio: "2026-05-31" }),   // exatamente 15
      orcamento({ status: "enviado", data_envio: "2026-05-16" }),   // exatamente 30
      orcamento({ status: "enviado", data_envio: "2026-05-15" }),   // 31
    ]});
    expect(agingPropostas(limites, hoje).map(x => x.quantidade)).toEqual([1, 1, 1, 1]);
  });

  it("só as duas últimas faixas são alerta", () => {
    expect(f.map(x => x.alerta)).toEqual([false, false, true, true]);
  });

  it("proposta decidida não envelhece", () => {
    expect(f.reduce((s, x) => s + x.valor, 0)).toBe(100);   // 10+20+30+40
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("time", () => {
  const usuarios: UsuarioMetrica[] = [
    usuario({ usuario_id: "v1", nome: "Ana",   supervisor_nome: "Sofia" }),
    usuario({ usuario_id: "v2", nome: "Bruno", supervisor_nome: "Sofia" }),
    usuario({ usuario_id: "v3", nome: "Caio",  supervisor_nome: "Théo" }),
    usuario({ usuario_id: "g1", nome: "Gerente", role: "gerente" }),   // fora da tabela
  ];
  const d = dados({
    empresas: [
      empresa({ empresa_id: "A", vendedor_id: "v1", status: "Fechado", status_atualizado_em: "2026-05-01" }),
      empresa({ empresa_id: "B", vendedor_id: "v1", status: "Perdido", status_atualizado_em: "2026-05-01" }),
      empresa({ empresa_id: "C", vendedor_id: "v2", status: "Perdido", status_atualizado_em: "2026-05-01" }),
      empresa({ empresa_id: "D", vendedor_id: "v3", status: "Lead" }),
      empresa({ empresa_id: "E", vendedor_id: "v3", status: "Rascunho" }),   // não é carteira
    ],
    orcamentos: [
      orcamento({ empresa_id: "A", status: "aprovado", total: 4000, data_decisao: "2026-05-02" }),
      orcamento({ empresa_id: "D", status: "enviado",  total: 700,  data_envio: "2026-05-02" }),
      orcamento({ empresa_id: "A", status: "aprovado", total: 1000, data_decisao: "2025-09-02" }),  // anterior
    ],
    eventos: [evento({ empresa_id: "A", data: "2026-05-03" }), evento({ empresa_id: "D", data: "2026-05-03" })],
  });
  const linhas = porVendedor(d, usuarios, 6, BASE);

  it("gerente não vira linha da tabela", () => {
    expect(linhas.map(l => l.nome)).not.toContain("Gerente");
    expect(linhas).toHaveLength(3);
  });

  it("ordena por valor aprovado", () => {
    expect(linhas[0].nome).toBe("Ana");
  });

  it("rascunho não conta como carteira", () => {
    expect(linhas.filter(l => l.nome === "Caio")[0].carteira).toBe(1);
  });

  it("expõe perdidos junto com fechados", () => {
    const ana = linhas.filter(l => l.nome === "Ana")[0];
    expect(ana.fechados).toBe(1);
    expect(ana.perdidos).toBe(1);
    expect(ana.conversao).toBe(50);
  });

  it("o Δ compara com a mesma janela recuada", () => {
    const ana = linhas.filter(l => l.nome === "Ana")[0];
    expect(ana.aprovado).toBe(4000);
    expect(ana.deltaAprovado).toBe(3000);   // 4000 agora contra 1000 antes
  });

  it("sem nada no período anterior o Δ some — não vira '+100%' do zero", () => {
    expect(linhas.filter(l => l.nome === "Caio")[0].deltaAprovado).toBeNull();
  });

  it("o orçamento segue a empresa: aberto entra na carteira de quem a detém", () => {
    expect(linhas.filter(l => l.nome === "Caio")[0].aberto).toBe(700);
  });

  it("atividade é contada pela empresa da carteira", () => {
    expect(linhas.filter(l => l.nome === "Ana")[0].atividades).toBe(1);
    expect(linhas.filter(l => l.nome === "Bruno")[0].atividades).toBe(0);
  });

  it("porEquipe soma os números, nunca a média das taxas", () => {
    const eq = porEquipe(linhas);
    const sofia = eq.filter(x => x.equipe === "Sofia")[0];
    // Ana: 1 fechado / 1 perdido. Bruno: 0 fechado / 1 perdido.
    // Somando: 1 de 3 = 33,3%. A média das taxas (50% e 0%) daria 25% — errado.
    expect(sofia.conversao).toBeCloseTo(33.333, 2);
    expect(sofia.vendedores).toBe(2);
  });

  it("equipe cujo vendedor não decidiu nada tem conversão null", () => {
    const theo = porEquipe(linhas).filter(x => x.equipe === "Théo")[0];
    expect(theo.conversao).toBeNull();
  });

  it("a comparação entre equipes só abre com mais de uma equipe no escopo", () => {
    expect(equipesComparaveis(linhas)).toBe(true);
    // Um supervisor recebe do backend só a própria equipe — um grupo, sem comparação.
    const so = porVendedor(d, [usuarios[0], usuarios[1]], 6, BASE);
    expect(equipesComparaveis(so)).toBe(false);
  });

  it("vendedor sem supervisor não some do agrupamento", () => {
    const soltos = porVendedor(d, [usuario({ usuario_id: "v9", nome: "Solto" })], 6, BASE);
    expect(porEquipe(soltos)[0].equipe).toBe("Sem supervisor");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("atividades", () => {
  const d = dados({
    empresas: [
      empresa({ empresa_id: "A", status: "Lead" }),
      empresa({ empresa_id: "B", status: "Lead" }),
      empresa({ empresa_id: "C", status: "Fechado", status_atualizado_em: "2026-05-01" }),
    ],
    eventos: [
      evento({ tipo: "call",    data: "2026-05-02", empresa_id: "A" }),
      evento({ tipo: "call",    data: "2026-04-02", empresa_id: "A" }),
      evento({ tipo: "visita",  data: "2026-05-05", empresa_id: "C" }),
      evento({ tipo: "reuniao", data: "2026-12-20", empresa_id: "A" }),   // futuro
      evento({ tipo: "outro",   data: "2026-05-05", empresa_id: "B" }),
    ],
  });

  it("uma série por tipo, na ordem do calendário", () => {
    const s = atividadesPorTipo(d, 6, BASE);
    expect(s.map(x => x.chave)).toEqual(["call", "visita", "reuniao", "proposta"]);
  });

  it("evento no futuro não conta como cumprido, mas aparece como agendado", () => {
    const s = atividadesPorTipo(d, 6, BASE);
    const reuniao = s.filter(x => x.chave === "reuniao")[0];
    expect(reuniao.total).toBe(0);
    expect(reuniao.aFrente).toBe(1);
  });

  it("'ainda agendadas' enxerga além da janela — agenda é para a frente", () => {
    // A reunião é de dezembro/2026; a janela termina em junho. Recortar o
    // futuro pela janela zeraria o número na prática.
    expect(atividadesPorTipo(d, 3, BASE).filter(x => x.chave === "reuniao")[0].aFrente).toBe(1);
  });

  it("o total bate com a soma da série", () => {
    const call = atividadesPorTipo(d, 6, BASE).filter(x => x.chave === "call")[0];
    expect(call.total).toBe(2);
    expect(call.valores.reduce((s, v) => s + v, 0)).toBe(2);
  });

  it("esforço por fechamento divide atividades por fechamentos", () => {
    // 4 eventos dentro da janela (o de dezembro fica fora), 1 fechamento.
    const m = esforcoPorFechamento(d, janelaMeses(6, BASE));
    expect(m.valor).toBe(4);
  });

  it("sem fechamento o esforço é null, não infinito", () => {
    const dd = dados({ eventos: [evento({ data: "2026-05-01" })] });
    expect(esforcoPorFechamento(dd, janelaMeses(6, BASE)).valor).toBeNull();
  });

  it("ativas sem agenda olha só o que está por vir", () => {
    // A tem reunião em dezembro/2026 (futuro em relação a BASE); B não tem nada.
    const m = ativasSemAgenda(d, BASE);
    expect(m.valor).toBe(1);
    expect(m.amostra).toBe(2);   // C está fechada, saiu do funil
  });

  it("aceite de convite ignora evento sem convidado", () => {
    const dd = dados({ eventos: [
      evento({ data: "2026-05-01", status_resposta: "aceito" }),
      evento({ data: "2026-05-01", status_resposta: "negado" }),
      evento({ data: "2026-05-01" }),   // sem convite: fora do denominador
    ]});
    const m = taxaAceiteConvite(dd, janelaMeses(6, BASE));
    expect(m.valor).toBe(50);
    expect(m.base).toBe("1 de 2 convites");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Grade diária, ritmo dentro do mês e padrões
//
// Toda esta metade do arquivo é mais frágil que a mensal por um motivo só: ela
// afirma COISAS EM PALAVRAS ("acelerando", "melhor dia", "caiu por ticket"), e
// palavra errada sobre número certo é o defeito que ninguém percebe olhando a
// tela. O que os testes travam, então, não é só o valor — é a fronteira em que
// a função se recusa a afirmar.
// ═════════════════════════════════════════════════════════════════════════════

describe("baldesDiarios", () => {
  it("um balde por dia, inclusive as duas pontas", () => {
    const dias = baldesDiarios(new Date(2026, 4, 1), new Date(2026, 4, 31, 23, 59), BASE);
    expect(dias).toHaveLength(31);
    expect(dias[0].dia).toBe(1);
    expect(dias[30].dia).toBe(31);
    expect(dias[0].rotulo).toBe("01/05");
  });

  it("PARA em hoje: o mês corrente não ganha os dias que ainda não aconteceram", () => {
    // Sem este corte, os 15 dias futuros de junho entrariam como zero e
    // afundariam qualquer média calculada sobre o mês corrente.
    const dias = baldesDiarios(new Date(2026, 5, 1), new Date(2026, 5, 30, 23, 59), BASE);
    expect(dias).toHaveLength(15);
    expect(dias[14].dia).toBe(15);
  });

  it("guarda o dia da semana de cada dia", () => {
    // 01/05/2026 é uma sexta-feira.
    const dias = baldesDiarios(new Date(2026, 4, 1), new Date(2026, 4, 3), BASE);
    expect(dias.map(d => d.diaSemana)).toEqual([5, 6, 0]);
  });
});

describe("ritmoDoMes", () => {
  const maio = baldesMensais(2, BASE)[0];   // maio/2026, mês inteiro

  const comLeads = (diasDoMes: number[]) => dados({
    empresas: diasDoMes.map(d =>
      empresa({ criado_em: `2026-05-${String(d).padStart(2, "0")}` })),
  });

  it("reparte o mês em duas metades e mede a segunda contra a primeira", () => {
    const r = ritmoDoMes("leads", comLeads([2, 3, 20, 21, 22, 23]), maio, BASE);
    expect(r.dias).toBe(31);
    expect(r.total).toBe(6);
    expect(r.primeiraMetade).toBe(2);
    expect(r.segundaMetade).toBe(4);
    expect(r.variacao).toBeCloseTo(1, 5);
    expect(r.direcao).toBe("acelerando");
  });

  it("metades parecidas são ESTÁVEL, não uma direção qualquer", () => {
    const r = ritmoDoMes("leads", comLeads([2, 3, 4, 5, 20, 21, 22, 23]), maio, BASE);
    expect(r.primeiraMetade).toBe(4);
    expect(r.segundaMetade).toBe(4);
    expect(r.direcao).toBe("estável");
  });

  it("a segunda metade cair abaixo da margem vira DESACELERANDO", () => {
    const r = ritmoDoMes("leads", comLeads([2, 3, 4, 5, 6, 20]), maio, BASE);
    expect(r.primeiraMetade).toBe(5);
    expect(r.segundaMetade).toBe(1);
    expect(r.direcao).toBe("desacelerando");
  });

  it("amostra pequena NÃO ganha direção — é o ponto do null", () => {
    // Três leads, todos na segunda quinzena, dariam "acelerando 100%". Com esse
    // volume o mês seguinte inverte o veredito sozinho, e a frase perde valor.
    const r = ritmoDoMes("leads", comLeads([20, 21, 22]), maio, BASE);
    expect(r.total).toBe(3);
    expect(r.direcao).toBeNull();
  });

  it("o dia do meio pertence à SEGUNDA metade — o presente pesa mais", () => {
    const r = ritmoDoMes("leads", comLeads([16]), maio, BASE);
    expect(r.primeiraMetade).toBe(0);
    expect(r.segundaMetade).toBe(1);
  });

  it("marca o mês corrente como parcial e conta só os dias decorridos", () => {
    const junho = baldesMensais(1, BASE)[0];
    const r = ritmoDoMes("leads", dados({
      empresas: [empresa({ criado_em: "2026-06-10" })],
    }), junho, BASE);
    expect(r.parcial).toBe(true);
    expect(r.dias).toBe(15);
    expect(r.media).toBeCloseTo(1 / 15, 5);
  });

  it("mês inteiro sem registro não vira direção nem pico", () => {
    const r = ritmoDoMes("leads", dados(), maio, BASE);
    expect(r.total).toBe(0);
    expect(r.diaPico).toBeNull();
    expect(r.direcao).toBeNull();
  });
});

describe("conversaoDiaria", () => {
  const j = janelaMeses(6, BASE);
  const base = dados({
    empresas: [
      empresa({ status: "Fechado", status_atualizado_em: "2026-02-10" }),
      empresa({ status: "Perdido", status_atualizado_em: "2026-03-05" }),
      empresa({ status: "Fechado", status_atualizado_em: "2026-03-05" }),
      empresa({ status: "Fechado", status_atualizado_em: "2026-05-20" }),
    ],
  });

  it("antes do primeiro desfecho a taxa é NULL, não zero", () => {
    const p = conversaoDiaria(base, j, BASE);
    expect(p[0].rotulo).toBe("01/01");
    expect(p[0].taxaAcum).toBeNull();
    // 10/02 é o dia do primeiro fechamento: 40 dias depois de 01/01.
    const primeiro = p.filter(x => x.taxaAcum !== null)[0];
    expect(primeiro.rotulo).toBe("10/02");
    expect(primeiro.taxaAcum).toBe(100);
  });

  it("é ACUMULADA: cada ponto é a conversão do período até ali", () => {
    const p = conversaoDiaria(base, j, BASE);
    const em = (r: string) => p.filter(x => x.rotulo === r)[0];
    expect(em("05/03").fechadosAcum).toBe(2);
    expect(em("05/03").perdidosAcum).toBe(1);
    expect(em("05/03").taxaAcum).toBeCloseTo((2 / 3) * 100, 5);
  });

  it("o último ponto é EXATAMENTE o número grande do card", () => {
    // Se estes dois divergirem, a tela mostra dois números diferentes para a
    // mesma coisa — o modo clássico de um painel perder a confiança de quem lê.
    const p = conversaoDiaria(base, j, BASE);
    const ultima = p[p.length - 1];
    expect(ultima.taxaAcum).toBeCloseTo(taxaConversao(base, j).valor as number, 6);
  });

  it("dia sem decisão mantém a taxa, e a contagem do dia fica zerada", () => {
    const p = conversaoDiaria(base, j, BASE);
    const i = p.findIndex(x => x.rotulo === "06/03");
    expect(p[i].fechadosDia).toBe(0);
    expect(p[i].perdidosDia).toBe(0);
    expect(p[i].taxaAcum).toBe(p[i - 1].taxaAcum);
  });

  it("sem desfecho nenhum, todos os pontos ficam sem taxa", () => {
    const p = conversaoDiaria(dados({ empresas: [empresa()] }), j, BASE);
    expect(p.filter(x => x.taxaAcum !== null)).toHaveLength(0);
  });
});

describe("marcosConversao", () => {
  const j = janelaMeses(6, BASE);
  const p = conversaoDiaria(dados({
    empresas: [
      empresa({ status: "Fechado", status_atualizado_em: "2026-02-10" }),
      empresa({ status: "Perdido", status_atualizado_em: "2026-03-05" }),
      empresa({ status: "Fechado", status_atualizado_em: "2026-04-02" }),
      empresa({ status: "Perdido", status_atualizado_em: "2026-05-20" }),
    ],
  }), j, BASE);

  it("o dia em que a taxa nasce entra sempre, e é o primeiro da lista", () => {
    const m = marcosConversao(p);
    expect(m[0].rotulo).toBe("10/02");
    expect(m[0].variacao).toBe(0);
  });

  it("sai em ordem cronológica, mesmo escolhendo por tamanho do movimento", () => {
    const m = marcosConversao(p);
    const tempos = m.map(x => x.data.getTime());
    expect(tempos.slice()).toEqual(tempos.slice().sort((a, b) => a - b));
  });

  it("só entra dia em que a taxa MEXEU — dia parado não vira marco", () => {
    const m = marcosConversao(p);
    expect(m.every(x => x.fechadosDia + x.perdidosDia > 0)).toBe(true);
    expect(m).toHaveLength(4);   // quatro desfechos, quatro movimentos
  });

  it("respeita o limite pedido", () => {
    expect(marcosConversao(p, 2)).toHaveLength(2);
  });

  it("sem desfecho, não há marco nenhum", () => {
    expect(marcosConversao(conversaoDiaria(dados(), j, BASE))).toHaveLength(0);
  });
});

describe("resumoConversao", () => {
  const j = janelaMeses(6, BASE);
  const resumoDe = (empresas: EmpresaMetrica[]) =>
    resumoConversao(conversaoDiaria(dados({ empresas }), j, BASE));

  it("sem desfecho, não escreve frase nenhuma", () => {
    expect(resumoDe([]).frases).toHaveLength(0);
  });

  it("com amostra pequena, a frase DIZ que é pequena em vez de cravar a taxa", () => {
    const r = resumoDe([
      empresa({ status: "Fechado", status_atualizado_em: "2026-02-10" }),
      empresa({ status: "Perdido", status_atualizado_em: "2026-03-05" }),
    ]);
    expect(r.frases.join(" ")).toContain("amostra pequena demais");
  });

  it("com amostra e queda, a frase diz CAI e o movimento é negativo", () => {
    const r = resumoDe([
      empresa({ status: "Fechado", status_atualizado_em: "2026-01-10" }),
      empresa({ status: "Fechado", status_atualizado_em: "2026-01-11" }),
      empresa({ status: "Fechado", status_atualizado_em: "2026-01-12" }),
      empresa({ status: "Perdido", status_atualizado_em: "2026-04-01" }),
      empresa({ status: "Perdido", status_atualizado_em: "2026-04-02" }),
      empresa({ status: "Perdido", status_atualizado_em: "2026-04-03" }),
    ]);
    expect(r.movimento).toBeLessThan(0);
    expect(r.frases.join(" ")).toContain("CAI");
  });

  it("com amostra e alta, a frase diz SOBE", () => {
    const r = resumoDe([
      empresa({ status: "Perdido", status_atualizado_em: "2026-01-10" }),
      empresa({ status: "Perdido", status_atualizado_em: "2026-01-11" }),
      empresa({ status: "Perdido", status_atualizado_em: "2026-01-12" }),
      empresa({ status: "Fechado", status_atualizado_em: "2026-04-01" }),
      empresa({ status: "Fechado", status_atualizado_em: "2026-04-02" }),
      empresa({ status: "Fechado", status_atualizado_em: "2026-04-03" }),
    ]);
    expect(r.movimento).toBeGreaterThan(0);
    expect(r.frases.join(" ")).toContain("SOBE");
  });

  it("conta os dias de silêncio no fim e avisa que a taxa está PARADA", () => {
    // Último desfecho em 10/01; de 11/01 a 15/06 são mais de quatro meses sem
    // nada decidido. A taxa fica bonita e imóvel, e é isso que a frase quebra.
    const r = resumoDe([
      empresa({ status: "Fechado", status_atualizado_em: "2026-01-10" }),
      empresa({ status: "Perdido", status_atualizado_em: "2026-01-10" }),
      empresa({ status: "Fechado", status_atualizado_em: "2026-01-09" }),
      empresa({ status: "Fechado", status_atualizado_em: "2026-01-08" }),
      empresa({ status: "Perdido", status_atualizado_em: "2026-01-07" }),
    ]);
    expect(r.diasParada).toBeGreaterThan(150);
    expect(r.frases.join(" ")).toContain("PARADA");
  });
});

describe("porDiaDaSemana", () => {
  const j = janelaMeses(6, BASE);

  it("conta quantas VEZES cada dia da semana ocorreu — é o denominador", () => {
    const linhas = porDiaDaSemana(dados(), j, BASE);
    const total = linhas.reduce((s, l) => s + l.ocorrencias, 0);
    // 01/01 a 15/06 de 2026: 31+28+31+30+31+15.
    expect(total).toBe(166);
    // Nenhum dia da semana pode ficar sem ocorrência numa janela de 5 meses.
    expect(linhas.every(l => l.ocorrencias > 0)).toBe(true);
  });

  it("põe cada registro no dia da semana da sua própria data", () => {
    // 04/05/2026 é segunda; 06/05/2026 é quarta.
    const linhas = porDiaDaSemana(dados({
      empresas: [
        empresa({ criado_em: "2026-05-04" }),
        empresa({ status: "Fechado", status_atualizado_em: "2026-05-06" }),
        empresa({ status: "Perdido", status_atualizado_em: "2026-05-06" }),
      ],
    }), j, BASE);
    expect(linhas[1].leads).toBe(1);          // segunda
    expect(linhas[3].fechados).toBe(1);       // quarta
    expect(linhas[3].perdidos).toBe(1);
    expect(linhas[3].conversao).toBe(50);
  });

  it("divide pelo número de ocorrências, não pelo total de dias", () => {
    const linhas = porDiaDaSemana(dados({
      empresas: [
        empresa({ status: "Fechado", status_atualizado_em: "2026-05-06" }),
        empresa({ status: "Fechado", status_atualizado_em: "2026-05-13" }),
      ],
    }), j, BASE);
    const quarta = linhas[3];
    expect(quarta.fechados).toBe(2);
    expect(quarta.fechadosPorOcorrencia).toBeCloseTo(2 / quarta.ocorrencias, 6);
  });
});

describe("destaquesDaSemana", () => {
  const j = janelaMeses(6, BASE);

  /** N fechamentos numa quarta e M numa sexta, dentro da janela. */
  const semana = (quartas: number, sextas: number) => {
    const es: EmpresaMetrica[] = [];
    // Quartas de maio: 06, 13, 20, 27. Sextas: 01, 08, 15, 22.
    const dQuarta = ["06", "13", "20", "27"], dSexta = ["01", "08", "15", "22"];
    for (let i = 0; i < quartas; i++) {
      es.push(empresa({ status: "Fechado", status_atualizado_em: `2026-05-${dQuarta[i % 4]}` }));
    }
    for (let i = 0; i < sextas; i++) {
      es.push(empresa({ status: "Fechado", status_atualizado_em: `2026-05-${dSexta[i % 4]}` }));
    }
    return destaquesDaSemana(porDiaDaSemana(dados({ empresas: es }), j, BASE));
  };

  it("com amostra curta, RECUSA eleger melhor e pior dia", () => {
    const d = semana(4, 2);
    expect(d.fechamentos).toBe(6);
    expect(d.confiavel).toBe(false);
    expect(d.frases.join(" ")).toContain("ainda não há amostra");
  });

  it("com amostra, elege o dia útil que mais fecha por ocorrência", () => {
    const d = semana(14, 4);
    expect(d.confiavel).toBe(true);
    expect(d.melhor && d.melhor.dia).toBe(3);      // quarta
    expect(d.frases.join(" ")).toContain("Quarta");
  });

  it("fim de semana NUNCA vira melhor nem pior — ali se mede expediente", () => {
    // 20 fechamentos num domingo esmagariam qualquer dia útil na conta bruta.
    const es: EmpresaMetrica[] = [];
    for (let i = 0; i < 20; i++) {
      es.push(empresa({ status: "Fechado", status_atualizado_em: "2026-05-03" }));   // domingo
    }
    es.push(empresa({ status: "Fechado", status_atualizado_em: "2026-05-06" }));
    const d = destaquesDaSemana(porDiaDaSemana(dados({ empresas: es }), j, BASE));
    expect(d.melhor && d.melhor.dia).not.toBe(0);
    expect(d.pior && d.pior.dia).not.toBe(0);
    expect(d.frases.join(" ")).toContain("Sábado e domingo");
  });
});

describe("clientesForaDoPadrao", () => {
  /** Um cliente com N compras de `valor` em cada janela. */
  const cliente = (nome: string, atras: { q: number; v: number }, agora: { q: number; v: number }) => {
    const e = empresa({ nome, ultima_interacao: "2026-06-01" });
    const orcs: OrcamentoMetrica[] = [];
    for (let i = 0; i < atras.q; i++) {
      orcs.push(orcamento({ empresa_id: e.empresa_id, status: "aprovado",
                            total: atras.v, data_decisao: "2025-10-10" }));
    }
    for (let i = 0; i < agora.q; i++) {
      orcs.push(orcamento({ empresa_id: e.empresa_id, status: "aprovado",
                            total: agora.v, data_decisao: "2026-03-10" }));
    }
    return { e, orcs };
  };

  it("a decomposição SEMPRE fecha: quantidade + ticket = diferença", () => {
    // É a garantia que sustenta a coluna "Por quê". Se as parcelas não somarem
    // a diferença, a tela está explicando uma queda com números que não são
    // dela — e o erro é invisível, porque cada parcela isolada parece razoável.
    const a = cliente("Menos vezes", { q: 2, v: 10_000 }, { q: 1, v: 10_000 });
    const b = cliente("Mais barato", { q: 2, v: 10_000 }, { q: 2, v: 5_000 });
    const c = cliente("Cresceu", { q: 1, v: 10_000 }, { q: 3, v: 12_000 });
    const d = clientesForaDoPadrao(dados({
      empresas: [a.e, b.e, c.e],
      orcamentos: a.orcs.concat(b.orcs, c.orcs),
    }), 6, BASE);
    expect(d.length).toBe(3);
    d.forEach(x => expect(x.porQuantidade + x.porTicket).toBeCloseTo(x.delta, 6));
  });

  it("separa 'comprou menos vezes' de 'comprou mais barato'", () => {
    const a = cliente("Menos vezes", { q: 2, v: 10_000 }, { q: 1, v: 10_000 });
    const b = cliente("Mais barato", { q: 2, v: 10_000 }, { q: 2, v: 5_000 });
    const d = clientesForaDoPadrao(dados({
      empresas: [a.e, b.e], orcamentos: a.orcs.concat(b.orcs),
    }), 6, BASE);
    const porNome = (n: string) => d.filter(x => x.nome === n)[0];
    expect(porNome("Menos vezes").causa).toBe("quantidade");
    expect(porNome("Menos vezes").porTicket).toBeCloseTo(0, 6);
    expect(porNome("Mais barato").causa).toBe("ticket");
    expect(porNome("Mais barato").porQuantidade).toBeCloseTo(0, 6);
  });

  it("cliente NOVO fica de fora: não há padrão anterior para desviar", () => {
    const novo = cliente("Novo", { q: 0, v: 0 }, { q: 2, v: 50_000 });
    const d = clientesForaDoPadrao(dados({
      empresas: [novo.e], orcamentos: novo.orcs,
    }), 6, BASE);
    expect(d).toHaveLength(0);
  });

  it("quem comprava e zerou aparece, com a queda inteira", () => {
    const sumiu = cliente("Sumiu", { q: 2, v: 8_000 }, { q: 0, v: 0 });
    const d = clientesForaDoPadrao(dados({
      empresas: [sumiu.e], orcamentos: sumiu.orcs,
    }), 6, BASE);
    expect(d).toHaveLength(1);
    expect(d[0].atual).toBe(0);
    expect(d[0].delta).toBe(-16_000);
    expect(d[0].porQuantidade + d[0].porTicket).toBeCloseTo(-16_000, 6);
  });

  it("variação pequena não vira notícia", () => {
    const quase = cliente("Quase igual", { q: 2, v: 10_000 }, { q: 2, v: 10_500 });
    expect(clientesForaDoPadrao(dados({
      empresas: [quase.e], orcamentos: quase.orcs,
    }), 6, BASE)).toHaveLength(0);
  });

  it("ordena pelo desvio em DINHEIRO, não em porcentagem", () => {
    // O pequeno cai 90%, o grande cai 40%. Por porcentagem o pequeno lideraria
    // a tela, e não é ele que explica o mês.
    const pequeno = cliente("Pequeno", { q: 1, v: 1_000 }, { q: 1, v: 100 });
    const grande = cliente("Grande", { q: 1, v: 100_000 }, { q: 1, v: 60_000 });
    const d = clientesForaDoPadrao(dados({
      empresas: [pequeno.e, grande.e], orcamentos: pequeno.orcs.concat(grande.orcs),
    }), 6, BASE);
    expect(d[0].nome).toBe("Grande");
    expect(Math.abs(d[0].deltaPct)).toBeLessThan(Math.abs(d[1].deltaPct));
  });

  it("junta a evidência do período: recusa com motivo e proposta em aberto", () => {
    const c = cliente("Com evidência", { q: 2, v: 10_000 }, { q: 1, v: 10_000 });
    const orcs = c.orcs.concat([
      orcamento({ empresa_id: c.e.empresa_id, status: "recusado", total: 4_000,
                  motivo_recusa: "Prazo", data_decisao: "2026-02-01" }),
      orcamento({ empresa_id: c.e.empresa_id, status: "recusado", total: 9_000,
                  motivo_recusa: "Preço", data_decisao: "2026-02-20" }),
      orcamento({ empresa_id: c.e.empresa_id, status: "enviado", total: 7_000,
                  data_envio: "2026-05-02" }),
    ]);
    const d = clientesForaDoPadrao(dados({ empresas: [c.e], orcamentos: orcs }), 6, BASE);
    expect(d[0].recusado).toBe(13_000);
    // Fica o motivo da recusa MAIS CARA, não o da mais recente: é a que explica
    // o buraco no valor, que é o que a linha mede.
    expect(d[0].motivoRecusa).toBe("Preço");
    expect(d[0].aberto).toBe(7_000);
  });
});

describe("porEquipeDetalhado", () => {
  const supA = usuario({ role: "supervisor", nome: "Ana" });
  const v1 = usuario({ nome: "V1", supervisor_nome: "Ana" });
  const v2 = usuario({ nome: "V2", supervisor_nome: "Ana" });
  const v3 = usuario({ nome: "V3", supervisor_nome: "Beto" });

  const e1 = empresa({ vendedor_id: v1.usuario_id, status: "Fechado",
                       status_atualizado_em: "2026-03-01" });
  const e2 = empresa({ vendedor_id: v2.usuario_id, status: "Perdido",
                       status_atualizado_em: "2026-03-01" });
  const e3 = empresa({ vendedor_id: v3.usuario_id, status: "Fechado",
                       status_atualizado_em: "2026-03-01" });

  const d = dados({
    empresas: [e1, e2, e3],
    orcamentos: [
      orcamento({ empresa_id: e1.empresa_id, status: "aprovado", total: 90_000,
                  data_decisao: "2026-03-02" }),
      orcamento({ empresa_id: e2.empresa_id, status: "aprovado", total: 10_000,
                  data_decisao: "2026-03-02" }),
      orcamento({ empresa_id: e3.empresa_id, status: "aprovado", total: 40_000,
                  data_decisao: "2026-03-02" }),
    ],
  });
  const linhas = porVendedor(d, [supA, v1, v2, v3], 6, BASE);
  const equipes = porEquipeDetalhado(linhas);
  const ana = equipes.filter(x => x.equipe === "Ana")[0];

  it("a conversão da equipe sai dos NÚMEROS somados, não da média das taxas", () => {
    // Ana tem um vendedor com 100% e outro com 0%. A média das taxas daria 50%;
    // o certo é 1 fechado sobre 2 decididos — que aqui coincide, e é por isso
    // que o caso seguinte existe.
    expect(ana.fechados).toBe(1);
    expect(ana.perdidos).toBe(1);
    expect(ana.conversao).toBe(50);
  });

  it("concentração denuncia a equipe que depende de uma pessoa só", () => {
    // 90k de 100k na Ana: 90% do resultado da equipe vem de um vendedor.
    expect(ana.concentracao).toBeCloseTo(90, 6);
    expect(ana.destaque && ana.destaque.nome).toBe("V1");
  });

  it("participação é a fatia do total do escopo, e as fatias somam 100", () => {
    const soma = equipes.reduce((s, x) => s + x.participacao, 0);
    expect(soma).toBeCloseTo(100, 6);
    expect(ana.participacao).toBeCloseTo((100_000 / 140_000) * 100, 6);
  });

  it("aprovado por vendedor corrige o tamanho do time", () => {
    const beto = equipes.filter(x => x.equipe === "Beto")[0];
    expect(ana.aprovado).toBeGreaterThan(beto.aprovado);
    // Ana produz mais no total e MENOS por cabeça — a comparação só existe
    // porque a coluna existe.
    expect(ana.aprovadoPorVendedor).toBe(50_000);
    expect(beto.aprovadoPorVendedor).toBe(40_000);
  });

  it("Δ da equipe é null quando nenhum vendedor tinha base anterior", () => {
    // Somar `null` como zero diria "não mudou" onde o certo é "não dá para saber".
    expect(ana.deltaAprovado).toBeNull();
  });
});

describe("serieEquipeMensal", () => {
  const v1 = usuario({ nome: "V1", supervisor_nome: "Ana" });
  const v2 = usuario({ nome: "V2" });   // sem supervisor
  const e1 = empresa({ vendedor_id: v1.usuario_id });
  const e2 = empresa({ vendedor_id: v2.usuario_id });

  const d = dados({
    empresas: [e1, e2],
    orcamentos: [
      orcamento({ empresa_id: e1.empresa_id, status: "aprovado", total: 5_000,
                  data_decisao: "2026-05-10" }),
      orcamento({ empresa_id: e2.empresa_id, status: "aprovado", total: 3_000,
                  data_decisao: "2026-06-10" }),
      // Recusado não entra: a série é de valor APROVADO.
      orcamento({ empresa_id: e1.empresa_id, status: "recusado", total: 99_000,
                  data_decisao: "2026-05-11" }),
    ],
  });

  it("agrupa pelo supervisor do dono da empresa, e o órfão vira 'Sem supervisor'", () => {
    const s = serieEquipeMensal(d, [v1, v2], 6, BASE);
    expect(s.map(x => x.equipe).sort()).toEqual(["Ana", "Sem supervisor"]);
    expect(s.filter(x => x.equipe === "Ana")[0].total).toBe(5_000);
    expect(s.filter(x => x.equipe === "Sem supervisor")[0].total).toBe(3_000);
  });

  it("põe o valor no mês da DECISÃO, e a série tem um ponto por mês da janela", () => {
    const s = serieEquipeMensal(d, [v1, v2], 6, BASE);
    const ana = s.filter(x => x.equipe === "Ana")[0];
    expect(ana.valores).toHaveLength(6);
    expect(ana.valores[4]).toBe(5_000);   // maio é o 5º dos 6 meses
    expect(ana.valores[5]).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Contato derivado
//
// Estes testes NÃO usam `BASE`. Tudo que passa por `diasDesde` lê o relógio
// real — a função não aceita data injetada —, então a única forma de fixar o
// cenário é montar as datas a partir de hoje. É por isso que `alertasDeAtencao`
// não tinha teste nenhum até aqui.
// ═════════════════════════════════════════════════════════════════════════════

/** "YYYY-MM-DD" de N dias atrás, contra o relógio real. */
const diasAtras = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

describe("contato derivado", () => {
  const parados = (es: EmpresaMetrica[]) =>
    alertasDeAtencao(dados({ empresas: es }))
      .filter(a => a.chave === "parado")[0].valor;

  it("compromisso recente na agenda tira a empresa de 'sem contato', com o cadastro velho", () => {
    // O caso que justifica a mudança inteira: o vendedor visitou a empresa
    // anteontem e não voltou ao formulário. Pelo campo digitado ela estava
    // abandonada há 60 dias; pelo trabalho que existe, foi tocada anteontem.
    expect(parados([empresa({
      ultima_interacao: diasAtras(60),
      ultimo_contato: diasAtras(2),
    })])).toBe(0);
  });

  it("cadastro recente e agenda velha continuam contando como contato recente", () => {
    // `ultimo_contato` é o MAIOR dos dois, então o digitado nunca é ignorado —
    // ele só deixou de ser a única fonte.
    expect(parados([empresa({
      ultima_interacao: diasAtras(1),
      ultimo_contato: diasAtras(1),
    })])).toBe(0);
  });

  it("nada em lugar nenhum continua sendo carteira parada", () => {
    expect(parados([empresa({
      ultima_interacao: diasAtras(40),
      ultimo_contato: diasAtras(40),
    })])).toBe(1);
  });

  it("SEM o campo derivado, cai no cadastro — o comportamento antigo", () => {
    // A janela entre o deploy da Vercel e o do Railway: o backend velho não
    // manda o campo. Sem este fallback, a base inteira apareceria como "nunca
    // teve contato" justamente quando ninguém entenderia por quê.
    expect(parados([empresa({ ultima_interacao: diasAtras(40) })])).toBe(1);
    expect(parados([empresa({ ultima_interacao: diasAtras(2) })])).toBe(0);
  });

  it("`null` no derivado também cai no cadastro, e não vira 'hoje'", () => {
    expect(parados([empresa({ ultima_interacao: diasAtras(40), ultimo_contato: null })])).toBe(1);
  });

  it("empresa sem nenhuma data segue como parada — nunca contatada é o pior caso", () => {
    expect(parados([empresa({})])).toBe(1);
  });

  it("'quentes esfriando' usa a mesma fonte", () => {
    const esfriando = (es: EmpresaMetrica[]) =>
      alertasDeAtencao(dados({ empresas: es })).filter(a => a.chave === "esfriando")[0].valor;
    expect(esfriando([empresa({
      temperatura: "Quente", ultima_interacao: diasAtras(30), ultimo_contato: diasAtras(1),
    })])).toBe(0);
    expect(esfriando([empresa({
      temperatura: "Quente", ultima_interacao: diasAtras(30), ultimo_contato: diasAtras(9),
    })])).toBe(1);
  });

  it("`porVendedor.paradas` usa a mesma fonte", () => {
    const v = usuario({ nome: "V" });
    const comAgenda = empresa({
      vendedor_id: v.usuario_id, ultima_interacao: diasAtras(60), ultimo_contato: diasAtras(3),
    });
    const abandonada = empresa({
      vendedor_id: v.usuario_id, ultima_interacao: diasAtras(60), ultimo_contato: diasAtras(60),
    });
    const linhas = porVendedor(dados({ empresas: [comAgenda, abandonada] }), [v], 6, BASE);
    expect(linhas[0].carteira).toBe(2);
    expect(linhas[0].paradas).toBe(1);
  });

  it("`clientesForaDoPadrao` reporta os dias pela mesma fonte", () => {
    const e = empresa({ nome: "Cliente", ultima_interacao: diasAtras(90), ultimo_contato: diasAtras(4) });
    const orcs = [
      orcamento({ empresa_id: e.empresa_id, status: "aprovado", total: 20_000,
                  data_decisao: "2025-10-10" }),
      orcamento({ empresa_id: e.empresa_id, status: "aprovado", total: 5_000,
                  data_decisao: "2026-03-10" }),
    ];
    const d = clientesForaDoPadrao(dados({ empresas: [e], orcamentos: orcs }), 6, BASE);
    expect(d).toHaveLength(1);
    expect(d[0].diasSemContato).toBe(4);
  });
});
