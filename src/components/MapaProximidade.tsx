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

function tempCor(t?: string) {
  if (t === "Quente") return "#e74c3c";
  if (t === "Morno") return "#e67e22";
  if (t === "Frio") return "#2980b9";
  return "#7f8c9a";
}

function escapeHtml(s: string) {
  return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

const MAX_VIZINHOS = 3; // quantas empresas próximas conectar por nó

export default function MapaProximidade({ empresas }: { empresas: EmpresaGeo[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [erro, setErro] = useState(false);
  const [raioKm, setRaioKm] = useState(10);

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
    map.setView([-15.78, -47.93], 4); // Brasil por padrão
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; layerRef.current = null; };
  }, [ready]);

  // Desenha marcadores + linhas de proximidade (recalcula ao mudar pontos/raio)
  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    const L = window.L;
    const group = layerRef.current;
    group.clearLayers();
    if (pontos.length === 0) return;

    // Vizinhos mais próximos de cada empresa, dentro do raio
    const vizinhosPorEmp: Record<string, { nome: string; km: number }[]> = {};
    const linhasFeitas = new Set<string>();

    pontos.forEach((p, i) => {
      const dists = pontos
        .map((q, j) => ({ j, q, km: i === j ? Infinity : haversineKm(p, q) }))
        .filter((d) => d.km <= raioKm)
        .sort((a, b) => a.km - b.km)
        .slice(0, MAX_VIZINHOS);

      vizinhosPorEmp[p.emp.empresa_id] = dists.map((d) => ({ nome: d.q.emp.nome, km: d.km }));

      dists.forEach((d) => {
        const key = i < d.j ? `${i}-${d.j}` : `${d.j}-${i}`;
        if (linhasFeitas.has(key)) return;
        linhasFeitas.add(key);
        const opac = Math.max(0.2, 1 - d.km / raioKm);
        L.polyline(
          [[p.lat, p.lng], [d.q.lat, d.q.lng]],
          { color: "#2980b9", weight: 1.5, opacity: opac, dashArray: "4 4" }
        ).addTo(group);
      });
    });

    // Marcadores
    pontos.forEach((p) => {
      const cor = tempCor(p.emp.temperatura);
      const vz = vizinhosPorEmp[p.emp.empresa_id] || [];
      const listaVz = vz.length
        ? `<div style="margin-top:6px;font-size:11px;color:#5a6b7b"><b>Perto de:</b><br/>${vz
            .map((v) => `${escapeHtml(v.nome)} <span style="color:#9aa">(${v.km.toFixed(1)} km)</span>`)
            .join("<br/>")}</div>`
        : `<div style="margin-top:6px;font-size:11px;color:#9aa">Nenhuma empresa dentro de ${raioKm} km</div>`;
      const popup = `
        <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:180px">
          <div style="font-size:13px;font-weight:800;color:#0f2133">${escapeHtml(p.emp.nome)}</div>
          <div style="font-size:11px;color:#7a8a9a;margin-top:2px">${escapeHtml(p.emp.segmento || "—")}${p.emp.cidade ? " · " + escapeHtml(p.emp.cidade) : ""}</div>
          ${listaVz}
        </div>`;
      L.circleMarker([p.lat, p.lng], {
        radius: 8, color: "#fff", weight: 2, fillColor: cor, fillOpacity: 0.9,
      })
        .bindPopup(popup)
        .bindTooltip(p.emp.nome, { direction: "top", offset: [0, -6] })
        .addTo(group);
    });

    // Enquadra todos os pontos
    const bounds = L.latLngBounds(pontos.map((p) => [p.lat, p.lng]));
    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [pontos, raioKm, ready]);

  if (erro) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontSize: 14, color: "rgba(20,45,70,0.5)", fontWeight: 600 }}>
        Não foi possível carregar o mapa. Verifique sua conexão e tente novamente.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Controles + legenda */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(20,45,70,0.6)" }}>Raio de proximidade</span>
          <input
            type="range" min={1} max={50} step={1} value={raioKm}
            onChange={(e) => setRaioKm(Number(e.target.value))}
            style={{ accentColor: "#2980b9", width: 160 }}
          />
          <span style={{ fontSize: 12, fontWeight: 800, color: "#2980b9", minWidth: 48 }}>{raioKm} km</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto", flexWrap: "wrap" }}>
          {[{ l: "Quente", c: "#e74c3c" }, { l: "Morno", c: "#e67e22" }, { l: "Frio", c: "#2980b9" }, { l: "Sem temp.", c: "#7f8c9a" }].map((s) => (
            <span key={s.l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "rgba(20,45,70,0.55)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.c, border: "1.5px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }} />
              {s.l}
            </span>
          ))}
        </div>
      </div>

      {/* Mapa */}
      <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(200,225,240,0.7)" }}>
        {!ready && (
          <div style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(228,244,252,0.6)", fontSize: 13, fontWeight: 600, color: "rgba(20,45,70,0.5)" }}>
            Carregando mapa...
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: "calc(100vh - 280px)", minHeight: 460, zIndex: 1 }} />
      </div>

      {/* Rodapé informativo */}
      <div style={{ fontSize: 11, color: "rgba(20,45,70,0.5)", display: "flex", gap: 14, flexWrap: "wrap" }}>
        <span><b style={{ color: "#2980b9" }}>{pontos.length}</b> empresa{pontos.length !== 1 ? "s" : ""} no mapa</span>
        {semCoords > 0 && (
          <span style={{ color: "#e67e22" }}>
            {semCoords} sem localização (cadastro manual, sem coordenadas) — não aparecem no mapa
          </span>
        )}
        <span style={{ marginLeft: "auto" }}>Linhas tracejadas ligam cada empresa às {MAX_VIZINHOS} mais próximas dentro do raio · Mapa OpenStreetMap (custo zero)</span>
      </div>
    </div>
  );
}
