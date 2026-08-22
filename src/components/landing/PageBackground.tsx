/**
 * Fundo de página. Antes era MouseGlowBackground: dois brilhos que seguiam o
 * cursor, sobre gradiente, malha de pontos e grade.
 * O DESIGN.md descarta fundo decorativo — o fundo é canvas sólido.
 */
export default function PageBackground() {
  return <div className="absolute inset-0" style={{ background: "#F6F7F8" }} />;
}
