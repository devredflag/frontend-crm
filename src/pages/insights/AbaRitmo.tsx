/**
 * Aba 5 — Ritmo e padrões.
 *
 * As outras quatro abas respondem QUANTO. Esta responde QUANDO e POR QUÊ, e é a
 * única em que a unidade de tempo é o DIA:
 *
 *   1. a taxa de conversão se formando dia a dia, com o diário dos degraus;
 *   2. o padrão recorrente por dia da semana — em que dia se vende, em que dia
 *      se prospecta, e a distância entre os dois;
 *   3. os clientes que saíram do próprio padrão, com a diferença aberta nas
 *      duas causas que a aritmética permite separar: quantidade e ticket.
 *
 * ── A regra que vale em toda a aba ─────────────────────────────────────────
 * Padrão diário exige amostra, e amostra é o que este CRM tem menos. Por isso
 * cada bloco daqui carrega o próprio denominador e RECUSA a conclusão quando
 * ele não sustenta: `destaquesDaSemana` não elege melhor dia abaixo de 15
 * fechamentos, `resumoConversao` diz o tamanho da amostra dentro da própria
 * frase, e `clientesForaDoPadrao` ignora quem não comprou nas duas janelas.
 * Um "melhor dia da semana" cravado sobre seis negócios é pior do que não ter
 * a análise: ele vira agenda de time.
 */

import { useMemo } from "react";
import { CalendarRange, LineChart, TrendingDown, TrendingUp } from "lucide-react";

import { brl } from "../../utils/moeda";
import type { Dados, DesvioCliente, Filtro, LinhaDiaSemana } from "../../utils/metricas";
import {
  clientesForaDoPadrao, conversaoDiaria, destaquesDaSemana, janelaAnterior, janelaMeses,
  marcosConversao, porDiaDaSemana, resumoConversao,
} from "../../utils/metricas";
import CurvaConversao from "./CurvaConversao";
import {
  Bloco, ColunaTabela, Grade, Nota, Num, Secao, Tabela, TituloBloco, VazioBloco,
} from "./pecas";

const VERDE = "#2CCD93", VERMELHO = "#F87171", AZUL = "#56A4F5", LARANJA = "#F0A05A";

const umaCasa = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const pct = (v: number | null) => v === null ? "—" : `${umaCasa(v)}%`;

/** Quantos clientes desviados cabem numa leitura antes de virar lista de espera. */
const LIMITE_CLIENTES = 6;

export default function AbaRitmo({ dados, filtro, isMobile }: {
  dados: Dados; filtro: Filtro; isMobile: boolean;
}) {
  const { meses } = filtro;
  const janela = janelaMeses(meses);
  const anterior = janelaAnterior(meses);

  // Tudo aqui varre a base dia a dia — 180 dias na janela de 12 meses. Com
  // `useMemo`, a conta acontece quando o filtro muda, e não a cada render que o
  // relógio de revalidação da tela provoca.
  const pontos = useMemo(() => conversaoDiaria(dados, janela),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dados, meses]);
  const marcos = useMemo(() => marcosConversao(pontos), [pontos]);
  const resumo = useMemo(() => resumoConversao(pontos), [pontos]);

  const semana = useMemo(() => porDiaDaSemana(dados, janela),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dados, meses]);
  const destaques = useMemo(() => destaquesDaSemana(semana), [semana]);

  const desvios = useMemo(() => clientesForaDoPadrao(dados, meses),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dados, meses]);
  const cairam = desvios.filter(c => c.direcao === "caiu").slice(0, LIMITE_CLIENTES);
  const cresceram = desvios.filter(c => c.direcao === "cresceu").slice(0, LIMITE_CLIENTES);

  const maiorFechaPorDia = Math.max.apply(null,
    semana.map(l => l.fechadosPorOcorrencia).concat([0])) || 1;

  const colunasSemana: ColunaTabela<LinhaDiaSemana>[] = [
    {
      chave: "dia", rotulo: "Dia", largura: "1.1fr",
      render: l => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700,
                        color: l.dia === 0 || l.dia === 6 ? "#8AA9C6" : "#FFFFFF" }}>
            {isMobile ? l.curto : l.rotulo}
          </div>
          <div style={{ fontSize: 10, color: "#8AA9C6", marginTop: 2 }}>
            {l.ocorrencias}× no período
          </div>
        </div>
      ),
    },
    {
      chave: "fecha", rotulo: "Fechamentos por dia desses", largura: "1.6fr", alinha: "left",
      dica: "Negócios fechados naquele dia da semana ÷ quantas vezes o dia ocorreu na janela",
      render: l => (
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ flex: 1, minWidth: 40, height: 7, borderRadius: 4,
                        background: "rgba(126,176,219,0.10)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 4,
                          width: `${Math.min((l.fechadosPorOcorrencia / maiorFechaPorDia) * 100, 100)}%`,
                          background: l.dia === 0 || l.dia === 6 ? "#7E9DBB" : VERDE }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF", minWidth: 30,
                         textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {umaCasa(l.fechadosPorOcorrencia)}
          </span>
        </div>
      ),
    },
    { chave: "total", rotulo: "Fechados", largura: "84px", alinha: "right",
      dica: "Total bruto do período — é o que a coluna anterior divide pelas ocorrências",
      render: l => <Num v={l.fechados} cor={VERDE} forte /> },
    { chave: "conv", rotulo: "Conversão", largura: "92px", alinha: "right",
      dica: "Fechados ÷ decididos NAQUELE dia da semana",
      render: l => (
        <span title={l.conversao === null ? "Nada decidido neste dia da semana"
                     : `${l.fechados} de ${l.fechados + l.perdidos} decididos`}>
          <Num v={pct(l.conversao)} />
        </span>
      ) },
    { chave: "valor", rotulo: "Aprovado por dia", largura: "1.2fr", alinha: "right",
      dica: "Valor aprovado naquele dia da semana ÷ ocorrências do dia",
      render: l => <Num v={l.aprovadoPorOcorrencia > 0 ? brl(l.aprovadoPorOcorrencia, 0) : "—"}
                        cor="#83DDA8" /> },
    { chave: "leads", rotulo: "Leads por dia", largura: "104px", alinha: "right",
      dica: "Empresas cadastradas naquele dia da semana ÷ ocorrências do dia",
      render: l => <Num v={umaCasa(l.leadsPorOcorrencia)} /> },
    { chave: "ativ", rotulo: "Compromissos", largura: "108px", alinha: "right",
      dica: "Compromissos da agenda naquele dia da semana, no período inteiro",
      render: l => <Num v={l.atividades} /> },
  ];

  return (
    <>
      <Secao>Como a conversão se formou, dia a dia</Secao>
      <Bloco>
        <TituloBloco icone={LineChart} cor={VERDE} titulo="Conversão acumulada"
          sub="Cada ponto é a conversão do período ATÉ aquele dia — o último ponto é o número grande da Visão geral" />
        <CurvaConversao pontos={pontos} marcos={marcos} />

        {resumo.frases.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {resumo.frases.map((f, i) => (
              <p key={i} style={{ fontSize: 12.5, lineHeight: 1.5,
                                  color: i === 0 ? "#DCE9F5" : "#B6CFE4" }}>
                {f}
              </p>
            ))}
          </div>
        )}

        <Nota cor={AZUL}>
          Acumulada, e não a taxa de cada dia: num dia isolado a conversão é 0% ou 100% — decide-se
          um negócio, e ele fecha ou se perde. O que a curva mostra é diferente disso: ela SOBE
          quando o desfecho novo é melhor que a média do que já estava na conta, e fica parada
          quando é igual. Curva plana no fim do período com a faixa de baixo vazia não é
          estabilidade — é funil sem decidir nada.
        </Nota>
      </Bloco>

      <Secao>Quando se vende, de forma recorrente</Secao>
      <Bloco>
        <TituloBloco icone={CalendarRange} cor={LARANJA} titulo="Padrão por dia da semana"
          sub={`${destaques.fechamentos} ${destaques.fechamentos === 1 ? "fechamento" : "fechamentos"} no período, distribuídos pelos dias`} />

        {destaques.confiavel && destaques.melhor && destaques.pior && (
          <div style={{ display: "grid", gap: 10, marginBottom: 14,
                        gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))" }}>
            <CaixaDia rotulo="Melhor dia útil" dia={destaques.melhor.rotulo} cor={VERDE}
              detalhe={`${umaCasa(destaques.melhor.fechadosPorOcorrencia)} fechamentos por ocorrência`} />
            <CaixaDia rotulo="Pior dia útil" dia={destaques.pior.rotulo} cor={VERMELHO}
              detalhe={`${umaCasa(destaques.pior.fechadosPorOcorrencia)} fechamentos por ocorrência`} />
            {destaques.melhorEmValor && (
              <CaixaDia rotulo="Dia do dinheiro" dia={destaques.melhorEmValor.rotulo} cor="#83DDA8"
                detalhe={`${brl(destaques.melhorEmValor.aprovadoPorOcorrencia, 0)} aprovados por ocorrência`} />
            )}
          </div>
        )}

        <Tabela colunas={colunasSemana} linhas={semana} chaveDe={l => String(l.dia)}
          larguraMinima={880}
          vazio="Nenhum dia da janela tem registro ainda." />

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {destaques.frases.map((f, i) => (
            <p key={i} style={{ fontSize: 12.5, lineHeight: 1.5,
                                color: i === 0 ? "#DCE9F5" : "#B6CFE4" }}>{f}</p>
          ))}
        </div>

        <Nota>
          A comparação entre linhas é sempre <strong style={{ color: "#DCE9F5" }}>por ocorrência</strong>,
          nunca pelo total bruto. Seis meses costumam ter 27 segundas e 26 terças, e comparar os
          brutos premiaria a segunda por existir uma vez a mais — o “melhor dia da semana” viraria
          um fato sobre o calendário, não sobre o time.
        </Nota>
      </Bloco>

      <Secao>Clientes fora do próprio padrão</Secao>
      <Nota cor={AZUL}>
        A referência de cada cliente é <strong style={{ color: "#DCE9F5" }}>ele mesmo</strong>, no
        período anterior de igual tamanho ({rotuloJanela(anterior)}), e não a média da base — comparar
        um cliente grande com a média só diria que ele é grande. Só entra quem comprou nas DUAS
        janelas: quem não comprava antes é cliente novo, não crescimento, e dividir por zero viraria
        “+∞%”. Variação abaixo de 15% fica de fora por ser ruído de calendário.
      </Nota>

      <Grade isMobile={isMobile} colunas={1}>
        <Bloco>
          <TituloBloco icone={TrendingDown} cor={VERMELHO} titulo="Compraram menos que o normal"
            sub="Ordenado pelo tamanho da queda em dinheiro — não em porcentagem, que colocaria o cliente pequeno no topo" />
          {cairam.length === 0
            ? <VazioBloco texto="Nenhum cliente com histórico nas duas janelas comprou menos neste período." />
            : <TabelaDesvio linhas={cairam} isMobile={isMobile} />}
          {cairam.length > 0 && (
            <Nota>
              A coluna <strong style={{ color: "#DCE9F5" }}>Por quê</strong> é aritmética, não
              suposição: a diferença sempre se abre em exatamente duas parcelas — comprou menos
              VEZES (quantidade) ou comprou mais BARATO (ticket) —, e as duas somam a queda inteira.
              A distinção decide a ação: quantidade é follow-up sumido, ticket é preço. A evidência
              ao lado (recusa registrada, proposta em aberto, dias sem contato) é registro do
              período, não interpretação.
            </Nota>
          )}
        </Bloco>

        <Bloco>
          <TituloBloco icone={TrendingUp} cor={VERDE} titulo="Compraram mais que o normal"
            sub="A mesma conta na outra direção — é onde se descobre o que deu certo antes de ser sorte" />
          {cresceram.length === 0
            ? <VazioBloco texto="Nenhum cliente com histórico nas duas janelas comprou mais neste período." />
            : <TabelaDesvio linhas={cresceram} isMobile={isMobile} />}
          {cresceram.length > 0 && (
            <Nota cor={VERDE}>
              Crescer por <strong style={{ color: "#DCE9F5" }}>quantidade</strong> e crescer por{" "}
              <strong style={{ color: "#DCE9F5" }}>ticket</strong> se repetem de formas diferentes: o
              primeiro é cadência de contato, que dá para copiar para outra carteira; o segundo pode
              ser uma compra grande isolada, que não volta sozinha no mês seguinte. Ler os dois como
              “cresceu” embute a segunda na meta do próximo período.
            </Nota>
          )}
        </Bloco>
      </Grade>

      {desvios.length === 0 && (
        <Nota>
          Nenhum cliente aparece nos dois blocos acima. Com a base ainda nova, é o esperado: a
          comparação exige compra registrada nas duas janelas, e a maioria dos clientes só tem
          histórico em uma. O bloco se preenche sozinho conforme o segundo ciclo de compra for
          acontecendo.
        </Nota>
      )}
    </>
  );
}

function rotuloJanela(j: { inicio: Date; fim: Date }) {
  const f = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  return `${f(j.inicio)}–${f(j.fim)}`;
}

function CaixaDia({ rotulo, dia, detalhe, cor }: {
  rotulo: string; dia: string; detalhe: string; cor: string;
}) {
  return (
    <div style={{ background: "rgba(126,176,219,0.05)", borderRadius: 11,
                  border: "1px solid rgba(126,176,219,0.14)", padding: "12px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#B6CFE4", letterSpacing: "0.08em",
                    textTransform: "uppercase" }}>{rotulo}</div>
      <div style={{ fontSize: 19, fontWeight: 900, color: cor, marginTop: 4 }}>{dia}</div>
      <div style={{ fontSize: 11, color: "#8AA9C6", marginTop: 2 }}>{detalhe}</div>
    </div>
  );
}

/**
 * A tabela dos desvios, igual para queda e para alta.
 *
 * Uma tabela só, com a cor saindo da direção do número: duas implementações
 * quase iguais divergiriam na primeira alteração, e a diferença entre "caiu" e
 * "cresceu" é de sinal, não de conteúdo.
 */
function TabelaDesvio({ linhas, isMobile }: { linhas: DesvioCliente[]; isMobile: boolean }) {
  const colunas: ColunaTabela<DesvioCliente>[] = [
    {
      chave: "nome", rotulo: "Cliente", largura: "1.6fr",
      render: c => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#FFFFFF", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.nome}>
            {c.nome}
          </div>
          <div style={{ fontSize: 10, color: "#8AA9C6", marginTop: 2, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.segmento || "sem segmento"}
          </div>
        </div>
      ),
    },
    { chave: "antes", rotulo: "Normalmente", largura: "1.1fr", alinha: "right",
      dica: "Valor aprovado deste cliente no período anterior de igual tamanho",
      render: c => (
        <div>
          <Num v={brl(c.referencia, 0)} />
          <div style={{ fontSize: 10, color: "#8AA9C6", marginTop: 2 }}>
            {c.propostasRef}× · {c.ticketRef !== null ? brl(c.ticketRef, 0) : "—"}
          </div>
        </div>
      ) },
    { chave: "agora", rotulo: "Agora", largura: "1.1fr", alinha: "right",
      dica: "Valor aprovado no período selecionado, com quantidade e ticket",
      render: c => (
        <div>
          <Num v={brl(c.atual, 0)} cor="#FFFFFF" forte />
          <div style={{ fontSize: 10, color: "#8AA9C6", marginTop: 2 }}>
            {c.propostasAtual}× · {c.ticketAtual !== null ? brl(c.ticketAtual, 0) : "—"}
          </div>
        </div>
      ) },
    { chave: "delta", rotulo: "Diferença", largura: "1.1fr", alinha: "right",
      render: c => {
        const cor = c.delta < 0 ? VERMELHO : VERDE;
        return (
          <div>
            <span style={{ fontSize: 13, fontWeight: 800, color: cor,
                           fontVariantNumeric: "tabular-nums" }}>
              {c.delta > 0 ? "▲" : "▼"} {brl(Math.abs(c.delta), 0)}
            </span>
            <div style={{ fontSize: 10, color: cor, marginTop: 2 }}>
              {c.deltaPct > 0 ? "+" : "−"}{umaCasa(Math.abs(c.deltaPct))}%
            </div>
          </div>
        );
      } },
    {
      chave: "causa", rotulo: "Por quê", largura: "1.5fr", alinha: "left",
      dica: "A diferença aberta nas duas parcelas que a somam exatamente: quantidade × ticket",
      render: c => (
        <div style={{ fontSize: 11, lineHeight: 1.5 }}>
          <div style={{ color: "#DCE9F5", fontWeight: 700 }}>
            {c.causa === "quantidade" ? "Comprou menos vezes"
              : c.causa === "ticket" ? "Ticket mudou"
              : "Quantidade e ticket"}
            {c.direcao === "cresceu" && c.causa === "quantidade" ? " (mais vezes)" : ""}
          </div>
          <div style={{ color: "#8AA9C6" }}>
            quantidade {sinal(c.porQuantidade)} · ticket {sinal(c.porTicket)}
          </div>
        </div>
      ),
    },
    {
      chave: "evid", rotulo: "Evidência no período", largura: "1.7fr", alinha: "left",
      dica: "O que ficou registrado: recusa com motivo, proposta ainda em aberto e tempo sem contato",
      render: c => (
        <div style={{ fontSize: 11, lineHeight: 1.5, minWidth: 0 }}>
          {c.recusado > 0 && (
            <div style={{ color: VERMELHO, overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: "nowrap" }}
                 title={c.motivoRecusa || undefined}>
              {brl(c.recusado, 0)} recusados{c.motivoRecusa ? ` — ${c.motivoRecusa}` : " (sem motivo registrado)"}
            </div>
          )}
          {c.aberto > 0 && (
            <div style={{ color: LARANJA }}>{brl(c.aberto, 0)} ainda em aberto</div>
          )}
          <div style={{ color: c.diasSemContato >= 30 ? LARANJA : "#8AA9C6" }}>
            {c.diasSemContato === Infinity
              ? "nenhum contato registrado"
              : `${c.diasSemContato} ${c.diasSemContato === 1 ? "dia" : "dias"} sem contato`}
          </div>
          {c.recusado === 0 && c.aberto === 0 && c.diasSemContato < 30 && (
            <div style={{ color: "#7E9DBB" }}>nada recusado nem parado</div>
          )}
        </div>
      ),
    },
  ];

  return (
    <Tabela colunas={colunas} linhas={linhas} chaveDe={c => c.empresa_id}
      larguraMinima={isMobile ? 940 : 940}
      vazio="Nenhum cliente fora do padrão." />
  );
}

/** Parcela da decomposição, com sinal explícito — "−R$ 12.000". */
function sinal(v: number): string {
  if (Math.abs(v) < 1) return "R$ 0";
  return `${v > 0 ? "+" : "−"}${brl(Math.abs(v), 0)}`;
}
