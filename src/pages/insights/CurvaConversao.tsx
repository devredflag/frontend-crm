/**
 * A taxa de conversão se formando, dia a dia.
 *
 * O gráfico mensal responde "em que mês foi melhor". Este responde outra coisa:
 * COMO a taxa chegou onde chegou. Cada ponto é a conversão do período até
 * aquele dia, então a curva é a própria história do número — e o último ponto é
 * exatamente o valor grande do card, o que dá para conferir a olho.
 *
 * ── Por que acumulada, e não a taxa de cada dia ────────────────────────────
 * A taxa de um dia isolado neste CRM é 0% ou 100% na quase totalidade dos dias:
 * decide-se um negócio, e ele fecha ou se perde. Desenhar isso daria uma
 * serrilha entre o piso e o teto, que parece muito sinal e não é nenhum. A
 * acumulada tem a propriedade que a leitura pede: ela se move quando o negócio
 * novo é diferente da média do que já havia, e fica parada quando é igual.
 *
 * ── As duas metades do desenho ─────────────────────────────────────────────
 * Em cima, a taxa. Embaixo, os desfechos do dia como colunas divergentes —
 * fechado sobe, perdido desce. São separados porque medem coisas diferentes
 * (uma porcentagem e uma contagem) e juntá-los num eixo só inventaria uma
 * relação de escala que não existe. A faixa de baixo é o que explica os degraus
 * de cima: onde a curva pula, ali embaixo há uma coluna.
 *
 * A divergência também resolve cor: verde `#2CCD93` e vermelho `#F87171` ficam
 * a ΔE 5,2 sob deuteranopia — a mesma cor para parte dos usuários. Com ganho
 * subindo e perda descendo, a DIREÇÃO carrega o sinal e a cor vira reforço.
 */

import { useState } from "react";

import useIsMobile from "../../hooks/useIsMobile";
import type { MarcoConversao, PontoConversaoDia } from "../../utils/metricas";
import { posicaoNoViewBox } from "./pecas";
import { VazioBloco } from "./pecas";

const VERDE = "#2CCD93", VERMELHO = "#F87171";
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const umaCasa = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/**
 * Teto do eixo da taxa.
 *
 * Começa sempre em zero — porcentagem com eixo truncado é o jeito mais barato
 * de transformar uma variação de três pontos numa montanha. O teto sobe em
 * degraus de 20 para a curva não ficar espremida no rodapé quando a conversão
 * da conta é baixa.
 */
function tetoDaTaxa(pontos: PontoConversaoDia[]): number {
  let max = 0;
  pontos.forEach(p => { if (p.taxaAcum !== null && p.taxaAcum > max) max = p.taxaAcum; });
  return Math.min(100, Math.max(20, Math.ceil(max / 20) * 20));
}

export default function CurvaConversao({ pontos, marcos }: {
  pontos: PontoConversaoDia[];
  marcos: MarcoConversao[];
}) {
  const isMobile = useIsMobile();
  const [ativo, setAtivo] = useState<number | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);

  const n = pontos.length;
  const comTaxa = pontos.filter(p => p.taxaAcum !== null);
  if (n === 0 || comTaxa.length === 0) {
    return <VazioBloco texto="Nenhum negócio foi fechado nem perdido neste período — sem desfecho não há taxa para acompanhar." />;
  }

  // ── geometria ──
  const W = 720, L = 44, R = 14, T = 16;
  const hTaxa = 158, vao = 12, hFaixa = 48, B = 26;
  const H = T + hTaxa + vao + hFaixa + B;
  const pw = W - L - R;
  const topo = tetoDaTaxa(pontos);
  const x = (i: number) => L + (i * pw) / Math.max(n - 1, 1);
  const y = (v: number) => T + (1 - v / topo) * hTaxa;
  const meioFaixa = T + hTaxa + vao + hFaixa / 2;

  const maiorDia = pontos.reduce(
    (m, p) => Math.max(m, p.fechadosDia, p.perdidosDia), 0) || 1;
  const alturaDia = (q: number) => (q / maiorDia) * (hFaixa / 2 - 3);
  const larguraColuna = Math.max(pw / Math.max(n, 1) * 0.7, 0.8);

  // Marcas do eixo Y: 0, meio e topo. Três linhas bastam para ler porcentagem,
  // e mais do que isso vira grade sobre uma curva já detalhada.
  const marcasY = [0, topo / 2, topo];

  /**
   * Caminho da curva, começando no primeiro dia COM taxa.
   *
   * Antes da primeira decisão não há valor — e desenhar zero ali afirmaria
   * "converteu nada" onde o certo é "nada foi decidido ainda". Depois disso a
   * curva é contínua por construção: o acumulado existe em todo dia seguinte.
   */
  const coordenadas: string[] = [];
  pontos.forEach((p, i) => {
    if (p.taxaAcum !== null) coordenadas.push(`${x(i)},${y(p.taxaAcum)}`);
  });
  const caminho = coordenadas
    .map((c, k) => (k === 0 ? `M${c}` : `L${c}`))
    .join(" ");

  const primeiroComTaxa = pontos.findIndex(p => p.taxaAcum !== null);

  // Divisas de mês: a única âncora temporal possível num eixo de 180 dias, onde
  // rotular dia a dia seria ilegível e rotular só as pontas não localizaria nada.
  const divisas: { i: number; rotulo: string }[] = [];
  pontos.forEach((p, i) => {
    if (i === 0 || p.data.getDate() === 1) {
      divisas.push({ i, rotulo: `${MESES_CURTOS[p.data.getMonth()]}` });
    }
  });

  const marcados: Record<number, MarcoConversao> = {};
  marcos.forEach(m => {
    const i = pontos.findIndex(p => p.data.getTime() === m.data.getTime());
    if (i >= 0) marcados[i] = m;
  });

  const varrer = (clientX: number, svg: SVGSVGElement | null) => {
    if (!svg) return;
    const vx = posicaoNoViewBox(clientX, svg.getBoundingClientRect(), W, L, R);
    if (vx === null) return;
    setCursor(vx);
    const passo = pw / Math.max(n - 1, 1);
    setAtivo(Math.min(Math.max(Math.round((vx - L) / passo), 0), n - 1));
  };
  const sair = () => { setCursor(null); setAtivo(null); };

  const p = ativo === null ? null : pontos[ativo];

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10, fontSize: 11.5 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#DCE9F5" }}>
          <span style={{ width: 9, height: 3, borderRadius: 2, background: VERDE }} />
          Conversão acumulada até o dia
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#8AA9C6" }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: VERDE }} />
          fechado no dia (sobe)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#8AA9C6" }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: VERMELHO }} />
          perdido no dia (desce)
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}
           role="img"
           onMouseMove={e => varrer(e.clientX, e.currentTarget)}
           onMouseLeave={sair}
           onTouchStart={e => varrer(e.touches[0].clientX, e.currentTarget)}
           onTouchMove={e => varrer(e.touches[0].clientX, e.currentTarget)}
           onTouchEnd={sair}
           aria-label={`Conversão acumulada de ${comTaxa[0].rotulo} a ${comTaxa[comTaxa.length - 1].rotulo}: `
             + `de ${umaCasa(comTaxa[0].taxaAcum as number)}% para `
             + `${umaCasa(comTaxa[comTaxa.length - 1].taxaAcum as number)}% sobre `
             + `${comTaxa[comTaxa.length - 1].decididosAcum} negócios decididos.`}>

        {marcasY.map(m => (
          <g key={m}>
            <line x1={L} x2={W - R} y1={y(m)} y2={y(m)} stroke="rgba(126,176,219,0.13)" strokeWidth="1" />
            <text x={L - 7} y={y(m) + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="#8AA9C6"
                  style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(m)}%</text>
          </g>
        ))}

        {/* Divisa de mês atravessa as duas metades: é a mesma linha do tempo, e
            duas grades independentes fariam procurar a correspondência a olho. */}
        {divisas.map(dv => (
          <g key={`dv-${dv.i}`}>
            <line x1={x(dv.i)} x2={x(dv.i)} y1={T} y2={meioFaixa + hFaixa / 2}
                  stroke="rgba(126,176,219,0.10)" strokeWidth="1" />
            <text x={x(dv.i) + 3} y={H - 8} fontSize="10" fontWeight="700" fill="#8AA9C6">
              {dv.rotulo}
            </text>
          </g>
        ))}

        {/* Área sob a curva: uma série só, sem buraco depois que nasce — o
            preenchimento não tem como fechar por cima de vão nenhum. */}
        <defs>
          <linearGradient id="area-conversao" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VERDE} stopOpacity="0.22" />
            <stop offset="100%" stopColor={VERDE} stopOpacity="0" />
          </linearGradient>
        </defs>
        {primeiroComTaxa >= 0 && (
          <path fill="url(#area-conversao)"
                d={`${caminho} L${x(n - 1)},${T + hTaxa} L${x(primeiroComTaxa)},${T + hTaxa} Z`} />
        )}
        <path d={caminho} fill="none" stroke={VERDE} strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />

        {/* Marcos: os dias em que a taxa realmente mexeu. Anel vazado para não
            competir com a linha; o nome de cada um está na lista abaixo. */}
        {Object.keys(marcados).map(k => {
          const i = Number(k);
          const v = pontos[i].taxaAcum;
          if (v === null) return null;
          return <circle key={`mc-${i}`} cx={x(i)} cy={y(v)} r="3.6" fill="#143354"
                         stroke={VERDE} strokeWidth="2" />;
        })}

        {/* Faixa dos desfechos do dia */}
        <line x1={L} x2={W - R} y1={meioFaixa} y2={meioFaixa}
              stroke="rgba(126,176,219,0.28)" strokeWidth="1" />
        {/* Só o dia COM desfecho vira nó: numa janela de 12 meses seriam 365
            grupos vazios no DOM para desenhar nada. */}
        {pontos.map((pt, i) => (pt.fechadosDia > 0 || pt.perdidosDia > 0) && (
          <g key={`d-${i}`}>
            {pt.fechadosDia > 0 && (
              <rect x={x(i) - larguraColuna / 2} y={meioFaixa - alturaDia(pt.fechadosDia)}
                    width={larguraColuna} height={alturaDia(pt.fechadosDia)} fill={VERDE} rx="0.5" />
            )}
            {pt.perdidosDia > 0 && (
              <rect x={x(i) - larguraColuna / 2} y={meioFaixa}
                    width={larguraColuna} height={alturaDia(pt.perdidosDia)} fill={VERMELHO} rx="0.5" />
            )}
          </g>
        ))}

        {cursor !== null && (
          <line x1={cursor} x2={cursor} y1={T} y2={meioFaixa + hFaixa / 2}
                stroke="rgba(126,176,219,0.45)" strokeWidth="1" />
        )}
        {ativo !== null && pontos[ativo].taxaAcum !== null && (
          <circle cx={x(ativo)} cy={y(pontos[ativo].taxaAcum as number)} r="4"
                  fill="#143354" stroke={VERDE} strokeWidth="2.2" />
        )}

        {/* Alvo de teclado por MÊS, não por dia: 180 paradas de Tab tornariam a
            navegação por teclado pior do que não ter nenhuma. Cada divisa leva
            ao primeiro dia do mês, e a leitura em voz alta traz o acumulado. */}
        {divisas.map(dv => (
          <rect key={`k-${dv.i}`} x={x(dv.i) - 4} y={T} width="8" height={hTaxa}
                fill="transparent" style={{ pointerEvents: "none" }} tabIndex={0} role="button"
                aria-label={`${dv.rotulo}, dia ${pontos[dv.i].rotulo}: ${
                  pontos[dv.i].taxaAcum === null ? "ainda sem desfecho"
                  : `${umaCasa(pontos[dv.i].taxaAcum as number)}% acumulados sobre ${pontos[dv.i].decididosAcum} decididos`}`}
                onFocus={() => { setAtivo(dv.i); setCursor(x(dv.i)); }}
                onBlur={sair} />
        ))}
      </svg>

      {p && (
        <div style={{
          position: "absolute", pointerEvents: "none", zIndex: 5, top: 24,
          left: `${((cursor ?? x(ativo as number)) / W) * 100}%`,
          transform: `translateX(${
            (cursor ?? 0) < W * 0.22 ? "0%" : (cursor ?? 0) > W * 0.78 ? "-100%" : "-50%"})`,
          transition: "left 0.08s linear",
          background: "#0A1F33", border: "1px solid rgba(126,176,219,0.30)", borderRadius: 9,
          padding: "8px 11px", fontSize: 12, whiteSpace: "nowrap", color: "#FFFFFF",
          boxShadow: "0 8px 24px rgba(3,14,26,0.55)",
        }}>
          <div style={{ color: "#B6CFE4", fontSize: 11, marginBottom: 5 }}>{p.rotulo}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#B6CFE4" }}>Conversão até aqui</span>
            <strong style={{ marginLeft: "auto", color: p.taxaAcum === null ? "#8AA9C6" : VERDE }}>
              {p.taxaAcum === null ? "sem desfecho ainda" : `${umaCasa(p.taxaAcum)}%`}
            </strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
            <span style={{ color: "#B6CFE4" }}>Sobre</span>
            <strong style={{ marginLeft: "auto" }}>
              {p.fechadosAcum} {p.fechadosAcum === 1 ? "fechado" : "fechados"} · {p.perdidosAcum} {p.perdidosAcum === 1 ? "perdido" : "perdidos"}
            </strong>
          </div>
          <div style={{ color: p.fechadosDia + p.perdidosDia > 0 ? "#DCE9F5" : "#7E9DBB",
                        fontSize: 10.5, marginTop: 6 }}>
            {p.fechadosDia + p.perdidosDia === 0
              ? "nada foi decidido neste dia — a curva só se mantém"
              : `no dia: ${p.fechadosDia} ${p.fechadosDia === 1 ? "fechado" : "fechados"}, ${p.perdidosDia} ${p.perdidosDia === 1 ? "perdido" : "perdidos"}`}
          </div>
        </div>
      )}

      {/* O diário de bordo da curva: os dias em que ela mexeu, em texto. É o que
          responde "o que aconteceu naquele degrau" sem obrigar a caçar o ponto
          com o mouse — e é a única leitura possível no celular, onde o balão
          disputa espaço com o próprio desenho. */}
      {marcos.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(182,207,228,0.7)",
                        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            Os dias em que a taxa mexeu
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {marcos.map((m, k) => {
              const subiu = m.variacao > 0;
              const cor = k === 0 ? "#B6CFE4" : subiu ? VERDE : VERMELHO;
              return (
                <div key={m.rotulo + k}
                     style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap",
                              fontSize: 12, background: "rgba(126,176,219,0.05)",
                              border: "1px solid rgba(126,176,219,0.12)", borderRadius: 9,
                              padding: "7px 11px" }}>
                  <strong style={{ color: "#FFFFFF", minWidth: 46 }}>{m.rotulo}</strong>
                  <span style={{ color: cor, fontWeight: 700, minWidth: 64 }}>
                    {k === 0 ? "nasce" : `${subiu ? "▲" : "▼"} ${umaCasa(Math.abs(m.variacao))} pt`}
                  </span>
                  <span style={{ color: "#DCE9F5" }}>
                    vai a <strong>{umaCasa(m.taxa)}%</strong>
                  </span>
                  <span style={{ color: "#8AA9C6", fontSize: 11 }}>
                    {m.fechadosDia > 0 && `${m.fechadosDia} ${m.fechadosDia === 1 ? "fechado" : "fechados"}`}
                    {m.fechadosDia > 0 && m.perdidosDia > 0 && " e "}
                    {m.perdidosDia > 0 && `${m.perdidosDia} ${m.perdidosDia === 1 ? "perdido" : "perdidos"}`}
                    {" no dia · "}{m.decididos} {m.decididos === 1 ? "decidido" : "decididos"} acumulados
                  </span>
                </div>
              );
            })}
          </div>
          {!isMobile && (
            <div style={{ fontSize: 10.5, color: "#7E9DBB", marginTop: 8 }}>
              Um mesmo negócio move muito a taxa no começo, quando o denominador é pequeno, e quase
              nada depois. Por isso a lista ordena por quanto a TAXA andou, e não por quantos
              negócios o dia teve.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
