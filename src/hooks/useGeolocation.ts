import { useCallback, useState } from "react";

// Hook de captura da localização do usuário via Geolocation API nativa.
// Não persiste nem loga coordenadas (LGPD) — apenas mantém em memória durante a sessão.

export interface Coordenadas {
  lat: number;
  lon: number;
}

export type ErroGeolocalizacao =
  | "negada"
  | "indisponivel"
  | "timeout"
  | "sem-suporte";

interface EstadoGeolocalizacao {
  posicao: Coordenadas | null;
  carregando: boolean;
  erro: ErroGeolocalizacao | null;
}

const MENSAGENS: Record<ErroGeolocalizacao, string> = {
  negada:
    "Permissão de localização negada. Habilite o acesso à localização nas configurações do navegador para ver as empresas próximas.",
  indisponivel:
    "Não foi possível obter sua localização. Verifique o GPS/conexão e tente novamente.",
  timeout: "A localização demorou demais para responder. Tente novamente.",
  "sem-suporte": "Seu navegador não tem suporte a geolocalização.",
};

export function mensagemErroGeo(erro: ErroGeolocalizacao): string {
  return MENSAGENS[erro];
}

export default function useGeolocation() {
  const [estado, setEstado] = useState<EstadoGeolocalizacao>({
    posicao: null,
    carregando: false,
    erro: null,
  });

  const localizar = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setEstado({ posicao: null, carregando: false, erro: "sem-suporte" });
      return;
    }

    setEstado((s) => ({ ...s, carregando: true, erro: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEstado({
          posicao: { lat: pos.coords.latitude, lon: pos.coords.longitude },
          carregando: false,
          erro: null,
        });
      },
      (err) => {
        let erro: ErroGeolocalizacao = "indisponivel";
        if (err.code === err.PERMISSION_DENIED) erro = "negada";
        else if (err.code === err.TIMEOUT) erro = "timeout";
        setEstado({ posicao: null, carregando: false, erro });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  return { ...estado, localizar };
}
