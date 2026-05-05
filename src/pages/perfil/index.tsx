import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, User, Mail, Phone, Building2,
  Save, LogOut, Edit3, Check,
} from "lucide-react";
import MouseGlowBackground from "../../components/landing/MouseGlowBackground";

const gradientKeyframes = `
  @keyframes gradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

const inputBase: React.CSSProperties = {
  width: "100%",
  height: "48px",
  padding: "0 16px",
  borderRadius: "12px",
  fontSize: "14px",
  color: "#1a2e40",
  background: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(200,225,240,0.9)",
  boxShadow: "0 2px 6px rgba(41,128,185,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
  outline: "none",
  transition: "border 0.18s, box-shadow 0.18s",
  boxSizing: "border-box" as const,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "rgba(20,45,70,0.55)",
  marginBottom: 7,
};

interface Usuario {
  usuario_id: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  empresa_nome: string;
  bio: string;
  data_criacao: string;
}

function initials(name: string) {
  return name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
}

function avatarColor(name: string) {
  const colors = ["#2980b9", "#1abc9c", "#8e44ad", "#e67e22", "#27ae60", "#e74c3c"];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

export default function Perfil() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    cargo: "",
    empresa_nome: "",
    bio: "",
  });

  useEffect(() => {
    fetchMe();
  }, []);

  const fetchMe = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }
      const res = await fetch("https://backend-crm-production-157b.up.railway.app/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsuario(data);
      setForm({
        nome: data.nome || "",
        telefone: data.telefone || "",
        cargo: data.cargo || "",
        empresa_nome: data.empresa_nome || "",
        bio: data.bio || "",
      });
    } catch {
      navigate("/login");
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://backend-crm-production-157b.up.railway.app/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      fetchMe();
    } catch {
      alert("Erro ao salvar perfil");
    }
    setSaving(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.border = "1px solid rgba(41,128,185,0.55)";
    e.target.style.boxShadow = "0 0 0 3px rgba(41,128,185,0.13), inset 0 1px 0 rgba(255,255,255,0.9)";
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.border = "1px solid rgba(200,225,240,0.9)";
    e.target.style.boxShadow = "0 2px 6px rgba(41,128,185,0.05), inset 0 1px 0 rgba(255,255,255,0.9)";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(145deg, #c8e8f5 0%, #d6eef5 30%, #cceee8 65%, #c5eae0 100%)",
      }}
    >
      <style>{gradientKeyframes}</style>
      <MouseGlowBackground />

      {/* Dot texture */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", opacity:0.55, backgroundImage:"radial-gradient(circle, rgba(41,128,185,0.22) 1px, transparent 1px)", backgroundSize:"22px 22px" }} />

      <div style={{ position:"relative", zIndex:10, maxWidth:720, margin:"0 auto", padding:"40px 24px 60px" }}>

        {/* Back */}
        <button
          onClick={() => navigate("/dashboard")}
          style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", fontSize:13, fontWeight:600, color:"rgba(20,45,70,0.55)", marginBottom:28, padding:"8px 0" }}
        >
          <ArrowLeft style={{ width:16, height:16 }} /> Voltar ao dashboard
        </button>

        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(20,45,70,0.4)", fontSize:14 }}>Carregando...</div>
        ) : (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45 }}>

            {/* Avatar + info card */}
            <div style={{ borderRadius:20, padding:"32px", background:"rgba(225,242,252,0.78)", backdropFilter:"blur(28px) saturate(170%)", border:"1px solid rgba(255,255,255,0.88)", boxShadow:"0 20px 70px rgba(41,128,185,0.12)", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:28 }}>
                {/* Avatar */}
                <div style={{ width:72, height:72, borderRadius:20, background: usuario ? `linear-gradient(135deg, ${avatarColor(usuario.nome)}, ${avatarColor(usuario.nome)}cc)` : "#2980b9", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:800, color:"#fff", flexShrink:0, boxShadow:"0 8px 24px rgba(41,128,185,0.25)" }}>
                  {usuario ? initials(usuario.nome) : "?"}
                </div>
                <div style={{ flex:1 }}>
                  <h1 style={{ fontSize:22, fontWeight:900, color:"#0f2133", letterSpacing:"-0.02em" }}>{usuario?.nome}</h1>
                  <p style={{ fontSize:13, color:"rgba(20,45,70,0.5)", marginTop:3 }}>{usuario?.cargo || "Cargo não informado"} {usuario?.empresa_nome ? `· ${usuario.empresa_nome}` : ""}</p>
                  <p style={{ fontSize:12, color:"rgba(20,45,70,0.4)", marginTop:2 }}>{usuario?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 16px", borderRadius:10, border:"1px solid rgba(231,76,60,0.3)", background:"rgba(231,76,60,0.06)", color:"#e74c3c", fontSize:12, fontWeight:600, cursor:"pointer" }}
                >
                  <LogOut style={{ width:14, height:14 }} /> Sair
                </button>
              </div>

              {/* Membro desde */}
              {usuario?.data_criacao && (
                <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:20, background:"rgba(41,128,185,0.08)", border:"1px solid rgba(41,128,185,0.15)" }}>
                  <span style={{ fontSize:11, fontWeight:600, color:"rgba(20,45,70,0.55)" }}>
                    Membro desde {new Date(usuario.data_criacao).toLocaleDateString("pt-BR", { month:"long", year:"numeric" })}
                  </span>
                </div>
              )}
            </div>

            {/* Formulário */}
            <div style={{ borderRadius:20, padding:"32px", background:"rgba(225,242,252,0.78)", backdropFilter:"blur(28px) saturate(170%)", border:"1px solid rgba(255,255,255,0.88)", boxShadow:"0 20px 70px rgba(41,128,185,0.12)" }}>

              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:24 }}>
                <Edit3 style={{ width:16, height:16, color:"#2980b9" }} />
                <span style={{ fontSize:15, fontWeight:700, color:"#0f2133" }}>Editar Perfil</span>
              </div>

              <form onSubmit={handleSave} style={{ display:"flex", flexDirection:"column", gap:18 }}>

                {/* Nome + Cargo */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <div>
                    <label style={labelStyle}>
                      <User style={{ width:10, height:10, display:"inline", marginRight:4 }} />
                      Nome completo
                    </label>
                    <input
                      name="nome"
                      value={form.nome}
                      onChange={handleChange}
                      style={inputBase}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Cargo</label>
                    <input
                      name="cargo"
                      value={form.cargo}
                      onChange={handleChange}
                      style={inputBase}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      placeholder="Ex: Gerente Comercial"
                    />
                  </div>
                </div>

                {/* Email (readonly) + Telefone */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <div>
                    <label style={labelStyle}>
                      <Mail style={{ width:10, height:10, display:"inline", marginRight:4 }} />
                      E-mail
                    </label>
                    <input
                      value={usuario?.email || ""}
                      readOnly
                      style={{ ...inputBase, background:"rgba(200,225,240,0.3)", color:"rgba(20,45,70,0.45)", cursor:"not-allowed" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      <Phone style={{ width:10, height:10, display:"inline", marginRight:4 }} />
                      Telefone
                    </label>
                    <input
                      name="telefone"
                      value={form.telefone}
                      onChange={handleChange}
                      style={inputBase}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      placeholder="(41) 99999-9999"
                    />
                  </div>
                </div>

                {/* Empresa */}
                <div>
                  <label style={labelStyle}>
                    <Building2 style={{ width:10, height:10, display:"inline", marginRight:4 }} />
                    Empresa
                  </label>
                  <input
                    name="empresa_nome"
                    value={form.empresa_nome}
                    onChange={handleChange}
                    style={inputBase}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder="Nome da sua empresa"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label style={labelStyle}>Bio / Observações</label>
                  <textarea
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder="Fale um pouco sobre você..."
                    style={{
                      ...inputBase,
                      height: "90px",
                      padding: "12px 16px",
                      resize: "vertical",
                    }}
                  />
                </div>

                {/* Botão salvar */}
                <motion.button
                  type="submit"
                  disabled={saving}
                  whileHover={{ scale: saving ? 1 : 1.015 }}
                  whileTap={{ scale: saving ? 1 : 0.985 }}
                  style={{
                    height: 50,
                    borderRadius: 12,
                    border: "none",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background: saved
                      ? "linear-gradient(135deg, #27ae60, #2ecc71)"
                      : saving
                      ? "linear-gradient(135deg, #7ab8d4, #6fc5b5)"
                      : "linear-gradient(135deg, #2980b9, #1abc9c, #2ecc71, #2980b9)",
                    backgroundSize: "200% 200%",
                    animation: saving || saved ? "none" : "gradientShift 4s ease infinite",
                    boxShadow: saving ? "none" : "0 8px 28px rgba(41,128,185,0.35)",
                    transition: "background 0.3s",
                  }}
                >
                  {saved ? (
                    <><Check style={{ width:16, height:16 }} /> Salvo com sucesso!</>
                  ) : saving ? (
                    <>
                      <svg style={{ width:16, height:16 }} viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.35)" strokeWidth="4" />
                        <path fill="white" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Salvando...
                    </>
                  ) : (
                    <><Save style={{ width:16, height:16 }} /> Salvar alterações</>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}