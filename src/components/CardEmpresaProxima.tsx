import { Navigation, MapPin } from "lucide-react";
import { formatarDistancia } from "../utils/distancia";
import type { EmpresaProxima } from "../hooks/useEmpresasProximas";

function tempCor(t?: string) {
  if (t === "Quente") return "#e74c3c";
  if (t === "Morno") return "#e67e22";
  if (t === "Frio") return "#2980b9";
  return "#7f8c9a";
}

// Monta o Waze Deep Link com o destino na empresa. A origem fica por conta
// do GPS do dispositivo — o Waze resolve automaticamente, não enviamos a posição.
function wazeUrl(lat: number, lon: number): string {
  return `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
}

// Card inteiro clicável → abre o Waze já navegando até a empresa.
export default function CardEmpresaProxima({ empresa }: { empresa: EmpresaProxima }) {
  const endereco = empresa.endereco_completo || empresa.endereco || empresa.cidade || "Endereço não informado";
  const cor = tempCor(empresa.temperatura);

  const abrirWaze = () => {
    const url = wazeUrl(Number(empresa.latitude), Number(empresa.longitude));
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={abrirWaze}
      title={`Abrir rota até ${empresa.nome} no Waze`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        textAlign: "left",
        padding: "14px 16px",
        borderRadius: 14,
        border: "1px solid rgba(200,225,240,0.8)",
        background: "rgba(255,255,255,0.78)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(41,128,185,0.06)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.78)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: cor,
          flexShrink: 0,
          border: "1.5px solid #fff",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: "#0f2133",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {empresa.nome}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            color: "rgba(20,45,70,0.55)",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <MapPin style={{ width: 12, height: 12, flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{endereco}</span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 800, color: "#2980b9" }}>
          {formatarDistancia(empresa.distanciaKm)}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
            color: "#1abc9c",
          }}
        >
          <Navigation style={{ width: 12, height: 12 }} /> Waze
        </span>
      </div>
    </button>
  );
}
