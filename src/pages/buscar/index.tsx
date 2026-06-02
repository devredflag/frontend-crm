import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  APIProvider, Map, AdvancedMarker, InfoWindow,
} from "@vis.gl/react-google-maps";
import {
  BarChart3, LayoutDashboard, Search, Building2, Users,
  ClipboardList, Calendar, MapPin, Star, Phone, Globe,
  ChevronRight, ChevronDown, X, ExternalLink, Plus,
  Loader2, AlertCircle, CheckCircle2, Navigation2,
} from "lucide-react";

const API = "https://backend-crm-production-157b.up.railway.app";
const MAPS_KEY = "AIzaSyBYLYOGC9tpf2uTjPPalfzvq06H_gV0dwM";
const MAPS_ID  = "34faf6a32c6d946937cf70eb";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
  @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:rgba(255,255,255,0.65); transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(255,255,255,0.08); color:#fff; }
  .nav-item.active { background:rgba(255,255,255,0.14); color:#fff; font-weight:600; }
  .skeleton { background:linear-gradient(90deg,rgba(200,225,240,0.4) 25%,rgba(220,240,252,0.7) 50%,rgba(200,225,240,0.4) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; }
  .result-card { background:rgba(255,255,255,0.82); border:1.5px solid rgba(200,225,240,0.7); border-radius:14px; padding:14px; cursor:pointer; transition:all 0.18s; }
  .result-card:hover { border-color:rgba(41,128,185,0.45); box-shadow:0 6px 24px rgba(41,128,185,0.14); transform:translateY(-1px); }
  .result-card.selected { border-color:rgba(41,128,185,0.6); background:rgba(41,128,185,0.05); box-shadow:0 6px 24px rgba(41,128,185,0.18); }
  .chip-filter { padding:5px 12px; border-radius:20px; border:1.5px solid rgba(200,225,240,0.8); background:rgba(255,255,255,0.65); font-size:11px; font-weight:700; cursor:pointer; transition:all 0.15s; color:rgba(20,45,70,0.6); }
  .chip-filter.active { border-color:rgba(41,128,185,0.5); background:rgba(41,128,185,0.1); color:#2980b9; }
  .chip-filter:hover { border-color:rgba(41,128,185,0.35); }
  .sugestao-chip { padding:7px 14px; border-radius:20px; border:1.5px solid rgba(200,225,240,0.8); background:rgba(255,255,255,0.7); font-size:12px; font-weight:600; cursor:pointer; transition:all 0.15s; color:rgba(20,45,70,0.7); white-space:nowrap; }
  .sugestao-chip:hover { border-color:rgba(41,128,185,0.4); background:rgba(41,128,185,0.07); color:#2980b9; }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(41,128,185,0.25); border-radius:4px; }
`;

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",                path: "/dashboard" },
  { icon: Search,          label: "Buscar Empresas",           path: "/buscar", active: true },
  { icon: Building2,       label: "Cadastrar Empresas",        path: "/empresas/nova" },
  { icon: Users,           label: "Todos os clientes",         path: "/clientes" },
  { icon: ClipboardList,   label: "Gerenciamento de clientes", path: "/gerenciamento" },
  { icon: Calendar,        label: "Calendário",                path: "/calendario" },
];

const SUGESTOES = ["embalagens", "metalúrgicas", "logística", "clínicas médicas", "tecnologia", "construção civil", "restaurantes", "farmácias"];

interface PlaceResult {
  place_id: string;
  nome: string;
  endereco: string;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  rating_count: number | null;
  telefone: string | null;
  site: string | null;
  business_status: string | null;
  open_now: boolean | null;
  tipo: string | null;
  ja_cadastrada: boolean;
}

function initials(n: string) { return n?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?"; }
function avatarColor(n: string) { const c=["#2980b9","#1abc9c","#8e44ad","#e67e22","#27ae60","#e74c3c"]; return c[(n?.charCodeAt(0)||0)%c.length]; }

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} style={{ width:10, height:10, fill: i <= Math.round(rating) ? "#fbbc04" : "none", color: i <= Math.round(rating) ? "#fbbc04" : "rgba(20,45,70,0.2)" }} />
      ))}
    </div>
  );
}

function PinNumerado({ numero, cadastrada }: { numero: number; cadastrada: boolean }) {
  const cor = cadastrada ? "#27ae60" : "#ea4335";
  return (
    <div style={{ width:28, height:36, position:"relative", cursor:"pointer" }}>
      <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.625 14 22 14 22S28 23.625 28 14C28 6.27 21.73 0 14 0z" fill={cor}/>
        <circle cx="14" cy="14" r="8" fill="white"/>
      </svg>
      <div style={{ position:"absolute", top:6, left:0, width:28, textAlign:"center", fontSize:9, fontWeight:900, color:cor }}>{numero}</div>
    </div>
  );
}

function ResultadoCard({
  place, index, selected, onSelect, onCadastrar, salvando,
}: {
  place: PlaceResult; index: number; selected: boolean;
  onSelect: () => void; onCadastrar: () => void; salvando: boolean;
}) {
  const aberto = place.open_now;
  return (
    <div className={`result-card${selected ? " selected" : ""}`} onClick={onSelect}>
      <div style={{ display:"flex", gap:10 }}>
        {/* Número + avatar */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flexShrink:0 }}>
          <div style={{ width:22, height:22, borderRadius:"50%", background: place.ja_cadastrada ? "#27ae60" : "#ea4335", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, color:"#fff" }}>{index+1}</div>
          <div style={{ width:36, height:36, borderRadius:10, background:avatarColor(place.nome), display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#fff" }}>{initials(place.nome)}</div>
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:4 }}>
            <div style={{ fontSize:13, fontWeight:700, color: place.ja_cadastrada ? "#27ae60" : "#1a0dab", textDecoration: place.ja_cadastrada ? "line-through" : "none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
              {place.nome}
            </div>
            {place.ja_cadastrada && (
              <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:6, background:"rgba(39,174,96,0.12)", color:"#27ae60", border:"1px solid rgba(39,174,96,0.25)", flexShrink:0 }}>
                ✓ No CRM
              </span>
            )}
          </div>

          {place.tipo && (
            <div style={{ fontSize:10, color:"rgba(20,45,70,0.5)", marginTop:1 }}>{place.tipo}</div>
          )}

          {place.rating && (
            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:4 }}>
              <span style={{ fontSize:11, fontWeight:800, color:"#d97706" }}>{place.rating.toFixed(1)}</span>
              <StarRating rating={place.rating} />
              {place.rating_count && (
                <span style={{ fontSize:10, color:"rgba(20,45,70,0.4)" }}>({place.rating_count.toLocaleString("pt-BR")})</span>
              )}
            </div>
          )}

          {place.business_status && (
            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background: aberto ? "#27ae60" : "#dc2626", flexShrink:0 }} />
              <span style={{ fontSize:10, fontWeight:600, color: aberto ? "#27ae60" : "#dc2626" }}>
                {aberto ? "Aberto" : "Fechado"}
              </span>
            </div>
          )}

          {place.endereco && (
            <div style={{ display:"flex", alignItems:"flex-start", gap:4, marginTop:4 }}>
              <MapPin style={{ width:10, height:10, color:"rgba(20,45,70,0.4)", flexShrink:0, marginTop:1 }} />
              <span style={{ fontSize:10, color:"rgba(20,45,70,0.55)", lineHeight:1.4 }}>{place.endereco}</span>
            </div>
          )}

          <div style={{ display:"flex", gap:5, marginTop:8, flexWrap:"wrap" }}>
            {place.telefone && (
              <a href={`tel:${place.telefone}`} onClick={e=>e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:3, padding:"3px 8px", borderRadius:6, border:"1px solid rgba(200,225,240,0.8)", background:"rgba(255,255,255,0.8)", fontSize:10, fontWeight:600, color:"rgba(20,45,70,0.65)", textDecoration:"none" }}>
                <Phone style={{ width:9, height:9 }} />{place.telefone}
              </a>
            )}
            {place.site && (
              <a href={place.site.startsWith("http") ? place.site : `https://${place.site}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:3, padding:"3px 8px", borderRadius:6, border:"1px solid rgba(200,225,240,0.8)", background:"rgba(255,255,255,0.8)", fontSize:10, fontWeight:600, color:"#2980b9", textDecoration:"none" }}>
                <ExternalLink style={{ width:9, height:9 }} /> Site
              </a>
            )}
          </div>

          {!place.ja_cadastrada && (
            <button
              onClick={e=>{ e.stopPropagation(); onCadastrar(); }}
              disabled={salvando}
              style={{ marginTop:8, width:"100%", height:32, borderRadius:8, border:"none", background:"linear-gradient(135deg,#8e44ad,#2980b9,#1abc9c,#8e44ad)", backgroundSize:"200% 200%", animation:"gradientShift 4s ease infinite", color:"#fff", fontSize:11, fontWeight:700, cursor:salvando?"wait":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5, opacity:salvando?0.7:1 }}
            >
              {salvando ? <Loader2 style={{ width:11, height:11, animation:"spin 1s linear infinite" }} /> : <Plus style={{ width:11, height:11 }} />}
              {salvando ? "Salvando..." : "Iniciar cadastro"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BuscarEmpresas() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<{ nome: string; cargo: string } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [infoWindowId, setInfoWindowId] = useState<string | null>(null);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [filtroRating, setFiltroRating] = useState(false);
  const [filtroSite, setFiltroSite] = useState(false);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [totalRascunhos, setTotalRascunhos] = useState(0);
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "err" } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: -15.7801, lng: -47.9292 });
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  const hdrs = () => ({ "Content-Type":"application/json", Authorization:`Bearer ${localStorage.getItem("token")||""}` });

  useEffect(() => {
    fetch(`${API}/me`, { headers: hdrs() }).then(r => r.ok && r.json()).then(d => d && setUsuario(d));
    fetch(`${API}/empresas/rascunhos`, { headers: hdrs() }).then(r => r.ok && r.json()).then(d => Array.isArray(d) && setTotalRascunhos(d.length));
    navigator.geolocation?.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMapCenter(loc);
      setMyLocation(loc);
    });
  }, []);

  const showToast = (msg: string, tipo: "ok" | "err") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  const buscar = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/places/search`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ query: q, lat: mapCenter.lat, lng: mapCenter.lng, radius: 20000 }),
      });
      if (!res.ok) throw new Error("Erro na busca");
      const data = await res.json();
      setResults(data);
      // Centraliza o mapa no primeiro resultado com coordenadas
      const primeiro = data.find((p: PlaceResult) => p.lat && p.lng);
      if (primeiro) setMapCenter({ lat: primeiro.lat!, lng: primeiro.lng! });
    } catch {
      setError("Não foi possível conectar ao Google Places. Verifique a chave de API.");
    }
    setLoading(false);
  }, [mapCenter]);

  const handleInput = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(v), 600);
  };

  const cadastrar = async (place: PlaceResult) => {
    setSalvandoId(place.place_id);
    try {
      const res = await fetch(`${API}/empresas/rascunho`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({
          google_place_id: place.place_id,
          nome: place.nome,
          endereco_completo: place.endereco,
          lat: place.lat, lng: place.lng,
          latitude: place.lat, longitude: place.lng,
          telefone_empresa: place.telefone,
          site: place.site,
          google_rating: place.rating,
          google_rating_count: place.rating_count,
          business_status: place.business_status,
        }),
      });
      if (res.status === 409) {
        const body = await res.json();
        const eid = body.detail?.empresa_id || body.empresa_id;
        showToast("Empresa já está no CRM!", "err");
        if (eid) setTimeout(() => navigate(`/clientes/${eid}/editar`), 1500);
        return;
      }
      if (!res.ok) throw new Error();
      const body = await res.json();
      setTotalRascunhos(n => n + 1);
      showToast("Rascunho criado! Redirecionando...", "ok");
      setTimeout(() => navigate(`/clientes/${body.empresa_id}/editar`), 1200);
    } catch {
      showToast("Erro ao criar rascunho.", "err");
    }
    setSalvandoId(null);
  };

  const resultadosFiltrados = results.filter(r => {
    if (filtroAberto && r.open_now !== true) return false;
    if (filtroRating && (!r.rating || r.rating < 4)) return false;
    if (filtroSite && !r.site) return false;
    return true;
  });

  const selectedPlace = results.find(r => r.place_id === selectedId);

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", position:"relative" }}>
      <style>{css}</style>

      {/* Background */}
      <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(145deg,#c8e8f5 0%,#d6eef5 30%,#cceee8 65%,#c5eae0 100%)" }} />
        <div style={{ position:"absolute", inset:0, opacity:0.4, backgroundImage:"radial-gradient(circle,rgba(41,128,185,0.2) 1px,transparent 1px)", backgroundSize:"22px 22px" }} />
      </div>

      {/* Sidebar nav */}
      <div style={{ width:220, flexShrink:0, height:"100vh", overflowY:"auto", position:"relative", zIndex:10, background:"linear-gradient(180deg,#1a3a5c 0%,#0f2a44 60%,#0a1f33 100%)", boxShadow:"4px 0 24px rgba(0,0,0,0.18)", display:"flex", flexDirection:"column", padding:"0 12px 20px" }}>
        <div style={{ padding:"22px 4px 24px", borderBottom:"1px solid rgba(255,255,255,0.08)", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#2980b9,#1abc9c)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <BarChart3 style={{ width:18, height:18, color:"#fff" }} />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Prospecção</div>
              <div style={{ fontSize:11, fontWeight:700, background:"linear-gradient(90deg,#2980b9,#1abc9c,#2ecc71,#2980b9)", backgroundSize:"200% 200%", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"gradientShift 4s ease infinite" }}>CRM</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, display:"flex", flexDirection:"column", gap:2 }}>
          {navItems.map(item => (
            <div key={item.label} className={`nav-item${item.active ? " active" : ""}`} onClick={() => navigate(item.path)}>
              <item.icon style={{ width:16, height:16, flexShrink:0 }} />{item.label}
            </div>
          ))}
        </nav>
        {usuario && (
          <div onClick={() => navigate("/perfil")} style={{ marginTop:16, padding:"12px", borderRadius:12, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg,${avatarColor(usuario.nome)},#1abc9c)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>{initials(usuario.nome)}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{usuario.nome}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)" }}>{usuario.cargo || "Administrador"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", position:"relative", zIndex:5, overflow:"hidden" }}>

        {/* Topbar */}
        <div style={{ padding:"14px 24px", background:"rgba(210,238,248,0.85)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.6)", flexShrink:0, display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(20,45,70,0.45)", letterSpacing:"0.08em", textTransform:"uppercase" }}>Prospecção</div>
            <h1 style={{ fontSize:20, fontWeight:900, color:"#0f2133", letterSpacing:"-0.02em" }}>Buscar Empresas</h1>
          </div>
          {totalRascunhos > 0 && (
            <button onClick={() => navigate("/gerenciamento")} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, border:"1.5px solid rgba(142,68,173,0.4)", background:"rgba(142,68,173,0.1)", color:"#7d3c98", fontSize:12, fontWeight:700, cursor:"pointer" }}>
              <ClipboardList style={{ width:13, height:13 }} />
              {totalRascunhos} rascunho{totalRascunhos > 1 ? "s" : ""} pendente{totalRascunhos > 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* Search + mapa */}
        <div style={{ flex:1, display:"grid", gridTemplateColumns:"320px 1fr", overflow:"hidden" }}>

          {/* Sidebar de resultados */}
          <div style={{ display:"flex", flexDirection:"column", overflow:"hidden", background:"rgba(228,244,252,0.6)", backdropFilter:"blur(12px)", borderRight:"1px solid rgba(200,225,240,0.5)" }}>

            {/* Search bar */}
            <div style={{ padding:"14px 14px 10px" }}>
              <div style={{ position:"relative" }}>
                <Search style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:"rgba(20,45,70,0.4)" }} />
                <input
                  value={query}
                  onChange={e => handleInput(e.target.value)}
                  placeholder="Buscar por categoria, segmento..."
                  onKeyDown={e => e.key === "Enter" && buscar(query)}
                  style={{ width:"100%", height:42, paddingLeft:32, paddingRight:query ? 32 : 12, borderRadius:12, border:"1.5px solid rgba(200,225,240,0.9)", background:"rgba(255,255,255,0.9)", fontSize:13, color:"#1a2e40", outline:"none", boxShadow:"0 2px 8px rgba(41,128,185,0.08)" }}
                />
                {query && (
                  <button onClick={() => { setQuery(""); setResults([]); }} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", width:20, height:20, borderRadius:"50%", border:"none", background:"rgba(20,45,70,0.12)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <X style={{ width:11, height:11, color:"rgba(20,45,70,0.5)" }} />
                  </button>
                )}
              </div>

              {/* Filtros */}
              <div style={{ display:"flex", gap:5, marginTop:8, flexWrap:"wrap" }}>
                <button className={`chip-filter${filtroAberto?" active":""}`} onClick={() => setFiltroAberto(!filtroAberto)}>Aberto agora</button>
                <button className={`chip-filter${filtroRating?" active":""}`} onClick={() => setFiltroRating(!filtroRating)}>★ 4.0+</button>
                <button className={`chip-filter${filtroSite?" active":""}`} onClick={() => setFiltroSite(!filtroSite)}>Tem site</button>
              </div>
            </div>

            {/* Lista */}
            <div style={{ flex:1, overflowY:"auto", padding:"0 14px 14px", display:"flex", flexDirection:"column", gap:8 }}>

              {/* Estado vazio — sugestões */}
              {!loading && results.length === 0 && !error && (
                <div style={{ paddingTop:8 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"rgba(20,45,70,0.45)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>Sugestões rápidas</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {SUGESTOES.map(s => (
                      <button key={s} className="sugestao-chip" onClick={() => { setQuery(s); buscar(s); }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop:24, textAlign:"center", padding:"20px 0" }}>
                    <div style={{ width:52, height:52, borderRadius:"50%", background:"rgba(41,128,185,0.08)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                      <MapPin style={{ width:22, height:22, color:"rgba(41,128,185,0.35)" }} />
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:"rgba(20,45,70,0.45)" }}>Busque por segmento ou tipo de empresa</div>
                    <div style={{ fontSize:11, color:"rgba(20,45,70,0.3)", marginTop:4 }}>Os resultados aparecerão no mapa e aqui na lista</div>
                  </div>
                </div>
              )}

              {/* Loading skeletons */}
              {loading && [1,2,3,4].map(i => (
                <div key={i} style={{ background:"rgba(255,255,255,0.8)", borderRadius:14, padding:14 }}>
                  <div className="skeleton" style={{ height:14, width:"70%", marginBottom:8 }} />
                  <div className="skeleton" style={{ height:10, width:"40%", marginBottom:6 }} />
                  <div className="skeleton" style={{ height:10, width:"90%" }} />
                </div>
              ))}

              {/* Erro */}
              {error && (
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 14px", borderRadius:12, background:"rgba(220,38,38,0.07)", border:"1px solid rgba(220,38,38,0.2)" }}>
                  <AlertCircle style={{ width:16, height:16, color:"#dc2626", flexShrink:0 }} />
                  <span style={{ fontSize:12, color:"#dc2626", fontWeight:600 }}>{error}</span>
                </div>
              )}

              {/* Resultados */}
              {!loading && resultadosFiltrados.length > 0 && (
                <>
                  <div style={{ fontSize:11, fontWeight:700, color:"rgba(20,45,70,0.5)", padding:"0 2px" }}>
                    {resultadosFiltrados.length} resultado{resultadosFiltrados.length > 1 ? "s" : ""}
                    {results.length !== resultadosFiltrados.length ? ` (de ${results.length})` : ""}
                  </div>
                  {resultadosFiltrados.map((place, i) => (
                    <ResultadoCard
                      key={place.place_id}
                      place={place}
                      index={i}
                      selected={selectedId === place.place_id}
                      onSelect={() => { setSelectedId(place.place_id); setInfoWindowId(place.place_id); setMapCenter({ lat: place.lat || mapCenter.lat, lng: place.lng || mapCenter.lng }); }}
                      onCadastrar={() => cadastrar(place)}
                      salvando={salvandoId === place.place_id}
                    />
                  ))}
                </>
              )}

              {!loading && results.length > 0 && resultadosFiltrados.length === 0 && (
                <div style={{ textAlign:"center", padding:"24px 0", color:"rgba(20,45,70,0.4)" }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Nenhum resultado com esses filtros</div>
                  <button onClick={() => { setFiltroAberto(false); setFiltroRating(false); setFiltroSite(false); }} style={{ marginTop:8, padding:"5px 14px", borderRadius:8, border:"1px solid rgba(41,128,185,0.3)", background:"rgba(41,128,185,0.07)", color:"#2980b9", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Google Maps */}
          <div style={{ position:"relative", overflow:"hidden" }}>
            {/* Botão minha localização */}
            {myLocation && (
              <button
                onClick={() => setMapCenter({ ...myLocation })}
                title="Minha localização"
                style={{ position:"absolute", bottom:120, right:10, zIndex:10, width:40, height:40, borderRadius:10, border:"none", background:"#fff", boxShadow:"0 2px 8px rgba(0,0,0,0.2)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
              >
                <Navigation2 style={{ width:18, height:18, color:"#2980b9" }} />
              </button>
            )}
            {!MAPS_KEY ? (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:12, background:"rgba(200,225,240,0.3)" }}>
                <AlertCircle style={{ width:32, height:32, color:"rgba(20,45,70,0.3)" }} />
                <div style={{ fontSize:14, fontWeight:700, color:"rgba(20,45,70,0.45)" }}>Chave do Google Maps não configurada</div>
                <div style={{ fontSize:12, color:"rgba(20,45,70,0.35)" }}>Adicione VITE_GOOGLE_MAPS_KEY no .env</div>
              </div>
            ) : (
              <APIProvider apiKey={MAPS_KEY}>
                <Map
                  mapId={MAPS_ID}
                  center={mapCenter}
                  zoom={results.length > 0 ? 13 : 11}
                  style={{ width:"100%", height:"100%" }}
                  gestureHandling="cooperative"
                  disableDefaultUI={false}
                  onCameraChanged={(e) => setMapCenter(e.detail.center)}
                >
                  {resultadosFiltrados.map((place, i) => (
                    place.lat && place.lng ? (
                      <AdvancedMarker
                        key={place.place_id}
                        position={{ lat: place.lat, lng: place.lng }}
                        onClick={() => { setSelectedId(place.place_id); setInfoWindowId(place.place_id); }}
                      >
                        <PinNumerado numero={i+1} cadastrada={place.ja_cadastrada} />
                      </AdvancedMarker>
                    ) : null
                  ))}

                  {myLocation && (
                    <AdvancedMarker position={myLocation}>
                      <div style={{ width:16, height:16, borderRadius:"50%", background:"#2980b9", border:"3px solid #fff", boxShadow:"0 2px 8px rgba(41,128,185,0.5)" }} />
                    </AdvancedMarker>
                  )}

                  {infoWindowId && selectedPlace && selectedPlace.lat && selectedPlace.lng && (
                    <InfoWindow
                      position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                      onCloseClick={() => setInfoWindowId(null)}
                    >
                      <div style={{ fontFamily:"Plus Jakarta Sans, sans-serif", maxWidth:220, padding:4 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#0f2133", marginBottom:4 }}>{selectedPlace.nome}</div>
                        {selectedPlace.rating && (
                          <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:4 }}>
                            <span style={{ fontSize:11, fontWeight:800, color:"#d97706" }}>{selectedPlace.rating.toFixed(1)}</span>
                            <StarRating rating={selectedPlace.rating} />
                          </div>
                        )}
                        {selectedPlace.endereco && <div style={{ fontSize:11, color:"rgba(20,45,70,0.6)", marginBottom:6, lineHeight:1.4 }}>{selectedPlace.endereco}</div>}
                        {!selectedPlace.ja_cadastrada && (
                          <button
                            onClick={() => { setInfoWindowId(null); cadastrar(selectedPlace); }}
                            style={{ width:"100%", height:28, borderRadius:7, border:"none", background:"linear-gradient(135deg,#8e44ad,#2980b9)", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}
                          >
                            + Iniciar cadastro
                          </button>
                        )}
                        {selectedPlace.ja_cadastrada && (
                          <span style={{ fontSize:10, fontWeight:700, color:"#27ae60" }}>✓ Já está no CRM</span>
                        )}
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0, y:40 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:40 }}
            style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", zIndex:200, display:"flex", alignItems:"center", gap:8, padding:"10px 20px", borderRadius:12, background: toast.tipo === "ok" ? "rgba(39,174,96,0.95)" : "rgba(220,38,38,0.95)", color:"#fff", fontSize:13, fontWeight:700, boxShadow:"0 8px 24px rgba(0,0,0,0.2)", backdropFilter:"blur(8px)" }}
          >
            {toast.tipo === "ok" ? <CheckCircle2 style={{ width:15, height:15 }} /> : <AlertCircle style={{ width:15, height:15 }} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
