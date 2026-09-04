// Mapa e roteamento — tudo em serviço aberto, sem API key e sem consumir cota
// paga. Leaflet + OpenStreetMap para desenhar, OSRM para rota por ruas.
//
// Este arquivo existe porque `loadLeaflet` e `rotaOSRM` nasceram dentro do
// MapaProximidade e agora servem também ao planejador de rota. Duas cópias do
// carregador de Leaflet significariam duas tags <script> disputando a mesma
// global `window.L` — e este projeto já tem histórico de bug por lógica
// duplicada (a tabela repetida de /clientes e /cadastro).

import { API_BASE, getToken } from "../services/auth";

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

// ── Tiles ───────────────────────────────────────────────────────────────────
//
// `tile.openstreetmap.org` proíbe uso comercial pesado e bloqueia por
// User-Agent/Referer sem aviso. É o ponto de falha mais brusco da tela: quando
// cai, derruba o mapa inteiro de uma vez, sem degradar aos poucos — diferente
// do OSRM, que só deixa de traçar a rota.
//
// A troca de provedor fica por variável de ambiente porque MapTiler e Stadia
// (os dois com tier gratuito para uso comercial leve, sem cartão) só servem
// tile com chave ou domínio autorizado, e a chave é de quem tem a conta.
//
//   REACT_APP_TILE_URL   template do provedor; `{key}` é substituído
//   REACT_APP_TILE_KEY   a chave, quando o provedor exigir uma na URL
//
// O padrão já é o Stadia OSM Bright (ver TILE_PADRAO abaixo); a variável só é
// necessária para FUGIR dele. Exemplo, trocando para o estilo claro discreto:
//   REACT_APP_TILE_URL=https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png
//
// ATENÇÃO: se esta variável existir no painel, ela VENCE o padrão do código.
// Um valor antigo esquecido lá continua mandando mesmo depois de o código
// mudar — para voltar ao padrão, apague a variável, não basta editar o código.
//
// ATENÇÃO: em CRA toda REACT_APP_* vai no bundle público. Se o provedor exigir
// chave na URL, ela precisa ser restrita por domínio no painel dele — sem isso
// é utilizável por qualquer um que abrir o DevTools. Provedor com autenticação
// por domínio (Stadia) dispensa a chave e é preferível por isso.
const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Atribuição por provedor, deduzida da própria URL dos tiles.
 *
 * Mora no código e NÃO em variável de ambiente, de propósito. É texto fixo que
 * a licença de cada provedor obriga a exibir, cheio de aspas, `&` e HTML —
 * exatamente o tipo de valor que chega corrompido ao passar por um campo de
 * painel (já chegou: `&copy;` virou `copy;` e `<a href=` virou `<ahref=`).
 * Atribuição quebrada é descumprimento de licença, não defeito de estilo, e
 * não pode depender de alguém colar HTML certo num formulário.
 */
const ATRIBUICOES: { provedor: RegExp; texto: string }[] = [
  {
    provedor: /stadiamaps\.com/i,
    texto:
      '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noopener">Stadia Maps</a> ' +
      '&copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' +
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  },
  {
    provedor: /maptiler\.com/i,
    texto:
      '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">MapTiler</a> ' +
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  },
  {
    provedor: /cartocdn\.com/i,
    texto:
      '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a> ' +
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  },
];

/**
 * Provedor padrão: Stadia OSM Bright.
 *
 * Fica no código, e não só em variável de ambiente, por dois motivos. O
 * primeiro é que a variável não comprava nada: em CRA ela é embutida no build,
 * então trocá-la já exigia um deploy — o mesmo que trocar esta linha. O
 * segundo é que o `tile.openstreetmap.org` não deveria ser o padrão de um
 * produto comercial: a política dele não cobre este uso, e o bloqueio chega
 * como HTTP 200 com uma imagem escrita "Access blocked", sem erro nenhum para
 * o código perceber.
 *
 * Não leva chave: o Stadia autentica pelo domínio, lendo Origin/Referer que o
 * navegador manda sozinho. `localhost` e `127.0.0.1` são liberados por padrão.
 *
 * A variável de ambiente continua valendo como override, para trocar de estilo
 * ou de provedor sem mexer em código.
 */
const TILE_PADRAO = "https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png";

const tileTemplate = process.env.REACT_APP_TILE_URL || TILE_PADRAO;
const tileKey = process.env.REACT_APP_TILE_KEY;

// Template que pede chave sem chave configurada volta ao OSM em vez de montar
// uma URL quebrada. Um mapa cinza por variável meio preenchida seria a mesma
// falha que a troca de provedor existe para evitar.
const tilePronto = !!tileTemplate && (!tileTemplate.includes("{key}") || !!tileKey);

export const TILE_URL = tilePronto
  ? tileTemplate!.replace("{key}", tileKey || "")
  : OSM_URL;

export const TILE_ATTR = tilePronto
  ? (ATRIBUICOES.find(a => a.provedor.test(TILE_URL))?.texto ?? OSM_ATTR)
  : OSM_ATTR;

/**
 * Adiciona a camada de tiles ao mapa, com retorno ao OSM se o provedor falhar.
 *
 * Existe porque autenticação por domínio recusa origem não cadastrada, e o
 * caso concreto é o preview da Vercel: cada deploy ganha um subdomínio novo,
 * nenhum deles autorizado no painel do provedor. Sem isto, preview abriria com
 * o mapa em branco. Cobre também o provedor fora do ar.
 *
 * O Leaflet não distingue 401 de servidor caído — nos dois casos o tile
 * simplesmente não carrega —, e nem precisa: a resposta é a mesma. Espera
 * alguns erros antes de trocar porque um tile perdido em rede ruim é normal, e
 * trocar de provedor no primeiro soluço faria o mapa piscar à toa.
 */
export function criarCamadaDeTiles(L: any, map: any) {
  const camada = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(map);
  if (TILE_URL === OSM_URL) return camada;

  let erros = 0;
  camada.on("tileerror", () => {
    if (++erros < 4) return;
    camada.off("tileerror");
    if (map.hasLayer(camada)) map.removeLayer(camada);
    L.tileLayer(OSM_URL, { maxZoom: 19, attribution: OSM_ATTR }).addTo(map);
    console.warn("[mapa] provedor de tiles nao respondeu; voltando para o OpenStreetMap");
  });
  return camada;
}

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

// ── Rota por ruas (OSRM, pelo nosso backend) ────────────────────────────────
//
// Estas funções falavam direto com `router.project-osrm.org`. Passaram a sair
// pelo backend por um motivo que não é organização de código: o demo público do
// OSRM aceita 1 req/s e bloqueia por ENDEREÇO IP, não por aba. Throttle no
// cliente não garante nada — duas abas abertas já são 2 req/s. Com tudo saindo
// do backend existe uma torneira só, e ela é de verdade (main.py, /geo/rota e
// /geo/matriz).
//
// Consequência a conhecer: rota agora exige sessão válida. Sem token a chamada
// volta 401, estas funções devolvem null, e quem chama já trata null caindo
// para linha reta — o mesmo caminho de quando o OSRM está fora do ar.

export interface Rota {
  coords: Coord[];
  km: number;
  min: number;
}

/**
 * Matriz de distância/tempo entre todos os pontos, numa chamada só.
 *
 * `distanciasKm[i][j]` é de i até j, e **não é simétrica** — mão única faz a
 * ida diferir da volta. `null` numa célula é par sem rota, não distância zero.
 */
export interface Matriz {
  distanciasKm: (number | null)[][];
  duracoesMin: (number | null)[][];
}

const pontosParam = (pontos: LatLng[]) =>
  pontos.map(p => `${p.lng},${p.lat}`).join(";");

// ── Cache de sessão ─────────────────────────────────────────────────────────
// O backend também tem cache, mas ele só evita a chamada ao OSRM; a viagem até
// o Railway continua acontecendo. Este aqui evita a viagem inteira, que é o que
// o usuário sente ao mexer no raio ou repor uma parada que acabou de tirar.
//
// A chave arredonda a 5 casas (~1 m) pelo mesmo motivo do backend: GPS e hover
// trazem ruído nas últimas casas e gerariam chave nova a cada passada.
const chaveDe = (pontos: LatLng[], sufixo: string) =>
  sufixo + "|" + pontos.map(p => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");

const cache = new Map<string, any>();
const emVoo = new Map<string, Promise<any>>();

/**
 * Busca com cache, deduplicação e proteção contra resposta obsoleta.
 *
 * Sobre o `signal`: ele NÃO é repassado ao fetch, de propósito. Duas chamadas
 * iguais compartilham uma requisição só, e se o sinal de uma fosse para o fetch
 * compartilhado, o cancelamento de um componente derrubaria o resultado do
 * outro. O que o item de "cancelar requisições obsoletas" precisa garantir é
 * que uma resposta velha não sobrescreva a rota certa — e isso é garantido
 * aqui, no retorno: quem já foi cancelado recebe null e não escreve nada. É
 * mais confiável do que depender do cancelamento chegar a tempo, porque uma
 * resposta já em trânsito no momento do abort ainda seria entregue.
 */
async function pedir<T>(chave: string, url: string, signal?: AbortSignal): Promise<T | null> {
  if (cache.has(chave)) return signal?.aborted ? null : (cache.get(chave) as T);

  let voo = emVoo.get(chave);
  if (!voo) {
    voo = (async () => {
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    })().finally(() => emVoo.delete(chave));
    emVoo.set(chave, voo);
  }

  const dados = await voo;
  if (dados !== null && dados !== undefined) cache.set(chave, dados);
  return signal?.aborted ? null : (dados as T | null);
}

/**
 * Rota viária passando por todos os pontos, na ordem dada.
 *
 * `overview` fica em "full" só para a rota que vai ser DESENHADA. Para medir
 * quilometragem, "simplified" devolve a mesma distância com uma fração dos
 * vértices.
 *
 * Devolve null em qualquer falha em vez de lançar: o OSRM é servidor público
 * sem SLA, e a tela precisa continuar de pé com o resultado aproximado (linha
 * reta) quando ele não responde.
 */
export async function rotaOSRM(
  pontos: LatLng[],
  opcoes: { overview?: "full" | "simplified"; signal?: AbortSignal } = {}
): Promise<Rota | null> {
  if (pontos.length < 2) return null;
  const { overview = "full", signal } = opcoes;
  const url = `${API_BASE}/geo/rota?pontos=${encodeURIComponent(pontosParam(pontos))}&overview=${overview}`;
  const d = await pedir<any>(chaveDe(pontos, `rota:${overview}`), url, signal);
  if (!d || !Array.isArray(d.coords)) return null;
  return { coords: d.coords as Coord[], km: d.km, min: d.min };
}

/**
 * Matriz entre todos os pontos — uma chamada no lugar de N.
 *
 * É o que permite medir o desvio de cada candidato do corredor sem uma
 * requisição por candidato: com a matriz em mãos, tanto o desvio quanto a
 * melhor posição de inserção saem de aritmética local.
 *
 * O teto de 100 coordenadas é do próprio OSRM demo (verificado: 100 passa, 120
 * volta `TooBig`). Quem chama precisa cortar antes — aqui só devolvemos null,
 * porque truncar por conta própria devolveria uma matriz que não corresponde à
 * lista que o chamador acha que mandou.
 */
export const MAX_PONTOS_MATRIZ = 100;

export async function matrizOSRM(
  pontos: LatLng[],
  opcoes: { signal?: AbortSignal } = {}
): Promise<Matriz | null> {
  if (pontos.length < 2 || pontos.length > MAX_PONTOS_MATRIZ) return null;
  const url = `${API_BASE}/geo/matriz?pontos=${encodeURIComponent(pontosParam(pontos))}`;
  const d = await pedir<any>(chaveDe(pontos, "matriz"), url, opcoes.signal);
  if (!d || !Array.isArray(d.distancias_km)) return null;
  return { distanciasKm: d.distancias_km, duracoesMin: d.duracoes_min };
}
