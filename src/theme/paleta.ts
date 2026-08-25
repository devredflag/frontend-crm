/**
 * Paleta do CRM.
 *
 * Os valores vieram do screenshot de referência do usuário
 * (`Captura de tela 2026-08-23 185737.png`), amostrando o pixel de cada
 * elemento — fundo, sidebar, card, botão, sparkline — em vez de estimar no olho.
 *
 * Aplicada por enquanto em `/dashboard`. As demais telas entram uma a uma;
 * quando todas estiverem migradas, este arquivo passa a ser a fonte única
 * e os literais somem.
 */
export const P = {
  /* Superfícies, do fundo para a frente. */
  fundo: "#0A2338",          // canvas atrás de tudo
  barra: "#0F2E4B",          // sidebar, topbar, painel de notificações
  superficie: "#143354",     // card
  superficieAlta: "#1A3F63", // card em hover, campo elevado

  /* Traços. */
  borda: "rgba(126,176,219,0.16)",
  bordaForte: "rgba(126,176,219,0.30)",
  hover: "rgba(126,176,219,0.08)",

  /* Texto. */
  texto: "#FFFFFF",
  textoSuave: "#B6CFE4",

  /* Acentos — no funil vão de azul (início) a verde (fechado). */
  azul: "#56A4F5",     // ação, links, etapas iniciais
  verde: "#2CCD93",    // botão primário, positivo, fechado
  laranja: "#F0A05A",  // atenção, etapas do meio
  vermelho: "#F87171", // erro, badge do sino
  roxo: "#A78BFA",     // rascunho

  /* Sombra: azul escuro, não preto — preto suja o fundo naval. */
  sombra: "rgba(3,14,26,0.45)",
} as const;
