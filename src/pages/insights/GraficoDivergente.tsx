/**
 * Colunas divergentes: o que foi aprovado sobe, o que foi perdido desce.
 *
 * ── Por que não são duas linhas ────────────────────────────────────────────
 * A primeira versão desta tela desenharia "valor aprovado" e "valor perdido"
 * como duas curvas verdes e vermelhas no mesmo gráfico. Medido em OKLab contra
 * o fundo do card, o verde #2CCD93 e o vermelho #F87171 ficam a ΔE 5,2 sob
 * deuteranopia — abaixo do piso de 6 em que duas cores ainda se distinguem.
 * Para parte dos usuários seriam duas linhas da MESMA cor, e o gráfico diria o
 * oposto do que pretende justamente para quem já tem mais dificuldade.
 *
 * Aqui a informação principal é a DIREÇÃO: ganho para cima, perda para baixo.
 * Isso é lido sem cor nenhuma. A cor virou reforço redundante, que é o papel
 * certo dela — e a forma passou a ser a correta para o dado, porque a pergunta
 * é de polaridade (ganhei ou perdi), não de identidade entre duas séries.
 *
 * O saldo do mês é a soma das duas metades e aparece no balão. Não vira uma
 * terceira barra: ele já está desenhado na diferença entre os dois lados.
 */

import { useState } from "react";

import { brl, brlEixo } from "../../utils/moeda";
import type { Balde } from "../../utils/metricas";
import {
  marcasEixo, mesSobCursor, posicaoNoViewBox, Tabela, Num, VerNumeros, useVerNumeros,
} from "./pecas";

const VERDE = "#2CCD93", VERMELHO = "#F87171";

export default function GraficoDivergente({ baldes, ganhos, perdas, vazio }: {
  baldes: Balde[];
  /** Valor aprovado por mês, alinhado com `baldes`. */
  ganhos: number[];
  /** Valor recusado por mês, positivo — o desenho é que inverte. */
  perdas: number[];
  vazio: string;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);
  /** Posição do cursor no viewBox — mesma ideia do gráfico de linhas. */
  const [cursor, setCursor] = useState<number | null>(null);
  const [tabela, trocarTabela] = useVerNumeros();

  const n = baldes.length;
  const pico = Math.max(1, Math.max.apply(null, ganhos.concat(perdas)));
  const tudoZero = ganhos.concat(perdas).every(v => v === 0);

  // Escala SIMÉTRICA em torno do zero: R$ 10 mil ganhos e R$ 10 mil perdidos
  // têm de desenhar barras do mesmo tamanho. Escalas independentes para cada
  // lado fariam uma perda pequena parecer do tamanho de um ganho grande.
  const marcas = marcasEixo(pico);
  const topo = marcas[marcas.length - 1] || 1;

  const W = 720, H = 268, L = 52, R = 14, T = 16, B = 32;
  const pw = W - L - R, ph = H - T - B;
  const zero = T + ph / 2;                       // a linha de base fica no meio
  const meia = ph / 2;
  const alturaDe = (v: number) => (v / topo) * meia;
  const passo = pw / Math.max(n, 1);
  // 2px de folga entre colunas vizinhas, feita de fundo e não de borda — borda
  // em volta da marca engorda o desenho e some no tema escuro.
  const larguraBarra = Math.max(6, Math.min(34, passo * 0.5));
  const centro = (i: number) => L + passo * i + passo / 2;

  /**
   * Varredura contínua: a coluna sob o cursor acende enquanto o mouse anda.
   *
   * Aqui não há guia vertical — a barra realçada já diz onde se está, e uma
   * linha por cima das colunas competiria com a linha do zero, que é a
   * referência de leitura deste desenho.
   */
  const varrer = (clientX: number, svg: SVGSVGElement | null) => {
    if (!svg) return;
    const vx = posicaoNoViewBox(clientX, svg.getBoundingClientRect(), W, L, R);
    if (vx === null) return;
    setCursor(vx);
    setAtivo(mesSobCursor(vx, L, passo, n));
  };

  const sair = () => { setCursor(null); setAtivo(null); };

  const colunas = [
    { chave: "mes", rotulo: "Mês", largura: "1fr", alinha: "left" as const,
      render: (b: any) => (
        <span style={{ color: "#FFFFFF", fontWeight: 600 }}>{b.rotulo}/{String(b.ano).slice(2)}</span>
      ) },
    { chave: "g", rotulo: "Aprovado", largura: "1fr", alinha: "right" as const,
      render: (b: any) => <Num v={ganhos[b.indice] ? brl(ganhos[b.indice], 0) : 0} cor={VERDE} forte /> },
    { chave: "p", rotulo: "Perdido", largura: "1fr", alinha: "right" as const,
      render: (b: any) => <Num v={perdas[b.indice] ? brl(perdas[b.indice], 0) : 0} cor={VERMELHO} forte /> },
    { chave: "s", rotulo: "Saldo", largura: "1fr", alinha: "right" as const,
      render: (b: any) => {
        const s = ganhos[b.indice] - perdas[b.indice];
        return <Num v={s ? brl(s, 0) : 0} cor={s >= 0 ? VERDE : VERMELHO} forte />;
      } },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {/* A legenda diz a direção junto com a cor — quem não distingue as
              duas cores lê "para cima" e "para baixo" e não perde nada. */}
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#DCE9F5" }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: VERDE, flexShrink: 0 }} />
            Aprovado (para cima)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#DCE9F5" }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: VERMELHO, flexShrink: 0 }} />
            Perdido (para baixo)
          </span>
        </div>
        <VerNumeros ligado={tabela} aoTrocar={trocarTabela} />
      </div>

      {tabela ? (
        <Tabela colunas={colunas as any} linhas={baldes.map((b, i) => ({ ...b, indice: i }))}
                chaveDe={(b: any) => `${b.ano}-${b.mes}`}
                larguraMinima={520} vazio={vazio} />
      ) : (
        <div style={{ position: "relative" }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}
               role="img"
               onMouseMove={e => varrer(e.clientX, e.currentTarget)}
               onMouseLeave={sair}
               onTouchStart={e => varrer(e.touches[0].clientX, e.currentTarget)}
               onTouchMove={e => varrer(e.touches[0].clientX, e.currentTarget)}
               onTouchEnd={sair}
               aria-label={baldes.map((b, i) =>
                 `${b.rotulo}: aprovado ${brl(ganhos[i], 0)}, perdido ${brl(perdas[i], 0)}`).join(". ")}>

            {/* Escala espelhada: as mesmas marcas para cima e para baixo. */}
            {marcas.map(m => [1, -1].map(lado => {
              if (m === 0 && lado === -1) return null;
              const yy = zero - alturaDe(m) * lado;
              return (
                <g key={`${m}-${lado}`}>
                  <line x1={L} x2={W - R} y1={yy} y2={yy}
                        stroke={m === 0 ? "rgba(126,176,219,0.34)" : "rgba(126,176,219,0.11)"}
                        strokeWidth="1" />
                  <text x={L - 8} y={yy + 3.5} textAnchor="end" fontSize="9.5" fontWeight="600"
                        fill="#8AA9C6" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {m === 0 ? "0" : brlEixo(m).replace("R$ ", "")}
                  </text>
                </g>
              );
            }))}

            {baldes.map((b, i) => {
              const hg = alturaDe(ganhos[i]);
              const hp = alturaDe(perdas[i]);
              const on = ativo === i;
              const xx = centro(i) - larguraBarra / 2;
              return (
                <g key={`b-${i}`} opacity={ativo === null || on ? 1 : 0.55}>
                  {/* Cantos arredondados só na PONTA do dado; o pé fica reto,
                      ancorado na linha do zero. `ry` no rect arredondaria os
                      quatro, e a barra descolaria visualmente da base. */}
                  {ganhos[i] > 0 && (
                    <path d={cantoTopo(xx, zero - hg, larguraBarra, hg, 4)} fill={VERDE} />
                  )}
                  {perdas[i] > 0 && (
                    <path d={cantoBase(xx, zero, larguraBarra, hp, 4)} fill={VERMELHO} />
                  )}
                </g>
              );
            })}

            {/* A linha do zero por cima das barras: é a referência de leitura,
                e coberta pela barra o olho perde o ponto de partida. */}
            <line x1={L} x2={W - R} y1={zero} y2={zero} stroke="rgba(126,176,219,0.42)" strokeWidth="1" />

            {baldes.map((b, i) => (
              <text key={`m-${i}`} x={centro(i)} y={H - 8} textAnchor="middle" fontSize="10.5"
                    fontWeight={ativo === i ? 800 : 600} fill={ativo === i ? "#FFFFFF" : "#B6CFE4"}>
                {b.rotulo}
              </text>
            ))}

            {/* Alvos de TECLADO. O mouse é atendido pela varredura do SVG; sem
                `pointerEvents:none` estes retângulos comeriam o `mousemove` e a
                varredura só reagiria ao trocar de coluna. */}
            {baldes.map((b, i) => (
              <rect key={`h-${i}`} x={L + passo * i} y={T} width={passo} height={ph}
                    fill="transparent" style={{ pointerEvents: "none" }} tabIndex={0} role="button"
                    aria-label={`${b.rotulo} de ${b.ano}: aprovado ${brl(ganhos[i], 0)}, perdido ${brl(perdas[i], 0)}, saldo ${brl(ganhos[i] - perdas[i], 0)}`}
                    onFocus={() => { setAtivo(i); setCursor(centro(i)); }}
                    onBlur={sair} />
            ))}
          </svg>

          {ativo !== null && (() => {
            const saldo = ganhos[ativo] - perdas[ativo];
            return (
              <div
                style={{
                  position: "absolute", pointerEvents: "none", zIndex: 5, top: 4,
                  left: `${((cursor ?? centro(ativo)) / W) * 100}%`,
                  transform: `translateX(${
                    (cursor ?? centro(ativo)) < W * 0.22 ? "0%"
                    : (cursor ?? centro(ativo)) > W * 0.78 ? "-100%" : "-50%"})`,
                  transition: "left 0.08s linear",
                  background: "#0A1F33", border: "1px solid rgba(126,176,219,0.30)", borderRadius: 9,
                  padding: "8px 11px", fontSize: 12, whiteSpace: "nowrap", color: "#FFFFFF",
                  boxShadow: "0 8px 24px rgba(3,14,26,0.55)",
                }}>
                <div style={{ color: "#B6CFE4", fontSize: 11, marginBottom: 5 }}>
                  {baldes[ativo].rotulo} de {baldes[ativo].ano}
                </div>
                <Linha cor={VERDE} rotulo="Aprovado" valor={brl(ganhos[ativo], 0)} />
                <Linha cor={VERMELHO} rotulo="Perdido" valor={brl(perdas[ativo], 0)} />
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(126,176,219,0.18)",
                              display: "flex", gap: 12 }}>
                  <span style={{ color: "#B6CFE4" }}>Saldo</span>
                  <strong style={{ marginLeft: "auto", color: saldo >= 0 ? VERDE : VERMELHO }}>
                    {brl(saldo, 0)}
                  </strong>
                </div>
              </div>
            );
          })()}

          {tudoZero && (
            <div style={{ textAlign: "center", fontSize: 12, color: "#B6CFE4", marginTop: -4 }}>
              {vazio}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Linha({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: cor, flexShrink: 0 }} />
      <span style={{ color: "#B6CFE4" }}>{rotulo}</span>
      <strong style={{ marginLeft: "auto", paddingLeft: 12 }}>{valor}</strong>
    </div>
  );
}

/** Retângulo com os dois cantos de CIMA arredondados. */
function cantoTopo(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} `
       + `Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

/** Retângulo com os dois cantos de BAIXO arredondados, crescendo de `y` para baixo. */
function cantoBase(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y} L${x},${y + h - rr} Q${x},${y + h} ${x + rr},${y + h} `
       + `L${x + w - rr},${y + h} Q${x + w},${y + h} ${x + w},${y + h - rr} L${x + w},${y} Z`;
}
