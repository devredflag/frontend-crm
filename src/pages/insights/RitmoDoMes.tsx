/**
 * O ritmo DENTRO do mês, para o balão do gráfico de evolução.
 *
 * O gráfico de ritmo do funil é mensal, e o mês esconde justamente aquilo que
 * diz se o time está reagindo agora: um mês que fechou igual ao anterior pode
 * ter começado devagar e acelerado, ou o contrário — e as duas leituras pedem
 * decisões opostas. Passar o mouse passou a responder isso.
 *
 * ── Por que barras minúsculas, e não uma linha ─────────────────────────────
 * A contagem diária de um CRM deste tamanho é quase toda zero. Uma linha ligaria
 * os dias vazios num zigue-zague que parece sinal e não é; a barra deixa o dia
 * sem nada visivelmente vazio, que é a leitura honesta. Elas não têm eixo de
 * propósito: aqui o que se lê é ONDE o mês teve massa, não quanto teve em cada
 * dia — o número por dia e as duas metades estão escritos ao lado.
 *
 * ── A direção não é opinião ────────────────────────────────────────────────
 * "Acelerando" e "desacelerando" saem de `ritmoDoMes`, que só afirma direção
 * com amostra suficiente e devolve `null` no resto. Quando é `null`, aqui não
 * se escreve nada — inventar a palavra é o modo mais rápido de um painel
 * perder a confiança de quem o lê.
 */

import type { RitmoMes, Serie } from "../../utils/metricas";

const VERDE = "#2CCD93", VERMELHO = "#F87171", NEUTRO = "#B6CFE4";

const umaCasa = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/**
 * Cor da direção, decidida pela série e não pela seta.
 *
 * `subirEBom` existe porque "negócios perdidos acelerando" é notícia ruim com a
 * mesma seta para cima. Pintar toda alta de verde diria que piorar é melhorar.
 */
function corDirecao(r: RitmoMes, subirEBom: boolean): string {
  if (r.direcao === null || r.direcao === "estável") return NEUTRO;
  const bom = (r.direcao === "acelerando") === subirEBom;
  return bom ? VERDE : VERMELHO;
}

function palavra(r: RitmoMes): string {
  if (r.direcao === null) return "";
  if (r.direcao === "estável") return "constante";
  return r.direcao;
}

/** As barras do mês, uma por dia decorrido. Sem eixo: é forma, não medida. */
function BarrasDoDia({ porDia, cor }: { porDia: number[]; cor: string }) {
  const max = Math.max.apply(null, porDia.concat([0]));
  const n = Math.max(porDia.length, 1);
  const largura = 100 / n;
  return (
    <svg viewBox="0 0 100 18" preserveAspectRatio="none" aria-hidden="true"
         style={{ width: 104, height: 18, display: "block", flexShrink: 0 }}>
      {/* Linha de base: sem ela, um mês inteiro sem nada some e parece defeito. */}
      <line x1="0" y1="17.4" x2="100" y2="17.4" stroke="rgba(126,176,219,0.28)"
            strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {porDia.map((v, i) => {
        if (v <= 0) return null;
        const h = max > 0 ? Math.max((v / max) * 15, 2) : 0;
        return (
          <rect key={i} x={i * largura + largura * 0.15} y={17 - h}
                width={Math.max(largura * 0.7, 0.6)} height={h} fill={cor} rx="0.3" />
        );
      })}
    </svg>
  );
}

/**
 * Um bloco de ritmo por série, para ser embutido no balão do gráfico.
 *
 * Recebe as séries junto com o ritmo já calculado: quem calcula é a aba, que
 * guarda o resultado por mês em cache — refazer trinta contagens diárias a cada
 * quadro da varredura travaria o cursor.
 */
export default function RitmoDoMes({ itens }: {
  itens: { serie: Serie; ritmo: RitmoMes }[];
}) {
  const algum = itens.filter(i => i.ritmo.dias > 0)[0];
  if (!algum) return null;
  const { dias, parcial } = algum.ritmo;

  return (
    <div style={{ marginTop: 8, paddingTop: 7, borderTop: "1px solid rgba(126,176,219,0.18)" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#B6CFE4", letterSpacing: "0.06em",
                    textTransform: "uppercase", marginBottom: 5 }}>
        Dentro do mês · {dias} {dias === 1 ? "dia" : "dias"}{parcial ? " até hoje" : ""}
      </div>

      {itens.map(({ serie, ritmo }) => {
        const cor = corDirecao(ritmo, serie.subirEBom !== false);
        const texto = palavra(ritmo);
        return (
          <div key={serie.chave}
               style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <BarrasDoDia porDia={ritmo.porDia} cor={ritmo.total ? serie.cor : "#7E9DBB"} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "#DCE9F5", whiteSpace: "nowrap" }}>
                <strong style={{ color: "#FFFFFF" }}>{umaCasa(ritmo.media)}</strong>
                <span style={{ color: "#8AA9C6" }}>/dia</span>
                {texto && (
                  <span style={{ color: cor, fontWeight: 700, marginLeft: 6 }}>
                    {ritmo.direcao === "acelerando" ? "▲" : ritmo.direcao === "desacelerando" ? "▼" : "="}
                    {" "}{texto}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: "#8AA9C6", whiteSpace: "nowrap" }}>
                {ritmo.total === 0
                  ? "nenhum dia com registro"
                  : <>1ª metade {ritmo.primeiraMetade} · 2ª {ritmo.segundaMetade}
                     {ritmo.variacao !== null && Math.abs(ritmo.variacao) >= 0.05 && (
                       <span style={{ color: cor }}>
                         {" "}({ritmo.variacao > 0 ? "+" : "−"}{umaCasa(Math.abs(ritmo.variacao) * 100)}%)
                       </span>
                     )}</>}
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ fontSize: 9.5, color: "#7E9DBB", marginTop: 4, maxWidth: 260,
                    whiteSpace: "normal", lineHeight: 1.35 }}>
        {/* A regra fica escrita: sem ela, "acelerando" parece um veredito do
            sistema em vez de uma conta que o leitor pode refazer. */}
        A palavra compara a 2ª metade do mês com a 1ª. Só aparece com amostra
        suficiente — mês de poucos registros fica sem direção de propósito.
      </div>
    </div>
  );
}
