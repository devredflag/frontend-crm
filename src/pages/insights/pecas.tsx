/**
 * Peças visuais da tela de Insights.
 *
 * Estão separadas do `index.tsx` porque as quatro abas usam as mesmas caixas,
 * e duplicá-las era como o mesmo número passava a ter duas caras na tela.
 *
 * Nada aqui faz conta. Todo número chega pronto de `utils/metricas.ts`, que é
 * testável sem navegador — e este arquivo não pode ser. Se um componente daqui
 * começar a calcular, o número volta a ser inverificável.
 */

import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Info, Minus, Table2 } from "lucide-react";

import { brl, brlEixo } from "../../utils/moeda";
import type { Formato, KpiCalculado, Medida } from "../../utils/metricas";

// ─────────────────────────────────────────────────────────────────────────────
// Formatação
// ─────────────────────────────────────────────────────────────────────────────

const nbr = (v: number, casas = 0) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Um valor medido, no formato do indicador. `null` vira "sem base". */
export function formatar(valor: number | null, formato: Formato): string | null {
  if (valor === null) return null;
  switch (formato) {
    case "pct":    return `${nbr(valor, 1)}%`;
    case "moeda":  return brl(valor, 0);
    case "dias":   return `${nbr(Math.round(valor))} ${Math.round(valor) === 1 ? "dia" : "dias"}`;
    default:       return nbr(Math.round(valor));
  }
}

/**
 * A diferença, com a unidade certa.
 *
 * Diferença de porcentagem sai em PONTOS, não em "%". Passar de 20% para 25% é
 * +5 pontos, e escrever "+5%" ali é o erro que faz o gerente ler 25% como
 * "cresceu 5% sobre 20", que seria 21%. São números diferentes e a tela não
 * pode confundi-los.
 */
export function formatarDelta(delta: number, formato: Formato): string {
  const a = Math.abs(delta);
  switch (formato) {
    case "pct":   return `${nbr(a, 1)} pt`;
    case "moeda": return brl(a, 0);
    case "dias":  return `${nbr(Math.round(a))} ${Math.round(a) === 1 ? "dia" : "dias"}`;
    default:      return nbr(Math.round(a));
  }
}

const VERDE = "#2CCD93", VERMELHO = "#F87171", NEUTRO = "#B6CFE4";

/** Verde quando o movimento é bom PARA AQUELE indicador — ciclo que cai é bom. */
function corDelta(delta: number, subirEBom: boolean): string {
  if (Math.abs(delta) < 1e-9) return NEUTRO;
  return (delta > 0) === subirEBom ? VERDE : VERMELHO;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sparkline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A curva miúda do card. Sem eixo, sem rótulo: ela mostra a FORMA, e o número
 * grande logo acima dá o valor. Tem `aria-hidden` porque não acrescenta nada
 * ao que o leitor de tela já anunciou no valor e no Δ.
 */
function Sparkline({ valores, cor }: { valores: (number | null)[]; cor: string }) {
  const reais: number[] = [];
  valores.forEach(v => { if (v !== null) reais.push(v); });
  if (valores.length < 2 || reais.length === 0) return <div style={{ height: 26 }} />;

  const W = 100, H = 26, P = 3;
  const max = Math.max.apply(null, reais);
  const min = Math.min.apply(null, reais);
  const faixa = max - min || 1;
  const x = (i: number) => (i * W) / (valores.length - 1);
  const y = (v: number) => P + (1 - (v - min) / faixa) * (H - P * 2);
  const chato = max === min;

  // Último mês COM amostra: é onde o ponto vai. Marcar o último índice do
  // array poria a bolinha num mês que não tem valor nenhum.
  let ultimo = -1;
  valores.forEach((v, i) => { if (v !== null) ultimo = i; });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true"
         style={{ width: "100%", height: 26, display: "block", overflow: "visible" }}>
      {/* Série constante vira uma reta no meio, não uma linha colada no topo. */}
      {chato ? (
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke={cor} strokeWidth="1.6"
              strokeOpacity="0.35" vectorEffect="non-scaling-stroke" />
      ) : (
        <path d={caminhoComBuracos(valores, x, y)} fill="none" stroke={cor} strokeWidth="1.6"
              strokeOpacity="0.9" strokeLinecap="round" strokeLinejoin="round"
              vectorEffect="non-scaling-stroke" />
      )}
      {!chato && ultimo >= 0 && (
        <circle cx={x(ultimo)} cy={y(valores[ultimo] as number)} r="2.2" fill={cor} />
      )}
    </svg>
  );
}

/**
 * Caminho SVG que INTERROMPE em cada `null` em vez de saltar por cima dele.
 *
 * Ligar os dois vizinhos de um buraco desenharia uma reta que afirma uma
 * transição que ninguém mediu — e num gráfico de taxa isso é indistinguível de
 * um dado real. Um ponto isolado entre dois buracos vira um traço curtíssimo,
 * que com `strokeLinecap:"round"` aparece como bolinha: existe, e o leitor vê
 * que existe sozinho.
 */
export function caminhoComBuracos(
  valores: (number | null)[], x: (i: number) => number, y: (v: number) => number,
): string {
  const partes: string[] = [];
  let abriu = false;
  valores.forEach((v, i) => {
    if (v === null) { abriu = false; return; }
    partes.push(`${abriu ? "L" : "M"}${x(i)},${y(v)}`);
    if (!abriu) {
      abriu = true;
      // Ponto sozinho: um "M" seguido de nada não desenha nada. O "L" para o
      // mesmo lugar vira um segmento de comprimento zero, que o linecap
      // redondo transforma em ponto visível.
      const sozinho = (valores[i - 1] ?? null) === null && (valores[i + 1] ?? null) === null;
      if (sozinho) partes.push(`L${x(i)},${y(v)}`);
    }
  });
  return partes.join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Caixa de indicador
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valor grande, Δ contra o período anterior e a curva do período.
 *
 * `base` — o denominador — fica visível de propósito: uma conversão de 100%
 * sobre dois negócios não é a mesma informação que 100% sobre duzentos, e meta
 * cravada sem olhar a amostra é meta chutada.
 *
 * Quando o indicador não é comparável (a cobertura de follow-up, que não tem
 * passado guardado), a linha do Δ diz isso em vez de sumir — some seria
 * indistinguível de "não mudou nada".
 */
export function CaixaKpi({ k, aoClicar, ativo }: {
  k: KpiCalculado;
  aoClicar?: () => void;
  ativo?: boolean;
}) {
  const { def, atual, anterior, delta, serie } = k;
  const valor = formatar(atual.valor, def.formato);
  const clicavel = !!aoClicar;

  const antTexto = anterior && anterior.valor !== null
    ? formatar(anterior.valor, def.formato) : null;

  return (
    <div
      className="kpi-card"
      role={clicavel ? "button" : undefined}
      tabIndex={clicavel ? 0 : undefined}
      aria-pressed={clicavel ? !!ativo : undefined}
      onClick={aoClicar}
      onKeyDown={e => {
        if (!clicavel) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); aoClicar!(); }
      }}
      title={def.comoCalcula}
      style={{
        cursor: clicavel ? "pointer" : "default",
        borderColor: ativo ? `${def.cor}66` : undefined,
        background: ativo ? "#173C61" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: def.cor, flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#B6CFE4", minWidth: 0,
                       overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {def.rotulo}
        </span>
      </div>

      <div style={{ fontSize: 25, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1,
                    color: valor === null ? "#7E9DBB" : "#FFFFFF" }}>
        {valor ?? "sem base"}
      </div>

      {/* A linha do Δ tem altura fixa para as caixas da grade não desalinharem
          entre um indicador comparável e um que não é. */}
      <div style={{ minHeight: 19, display: "flex", alignItems: "center", gap: 5, marginTop: 7 }}>
        {delta === null ? (
          <span style={{ fontSize: 11, color: "#7E9DBB" }}>
            {def.comparavel ? "sem período anterior para comparar" : "não tem histórico para comparar"}
          </span>
        ) : (() => {
          const cor = corDelta(delta, def.subirEBom);
          const Icone = Math.abs(delta) < 1e-9 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
          return (
            <>
              <Icone style={{ width: 12, height: 12, color: cor, flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontSize: 11.5, fontWeight: 800, color: cor }}>
                {formatarDelta(delta, def.formato)}
              </span>
              <span style={{ fontSize: 11, color: "#8AA9C6", minWidth: 0, overflow: "hidden",
                             textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                vs. {antTexto ?? "período anterior"}
              </span>
            </>
          );
        })()}
      </div>

      <div style={{ marginTop: 10 }}><Sparkline valores={serie} cor={def.cor} /></div>

      <div style={{ fontSize: 10.5, color: "#8AA9C6", marginTop: 8 }}>{atual.base}</div>
    </div>
  );
}

/** Caixa miúda: um número e o denominador, sem curva nem Δ. */
export function CaixaSimples({ rotulo, medida, formato, cor, dica }: {
  rotulo: string; medida: Medida; formato: Formato; cor: string; dica?: string;
}) {
  const valor = formatar(medida.valor, formato);
  return (
    <div className="kpi-card" title={dica} style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: cor, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#B6CFE4", minWidth: 0,
                       overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rotulo}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em",
                    color: valor === null ? "#7E9DBB" : "#FFFFFF" }}>
        {valor ?? "sem base"}
      </div>
      <div style={{ fontSize: 10.5, color: "#8AA9C6", marginTop: 5 }}>{medida.base}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estrutura
// ─────────────────────────────────────────────────────────────────────────────

export function Bloco({ children, largo }: { children: ReactNode; largo?: boolean }) {
  return (
    <motion.div className="glass-card"
      style={{ padding: "20px 22px", gridColumn: largo ? "1 / -1" : undefined,
               display: "flex", flexDirection: "column" }}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {children}
    </motion.div>
  );
}

export function TituloBloco({ icone: Icone, titulo, sub, cor, acao }: {
  icone: any; titulo: string; sub: string; cor: string; acao?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${cor}1F`, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icone style={{ width: 14, height: 14, color: cor }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em" }}>{titulo}</div>
        <div style={{ fontSize: 11.5, color: "#B6CFE4", marginTop: 2, lineHeight: 1.45 }}>{sub}</div>
      </div>
      {acao && <div style={{ flexShrink: 0 }}>{acao}</div>}
    </div>
  );
}

export function VazioBloco({ texto }: { texto: string }) {
  return (
    <div style={{ padding: "30px 12px", textAlign: "center", display: "flex",
                  flexDirection: "column", alignItems: "center", gap: 8, flex: 1,
                  justifyContent: "center" }}>
      <Info style={{ width: 17, height: 17, color: "rgba(126,176,219,0.5)" }} aria-hidden="true" />
      <span style={{ fontSize: 12.5, color: "#B6CFE4", maxWidth: 320, lineHeight: 1.5 }}>{texto}</span>
    </div>
  );
}

export function Nota({ children, cor = "#F0A05A" }: { children: ReactNode; cor?: string }) {
  return (
    <div style={{ marginTop: 14, display: "flex", alignItems: "flex-start", gap: 7,
                  fontSize: 11, color: "#8AA9C6", lineHeight: 1.5 }}>
      <Info style={{ width: 12, height: 12, flexShrink: 0, color: cor, marginTop: 1 }} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function Secao({ children }: { children: ReactNode }) {
  return <div className="secao">{children}</div>;
}

/** Grade de blocos. Duas colunas no desktop, uma no celular. */
export function Grade({ children, colunas = 2, isMobile }: {
  children: ReactNode; colunas?: number; isMobile: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 16, alignItems: "stretch",
                  gridTemplateColumns: isMobile ? "1fr" : `repeat(${colunas},minmax(0,1fr))` }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Barras de categoria
// ─────────────────────────────────────────────────────────────────────────────

export interface ItemBarra {
  rotulo: string;
  /** O que desenha a barra. */
  valor: number;
  /** Texto à direita do rótulo — o valor formatado como o bloco quiser. */
  valorTexto: string;
  /** Linha de contexto abaixo da barra. */
  detalhe?: ReactNode;
  /** Título nativo, para o rótulo cortado por reticências. */
  dica?: string;
}

/**
 * Barras horizontais para categoria nominal — segmento, porte, motivo, cidade.
 *
 * Horizontal e não vertical porque nome de categoria é texto longo ("Indústria
 * Metalúrgica"), e em barra vertical o rótulo vira diagonal ou reticências.
 *
 * UMA cor para todas as barras, não uma cor por categoria. Categoria nominal
 * não tem ordem natural, então pintar cada barra de um tom diferente gastaria
 * o único canal livre repetindo o que o comprimento da barra já diz — e uma
 * rampa de cor sobre categoria sem ordem é justamente o erro que faz o leitor
 * procurar um significado que não existe. A ordenação é que carrega o ranking.
 */
export function BarrasCategoria({ itens, cor, vazio }: {
  itens: ItemBarra[]; cor: string; vazio: string;
}) {
  if (itens.length === 0) return <VazioBloco texto={vazio} />;
  const topo = Math.max(1, Math.max.apply(null, itens.map(i => i.valor)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      {itens.map(i => (
        <div key={i.rotulo}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 5 }}>
            <span title={i.dica || i.rotulo}
                  style={{ fontSize: 12.5, fontWeight: 700, color: "#FFFFFF", flex: 1, minWidth: 0,
                           overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {i.rotulo}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap",
                           color: i.valor > 0 ? "#FFFFFF" : "#7E9DBB" }}>
              {i.valorTexto}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 5, background: "rgba(126,176,219,0.10)", overflow: "hidden" }}>
            {/* Piso de 3% para categoria com valor pequeno mas não nulo não
                virar barra invisível — some ficaria igual a "não existe". */}
            <div style={{ height: "100%", background: cor, borderRadius: 5,
                          width: `${i.valor > 0 ? Math.max((i.valor / topo) * 100, 3) : 0}%`,
                          transition: "width 0.4s ease" }} />
          </div>
          {i.detalhe && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", marginTop: 5,
                          fontSize: 10.5, color: "#8AA9C6" }}>
              {i.detalhe}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabela
// ─────────────────────────────────────────────────────────────────────────────

export interface ColunaTabela<T> {
  chave: string;
  rotulo: string;
  /** Largura da coluna na grade CSS. A primeira costuma ser fracionária. */
  largura: string;
  alinha?: "left" | "right";
  render: (linha: T) => ReactNode;
  dica?: string;
}

/**
 * Tabela em grade CSS, no mesmo desenho das outras telas.
 *
 * `minWidth` no celular com rolagem horizontal própria: sem isso a grade
 * espreme as colunas até o número quebrar em duas linhas, e a página inteira
 * passa a rolar de lado.
 */
export function Tabela<T>({ colunas, linhas, chaveDe, larguraMinima = 760, vazio }: {
  colunas: ColunaTabela<T>[];
  linhas: T[];
  chaveDe: (l: T) => string;
  /** Abaixo disto a tabela rola de lado em vez de espremer as colunas. Vale
   *  no desktop também: dez colunas numa janela estreita quebram o número em
   *  duas linhas muito antes de o celular entrar em cena. */
  larguraMinima?: number;
  vazio: string;
}) {
  if (linhas.length === 0) return <VazioBloco texto={vazio} />;
  const grade = colunas.map(c => c.largura).join(" ");

  return (
    <div style={{ overflowX: "auto", margin: "0 -22px" }}>
      <div style={{ minWidth: larguraMinima, padding: "0 22px" }}>
        <div className="linha-tabela" style={{ display: "grid", gridTemplateColumns: grade, padding: "9px 0" }}>
          {colunas.map(c => (
            <span key={c.chave} title={c.dica}
                  style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
                           textTransform: "uppercase", color: "#B6CFE4",
                           textAlign: c.alinha === "right" ? "right" : "left" }}>
              {c.rotulo}
            </span>
          ))}
        </div>
        {linhas.map(l => (
          <div key={chaveDe(l)} className="linha-tabela"
               style={{ display: "grid", gridTemplateColumns: grade, padding: "11px 0" }}>
            {colunas.map(c => (
              <div key={c.chave} style={{ minWidth: 0, fontSize: 12,
                                          textAlign: c.alinha === "right" ? "right" : "left" }}>
                {c.render(l)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Número da tabela: cinza quando é zero, para o olho pular o que não importa. */
export function Num({ v, cor = "#DCE9F5", forte }: { v: ReactNode; cor?: string; forte?: boolean }) {
  const vazio = v === 0 || v === null || v === undefined || v === "—";
  return (
    <span style={{ color: vazio ? "#7E9DBB" : cor, fontWeight: forte ? 700 : 400,
                   fontVariantNumeric: "tabular-nums" }}>
      {vazio ? "—" : v}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Alternador "ver números"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Todo gráfico da tela tem um gêmeo em tabela.
 *
 * Não é enfeite: um gráfico onde o único jeito de ler o valor é passar o mouse
 * exclui quem usa teclado, quem usa leitor de tela e quem quer copiar o número
 * para outro lugar. O botão troca a mesma série entre desenho e tabela.
 */
export function VerNumeros({ ligado, aoTrocar }: { ligado: boolean; aoTrocar: () => void }) {
  return (
    <button type="button" onClick={aoTrocar} aria-pressed={ligado}
      title={ligado ? "Voltar ao gráfico" : "Ver os números em tabela"}
      style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px",
               borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600,
               border: `1px solid ${ligado ? "rgba(126,176,219,0.42)" : "rgba(126,176,219,0.18)"}`,
               background: ligado ? "#1A3F63" : "transparent",
               color: ligado ? "#FFFFFF" : "#B6CFE4" }}>
      <Table2 style={{ width: 13, height: 13 }} aria-hidden="true" />
      {ligado ? "Gráfico" : "Números"}
    </button>
  );
}

/** Estado do alternador acima, para o bloco não precisar declarar o `useState`. */
export function useVerNumeros(): [boolean, () => void] {
  const [ligado, setLigado] = useState(false);
  return [ligado, () => setLigado(v => !v)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Escala
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Varredura
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converte a posição horizontal do ponteiro para coordenadas do `viewBox`.
 *
 * O viewBox é fixo e o SVG escala por `width:100%` com a proporção preservada,
 * então a caixa renderizada mapeia linearmente no viewBox. O valor sai preso
 * entre as margens: com o cursor sobre a área do eixo, apontar para fora do
 * gráfico daria um índice inválido.
 */
export function posicaoNoViewBox(
  clientX: number, caixa: { left: number; width: number },
  larguraViewBox: number, margemEsquerda: number, margemDireita: number,
): number | null {
  if (!caixa.width) return null;
  const vx = ((clientX - caixa.left) / caixa.width) * larguraViewBox;
  return Math.min(Math.max(vx, margemEsquerda), larguraViewBox - margemDireita);
}

/**
 * Mês mais próximo, para série de LINHA.
 *
 * Os pontos ficam EM cima de `x(i)`, com o primeiro colado na margem esquerda e
 * o último na direita — então o mais próximo é o arredondamento, e as duas
 * pontas têm meia faixa de alcance. Usar `floor` aqui daria o mês anterior em
 * toda a metade esquerda de cada ponto.
 */
export function mesMaisProximo(vx: number, margemEsquerda: number, faixa: number, total: number): number {
  if (total <= 1 || faixa <= 0) return 0;
  return Math.min(Math.max(Math.round((vx - margemEsquerda) / faixa), 0), total - 1);
}

/**
 * Mês sob o cursor, para série de COLUNA.
 *
 * Aqui o mês ocupa uma faixa `[L + passo*i, L + passo*(i+1))`, e não um ponto —
 * então é `floor`, não `round`. Trocar um pelo outro acende a coluna vizinha em
 * metade do percurso, e o erro passa despercebido porque o desenho continua
 * plausível.
 */
export function mesSobCursor(vx: number, margemEsquerda: number, passo: number, total: number): number {
  if (total <= 0 || passo <= 0) return 0;
  return Math.min(Math.max(Math.floor((vx - margemEsquerda) / passo), 0), total - 1);
}

/** Marcas do eixo Y em números redondos, ~4 divisões. */
export function marcasEixo(maximo: number): number[] {
  if (maximo <= 0) return [0, 1];
  const bruto = maximo / 4;
  const expo = Math.floor(Math.log10(bruto));
  const base = Math.pow(10, expo);
  const n = bruto / base;
  const passo = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * base;
  const topo = Math.ceil(maximo / passo) * passo;
  const marcas: number[] = [];
  for (let v = 0; v <= topo + passo / 1000; v += passo) marcas.push(v);
  return marcas;
}

/** Rótulo da marca do eixo: valor encurtado só quando é dinheiro. */
export const rotuloEixo = (v: number, moeda: boolean) =>
  moeda ? brlEixo(v).replace("R$ ", "") : v.toLocaleString("pt-BR");
