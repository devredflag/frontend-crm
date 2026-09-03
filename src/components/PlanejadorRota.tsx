import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  X, Navigation, MapPin, Building2, Crosshair, Search, Loader2,
  Route as RouteIcon, AlertTriangle, Flag, Plus,
} from "lucide-react";

import { getToken } from "../services/auth";
import {
  loadLeaflet, rotaOSRM, distanciaAteRotaKm,
  TILE_URL, TILE_ATTR, type LatLng, type Coord,
} from "../utils/mapa";
import { formatarDistancia } from "../utils/distancia";
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
// custo. O desenho é de propósito:
//   1 chamada  — a rota A→B;
//   0 chamadas — o corredor, que é Haversine contra a linha já baixada;
//   N chamadas — o desvio exato, só dos candidatos que sobraram do corredor,
//                em série e limitado por MAX_DESVIOS.
// Pedir rota para toda empresa cadastrada seria uma chamada por candidato para
// depois descartar quase todos.
// ─────────────────────────────────────────────────────────────────────────────

/** Quantos desvios exatos calcular. Acima disso a espera não compensa. */
const MAX_DESVIOS = 12;

const RAIOS = [5, 10, 25, 50];

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
  /** km a mais na viagem inteira ao parar aqui. null = ainda não calculado. */
  desvioRealKm: number | null;
  /** minutos a mais. null = não calculado ou OSRM indisponível. */
  desvioMin: number | null;
}

const cor = {
  a: "#83DDA8",
  b: "#F7B8B1",
  rota: "#56A4F5",
  desvio: "#F2C879",
};

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
  const [pontoA, setPontoA] = useState<Ponto | null>(origemInicial);
  const [pontoB, setPontoB] = useState<Ponto | null>(null);
  const [raioKm, setRaioKm] = useState(25);
  const [rotaBase, setRotaBase] = useState<{ coords: Coord[]; km: number; min: number } | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [osrmForaDoAr, setOsrmForaDoAr] = useState(false);
  const [candidatas, setCandidatas] = useState<Candidata[]>([]);
  const [medindoDesvios, setMedindoDesvios] = useState(false);
  const [paradas, setParadas] = useState<Candidata[]>([]);

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
    const map = L.map(containerRef.current, { scrollWheelZoom: true });
    map.setView(pontoA ? [pontoA.lat, pontoA.lng] : [-15.78, -47.93], pontoA ? 11 : 4);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(map);
    camadaRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // O modal abre com o container ainda sem tamanho final; sem isto o mapa
    // renderiza um quarto de tela cinza até alguém redimensionar a janela.
    setTimeout(() => map.invalidateSize(), 60);
    return () => { map.remove(); mapRef.current = null; camadaRef.current = null; };
  }, [pronto, pontoA]);

  // ── Traçar ──
  const tracar = useCallback(async () => {
    if (!pontoA || !pontoB) return;
    setCalculando(true);
    setOsrmForaDoAr(false);
    setCandidatas([]);
    setParadas([]);

    const rota = await rotaOSRM([pontoA, pontoB], { overview: "full" });
    if (!rota) {
      // Sem rota viária não há corredor para medir: a tela diz isso em vez de
      // mostrar uma lista vazia que parece "nenhuma empresa no caminho".
      setOsrmForaDoAr(true);
      setRotaBase(null);
      setCalculando(false);
      return;
    }
    setRotaBase(rota);

    // Corredor: quem está a até `raioKm` de qualquer ponto do caminho. Como a
    // medida é contra os SEGMENTOS, as pontas viram meia-lua — então entra
    // também quem está até o mesmo raio ALÉM do destino.
    const dentro: Candidata[] = comGeo
      .map(({ e, lat, lng }) => ({
        ...e, lat, lng,
        desvioLinhaKm: distanciaAteRotaKm({ lat, lng }, rota.coords, 8),
        desvioRealKm: null as number | null,
        desvioMin: null as number | null,
      }))
      .filter(c => c.desvioLinhaKm <= raioKm)
      .filter(c => c.empresa_id !== pontoA.empresa_id && c.empresa_id !== pontoB.empresa_id)
      .sort((a, b) => a.desvioLinhaKm - b.desvioLinhaKm);

    setCandidatas(dentro);
    setCalculando(false);

    // Desvio real, um por vez, só dos primeiros. Em série de propósito: é
    // servidor público, e disparar 12 requisições juntas é o tipo de uso que
    // faz a comunidade bloquear cliente.
    if (dentro.length > 0) {
      setMedindoDesvios(true);
      const alvos = dentro.slice(0, MAX_DESVIOS);
      for (const c of alvos) {
        const via = await rotaOSRM([pontoA, { lat: c.lat, lng: c.lng }, pontoB], { overview: "simplified" });
        if (via) {
          const extraKm = via.km - rota.km;
          const extraMin = via.min - rota.min;
          setCandidatas(prev => prev.map(p => p.empresa_id === c.empresa_id
            ? { ...p, desvioRealKm: Math.max(0, extraKm), desvioMin: Math.max(0, extraMin) }
            : p));
        }
      }
      setMedindoDesvios(false);
    }
  }, [pontoA, pontoB, raioKm, comGeo]);

  // ── Desenho ──
  useEffect(() => {
    if (!mapRef.current || !camadaRef.current) return;
    const L = window.L;
    const g = camadaRef.current;
    g.clearLayers();

    const marcador = (p: LatLng, c: string, texto: string, letra: string) =>
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:${c};color:#0A2540;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 12px/1 sans-serif;box-shadow:0 2px 8px rgba(3,14,26,.5);border:2px solid #0F2E4B">${letra}</div>`,
          iconSize: [26, 26], iconAnchor: [13, 13],
        }),
      }).bindTooltip(texto).addTo(g);

    if (pontoA) marcador(pontoA, cor.a, pontoA.rotulo, "A");
    if (pontoB) marcador(pontoB, cor.b, pontoB.rotulo, "B");

    if (rotaBase) {
      L.polyline(rotaBase.coords, { color: cor.rota, weight: 5, opacity: 0.9 }).addTo(g);
      // O corredor desenhado: sem ele o raio é um número abstrato e não se vê
      // por que uma empresa entrou e a vizinha não.
      L.polyline(rotaBase.coords, {
        color: cor.rota, weight: 3, opacity: 0.10, lineCap: "round",
      }).addTo(g);
    }

    candidatas.forEach(c => {
      const parada = paradas.some(p => p.empresa_id === c.empresa_id);
      L.circleMarker([c.lat, c.lng], {
        radius: parada ? 9 : 6,
        color: parada ? cor.a : cor.desvio,
        fillColor: parada ? cor.a : cor.desvio,
        fillOpacity: 0.85, weight: parada ? 3 : 1.5,
      })
        .bindTooltip(
          `${c.nome}${c.desvioRealKm !== null ? ` — +${c.desvioRealKm.toFixed(1)} km` : ""}`,
          { direction: "top" }
        )
        .addTo(g);
    });

    const tudo = [
      ...(pontoA ? [[pontoA.lat, pontoA.lng]] : []),
      ...(pontoB ? [[pontoB.lat, pontoB.lng]] : []),
      ...candidatas.map(c => [c.lat, c.lng]),
    ];
    if (tudo.length > 1) mapRef.current.fitBounds(tudo as any, { padding: [40, 40] });
    else if (tudo.length === 1) mapRef.current.setView(tudo[0] as any, 12);
  }, [rotaBase, candidatas, paradas, pontoA, pontoB]);

  // Rota final com as paradas escolhidas, na ordem em que aparecem no caminho.
  const rotaComParadas = useMemo(() => {
    if (!rotaBase || paradas.length === 0) return null;
    const somaKm = paradas.reduce((s, p) => s + (p.desvioRealKm ?? 0), 0);
    return { km: rotaBase.km + somaKm, extra: somaKm };
  }, [rotaBase, paradas]);

  const alternarParada = (c: Candidata) =>
    setParadas(prev => prev.some(p => p.empresa_id === c.empresa_id)
      ? prev.filter(p => p.empresa_id !== c.empresa_id)
      : [...prev, c]);

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

            <div>
              <div style={rotulo}>Raio de busca</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {RAIOS.map(r => (
                  <button key={r} onClick={() => setRaioKm(r)}
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
              <div style={{ fontSize: 10.5, color: "#8AA9C6", marginTop: 6, lineHeight: 1.5 }}>
                Entra quem está a até {raioKm} km de qualquer ponto do caminho — inclusive
                até {raioKm} km <strong>além</strong> do destino.
              </div>
            </div>

            <button onClick={tracar} disabled={!pontoA || !pontoB || calculando}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                height: 42, borderRadius: 10, border: "none", fontFamily: "inherit",
                fontSize: 13, fontWeight: 800, color: "#EAF6FB",
                cursor: !pontoA || !pontoB || calculando ? "not-allowed" : "pointer",
                opacity: !pontoA || !pontoB || calculando ? 0.55 : 1,
                background: "linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)",
                backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite",
              }}>
              {calculando
                ? <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Traçando…</>
                : <><Navigation style={{ width: 14, height: 14 }} /> Traçar rota</>}
            </button>

            {osrmForaDoAr && (
              <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(242,200,121,0.08)", border: "1px solid rgba(242,200,121,0.3)" }}>
                <AlertTriangle style={{ width: 14, height: 14, color: "#F2C879", flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11.5, color: "#EAF6FB", lineHeight: 1.5 }}>
                  O serviço de rotas não respondeu. É um servidor público e cai às vezes —
                  tente de novo em alguns instantes.
                </span>
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
                {rotaComParadas && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(159,211,234,0.18)" }}>
                    <div style={rotulo}>Com {paradas.length} parada{paradas.length !== 1 ? "s" : ""}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: cor.a, marginTop: 3 }}>
                      {rotaComParadas.km.toFixed(1).replace(".", ",")} km
                    </div>
                    <div style={{ fontSize: 11, color: "#F2C879" }}>
                      +{rotaComParadas.extra.toFixed(1).replace(".", ",")} km no total
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
                    ? `Nenhuma empresa da carteira a até ${raioKm} km deste caminho. Tente um raio maior.`
                    : "Escolha os dois pontos e trace a rota para ver quem fica no caminho."}
                </div>
              ) : (
                <>
                  <div style={{ position: "sticky", top: 0, background: "#143354", padding: "9px 16px", borderBottom: "1px solid rgba(159,211,234,0.18)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: "#EAF6FB" }}>
                      {candidatas.length} no caminho
                    </span>
                    {medindoDesvios && (
                      <span style={{ fontSize: 10.5, color: "#9FD3EA", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Loader2 style={{ width: 10, height: 10, animation: "spin 1s linear infinite" }} />
                        calculando o desvio de cada uma…
                      </span>
                    )}
                  </div>
                  {candidatas.map(c => {
                    const parada = paradas.some(p => p.empresa_id === c.empresa_id);
                    return (
                      <div key={c.empresa_id}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid rgba(159,211,234,0.12)" }}>
                        <Building2 style={{ width: 14, height: 14, color: parada ? cor.a : "#9FD3EA", flexShrink: 0 }} />
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
                          {c.desvioRealKm === null ? (
                            <span style={{ fontSize: 10.5, color: "#8AA9C6" }}>
                              {medindoDesvios ? "medindo…" : "não medido"}
                            </span>
                          ) : (
                            <>
                              <div style={{ fontSize: 13.5, fontWeight: 900, color: c.desvioRealKm <= 5 ? cor.a : cor.desvio }}>
                                +{c.desvioRealKm.toFixed(1).replace(".", ",")} km
                              </div>
                              {c.desvioMin !== null && (
                                <div style={{ fontSize: 10, color: "#8AA9C6" }}>
                                  +{Math.round(c.desvioMin)} min
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <button onClick={() => alternarParada(c)}
                          title={parada ? "Tirar da viagem" : "Incluir na viagem"}
                          style={{
                            width: 28, height: 28, borderRadius: 8, cursor: "pointer", flexShrink: 0,
                            display: "grid", placeItems: "center", fontFamily: "inherit",
                            border: `1px solid ${parada ? cor.a : "rgba(159,211,234,0.25)"}`,
                            background: parada ? "rgba(131,221,168,0.18)" : "transparent",
                            color: parada ? cor.a : "#9FD3EA",
                          }}>
                          {parada ? <Flag style={{ width: 13, height: 13 }} /> : <Plus style={{ width: 13, height: 13 }} />}
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
  const [busca, setBusca] = useState("");
  const [endereco, setEndereco] = useState("");
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);
  const [erroEndereco, setErroEndereco] = useState<string | null>(null);
  const [gpsCarregando, setGpsCarregando] = useState(false);

  const achados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return [];
    return empresas
      .filter(({ e }) => e.nome.toLowerCase().includes(q) || (e.cidade || "").toLowerCase().includes(q))
      .slice(0, 6);
  }, [busca, empresas]);

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
          <button onClick={() => { onChange(null); setBusca(""); setEndereco(""); }} aria-label="Trocar"
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
            <>
              <input value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Nome ou cidade…" aria-label="Buscar empresa" style={campo} />
              {achados.map(({ e, lat, lng }) => (
                <button key={e.empresa_id}
                  onClick={() => { onChange({ lat, lng, rotulo: e.nome, tipo: "empresa", empresa_id: e.empresa_id }); setBusca(""); }}
                  style={{ width: "100%", textAlign: "left", padding: "7px 10px", marginTop: 4, borderRadius: 7, border: "1px solid rgba(159,211,234,0.14)", background: "rgba(18,59,94,0.55)", cursor: "pointer", fontFamily: "inherit" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#EAF6FB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.nome}</div>
                  <div style={{ fontSize: 10, color: "#8AA9C6" }}>{e.cidade || "—"}</div>
                </button>
              ))}
            </>
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
