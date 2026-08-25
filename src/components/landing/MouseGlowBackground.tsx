import FundoAzul from "../FundoAzul";

/**
 * Mantido com o nome antigo porque quatro telas o importam.
 * Antes: dois brilhos que seguiam o cursor sobre gradiente claro, pontos e grade.
 * Agora: delega para o fundo azul único do site (src/components/FundoAzul.tsx).
 */
export default function MouseGlowBackground() {
  return <FundoAzul />;
}
