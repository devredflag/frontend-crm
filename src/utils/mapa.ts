// Mapa e roteamento — tudo em serviço aberto, sem API key e sem consumir cota
// paga. Leaflet + OpenStreetMap para desenhar, OSRM para rota por ruas.
//
// Este arquivo existe porque `loadLeaflet` e `rotaOSRM` nasceram dentro do
// MapaProximidade e agora servem também ao planejador de rota. Duas cópias do
// carregador de Leaflet significariam duas tags <script> disputando a mesma
// global `window.L` — e este projeto já tem histórico de bug por lógica
// duplicada (a tabela repetida de /clientes e /cadastro).

declare global {
  interface Window { L: any }
}

// ── Leaflet via CDN ─────────────────────────────────────────────────────────
// Carregado sob demanda para não exigir npm install nem entrar no bundle.
let leafletPromise: Promise<any> | null = null;

export function loadLeaflet(): Promise<any> {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector("link[data-leaflet]")) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      css.setAttribute("data-leaflet", "1");
      document.head.appendChild(css);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Falha ao carregar o mapa"));
    document.body.appendChild(script);
  });
  return leafletPromise;
}

export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export interface LatLng { lat: number; lng: number }

/** Coordenada no formato do Leaflet: [lat, lng]. O OSRM devolve o inverso. */
export type Coord = [number, number];

// ── Geometria ───────────────────────────────────────────────────────────────

const R_TERRA = 6371;
const rad = (g: number) => (g * Math.PI) / 180;

/** Distância em km entre dois pontos (Haversine). Puro cálculo, sem rede. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TERRA * Math.asin(Math.sqrt(h));
}

/**
 * Distância em km de um ponto até o segmento a–b.
 *
 * Projeção equirretangular: nas dezenas/centenas de km de uma viagem de carro o
 * erro é desprezível, e ela permite usar geometria plana — calcular projeção em
 * coordenada esférica seria caro e não mudaria a decisão de "passa perto ou
 * não". O cosseno da latitude corrige o encolhimento do grau de longitude.
 */
function distanciaAteSegmentoKm(p: LatLng, a: LatLng, b: LatLng): number {
  const kx = 111.32 * Math.cos(rad((a.lat + b.lat) / 2));
  const ky = 110.57;
  const px = p.lng * kx, py = p.lat * ky;
  const ax = a.lng * kx, ay = a.lat * ky;
  const bx = b.lng * kx, by = b.lat * ky;

  const dx = bx - ax, dy = by - ay;
  const comprimento = dx * dx + dy * dy;
  // Segmento degenerado (dois pontos iguais na geometria da rota).
  if (comprimento === 0) return Math.hypot(px - ax, py - ay);

  // t fora de [0,1] significa que o ponto mais próximo é uma das pontas — é o
  // que faz o corredor virar meia-lua nas extremidades, incluindo quem está
  // ALÉM do destino dentro do raio.
  let t = ((px - ax) * dx + (py - ay) * dy) / comprimento;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Menor distância em km de um ponto até a linha da rota.
 *
 * Amostra a geometria em vez de varrer ponto a ponto: o OSRM com
 * `overview=full` devolve milhares de vértices para uma viagem longa, e testar
 * todos multiplicaria por N o custo de cada empresa sem mudar o resultado — os
 * vértices extras descrevem curvas de rua, não desvios de quilômetros.
 */
export function distanciaAteRotaKm(p: LatLng, rota: Coord[], passo = 1): number {
  if (rota.length === 0) return Infinity;
  if (rota.length === 1) return haversineKm(p, { lat: rota[0][0], lng: rota[0][1] });

  let menor = Infinity;
  for (let i = 0; i + passo < rota.length; i += passo) {
    const a = { lat: rota[i][0], lng: rota[i][1] };
    const j = Math.min(i + passo, rota.length - 1);
    const b = { lat: rota[j][0], lng: rota[j][1] };
    const d = distanciaAteSegmentoKm(p, a, b);
    if (d < menor) menor = d;
  }
  return menor;
}

// ── Rota por ruas (OSRM) ────────────────────────────────────────────────────

export interface Rota {
  coords: Coord[];
  km: number;
  min: number;
}

const OSRM = "https://router.project-osrm.org/route/v1/driving";

/**
 * Rota viária passando por todos os pontos, na ordem dada.
 *
 * Dois ou mais pontos: com três, o do meio vira parada — é assim que sai o
 * custo do desvio (`A→C→B` menos `A→B`).
 *
 * `overview` fica em "full" só para a rota que vai ser DESENHADA. Para medir
 * quilometragem, "simplified" devolve a mesma distância com uma fração dos
 * vértices, e é o que se usa ao avaliar candidatos em série.
 *
 * Devolve null em qualquer falha em vez de lançar: é um servidor público de
 * demonstração, sem SLA, e a tela precisa continuar de pé com o resultado
 * aproximado (linha reta) quando ele não responde.
 */
export async function rotaOSRM(
  pontos: LatLng[],
  opcoes: { overview?: "full" | "simplified"; signal?: AbortSignal } = {}
): Promise<Rota | null> {
  if (pontos.length < 2) return null;
  const { overview = "full", signal } = opcoes;
  try {
    const caminho = pontos.map(p => `${p.lng},${p.lat}`).join(";");
    const res = await fetch(
      `${OSRM}/${caminho}?overview=${overview}&geometries=geojson`,
      { signal }
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (d.code !== "Ok" || !d.routes?.length) return null;
    const r = d.routes[0];
    return {
      coords: (r.geometry?.coordinates || []).map((c: [number, number]) => [c[1], c[0]] as Coord),
      km: r.distance / 1000,
      min: r.duration / 60,
    };
  } catch {
    return null;
  }
}
