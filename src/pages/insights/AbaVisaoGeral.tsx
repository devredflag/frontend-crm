/**
 * Aba 1 — Visão geral.
 *
 * Responde "estamos melhorando?". As seis caixas dão o retrato do período com
 * o Δ contra o anterior; o gráfico grande abre a caixa que estiver escolhida
 * mês a mês; os dois gráficos seguintes mostram as métricas que se explicam
 * juntas — o ritmo do funil e o dinheiro que entrou contra o que saiu.
 */

import { Activity, Banknote, Bell, Gauge } from "lucide-react";

import type { Balde, Dados, Filtro, KpiCalculado } from "../../utils/metricas";
import {
  KPIS, alertasDeAtencao, janelaMeses, serieKpi, serieMensal, valorAprovado, valorPerdido,
} from "../../utils/metricas";
import GraficoLinhas from "./GraficoLinhas";
import GraficoDivergente from "./GraficoDivergente";
import { Bloco, CaixaKpi, Grade, Nota, Secao, TituloBloco } from "./pecas";

export default function AbaVisaoGeral({
  dados, filtro, kpis, baldes, comparar, rotuloAnterior, isMobile, escolhido, aoEscolher,
}: {
  dados: Dados;
  filtro: Filtro;
  kpis: KpiCalculado[];
  baldes: Balde[];
  comparar: boolean;
  rotuloAnterior: string;
  isMobile: boolean;
  /** Chave do KPI que comanda o gráfico grande. */
  escolhido: string;
  aoEscolher: (chave: string) => void;
}) {
  const { meses } = filtro;
  const def = KPIS.filter(k => k.chave === escolhido)[0] || KPIS[0];
  const serieEscolhida = serieKpi(def, dados, meses);

  // O ritmo do funil: três contagens, uma unidade, um eixo. É onde se enxerga
  // o gargalo — se os leads sobem e as propostas não acompanham, o problema
  // está entre captar e propor, e nenhuma das duas curvas sozinha diria isso.
  const ritmo = [
    serieMensal("leads", "Leads captados", "#56A4F5", dados, meses, new Date(), comparar),
    serieMensal("propostas", "Propostas enviadas", "#F0A05A", dados, meses, new Date(), comparar),
    serieMensal("fechados", "Negócios fechados", "#2CCD93", dados, meses, new Date(), comparar),
  ];

  const ganhos = baldes.map(b => valorAprovado(dados, b).valor ?? 0);
  const perdas = baldes.map(b => valorPerdido(dados, b).valor ?? 0);

  const alertas = alertasDeAtencao(dados);
  const janela = janelaMeses(meses);

  return (
    <>
      <Secao>Indicadores do período</Secao>
      <div style={{ display: "grid", gap: 14,
                    gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,minmax(0,1fr))" }}>
        {kpis.map(k => (
          <CaixaKpi key={k.def.chave} k={k} ativo={k.def.chave === escolhido}
                    aoClicar={() => aoEscolher(k.def.chave)} />
        ))}
      </div>
      <Nota cor="#56A4F5">
        Cada caixa mostra o denominador que usou — taxa e amostra andam juntas, porque meta cravada
        sobre três negócios não é meta. Passe o mouse para ver como o número é calculado, e
        <strong style={{ color: "#DCE9F5" }}> clique</strong> para abrir o indicador mês a mês no gráfico abaixo.
      </Nota>

      <Secao>Evolução do indicador escolhido</Secao>
      <Bloco>
        <TituloBloco icone={Gauge} cor={def.cor} titulo={def.rotulo}
          sub={comparar
            ? `Mês a mês no período, com ${rotuloAnterior} sobreposto`
            : "Mês a mês no período — ligue “Comparar” para sobrepor o período anterior"} />
        <GraficoLinhas series={[serieEscolhida]} baldes={baldes}
          moeda={def.formato === "moeda"} mostrarAnterior={comparar}
          rotuloAnterior={rotuloAnterior}
          vazio={`Nenhum registro de “${def.rotulo.toLowerCase()}” neste período.`} />
        {def.formato === "pct" && (
          <Nota>
            Cada ponto é a taxa daquele mês isolado, não do acumulado. Mês com pouca amostra
            oscila muito — o número grande da caixa, que usa o período inteiro, é o mais confiável
            para cravar meta.
          </Nota>
        )}
        {!def.comparavel && (
          <Nota>
            Este indicador não tem histórico guardado: o sistema conhece só o valor de hoje.
            A curva mostra o retrato atual repetido no tempo, não a evolução real — por isso
            ele também não tem Δ na caixa.
          </Nota>
        )}
      </Bloco>

      <Secao>Métricas que se explicam juntas</Secao>
      <Bloco>
        <TituloBloco icone={Activity} cor="#56A4F5" titulo="Ritmo do funil"
          sub="Leads captados, propostas enviadas e negócios fechados na mesma escala — o vão entre as curvas é o gargalo" />
        <GraficoLinhas series={ritmo} baldes={baldes} mostrarAnterior={comparar}
          rotuloAnterior={rotuloAnterior}
          vazio="Nenhum lead, proposta ou fechamento neste período." />
        <Nota>
          As três contam a mesma unidade, por isso dividem um eixo. Dinheiro fica no gráfico
          abaixo: duas escalas no mesmo desenho fariam o alinhamento entre elas inventar uma
          relação que não está no dado.
        </Nota>
      </Bloco>

      <Bloco>
        <TituloBloco icone={Banknote} cor="#2CCD93" titulo="Dinheiro que entrou e que saiu"
          sub="Valor aprovado contra valor recusado, mês a mês — a diferença é o saldo do período" />
        <GraficoDivergente baldes={baldes} ganhos={ganhos} perdas={perdas}
          vazio="Nenhuma proposta decidida neste período." />
        <Nota>
          Ganho sobe e perda desce: a direção já diz o sinal, então a leitura não depende de
          distinguir verde de vermelho. Só entra proposta com decisão registrada — o que está
          em aberto é a caixa “Pipeline em aberto”, não perda.
        </Nota>
      </Bloco>

      <Secao>Fila de cobrança</Secao>
      <Grade isMobile={isMobile} colunas={1}>
        <Bloco>
          <TituloBloco icone={Bell} cor="#F0A05A" titulo="Precisam de atenção"
            sub="Retrato de hoje, não do período — cobrança é sobre o que está pendente agora" />
          <div style={{ display: "grid", gap: 10,
                        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,minmax(0,1fr))" }}>
            {alertas.map(a => (
              <div key={a.chave}
                   style={{ background: "rgba(126,176,219,0.05)", borderRadius: 11,
                            border: "1px solid rgba(126,176,219,0.14)", padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                                 background: a.valor > 0 ? a.cor : "rgba(126,176,219,0.35)" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF", minWidth: 0,
                                 overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.titulo}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 17, fontWeight: 900,
                                 color: a.valor > 0 && a.ruim ? a.cor : "#FFFFFF" }}>
                    {a.valor}
                  </span>
                </div>
                <div style={{ fontSize: 10.5, color: "#8AA9C6", marginTop: 4 }}>{a.sub}</div>
              </div>
            ))}
          </div>
          <Nota>
            Conta só empresa ainda no funil — fechada, perdida e rascunho não têm follow-up a
            cobrar, e incluí-las derrubaria os números sem ninguém ter errado nada.
          </Nota>
        </Bloco>
      </Grade>

      {/* Aviso honesto quando o período escolhido é pequeno demais para
          sustentar as taxas. Sem ele, "sem base" em várias caixas parece
          defeito da tela em vez de janela curta. */}
      {kpis.filter(k => k.atual.valor === null).length >= 3 && (
        <Nota>
          Vários indicadores estão sem base em {rotuloAnteriorCurto(janela)}. Não é falha da tela:
          não houve amostra suficiente nesta janela. Amplie o período para 12 meses.
        </Nota>
      )}
    </>
  );
}

function rotuloAnteriorCurto(j: { inicio: Date; fim: Date }) {
  const f = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  return `${f(j.inicio)}–${f(j.fim)}`;
}
