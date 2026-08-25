/**
 * Fundo azul com grade geométrica fina e brilho de luz suave.
 *
 * Vem do HTML de referência do usuário (22/08/2026), reproduzido camada por
 * camada, de cima para baixo: grade horizontal, grade vertical, elipse de luz
 * e o gradiente de base. O `::after` do original virou o div interno.
 *
 * É a fonte única do fundo do site — ajuste aqui e todas as telas mudam junto.
 */
const CAMADAS = [
  "linear-gradient(rgba(159,211,234,0.12) 1px, transparent 1px)",
  "linear-gradient(90deg, rgba(159,211,234,0.12) 1px, transparent 1px)",
  "radial-gradient(ellipse 800px 500px at 70% 20%, #2E6F95, transparent 60%)",
  "linear-gradient(150deg, #0A2540, #123B5E)",
].join(",");

/** Para telas em que o fundo é do próprio container, sem camada separada. */
export const FUNDO_AZUL = {
  background: CAMADAS,
  backgroundSize: "44px 44px, 44px 44px, cover, cover",
};

export default function FundoAzul() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        background: CAMADAS,
        backgroundSize: "44px 44px, 44px 44px, cover, cover",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 30% 80%, rgba(159,211,234,0.35), transparent 45%)",
        }}
      />
    </div>
  );
}
