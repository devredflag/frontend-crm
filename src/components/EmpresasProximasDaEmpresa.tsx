import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Navigation, Building2, Search, AlertTriangle, Edit3, Loader2, Filter,
} from "lucide-react";
import { getToken } from "../services/auth";
import { formatarDistancia } from "../utils/distancia";
import useEmpresasProximas, { EmpresaComGeo } from "../hooks/useEmpresasProximas";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

// Empresas próximas tendo como referência OUTRA EMPRESA, não o GPS do usuário.
//
// Reaproveita integralmente a geolocalização que já existia na plataforma: o
// mesmo hook `useEmpresasProximas` (Haversine no cliente, custo zero) usado nas
// abas "Próximas" de /clientes e /gerenciamento. A única diferença é o ponto de
// referência — aqui é a coordenada da empresa aberta, ali era a posição do
// dispositivo. Nenhuma segunda lógica de geolocalização foi criada.

interface Props {
  empresaId: string;
  nome: string;
  latitude?: number | null;
  longitude?: number | null;
  cidade?: string;
  /** Segmento da empresa aberta — usado no filtro "mesmo segmento". */
  segmento?: string;
}

const RAIOS = [5, 10, 25, 50, 100];

export default function EmpresasProximasDaEmpresa({
  empresaId, nome, latitude, longitude, cidade, segmento,
}: Props) {
  const navigate = useNavigate();
  const [todas, setTodas] = useState<EmpresaComGeo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [raioKm, setRaioKm] = useState(25);
  const [soMesmoSegmento, setSoMesmoSegmento] = useState(false);

  const lat = Number(latitude);
  const lon = Number(longitude);
  const temLocalizacao = Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0);

  useEffect(() => {
    if (!temLocalizacao) { setCarregando(false); return; }
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`${API}/empresas`, {
          headers: { Authorization: `Bearer ${getToken() || ""}` },
        });
        if (!res.ok) throw new Error();
        const dados = await res.json();
        if (vivo) setTodas(Array.isArray(dados) ? dados : []);
      } catch {
        if (vivo) setErro(true);
      }
      if (vivo) setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [temLocalizacao, empresaId]);

  // A empresa aberta não entra na própria lista de vizinhas.
  const candidatas = useMemo(
    () => todas.filter(e => e.empresa_id !== empresaId),
    [todas, empresaId]
  );

  // O hook espera uma posição {lat, lon}: passamos a da empresa de referência.
  const referencia = useMemo(
    () => (temLocalizacao ? { lat, lon } : null),
    [temLocalizacao, lat, lon]
  );
  const proximas = useEmpresasProximas(candidatas, referencia, 200);

  const visiveis = useMemo(() => proximas
    .filter(e => e.distanciaKm <= raioKm)
    .filter(e => !soMesmoSegmento || (segmento && e.segmento === segmento))
    .slice(0, 50),
    [proximas, raioKm, soMesmoSegmento, segmento]);

  // Prospecção de empresas NOVAS parte da mesma coordenada, na busca que já existe.
  const prospectarAqui = () =>
    navigate("/buscar", {
      state: { origem: { lat, lng: lon, nome, cidade, empresa_id: empresaId } },
    });

  // ── Sem localização suficiente: não quebra a tela, explica e oferece a edição
  if (!temLocalizacao) {
    return (
      <div className="glass-card" style={{ padding: "34px 24px", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, margin: "0 auto 14px", display: "grid", placeItems: "center", background:"rgba(230,126,34,0.12)" }}>
          <AlertTriangle style={{ width: 22, height: 22, color:"#F2C879" }} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 800, color:"#EAF6FB" }}>
          Localização incompleta
        </h3>
        <p style={{ fontSize: 13, color:"#EAF6FB", marginTop: 6, maxWidth: 460, marginInline: "auto", lineHeight: 1.5 }}>
          Para listar empresas próximas precisamos das coordenadas de <strong>{nome}</strong>.
          Complete o endereço no cadastro (rua, cidade e CEP) e a localização é calculada automaticamente.
        </p>
        <button
          onClick={() => navigate(`/clientes/${empresaId}/editar`)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 20px", marginTop: 18, borderRadius: 10, border:"none", cursor: "pointer", background:"linear-gradient(135deg,#2E6F95,#2E6F95)", color:"#EAF6FB", fontSize: 13, fontWeight: 700, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(159,211,234,0.30)" }}>
          <Edit3 style={{ width: 15, height: 15 }} /> Completar endereço
        </button>
      </div>
    );
  }

  if (carregando) {
    return (
      <div className="glass-card" style={{ padding: "44px 20px", textAlign: "center", color:"#9FD3EA" }}>
        <Loader2 style={{ width: 22, height: 22, color:"#9FD3EA", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, fontWeight: 600, marginTop: 10 }}>Procurando empresas por perto…</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="glass-card" style={{ padding: "34px 24px", textAlign: "center" }}>
        <AlertTriangle style={{ width: 24, height: 24, color:"#F2C879" }} />
        <p style={{ fontSize: 13, fontWeight: 700, color:"#F2C879", marginTop: 10 }}>
          Não foi possível carregar as empresas da sua carteira agora.
        </p>
        <p style={{ fontSize: 12, color:"#9FD3EA", marginTop: 4 }}>
          Tente recarregar a página em instantes.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Referência + filtros */}
      <div className="glass-card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{ width: 32, height: 32, borderRadius: 9, display: "grid", placeItems: "center", background:"rgba(46,111,149,0.12)", flexShrink: 0 }}>
            <MapPin style={{ width: 15, height: 15, color:"#9FD3EA" }} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color:"#9FD3EA" }}>
              Ponto de referência
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color:"#EAF6FB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {nome}{cidade ? ` · ${cidade}` : ""}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Filter style={{ width: 12, height: 12, color:"#9FD3EA" }} />
          {RAIOS.map(r => (
            <button key={r} onClick={() => setRaioKm(r)}
              aria-pressed={raioKm === r}
              style={{
                padding: "4px 11px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                fontSize: 11, fontWeight: 700,
                border:`1.5px solid ${raioKm === r ? "rgba(159,211,234,0.30)" : "rgba(159,211,234,0.18)"}`,
                background:raioKm === r ? "rgba(46,111,149,0.12)" : "rgba(18,59,94,0.55)",
                color:raioKm === r ? "#9FD3EA" : "#9FD3EA",
              }}>
              {r} km
            </button>
          ))}
          {segmento && (
            <button onClick={() => setSoMesmoSegmento(v => !v)}
              aria-pressed={soMesmoSegmento}
              style={{
                padding: "4px 11px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                fontSize: 11, fontWeight: 700,
                border:`1.5px solid ${soMesmoSegmento ? "rgba(142,68,173,0.5)" : "rgba(159,211,234,0.18)"}`,
                background:soMesmoSegmento ? "rgba(142,68,173,0.1)" : "rgba(18,59,94,0.55)",
                color:soMesmoSegmento ? "#C9B6E4" : "#9FD3EA",
              }}>
              {segmento}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color:"#EAF6FB" }}>
          {visiveis.length} empresa{visiveis.length === 1 ? "" : "s"} da carteira num raio de {raioKm} km
        </span>
        <button onClick={prospectarAqui} className="send-btn"
          style={{ marginLeft: "auto", background:"rgba(46,111,149,0.08)", borderColor:"rgba(159,211,234,0.30)", color:"#9FD3EA" }}>
          <Search style={{ width: 11, height: 11 }} /> Prospectar novas aqui
        </button>
      </div>

      {visiveis.length === 0 ? (
        <div className="glass-card" style={{ padding: "34px 24px", textAlign: "center" }}>
          <Building2 style={{ width: 26, height: 26, color:"#9FD3EA" }} />
          <p style={{ fontSize: 13, fontWeight: 700, color:"#9FD3EA", marginTop: 10 }}>
            Nenhuma empresa da carteira {soMesmoSegmento ? `do segmento “${segmento}” ` : ""}num raio de {raioKm} km.
          </p>
          <p style={{ fontSize: 12, color:"#9FD3EA", marginTop: 4 }}>
            Aumente o raio ou busque empresas novas na região.
          </p>
          <button onClick={prospectarAqui}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 38, padding: "0 18px", marginTop: 16, borderRadius: 10, border:"none", cursor: "pointer", background:"linear-gradient(135deg,#2E6F95,#2E6F95)", color:"#EAF6FB", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit" }}>
            <Search style={{ width: 14, height: 14 }} /> Prospectar empresas perto de {nome}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visiveis.map(emp => (
            <div key={emp.empresa_id} className="glass-card"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
              <button
                onClick={() => navigate(`/clientes/${emp.empresa_id}`, { state: { from: `/clientes/${empresaId}?tab=proximas` } })}
                style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, border:"none", background:"none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", padding: 0 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "grid", placeItems: "center", background:"rgba(46,111,149,0.1)" }}>
                  <Building2 style={{ width: 15, height: 15, color:"#9FD3EA" }} />
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color:"#EAF6FB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {emp.nome}
                  </span>
                  <span style={{ display: "block", fontSize: 11.5, color:"#9FD3EA", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {[emp.segmento, emp.cidade, emp.status].filter(Boolean).join(" · ") || "Sem detalhes"}
                  </span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color:"#9FD3EA", flexShrink: 0 }}>
                  {formatarDistancia(emp.distanciaKm)}
                </span>
              </button>
              <a
                href={`https://waze.com/ul?ll=${emp.latitude},${emp.longitude}&navigate=yes`}
                target="_blank" rel="noreferrer"
                title={`Abrir rota até ${emp.nome} no Waze`}
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color:"#9FD3EA", textDecoration: "none", flexShrink: 0, padding: "6px 8px", borderRadius: 8 }}>
                <Navigation style={{ width: 13, height: 13 }} /> Waze
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
