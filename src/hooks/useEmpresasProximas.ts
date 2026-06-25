import { useMemo } from "react";
import { calcularDistanciaKm } from "../utils/distancia";
import type { Coordenadas } from "./useGeolocation";

// Empresa com dados mínimos de geolocalização para o cálculo de proximidade.
export interface EmpresaComGeo {
  empresa_id: string;
  nome: string;
  segmento?: string;
  cidade?: string;
  endereco?: string | null;
  endereco_completo?: string | null;
  temperatura?: string;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface EmpresaProxima extends EmpresaComGeo {
  distanciaKm: number;
}

// Calcula a distância do usuário até cada empresa com coordenadas válidas
// e devolve a lista ordenada da mais próxima para a mais distante.
// Tudo no cliente, via Haversine — nenhuma chamada a API de mapas/rotas.
export default function useEmpresasProximas(
  empresas: EmpresaComGeo[],
  posicao: Coordenadas | null,
  limite = 20
): EmpresaProxima[] {
  return useMemo(() => {
    if (!posicao) return [];
    return empresas
      .map((emp) => ({ emp, lat: Number(emp.latitude), lon: Number(emp.longitude) }))
      .filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lon) &&
          (p.lat !== 0 || p.lon !== 0)
      )
      .map(({ emp, lat, lon }) => ({
        ...emp,
        distanciaKm: calcularDistanciaKm(posicao.lat, posicao.lon, lat, lon),
      }))
      .sort((a, b) => a.distanciaKm - b.distanciaKm)
      .slice(0, limite);
  }, [empresas, posicao, limite]);
}
