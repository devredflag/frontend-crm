import { useState } from "react";
import { CalendarCheck, TrendingUp } from "lucide-react";
import { dataLocal } from "../utils/data";
import { brl, brlCurto } from "../utils/moeda";

// Grafico "aprovado por mes" e donut de conversao. Nasceram dentro do painel de
// vendas; sairam de la porque a ficha da empresa precisa dos mesmos dois
// desenhos com o recorte de uma empresa so — e dois SVGs iguais em arquivos
// diferentes viram dois desenhos diferentes no primeiro ajuste.

export interface MesSerie { rotulo: string; valor: number; qtd: number; atual: boolean }

interface OrcamentoBase {
  status: string;
  total: number | string | null;
  data_decisao?: string | null;
  data_envio?: string | null;
  criado_em?: string | null;
}

/**
 * Valor aprovado mes a mes. `deslocamento` joga a janela inteira para tras em
 * N meses — e assim que se compara semestre com semestre sem duplicar a conta.
 */
export function serieAprovadaPorMes(
  orcamentos: OrcamentoBase[], qtdMeses = 6, deslocamento = 0,
): MesSerie[] {
  const hoje = new Date();
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() - deslocamento, 1);
  const meses: MesSerie[] = [];
  for (let i = qtdMeses - 1; i >= 0; i--) {
    const d = new Date(fim.getFullYear(), fim.getMonth() - i, 1);
    meses.push({
      rotulo: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      valor: 0, qtd: 0, atual: i === 0 && deslocamento === 0,
    });
  }
  orcamentos.filter(o => o.status === "aprovado").forEach(o => {
    const d = dataLocal(o.data_decisao || o.data_envio || o.criado_em);
    if (!d) return;
    const diff = (fim.getFullYear() - d.getFullYear()) * 12 + (fim.getMonth() - d.getMonth());
    if (diff >= 0 && diff < qtdMeses) {
      meses[qtdMeses - 1 - diff].valor += Number(o.total || 0);
      meses[qtdMeses - 1 - diff].qtd += 1;
    }
  });
  return meses;
}

/** Soma do valor de uma serie — atalho para as comparacoes de periodo. */
export const somaSerie = (serie: MesSerie[]) => serie.reduce((s, m) => s + m.valor, 0);

/** Escala "bonita": arredonda o topo para 1/2/5 x 10^n, para a grade cair em numeros redondos. */
function topoEscala(v: number) {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const n = v / base;
  const passo = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return passo * base;
}
/** Rotulo curto para os eixos — "12k", "1,5 mi". */
function eixoCurto(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}mi`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k`;
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

const cardStyle: React.CSSProperties = {
  background: "#143354",
  border: "1px solid rgba(159,211,234,0.18)",
  borderRadius: 16,
  padding: 16,
  flexShrink: 0,
};
const num: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

export default function GraficoAprovadoMensal({
  serie,
  titulo = "Aprovado por mês",
  subtitulo = "Últimos 6 meses",
  vazioTexto = "Nenhuma aprovação no período.",
}: {
  serie: MesSerie[];
  titulo?: string;
  subtitulo?: string;
  vazioTexto?: string;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);

  const total = somaSerie(serie);
  const totalQtd = serie.reduce((s, m) => s + m.qtd, 0);
  const comVenda = serie.filter(m => m.valor > 0);
  const media = comVenda.length ? total / comVenda.length : 0;
  const melhor = serie.reduce((a, b) => (b.valor > a.valor ? b : a), serie[0]);

  // Variacao do mes corrente contra o anterior — e o numero que o gerente
  // procura primeiro ao abrir o painel.
  const atualV = serie[serie.length - 1]?.valor ?? 0;
  const anteriorV = serie[serie.length - 2]?.valor ?? 0;
  const variacao = anteriorV > 0 ? ((atualV - anteriorV) / anteriorV) * 100 : null;

  const vazio = total === 0;
  const topo = topoEscala(Math.max(...serie.map(m => m.valor)));

  // Geometria do SVG. viewBox fixo + width 100% deixa o grafico acompanhar a
  // coluna sem recalcular nada em JS.
  const L = 34, R = 6, T = 20, B = 24;
  const W = 268, H = 158;
  const pw = W - L - R, ph = H - T - B;
  const passo = pw / serie.length;
  const larguraBarra = Math.min(26, passo * 0.62);

  const y = (v: number) => T + ph - (v / topo) * ph;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 2 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: 12.5, fontWeight: 800, color: "#EAF6FB" }}>{titulo}</h4>
          <p style={{ fontSize: 10.5, color: "#9FD3EA", marginTop: 1 }}>{subtitulo}</p>
        </div>
        {variacao !== null && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 20,
            fontSize: 10.5, fontWeight: 800, flexShrink: 0,
            background: variacao >= 0 ? "rgba(44,205,147,0.14)" : "rgba(248,113,113,0.14)",
            color: variacao >= 0 ? "#2CCD93" : "#F87171",
          }}>
            <TrendingUp style={{ width: 10, height: 10, transform: variacao >= 0 ? "none" : "scaleY(-1)" }} />
            {variacao >= 0 ? "+" : ""}{Math.round(variacao)}%
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "8px 0 4px" }}>
        <span style={{ ...num, fontSize: 20, fontWeight: 900, color: "#EAF6FB", letterSpacing: "-0.02em" }}>
          {brlCurto(total)}
        </span>
        <span style={{ fontSize: 10.5, color: "#9FD3EA", fontWeight: 600 }}>
          em {totalQtd} orçamento{totalQtd === 1 ? "" : "s"}
        </span>
      </div>

      {vazio ? (
        <div style={{ padding: "26px 0", textAlign: "center", color: "#9FD3EA" }}>
          <CalendarCheck style={{ width: 22, height: 22, marginBottom: 6 }} />
          <p style={{ fontSize: 11.5, fontWeight: 700 }}>{vazioTexto}</p>
        </div>
      ) : (
        <>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img"
            aria-label={`Valor aprovado por mês: ${serie.map(m => `${m.rotulo}, ${brl(m.valor)}`).join("; ")}`}
            onMouseLeave={() => setAtivo(null)} style={{ display: "block", overflow: "visible" }}>
            <defs>
              <linearGradient id="gamBarra" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#56A4F5" />
                <stop offset="100%" stopColor="#2E6F95" />
              </linearGradient>
              <linearGradient id="gamBarraTopo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2CCD93" />
                <stop offset="100%" stopColor="#1E8E68" />
              </linearGradient>
            </defs>

            {/* Grade e escala do eixo Y */}
            {[0, 0.5, 1].map(f => {
              const vy = T + ph - f * ph;
              return (
                <g key={f}>
                  <line x1={L} y1={vy} x2={W - R} y2={vy}
                    stroke="rgba(126,176,219,0.16)" strokeWidth="1"
                    strokeDasharray={f === 0 ? undefined : "3 3"} />
                  <text x={L - 6} y={vy + 3} textAnchor="end" fontSize="8.5" fontWeight="700" fill="#7FA6C4">
                    {f === 0 ? "0" : eixoCurto(topo * f)}
                  </text>
                </g>
              );
            })}

            {serie.map((m, i) => {
              const cx = L + passo * i + passo / 2;
              const alt = m.valor > 0 ? Math.max(2, ph - (y(m.valor) - T)) : 0;
              const topoBarra = T + ph - alt;
              const destaque = m.valor > 0 && m.valor === melhor.valor;
              const on = ativo === i;
              return (
                <g key={i} onMouseEnter={() => setAtivo(i)} style={{ cursor: "default" }}>
                  {/* alvo de hover cobrindo a coluna inteira, nao so a barra */}
                  <rect x={L + passo * i} y={T} width={passo} height={ph} fill="transparent" />
                  {on && (
                    <rect x={L + passo * i + 1} y={T} width={passo - 2} height={ph}
                      fill="rgba(126,176,219,0.07)" rx="4" />
                  )}
                  {m.valor > 0 && (
                    <rect
                      x={cx - larguraBarra / 2} y={topoBarra} width={larguraBarra} height={alt} rx="4"
                      fill={destaque ? "url(#gamBarraTopo)" : "url(#gamBarra)"}
                      opacity={ativo === null || on ? 1 : 0.55}
                      style={{ transition: "opacity 0.15s" }}
                    >
                      <title>{`${m.rotulo} · ${brl(m.valor)} · ${m.qtd} orçamento${m.qtd === 1 ? "" : "s"}`}</title>
                    </rect>
                  )}
                  {/* valor acima da barra — sem isso, o grafico so mostra formas */}
                  {m.valor > 0 && (
                    <text x={cx} y={topoBarra - 5} textAnchor="middle" fontSize="8.5" fontWeight="800"
                      fill={destaque ? "#2CCD93" : "#B6CFE4"}>
                      {eixoCurto(m.valor)}
                    </text>
                  )}
                  <text x={cx} y={H - B + 13} textAnchor="middle" fontSize="9.5"
                    fontWeight={m.atual ? 800 : 600} fill={m.atual ? "#EAF6FB" : "#7FA6C4"}>
                    {m.rotulo}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Leitura de apoio: o grafico mostra a forma, estes numeros dao a conta. */}
          <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 11, borderTop: "1px solid rgba(126,176,219,0.16)" }}>
            {[
              { lab: "Média/mês", val: brlCurto(media), cor: "#B6CFE4" },
              { lab: "Melhor mês", val: melhor.valor > 0 ? melhor.rotulo : "—", cor: "#2CCD93" },
              { lab: "Este mês", val: brlCurto(atualV), cor: "#EAF6FB" },
            ].map(s => (
              <div key={s.lab} style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7FA6C4" }}>{s.lab}</div>
                <div style={{ ...num, fontSize: 12, fontWeight: 800, color: s.cor, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.val}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Donut de conversao — so o desenho; quem chama escreve a legenda embaixo. */
export function DonutConversao({ pct }: { pct: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const off = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <div style={{ display: "grid", placeItems: "center" }}>
      <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`${Math.round(pct)}% de conversão`}>
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(200,225,240,0.75)" strokeWidth="12" />
        <circle cx="66" cy="66" r={r} fill="none" stroke="url(#donutConvGrad)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 66 66)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        <defs>
          <linearGradient id="donutConvGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9FD3EA" />
            <stop offset="100%" stopColor="#83DDA8" />
          </linearGradient>
        </defs>
        <text x="66" y="66" textAnchor="middle" dominantBaseline="central"
          fill="#EAF6FB" fontSize="26" fontWeight="800" style={{ fontVariantNumeric: "tabular-nums" }}>
          {Math.round(pct)}%
        </text>
      </svg>
    </div>
  );
}
