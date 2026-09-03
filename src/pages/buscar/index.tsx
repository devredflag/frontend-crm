import { getToken } from "../../services/auth";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  APIProvider, Map, AdvancedMarker, InfoWindow,
} from "@vis.gl/react-google-maps";
import {
  BarChart3, LayoutDashboard, TrendingUp, Search, Building2, Users,
  ClipboardList, Calendar, MapPin,
  X, Plus,
  Loader2, AlertCircle, Navigation2, Menu, UserRoundCog,
  Check, CheckSquare, Square,
} from "lucide-react";
import useIsMobile from "../../hooks/useIsMobile";
import CardUsuario, { useUsuarioLogado, podeVerInsights } from "../../components/CardUsuario";

import FundoAzul from "../../components/FundoAzul";
const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");
const MAPS_KEY = "AIzaSyBYLYOGC9tpf2uTjPPalfzvq06H_gV0dwM";
const MAPS_ID  = "34faf6a32c6d946937cf70eb";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
  @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:#FFFFFF; transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(126,176,219,0.08); color:#fff; }
  .nav-item.active { background:rgba(126,176,219,0.08); color:#fff; font-weight:600; }
  .skeleton { background:linear-gradient(90deg,rgba(126,176,219,0.08) 25%,rgba(220,240,252,0.7) 50%,rgba(126,176,219,0.08) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; }
  .result-card { background:#143354; border:1.5px solid rgba(126,176,219,0.16); border-radius:14px; padding:14px; cursor:pointer; transition:all 0.18s; }
  .result-card:hover { border-color:rgba(126,176,219,0.30); box-shadow:0 6px 24px rgba(86,164,245,0.14); transform:translateY(-1px); }
  .result-card.selected { border-color:rgba(126,176,219,0.30); background:rgba(86,164,245,0.05); box-shadow:0 6px 24px rgba(86,164,245,0.18); }
  .chip-filter { padding:5px 12px; border-radius:20px; border:1.5px solid rgba(126,176,219,0.16); background:#143354; font-size:11px; font-weight:700; cursor:pointer; transition:all 0.15s; color:#FFFFFF; }
  .chip-filter.active { border-color:rgba(126,176,219,0.30); background:rgba(86,164,245,0.1); color:#B6CFE4; }
  .chip-filter:hover { border-color:rgba(126,176,219,0.30); }
  .sugestao-chip { padding:7px 14px; border-radius:20px; border:1.5px solid rgba(126,176,219,0.16); background:#143354; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.15s; color:#FFFFFF; white-space:nowrap; }
  .sugestao-chip:hover { border-color:rgba(126,176,219,0.30); background:rgba(86,164,245,0.07); color:#B6CFE4; }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(86,164,245,0.25); border-radius:4px; }
`;

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",                path: "/dashboard" },
  { icon: TrendingUp,      label: "Insights",                  path: "/insights" },
  { icon: Search,          label: "Buscar Empresas",           path: "/buscar", active: true },
  { icon: Building2,       label: "Cadastrar Empresas",        path: "/empresas/nova" },
  { icon: Users,           label: "Todos os clientes",         path: "/clientes" },
  { icon: ClipboardList,   label: "Gerenciamento", path: "/gerenciamento" },
  { icon: Calendar,        label: "Calendário",                path: "/calendario" },
];

// Raio fixo, e nao um seletor na tela. Houve um seletor com presets; foi
// removido de proposito depois de checar a documentacao da Places API:
//
//   1. `pageSize` maximo e 20. Raio maior NAO traz mais empresas -- muda quais
//      20 aparecem, nada alem disso.
//   2. `locationBias` e PREFERENCIA, nao filtro: "results around the specified
//      location can be returned, including results outside the specified area".
//      Ou seja, o numero nunca foi uma fronteira, e a interface que o chamava de
//      "raio" prometia uma precisao que a API nao entrega.
//
// Sobrava um controle que gastava uma consulta paga por clique para trocar a
// composicao dos mesmos 20 resultados. Fixar alto entrega o mesmo alcance sem
// o custo e sem a promessa falsa. Para virar fronteira de verdade seria preciso
// `locationRestriction` -- que so aceita retangulo e devolve MENOS de 20, por
// filtrar de fato.
//
// 300 km cobre uma regiao de porte estadual a partir do ponto de origem, que e
// a escala em que a prospeccao deste CRM acontece.
const RAIO_BUSCA_KM = 300;

const SUGESTOES = ["embalagens", "metalúrgicas", "logística", "clínicas médicas", "tecnologia", "construção civil", "restaurantes", "farmácias"];

interface PlaceResult {
  place_id: string;
  nome: string;
  endereco: string;
  endereco_rua: string | null;
  cidade: string | null;
  bairro: string | null;
  cep: string | null;
  lat: number | null;
  lng: number | null;
  business_status: string | null;
  tipo: string | null;
  ja_cadastrada: boolean;
}

// Espelha o GET /places/cota. `restantes` vem null quando o teto está
// desligado — sem teto não existe "quantas faltam".
interface Cota {
  usadas: number;
  limite: number;
  restantes: number | null;
  bloqueado: boolean;
  teto_ligado: boolean;
  pode_alternar: boolean;
  reset_em: string;
  mensagem: string | null;
}

function initials(n: string) { return n?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?"; }
function avatarColor(n: string) { const c=["#B6CFE4","#2CCD93","#A78BFA","#F0A05A","#2CCD93","#F87171"]; return c[(n?.charCodeAt(0)||0)%c.length]; }

function PinNumerado({ numero, cadastrada }: { numero: number; cadastrada: boolean }) {
  const cor = cadastrada ? "#2CCD93" : "#ea4335";
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
  place, index, selected, marcado, onMarcar, onSelect, onCadastrar, salvando,
}: {
  place: PlaceResult; index: number; selected: boolean;
  marcado: boolean; onMarcar: () => void;
  onSelect: () => void; onCadastrar: () => void; salvando?: boolean;
}) {
  const operacional = place.business_status === "OPERATIONAL";
  return (
    <div className={`result-card${selected ? " selected" : ""}`} onClick={onSelect}>
      <div style={{ display:"flex", gap:10 }}>
        {/* Número + avatar */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flexShrink:0 }}>
          {/* Empresa ja cadastrada nao tem o que marcar: criar rascunho dela
              seria duplicata, e o backend recusa com 409 de qualquer forma. */}
          {!place.ja_cadastrada && (
            <button
              onClick={e => { e.stopPropagation(); onMarcar(); }}
              aria-label={marcado ? `Desmarcar ${place.nome}` : `Marcar ${place.nome} para criar rascunho`}
              aria-pressed={marcado}
              style={{ width:22, height:22, borderRadius:6, border:"none", background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}
            >
              {marcado
                ? <CheckSquare style={{ width:17, height:17, color:"#2CCD93" }} />
                : <Square style={{ width:17, height:17, color:"#B6CFE4" }} />}
            </button>
          )}
          <div style={{ width:22, height:22, borderRadius:"50%", background:place.ja_cadastrada ? "#2CCD93" : "#ea4335", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, color:"#FFFFFF" }}>{index+1}</div>
          <div style={{ width:36, height:36, borderRadius:10, background:avatarColor(place.nome), display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#FFFFFF" }}>{initials(place.nome)}</div>
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:4 }}>
            <div style={{ fontSize:13, fontWeight:700, color:place.ja_cadastrada ? "#2CCD93" : "#1a0dab", textDecoration: place.ja_cadastrada ? "line-through" : "none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
              {place.nome}
            </div>
            {place.ja_cadastrada && (
              <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:6, background:"rgba(44,205,147,0.12)", color:"#2CCD93", border:"1px solid rgba(44,205,147,0.25)", flexShrink:0 }}>
                ✓ No CRM
              </span>
            )}
          </div>

          {place.tipo && (
            <div style={{ fontSize:10, color:"#B6CFE4", marginTop:1 }}>{place.tipo}</div>
          )}

          {place.business_status && (
            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:operacional ? "#2CCD93" : "#F87171", flexShrink:0 }} />
              <span style={{ fontSize:10, fontWeight:600, color:operacional ? "#2CCD93" : "#F87171" }}>
                {operacional ? "Em operação" : "Fechado"}
              </span>
            </div>
          )}

          {place.endereco && (
            <div style={{ display:"flex", alignItems:"flex-start", gap:4, marginTop:4 }}>
              <MapPin style={{ width:10, height:10, color:"#B6CFE4", flexShrink:0, marginTop:1 }} />
              <span style={{ fontSize:10, color:"#B6CFE4", lineHeight:1.4 }}>{place.endereco}</span>
            </div>
          )}

          {!place.ja_cadastrada && (
            <button
              onClick={e=>{ e.stopPropagation(); onCadastrar(); }}
              disabled={salvando}
              style={{ marginTop:8, width:"100%", height:32, borderRadius:8, border:"none", background:"linear-gradient(135deg,#2CCD93,#2CCD93,#56A4F5,#2CCD93)", backgroundSize:"200% 200%", animation:"gradientShift 4s ease infinite", color:"#FFFFFF", fontSize:11, fontWeight:700, cursor:salvando?"wait":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5, opacity:salvando?0.7:1 }}
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
  // Insights e tela de gestao: fica fora do menu de quem nao e gerente.
  const podeInsights = podeVerInsights(useUsuarioLogado());
  const location = useLocation();
  // Quando a busca é aberta a partir de uma empresa ("Prospectar novas aqui"),
  // o centro do mapa vem dela — o usuário não redigita cidade nem endereço.
  const origem = (location.state as any)?.origem as
    | { lat: number; lng: number; nome?: string; cidade?: string; empresa_id?: string }
    | undefined;
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [usuario, setUsuario] = useState<{ nome: string; cargo: string } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [infoWindowId, setInfoWindowId] = useState<string | null>(null);
  const [totalRascunhos, setTotalRascunhos] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapCenter, setMapCenter] = useState(
    origem ? { lat: origem.lat, lng: origem.lng } : { lat: -15.7801, lng: -47.9292 }
  );
  const [mapZoom, setMapZoom] = useState(11);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  // Selecao multipla para criar varios rascunhos de uma vez.
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [criandoLote, setCriandoLote] = useState(false);
  const [progressoLote, setProgressoLote] = useState(0);
  const [resumoLote, setResumoLote] = useState<{ criados:number; jaExistiam:number; falhas:number } | null>(null);
  const [quotaExcedida, setQuotaExcedida] = useState(false);
  const [quotaResetTime, setQuotaResetTime] = useState<Date | null>(null);
  // A explicação do bloqueio vem do backend: só ele sabe se quem barrou foi o
  // nosso teto diário (com hora certa de liberar) ou o próprio Google.
  const [quotaMsg, setQuotaMsg] = useState<string | null>(null);
  const [cota, setCota] = useState<Cota | null>(null);
  const [alternandoTeto, setAlternandoTeto] = useState(false);

  const hdrs = () => ({ "Content-Type":"application/json", Authorization:`Bearer ${getToken()||""}` });

  useEffect(() => {
    fetch(`${API}/me`, { headers: hdrs() }).then(r => r.ok && r.json()).then(d => d && setUsuario(d));
    fetch(`${API}/empresas/rascunhos`, { headers: hdrs() }).then(r => r.ok && r.json()).then(d => Array.isArray(d) && setTotalRascunhos(d.length));
    navigator.geolocation?.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      // Com origem definida por uma empresa, o GPS só alimenta "minha posição";
      // o centro da busca continua sendo a empresa de referência.
      if (!origem) setMapCenter(loc);
      setMyLocation(loc);
    });
    // Estado do teto de buscas pagas do mês. Antes isso saía do localStorage —
    // era por navegador, então limpar o storage "destravava" a tela sem
    // destravar nada de verdade, e a hora de reset era chutada como meia-noite
    // UTC do dia seguinte. Agora responde o servidor, que é quem barra a
    // chamada paga.
    fetch(`${API}/places/cota`, { headers: hdrs() })
      .then(r => (r.ok ? r.json() : null))
      .then((d: Cota | null) => {
        if (!d) return;
        setCota(d);
        if (d.bloqueado) {
          setQuotaExcedida(true);
          setQuotaResetTime(d.reset_em ? new Date(d.reset_em) : null);
          setQuotaMsg(d.mensagem ?? null);
        }
      })
      .catch(() => {});
    // Só na montagem: `origem` vem do state da rota e não muda enquanto a tela vive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buscar = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    if (quotaExcedida) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/places/search`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ query: q, lat: mapCenter.lat, lng: mapCenter.lng, radius: RAIO_BUSCA_KM * 1000 }),
      });
      if (res.status === 429) {
        // `detail` é o objeto que o backend monta — seu teto mensal (reset na
        // virada do mês) ou recusa do Google (nova tentativa em minutos).
        const corpo = await res.json().catch(() => null);
        const d = corpo?.detail;
        setQuotaExcedida(true);
        setQuotaResetTime(d?.reset_em ? new Date(d.reset_em) : null);
        setQuotaMsg(
          typeof d === "string" ? d : d?.mensagem ?? "Busca nova indisponível no momento."
        );
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Erro na busca");
      const data = await res.json();
      setResults(data);
      // A selecao aponta para place_ids da busca anterior; manter seria criar
      // rascunho de empresa que nao esta mais na lista.
      setMarcados(new Set());
      setResumoLote(null);
      const primeiro = data.find((p: PlaceResult) => p.lat && p.lng);
      if (primeiro) { setMapCenter({ lat: primeiro.lat!, lng: primeiro.lng! }); setMapZoom(13); }
      // Só cache miss consome cota, e daqui não dá para saber se consumiu —
      // quem sabe é o servidor. Relê para o contador não mentir.
      fetch(`${API}/places/cota`, { headers: hdrs() })
        .then(r => (r.ok ? r.json() : null))
        .then((d: Cota | null) => d && setCota(d))
        .catch(() => {});
    } catch {
      setError("Não foi possível conectar ao Google Places. Verifique a chave de API.");
    }
    setLoading(false);
  }, [mapCenter, quotaExcedida]);

  // Reabilita o campo na hora que o servidor informou, sem exigir recarregar a
  // página — e sem inventar a hora, como fazia o "meia-noite UTC" de antes.
  useEffect(() => {
    if (!quotaExcedida || !quotaResetTime) return;
    const liberar = () => { setQuotaExcedida(false); setQuotaResetTime(null); setQuotaMsg(null); };
    const ms = quotaResetTime.getTime() - Date.now();
    if (ms <= 0) { liberar(); return; }
    const t = setTimeout(liberar, ms + 1000);
    return () => clearTimeout(t);
  }, [quotaExcedida, quotaResetTime]);

  // Botão de teste do gerente. Quem desliga de verdade é o servidor: mexer só
  // no front seria a mesma ilusão do localStorage que acabamos de tirar daqui.
  const alternarTeto = async (ligado: boolean) => {
    setAlternandoTeto(true);
    try {
      const r = await fetch(`${API}/places/cota/teto`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ ligado }),
      });
      if (r.ok) {
        const d: Cota = await r.json();
        setCota(d);
        if (!d.bloqueado) { setQuotaExcedida(false); setQuotaMsg(null); setQuotaResetTime(null); }
      }
    } catch {
      /* silencioso: o painel continua mostrando o estado anterior */
    }
    setAlternandoTeto(false);
  };

  const handleInput = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(v), 600);
  };

  const alternarMarcado = (placeId: string) => {
    setMarcados(prev => {
      const novo = new Set(prev);
      if (novo.has(placeId)) novo.delete(placeId); else novo.add(placeId);
      return novo;
    });
    setResumoLote(null);
  };

  const selecionaveis = results.filter(p => !p.ja_cadastrada);
  const todasMarcadas = selecionaveis.length > 0 && selecionaveis.every(p => marcados.has(p.place_id));

  /**
   * Cria um rascunho por empresa marcada.
   *
   * Sequencial de proposito: sao ate 20 INSERTs e o ganho de disparar tudo junto
   * nao paga o risco de estourar a conexao do banco por um clique. O contador
   * de progresso existe porque, sequencial, isto leva alguns segundos.
   *
   * 409 nao e falha: significa que a empresa ja entrou no CRM (por outra busca
   * ou por outra pessoa) -- conta separado para o resumo nao acusar erro que
   * nao houve.
   */
  const criarRascunhosEmLote = async () => {
    const alvos = results.filter(p => marcados.has(p.place_id));
    if (alvos.length === 0) return;
    setCriandoLote(true);
    setProgressoLote(0);
    setResumoLote(null);
    let criados = 0, jaExistiam = 0, falhas = 0;
    const criadosIds = new Set<string>();

    for (const place of alvos) {
      try {
        const r = await fetch(`${API}/empresas/rascunho`, {
          method: "POST", headers: hdrs(),
          body: JSON.stringify({
            nome: place.nome,
            endereco_completo: place.endereco_rua || place.endereco,
            cidade: place.cidade,
            google_place_id: place.place_id,
            latitude: place.lat,
            longitude: place.lng,
            business_status: place.business_status,
          }),
        });
        if (r.status === 201) { criados += 1; criadosIds.add(place.place_id); }
        else if (r.status === 409) { jaExistiam += 1; criadosIds.add(place.place_id); }
        else falhas += 1;
      } catch { falhas += 1; }
      setProgressoLote(p => p + 1);
    }

    // Quem entrou vira "✓ No CRM" na hora, sem refazer a busca paga.
    if (criadosIds.size > 0) {
      setResults(prev => prev.map(p => criadosIds.has(p.place_id) ? { ...p, ja_cadastrada: true } : p));
    }
    setMarcados(new Set());
    setResumoLote({ criados, jaExistiam, falhas });
    setCriandoLote(false);
    fetch(`${API}/empresas/rascunhos`, { headers: hdrs() })
      .then(r => r.ok && r.json())
      .then(d => Array.isArray(d) && setTotalRascunhos(d.length))
      .catch(() => {});
  };

  const cadastrar = (place: PlaceResult) => {
    navigate("/empresas/nova", {
      state: {
        prefill: {
          nome: place.nome,
          endereco: place.endereco_rua || place.endereco,
          cidade: place.cidade || "",
          bairro: place.bairro || "",
          cep: place.cep || "",
          google_place_id: place.place_id,
          latitude: place.lat,
          longitude: place.lng,
          business_status: place.business_status,
        },
      },
    });
  };

  const resultadosFiltrados = results;

  const selectedPlace = results.find(r => r.place_id === selectedId);

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", position:"relative" }}>
      <style>{css}</style>

      {/* Background */}
      <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
        <FundoAzul />
      </div>

      {/* Backdrop mobile */}
      {isMobile && menuOpen && (
        <div onClick={()=>setMenuOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(10,31,51,0.45)", zIndex:999 }}/>
      )}

      {/* Sidebar nav */}
      <div style={{ width:220, flexShrink:0, height:"100vh", overflowY:"auto", zIndex:1000, background:"linear-gradient(180deg,#10314F 0%,#0F2E4B 55%,#0D2942 100%)", boxShadow:"4px 0 24px rgba(0,0,0,0.18)", display:"flex", flexDirection:"column", padding:"0 12px 20px",
        position: isMobile ? "fixed" : "relative", top:0, left:0,
        transform: isMobile && !menuOpen ? "translateX(-100%)" : "translateX(0)",
        transition:"transform 0.28s ease" }}>
        <div style={{ padding:"22px 4px 24px", borderBottom:"1px solid rgba(126,176,219,0.16)", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#56A4F5,#56A4F5)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <BarChart3 style={{ width:18, height:18, color:"#fff" }} />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Prospecção</div>
              <div style={{ fontSize:11, fontWeight:700, background:"linear-gradient(90deg,#56A4F5,#56A4F5,#2CCD93,#56A4F5)", backgroundSize:"200% 200%", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"gradientShift 4s ease infinite" }}>CRM</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, display:"flex", flexDirection:"column", gap:2 }}>
          {navItems.filter(nav => nav.label !== "Insights" || podeInsights).map(item => (
            <div key={item.label} className={`nav-item${item.active ? " active" : ""}`} onClick={() => navigate(item.path)}>
              <item.icon style={{ width:16, height:16, flexShrink:0 }} />{item.label}
            </div>
          ))}
          {((usuario as any)?.is_gerente || (usuario as any)?.is_supervisor) && (
            <div className="nav-item" onClick={() => navigate("/equipe")}>
              <UserRoundCog style={{ width:16, height:16, flexShrink:0 }} />Equipe
            </div>
          )}
        </nav>
        <CardUsuario />
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", position:"relative", zIndex:5, overflow:"hidden" }}>

        {/* Topbar */}
        <div style={{ padding:isMobile?"12px 14px":"14px 24px", background:"rgba(15,46,75,0.88)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(126,176,219,0.16)", flexShrink:0, display:"flex", alignItems:"center", gap:isMobile?10:14 }}>
          {isMobile && (
            <button onClick={()=>setMenuOpen(true)} style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(126,176,219,0.16)", background:"#143354", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Menu style={{ width:18, height:18, color:"#B6CFE4" }}/>
            </button>
          )}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#B6CFE4", letterSpacing:"0.08em", textTransform:"uppercase" }}>Prospecção</div>
            <h1 style={{ fontSize:20, fontWeight:900, color:"#FFFFFF", letterSpacing:"-0.02em" }}>Buscar Empresas</h1>
          </div>
          {/* Veio de uma empresa: mostra qual é a referência e o caminho de volta */}
          {origem && (
            <button
              onClick={() => origem.empresa_id && navigate(`/clientes/${origem.empresa_id}?tab=proximas`)}
              title="Voltar para a empresa de referência"
              style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, border:"1.5px solid rgba(126,176,219,0.30)", background:"rgba(86,164,245,0.1)", color:"#B6CFE4", fontSize:12, fontWeight:700, cursor:"pointer", maxWidth:280, fontFamily:"inherit" }}>
              <Navigation2 style={{ width:13, height:13, flexShrink:0 }} />
              <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                Perto de {origem.nome || "empresa selecionada"}
              </span>
            </button>
          )}
          {totalRascunhos > 0 && (
            <button onClick={() => navigate("/gerenciamento")} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, border:"1.5px solid rgba(167,139,250,0.4)", background:"rgba(167,139,250,0.1)", color:"#A78BFA", fontSize:12, fontWeight:700, cursor:"pointer" }}>
              <ClipboardList style={{ width:13, height:13 }} />
              {totalRascunhos} rascunho{totalRascunhos > 1 ? "s" : ""} pendente{totalRascunhos > 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* Search + mapa */}
        <div style={{ flex:1, display:"grid", gridTemplateColumns:isMobile?"1fr":"320px 1fr", gridTemplateRows:isMobile?"42vh 1fr":undefined, overflow:"hidden" }}>

          {/* Sidebar de resultados */}
          <div style={{ display:"flex", flexDirection:"column", overflow:"hidden", background:"rgba(126,176,219,0.08)", backdropFilter:"blur(12px)", borderRight:"1px solid rgba(126,176,219,0.16)" }}>

            {/* Search bar */}
            <div style={{ padding:"14px 14px 10px" }}>
              <div style={{ position:"relative" }}>
                <Search style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:"#B6CFE4" }} />
                <input
                  value={query}
                  onChange={e => handleInput(e.target.value)}
                  placeholder={quotaExcedida ? "Busca indisponível no momento..." : "Buscar por categoria, segmento..."}
                  onKeyDown={e => e.key === "Enter" && buscar(query)}
                  disabled={quotaExcedida}
                  style={{ width:"100%", height:42, paddingLeft:32, paddingRight:query ? 32 : 12, borderRadius:12, border:`1.5px solid ${quotaExcedida ? "rgba(248,113,113,0.3)" : "rgba(126,176,219,0.16)"}`, background:quotaExcedida ? "rgba(248,113,113,0.10)" : "#143354", fontSize:13, color:"#FFFFFF", outline:"none", boxShadow:"0 2px 8px rgba(86,164,245,0.08)", cursor: quotaExcedida ? "not-allowed" : "text" }}
                />
                {query && (
                  <button onClick={() => { setQuery(""); setResults([]); }} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", width:20, height:20, borderRadius:"50%", border:"none", background:"rgba(126,176,219,0.08)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <X style={{ width:11, height:11, color:"#B6CFE4" }} />
                  </button>
                )}
              </div>

              {/* Consumo do mês + interruptor do teto (só o gerente alterna) */}
              {cota && (
                <div style={{ marginTop:10, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:11, fontWeight:700, color: cota.teto_ligado ? "#B6CFE4" : "#F0A05A" }}>
                    {cota.teto_ligado
                      ? `${cota.usadas}/${cota.limite} buscas novas este mês`
                      : `Limite desligado · ${cota.usadas} buscas novas este mês`}
                  </span>
                  {cota.pode_alternar && (
                    <button
                      onClick={() => alternarTeto(!cota.teto_ligado)}
                      disabled={alternandoTeto}
                      title={cota.teto_ligado
                        ? "Modo teste: nenhuma busca é barrada por nós — só o limite do Google Cloud continua valendo"
                        : `Volta a barrar em ${cota.limite} buscas novas por mês, por usuário`}
                      style={{ fontSize:10, fontWeight:700, padding:"5px 10px", borderRadius:8, cursor: alternandoTeto ? "wait" : "pointer",
                        border:`1px solid ${cota.teto_ligado ? "rgba(240,160,90,0.35)" : "rgba(44,205,147,0.35)"}`,
                        background: cota.teto_ligado ? "rgba(240,160,90,0.10)" : "rgba(44,205,147,0.10)",
                        color: cota.teto_ligado ? "#F0A05A" : "#2CCD93", opacity: alternandoTeto ? 0.6 : 1 }}
                    >
                      {cota.teto_ligado ? "Desligar limite (teste)" : `Religar limite de ${cota.limite}`}
                    </button>
                  )}
                </div>
              )}

            </div>

            {/* Lista */}
            <div style={{ flex:1, overflowY:"auto", padding:"0 14px 14px", display:"flex", flexDirection:"column", gap:8 }}>

              {/* Quota excedida */}
              {quotaExcedida && (
                <div style={{ marginTop:8, padding:"16px 14px", borderRadius:14, background:"rgba(248,113,113,0.06)", border:"1.5px solid rgba(248,113,113,0.25)", display:"flex", flexDirection:"column", gap:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <AlertCircle style={{ width:18, height:18, color:"#F87171", flexShrink:0 }} />
                    <span style={{ fontSize:13, fontWeight:700, color:"#F87171" }}>Busca nova pausada</span>
                  </div>
                  <p style={{ fontSize:12, color:"#FFFFFF", lineHeight:1.5 }}>
                    {quotaMsg ?? "Busca nova indisponível no momento."}
                  </p>
                  {quotaResetTime && (
                    <div style={{ fontSize:11, fontWeight:600, color:"#B6CFE4", padding:"6px 10px", borderRadius:8, background:"rgba(0,0,0,0.04)" }}>
                      Libera em {quotaResetTime.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}
                    </div>
                  )}
                </div>
              )}

              {/* Estado vazio — sugestões */}
              {!quotaExcedida && !loading && results.length === 0 && !error && (
                <div style={{ paddingTop:8 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#B6CFE4", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>Sugestões rápidas</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {SUGESTOES.map(s => (
                      <button key={s} className="sugestao-chip" onClick={() => { setQuery(s); buscar(s); }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop:24, textAlign:"center", padding:"20px 0" }}>
                    <div style={{ width:52, height:52, borderRadius:"50%", background:"rgba(86,164,245,0.08)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                      <MapPin style={{ width:22, height:22, color:"#B6CFE4" }} />
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#B6CFE4" }}>Busque por segmento ou tipo de empresa</div>
                    <div style={{ fontSize:11, color:"#B6CFE4", marginTop:4 }}>Os resultados aparecerão no mapa e aqui na lista</div>
                  </div>
                </div>
              )}

              {/* Loading skeletons */}
              {loading && [1,2,3,4].map(i => (
                <div key={i} style={{ background:"#143354", borderRadius:14, padding:14 }}>
                  <div className="skeleton" style={{ height:14, width:"70%", marginBottom:8 }} />
                  <div className="skeleton" style={{ height:10, width:"40%", marginBottom:6 }} />
                  <div className="skeleton" style={{ height:10, width:"90%" }} />
                </div>
              ))}

              {/* Erro */}
              {error && (
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 14px", borderRadius:12, background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.2)" }}>
                  <AlertCircle style={{ width:16, height:16, color:"#F87171", flexShrink:0 }} />
                  <span style={{ fontSize:12, color:"#F87171", fontWeight:600 }}>{error}</span>
                </div>
              )}

              {/* Resultados */}
              {!loading && resultadosFiltrados.length > 0 && (
                <>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"0 2px" }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#B6CFE4" }}>
                      {resultadosFiltrados.length} resultado{resultadosFiltrados.length > 1 ? "s" : ""}
                      {results.length !== resultadosFiltrados.length ? ` (de ${results.length})` : ""}
                    </span>
                    {selecionaveis.length > 0 && (
                      <button
                        onClick={() => setMarcados(todasMarcadas ? new Set() : new Set(selecionaveis.map(p => p.place_id)))}
                        style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 9px", borderRadius:8, fontSize:10.5, fontWeight:700,
                          border:"1px solid rgba(126,176,219,0.16)", background:"#143354", color:"#B6CFE4", cursor:"pointer", fontFamily:"inherit" }}>
                        {todasMarcadas
                          ? <><Square style={{ width:12, height:12 }} /> Limpar seleção</>
                          : <><CheckSquare style={{ width:12, height:12 }} /> Selecionar {selecionaveis.length}</>}
                      </button>
                    )}
                  </div>

                  {/* Resumo do lote anterior. Fica acima da lista porque e
                      resposta a uma acao que aconteceu ali. */}
                  {resumoLote && (
                    <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"10px 12px", borderRadius:11,
                      background: resumoLote.falhas ? "rgba(240,160,90,0.08)" : "rgba(44,205,147,0.08)",
                      border:`1px solid ${resumoLote.falhas ? "rgba(240,160,90,0.28)" : "rgba(44,205,147,0.28)"}` }}>
                      <Check style={{ width:13, height:13, color: resumoLote.falhas ? "#F0A05A" : "#2CCD93", flexShrink:0, marginTop:1 }} />
                      <span style={{ fontSize:11, color:"#FFFFFF", lineHeight:1.5, flex:1 }}>
                        {resumoLote.criados > 0 && <><strong>{resumoLote.criados} rascunho{resumoLote.criados > 1 ? "s" : ""}</strong> criado{resumoLote.criados > 1 ? "s" : ""}. </>}
                        {resumoLote.jaExistiam > 0 && <>{resumoLote.jaExistiam} já {resumoLote.jaExistiam > 1 ? "estavam" : "estava"} no CRM. </>}
                        {resumoLote.falhas > 0 && <span style={{ color:"#F0A05A" }}>{resumoLote.falhas} não {resumoLote.falhas > 1 ? "puderam" : "pôde"} ser criado{resumoLote.falhas > 1 ? "s" : ""}.</span>}
                        {resumoLote.criados === 0 && resumoLote.jaExistiam === 0 && resumoLote.falhas === 0 && "Nada a criar."}
                      </span>
                      <button onClick={() => setResumoLote(null)} aria-label="Fechar aviso"
                        style={{ border:"none", background:"none", cursor:"pointer", color:"#B6CFE4", display:"flex", padding:0 }}>
                        <X style={{ width:12, height:12 }} />
                      </button>
                    </div>
                  )}
                  {resultadosFiltrados.map((place, i) => (
                    <ResultadoCard
                      key={place.place_id}
                      place={place}
                      index={i}
                      selected={selectedId === place.place_id}
                      marcado={marcados.has(place.place_id)}
                      onMarcar={() => alternarMarcado(place.place_id)}
                      onSelect={() => { setSelectedId(place.place_id); setInfoWindowId(place.place_id); setMapCenter({ lat: place.lat || mapCenter.lat, lng: place.lng || mapCenter.lng }); }}
                      onCadastrar={() => cadastrar(place)}
                    />
                  ))}
                </>
              )}

            </div>

            {/* Barra do lote — so existe com algo marcado, e fica fora da area
                rolavel para nao sumir quando o usuario desce a lista. */}
            {marcados.size > 0 && (
              <div style={{ padding:"12px 14px", borderTop:"1px solid rgba(126,176,219,0.16)", background:"#0F2E4B", display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:800, color:"#FFFFFF" }}>
                    {marcados.size} empresa{marcados.size > 1 ? "s" : ""} marcada{marcados.size > 1 ? "s" : ""}
                  </div>
                  <div style={{ fontSize:10.5, color:"#B6CFE4", marginTop:1 }}>
                    {criandoLote ? `Criando ${progressoLote} de ${marcados.size}...` : "Entram como rascunho, prontas para completar"}
                  </div>
                </div>
                <button onClick={() => setMarcados(new Set())} disabled={criandoLote}
                  style={{ height:34, padding:"0 10px", borderRadius:9, fontSize:11, fontWeight:700, fontFamily:"inherit",
                    border:"1px solid rgba(126,176,219,0.16)", background:"#143354", color:"#B6CFE4",
                    cursor: criandoLote ? "not-allowed" : "pointer", opacity: criandoLote ? 0.5 : 1 }}>
                  Limpar
                </button>
                <button onClick={criarRascunhosEmLote} disabled={criandoLote}
                  style={{ height:34, padding:"0 14px", borderRadius:9, border:"none", fontSize:11.5, fontWeight:800, fontFamily:"inherit",
                    background:"linear-gradient(135deg,#2CCD93,#2CCD93,#56A4F5,#2CCD93)", backgroundSize:"200% 200%",
                    animation:"gradientShift 4s ease infinite", color:"#FFFFFF",
                    cursor: criandoLote ? "wait" : "pointer", opacity: criandoLote ? 0.75 : 1,
                    display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                  {criandoLote
                    ? <Loader2 style={{ width:12, height:12, animation:"spin 1s linear infinite" }} />
                    : <Plus style={{ width:12, height:12 }} />}
                  Criar {marcados.size} rascunho{marcados.size > 1 ? "s" : ""}
                </button>
              </div>
            )}
          </div>

          {/* Google Maps */}
          <div style={{ position:"relative", overflow:"hidden" }}>
            {/* Botão minha localização */}
            {myLocation && (
              <button
                onClick={() => setMapCenter({ ...myLocation })}
                title="Minha localização"
                style={{ position:"absolute", bottom:120, right:10, zIndex:10, width:40, height:40, borderRadius:10, border:"none", background:"#143354", boxShadow:"0 2px 8px rgba(0,0,0,0.2)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
              >
                <Navigation2 style={{ width:18, height:18, color:"#B6CFE4" }} />
              </button>
            )}
            {!MAPS_KEY ? (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:12, background:"rgba(126,176,219,0.08)" }}>
                <AlertCircle style={{ width:32, height:32, color:"#B6CFE4" }} />
                <div style={{ fontSize:14, fontWeight:700, color:"#B6CFE4" }}>Chave do Google Maps não configurada</div>
                <div style={{ fontSize:12, color:"#B6CFE4" }}>Adicione VITE_GOOGLE_MAPS_KEY no .env</div>
              </div>
            ) : (
              <APIProvider apiKey={MAPS_KEY}>
                <Map
                  mapId={MAPS_ID}
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ width:"100%", height:"100%" }}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  onCameraChanged={(e) => { setMapCenter(e.detail.center); setMapZoom(e.detail.zoom); }}
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
                      <div style={{ width:16, height:16, borderRadius:"50%", background:"#56A4F5", border:"3px solid rgba(126,176,219,0.16)", boxShadow:"0 2px 10px rgba(3,14,26,0.55)" }} />
                    </AdvancedMarker>
                  )}

                  {infoWindowId && selectedPlace && selectedPlace.lat && selectedPlace.lng && (
                    <InfoWindow
                      position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                      onCloseClick={() => setInfoWindowId(null)}
                    >
                      <div style={{ fontFamily:"Plus Jakarta Sans, sans-serif", maxWidth:220, padding:4 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#FFFFFF", marginBottom:4 }}>{selectedPlace.nome}</div>
                        {selectedPlace.endereco && <div style={{ fontSize:11, color:"#FFFFFF", marginBottom:6, lineHeight:1.4 }}>{selectedPlace.endereco}</div>}
                        {!selectedPlace.ja_cadastrada && (
                          <button
                            onClick={() => { setInfoWindowId(null); cadastrar(selectedPlace); }}
                            style={{ width:"100%", height:28, borderRadius:7, border:"none", background:"linear-gradient(135deg,#56A4F5,#56A4F5)", color:"#FFFFFF", fontSize:11, fontWeight:700, cursor:"pointer" }}
                          >
                            + Iniciar cadastro
                          </button>
                        )}
                        {selectedPlace.ja_cadastrada && (
                          <span style={{ fontSize:10, fontWeight:700, color:"#2CCD93" }}>✓ Já está no CRM</span>
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

    </div>
  );
}
