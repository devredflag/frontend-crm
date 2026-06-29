import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, CheckCircle2 } from "lucide-react";
import MouseGlowBackground from "../../components/landing/MouseGlowBackground";

const API = "https://backend-crm-production-157b.up.railway.app";

const gradientKeyframes = `
  @keyframes gradientShift { 0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%} }
`;

const inputBase: React.CSSProperties = {
  width: "100%",
  height: "52px",
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

export default function Signup() {
  const [empresaNome, setEmpresaNome] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);
  const navigate = useNavigate();

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = "1px solid rgba(41,128,185,0.55)";
    e.target.style.boxShadow = "0 0 0 3px rgba(41,128,185,0.13), inset 0 1px 0 rgba(255,255,255,0.9)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = "1px solid rgba(200,225,240,0.9)";
    e.target.style.boxShadow = "0 2px 6px rgba(41,128,185,0.05), inset 0 1px 0 rgba(255,255,255,0.9)";
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa_nome: empresaNome,
          nome,
          email,
          telefone: telefone.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnviado(true);
      } else {
        setErro(typeof data.detail === "string" ? data.detail : "Não foi possível criar a conta.");
      }
    } catch {
      setErro("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg, #c8e8f5 0%, #d6eef5 30%, #cceee8 65%, #c5eae0 100%)" }}>
      <style>{gradientKeyframes}</style>
      <MouseGlowBackground />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.55, backgroundImage: "radial-gradient(circle, rgba(41,128,185,0.22) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

      <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 460, padding: "0 20px" }}>
        <div style={{ borderRadius: 20, padding: "40px 36px 32px", background: "rgba(225,242,252,0.78)", backdropFilter: "blur(28px) saturate(170%)", WebkitBackdropFilter: "blur(28px) saturate(170%)", border: "1px solid rgba(255,255,255,0.88)", boxShadow: "0 20px 70px rgba(41,128,185,0.16), 0 2px 8px rgba(41,128,185,0.08), inset 0 1px 0 rgba(255,255,255,0.95)" }}>

          {enviado ? (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", background: "linear-gradient(135deg, rgba(39,174,96,0.15), rgba(26,188,156,0.18))", border: "1.5px solid rgba(39,174,96,0.3)" }}>
                <CheckCircle2 style={{ width: 26, height: 26, color: "#1e8449" }} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "#0f2133", margin: "0 0 10px" }}>Conta criada! 🎉</h2>
              <p style={{ fontSize: 13.5, color: "rgba(20,45,70,0.6)", lineHeight: 1.6, marginBottom: 24 }}>
                Enviamos um email para <b>{email}</b> com o link para ativar a conta e definir sua senha.
                Você entra como <b>gerente</b> e poderá adicionar sua equipe.
              </p>
              <button onClick={() => navigate("/login")} style={{ width: "100%", height: 50, borderRadius: 12, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, #2980b9, #1abc9c, #2ecc71, #2980b9)", backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite" }}>
                Ir para o login
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", background: "linear-gradient(135deg, rgba(41,128,185,0.12), rgba(26,188,156,0.15))", border: "1.5px solid rgba(41,128,185,0.28)" }}>
                  <Building2 style={{ width: 20, height: 20, color: "#2980b9" }} />
                </div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(41,128,185,0.68)", margin: "0 0 8px" }}>Comece agora</p>
                <h2 style={{ fontSize: 25, fontWeight: 900, letterSpacing: "-0.02em", color: "#0f2133", margin: 0 }}>
                  Crie a conta da sua{" "}
                  <span style={{ background: "linear-gradient(90deg, #2980b9, #1abc9c, #2ecc71, #2980b9)", backgroundSize: "200% 200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", animation: "gradientShift 4s ease infinite" }}>empresa</span>
                </h2>
                <p style={{ fontSize: 12.5, color: "rgba(20,45,70,0.5)", marginTop: 8 }}>
                  Você será o gerente e poderá cadastrar seus vendedores.
                </p>
              </div>

              <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nome da empresa</label>
                  <input type="text" placeholder="Minha Empresa Ltda" value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} required style={inputBase} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={labelStyle}>Seu nome</label>
                  <input type="text" placeholder="Nome do gerente" value={nome} onChange={(e) => setNome(e.target.value)} required style={inputBase} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={labelStyle}>E-mail</label>
                  <input type="email" placeholder="voce@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputBase} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <label style={labelStyle}>Telefone (opcional)</label>
                  <input type="text" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(e.target.value)} style={inputBase} onFocus={onFocus} onBlur={onBlur} />
                </div>

                {erro && (
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#dc2626", background: "rgba(220,38,38,0.08)", padding: "9px 13px", borderRadius: 10 }}>{erro}</div>
                )}

                <motion.button type="submit" disabled={loading} whileHover={{ scale: loading ? 1 : 1.015 }} whileTap={{ scale: loading ? 1 : 0.985 }} style={{ marginTop: 4, width: "100%", height: 52, borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: loading ? "linear-gradient(135deg, #7ab8d4, #6fc5b5)" : "linear-gradient(135deg, #2980b9, #1abc9c, #2ecc71, #2980b9)", backgroundSize: "200% 200%", boxShadow: loading ? "none" : "0 8px 28px rgba(41,128,185,0.45), inset 0 1px 0 rgba(255,255,255,0.18)", animation: loading ? "none" : "gradientShift 4s ease infinite", transition: "box-shadow 0.3s" }}>
                  {loading ? "Criando..." : "Criar conta"}
                </motion.button>
              </form>

              <p style={{ marginTop: 18, textAlign: "center", fontSize: 12, color: "rgba(20,45,70,0.42)" }}>
                Já tem uma conta?{" "}
                <a href="/login" style={{ color: "rgba(41,128,185,0.75)", textDecoration: "underline", fontWeight: 600 }}>Entrar</a>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
