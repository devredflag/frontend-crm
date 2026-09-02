// Dinheiro do CRM em um lugar so. A tela de vendas e a da empresa mostram os
// mesmos valores por angulos diferentes -- se cada uma formatar do seu jeito, o
// mesmo numero aparece com duas caras e parece divergencia de dado.
//
// ── Por que nao existe mais forma "compacta" ────────────────────────────────
// Ate 01/09/2026 havia `brlCurto` e `brlCompacto`, que encolhiam o numero para
// "R$ 1,2 mi". Isso descarta informacao: R$ 1.234.567 e R$ 1.249.999 viravam o
// MESMO texto. Enquanto era enfeite de card passava; a partir do momento em que
// esses numeros viraram metrica de acompanhamento, o arredondamento estraga a
// conta -- quem le "15 mil" nao tem como saber que eram 14,9 mil.
//
// As duas funcoes continuam existindo com os nomes antigos, porque sao dezenas
// de pontos de chamada, mas as duas devolvem o valor EXATO. Nao volte a
// arredondar aqui: use `brlEixo`, que existe para o unico caso onde encurtar e
// legitimo (rotulo de escala de grafico, onde o numero ja e redondo por
// construcao e o espaco e fixo).

/** "R$ 12.500,00". `casas` = 0 quando o centavo so polui (KPI, tabela curta). */
export function brl(v?: number | string | null, casas = 2) {
  const n = Number(v || 0) || 0;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}`;
}

/** Valor exato. Mantido pelo nome por causa dos pontos de chamada — ver acima. */
export function brlCurto(v?: number | string | null) {
  return brl(v);
}

/** Valor exato. Mantido pelo nome por causa dos pontos de chamada — ver acima. */
export function brlCompacto(v?: number | string | null) {
  return brl(v);
}

/**
 * Rotulo de ESCALA de grafico -- "R$ 1,2mi", "R$ 48,7k".
 *
 * Unico lugar onde encurtar e correto, por dois motivos: o valor ja e redondo
 * por construcao (as marcas do eixo saem de `marcasEixo`, que devolve 0, 250k,
 * 500k...), entao nao ha precisao a perder; e a largura do eixo e fixa, entao o
 * valor por extenso sairia do desenho. NUNCA use isto para mostrar um valor
 * medido -- para isso existe `brl`.
 */
export function brlEixo(v?: number | string | null) {
  const n = Number(v || 0) || 0;
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}mi`;
  if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}
