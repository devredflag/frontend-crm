import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2, Users, LayoutDashboard, Search, Calendar,
  ClipboardList, BarChart3, ChevronDown, ArrowLeft,
  Plus, Trash2, Globe, Link2, Phone, Mail,
  MapPin, Briefcase, Hash, User, Thermometer,
  Target, Clock, MessageSquare, Star, CheckSquare,
  DollarSign, FileText, Bell, Save,
} from "lucide-react";

// ─── CSS / Keyframes (mesmos do Dashboard) ────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes float1 {
    0%,100% { transform: translate(0,0) scale(1); }
    33%      { transform: translate(40px,-30px) scale(1.05); }
    66%      { transform: translate(-20px,20px) scale(0.97); }
  }
  @keyframes float2 {
    0%,100% { transform: translate(0,0) scale(1); }
    40%      { transform: translate(-50px,25px) scale(1.08); }
    70%      { transform: translate(30px,-15px) scale(0.95); }
  }
  @keyframes float3 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%      { transform: translate(25px,40px) scale(1.03); }
  }
  @keyframes float4 {
    0%,100% { transform: translate(0,0); }
    30%      { transform: translate(-30px,-40px); }
    60%      { transform: translate(20px,15px); }
  }
  @keyframes float5 {
    0%,100% { transform: translate(0,0) scale(1); }
    45%      { transform: translate(35px,-20px) scale(1.06); }
    80%      { transform: translate(-15px,30px) scale(0.96); }
  }
  @keyframes gradientShift {
    0%,100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 16px; border-radius: 10px; cursor: pointer;
    font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.65);
    transition: all 0.18s; user-select: none;
  }
  .nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
  .nav-item.active {
    background: rgba(255,255,255,0.14);
    color: #fff; font-weight: 600;
  }

  .glass-card {
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.9);
    border-radius: 16px;
  }

  .field-group {
    display: flex; flex-direction: column; gap: 5px;
  }
  .field-label {
    font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
    color: rgba(15,33,51,0.45); text-transform: uppercase;
  }
  .field-input {
    height: 44px; padding: 0 14px; border-radius: 10px;
    border: 1.5px solid rgba(200,225,240,0.8);
    background: rgba(255,255,255,0.75);
    font-size: 13px; color: #0f2133; outline: none;
    transition: border-color 0.18s, box-shadow 0.18s;
    width: 100%;
  }
  .field-input:focus {
    border-color: rgba(41,128,185,0.55);
    box-shadow: 0 0 0 3px rgba(41,128,185,0.1);
  }
  .field-select {
    height: 44px; padding: 0 14px; border-radius: 10px;
    border: 1.5px solid rgba(200,225,240,0.8);
    background: rgba(255,255,255,0.75);
    font-size: 13px; color: #0f2133; outline: none;
    transition: border-color 0.18s, box-shadow 0.18s;
    width: 100%; cursor: pointer; appearance: none;
  }
  .field-select:focus {
    border-color: rgba(41,128,185,0.55);
    box-shadow: 0 0 0 3px rgba(41,128,185,0.1);
  }
  .field-textarea {
    padding: 12px 14px; border-radius: 10px;
    border: 1.5px solid rgba(200,225,240,0.8);
    background: rgba(255,255,255,0.75);
    font-size: 13px; color: #0f2133; outline: none;
    transition: border-color 0.18s, box-shadow 0.18s;
    width: 100%; resize: vertical; min-height: 80px;
  }
  .field-textarea:focus {
    border-color: rgba(41,128,185,0.55);
    box-shadow: 0 0 0 3px rgba(41,128,185,0.1);
  }
  .field-input-icon {
    position: relative; display: flex; align-items: center;
  }
  .field-input-icon .icon {
    position: absolute; left: 12px; color: rgba(20,45,70,0.3);
    pointer-events: none;
  }
  .field-input-icon .field-input {
    padding-left: 36px;
  }

  .contact-card {
    background: rgba(255,255,255,0.6);
    border: 1.5px solid rgba(200,225,240,0.7);
    border-radius: 14px; padding: 20px;
    transition: box-shadow 0.2s;
  }
  .contact-card:hover {
    box-shadow: 0 6px 24px rgba(41,128,185,0.12);
  }

  .temp-btn {
    flex: 1; height: 38px; border-radius: 8px; border: 1.5px solid rgba(200,225,240,0.8);
    background: rgba(255,255,255,0.75); font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.18s; display: flex; align-items: center;
    justify-content: center; gap: 5px;
  }
  .temp-btn.frio.active   { background: rgba(52,152,219,0.12);  border-color: #3498db; color: #2980b9; }
  .temp-btn.morno.active  { background: rgba(230,126,34,0.12);  border-color: #e67e22; color: #e67e22; }
  .temp-btn.quente.active { background: rgba(231,76,60,0.12);   border-color: #e74c3c; color: #e74c3c; }
  .temp-btn:not(.active)  { color: rgba(20,45,70,0.4); }

  .prio-btn {
    flex: 1; height: 34px; border-radius: 8px; border: 1.5px solid rgba(200,225,240,0.8);
    background: rgba(255,255,255,0.75); font-size: 11px; font-weight: 600;
    cursor: pointer; transition: all 0.18s;
  }
  .prio-btn.alta.active   { background: rgba(231,76,60,0.12);  border-color: #e74c3c; color: #e74c3c; }
  .prio-btn.media.active  { background: rgba(230,126,34,0.12); border-color: #e67e22; color: #e67e22; }
  .prio-btn.baixa.active  { background: rgba(39,174,96,0.12);  border-color: #27ae60; color: #27ae60; }
  .prio-btn:not(.active)  { color: rgba(20,45,70,0.4); }

  .section-divider {
    display: flex; align-items: center; gap: 12px; margin: 6px 0;
  }
  .section-divider span {
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
    color: rgba(41,128,185,0.6); text-transform: uppercase; white-space: nowrap;
  }
  .section-divider::before, .section-divider::after {
    content: ""; flex: 1; height: 1px; background: rgba(200,225,240,0.7);
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(41,128,185,0.25); border-radius: 4px; }

  .btn-grad {
    border: none; cursor: pointer; border-radius: 10px;
    color: #fff; font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 7px;
    background: linear-gradient(135deg, #2980b9, #1abc9c, #2ecc71, #2980b9);
    background-size: 200% 200%;
    animation: gradientShift 4s ease infinite;
    box-shadow: 0 4px 14px rgba(41,128,185,0.35);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .btn-grad:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 22px rgba(41,128,185,0.42);
  }
  .btn-grad:active { transform: translateY(0); }

  .btn-ghost {
    border: 1.5px solid rgba(200,225,240,0.9);
    background: rgba(255,255,255,0.75); cursor: pointer;
    border-radius: 10px; font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 600; color: rgba(20,45,70,0.65);
    display: flex; align-items: center; justify-content: center; gap: 6px;
    transition: all 0.18s;
  }
  .btn-ghost:hover {
    background: rgba(255,255,255,0.95);
    border-color: rgba(41,128,185,0.3);
    color: #2980b9;
  }

  .checkbox-decisor {
    display: flex; align-items: center; gap: 8px; cursor: pointer;
    padding: 8px 12px; border-radius: 8px;
    border: 1.5px solid rgba(200,225,240,0.8);
    background: rgba(255,255,255,0.75);
    transition: all 0.18s;
  }
  .checkbox-decisor.checked {
    border-color: #27ae60; background: rgba(39,174,96,0.08);
  }
  .checkbox-decisor .box {
    width: 16px; height: 16px; border-radius: 4px;
    border: 1.5px solid rgba(200,225,240,0.9);
    background: #fff; display: flex; align-items: center; justify-content: center;
    transition: all 0.18s; flex-shrink: 0;
  }
  .checkbox-decisor.checked .box {
    background: #27ae60; border-color: #27ae60;
  }
`;

// ─── Nav Items (mesmos do Dashboard) ──────────────────────────
const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",                path: "/dashboard",      active: false },
  { icon: Search,          label: "Buscar Empresas",           path: null,              active: false },
  { icon: Building2,       label: "Cadastrar Empresas",        path: "/empresas/nova",  active: true  },
  { icon: Users,           label: "Todos os clientes",         path: null,              active: false },
  { icon: ClipboardList,   label: "Gerenciamento de clientes", path: null,              active: false },
  { icon: Calendar,        label: "Calendário",                path: null,              active: false },
];

// ─── Contato vazio ─────────────────────────────────────────────
const contatoVazio = () => ({
  id: Date.now() + Math.random(),
  nome: "",
  funcao: "",
  email: "",
  celular: "",
  whatsapp: "",
  linkedin: "",
  observacoes: "",
  prioridade: "Media",
  nivel_influencia: "",
  decisor: false,
  canal_preferido: "",
  data_ultimo_contato: "",
});

// ─── Field helpers ─────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function IconInput({ icon: Icon, ...props }: any) {
  return (
    <div className="field-input-icon">
      <Icon className="icon" style={{ width: 14, height: 14 }} />
      <input className="field-input" {...props} />
    </div>
  );
}

// ─── Componente de contato ─────────────────────────────────────
function ContatoCard({
  contato, index, onChange, onRemove,
}: {
  contato: any; index: number; onChange: (index: number, field: string, value: any) => void; onRemove: (id: number) => void;
}) {
  const up = (field: string, value: any) => onChange(index, field, value);
  const color = ["#2980b9", "#1abc9c", "#e67e22", "#8e44ad", "#27ae60"][index % 5];
  const initials = contato.nome ? contato.nome.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  return (
    <motion.div
      className="contact-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
    >
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", background: color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0,
        }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2133" }}>
            {contato.nome || `Contato ${index + 1}`}
          </div>
          <div style={{ fontSize: 11, color: "rgba(20,45,70,0.4)" }}>
            {contato.funcao || "Função não definida"}
          </div>
        </div>

        {/* Decisor badge */}
        <div
          className={`checkbox-decisor${contato.decisor ? " checked" : ""}`}
          onClick={() => up("decisor", !contato.decisor)}
        >
          <div className="box">
            {contato.decisor && (
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <polyline points="2,5 4,7.5 8,2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: contato.decisor ? "#27ae60" : "rgba(20,45,70,0.5)" }}>
            Decisor
          </span>
        </div>

        <button
          onClick={() => onRemove(contato.id)}
          style={{
            width: 32, height: 32, borderRadius: 8, border: "1.5px solid rgba(231,76,60,0.2)",
            background: "rgba(231,76,60,0.06)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#e74c3c", transition: "all 0.18s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(231,76,60,0.14)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(231,76,60,0.4)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(231,76,60,0.06)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(231,76,60,0.2)";
          }}
        >
          <Trash2 style={{ width: 13, height: 13 }} />
        </button>
      </div>

      {/* Prioridade */}
      <div style={{ marginBottom: 14 }}>
        <div className="field-label" style={{ marginBottom: 6 }}>Prioridade</div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["Alta", "Media", "Baixa"] as const).map((p) => (
            <button
              key={p}
              className={`prio-btn ${p.toLowerCase()}${contato.prioridade === p ? " active" : ""}`}
              onClick={() => up("prioridade", p)}
            >
              {p === "Media" ? "Média" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de campos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Nome">
          <IconInput icon={User} className="field-input" placeholder="Nome completo" value={contato.nome} onChange={(e: any) => up("nome", e.target.value)} />
        </Field>
        <Field label="Função / Cargo">
          <IconInput icon={Briefcase} className="field-input" placeholder="ex: Diretor Comercial" value={contato.funcao} onChange={(e: any) => up("funcao", e.target.value)} />
        </Field>
        <Field label="Email">
          <IconInput icon={Mail} className="field-input" type="email" placeholder="email@empresa.com" value={contato.email} onChange={(e: any) => up("email", e.target.value)} />
        </Field>
        <Field label="Celular">
          <IconInput icon={Phone} className="field-input" placeholder="(00) 00000-0000" value={contato.celular} onChange={(e: any) => up("celular", e.target.value)} />
        </Field>
        <Field label="WhatsApp">
          <IconInput icon={Phone} className="field-input" placeholder="(00) 00000-0000" value={contato.whatsapp} onChange={(e: any) => up("whatsapp", e.target.value)} />
        </Field>
        <Field label="LinkedIn">
          <IconInput icon={Link2} className="field-input" placeholder="linkedin.com/in/..." value={contato.linkedin} onChange={(e: any) => up("linkedin", e.target.value)} />
        </Field>
        <Field label="Canal Preferido">
          <select className="field-select" value={contato.canal_preferido} onChange={(e: any) => up("canal_preferido", e.target.value)}>
            <option value="">Selecionar...</option>
            <option>Email</option>
            <option>WhatsApp</option>
            <option>Telefone</option>
            <option>LinkedIn</option>
            <option>Presencial</option>
          </select>
        </Field>
        <Field label="Nível de Influência">
          <select className="field-select" value={contato.nivel_influencia} onChange={(e: any) => up("nivel_influencia", e.target.value)}>
            <option value="">Selecionar...</option>
            <option>Alto</option>
            <option>Médio</option>
            <option>Baixo</option>
          </select>
        </Field>
        <Field label="Último Contato">
          <input className="field-input" type="date" value={contato.data_ultimo_contato} onChange={(e: any) => up("data_ultimo_contato", e.target.value)} />
        </Field>
        <Field label="Observações">
          <input className="field-input" placeholder="Notas rápidas..." value={contato.observacoes} onChange={(e: any) => up("observacoes", e.target.value)} />
        </Field>
      </div>
    </motion.div>
  );
}

// ─── Página principal ──────────────────────────────────────────
export default function NovaEmpresa() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [contatos, setContatos] = useState([contatoVazio()]);

  const [empresa, setEmpresa] = useState({
    nome: "", segmento: "", porte: "", cidade: "", endereco: "",
    cep: "", bairro: "", regiao: "", observacoes: "",
    cnpj: "", site: "", linkedin_empresa: "", responsavel_principal: "",
    ticket_medio_estimado: "", status: "", origem_lead: "",
    ultima_interacao: "", proxima_acao: "", temperatura: "",
  });

  const setEmp = (key: string, val: string) => setEmpresa((p) => ({ ...p, [key]: val }));

  const handleContatoChange = (index: number, field: string, value: any) => {
    const novos = [...contatos];
    novos[index] = { ...novos[index], [field]: value };
    setContatos(novos);
  };

  const addContato = () => setContatos((prev) => [...prev, contatoVazio()]);
  const removeContato = (id: number) => setContatos((prev) => prev.filter((c) => c.id !== id));

  const handleSubmit = async () => {
    if (!empresa.nome) { alert("Nome da empresa é obrigatório"); return; }
    setLoading(true);
    try {
      // =========================
      // 1. CRIAR EMPRESA
      // =========================
      const empresaRes = await fetch("https://backend-crm-production-157b.up.railway.app/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: empresa.nome,
          segmento: empresa.segmento,
          porte: empresa.porte,
          cidade: empresa.cidade,
          endereco: empresa.endereco,
          cep: empresa.cep,
          bairro: empresa.bairro,
          regiao: empresa.regiao,
          observacoes: empresa.observacoes,
          cnpj: empresa.cnpj,
          site: empresa.site,
          linkedin_empresa: empresa.linkedin_empresa,
          responsavel_principal: empresa.responsavel_principal,
          ticket_medio_estimado: empresa.ticket_medio_estimado ? parseFloat(empresa.ticket_medio_estimado) : null,
          status: empresa.status || "Lead",
          origem_lead: empresa.origem_lead || "Manual",
          ultima_interacao: empresa.ultima_interacao || new Date().toISOString(),
          proxima_acao: empresa.proxima_acao,
          temperatura: empresa.temperatura || "Frio",
        }),
      });

      const empresaData = await empresaRes.json();
      console.log("Empresa criada:", empresaData);

      const empresaId = empresaData.empresa_id ?? empresaData.id ?? empresaData.id;
      if (!empresaId) {
        alert("Empresa cadastrada, mas não foi possível obter o ID para vincular os contatos. Verifique o backend.");
        setLoading(false);
        navigate("/dashboard");
        return;
      }

      // =========================
      // 2. CRIAR CONTATOS
      // =========================
      const contatosValidos = contatos.filter((c) => c.nome.trim() !== "");

      for (const c of contatosValidos) {
        const payload = {
          empresa_id: empresaId,
          nome: c.nome,
          funcao: c.funcao,
          email: c.email,
          celular: c.celular,
          whatsapp: c.whatsapp,
          linkedin: c.linkedin,
          observacoes: c.observacoes,
          prioridade: c.prioridade,
          nivel_influencia: c.nivel_influencia,
          decisor: c.decisor,
          canal_preferido: c.canal_preferido,
          data_ultimo_contato: c.data_ultimo_contato || null,
        };
        console.log("Enviando contato:", payload);

        const contatoRes = await fetch("https://backend-crm-production-157b.up.railway.app/contatos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!contatoRes.ok) {
          const err = await contatoRes.json();
          console.error("Erro ao criar contato:", err);
        }
      }

      console.log(`${contatosValidos.length} contato(s) criado(s) 🚀`);
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Erro ao cadastrar empresa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
      <style>{css}</style>

      {/* ── Fundo animado (idêntico ao Dashboard) ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(145deg, #c8e8f5 0%, #d6eef5 30%, #cceee8 65%, #c5eae0 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0, opacity: 0.4,
          backgroundImage: "radial-gradient(circle, rgba(41,128,185,0.2) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }} />
        {[
          { w: 420, h: 420, top: "-80px",  left: "10%",  anim: "float1 18s ease-in-out infinite",       op: 0.12, c1: "#2980b9", c2: "#1abc9c" },
          { w: 280, h: 280, top: "40%",    left: "-60px", anim: "float2 22s ease-in-out infinite",       op: 0.1,  c1: "#1abc9c", c2: "#2ecc71" },
          { w: 360, h: 360, top: "60%",    left: "55%",   anim: "float3 26s ease-in-out infinite",       op: 0.09, c1: "#2980b9", c2: "#8e44ad" },
          { w: 200, h: 200, top: "20%",    left: "75%",   anim: "float4 20s ease-in-out infinite",       op: 0.11, c1: "#27ae60", c2: "#1abc9c" },
          { w: 300, h: 300, top: "75%",    left: "20%",   anim: "float5 24s ease-in-out infinite",       op: 0.08, c1: "#e67e22", c2: "#f39c12" },
          { w: 180, h: 180, top: "5%",     left: "60%",   anim: "float2 16s ease-in-out infinite 3s",    op: 0.1,  c1: "#1abc9c", c2: "#2980b9" },
          { w: 240, h: 240, top: "85%",    left: "80%",   anim: "float1 28s ease-in-out infinite 6s",    op: 0.08, c1: "#8e44ad", c2: "#2980b9" },
        ].map((c, i) => (
          <div key={i} style={{
            position: "absolute", width: c.w, height: c.h, top: c.top, left: c.left,
            borderRadius: "50%",
            background: `radial-gradient(circle at 40% 40%, ${c.c1}, ${c.c2})`,
            opacity: c.op, animation: c.anim, filter: "blur(2px)",
          }} />
        ))}
      </div>

      {/* ── Sidebar (idêntica ao Dashboard) ── */}
      <div style={{
        width: 220, flexShrink: 0, height: "100vh", overflowY: "auto",
        position: "relative", zIndex: 10,
        background: "linear-gradient(180deg, #1a3a5c 0%, #0f2a44 60%, #0a1f33 100%)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column", padding: "0 12px 20px",
      }}>
        {/* Logo */}
        <div style={{ padding: "22px 4px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #2980b9, #1abc9c)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(41,128,185,0.4)",
            }}>
              <BarChart3 style={{ width: 18, height: 18, color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>Prospecção</div>
              <div style={{
                fontSize: 11, fontWeight: 700,
                background: "linear-gradient(90deg, #2980b9, #1abc9c, #2ecc71, #2980b9)",
                backgroundSize: "200% 200%",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                animation: "gradientShift 4s ease infinite",
              }}>CRM</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map((item) => (
            <div
              key={item.label}
              onClick={() => item.path && navigate(item.path)}
              className={`nav-item${item.active ? " active" : ""}`}
              style={{ cursor: item.path ? "pointer" : "default" }}
            >
              <item.icon style={{ width: 16, height: 16 }} />
              {item.label}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{
          marginTop: 16, padding: "12px", borderRadius: 12,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #2980b9, #1abc9c)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>KS</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Kauê Silva</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>Administrador</div>
          </div>
          <ChevronDown style={{ width: 13, height: 13, color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
        </div>
      </div>

      {/* ── Área principal ── */}
      <div style={{ flex: 1, height: "100vh", overflowY: "auto", position: "relative", zIndex: 5 }}>

        {/* Top bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 20,
          padding: "14px 28px",
          background: "rgba(210,238,248,0.75)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <button
            className="btn-ghost"
            style={{ height: 38, padding: "0 14px", fontSize: 13 }}
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft style={{ width: 15, height: 15 }} />
            Voltar
          </button>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0f2133", letterSpacing: "-0.02em" }}>
              Cadastrar Empresa
            </h1>
            <p style={{ fontSize: 12, color: "rgba(20,45,70,0.5)", marginTop: 1 }}>
              Preencha os dados da empresa e adicione os contatos vinculados
            </p>
          </div>

          <button style={{
            width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(200,225,240,0.9)",
            background: "rgba(255,255,255,0.75)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
          }}>
            <Bell style={{ width: 16, height: 16, color: "#2980b9" }} />
            <span style={{
              position: "absolute", top: 8, right: 8, width: 7, height: 7,
              background: "#e74c3c", borderRadius: "50%", border: "1.5px solid #fff",
            }} />
          </button>

          <button
            className="btn-grad"
            style={{ height: 38, padding: "0 18px", fontSize: 13, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            <Save style={{ width: 15, height: 15 }} />
            {loading ? "Salvando..." : "Salvar Empresa"}
          </button>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: "24px 28px 48px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>

            {/* ── COLUNA ESQUERDA: Dados da Empresa ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Card: Informações Principais */}
              <motion.div
                className="glass-card"
                style={{ padding: "24px" }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38 }}
              >
                {/* Header da seção */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(41,128,185,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Building2 style={{ width: 17, height: 17, color: "#2980b9" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f2133" }}>Informações Principais</div>
                    <div style={{ fontSize: 11, color: "rgba(20,45,70,0.45)" }}>Dados obrigatórios da empresa</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Nome da Empresa *">
                      <IconInput icon={Building2} placeholder="Nome completo da empresa" value={empresa.nome} onChange={(e: any) => setEmp("nome", e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Segmento *">
                    <IconInput icon={Briefcase} placeholder="ex: Tecnologia, Varejo..." value={empresa.segmento} onChange={(e: any) => setEmp("segmento", e.target.value)} />
                  </Field>
                  <Field label="Porte *">
                    <select className="field-select" value={empresa.porte} onChange={(e) => setEmp("porte", e.target.value)}>
                      <option value="">Selecionar porte...</option>
                      <option>Pequeno</option>
                      <option>Médio</option>
                      <option>Grande</option>
                    </select>
                  </Field>
                  <Field label="CNPJ">
                    <IconInput icon={Hash} placeholder="00.000.000/0000-00" value={empresa.cnpj} onChange={(e: any) => setEmp("cnpj", e.target.value)} />
                  </Field>
                  <Field label="Responsável Principal">
                    <IconInput icon={User} placeholder="Nome do responsável" value={empresa.responsavel_principal} onChange={(e: any) => setEmp("responsavel_principal", e.target.value)} />
                  </Field>
                  <Field label="Site">
                    <IconInput icon={Globe} type="url" placeholder="https://empresa.com.br" value={empresa.site} onChange={(e: any) => setEmp("site", e.target.value)} />
                  </Field>
                  <Field label="LinkedIn da Empresa">
                    <IconInput icon={Link2} placeholder="linkedin.com/company/..." value={empresa.linkedin_empresa} onChange={(e: any) => setEmp("linkedin_empresa", e.target.value)} />
                  </Field>
                </div>
              </motion.div>

              {/* Card: Localização */}
              <motion.div
                className="glass-card"
                style={{ padding: "24px" }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: 0.08 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(26,188,156,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <MapPin style={{ width: 17, height: 17, color: "#1abc9c" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f2133" }}>Localização</div>
                    <div style={{ fontSize: 11, color: "rgba(20,45,70,0.45)" }}>Endereço completo</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Cidade *">
                    <IconInput icon={MapPin} placeholder="Nome da cidade" value={empresa.cidade} onChange={(e: any) => setEmp("cidade", e.target.value)} />
                  </Field>
                  <Field label="CEP *">
                    <input className="field-input" placeholder="00000-000" value={empresa.cep} onChange={(e) => setEmp("cep", e.target.value)} />
                  </Field>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Endereço *">
                      <input className="field-input" placeholder="Rua, número, complemento" value={empresa.endereco} onChange={(e) => setEmp("endereco", e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Bairro *">
                    <input className="field-input" placeholder="Bairro" value={empresa.bairro} onChange={(e) => setEmp("bairro", e.target.value)} />
                  </Field>
                  <Field label="Região *">
                    <input className="field-input" placeholder="ex: Sul, Norte, Centro..." value={empresa.regiao} onChange={(e) => setEmp("regiao", e.target.value)} />
                  </Field>
                </div>
              </motion.div>

              {/* Card: Observações */}
              <motion.div
                className="glass-card"
                style={{ padding: "24px" }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: 0.14 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(142,68,173,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <FileText style={{ width: 17, height: 17, color: "#8e44ad" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f2133" }}>Observações</div>
                    <div style={{ fontSize: 11, color: "rgba(20,45,70,0.45)" }}>Notas internas sobre o lead</div>
                  </div>
                </div>
                <Field label="Observações *">
                  <textarea
                    className="field-textarea"
                    placeholder="Contexto do lead, pontos importantes, histórico relevante..."
                    value={empresa.observacoes}
                    onChange={(e) => setEmp("observacoes", e.target.value)}
                  />
                </Field>
              </motion.div>

            </div>

            {/* ── COLUNA DIREITA: Estratégico ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Card: Dados de Prospecção */}
              <motion.div
                className="glass-card"
                style={{ padding: "24px" }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: 0.06 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(230,126,34,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Target style={{ width: 17, height: 17, color: "#e67e22" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f2133" }}>Dados de Prospecção</div>
                    <div style={{ fontSize: 11, color: "rgba(20,45,70,0.45)" }}>Status e qualificação do lead</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Field label="Status do Lead">
                    <select className="field-select" value={empresa.status} onChange={(e) => setEmpresa({ ...empresa, status: e.target.value })}>
                      <option value="">Selecionar status...</option>
                      <option>Lead</option>
                      <option>Em contato</option>
                      <option>Proposta</option>
                      <option>Fechado</option>
                    </select>
                  </Field>

                  <Field label="Temperatura do Lead">
                    <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                      {(["Frio", "Morno", "Quente"] as const).map((t) => (
                        <button
                          key={t}
                          className={`temp-btn ${t.toLowerCase()}${empresa.temperatura === t ? " active" : ""}`}
                          onClick={() => setEmpresa({ ...empresa, temperatura: t })}
                        >
                          <Thermometer style={{ width: 12, height: 12 }} />
                          {t}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Ticket Médio Estimado">
                    <IconInput icon={DollarSign} type="number" placeholder="0,00" value={empresa.ticket_medio_estimado} onChange={(e: any) => setEmpresa({ ...empresa, ticket_medio_estimado: e.target.value })} />
                  </Field>

                  <Field label="Origem do Lead">
                    <select className="field-select" value={empresa.origem_lead} onChange={(e) => setEmpresa({ ...empresa, origem_lead: e.target.value })}>
                      <option value="">Selecionar origem...</option>
                      <option>Indicação</option>
                      <option>LinkedIn</option>
                      <option>Site</option>
                      <option>Prospecção ativa</option>
                      <option>Evento</option>
                      <option>Cold Email</option>
                      <option>Outro</option>
                    </select>
                  </Field>
                </div>
              </motion.div>

              {/* Card: Ações e Acompanhamento */}
              <motion.div
                className="glass-card"
                style={{ padding: "24px" }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: 0.12 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(39,174,96,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Clock style={{ width: 17, height: 17, color: "#27ae60" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f2133" }}>Acompanhamento</div>
                    <div style={{ fontSize: 11, color: "rgba(20,45,70,0.45)" }}>Ações e datas</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Field label="Última Interação">
                    <input className="field-input" type="date" value={empresa.ultima_interacao} onChange={(e) => setEmpresa({ ...empresa, ultima_interacao: e.target.value })} />
                  </Field>
                  <Field label="Próxima Ação">
                    <IconInput icon={MessageSquare} placeholder="ex: Enviar proposta, Ligar..." value={empresa.proxima_acao} onChange={(e: any) => setEmpresa({ ...empresa, proxima_acao: e.target.value })} />
                  </Field>
                </div>
              </motion.div>

              {/* Mini preview dos contatos */}
              <motion.div
                className="glass-card"
                style={{ padding: "20px 24px" }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: 0.18 }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2133" }}>Contatos</div>
                  <span style={{
                    padding: "3px 10px", borderRadius: 20,
                    background: "rgba(41,128,185,0.1)", color: "#2980b9",
                    fontSize: 11, fontWeight: 700,
                  }}>{contatos.length} adicionado{contatos.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {contatos.map((c, i) => {
                    const color = ["#2980b9","#1abc9c","#e67e22","#8e44ad","#27ae60"][i % 5];
                    const initials = c.nome ? c.nome.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "?";
                    return (
                      <div key={c.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px", borderRadius: 8,
                        background: "rgba(255,255,255,0.55)",
                        border: "1px solid rgba(200,225,240,0.5)",
                      }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: "50%", background: color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0,
                        }}>{initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#0f2133", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {c.nome || `Contato ${i + 1}`}
                          </div>
                          <div style={{ fontSize: 10, color: "rgba(20,45,70,0.4)" }}>{c.funcao || "—"}</div>
                        </div>
                        {c.decisor && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                            background: "rgba(39,174,96,0.1)", color: "#27ae60", border: "1px solid rgba(39,174,96,0.2)",
                          }}>Decisor</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>

          {/* ── SEÇÃO CONTATOS ── */}
          <motion.div
            style={{ marginTop: 20 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.22 }}
          >
            {/* Header da seção */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "linear-gradient(135deg, #2980b9, #1abc9c)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(41,128,185,0.3)",
                }}>
                  <Users style={{ width: 18, height: 18, color: "#fff" }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0f2133" }}>Contatos Vinculados</div>
                  <div style={{ fontSize: 12, color: "rgba(20,45,70,0.45)" }}>
                    Adicione todos os contatos desta empresa
                  </div>
                </div>
              </div>

              <button
                className="btn-grad"
                style={{ height: 40, padding: "0 18px", fontSize: 13 }}
                onClick={addContato}
              >
                <Plus style={{ width: 15, height: 15 }} />
                Adicionar Contato
              </button>
            </div>

            {/* Grid de contatos */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {contatos.map((c, i) => (
                <ContatoCard
                  key={c.id}
                  contato={c}
                  index={i}
                  onChange={handleContatoChange}
                  onRemove={removeContato}
                />
              ))}

              {/* Botão adicionar inline */}
              <div
                onClick={addContato}
                style={{
                  border: "2px dashed rgba(41,128,185,0.25)", borderRadius: 14,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 8, cursor: "pointer", padding: "32px 20px",
                  transition: "all 0.18s", minHeight: 120,
                  background: "rgba(255,255,255,0.35)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(41,128,185,0.5)";
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(41,128,185,0.04)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(41,128,185,0.25)";
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.35)";
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "rgba(41,128,185,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Plus style={{ width: 18, height: 18, color: "#2980b9" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(41,128,185,0.7)" }}>
                  Adicionar contato
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── Rodapé de ação ── */}
          <div style={{
            marginTop: 28, display: "flex", justifyContent: "flex-end", gap: 10,
          }}>
            <button
              className="btn-ghost"
              style={{ height: 44, padding: "0 20px", fontSize: 13 }}
              onClick={() => navigate("/dashboard")}
            >
              Cancelar
            </button>
            <button
              className="btn-grad"
              style={{ height: 44, padding: "0 28px", fontSize: 14, opacity: loading ? 0.75 : 1 }}
              onClick={handleSubmit}
              disabled={loading}
            >
              <Save style={{ width: 16, height: 16 }} />
              {loading ? "Salvando..." : "Salvar Empresa"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
