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
  calcularKpi, serieMensal, porCategoria, motivosRecusa,
  retratoFunil, agingPropostas, porVendedor, porEquipe, equipesComparaveis,
  atividadesPorTipo, esforcoPorFechamento, ativasSemAgenda, taxaAceiteConvite,
  KPIS, KPIS_DESTAQUE, diasEntre,
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
