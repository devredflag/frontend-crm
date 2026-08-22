import { Navigation, Crosshair, AlertTriangle, RefreshCw, Building2 } from "lucide-react";
import useGeolocation, { mensagemErroGeo } from "../hooks/useGeolocation";
import useEmpresasProximas, { EmpresaComGeo } from "../hooks/useEmpresasProximas";
import MapaWaze from "./MapaWaze";
import CardEmpresaProxima from "./CardEmpresaProxima";

// Orquestra a feature "Empresas próximas":
// 1) botão Localizar → Geolocation API
// 2) lista de cards ordenada por distância (Haversine, no cliente)
// 3) mapa do Waze (iframe) como referência visual
// 4) clique no card → Waze Deep Link com a navegação iniciada
//
// Sem nenhuma API paga de mapas/rotas e responsivo para uso em campo (mobile).
export default function ListaEmpresasProximas({
  empresas,
  limite = 20,
}: {
  empresas: EmpresaComGeo[];
  limite?: number;
}) {
  const { posicao, carregando, erro, localizar } = useGeolocation();
  const proximas = useEmpresasProximas(empresas, posicao, limite);

  // Estado inicial: ainda não localizou
  if (!posicao && !carregando && !erro) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 8,
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#EFF4FE",
          }}
        >
          <Navigation style={{ width: 26, height: 26, color: "#2563EB" }} />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#16191D" }}>Empresas próximas de você</h3>
        <p style={{ fontSize: 13, color: "#5B6570", marginTop: 6, maxWidth: 420, margin: "6px auto 0" }}>
          Use sua localização atual para listar as empresas cadastradas mais próximas e abrir a rota no Waze com um toque.
        </p>
        <button onClick={localizar} style={botaoPrimario}>
          <Crosshair style={{ width: 16, height: 16 }} /> Localizar
        </button>
      </div>
    );
  }

  // Carregando posição
  if (carregando) {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px", color: "#5B6570" }}>
        <Crosshair style={{ width: 24, height: 24, color: "#2563EB", animation: "pulseDraft 1.2s ease infinite" }} />
        <p style={{ fontSize: 13, fontWeight: 600, marginTop: 12 }}>Obtendo sua localização...</p>
      </div>
    );
  }

  // Erro de geolocalização
  if (erro) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <AlertTriangle style={{ width: 28, height: 28, color: "#8A5A00", margin: "0 auto" }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: "#b9651a", marginTop: 12, maxWidth: 440, marginInline: "auto" }}>
          {mensagemErroGeo(erro)}
        </p>
        <button onClick={localizar} style={botaoPrimario}>
          <RefreshCw style={{ width: 15, height: 15 }} /> Tentar novamente
        </button>
      </div>
    );
  }

  // Posição obtida
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {posicao && <MapaWaze posicao={posicao} />}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#5B6570" }}>
          {proximas.length} empresa{proximas.length !== 1 ? "s" : ""} próxima{proximas.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={localizar}
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            height: 32,
            padding: "0 12px",
            borderRadius: 8,
            border: "1px solid #E3E6E9",
            background: "#ffffff",
            color: "#2563EB",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Crosshair style={{ width: 14, height: 14 }} /> Atualizar localização
        </button>
      </div>

      {proximas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 20px", color: "#5B6570" }}>
          <Building2 style={{ width: 26, height: 26, color: "#5B6570", margin: "0 auto" }} />
          <p style={{ fontSize: 13, fontWeight: 600, marginTop: 10 }}>
            Nenhuma empresa com localização cadastrada foi encontrada por perto.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {proximas.map((emp) => (
            <CardEmpresaProxima key={emp.empresa_id} empresa={emp} />
          ))}
        </div>
      )}
    </div>
  );
}

const botaoPrimario: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 40,
  padding: "0 20px",
  marginTop: 18,
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  background: "#2563EB",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  boxShadow:"none",
};
