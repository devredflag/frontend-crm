import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save } from "lucide-react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  .field-group { display: flex; flex-direction: column; gap: 6px; }
  .field-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(20,45,70,0.5); }
  .field-input {
    height: 44px; padding: 0 14px; border-radius: 10px;
    border: 1px solid rgba(200,225,240,0.9);
    background: rgba(255,255,255,0.82);
    font-size: 13px; color: #1a2e40; outline: none;
    transition: border 0.18s, box-shadow 0.18s;
  }
  .field-input:focus { border-color: rgba(41,128,185,0.55); box-shadow: 0 0 0 3px rgba(41,128,185,0.13); }
  .field-textarea {
    padding: 12px 14px; border-radius: 10px;
    border: 1px solid rgba(200,225,240,0.9);
    background: rgba(255,255,255,0.82);
    font-size: 13px; color: #1a2e40; outline: none; resize: vertical; min-height: 90px;
    transition: border 0.18s, box-shadow 0.18s;
  }
  .field-textarea:focus { border-color: rgba(41,128,185,0.55); box-shadow: 0 0 0 3px rgba(41,128,185,0.13); }
  .field-select {
    height: 44px; padding: 0 14px; border-radius: 10px;
    border: 1px solid rgba(200,225,240,0.9);
    background: rgba(255,255,255,0.82);
    font-size: 13px; color: #1a2e40; outline: none; cursor: pointer;
  }
`;

const STATUS_OPTS = ["Lead","Em contato","Proposta","Fechado"];
const TEMP_OPTS   = ["Frio","Morno","Quente"];
const PORTE_OPTS  = ["Pequeno","Médio","Grande"];

export default function EmpresaEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "", segmento: "", porte: "", cidade: "", endereco: "",
    cep: "", bairro: "", regiao: "", observacoes: "", cnpj: "",
    site: "", linkedin_empresa: "", responsavel_principal: "",
    ticket_medio_estimado: "", status: "", origem_lead: "",
    proxima_acao: "", temperatura: "",
  });

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
      setForm({
        nome: data.nome || "",
        segmento: data.segmento || "",
        porte: data.porte || "",
        cidade: data.cidade || "",
        endereco: data.endereco || "",
        cep: data.cep || "",
        bairro: data.bairro || "",
        regiao: data.regiao || "",
        observacoes: data.observacoes || "",
        cnpj: data.cnpj || "",
        site: data.site || "",
        linkedin_empresa: data.linkedin_empresa || "",
        responsavel_principal: data.responsavel_principal || "",
        ticket_medio_estimado: data.ticket_medio_estimado?.toString() || "",
        status: data.status || "",
        origem_lead: data.origem_lead || "",
        proxima_acao: data.proxima_acao || "",
        temperatura: data.temperatura || "",
      });
    } catch {
      navigate("/clientes");
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://backend-crm-production-157b.up.railway.app/empresas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          ticket_medio_estimado: form.ticket_medio_estimado ? parseFloat(form.ticket_medio_estimado) : null,
        }),
      });
      if (!res.ok) throw new Error();
      navigate(`/clientes/${id}`);
    } catch {
      alert("Erro ao salvar empresa");
    }
    setSaving(false);
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(145deg,#c8e8f5,#c5eae0)" }}>
      <div style={{ fontSize:14, color:"rgba(20,45,70,0.5)" }}>Carregando...</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", position:"relative", background:"linear-gradient(145deg,#c8e8f5 0%,#d6eef5 30%,#cceee8 65%,#c5eae0 100%)" }}>
      <style>{css}</style>

      <div style={{ position:"absolute", inset:0, opacity:0.4, backgroundImage:"radial-gradient(circle,rgba(41,128,185,0.2) 1px,transparent 1px)", backgroundSize:"22px 22px", pointerEvents:"none" }} />

      <div style={{ position:"relative", zIndex:10, maxWidth:860, margin:"0 auto", padding:"32px 24px 60px" }}>

        {/* Back */}
        <button
          onClick={() => navigate(`/clientes/${id}`)}
          style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", fontSize:13, fontWeight:600, color:"rgba(20,45,70,0.55)", marginBottom:24, padding:"8px 0" }}
        >
          <ArrowLeft style={{ width:16, height:16 }} /> Voltar
        </button>

        <motion.div
          initial={{ opacity:0, y:16 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:0.38 }}
          style={{ background:"rgba(255,255,255,0.72)", backdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.9)", borderRadius:20, padding:"32px" }}
        >
          <h1 style={{ fontSize:20, fontWeight:900, color:"#0f2133", marginBottom:28 }}>Editar Empresa</h1>

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:20 }}>

            {/* Row 1 */}
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:14 }}>
              <div className="field-group">
                <label className="field-label">Nome *</label>
                <input className="field-input" name="nome" value={form.nome} onChange={handleChange} required />
              </div>
              <div className="field-group">
                <label className="field-label">Porte</label>
                <select className="field-select" name="porte" value={form.porte} onChange={handleChange}>
                  <option value="">Selecione</option>
                  {PORTE_OPTS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Status</label>
                <select className="field-select" name="status" value={form.status} onChange={handleChange}>
                  <option value="">Selecione</option>
                  {STATUS_OPTS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
              <div className="field-group">
                <label className="field-label">Segmento</label>
                <input className="field-input" name="segmento" value={form.segmento} onChange={handleChange} />
              </div>
              <div className="field-group">
                <label className="field-label">Temperatura</label>
                <select className="field-select" name="temperatura" value={form.temperatura} onChange={handleChange}>
                  <option value="">Selecione</option>
                  {TEMP_OPTS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">Ticket médio (R$)</label>
                <input className="field-input" name="ticket_medio_estimado" type="number" value={form.ticket_medio_estimado} onChange={handleChange} />
              </div>
            </div>

            {/* Row 3 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div className="field-group">
                <label className="field-label">Cidade</label>
                <input className="field-input" name="cidade" value={form.cidade} onChange={handleChange} />
              </div>
              <div className="field-group">
                <label className="field-label">Bairro</label>
                <input className="field-input" name="bairro" value={form.bairro} onChange={handleChange} />
              </div>
            </div>

            {/* Row 4 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div className="field-group">
                <label className="field-label">Endereço</label>
                <input className="field-input" name="endereco" value={form.endereco} onChange={handleChange} />
              </div>
              <div className="field-group">
                <label className="field-label">CEP</label>
                <input className="field-input" name="cep" value={form.cep} onChange={handleChange} />
              </div>
            </div>

            {/* Row 5 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div className="field-group">
                <label className="field-label">CNPJ</label>
                <input className="field-input" name="cnpj" value={form.cnpj} onChange={handleChange} />
              </div>
              <div className="field-group">
                <label className="field-label">Responsável principal</label>
                <input className="field-input" name="responsavel_principal" value={form.responsavel_principal} onChange={handleChange} />
              </div>
            </div>

            {/* Row 6 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div className="field-group">
                <label className="field-label">Site</label>
                <input className="field-input" name="site" value={form.site} onChange={handleChange} />
              </div>
              <div className="field-group">
                <label className="field-label">LinkedIn</label>
                <input className="field-input" name="linkedin_empresa" value={form.linkedin_empresa} onChange={handleChange} />
              </div>
            </div>

            {/* Row 7 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div className="field-group">
                <label className="field-label">Origem do lead</label>
                <input className="field-input" name="origem_lead" value={form.origem_lead} onChange={handleChange} />
              </div>
              <div className="field-group">
                <label className="field-label">Próxima ação</label>
                <input className="field-input" name="proxima_acao" value={form.proxima_acao} onChange={handleChange} />
              </div>
            </div>

            {/* Observações */}
            <div className="field-group">
              <label className="field-label">Observações</label>
              <textarea className="field-textarea" name="observacoes" value={form.observacoes} onChange={handleChange} />
            </div>

            {/* Botões */}
            <div style={{ display:"flex", gap:12, justifyContent:"flex-end", marginTop:8 }}>
              <button
                type="button"
                onClick={() => navigate(`/clientes/${id}`)}
                style={{ height:44, padding:"0 20px", borderRadius:10, border:"1px solid rgba(200,225,240,0.9)", background:"rgba(255,255,255,0.8)", fontSize:13, fontWeight:600, color:"rgba(20,45,70,0.6)", cursor:"pointer" }}
              >
                Cancelar
              </button>
              <motion.button
                type="submit"
                disabled={saving}
                whileHover={{ scale: saving ? 1 : 1.015 }}
                whileTap={{ scale: saving ? 1 : 0.985 }}
                style={{ height:44, padding:"0 24px", borderRadius:10, border:"none", cursor:saving?"not-allowed":"pointer", background:"linear-gradient(135deg,#2980b9,#1abc9c,#2ecc71,#2980b9)", backgroundSize:"200% 200%", animation:"gradientShift 4s ease infinite", color:"#fff", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 14px rgba(41,128,185,0.3)" }}
              >
                <Save style={{ width:14, height:14 }} />
                {saving ? "Salvando..." : "Salvar alterações"}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}