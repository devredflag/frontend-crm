import { useState, useEffect, useMemo, useRef, useReducer, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  X, MapPin, Building2, Crosshair, Search, Loader2,
  Route as RouteIcon, AlertTriangle, Flag, Plus, RefreshCw,
  Minus, Wand2, GripVertical, CornerUpLeft,
} from "lucide-react";

import { getToken } from "../services/auth";
import {
  loadLeaflet, rotaOSRM, matrizOSRM, distanciaAteRotaKm,
  TILE_URL, TILE_ATTR, MAX_PONTOS_MATRIZ,
  type LatLng, type Coord, type Rota, type Matriz,
} from "../utils/mapa";
import {
  MAX_PARADAS, melhorInsercao, custoNaPosicao, ordemOtima, mover,
} from "../utils/rota";
import { formatarDistancia } from "../utils/distancia";
import Dropdown from "./Dropdown";
import type { EmpresaComGeo } from "../hooks/useEmpresasProximas";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

// ─────────────────────────────────────────────────────────────────────────────
// Planejador de rota — "o que dá para encaixar nesta viagem?"
//
// A pergunta que ele responde não é "quem está perto de mim", que a aba
// Próximas já responde. É: eu vou de A até B de qualquer jeito; quem está no
// caminho, quanto custa parar lá, e como fica o trajeto se eu parar.
//
// Custo: ZERO em API paga. Leaflet + OpenStreetMap para desenhar, OSRM para
// rota e matriz, Nominatim para endereço digitado — os dois últimos pelo nosso
// backend, que é onde mora a fila de 1 req/s. Nenhuma chamada ao Google Places,
// então a cota mensal não é tocada.
//
// O volume de chamadas importa mesmo sem custo, e o trabalho está separado em
// camadas por causa disso:
//
//   1 chamada  — a rota desenhada (origem → paradas → destino). Refaz quando a
//                sequência muda.
//   1 chamada  — a matriz de distâncias entre TODOS os pontos envolvidos. Dela
//                sai o desvio de cada candidato e a ordem ótima, sem rede.
//   0 chamadas — o corredor, o desvio de cada candidato, a melhor posição de
//                inserção e a ordem ótima. Tudo aritmética sobre o que já veio.
//
// Era uma chamada de /route por candidato, até 12 em rajada, só para descobrir
// o custo do desvio de cada um. A matriz substitui isso inteiro.
// ─────────────────────────────────────────────────────────────────────────────

/** Quantos candidatos entram na matriz. O teto do OSRM demo é 100 coordenadas
 *  (medido: 100 passa, 120 volta TooBig), e a sequência ocupa até 7 delas. */
const MAX_CANDIDATOS_MATRIZ = MAX_PONTOS_MATRIZ - (MAX_PARADAS + 2);

/** Atalhos. O valor final é digitável: viagem curta pede 3 km, longa pede 80. */
const RAIOS = [5, 10, 25, 50];
const RAIO_MIN = 1;
const RAIO_MAX = 500;

// Respiros. Cada interação do usuário podia virar chamada imediata; estes são
// os que garantem que arrastar, digitar e passar o mouse não viram rajada.
const ESPERA_ROTA_MS = 250;
const ESPERA_MATRIZ_MS = 350;
/** Prévia do hover. Curto o bastante para parecer instantâneo, longo o
 *  bastante para uma passada de mouse pela lista não disparar nada. */
const ESPERA_HOVER_MS = 150;

/** Duração do cruzamento entre o traçado antigo e o novo. */
const FADE_MS = 260;

type TipoPonto = "empresa" | "gps" | "endereco";

interface Ponto extends LatLng {
  rotulo: string;
  tipo: TipoPonto;
  empresa_id?: string;
}

interface Candidata extends EmpresaComGeo {
  lat: number;
  lng: number;
  /** Distância em linha reta até a linha da rota — o filtro do corredor. */
  desvioLinhaKm: number;
}

/** Custo de encaixar um candidato, e onde. `posicao` é o índice no array de
 *  paradas: 0 = antes da primeira, k = logo antes do destino. */
interface Desvio { km: number; min: number; posicao: number }

const cor = {
  a: "#83DDA8",
  b: "#F7B8B1",
  rota: "#56A4F5",
  desvio: "#F2C879",
  parada: "#9AD6F5",
  previa: "#8AA9C6",
};

/**
 * Identidade estável de um ponto.
 *
 * Não dá para usar só `empresa_id`: uma parada pode ser um endereço digitado ou
 * a posição do GPS, que não são ninguém no CRM. A coordenada arredondada cobre
 * esses, e a 5 casas (~1 m) dois cliques no mesmo lugar dão a mesma chave.
 */
const chaveDoPonto = (p: LatLng & { empresa_id?: string }) =>
  p.empresa_id || `@${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

// ─────────────────────────────────────────────────────────────────────────────
// Estado do trajeto
//
// Um objeto só, serializável, num reducer. Antes eram doze `useState` soltos, e
// o que quebrava era sempre a mesma coisa: dois deles mudavam em ordens
// diferentes e o mapa passava a mostrar uma viagem que o painel já não mostrava.
//
// Não existe campo de "modo". O destino é sempre `destino`, e trocá-lo é uma
// ação explícita — nunca efeito colateral de otimizar a ordem.
//
// Tudo aqui é dado puro (número, string, objeto simples): é o que deixa salvar
// e recuperar a rota depois virar `JSON.stringify` sem refatoração. A
// persistência em si não está implementada, por decisão.
// ─────────────────────────────────────────────────────────────────────────────
interface Trajeto {
  origem: Ponto | null;
  destino: Ponto | null;
  /** Só as do meio, na ordem de percurso. Teto de MAX_PARADAS. */
  paradas: Ponto[];
  /** O usuário arrastou a lista? Então a ordem é dele, e otimizar vira botão. */
  ordemManual: boolean;
  /** Destino trocado por ação explícita. Fica riscado no mapa, clicável, para
   *  desfazer — trocar de destino não pode descartar o anterior em silêncio. */
  destinoAnterior: Ponto | null;
}

type Acao =
  | { tipo: "origem"; ponto: Ponto | null }
  | { tipo: "destino"; ponto: Ponto | null }
  | { tipo: "definirDestino"; ponto: Ponto }
  | { tipo: "restaurarDestino" }
  | { tipo: "adicionarParada"; ponto: Ponto; posicao: number }
  | { tipo: "removerParada"; chave: string }
  | { tipo: "reordenarTrajeto"; de: number; para: number }
  | { tipo: "aplicarOrdem"; paradas: Ponto[] }
  | { tipo: "voltarAoDireto" };

function reduzir(estado: Trajeto, acao: Acao): Trajeto {
  switch (acao.tipo) {
    case "origem":
      // Trocar a ponta invalida as paradas: elas foram escolhidas por ficarem
      // no caminho, e o caminho deixou de existir.
      return { ...estado, origem: acao.ponto, paradas: [], ordemManual: false, destinoAnterior: null };

    case "destino":
      return { ...estado, destino: acao.ponto, paradas: [], ordemManual: false, destinoAnterior: null };

    case "definirDestino": {
      // A ação explícita do marcador. O destino antigo NÃO some: fica guardado
      // para o desfazer e volta naturalmente à lista de candidatos.
      if (!estado.destino) return { ...estado, destino: acao.ponto };
      const chave = chaveDoPonto(acao.ponto);
      return {
        ...estado,
        destino: acao.ponto,
        destinoAnterior: estado.destino,
        // Se o novo destino era uma parada, ele deixa de ser: virou a ponta.
        paradas: estado.paradas.filter(p => chaveDoPonto(p) !== chave),
      };
    }

    case "restaurarDestino": {
      if (!estado.destinoAnterior) return estado;
      return {
        ...estado,
        destino: estado.destinoAnterior,
        destinoAnterior: estado.destino,
        paradas: estado.paradas.filter(
          p => chaveDoPonto(p) !== chaveDoPonto(estado.destinoAnterior!)),
      };
    }

    case "adicionarParada": {
      if (estado.paradas.length >= MAX_PARADAS) return estado;
      const chave = chaveDoPonto(acao.ponto);
      if (estado.paradas.some(p => chaveDoPonto(p) === chave)) return estado;
      const paradas = estado.paradas.slice();
      paradas.splice(Math.max(0, Math.min(acao.posicao, paradas.length)), 0, acao.ponto);
      return { ...estado, paradas };
    }

    case "removerParada":
      return { ...estado, paradas: estado.paradas.filter(p => chaveDoPonto(p) !== acao.chave) };

    case "reordenarTrajeto": {
      // Arrasta sobre a viagem INTEIRA, pontas incluídas. Mover o destino para
      // o meio faz dele uma parada e promove a destino quem sobrar no fim; com
      // a origem é simétrico.
      //
      // O número de paradas não muda nunca: a sequência tem tamanho fixo, e o
      // meio é sempre `tamanho - 2`. Uma entra exatamente quando outra sai, o
      // que é o motivo de não haver checagem de MAX_PARADAS aqui.
      if (!estado.origem || !estado.destino) return estado;
      const seq = [estado.origem, ...estado.paradas, estado.destino];
      const nova = mover(seq, acao.de, acao.para);
      if (nova === seq) return estado;
      return {
        ...estado,
        origem: nova[0],
        destino: nova[nova.length - 1],
        paradas: nova.slice(1, -1),
        ordemManual: true,
        // `destinoAnterior` fica intocado de propósito. Ele existe para desfazer
        // um destino que foi DESCARTADO pela ação "Definir como destino"; num
        // arrasto nada é descartado — o antigo destino continua na viagem, à
        // vista, e o desfazer é arrastar de volta. Marcá-lo aqui poria um pino
        // riscado no mapa sobre um ponto que ainda faz parte da rota.
      };
    }

    case "aplicarOrdem":
      return { ...estado, paradas: acao.paradas, ordemManual: false };

    case "voltarAoDireto":
      return { ...estado, paradas: [], ordemManual: false, destinoAnterior: null };

    default:
      return estado;
  }
}

/**
 * Pin do mapa. SVG em gota, com a ponta ancorada na coordenada exata — o
 * círculo que havia antes marcava o centro e, no zoom de rua, apontava para o
 * quarteirão errado.
 *
 * `riscado` é o destino anterior: continua no mapa, visivelmente descartado,
 * para o desfazer ter onde ser clicado.
 */
function pinHtml(fundo: string, texto: string, riscado = false) {
  return `<div class="pin-corpo" style="position:relative;width:28px;height:36px;
      transition:transform .13s ease;transform-origin:50% 100%;
      filter:drop-shadow(0 2px 4px rgba(3,14,26,.55));${riscado ? "opacity:.65" : ""}">
    <svg width="28" height="36" viewBox="0 0 28 36" aria-hidden="true">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 10.2 14 22 14 22s14-11.8 14-22C28 6.3 21.7 0 14 0z"
            fill="${fundo}" stroke="#0F2E4B" stroke-width="2"/>
    </svg>
    <span style="position:absolute;top:5px;left:0;width:28px;text-align:center;
                 font:800 12px/1.1 'Plus Jakarta Sans',sans-serif;color:#0A2540;
                 ${riscado ? "text-decoration:line-through" : ""}">${texto}</span>
  </div>`;
}

export default function PlanejadorRota({
  empresas, origemInicial, onFechar,
}: {
  /** Carteira já carregada pela aba Próximas — não busca de novo. */
  empresas: EmpresaComGeo[];
  /** A empresa aberta entra como ponto de partida sugerido. */
  origemInicial: Ponto | null;
  onFechar: () => void;
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const camadaPinsRef = useRef<any>(null);
  const camadaRotaRef = useRef<any>(null);
  const camadaPreviaRef = useRef<any>(null);
  const linhaRef = useRef<any>(null);
  const marcadoresRef = useRef<Map<string, any>>(new Map());
  /** A linha está no estado "recalculando"? Lido pelo cruzamento, que roda em
   *  requestAnimationFrame e não enxerga estado de React. */
  const escurecidoRef = useRef(false);
  const opacidadeAlvo = () => (escurecidoRef.current ? 0.35 : 0.9);

  const [pronto, setPronto] = useState(false);
  const [erroMapa, setErroMapa] = useState(false);
  // Centro inicial congelado na primeira renderizacao. `origemInicial` chega
  // como objeto literal do componente pai, que re-renderiza sozinho a cada
  // ciclo do polling de /empresas -- usar a prop direto numa dependencia de
  // efeito faz o mapa ser destruido e recriado de 5 em 5 segundos.
  const centroInicial = useRef(origemInicial);
  // Muda quando o mapa e (re)criado. O efeito de desenho depende disto: sem
  // ele, um mapa novo ficaria vazio, porque as dependencias do desenho nao
  // mudaram e o efeito nao voltaria a rodar.
  const [mapaVersao, setMapaVersao] = useState(0);

  const [trajeto, despachar] = useReducer(reduzir, {
    origem: origemInicial, destino: null, paradas: [],
    ordemManual: false, destinoAnterior: null,
  });

  const [raioKm, setRaioKm] = useState(25);
  // Texto separado do número: enquanto a pessoa apaga para redigitar, o campo
  // fica vazio e `Number("")` é 0 — usar isso como raio faria a busca rodar com
  // zero. O número só acompanha o texto quando o texto é válido.
  const [raioTexto, setRaioTexto] = useState("25");

  const [rota, setRota] = useState<Rota | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [falhouRota, setFalhouRota] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  const [matriz, setMatriz] = useState<{ dados: Matriz; assinatura: string } | null>(null);
  const [medindo, setMedindo] = useState(false);

  const [pairado, setPairado] = useState<string | null>(null);
  const [previa, setPrevia] = useState<Coord[] | null>(null);
  const [arrastando, setArrastando] = useState<number | null>(null);
  /** Sobre qual linha do trajeto o item arrastado está pairando. */
  const [alvoArrasto, setAlvoArrasto] = useState<number | null>(null);

  // Empresas com coordenada válida — as únicas que podem entrar no corredor.
  const comGeo = useMemo(() => empresas
    .map(e => ({ e, lat: Number(e.latitude), lng: Number(e.longitude) }))
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0)),
    [empresas]);

  const semCoordenada = empresas.length - comGeo.length;

  // ── A sequência: é o trajeto inteiro, na ordem de percurso ──
  const sequencia = useMemo<Ponto[]>(() => {
    if (!trajeto.origem || !trajeto.destino) return [];
    return [trajeto.origem, ...trajeto.paradas, trajeto.destino];
  }, [trajeto.origem, trajeto.destino, trajeto.paradas]);

  // Assinatura da sequência: é o que decide quando refazer a rota. Comparar os
  // objetos não serviria — o polling do pai troca a identidade deles.
  const assinaturaSequencia = useMemo(
    () => sequencia.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(">"),
    [sequencia]);

  // ── Camada 1: a rota desenhada ──
  // Dispara sozinha ao ter as duas pontas: escolher os pontos e não ver nada
  // até apertar um botão fazia parecer que a seleção não tinha funcionado.
  useEffect(() => {
    if (sequencia.length < 2) { setRota(null); setFalhouRota(false); return; }
    let vivo = true;
    const ctrl = new AbortController();
    setCalculando(true);
    const timer = setTimeout(async () => {
      const r = await rotaOSRM(sequencia, { overview: "full", signal: ctrl.signal });
      if (!vivo) return;
      // Falha NÃO limpa a rota: manter o traçado antigo e avisar é melhor que
      // devolver um mapa em branco a quem estava no meio de montar a viagem.
      if (r) { setRota(r); setFalhouRota(false); }
      else setFalhouRota(true);
      setCalculando(false);
    }, ESPERA_ROTA_MS);
    return () => { vivo = false; ctrl.abort(); clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinaturaSequencia, tentativa]);

  // ── Camada 2: o corredor, de graça ──
  // Puro cálculo sobre a geometria já baixada. Por isso mexer no raio responde
  // na hora e não gasta requisição nenhuma.
  //
  // Quem já está na sequência sai da lista: origem, destino e paradas não são
  // candidatos a si mesmos. O destino ANTERIOR não é excluído de propósito —
  // ele volta a ser candidato, que é o que "não descarta" quer dizer.
  const { candidatas, cortadas } = useMemo<{ candidatas: Candidata[]; cortadas: number }>(() => {
    if (!rota) return { candidatas: [], cortadas: 0 };
    const naSequencia = new Set(sequencia.map(chaveDoPonto));
    const noCorredor = comGeo
      .map(({ e, lat, lng }) => ({
        ...e, lat, lng,
        desvioLinhaKm: distanciaAteRotaKm({ lat, lng }, rota.coords, 8),
      }))
      .filter(c => c.desvioLinhaKm <= raioKm)
      .filter(c => !naSequencia.has(chaveDoPonto({ ...c, empresa_id: c.empresa_id })))
      .sort((a, b) => a.desvioLinhaKm - b.desvioLinhaKm);
    // O corte é o teto do OSRM, não uma escolha de produto: acima de 100
    // coordenadas a matriz volta TooBig e ninguém teria desvio medido. Corta
    // pelas mais distantes do caminho, que são as que menos interessam.
    return {
      candidatas: noCorredor.slice(0, MAX_CANDIDATOS_MATRIZ),
      cortadas: Math.max(0, noCorredor.length - MAX_CANDIDATOS_MATRIZ),
    };
  }, [rota, raioKm, comGeo, sequencia]);

  // ── Camada 3: a matriz, uma chamada só ──
  //
  // O conjunto de pontos é ORDENADO por chave antes de virar requisição. Isso
  // não é estética: a matriz não depende da ordem de percurso, então ordenar
  // faz reordenar as paradas (arrastar, otimizar) cair no cache em vez de
  // gerar uma chamada nova a cada arrasto.
  const pontosMatriz = useMemo(() => {
    if (sequencia.length < 2) return [];
    const vistos: Record<string, true> = {};
    const lista: [string, LatLng][] = [];
    const juntar = (k: string, p: LatLng) => {
      if (!vistos[k]) { vistos[k] = true; lista.push([k, p]); }
    };
    sequencia.forEach(p => juntar(chaveDoPonto(p), { lat: p.lat, lng: p.lng }));
    candidatas.forEach(c => juntar(
      chaveDoPonto({ lat: c.lat, lng: c.lng, empresa_id: c.empresa_id }),
      { lat: c.lat, lng: c.lng }));
    return lista.sort((a, b) => a[0].localeCompare(b[0]));
  }, [sequencia, candidatas]);

  const assinaturaMatriz = useMemo(
    () => pontosMatriz.map(([k]) => k).join("|"), [pontosMatriz]);

  useEffect(() => {
    if (pontosMatriz.length < 2) { setMatriz(null); return; }
    let vivo = true;
    const ctrl = new AbortController();
    setMedindo(true);
    const timer = setTimeout(async () => {
      const m = await matrizOSRM(pontosMatriz.map(([, p]) => p), { signal: ctrl.signal });
      if (!vivo) return;
      if (m) setMatriz({ dados: m, assinatura: assinaturaMatriz });
      setMedindo(false);
    }, ESPERA_MATRIZ_MS);
    return () => { vivo = false; ctrl.abort(); clearTimeout(timer); setMedindo(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinaturaMatriz, tentativa]);

  /** Índice de cada ponto dentro da matriz. */
  const indiceNaMatriz = useMemo(() => {
    const m = new Map<string, number>();
    pontosMatriz.forEach(([k], i) => m.set(k, i));
    return m;
  }, [pontosMatriz]);

  // A matriz só vale para o conjunto de pontos que a gerou. Comparar a
  // assinatura evita o bug de ler índice de uma matriz antiga — que não daria
  // erro nenhum, só devolveria a distância do ponto errado.
  const matrizValida = matriz && matriz.assinatura === assinaturaMatriz ? matriz.dados : null;

  const sequenciaIdx = useMemo(
    () => sequencia.map(p => indiceNaMatriz.get(chaveDoPonto(p)) ?? -1),
    [sequencia, indiceNaMatriz]);

  // ── Desvio de cada candidato: melhor inserção na ordem ATUAL ──
  //
  // Testa as k+1 posições da sequência de agora — não reotimiza a rota a cada
  // hover. Reotimizar faria a lista se reordenar sozinha embaixo do cursor e
  // desfaria em silêncio a ordem que o usuário arrastou. Otimizar é botão.
  //
  // Sem paradas isso é exatamente d(A,C)+d(C,B)−d(A,B): a fórmula do desvio
  // simples é o caso particular desta, não uma conta concorrente.
  const desvios = useMemo<Record<string, Desvio>>(() => {
    if (!matrizValida || sequenciaIdx.some(i => i < 0)) return {};
    const saida: Record<string, Desvio> = {};
    candidatas.forEach(c => {
      const chave = chaveDoPonto({ lat: c.lat, lng: c.lng, empresa_id: c.empresa_id });
      const i = indiceNaMatriz.get(chave);
      if (i == null) return;
      const dist = melhorInsercao(matrizValida.distanciasKm, i, sequenciaIdx);
      if (!dist) return;
      // Os minutos saem da MESMA posição que os km escolheram, senão a tela
      // mostraria "+2,6 km / +6 min" vindos de dois encaixes diferentes.
      const tempo = custoNaPosicao(matrizValida.duracoesMin, i, sequenciaIdx, dist.posicao);
      saida[chave] = { km: dist.km, min: tempo ?? 0, posicao: dist.posicao };
    });
    return saida;
  }, [matrizValida, candidatas, indiceNaMatriz, sequenciaIdx]);

  // Lista reordenada pelo desvio real assim que ele existe; antes disso, pela
  // distância em linha reta, que é o que já se sabe de graça.
  const candidatasOrdenadas = useMemo(() => {
    const chave = (c: Candidata) =>
      chaveDoPonto({ lat: c.lat, lng: c.lng, empresa_id: c.empresa_id });
    return candidatas.slice().sort((a, b) => {
      const da = desvios[chave(a)], db = desvios[chave(b)];
      if (da && db) return da.km - db.km;
      if (da) return -1;
      if (db) return 1;
      return a.desvioLinhaKm - b.desvioLinhaKm;
    });
  }, [candidatas, desvios]);

  // ── Ordem ótima, automática enquanto o usuário não mandar o contrário ──
  useEffect(() => {
    if (trajeto.ordemManual || trajeto.paradas.length < 2) return;
    if (!matrizValida || sequenciaIdx.some(i => i < 0)) return;
    const idxParadas = trajeto.paradas.map(p => indiceNaMatriz.get(chaveDoPonto(p)) ?? -1);
    if (idxParadas.some(i => i < 0)) return;
    const otima = ordemOtima(
      matrizValida.distanciasKm,
      sequenciaIdx[0], sequenciaIdx[sequenciaIdx.length - 1], idxParadas);
    if (!otima) return;
    if (otima.join(",") === idxParadas.join(",")) return; // já está na ordem boa
    const porIndice = new Map(idxParadas.map((idx, i) => [idx, trajeto.paradas[i]]));
    despachar({ tipo: "aplicarOrdem", paradas: otima.map(i => porIndice.get(i)!) });
  }, [matrizValida, trajeto.ordemManual, trajeto.paradas, sequenciaIdx, indiceNaMatriz]);

  const otimizarAgora = () => {
    if (!matrizValida || sequenciaIdx.some(i => i < 0)) return;
    const idxParadas = trajeto.paradas.map(p => indiceNaMatriz.get(chaveDoPonto(p)) ?? -1);
    if (idxParadas.some(i => i < 0)) return;
    const otima = ordemOtima(
      matrizValida.distanciasKm,
      sequenciaIdx[0], sequenciaIdx[sequenciaIdx.length - 1], idxParadas);
    if (!otima) return;
    const porIndice = new Map(idxParadas.map((idx, i) => [idx, trajeto.paradas[i]]));
    despachar({ tipo: "aplicarOrdem", paradas: otima.map(i => porIndice.get(i)!) });
  };

  // ── Viagem direta, para comparar ──
  // Sai da própria matriz: d(origem, destino) já está lá. Antes disso exigiria
  // uma chamada só para saber quanto seria a viagem sem parada nenhuma.
  const direta = useMemo(() => {
    if (matrizValida && sequenciaIdx.length >= 2 && !sequenciaIdx.some(i => i < 0)) {
      const a = sequenciaIdx[0], b = sequenciaIdx[sequenciaIdx.length - 1];
      const km = matrizValida.distanciasKm[a]?.[b];
      const min = matrizValida.duracoesMin[a]?.[b];
      if (km != null && min != null) return { km, min };
    }
    // Sem matriz, a rota desenhada só é a direta quando não há parada.
    if (rota && trajeto.paradas.length === 0) return { km: rota.km, min: rota.min };
    return null;
  }, [matrizValida, sequenciaIdx, rota, trajeto.paradas.length]);

  // ── Ações. Ficam num ref para os handlers dos popups do Leaflet não
  //    congelarem numa versão velha do estado. ──
  const pontoDaCandidata = (c: Candidata): Ponto => ({
    lat: c.lat, lng: c.lng, rotulo: c.nome, tipo: "empresa", empresa_id: c.empresa_id,
  });

  const adicionarParada = useCallback((c: Candidata) => {
    const chave = chaveDoPonto({ lat: c.lat, lng: c.lng, empresa_id: c.empresa_id });
    // Entra na posição que o desvio elegeu — é o mesmo encaixe que gerou o
    // "+X,X km" da lista e o traço cinza da prévia. Sem isso, confirmar uma
    // parada daria um número diferente do que estava na tela um instante antes.
    const posicao = desvios[chave]?.posicao ?? trajeto.paradas.length;
    despachar({ tipo: "adicionarParada", ponto: pontoDaCandidata(c), posicao });
  }, [desvios, trajeto.paradas.length]);

  const acoesRef = useRef<any>({});
  acoesRef.current = {
    adicionarParada,
    definirDestino: (c: Candidata) =>
      despachar({ tipo: "definirDestino", ponto: pontoDaCandidata(c) }),
    restaurarDestino: () => despachar({ tipo: "restaurarDestino" }),
    removerParada: (chave: string) => despachar({ tipo: "removerParada", chave }),
    cheio: trajeto.paradas.length >= MAX_PARADAS,
  };

  // ── Mapa ──
  useEffect(() => {
    let vivo = true;
    loadLeaflet().then(() => vivo && setPronto(true)).catch(() => vivo && setErroMapa(true));
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!pronto || !containerRef.current || mapRef.current) return;
    const L = window.L;
    const inicio = centroInicial.current;
    const map = L.map(containerRef.current, { scrollWheelZoom: true });
    map.setView(inicio ? [inicio.lat, inicio.lng] : [-15.78, -47.93], inicio ? 11 : 4);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(map);
    // Ordem de criação = ordem de empilhamento: a rota por baixo, a prévia no
    // meio, os pins por cima. Trocar isso esconde marcador atrás de linha.
    camadaRotaRef.current = L.layerGroup().addTo(map);
    camadaPreviaRef.current = L.layerGroup().addTo(map);
    camadaPinsRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    linhaRef.current = null;
    setMapaVersao(v => v + 1);
    // O modal abre com o container ainda sem tamanho final; sem isto o mapa
    // renderiza um quarto de tela cinza até alguém redimensionar a janela.
    setTimeout(() => map.invalidateSize(), 60);
    return () => {
      map.remove();
      mapRef.current = null;
      camadaPinsRef.current = camadaRotaRef.current = camadaPreviaRef.current = null;
      linhaRef.current = null;
    };
    // SÓ `pronto`: o mapa é criado uma vez e vive até o modal fechar. Qualquer
    // outra dependência aqui significa destruir e recriar o mapa em pleno uso.
  }, [pronto]);

  // ── A linha azul, com cruzamento suave ──
  //
  // Leaflet não interpola geometria, então "transição suave" aqui é cruzar as
  // duas linhas: a nova entra enquanto a antiga sai. Trocar o traçado de uma
  // vez é o pulo seco que se quer evitar; sumir com a linha e trazer outra é
  // pior ainda, porque pisca o mapa inteiro.
  useEffect(() => {
    const g = camadaRotaRef.current;
    if (!g || !window.L) return;
    if (!rota) { g.clearLayers(); linhaRef.current = null; return; }

    const L = window.L;
    const nova = L.polyline(rota.coords, { color: cor.rota, weight: 6, opacity: 0 }).addTo(g);
    const antiga = linhaRef.current;
    linhaRef.current = nova;

    let quadro = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const k = Math.min(1, (agora - inicio) / FADE_MS);
      // O alvo vem do ref e não de uma constante: um recálculo pode começar no
      // meio do cruzamento, e a linha nova precisa entrar já apagada em vez de
      // subir a 0.9 e só então escurecer.
      nova.setStyle({ opacity: opacidadeAlvo() * k });
      if (antiga) antiga.setStyle({ opacity: opacidadeAlvo() * (1 - k) });
      if (k < 1) quadro = requestAnimationFrame(passo);
      else if (antiga) g.removeLayer(antiga);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rota, mapaVersao]);

  // Durante o recálculo a linha atual apaga um pouco, sinalizando "isto ainda é
  // o traçado antigo" sem tirar nada da tela.
  //
  // Não repõe a opacidade no sucesso de propósito: quem faz isso é o
  // cruzamento acima, trazendo a linha NOVA. Devolver 0.9 aqui apagaria a
  // animação inteira, porque este efeito roda logo depois dele e mataria o
  // quadro inicial em opacity 0.
  useEffect(() => {
    escurecidoRef.current = calculando;
    const l = linhaRef.current;
    if (!l) return;
    if (calculando) l.setStyle({ opacity: 0.35 });
    else if (falhouRota) l.setStyle({ opacity: 0.9 }); // não veio linha nova: devolve a antiga
  }, [calculando, falhouRota]);

  // ── Prévia do hover ──
  useEffect(() => {
    const g = camadaPreviaRef.current;
    if (!g || !window.L) return;
    g.clearLayers();
    if (previa) {
      window.L.polyline(previa, {
        color: cor.previa, weight: 4, opacity: 0.85, dashArray: "7 7",
      }).addTo(g);
    }
  }, [previa, mapaVersao]);

  useEffect(() => {
    if (!pairado || sequencia.length < 2) { setPrevia(null); return; }
    const alvo = candidatas.find(c =>
      chaveDoPonto({ lat: c.lat, lng: c.lng, empresa_id: c.empresa_id }) === pairado);
    const d = desvios[pairado];
    if (!alvo || !d) { setPrevia(null); return; }

    let vivo = true;
    const ctrl = new AbortController();
    // Debounce: sem ele, arrastar o mouse pela lista dispararia uma rota por
    // item atravessado. É `/route` e não `/trip` de propósito — `/trip` a cada
    // passada de mouse seria abuso de um servidor gratuito de terceiro.
    const timer = setTimeout(async () => {
      const comParada = [
        ...sequencia.slice(0, d.posicao + 1),
        pontoDaCandidata(alvo),
        ...sequencia.slice(d.posicao + 1),
      ];
      // "full" e não "simplified": é a mesma chamada que o confirmar vai
      // precisar, então ela já deixa o traçado no cache e o clique no `+`
      // responde na hora.
      const r = await rotaOSRM(comParada, { overview: "full", signal: ctrl.signal });
      if (vivo && r) setPrevia(r.coords);
    }, ESPERA_HOVER_MS);
    return () => { vivo = false; ctrl.abort(); clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairado, assinaturaSequencia, desvios]);

  // ── Pins ──
  /**
   * Os pontos que existem AGORA, com a viagem completa ou não.
   *
   * Diferente de `sequencia`, que é vazia até haver origem E destino. Usar
   * `sequencia` aqui fazia escolher só a origem — "usar minha localização", por
   * exemplo — não mudar assinatura nenhuma: o efeito de pinos saía cedo e o
   * mapa ficava vazio até a pessoa escolher também o destino.
   */
  const pontosDaViagem = useMemo<Ponto[]>(() => [
    ...(trajeto.origem ? [trajeto.origem] : []),
    ...trajeto.paradas,
    ...(trajeto.destino ? [trajeto.destino] : []),
  ], [trajeto.origem, trajeto.paradas, trajeto.destino]);

  const assinaturaPins = useMemo(() => JSON.stringify([
    pontosDaViagem.map(p => [chaveDoPonto(p), p.rotulo]),
    candidatasOrdenadas.map(c => {
      const k = chaveDoPonto({ lat: c.lat, lng: c.lng, empresa_id: c.empresa_id });
      return [k, desvios[k]?.km ?? null];
    }),
    trajeto.destinoAnterior ? chaveDoPonto(trajeto.destinoAnterior) : null,
    trajeto.paradas.length >= MAX_PARADAS,
  ]), [pontosDaViagem, candidatasOrdenadas, desvios, trajeto.destinoAnterior, trajeto.paradas.length]);

  const assinaturaEnquadre = useMemo(() => JSON.stringify([
    pontosDaViagem.map(p => [p.lat, p.lng]),
    candidatasOrdenadas.map(c => c.empresa_id),
  ]), [pontosDaViagem, candidatasOrdenadas]);

  const ultimoPins = useRef("");
  const ultimoEnquadre = useRef("");

  useEffect(() => {
    const g = camadaPinsRef.current;
    if (!g || !mapRef.current || !window.L) return;
    // A versao entra na chave: mapa recriado tem camada vazia e precisa ser
    // repovoado mesmo que o conteudo seja identico ao de antes.
    const chave = `${mapaVersao}|${assinaturaPins}`;
    if (ultimoPins.current === chave) return;
    ultimoPins.current = chave;

    const L = window.L;
    g.clearLayers();
    marcadoresRef.current = new Map();

    const pin = (p: LatLng, fundo: string, texto: string, dica: string,
                 chaveDoPin: string, riscado = false) => {
      const m = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: "", html: pinHtml(fundo, texto, riscado),
          iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -34],
        }),
      }).bindTooltip(dica, { direction: "top", offset: [0, -32] }).addTo(g);
      marcadoresRef.current.set(chaveDoPin, m);
      return m;
    };

    // Candidatos: numerados como na lista, e cada um carrega as DUAS ações.
    // Elas ficam visualmente distintas de propósito — adicionar parada e
    // trocar o destino são coisas diferentes, e confundi-las reescreve a
    // viagem inteira sem o usuário ter pedido.
    const chaveAnterior = trajeto.destinoAnterior ? chaveDoPonto(trajeto.destinoAnterior) : null;

    candidatasOrdenadas.forEach((c, i) => {
      const k = chaveDoPonto({ lat: c.lat, lng: c.lng, empresa_id: c.empresa_id });
      // O destino anterior volta para a LISTA de candidatos, mas no mapa ele
      // aparece só como pino riscado. Desenhar os dois poria dois marcadores
      // exatamente na mesma coordenada, um por cima do outro.
      if (k === chaveAnterior) return;
      const d = desvios[k];
      const m = pin({ lat: c.lat, lng: c.lng }, cor.desvio, String(i + 1),
        `${i + 1}. ${c.nome}${d ? ` — +${d.km.toFixed(1)} km` : ""}`, k);
      m.bindPopup(popupDeCandidata(c, d, acoesRef));
    });

    // O destino anterior: riscado, clicável, desfaz a troca.
    if (trajeto.destinoAnterior && chaveAnterior) {
      const da = trajeto.destinoAnterior;
      const m = pin(da, cor.b, "B", `Destino anterior · ${da.rotulo} — clique para restaurar`,
        chaveAnterior, true);
      m.on("click", () => acoesRef.current.restaurarDestino());
    }

    // Paradas confirmadas: numeradas pela ORDEM NA ROTA, não pela posição na
    // lista de candidatos. É o número que responde "em que pé da viagem eu
    // passo aqui?", que é a pergunta que existe depois de confirmar.
    trajeto.paradas.forEach((p, i) => {
      const m = pin(p, cor.parada, String(i + 1),
        `Parada ${i + 1} · ${p.rotulo}`, chaveDoPonto(p));
      // Popup e não clique direto: clicar no pin e a parada evaporar seria
      // destrutivo sem aviso, e o mapa é justamente onde se clica sem querer.
      m.bindPopup(popupDeParada(p, i + 1, acoesRef));
    });

    // A e B por último: ficam por cima quando coincidem na tela. A chave é a do
    // próprio ponto, não um rótulo fixo, para o hover na lista do trajeto
    // achar o marcador — A e B agora são linhas arrastáveis como as outras.
    if (trajeto.origem) {
      pin(trajeto.origem, cor.a, "A", `A · ${trajeto.origem.rotulo}`, chaveDoPonto(trajeto.origem));
    }
    if (trajeto.destino) {
      pin(trajeto.destino, cor.b, "B", `B · ${trajeto.destino.rotulo}`, chaveDoPonto(trajeto.destino));
    }

    if (ultimoEnquadre.current !== assinaturaEnquadre) {
      ultimoEnquadre.current = assinaturaEnquadre;
      const tudo = [
        ...pontosDaViagem.map(p => [p.lat, p.lng]),
        ...candidatasOrdenadas.map(c => [c.lat, c.lng]),
      ];
      if (tudo.length > 1) mapRef.current.fitBounds(tudo as any, { padding: [50, 50] });
      // Ponto unico -- tipicamente so a origem recem-escolhida. Zoom de rua, e
      // nao os 12 de antes: quem acabou de mandar "usar minha localizacao"
      // quer se ver na quadra, nao na regiao.
      else if (tudo.length === 1) mapRef.current.setView(tudo[0] as any, 14);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinaturaPins, assinaturaEnquadre, mapaVersao]);

  // Destaque do pin no hover. Mexe na classe do elemento em vez de redesenhar
  // os marcadores: redesenhar a cada passada de mouse faria os pins piscarem.
  useEffect(() => {
    marcadoresRef.current.forEach((m, k) => {
      const corpo = m.getElement()?.querySelector(".pin-corpo") as HTMLElement | null;
      if (corpo) corpo.style.transform = k === pairado ? "scale(1.22)" : "";
    });
  }, [pairado, assinaturaPins]);

  const digitarRaio = (t: string) => {
    setRaioTexto(t);
    const n = Number(t);
    if (Number.isFinite(n) && n >= RAIO_MIN && n <= RAIO_MAX) setRaioKm(n);
  };
  const escolherRaio = (r: number) => { setRaioKm(r); setRaioTexto(String(r)); };

  const cheio = trajeto.paradas.length >= MAX_PARADAS;
  const rotulo = { fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: "#9FD3EA", textTransform: "uppercase" } as const;

  return createPortal(
    <div onClick={onFechar}
      style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(10,31,51,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal aria-label="Planejar rota"
        style={{ width: "100%", maxWidth: 1180, height: "92vh", background: "#143354", borderRadius: 18, boxShadow: "0 24px 64px rgba(10,31,51,0.45)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid rgba(159,211,234,0.18)", flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(86,164,245,0.14)", display: "grid", placeItems: "center" }}>
            <RouteIcon style={{ width: 17, height: 17, color: cor.rota }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#EAF6FB" }}>Planejar rota</div>
            <div style={{ fontSize: 11.5, color: "#9FD3EA" }}>
              Quem dá para visitar no caminho — e como fica o trajeto parando lá
            </div>
          </div>
          <button onClick={onFechar} aria-label="Fechar"
            style={{ width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(159,211,234,0.10)", color: "#EAF6FB", display: "grid", placeItems: "center" }}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "330px minmax(0,1fr)" }}>

          {/* Painel de controle */}
          <div style={{ borderRight: "1px solid rgba(159,211,234,0.18)", overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>

            <SeletorPonto letra="A" corLetra={cor.a} valor={trajeto.origem}
              onChange={p => despachar({ tipo: "origem", ponto: p })}
              empresas={comGeo} rotulo="Saindo de" />
            <SeletorPonto letra="B" corLetra={cor.b} valor={trajeto.destino}
              onChange={p => despachar({ tipo: "destino", ponto: p })}
              empresas={comGeo} rotulo="Indo para" />

            {calculando && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#9FD3EA" }}>
                <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                {rota ? "Refazendo o trajeto…" : "Traçando o caminho…"}
              </div>
            )}

            <div>
              <div style={rotulo}>Raio de busca</div>

              {/* Campo digitável: os atalhos cobrem o comum, mas o raio útil
                  depende da viagem — 3 km dentro da cidade, 80 km numa estrada.
                  Mexer aqui NÃO gasta requisição de rota: o corredor é
                  recalculado sobre a geometria que já está na memória. */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6 }}>
                <input
                  type="number" inputMode="numeric"
                  min={RAIO_MIN} max={RAIO_MAX} step={1}
                  value={raioTexto}
                  onChange={e => digitarRaio(e.target.value)}
                  // Texto inválido (vazio, 0, acima do teto) volta para o último
                  // número válido em vez de ficar mentindo na tela.
                  onBlur={() => setRaioTexto(String(raioKm))}
                  aria-label="Raio de busca em quilômetros"
                  style={{
                    width: 84, height: 34, padding: "0 10px", borderRadius: 8,
                    border: "1.5px solid rgba(159,211,234,0.28)", background: "#0F2E4B",
                    color: "#EAF6FB", fontSize: 13, fontWeight: 800, fontFamily: "inherit",
                    outline: "none", fontVariantNumeric: "tabular-nums",
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#9FD3EA" }}>km</span>
              </div>

              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {RAIOS.map(r => (
                  <button key={r} onClick={() => escolherRaio(r)}
                    aria-pressed={raioKm === r}
                    style={{
                      padding: "5px 12px", borderRadius: 16, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                      fontFamily: "inherit", transition: "all .14s",
                      border: `1.5px solid ${raioKm === r ? "rgba(159,211,234,0.5)" : "rgba(159,211,234,0.22)"}`,
                      background: raioKm === r ? "rgba(46,111,149,0.34)" : "#0F2E4B",
                      color: raioKm === r ? "#EAF6FB" : "#9FD3EA",
                    }}>
                    {r} km
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10.5, color: "#8AA9C6", marginTop: 7, lineHeight: 1.5 }}>
                Entra quem está a até {raioKm} km de qualquer ponto do caminho — inclusive
                até {raioKm} km <strong>além</strong> do destino.
              </div>
            </div>

            {falhouRota && (
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,200,121,0.08)", border: "1px solid rgba(242,200,121,0.3)" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <AlertTriangle style={{ width: 14, height: 14, color: "#F2C879", flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 11.5, color: "#EAF6FB", lineHeight: 1.5 }}>
                    {rota
                      ? "Não deu para refazer o trajeto. O que está no mapa é o traçado anterior."
                      : "O serviço de rotas não respondeu. É um servidor público e cai às vezes."}
                  </span>
                </div>
                <button onClick={() => setTentativa(t => t + 1)}
                  style={{ marginTop: 9, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, border: "1px solid rgba(242,200,121,0.4)", background: "rgba(242,200,121,0.12)", color: "#F2C879" }}>
                  <RefreshCw style={{ width: 12, height: 12 }} /> Tentar de novo
                </button>
              </div>
            )}

            {rota && (
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(18,59,94,0.55)", border: "1px solid rgba(159,211,234,0.18)" }}>
                {trajeto.paradas.length === 0 ? (
                  <>
                    <div style={rotulo}>Viagem direta</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#EAF6FB", marginTop: 3 }}>
                      {rota.km.toFixed(1).replace(".", ",")} km
                    </div>
                    <div style={{ fontSize: 11, color: "#9FD3EA" }}>
                      ~{Math.round(rota.min)} min sem paradas
                    </div>
                  </>
                ) : (
                  <>
                    <div style={rotulo}>
                      Com {trajeto.paradas.length} parada{trajeto.paradas.length !== 1 ? "s" : ""}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: cor.a, marginTop: 3 }}>
                      {rota.km.toFixed(1).replace(".", ",")} km
                    </div>
                    <div style={{ fontSize: 11, color: "#9FD3EA" }}>
                      ~{Math.round(rota.min)} min no total
                    </div>
                    {direta && (
                      <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid rgba(159,211,234,0.18)", fontSize: 11, color: "#F2C879" }}>
                        +{Math.max(0, rota.km - direta.km).toFixed(1).replace(".", ",")} km
                        {" · "}
                        +{Math.max(0, Math.round(rota.min - direta.min))} min
                        <span style={{ color: "#8AA9C6" }}> em relação à viagem direta</span>
                      </div>
                    )}
                    <button onClick={() => despachar({ tipo: "voltarAoDireto" })}
                      style={{ marginTop: 10, width: "100%", padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700, border: "1px solid rgba(159,211,234,0.25)", background: "transparent", color: "#9FD3EA" }}>
                      Voltar à viagem direta
                    </button>
                  </>
                )}
              </div>
            )}

            {/* O trajeto inteiro, arrastável — pontas incluídas.
                A ordem é decisão de quem dirige: o ótimo por quilometragem
                ignora horário comercial, agenda e quem só atende de manhã.
                Arrastar o destino para o meio o transforma em parada e promove
                a destino quem sobrar no fim; com a origem é simétrico. */}
            {sequencia.length >= 2 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={rotulo}>Trajeto</span>
                  {trajeto.ordemManual && trajeto.paradas.length > 1 && (
                    <button onClick={otimizarAgora} disabled={!matrizValida}
                      title="Voltar à ordem de menor distância"
                      style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 14, cursor: matrizValida ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 10, fontWeight: 700, border: "1px solid rgba(159,211,234,0.25)", background: "transparent", color: "#9FD3EA", opacity: matrizValida ? 1 : 0.5 }}>
                      <Wand2 style={{ width: 10, height: 10 }} /> Otimizar ordem
                    </button>
                  )}
                </div>

                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                  {sequencia.map((p, i) => {
                    const ehOrigem = i === 0;
                    const ehDestino = i === sequencia.length - 1;
                    const meio = !ehOrigem && !ehDestino;
                    const chave = chaveDoPonto(p);
                    const alvo = alvoArrasto === i && arrastando != null && arrastando !== i;
                    return (
                      <div key={chave}
                        draggable
                        onDragStart={() => setArrastando(i)}
                        onDragOver={e => { e.preventDefault(); setAlvoArrasto(i); }}
                        onDragLeave={() => setAlvoArrasto(a => (a === i ? null : a))}
                        onDrop={e => {
                          e.preventDefault();
                          if (arrastando != null && arrastando !== i) {
                            despachar({ tipo: "reordenarTrajeto", de: arrastando, para: i });
                          }
                          setArrastando(null); setAlvoArrasto(null);
                        }}
                        onDragEnd={() => { setArrastando(null); setAlvoArrasto(null); }}
                        onMouseEnter={() => setPairado(chave)}
                        onMouseLeave={() => setPairado(null)}
                        style={{
                          display: "flex", alignItems: "center", gap: 7, padding: "6px 8px",
                          borderRadius: 8, cursor: "grab",
                          opacity: arrastando === i ? 0.45 : 1,
                          background: alvo ? "rgba(154,214,245,0.22)" : "rgba(18,59,94,0.55)",
                          // A borda marca onde o item cairia. Sem isso, arrastar
                          // numa lista de 7 vira adivinhação.
                          border: `1px solid ${alvo ? cor.parada : "rgba(159,211,234,0.18)"}`,
                          transition: "background .12s, border-color .12s",
                        }}>
                        {/* O punho é um botão de verdade: com ele focado, as
                            setas do teclado movem o item. É o único caminho de
                            reordenar sem mouse — o arrasto HTML5 não dispara em
                            toque nem responde a teclado. */}
                        <button
                          aria-label={`Mover ${p.rotulo} na ordem do trajeto`}
                          title="Arraste, ou use ↑ e ↓ com o foco aqui"
                          onKeyDown={e => {
                            if (e.key === "ArrowUp" && i > 0) {
                              e.preventDefault();
                              despachar({ tipo: "reordenarTrajeto", de: i, para: i - 1 });
                            } else if (e.key === "ArrowDown" && i < sequencia.length - 1) {
                              e.preventDefault();
                              despachar({ tipo: "reordenarTrajeto", de: i, para: i + 1 });
                            }
                          }}
                          style={{ display: "grid", placeItems: "center", flexShrink: 0, width: 14, height: 18, padding: 0, border: "none", background: "none", cursor: "grab", color: "#8AA9C6" }}>
                          <GripVertical style={{ width: 12, height: 12 }} />
                        </button>

                        <span style={{
                          width: 18, height: 18, flexShrink: 0, borderRadius: "50%",
                          display: "grid", placeItems: "center", fontSize: 9.5, fontWeight: 900,
                          color: "#0A2540",
                          background: ehOrigem ? cor.a : ehDestino ? cor.b : cor.parada,
                        }}>
                          {ehOrigem ? "A" : ehDestino ? "B" : i}
                        </span>

                        <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 700, color: "#EAF6FB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.rotulo}
                        </span>

                        {/* Só o meio some por aqui: tirar A ou B não é "remover
                            da viagem", é trocar a ponta — que se faz no seletor
                            lá em cima. */}
                        {meio ? (
                          <button onClick={() => despachar({ tipo: "removerParada", chave })}
                            title="Tirar da viagem" aria-label={`Tirar ${p.rotulo} da viagem`}
                            style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 6, cursor: "pointer", display: "grid", placeItems: "center", border: "1px solid rgba(247,184,177,0.35)", background: "transparent", color: cor.b }}>
                            <Minus style={{ width: 11, height: 11 }} />
                          </button>
                        ) : (
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#8AA9C6", flexShrink: 0, letterSpacing: ".04em" }}>
                            {ehOrigem ? "SAÍDA" : "CHEGADA"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {cheio && (
                  <div style={{ fontSize: 10, color: "#F2C879", marginTop: 6 }}>
                    Máximo de {MAX_PARADAS} paradas na rota.
                  </div>
                )}
              </div>
            )}

            {trajeto.destinoAnterior && (
              <button onClick={() => despachar({ tipo: "restaurarDestino" })}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", textAlign: "left", border: "1px dashed rgba(247,184,177,0.4)", background: "transparent", color: "#9FD3EA", fontSize: 11 }}>
                <CornerUpLeft style={{ width: 12, height: 12, flexShrink: 0, color: cor.b }} />
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Voltar o destino para <strong style={{ color: "#EAF6FB" }}>{trajeto.destinoAnterior.rotulo}</strong>
                </span>
              </button>
            )}

            {semCoordenada > 0 && (
              <div style={{ fontSize: 10.5, color: "#8AA9C6", lineHeight: 1.5 }}>
                {semCoordenada} empresa{semCoordenada !== 1 ? "s" : ""} sem coordenada não
                {semCoordenada !== 1 ? " entram" : " entra"} no cálculo. Geocodifique em
                Todos os clientes → Mapa.
              </div>
            )}
          </div>

          {/* Mapa + resultados */}
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#0F2E4B" }}>
              {erroMapa ? (
                <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#9FD3EA", fontSize: 12.5 }}>
                  Não foi possível carregar o mapa.
                </div>
              ) : (
                <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
              )}
            </div>

            {/* Lista do que dá para encaixar */}
            <div style={{ height: 218, flexShrink: 0, borderTop: "1px solid rgba(159,211,234,0.18)", overflowY: "auto" }}>
              {candidatasOrdenadas.length === 0 ? (
                <div style={{ padding: "28px 16px", textAlign: "center", fontSize: 12.5, color: "#9FD3EA" }}>
                  {rota
                    ? `Nenhuma empresa da carteira a até ${raioKm} km deste caminho. Aumente o raio.`
                    : "Escolha os dois pontos — a rota é traçada sozinha."}
                </div>
              ) : (
                <>
                  <div style={{ position: "sticky", top: 0, background: "#143354", padding: "9px 16px", borderBottom: "1px solid rgba(159,211,234,0.18)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: "#EAF6FB" }}>
                      {candidatasOrdenadas.length} no caminho
                    </span>
                    {medindo && (
                      <span style={{ fontSize: 10.5, color: "#9FD3EA", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Loader2 style={{ width: 10, height: 10, animation: "spin 1s linear infinite" }} />
                        recalculando o desvio de cada uma…
                      </span>
                    )}
                    {cheio && (
                      <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#F2C879" }}>
                        Máximo de {MAX_PARADAS} paradas
                      </span>
                    )}
                  </div>
                  {candidatasOrdenadas.map((c, i) => {
                    const k = chaveDoPonto({ lat: c.lat, lng: c.lng, empresa_id: c.empresa_id });
                    const d = desvios[k];
                    return (
                      <div key={c.empresa_id}
                        onMouseEnter={() => setPairado(k)}
                        onMouseLeave={() => setPairado(null)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid rgba(159,211,234,0.12)", background: pairado === k ? "rgba(86,164,245,0.08)" : undefined }}>
                        {/* O número casa com o pin no mapa. */}
                        <span style={{
                          width: 20, height: 20, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center",
                          fontSize: 10, fontWeight: 900, color: "#0A2540", background: cor.desvio,
                        }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#EAF6FB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.nome}
                          </div>
                          <div style={{ fontSize: 10.5, color: "#8AA9C6" }}>
                            {c.cidade || "—"} · {formatarDistancia(c.desvioLinhaKm)} do caminho
                          </div>
                        </div>
                        {/* O número que decide: quantos km a MAIS a viagem fica. */}
                        <div style={{ textAlign: "right", flexShrink: 0, minWidth: 92 }}>
                          {d ? (
                            <>
                              <div style={{ fontSize: 13.5, fontWeight: 900, color: d.km <= 5 ? cor.a : cor.desvio }}>
                                +{d.km.toFixed(1).replace(".", ",")} km
                              </div>
                              <div style={{ fontSize: 10, color: "#8AA9C6" }}>
                                +{Math.round(d.min)} min
                              </div>
                            </>
                          ) : (
                            <span style={{ fontSize: 10.5, color: "#8AA9C6" }}>
                              {medindo ? "medindo…" : "aguardando"}
                            </span>
                          )}
                        </div>
                        {/* Duas ações, visualmente distintas: adicionar parada
                            não mexe no destino, e trocar o destino não é uma
                            parada a mais. */}
                        <button onClick={() => acoesRef.current.adicionarParada(c)}
                          disabled={cheio}
                          title={cheio ? `Máximo de ${MAX_PARADAS} paradas na rota` : "Incluir como parada"}
                          aria-label={`Incluir ${c.nome} como parada`}
                          style={{
                            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                            cursor: cheio ? "not-allowed" : "pointer",
                            display: "grid", placeItems: "center", fontFamily: "inherit",
                            border: "1px solid rgba(159,211,234,0.25)",
                            background: "transparent",
                            color: cheio ? "#54718E" : "#9FD3EA",
                            opacity: cheio ? 0.55 : 1,
                          }}>
                          <Plus style={{ width: 13, height: 13 }} />
                        </button>
                        <button onClick={() => acoesRef.current.definirDestino(c)}
                          title="Definir como destino" aria-label={`Definir ${c.nome} como destino`}
                          style={{
                            width: 28, height: 28, borderRadius: 8, cursor: "pointer", flexShrink: 0,
                            display: "grid", placeItems: "center", fontFamily: "inherit",
                            border: `1px solid ${cor.b}55`, background: "rgba(247,184,177,0.10)", color: cor.b,
                          }}>
                          <Flag style={{ width: 12, height: 12 }} />
                        </button>
                        <button onClick={() => navigate(`/clientes/${c.empresa_id}`)}
                          title="Abrir a ficha"
                          style={{ width: 28, height: 28, borderRadius: 8, cursor: "pointer", flexShrink: 0, display: "grid", placeItems: "center", border: "1px solid rgba(159,211,234,0.25)", background: "transparent", color: "#9FD3EA" }}>
                          <Search style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    );
                  })}
                  {cortadas > 0 && (
                    <div style={{ padding: "9px 16px", fontSize: 10.5, color: "#8AA9C6", lineHeight: 1.5 }}>
                      Mais {cortadas} empresa{cortadas !== 1 ? "s" : ""} dentro do raio ficaram
                      de fora: o serviço de rotas mede no máximo {MAX_PONTOS_MATRIZ} pontos por
                      vez. Diminua o raio para trazer as mais próximas do caminho.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Conteúdo do popup de um candidato no mapa.
 *
 * É um elemento de DOM e não string de HTML porque os botões precisam de
 * handler de verdade. As ações vêm por ref: o popup é criado uma vez por
 * redesenho dos pins, e ler o estado direto aqui congelaria a versão daquele
 * instante — o botão continuaria adicionando parada numa rota que já mudou.
 */
function popupDeCandidata(
  c: Candidata,
  d: Desvio | undefined,
  acoesRef: React.MutableRefObject<any>,
): HTMLElement {
  const raiz = document.createElement("div");
  raiz.style.cssText = "min-width:186px;font-family:inherit";

  const nome = document.createElement("div");
  nome.textContent = c.nome;
  nome.style.cssText = "font-size:12.5px;font-weight:800;color:#0A2540;margin-bottom:2px";
  raiz.appendChild(nome);

  const custo = document.createElement("div");
  custo.textContent = d
    ? `+${d.km.toFixed(1).replace(".", ",")} km · +${Math.round(d.min)} min`
    : "desvio ainda sendo medido";
  custo.style.cssText = "font-size:11px;color:#2E6F95;margin-bottom:8px";
  raiz.appendChild(custo);

  const linha = document.createElement("div");
  linha.style.cssText = "display:flex;gap:6px";

  const cheio = !!acoesRef.current.cheio;
  const btnParada = document.createElement("button");
  btnParada.textContent = cheio ? `Máximo de ${MAX_PARADAS}` : "+ Parada";
  btnParada.disabled = cheio;
  btnParada.style.cssText =
    "flex:1;padding:5px 8px;border-radius:7px;font-family:inherit;font-size:11px;" +
    "font-weight:700;border:1px solid #2E6F95;background:#EAF6FB;color:#0A2540;" +
    (cheio ? "opacity:.5;cursor:not-allowed" : "cursor:pointer");
  if (!cheio) btnParada.onclick = () => acoesRef.current.adicionarParada(c);
  linha.appendChild(btnParada);

  const btnDestino = document.createElement("button");
  btnDestino.textContent = "Definir como destino";
  btnDestino.style.cssText =
    "flex:1;padding:5px 8px;border-radius:7px;cursor:pointer;font-family:inherit;" +
    "font-size:11px;font-weight:700;border:1px solid #C77E76;background:#F7B8B1;color:#0A2540";
  btnDestino.onclick = () => acoesRef.current.definirDestino(c);
  linha.appendChild(btnDestino);

  raiz.appendChild(linha);
  return raiz;
}

/** Popup de uma parada já confirmada: mostra o pé da viagem e deixa desfazer. */
function popupDeParada(
  p: Ponto,
  ordem: number,
  acoesRef: React.MutableRefObject<any>,
): HTMLElement {
  const raiz = document.createElement("div");
  raiz.style.cssText = "min-width:168px;font-family:inherit";

  const titulo = document.createElement("div");
  titulo.textContent = `${ordem}ª parada`;
  titulo.style.cssText = "font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#2E6F95";
  raiz.appendChild(titulo);

  const nome = document.createElement("div");
  nome.textContent = p.rotulo;
  nome.style.cssText = "font-size:12.5px;font-weight:800;color:#0A2540;margin:2px 0 8px";
  raiz.appendChild(nome);

  const btn = document.createElement("button");
  btn.textContent = "Tirar da viagem";
  btn.style.cssText =
    "width:100%;padding:5px 8px;border-radius:7px;cursor:pointer;font-family:inherit;" +
    "font-size:11px;font-weight:700;border:1px solid #C77E76;background:#F7B8B1;color:#0A2540";
  btn.onclick = () => acoesRef.current.removerParada(chaveDoPonto(p));
  raiz.appendChild(btn);
  return raiz;
}

// ── Escolha de um ponto: empresa, GPS ou endereço ───────────────────────────
// Três origens porque uma viagem real não começa nem termina só em cliente
// cadastrado: sai de onde a pessoa está e às vezes vai a um endereço que ainda
// não é ninguém no CRM.
function SeletorPonto({
  letra, corLetra, valor, onChange, empresas, rotulo,
}: {
  letra: string;
  corLetra: string;
  valor: Ponto | null;
  onChange: (p: Ponto | null) => void;
  empresas: { e: EmpresaComGeo; lat: number; lng: number }[];
  rotulo: string;
}) {
  const [modo, setModo] = useState<TipoPonto>("empresa");
  const [endereco, setEndereco] = useState("");
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);
  const [erroEndereco, setErroEndereco] = useState<string | null>(null);
  const [gpsCarregando, setGpsCarregando] = useState(false);

  // Ordem alfabética: a lista abre inteira, e ordem de cadastro não ajuda
  // ninguém a achar um nome.
  const opcoes = useMemo(() => empresas
    .map(({ e }) => ({
      valor: e.empresa_id,
      rotulo: e.nome,
      detalhe: e.cidade || undefined,
      icone: Building2,
    }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo)),
    [empresas]);

  const usarGps = () => {
    if (!navigator.geolocation) { setErroEndereco("Este navegador não informa a localização."); return; }
    setGpsCarregando(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude, rotulo: "Minha localização", tipo: "gps" });
        setGpsCarregando(false);
      },
      () => { setErroEndereco("Não foi possível obter sua localização."); setGpsCarregando(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const buscarEndereco = async () => {
    const q = endereco.trim();
    if (q.length < 4) return;
    setBuscandoEndereco(true);
    setErroEndereco(null);
    try {
      const r = await fetch(`${API}/geo/buscar?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${getToken() || ""}` },
      });
      const d = await r.json().catch(() => null);
      if (r.ok && d?.lat != null) {
        onChange({ lat: d.lat, lng: d.lon, rotulo: d.endereco || q, tipo: "endereco" });
      } else {
        setErroEndereco("Endereço não encontrado. Tente incluir a cidade.");
      }
    } catch {
      setErroEndereco("Não foi possível consultar o endereço.");
    }
    setBuscandoEndereco(false);
  };

  const campo = {
    width: "100%", height: 34, padding: "0 10px", borderRadius: 8, fontSize: 12,
    border: "1.5px solid rgba(159,211,234,0.22)", background: "#0F2E4B",
    outline: "none", fontFamily: "inherit", color: "#EAF6FB",
  } as const;

  const MODOS: { chave: TipoPonto; texto: string; icone: any }[] = [
    { chave: "empresa", texto: "Empresa", icone: Building2 },
    { chave: "gps", texto: "Onde estou", icone: Crosshair },
    { chave: "endereco", texto: "Endereço", icone: MapPin },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: corLetra, color: "#0A2540", fontSize: 10, fontWeight: 900, display: "grid", placeItems: "center", flexShrink: 0 }}>
          {letra}
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: "#9FD3EA", textTransform: "uppercase" }}>
          {rotulo}
        </span>
      </div>

      {valor ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: 9, background: "rgba(46,111,149,0.20)", border: "1px solid rgba(159,211,234,0.28)" }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: "#EAF6FB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {valor.rotulo}
          </span>
          <button onClick={() => { onChange(null); setEndereco(""); }} aria-label="Trocar"
            style={{ border: "none", background: "none", cursor: "pointer", color: "#9FD3EA", display: "grid", placeItems: "center" }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            {MODOS.map(m => (
              <button key={m.chave} onClick={() => { setModo(m.chave); setErroEndereco(null); }}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  padding: "5px 4px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit",
                  border: `1px solid ${modo === m.chave ? "rgba(159,211,234,0.45)" : "rgba(159,211,234,0.18)"}`,
                  background: modo === m.chave ? "rgba(46,111,149,0.30)" : "transparent",
                  color: modo === m.chave ? "#EAF6FB" : "#9FD3EA",
                }}>
                <m.icone style={{ width: 11, height: 11 }} /> {m.texto}
              </button>
            ))}
          </div>

          {modo === "empresa" && (
            /* O Dropdown padrão do CRM: abre a carteira inteira já listada, com
               campo de busca acima de 8 itens. Antes era um input que só
               mostrava algo depois de digitar — quem não lembrava o nome exato
               ficava olhando para um campo vazio. */
            opcoes.length === 0 ? (
              <div style={{ fontSize: 11, color: "#8AA9C6", lineHeight: 1.5 }}>
                Nenhuma empresa da carteira tem coordenada cadastrada.
              </div>
            ) : (
              <Dropdown
                valor="" altura={34} busca={opcoes.length > 8}
                ariaLabel={`Empresa do ponto ${letra}`}
                placeholder={`Escolher entre ${opcoes.length} empresas…`}
                opcoes={opcoes}
                onChange={id => {
                  const alvo = empresas.find(({ e }) => e.empresa_id === id);
                  if (alvo) onChange({
                    lat: alvo.lat, lng: alvo.lng, rotulo: alvo.e.nome,
                    tipo: "empresa", empresa_id: alvo.e.empresa_id,
                  });
                }}
              />
            )
          )}

          {modo === "gps" && (
            <button onClick={usarGps} disabled={gpsCarregando}
              style={{ width: "100%", height: 34, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: "#EAF6FB", border: "1px solid rgba(159,211,234,0.25)", background: "rgba(18,59,94,0.55)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {gpsCarregando
                ? <><Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> Localizando…</>
                : <><Crosshair style={{ width: 12, height: 12 }} /> Usar minha localização</>}
            </button>
          )}

          {modo === "endereco" && (
            <div style={{ display: "flex", gap: 5 }}>
              <input value={endereco} onChange={e => setEndereco(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") buscarEndereco(); }}
                placeholder="Rua, número, cidade" aria-label="Endereço" style={campo} />
              <button onClick={buscarEndereco} disabled={buscandoEndereco || endereco.trim().length < 4}
                aria-label="Buscar endereço"
                style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 8, cursor: "pointer", border: "1px solid rgba(159,211,234,0.25)", background: "rgba(18,59,94,0.55)", color: "#9FD3EA", display: "grid", placeItems: "center" }}>
                {buscandoEndereco
                  ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                  : <Search style={{ width: 12, height: 12 }} />}
              </button>
            </div>
          )}

          {erroEndereco && (
            <div style={{ fontSize: 10.5, color: "#F2C879", marginTop: 5 }}>{erroEndereco}</div>
          )}
        </>
      )}
    </div>
  );
}
