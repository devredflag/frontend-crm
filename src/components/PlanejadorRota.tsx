import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  X, MapPin, Building2, Crosshair, Search, Loader2,
  Route as RouteIcon, AlertTriangle, Flag, Plus, RefreshCw,
} from "lucide-react";

import { getToken } from "../services/auth";
import {
  loadLeaflet, rotaOSRM, distanciaAteRotaKm,
  TILE_URL, TILE_ATTR, type LatLng, type Coord,
} from "../utils/mapa";
import { formatarDistancia } from "../utils/distancia";
import Dropdown from "./Dropdown";
import type { EmpresaComGeo } from "../hooks/useEmpresasProximas";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

// ─────────────────────────────────────────────────────────────────────────────
// Planejador de rota — "o que dá para encaixar nesta viagem?"
//
// A pergunta que ele responde não é "quem está perto de mim", que a aba
// Próximas já responde. É: eu vou de A até B de qualquer jeito; quem está no
// caminho, e quanto custa parar lá?
//
// Custo: ZERO em API paga. Leaflet + OpenStreetMap para desenhar, OSRM para a
// rota, Nominatim (pelo nosso backend) para endereço digitado. Nenhuma chamada
// ao Google Places, então a cota mensal não é tocada.
//
// São serviços comunitários, então o volume de chamadas importa mesmo sem
// custo. O trabalho está separado em três camadas justamente por isso:
//
//   1 chamada  — a rota A→B. Só refaz quando A ou B mudam.
//   0 chamadas — o corredor. É Haversine contra a geometria JÁ baixada, então
//                mexer no raio refiltra na hora, de graça, sem tocar a rede.
//   N chamadas — o desvio exato, só dos que sobraram do corredor, em série,
//                limitado a MAX_DESVIOS e com debounce.
//
// Pedir rota para toda empresa cadastrada seria uma chamada por candidato para
// depois descartar quase todos.
// ─────────────────────────────────────────────────────────────────────────────

/** Quantos desvios exatos calcular. Acima disso a espera não compensa. */
const MAX_DESVIOS = 12;

/** Atalhos. O valor final é digitável: viagem curta pede 3 km, longa pede 80. */
const RAIOS = [5, 10, 25, 50];
const RAIO_MIN = 1;
const RAIO_MAX = 500;

/** Respiro antes de medir desvios: sem ele, cada tecla no raio dispara N rotas. */
const ESPERA_MEDICAO_MS = 700;

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

/** km e minutos a mais na viagem, por empresa. Vive fora da lista de candidatas
 *  para que mexer no raio (que refaz a lista) não jogue fora o que já foi medido. */
interface Desvio { km: number; min: number }

const cor = {
  a: "#83DDA8",
  b: "#F7B8B1",
  rota: "#56A4F5",
  desvio: "#F2C879",
};

/**
 * Pin do mapa. SVG em gota, com a ponta ancorada na coordenada exata — o
 * círculo que havia antes marcava o centro e, no zoom de rua, apontava para o
 * quarteirão errado.
 */
function pinHtml(fundo: string, texto: string, corTexto = "#0A2540") {
  return `<div style="position:relative;width:28px;height:36px;filter:drop-shadow(0 2px 4px rgba(3,14,26,.55))">
    <svg width="28" height="36" viewBox="0 0 28 36" aria-hidden="true">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 10.2 14 22 14 22s14-11.8 14-22C28 6.3 21.7 0 14 0z"
            fill="${fundo}" stroke="#0F2E4B" stroke-width="2"/>
    </svg>
    <span style="position:absolute;top:5px;left:0;width:28px;text-align:center;
                 font:800 12px/1.1 'Plus Jakarta Sans',sans-serif;color:${corTexto}">${texto}</span>
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
  const camadaRef = useRef<any>(null);

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
  const [pontoA, setPontoA] = useState<Ponto | null>(origemInicial);
  const [pontoB, setPontoB] = useState<Ponto | null>(null);
  const [raioKm, setRaioKm] = useState(25);
  // Texto separado do número: enquanto a pessoa apaga para redigitar, o campo
  // fica vazio e `Number("")` é 0 — usar isso como raio faria a busca rodar com
  // zero. O número só acompanha o texto quando o texto é válido.
  const [raioTexto, setRaioTexto] = useState("25");
  const [rotaBase, setRotaBase] = useState<{ coords: Coord[]; km: number; min: number } | null>(null);
  const [carregandoRota, setCarregandoRota] = useState(false);
  const [osrmForaDoAr, setOsrmForaDoAr] = useState(false);
  const [desvios, setDesvios] = useState<Record<string, Desvio>>({});
  const [medindo, setMedindo] = useState(false);
  const [paradas, setParadas] = useState<string[]>([]);
  const [tentativa, setTentativa] = useState(0);

  // Empresas com coordenada válida — as únicas que podem entrar no corredor.
  const comGeo = useMemo(() => empresas
    .map(e => ({ e, lat: Number(e.latitude), lng: Number(e.longitude) }))
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0)),
    [empresas]);

  const semCoordenada = empresas.length - comGeo.length;

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
    camadaRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapaVersao(v => v + 1);
    // O modal abre com o container ainda sem tamanho final; sem isto o mapa
    // renderiza um quarto de tela cinza até alguém redimensionar a janela.
    setTimeout(() => map.invalidateSize(), 60);
    return () => { map.remove(); mapRef.current = null; camadaRef.current = null; };
    // SÓ `pronto`: o mapa é criado uma vez e vive até o modal fechar. Qualquer
    // outra dependência aqui significa destruir e recriar o mapa em pleno uso.
  }, [pronto]);

  // ── Camada 1: a rota A→B, automática ──
  // Dispara sozinha ao ter as duas pontas: escolher os pontos e não ver nada
  // até apertar um botão fazia parecer que a seleção não tinha funcionado.
  useEffect(() => {
    if (!pontoA || !pontoB) { setRotaBase(null); setOsrmForaDoAr(false); return; }
    let vivo = true;
    const ctrl = new AbortController();
    setCarregandoRota(true);
    setOsrmForaDoAr(false);
    // Desvios são medidos CONTRA uma rota; trocar a rota invalida todos.
    setDesvios({});
    setParadas([]);
    (async () => {
      const r = await rotaOSRM([pontoA, pontoB], { overview: "full", signal: ctrl.signal });
      if (!vivo) return;
      if (!r) { setOsrmForaDoAr(true); setRotaBase(null); }
      else setRotaBase(r);
      setCarregandoRota(false);
    })();
    return () => { vivo = false; ctrl.abort(); };
  }, [pontoA, pontoB, tentativa]);

  // ── Camada 2: o corredor, de graça ──
  // Puro cálculo sobre a geometria já baixada. Por isso mexer no raio responde
  // na hora e não gasta requisição nenhuma.
  const candidatas = useMemo<Candidata[]>(() => {
    if (!rotaBase) return [];
    return comGeo
      .map(({ e, lat, lng }) => ({
        ...e, lat, lng,
        desvioLinhaKm: distanciaAteRotaKm({ lat, lng }, rotaBase.coords, 8),
      }))
      .filter(c => c.desvioLinhaKm <= raioKm)
      .filter(c => c.empresa_id !== pontoA?.empresa_id && c.empresa_id !== pontoB?.empresa_id)
      .sort((a, b) => a.desvioLinhaKm - b.desvioLinhaKm);
  }, [rotaBase, raioKm, comGeo, pontoA, pontoB]);

  // ── Camada 3: o desvio exato, com parcimônia ──
  // Em série e com debounce de propósito: é servidor público da comunidade, e
  // disparar doze requisições a cada tecla do raio é o tipo de uso que faz
  // bloquearem cliente. Quem já foi medido nesta rota não é medido de novo.
  const idsParaMedir = useMemo(
    () => candidatas.slice(0, MAX_DESVIOS).map(c => c.empresa_id).join(","),
    [candidatas]);

  useEffect(() => {
    if (!rotaBase || !pontoA || !pontoB || !idsParaMedir) return;
    let vivo = true;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      const alvos = candidatas.slice(0, MAX_DESVIOS).filter(c => !desvios[c.empresa_id]);
      if (alvos.length === 0) return;
      setMedindo(true);
      for (const c of alvos) {
        if (!vivo) break;
        const via = await rotaOSRM(
          [pontoA, { lat: c.lat, lng: c.lng }, pontoB],
          { overview: "simplified", signal: ctrl.signal });
        if (!vivo) break;
        if (via) {
          setDesvios(prev => ({
            ...prev,
            [c.empresa_id]: {
              km: Math.max(0, via.km - rotaBase.km),
              min: Math.max(0, via.min - rotaBase.min),
            },
          }));
        }
      }
      if (vivo) setMedindo(false);
    }, ESPERA_MEDICAO_MS);
    return () => { vivo = false; ctrl.abort(); clearTimeout(timer); setMedindo(false); };
    // `candidatas` e `desvios` entram pela closure de propósito: incluí-los nas
    // dependências reiniciaria o laço a cada desvio medido, que é justamente o
    // que ele acabou de mudar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsParaMedir, rotaBase, pontoA, pontoB]);

  // ── Desenho ──
  // Assinatura do que esta na tela. O polling do componente pai troca a
  // identidade do array de empresas a cada ciclo, e sem esta comparacao o mapa
  // limparia e redesenharia tudo de 5 em 5 segundos -- piscando os pins.
  const assinaturaDesenho = useMemo(() => JSON.stringify([
    rotaBase?.km ?? null,
    candidatas.map(c => [c.empresa_id, desvios[c.empresa_id]?.km ?? null]),
    paradas,
    pontoA ? [pontoA.lat, pontoA.lng, pontoA.rotulo] : null,
    pontoB ? [pontoB.lat, pontoB.lng, pontoB.rotulo] : null,
  ]), [rotaBase, candidatas, desvios, paradas, pontoA, pontoB]);

  // Enquadramento separado do desenho: refazer o fitBounds a cada desvio medido
  // ou a cada parada marcada faria o mapa pular embaixo da mao de quem esta
  // olhando. So reenquadra quando o conjunto de pontos muda.
  const assinaturaEnquadre = useMemo(() => JSON.stringify([
    rotaBase?.km ?? null,
    candidatas.map(c => c.empresa_id),
    pontoA ? [pontoA.lat, pontoA.lng] : null,
    pontoB ? [pontoB.lat, pontoB.lng] : null,
  ]), [rotaBase, candidatas, pontoA, pontoB]);

  const ultimoDesenho = useRef("");
  const ultimoEnquadre = useRef("");

  useEffect(() => {
    if (!mapRef.current || !camadaRef.current) return;
    // A versao entra na chave: mapa recriado tem camada vazia e precisa ser
    // repovoado mesmo que o conteudo seja identico ao de antes.
    const chave = `${mapaVersao}|${assinaturaDesenho}`;
    if (ultimoDesenho.current === chave) return;
    ultimoDesenho.current = chave;
    const L = window.L;
    const g = camadaRef.current;
    g.clearLayers();

    const pin = (p: LatLng, fundo: string, texto: string, dica: string) =>
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: "", html: pinHtml(fundo, texto),
          iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -34],
        }),
      }).bindTooltip(dica, { direction: "top", offset: [0, -32] }).addTo(g);

    if (rotaBase) {
      L.polyline(rotaBase.coords, { color: cor.rota, weight: 6, opacity: 0.9 }).addTo(g);
    }

    // Cada candidata ganha pin numerado, e o número é o mesmo da lista abaixo —
    // é o que deixa "qual desses é o +2 km?" ser respondido de relance.
    candidatas.forEach((c, i) => {
      const escolhida = paradas.includes(c.empresa_id);
      const d = desvios[c.empresa_id];
      pin(
        { lat: c.lat, lng: c.lng },
        escolhida ? cor.a : cor.desvio,
        String(i + 1),
        `${i + 1}. ${c.nome}${d ? ` — +${d.km.toFixed(1)} km` : ""}`
      );
    });

    // A e B por último: ficam por cima das candidatas quando coincidem na tela.
    if (pontoA) pin(pontoA, cor.a, "A", `A · ${pontoA.rotulo}`);
    if (pontoB) pin(pontoB, cor.b, "B", `B · ${pontoB.rotulo}`);

    if (ultimoEnquadre.current !== assinaturaEnquadre) {
      ultimoEnquadre.current = assinaturaEnquadre;
      const tudo = [
        ...(pontoA ? [[pontoA.lat, pontoA.lng]] : []),
        ...(pontoB ? [[pontoB.lat, pontoB.lng]] : []),
        ...candidatas.map(c => [c.lat, c.lng]),
      ];
      if (tudo.length > 1) mapRef.current.fitBounds(tudo as any, { padding: [50, 50] });
      else if (tudo.length === 1) mapRef.current.setView(tudo[0] as any, 12);
    }
    // `mapaVersao` entra para que um mapa recriado seja repovoado: sem ele a
    // camada nova ficaria vazia, porque o conteudo em si nao mudou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinaturaDesenho, assinaturaEnquadre, mapaVersao]);

  // Total da viagem com as paradas escolhidas.
  const totalComParadas = useMemo(() => {
    if (!rotaBase || paradas.length === 0) return null;
    const extra = paradas.reduce((s, id) => s + (desvios[id]?.km ?? 0), 0);
    return { km: rotaBase.km + extra, extra };
  }, [rotaBase, paradas, desvios]);

  const digitarRaio = (t: string) => {
    setRaioTexto(t);
    const n = Number(t);
    if (Number.isFinite(n) && n >= RAIO_MIN && n <= RAIO_MAX) setRaioKm(n);
  };
  const escolherRaio = (r: number) => { setRaioKm(r); setRaioTexto(String(r)); };

  const alternarParada = (id: string) =>
    setParadas(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

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
              Quem dá para visitar no caminho — e quanto cada parada custa em quilômetros
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

            <SeletorPonto letra="A" corLetra={cor.a} valor={pontoA} onChange={setPontoA}
              empresas={comGeo} rotulo="Saindo de" />
            <SeletorPonto letra="B" corLetra={cor.b} valor={pontoB} onChange={setPontoB}
              empresas={comGeo} rotulo="Indo para" />

            {carregandoRota && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#9FD3EA" }}>
                <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                Traçando o caminho…
              </div>
            )}

            <div>
              <div style={rotulo}>Raio de busca</div>

              {/* Campo digitável: os atalhos cobrem o comum, mas o raio útil
                  depende da viagem — 3 km dentro da cidade, 80 km numa estrada.
                  Mexer aqui NÃO gasta requisição: o corredor é recalculado
                  sobre a geometria que já está na memória. */}
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

            {osrmForaDoAr && (
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,200,121,0.08)", border: "1px solid rgba(242,200,121,0.3)" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <AlertTriangle style={{ width: 14, height: 14, color: "#F2C879", flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 11.5, color: "#EAF6FB", lineHeight: 1.5 }}>
                    O serviço de rotas não respondeu. É um servidor público e cai às vezes.
                  </span>
                </div>
                <button onClick={() => setTentativa(t => t + 1)}
                  style={{ marginTop: 9, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, border: "1px solid rgba(242,200,121,0.4)", background: "rgba(242,200,121,0.12)", color: "#F2C879" }}>
                  <RefreshCw style={{ width: 12, height: 12 }} /> Tentar de novo
                </button>
              </div>
            )}

            {rotaBase && (
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(18,59,94,0.55)", border: "1px solid rgba(159,211,234,0.18)" }}>
                <div style={rotulo}>Viagem direta</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#EAF6FB", marginTop: 3 }}>
                  {rotaBase.km.toFixed(1).replace(".", ",")} km
                </div>
                <div style={{ fontSize: 11, color: "#9FD3EA" }}>
                  ~{Math.round(rotaBase.min)} min sem paradas
                </div>
                {totalComParadas && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(159,211,234,0.18)" }}>
                    <div style={rotulo}>Com {paradas.length} parada{paradas.length !== 1 ? "s" : ""}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: cor.a, marginTop: 3 }}>
                      {totalComParadas.km.toFixed(1).replace(".", ",")} km
                    </div>
                    <div style={{ fontSize: 11, color: "#F2C879" }}>
                      +{totalComParadas.extra.toFixed(1).replace(".", ",")} km no total
                    </div>
                  </div>
                )}
              </div>
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
              {candidatas.length === 0 ? (
                <div style={{ padding: "28px 16px", textAlign: "center", fontSize: 12.5, color: "#9FD3EA" }}>
                  {rotaBase
                    ? `Nenhuma empresa da carteira a até ${raioKm} km deste caminho. Aumente o raio.`
                    : "Escolha os dois pontos — a rota é traçada sozinha."}
                </div>
              ) : (
                <>
                  <div style={{ position: "sticky", top: 0, background: "#143354", padding: "9px 16px", borderBottom: "1px solid rgba(159,211,234,0.18)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: "#EAF6FB" }}>
                      {candidatas.length} no caminho
                    </span>
                    {medindo && (
                      <span style={{ fontSize: 10.5, color: "#9FD3EA", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Loader2 style={{ width: 10, height: 10, animation: "spin 1s linear infinite" }} />
                        calculando o desvio de cada uma…
                      </span>
                    )}
                  </div>
                  {candidatas.map((c, i) => {
                    const escolhida = paradas.includes(c.empresa_id);
                    const d = desvios[c.empresa_id];
                    const medivel = i < MAX_DESVIOS;
                    return (
                      <div key={c.empresa_id}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid rgba(159,211,234,0.12)", background: escolhida ? "rgba(131,221,168,0.06)" : undefined }}>
                        {/* O número casa com o pin no mapa. */}
                        <span style={{
                          width: 20, height: 20, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center",
                          fontSize: 10, fontWeight: 900, color: "#0A2540",
                          background: escolhida ? cor.a : cor.desvio,
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
                              {medivel ? (medindo ? "medindo…" : "aguardando") : "não medido"}
                            </span>
                          )}
                        </div>
                        <button onClick={() => alternarParada(c.empresa_id)}
                          title={escolhida ? "Tirar da viagem" : "Incluir na viagem"}
                          style={{
                            width: 28, height: 28, borderRadius: 8, cursor: "pointer", flexShrink: 0,
                            display: "grid", placeItems: "center", fontFamily: "inherit",
                            border: `1px solid ${escolhida ? cor.a : "rgba(159,211,234,0.25)"}`,
                            background: escolhida ? "rgba(131,221,168,0.18)" : "transparent",
                            color: escolhida ? cor.a : "#9FD3EA",
                          }}>
                          {escolhida ? <Flag style={{ width: 13, height: 13 }} /> : <Plus style={{ width: 13, height: 13 }} />}
                        </button>
                        <button onClick={() => navigate(`/clientes/${c.empresa_id}`)}
                          title="Abrir a ficha"
                          style={{ width: 28, height: 28, borderRadius: 8, cursor: "pointer", flexShrink: 0, display: "grid", placeItems: "center", border: "1px solid rgba(159,211,234,0.25)", background: "transparent", color: "#9FD3EA" }}>
                          <Search style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    );
                  })}
                  {candidatas.length > MAX_DESVIOS && (
                    <div style={{ padding: "9px 16px", fontSize: 10.5, color: "#8AA9C6" }}>
                      O desvio exato é calculado para as {MAX_DESVIOS} mais próximas do caminho.
                      Para as demais, use a distância até a rota como referência.
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
