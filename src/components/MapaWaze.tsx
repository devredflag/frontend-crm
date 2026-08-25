import type { Coordenadas } from "../hooks/useGeolocation";

// Mapa do Waze embutido via iframe oficial — apenas referência visual/contextual,
// centralizado na posição atual do usuário. Não há pins nem interação: a ação real
// (abrir navegação) acontece nos cards de empresa. Custo zero, sem API key.
export default function MapaWaze({
  posicao,
  zoom = 15,
  altura = 320,
}: {
  posicao: Coordenadas;
  zoom?: number;
  altura?: number;
}) {
  const src = `https://embed.waze.com/iframe?zoom=${zoom}&lat=${posicao.lat}&lon=${posicao.lon}`;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        border:"1px solid rgba(159,211,234,0.18)",
      }}
    >
      <iframe
        title="Mapa do Waze — sua localização atual"
        src={src}
        width="100%"
        height={altura}
        style={{ border:0, display: "block" }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <div
        style={{
          padding: "6px 12px",
          fontSize: 11,
          color:"#9FD3EA",
          background:"rgba(18,59,94,0.55)",
          borderTop:"1px solid rgba(159,211,234,0.18)",
        }}
      >
        Mapa apenas para referência da sua posição. Toque em uma empresa abaixo para abrir a rota no Waze.
      </div>
    </div>
  );
}
