// Dinheiro do CRM em um lugar so. A tela de vendas e a da empresa mostram os
// mesmos valores por angulos diferentes -- se cada uma formatar do seu jeito, o
// mesmo numero aparece com duas caras e parece divergencia de dado.

/** "R$ 12.500,00". `casas` = 0 quando o centavo so polui (KPI, tabela curta). */
export function brl(v?: number | string | null, casas = 2) {
  const n = Number(v || 0) || 0;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}`;
}

/** Versao curta, para KPI e grafico -- "R$ 1,2 mi", "R$ 48,7 mil". */
export function brlCurto(v?: number | string | null) {
  const n = Number(v || 0) || 0;
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return brl(n);
}

/**
 * Versao mais apertada ainda -- "R$ 1,2mi", "R$ 48,7k". Nasceu no eixo do
 * grafico de evolucao, onde o rotulo divide espaco com a grade e cada
 * caractere a mais empurra a curva. Difere de `brlCurto` so na largura, mas as
 * duas convivem de proposito: KPI le melhor com "mil", eixo le melhor com "k".
 * Aceita negativo (variacao mes a mes), que `brlCurto` nao trata.
 */
export function brlCompacto(v?: number | string | null) {
  const n = Number(v || 0) || 0;
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}mi`;
  if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}
