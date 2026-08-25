import { Navigation, MapPin } from "lucide-react";
import { formatarDistancia } from "../utils/distancia";
import type { EmpresaProxima } from "../hooks/useEmpresasProximas";

function tempCor(t?: string) {
  if (t === "Quente") return "#F7B8B1";
  if (t === "Morno") return "#F2C879";
  if (t === "Frio") return "#9FD3EA";
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
        border:"1px solid rgba(159,211,234,0.18)",
        background:"rgba(18,59,94,0.55)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(41,128,185,0.06)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(18,59,94,0.55)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background:cor,
          flexShrink: 0,
          border:"1.5px solid rgba(159,211,234,0.18)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color:"#EAF6FB",
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
            color:"#9FD3EA",
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
        <span style={{ fontSize: 13, fontWeight: 800, color:"#9FD3EA" }}>
          {formatarDistancia(empresa.distanciaKm)}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
            color:"#9FD3EA",
          }}
        >
          <Navigation style={{ width: 12, height: 12 }} /> Waze
        </span>
      </div>
    </button>
  );
}
