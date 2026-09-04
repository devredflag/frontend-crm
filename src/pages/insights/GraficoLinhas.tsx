/**
 * Gráfico de linhas multi-série, com sobreposição do período anterior.
 *
 * É a peça que responde à pergunta que a tela antiga não respondia: leads,
 * propostas e fechados são a mesma história em três tempos, e vendo uma curva
 * de cada vez não dá para saber se o gargalo está na captação, na proposta ou
 * no fechamento. Juntas, o vão entre as linhas É o gargalo.
 *
 * ── Um eixo, sempre ────────────────────────────────────────────────────────
 * Todas as séries deste gráfico têm de compartilhar a UNIDADE. Contagem com
 * contagem, dinheiro com dinheiro. Dois eixos Y no mesmo desenho é o erro mais
 * caro que um gráfico de negócio comete: o alinhamento entre as duas escalas é
 * arbitrário, então o desenho inventa uma correlação que não está no dado. Por
 * isso "leads x propostas x fechados" e "aprovado x perdido" são gráficos
 * separados, e não um só com dois eixos.
 */

import { useState } from "react";
import { motion } from "framer-motion";

import useIsMobile from "../../hooks/useIsMobile";
import { brl } from "../../utils/moeda";
import type { Balde, Serie } from "../../utils/metricas";
import {
  caminhoComBuracos, marcasEixo, rotuloEixo, Tabela, Num, VerNumeros, useVerNumeros,
} from "./pecas";

const CINZA_ANTERIOR = "#7E9DBB";

interface Props {
  series: Serie[];
  baldes: Balde[];
  moeda?: boolean;
  /** Rótulo da janela anterior na legenda — "jul a dez de 2025". */
  rotuloAnterior?: string;
  mostrarAnterior?: boolean;
  vazio: string;
}

/** `null` = mês sem amostra. Ver `Serie.valores` em utils/metricas.ts. */
const fmt = (v: number | null, moeda: boolean) =>
  v === null ? "sem base" : moeda ? brl(v, 0) : v.toLocaleString("pt-BR");

/**
 * Afasta rótulos de fim de linha que cairiam um sobre o outro.
 *
 * Sem isto, duas séries que terminam em valores próximos escrevem o nome uma
 * em cima da outra e as duas ficam ilegíveis — que é pior do que não ter
 * rótulo nenhum. Empurra de cima para baixo mantendo a ordem original das
 * curvas, então o rótulo nunca troca de lado com o vizinho.
 */
function afastar(ys: number[], minimo: number): number[] {
  const ordem = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  let anterior = -Infinity;
  ordem.forEach(o => {
    if (o.y - anterior < minimo) o.y = anterior + minimo;
    anterior = o.y;
  });
  const out = ys.slice();
  ordem.forEach(o => { out[o.i] = o.y; });
  return out;
}

export default function GraficoLinhas({
  series, baldes, moeda = false, rotuloAnterior, mostrarAnterior = false, vazio,
}: Props) {
  const isMobile = useIsMobile();
  const [ativo, setAtivo] = useState<number | null>(null);
  const [tabela, trocarTabela] = useVerNumeros();

  const comAnterior = mostrarAnterior && series.some(s => !!s.anterior);
  const n = baldes.length;

  // Escala sobre TODAS as séries visíveis, atual e anterior juntas — escalas
  // separadas fariam a curva cinza parecer maior do que é.
  let maximo = 0;
  let algumValor = false;
  const olhar = (v: number | null) => {
    if (v === null) return;
    algumValor = true;
    if (v > maximo) maximo = v;
  };
  series.forEach(s => {
    s.valores.forEach(olhar);
    if (comAnterior && s.anterior) s.anterior.forEach(olhar);
  });

  // "Tudo zero" e "nada medido" dizem coisas diferentes, e a mensagem de vazio
  // é a mesma só porque as duas terminam num desenho sem nada para mostrar.
  const semDesenho = !algumValor || maximo === 0;

  // ── geometria ──
  // viewBox fixo escalado por width:100%. A margem direita abre espaço para o
  // rótulo no fim da linha; no celular ela encolhe e os rótulos somem, porque
  // ali não cabem sem cobrir o desenho — a legenda continua identificando tudo.
  const rotulosNaLinha = !isMobile && series.length <= 4;
  const W = 720, H = 262, L = 48, R = rotulosNaLinha ? 96 : 16, T = 20, B = 34;
  const pw = W - L - R, ph = H - T - B;
  const marcas = marcasEixo(maximo);
  const topo = marcas[marcas.length - 1] || 1;
  const x = (i: number) => L + (i * pw) / Math.max(n - 1, 1);
  const y = (v: number) => T + (1 - v / topo) * ph;
  const faixa = pw / Math.max(n - 1, 1);

  const caminho = (vals: (number | null)[]) => caminhoComBuracos(vals, x, y);
  const serieInteira = series.length === 1 && series[0].valores.every(v => v !== null);

  /** Índice do último mês com amostra — onde ficam o marcador e o rótulo. */
  const fimDe = (vals: (number | null)[]) => {
    let i = -1;
    vals.forEach((v, k) => { if (v !== null) i = k; });
    return i;
  };
  const fins = series.map(s => fimDe(s.valores));
  const rotuloY = rotulosNaLinha
    ? afastar(series.map((s, si) => fins[si] >= 0 ? y(s.valores[fins[si]] as number) : y(0)), 13)
    : [];

  const colunas = [
    { chave: "mes", rotulo: "Mês", largura: "1fr", alinha: "left" as const,
      render: (b: { rotulo: string; ano: number }) => (
        <span style={{ color: "#FFFFFF", fontWeight: 600 }}>{b.rotulo}/{String(b.ano).slice(2)}</span>
      ) },
  ].concat(series.map((s, si) => ({
    chave: s.chave, rotulo: s.rotulo, largura: "1fr", alinha: "right" as const,
    render: (b: any) => (
      <Num v={fmt(series[si].valores[b.indice] ?? null, moeda)} cor={s.cor} forte />
    ),
  })) as any);

  const linhasTabela = baldes.map((b, i) => ({ ...b, indice: i }));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        {/* A legenda existe SEMPRE que há duas séries ou mais: identidade nunca
            pode depender só da cor. Os rótulos no fim da linha são um reforço,
            não a única pista. */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", minWidth: 0 }}>
          {series.map(s => (
            <span key={s.chave} style={{ display: "flex", alignItems: "center", gap: 6,
                                         fontSize: 11.5, color: "#DCE9F5" }}>
              <span style={{ width: 9, height: 3, borderRadius: 2, background: s.cor, flexShrink: 0 }} />
              {s.rotulo}
            </span>
          ))}
          {comAnterior && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#8AA9C6" }}>
              <span style={{ width: 9, height: 0, flexShrink: 0,
                             borderTop: `2px dashed ${CINZA_ANTERIOR}` }} />
              {rotuloAnterior || "período anterior"}
            </span>
          )}
        </div>
        <VerNumeros ligado={tabela} aoTrocar={trocarTabela} />
      </div>

      {tabela ? (
        <Tabela colunas={colunas as any} linhas={linhasTabela}
                chaveDe={(b: any) => `${b.ano}-${b.mes}`}
                larguraMinima={140 + series.length * 110} vazio={vazio} />
      ) : (
        <div style={{ position: "relative" }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}
               role="img"
               aria-label={series.map(s =>
                 `${s.rotulo}: ${baldes.map((b, i) => `${b.rotulo} ${fmt(s.valores[i] ?? null, moeda)}`).join(", ")}`
               ).join(". ")}>
            <defs>
              {/* Área só quando há uma série: com várias, os preenchimentos se
                  cobrem e a leitura vira adivinhação de qual está por cima. */}
              {series.length === 1 && (
                <linearGradient id={`ar-${series[0].chave}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series[0].cor} stopOpacity="0.26" />
                  <stop offset="100%" stopColor={series[0].cor} stopOpacity="0" />
                </linearGradient>
              )}
            </defs>

            {/* Grade em traço contínuo e um degrau acima do fundo. Tracejado na
                grade lê como limite ou projeção, e aqui é só grade. */}
            {marcas.map(m => (
              <g key={m}>
                <line x1={L} x2={W - R} y1={y(m)} y2={y(m)}
                      stroke="rgba(126,176,219,0.13)" strokeWidth="1" />
                <text x={L - 8} y={y(m) + 3.5} textAnchor="end" fontSize="10" fontWeight="600"
                      fill="#8AA9C6" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {rotuloEixo(m, moeda)}
                </text>
              </g>
            ))}

            {/* O período anterior vai primeiro, atrás: é contexto, não a série
                principal. Tracejado porque ali o traço significa mesmo "outro
                tempo" — é o único uso legítimo de tracejado no desenho. */}
            {comAnterior && series.map(s => s.anterior && (
              <path key={`a-${s.chave}`} d={caminho(s.anterior)} fill="none"
                    stroke={CINZA_ANTERIOR} strokeWidth="1.6" strokeDasharray="4 4"
                    strokeOpacity="0.75" strokeLinecap="round" strokeLinejoin="round" />
            ))}

            {/* A área só é desenhada quando a série está INTEIRA. Com buraco,
                o preenchimento fecharia por cima do vão e daria ao mês sem
                amostra a mesma aparência de um mês medido — que é justamente o
                que a curva interrompida evita. */}
            {series.length === 1 && !semDesenho && serieInteira && (
              <path fill={`url(#ar-${series[0].chave})`}
                    d={`${caminho(series[0].valores)} L${x(n - 1)},${T + ph} L${x(0)},${T + ph} Z`} />
            )}

            {series.map(s => (
              <path key={s.chave} d={caminho(s.valores)} fill="none" stroke={s.cor}
                    strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            ))}

            {/* Marcadores só no ponto sob o cursor e no último: um círculo em
                cada mês de cada série vira ruído e esconde a forma da curva. */}
            {series.map((s, si) => baldes.map((_, i) => {
              const fim = i === fins[si];
              if (!fim && ativo !== i) return null;
              const v = s.valores[i];
              if (v === null || v === undefined) return null;   // mês sem amostra não ganha ponto
              return (
                <circle key={`${s.chave}-${i}`} cx={x(i)} cy={y(v)} r="4.2"
                        fill={fim ? s.cor : "#143354"} stroke={s.cor} strokeWidth="2.2" />
              );
            }))}

            {/* Rótulo no fim da linha: o reforço de identidade que dispensa ir
                até a legenda e voltar. Só o último ponto recebe número — um
                valor em cada ponto seria ilegível. */}
            {rotulosNaLinha && series.map((s, si) => fins[si] >= 0 && (
              <text key={`r-${s.chave}`} x={x(fins[si]) + 9} y={rotuloY[si] + 3.5}
                    fontSize="10.5" fontWeight="700" fill={s.cor}>
                {fmt(s.valores[fins[si]], moeda)}
              </text>
            ))}

            {ativo !== null && (
              <line x1={x(ativo)} x2={x(ativo)} y1={T} y2={T + ph}
                    stroke="rgba(126,176,219,0.45)" strokeWidth="1" />
            )}

            {baldes.map((b, i) => (
              <text key={`m-${i}`} x={x(i)} y={H - B + 18} textAnchor="middle" fontSize="11"
                    fontWeight={i === n - 1 || ativo === i ? 800 : 600}
                    fill={i === n - 1 || ativo === i ? "#FFFFFF" : "#B6CFE4"}>
                {b.rotulo}
              </text>
            ))}

            {/* Alvo de mouse e de teclado: a COLUNA inteira do mês, não o
                ponto. Acertar um círculo de 4px é sofrimento, e com teclado
                seria impossível. */}
            {baldes.map((b, i) => (
              <rect key={`h-${i}`} x={x(i) - faixa / 2} y={T} width={faixa} height={ph}
                    fill="transparent" tabIndex={0} role="button"
                    aria-label={`${b.rotulo} de ${b.ano}: ${series.map(s =>
                      `${s.rotulo} ${fmt(s.valores[i] ?? null, moeda)}`).join(", ")}`}
                    onMouseEnter={() => setAtivo(i)} onMouseLeave={() => setAtivo(null)}
                    onFocus={() => setAtivo(i)} onBlur={() => setAtivo(null)} />
            ))}
          </svg>

          {ativo !== null && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}
              style={{
                position: "absolute", pointerEvents: "none", zIndex: 5,
                left: `${(x(ativo) / W) * 100}%`,
                top: 6,
                // Vira o balão para dentro nas pontas, senão ele sai do card.
                transform: `translateX(${ativo === 0 ? "0%" : ativo === n - 1 ? "-100%" : "-50%"})`,
                background: "#0A1F33", border: "1px solid rgba(126,176,219,0.30)", borderRadius: 9,
                padding: "8px 11px", fontSize: 12, whiteSpace: "nowrap", color: "#FFFFFF",
                boxShadow: "0 8px 24px rgba(3,14,26,0.55)",
              }}>
              <div style={{ color: "#B6CFE4", fontSize: 11, marginBottom: 5 }}>
                {baldes[ativo].rotulo} de {baldes[ativo].ano}
              </div>
              {series.map((s, si) => (
                <div key={s.chave} style={{ display: "flex", alignItems: "center", gap: 7,
                                            marginTop: si ? 3 : 0 }}>
                  <span style={{ width: 8, height: 3, borderRadius: 2, background: s.cor, flexShrink: 0 }} />
                  <span style={{ color: "#B6CFE4" }}>{s.rotulo}</span>
                  <strong style={{ marginLeft: "auto", paddingLeft: 10 }}>
                    {fmt(s.valores[ativo] ?? null, moeda)}
                  </strong>
                </div>
              ))}
              {comAnterior && series.map(s => s.anterior && (
                <div key={`t-${s.chave}`} style={{ display: "flex", alignItems: "center", gap: 7,
                                                   marginTop: 3, opacity: 0.75 }}>
                  <span style={{ width: 8, height: 0, flexShrink: 0,
                                 borderTop: `2px dashed ${CINZA_ANTERIOR}` }} />
                  <span style={{ color: "#8AA9C6" }}>{s.rotulo}, antes</span>
                  <strong style={{ marginLeft: "auto", paddingLeft: 10, color: "#B6CFE4" }}>
                    {fmt(s.anterior[ativo] ?? null, moeda)}
                  </strong>
                </div>
              ))}
            </motion.div>
          )}

          {semDesenho && (
            <div style={{ textAlign: "center", fontSize: 12, color: "#B6CFE4", marginTop: -6 }}>
              {vazio}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
