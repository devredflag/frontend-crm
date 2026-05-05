import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Building2, MapPin, Globe,
  User, BarChart3, Edit3,
  TrendingUp, Calendar, Tag,
} from "lucide-react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  @keyframes float1 { 0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-20px)} }
  @keyframes float2 { 0%,100%{transform:translate(0,0)}50%{transform:translate(-20px,30px)} }
  .info-card {
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.9);
    border-radius: 16px;
    padding: 24px;
  }
  .info-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(200,225,240,0.3);
    font-size: 13px;
  }
  .info-row:last-child { border-bottom: none; }
  .chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 12px; border-radius: 20px;
    font-size: 12px; font-weight: 700;
  }
`;

interface Empresa {
  empresa_id: string;
  nome: string;
  segmento: string;
  porte: string;
  cidade: string;
  endereco: string;
  cep: string;
  bairro: string;
  regiao: string;
  observacoes: string;
  cnpj: string;
  site: string;
  linkedin_empresa: string;
  responsavel_principal: string;
  ticket_medio_estimado: number | null;
  status: string;
  origem_lead: string;
  ultima_interacao: string | null;
  proxima_acao: string;
  temperatura: string;
}

function statusColor(s: string) {
  if (s === "Fechado")    return { bg:"rgba(39,174,96,0.12)",   text:"#1e8449"  };
  if (s === "Proposta")   return { bg:"rgba(142,68,173,0.12)",  text:"#7d3c98"  };
  if (s === "Em contato") return { bg:"rgba(41,128,185,0.12)",  text:"#1a5276"  };
  return                         { bg:"rgba(149,165,166,0.15)", text:"#566573"  };
}

function tempColor(t: string) {
  if (t === "Quente") return { text:"#c0392b", bg:"rgba(192,57,43,0.1)",  icon:"🔥" };
  if (t === "Morno")  return { text:"#d68910", bg:"rgba(214,137,16,0.1)", icon:"🌡️" };
  return                     { text:"#2980b9", bg:"rgba(41,128,185,0.1)", icon:"❄️" };
}

function initials(name: string) {
  return name?.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase() || "?";
}

function avatarColor(name: string) {
  const colors = ["#2980b9","#1abc9c","#8e44ad","#e67e22","#27ae60","#e74c3c"];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

export default function EmpresaView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmpresa();
  }, [id]);

  const fetchEmpresa = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://backend-crm-production-157b.up.railway.app/empresas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEmpresa(data);
    } catch {
      navigate("/clientes");
    }
    setLoading(false);
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(145deg,#c8e8f5,#c5eae0)" }}>
      <div style={{ fontSize:14, color:"rgba(20,45,70,0.5)" }}>Carregando...</div>
    </div>
  );

  if (!empresa) return null;

  const sc = statusColor(empresa.status);
  const tc = tempColor(empresa.temperatura);

  return (
    <div style={{ minHeight:"100vh", position:"relative", background:"linear-gradient(145deg,#c8e8f5 0%,#d6eef5 30%,#cceee8 65%,#c5eae0 100%)" }}>
      <style>{css}</style>

      {/* Background blobs */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, opacity:0.4, backgroundImage:"radial-gradient(circle,rgba(41,128,185,0.2) 1px,transparent 1px)", backgroundSize:"22px 22px" }} />
        <div style={{ position:"absolute", width:400, height:400, top:"-60px", left:"8%", borderRadius:"50%", background:"radial-gradient(circle,#2980b9,#1abc9c)", opacity:0.08, animation:"float1 18s ease-in-out infinite" }} />
        <div style={{ position:"absolute", width:300, height:300, bottom:"10%", right:"5%", borderRadius:"50%", background:"radial-gradient(circle,#1abc9c,#2ecc71)", opacity:0.07, animation:"float2 22s ease-in-out infinite" }} />
      </div>

      <div style={{ position:"relative", zIndex:10, maxWidth:900, margin:"0 auto", padding:"32px 24px 60px" }}>

        {/* Back button */}
        <button
          onClick={() => navigate("/clientes")}
          style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", fontSize:13, fontWeight:600, color:"rgba(20,45,70,0.55)", marginBottom:24, padding:"8px 0" }}
        >
          <ArrowLeft style={{ width:16, height:16 }} /> Voltar para clientes
        </button>

        {/* Header card */}
        <motion.div
          className="info-card"
          initial={{ opacity:0, y:16 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:0.38 }}
          style={{ marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:56, height:56, borderRadius:14, background:avatarColor(empresa.nome), display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:"#fff", flexShrink:0 }}>
              {initials(empresa.nome)}
            </div>
            <div>
              <h1 style={{ fontSize:22, fontWeight:900, color:"#0f2133", letterSpacing:"-0.02em" }}>{empresa.nome}</h1>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6, flexWrap:"wrap" }}>
                {empresa.status && (
                  <span className="chip" style={{ background:sc.bg, color:sc.text }}>{empresa.status}</span>
                )}
                {empresa.temperatura && (
                  <span className="chip" style={{ background:tc.bg, color:tc.text }}>{tc.icon} {empresa.temperatura}</span>
                )}
                {empresa.porte && (
                  <span className="chip" style={{ background:"rgba(41,128,185,0.08)", color:"#2980b9" }}>{empresa.porte}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/clientes/${id}/editar`)}
            style={{ display:"flex", alignItems:"center", gap:8, height:40, padding:"0 18px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2980b9,#1abc9c)", color:"#fff", fontSize:13, fontWeight:700, boxShadow:"0 4px 14px rgba(41,128,185,0.3)" }}
          >
            <Edit3 style={{ width:14, height:14 }} /> Editar
          </button>
        </motion.div>

        {/* Grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

          {/* Informações gerais */}
          <motion.div className="info-card" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.38, delay:0.05 }}>
            <h3 style={{ fontSize:12, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(20,45,70,0.45)", marginBottom:12 }}>Informações Gerais</h3>
            {empresa.segmento && <div className="info-row"><Tag style={{ width:14, height:14, color:"#2980b9", flexShrink:0 }} /><span style={{ color:"rgba(20,45,70,0.5)", minWidth:100 }}>Segmento</span><span style={{ fontWeight:600, color:"#0f2133" }}>{empresa.segmento}</span></div>}
            {empresa.cnpj && <div className="info-row"><Building2 style={{ width:14, height:14, color:"#2980b9", flexShrink:0 }} /><span style={{ color:"rgba(20,45,70,0.5)", minWidth:100 }}>CNPJ</span><span style={{ fontWeight:600, color:"#0f2133" }}>{empresa.cnpj}</span></div>}
            {empresa.cidade && <div className="info-row"><MapPin style={{ width:14, height:14, color:"#2980b9", flexShrink:0 }} /><span style={{ color:"rgba(20,45,70,0.5)", minWidth:100 }}>Cidade</span><span style={{ fontWeight:600, color:"#0f2133" }}>{empresa.cidade}{empresa.bairro ? ` · ${empresa.bairro}` : ""}</span></div>}
            {empresa.endereco && <div className="info-row"><MapPin style={{ width:14, height:14, color:"#2980b9", flexShrink:0 }} /><span style={{ color:"rgba(20,45,70,0.5)", minWidth:100 }}>Endereço</span><span style={{ fontWeight:600, color:"#0f2133" }}>{empresa.endereco}</span></div>}
            {empresa.site && <div className="info-row"><Globe style={{ width:14, height:14, color:"#2980b9", flexShrink:0 }} /><span style={{ color:"rgba(20,45,70,0.5)", minWidth:100 }}>Site</span><a href={empresa.site} target="_blank" rel="noreferrer" style={{ fontWeight:600, color:"#2980b9" }}>{empresa.site}</a></div>}
            {empresa.linkedin_empresa && <div className="info-row"><Globe style={{ width:14, height:14, color:"#0077b5", flexShrink:0 }} /><span style={{ color:"rgba(20,45,70,0.5)", minWidth:100 }}>LinkedIn</span><a href={empresa.linkedin_empresa} target="_blank" rel="noreferrer" style={{ fontWeight:600, color:"#2980b9" }}>Ver perfil</a></div>}
          </motion.div>

          {/* Comercial */}
          <motion.div className="info-card" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.38, delay:0.1 }}>
            <h3 style={{ fontSize:12, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(20,45,70,0.45)", marginBottom:12 }}>Comercial</h3>
            {empresa.responsavel_principal && <div className="info-row"><User style={{ width:14, height:14, color:"#2980b9", flexShrink:0 }} /><span style={{ color:"rgba(20,45,70,0.5)", minWidth:120 }}>Responsável</span><span style={{ fontWeight:600, color:"#0f2133" }}>{empresa.responsavel_principal}</span></div>}
            {empresa.ticket_medio_estimado && <div className="info-row"><TrendingUp style={{ width:14, height:14, color:"#2980b9", flexShrink:0 }} /><span style={{ color:"rgba(20,45,70,0.5)", minWidth:120 }}>Ticket médio</span><span style={{ fontWeight:700, color:"#27ae60" }}>R$ {empresa.ticket_medio_estimado.toLocaleString("pt-BR")}</span></div>}
            {empresa.origem_lead && <div className="info-row"><BarChart3 style={{ width:14, height:14, color:"#2980b9", flexShrink:0 }} /><span style={{ color:"rgba(20,45,70,0.5)", minWidth:120 }}>Origem</span><span style={{ fontWeight:600, color:"#0f2133" }}>{empresa.origem_lead}</span></div>}
            {empresa.ultima_interacao && <div className="info-row"><Calendar style={{ width:14, height:14, color:"#2980b9", flexShrink:0 }} /><span style={{ color:"rgba(20,45,70,0.5)", minWidth:120 }}>Últ. interação</span><span style={{ fontWeight:600, color:"#0f2133" }}>{new Date(empresa.ultima_interacao).toLocaleDateString("pt-BR")}</span></div>}
            {empresa.proxima_acao && <div className="info-row"><Calendar style={{ width:14, height:14, color:"#e67e22", flexShrink:0 }} /><span style={{ color:"rgba(20,45,70,0.5)", minWidth:120 }}>Próxima ação</span><span style={{ fontWeight:600, color:"#e67e22" }}>{empresa.proxima_acao}</span></div>}
          </motion.div>

          {/* Observações */}
          {empresa.observacoes && (
            <motion.div className="info-card" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.38, delay:0.15 }} style={{ gridColumn:"1/-1" }}>
              <h3 style={{ fontSize:12, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(20,45,70,0.45)", marginBottom:12 }}>Observações</h3>
              <p style={{ fontSize:13, color:"rgba(20,45,70,0.7)", lineHeight:1.7 }}>{empresa.observacoes}</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
