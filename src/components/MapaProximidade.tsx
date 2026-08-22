import { useEffect, useMemo, useRef, useState } from "react";

// ── Leaflet via CDN (custo zero: OpenStreetMap, sem API key) ──────────
// Carregado dinamicamente para não exigir npm install nem mexer no build.
declare global {
  interface Window { L: any }
}

let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
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

export interface EmpresaGeo {
  empresa_id: string;
  nome: string;
  segmento?: string;
  cidade?: string;
  status?: string;
  temperatura?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface Ponto {
  emp: EmpresaGeo;
  lat: number;
  lng: number;
}

export interface GeocodeProgresso {
  rodando: boolean;
  feitas: number;
  restantes: number | null;
}

// Distância em km entre dois pontos (Haversine) — puro cálculo, sem API.
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Rota real seguindo ruas via OSRM (open source, grátis, sem API key).
async function rotaOSRM(a: Ponto, b: Ponto): Promise<{ coords: [number, number][]; km: number; min: number } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const d = await res.json();
    if (d.code !== "Ok" || !d.routes?.length) return null;
    const coords = d.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
    return { coords, km: d.routes[0].distance / 1000, min: d.routes[0].duration / 60 };
  } catch {
    return null;
  }
}

function tempCor(t?: string) {
  if (t === "Quente") return "#B42318";
  if (t === "Morno") return "#8A5A00";
  if (t === "Frio") return "#2563EB";
  return "#7f8c9a";
}

function escapeHtml(s: string) {
  return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

const MAX_VIZINHOS = 3; // quantas empresas próximas conectar por nó

export default function MapaProximidade({
  empresas, onGeocodificar, geocode,
}: {
  empresas: EmpresaGeo[];
  onGeocodificar?: () => void;
  geocode?: GeocodeProgresso | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);      // marcadores + linhas de proximidade
  const rotasRef = useRef<any>(null);      // rotas reais (OSRM) sob demanda
  const [ready, setReady] = useState(false);
  const [erro, setErro] = useState(false);
  const [raioKm, setRaioKm] = useState(10);
  const [rotando, setRotando] = useState(false);
  const [rotaSel, setRotaSel] = useState<{ origem: string; destinos: { nome: string; km: number; min: number }[] } | null>(null);

  // Pontos válidos (empresas com coordenadas)
  const pontos = useMemo<Ponto[]>(() =>
    empresas
      .map((emp) => ({ emp, lat: Number(emp.latitude), lng: Number(emp.longitude) }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0)),
    [empresas]
  );

  const semCoords = empresas.length - pontos.length;

  // Carrega Leaflet uma vez
  useEffect(() => {
    let vivo = true;
    loadLeaflet().then(() => vivo && setReady(true)).catch(() => vivo && setErro(true));
    return () => { vivo = false; };
  }, []);

  // Cria o mapa quando o Leaflet estiver pronto
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const L = window.L;
    const map = L.map(containerRef.current, { scrollWheelZoom: true, attributionControl: true });
    map.setView([-15.78, -47.93], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    rotasRef.current = L.layerGroup().addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; layerRef.current = null; rotasRef.current = null; };
  }, [ready]);

  // Desenha marcadores + linhas de proximidade (recalcula ao mudar pontos/raio)
  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    const L = window.L;
    const group = layerRef.current;
    group.clearLayers();
    if (rotasRef.current) rotasRef.current.clearLayers();
    setRotaSel(null);
    if (pontos.length === 0) return;

    // Vizinhos mais próximos de cada empresa, dentro do raio
    const vizinhosPt: Record<string, { pt: Ponto; km: number }[]> = {};
    const linhasFeitas = new Set<string>();

    pontos.forEach((p, i) => {
      const dists = pontos
        .map((q, j) => ({ j, q, km: i === j ? Infinity : haversineKm(p, q) }))
        .filter((d) => d.km <= raioKm)
        .sort((a, b) => a.km - b.km)
        .slice(0, MAX_VIZINHOS);

      vizinhosPt[p.emp.empresa_id] = dists.map((d) => ({ pt: d.q, km: d.km }));

      dists.forEach((d) => {
        const key = i < d.j ? `${i}-${d.j}` : `${d.j}-${i}`;
        if (linhasFeitas.has(key)) return;
        linhasFeitas.add(key);
        const opac = Math.max(0.2, 1 - d.km / raioKm);
        L.polyline([[p.lat, p.lng], [d.q.lat, d.q.lng]], { color: "#2563EB", weight: 1.5, opacity: opac, dashArray: "4 4" }).addTo(group);
      });
    });

    // Clique numa empresa → traça as ROTAS REAIS (ruas) até as vizinhas
    const tracarRotas = async (origem: Ponto) => {
      const vz = vizinhosPt[origem.emp.empresa_id] || [];
      if (rotasRef.current) rotasRef.current.clearLayers();
      if (vz.length === 0) { setRotaSel({ origem: origem.emp.nome, destinos: [] }); return; }
      setRotando(true);
      const destinos: { nome: string; km: number; min: number }[] = [];
      for (const v of vz) {
        const rota = await rotaOSRM(origem, v.pt);
        if (rota && rotasRef.current) {
          window.L.polyline(rota.coords, { color: "#5B6570", weight: 5, opacity: 0.85 }).addTo(rotasRef.current);
          destinos.push({ nome: v.pt.emp.nome, km: rota.km, min: rota.min });
        } else {
          // Sem rota viária: cai pra distância em linha reta
          destinos.push({ nome: v.pt.emp.nome, km: v.km, min: NaN });
        }
      }
      setRotando(false);
      setRotaSel({ origem: origem.emp.nome, destinos });
    };

    // Marcadores
    pontos.forEach((p) => {
      const cor = tempCor(p.emp.temperatura);
      const vz = vizinhosPt[p.emp.empresa_id] || [];
      const listaVz = vz.length
        ? `<div style="margin-top:6px;font-size:11px;color:#5a6b7b"><b>Perto de:</b><br/>${vz
            .map((v) => `${escapeHtml(v.pt.emp.nome)} <span style="color:#9aa">(${v.km.toFixed(1)} km)</span>`)
            .join("<br/>")}</div>`
        : `<div style="margin-top:6px;font-size:11px;color:#9aa">Nenhuma empresa dentro de ${raioKm} km</div>`;
      const popup = `
        <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:190px">
          <div style="font-size:13px;font-weight:800;color:#16191D">${escapeHtml(p.emp.nome)}</div>
          <div style="font-size:11px;color:#7a8a9a;margin-top:2px">${escapeHtml(p.emp.segmento || "—")}${p.emp.cidade ? " · " + escapeHtml(p.emp.cidade) : ""}</div>
          ${listaVz}
          ${vz.length ? '<div style="margin-top:6px;font-size:11px;color:#5B6570;font-weight:700">Clique no ponto para ver a rota pelas ruas</div>' : ""}
        </div>`;
      L.circleMarker([p.lat, p.lng], { radius: 8, color: "#fff", weight: 2, fillColor: cor, fillOpacity: 0.9 })
        .bindPopup(popup)
        .bindTooltip(p.emp.nome, { direction: "top", offset: [0, -6] })
        .on("click", () => { tracarRotas(p); })
        .addTo(group);
    });

    const bounds = L.latLngBounds(pontos.map((p) => [p.lat, p.lng]));
    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [pontos, raioKm, ready]);

  const limparRotas = () => { if (rotasRef.current) rotasRef.current.clearLayers(); setRotaSel(null); };

  if (erro) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontSize: 14, color: "#5B6570", fontWeight: 600 }}>
        Não foi possível carregar o mapa. Verifique sua conexão e tente novamente.
      </div>
    );
  }

  const gc = geocode;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Controles + legenda */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#5B6570" }}>Raio de proximidade</span>
          <input type="range" min={1} max={50} step={1} value={raioKm} onChange={(e) => setRaioKm(Number(e.target.value))} style={{ accentColor: "#2563EB", width: 160 }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: "#2563EB", minWidth: 48 }}>{raioKm} km</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto", flexWrap: "wrap" }}>
          {[{ l: "Quente", c: "#B42318" }, { l: "Morno", c: "#8A5A00" }, { l: "Frio", c: "#2563EB" }, { l: "Sem temp.", c: "#7f8c9a" }].map((s) => (
            <span key={s.l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#5B6570" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.c, border: "1.5px solid #fff", boxShadow:"none" }} />
              {s.l}
            </span>
          ))}
        </div>
      </div>

      {/* Banner: empresas sem coordenada + botão de geocodificar */}
      {semCoords > 0 && onGeocodificar && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(230,126,34,0.08)", border: "1.5px solid rgba(230,126,34,0.25)", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#b9651a", flex: 1, minWidth: 200 }}>
            {gc?.rodando
              ? `Localizando empresas... ${gc.feitas} já posicionadas${gc.restantes != null ? `, ${gc.restantes} restantes` : ""}`
              : `${semCoords} empresa${semCoords !== 1 ? "s" : ""} sem localização. Posso descobrir pelo endereço salvo (grátis, OpenStreetMap).`}
          </span>
          <button
            onClick={onGeocodificar}
            disabled={gc?.rodando}
            style={{ height: 32, padding: "0 14px", borderRadius: 8, border: "none", cursor: gc?.rodando ? "wait" : "pointer", background: "#8A5A00", color: "#fff", fontSize: 12, fontWeight: 700, opacity: gc?.rodando ? 0.7 : 1, whiteSpace: "nowrap" }}
          >
            {gc?.rodando ? "Localizando..." : "Localizar no mapa"}
          </button>
        </div>
      )}

      {/* Resumo da rota selecionada */}
      {rotaSel && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(142,68,173,0.07)", border: "1.5px solid rgba(142,68,173,0.22)", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#5a3d6b", flex: 1, minWidth: 220 }}>
            {rotando
              ? "Calculando rota pelas ruas..."
              : rotaSel.destinos.length
                ? <><b style={{ color: "#5B6570" }}>Rotas de {rotaSel.origem}:</b>{" "}
                    {rotaSel.destinos.map((d, i) => (
                      <span key={i}>{i > 0 ? " · " : " "}{d.nome} <b>{d.km.toFixed(1)} km</b>{Number.isFinite(d.min) ? ` (${Math.round(d.min)} min)` : ""}</span>
                    ))}
                  </>
                : `Nenhuma empresa dentro de ${raioKm} km de ${rotaSel.origem}.`}
          </span>
          <button onClick={limparRotas} style={{ height: 28, padding: "0 12px", borderRadius: 8, border: "1px solid rgba(142,68,173,0.3)", background: "rgba(142,68,173,0.06)", color: "#5B6570", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            Limpar rota
          </button>
        </div>
      )}

      {/* Mapa */}
      <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid #E3E6E9" }}>
        {!ready && (
          <div style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", background: "#F0F2F4", fontSize: 13, fontWeight: 600, color: "#5B6570" }}>
            Carregando mapa...
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: "calc(100vh - 280px)", minHeight: 460, zIndex: 1 }} />
      </div>

      {/* Rodapé informativo */}
      <div style={{ fontSize: 11, color: "#5B6570", display: "flex", gap: 14, flexWrap: "wrap" }}>
        <span><b style={{ color: "#2563EB" }}>{pontos.length}</b> empresa{pontos.length !== 1 ? "s" : ""} no mapa</span>
        {semCoords > 0 && <span style={{ color: "#8A5A00" }}>{semCoords} sem localização</span>}
        <span style={{ marginLeft: "auto" }}>Tracejado = proximidade · Roxo = rota real pelas ruas (clique numa empresa) · OpenStreetMap + OSRM (custo zero)</span>
      </div>
    </div>
  );
}
