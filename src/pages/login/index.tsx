import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import MouseGlowBackground from "../../components/landing/MouseGlowBackground";
import { login as authLogin } from "../../services/auth";

import { FUNDO_AZUL } from "../../components/FundoAzul";
const gradientKeyframes = `
  @keyframes gradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

const inputBase: React.CSSProperties = {
  width: "100%",
  height: "52px",
  padding: "0 16px",
  borderRadius: "12px",
  fontSize: "14px",
  color:"#EAF6FB",
  background:"rgba(18,59,94,0.55)",
  border:"1px solid rgba(159,211,234,0.18)",
  boxShadow: "0 2px 6px rgba(41,128,185,0.05), inset 0 1px 0 rgba(18,59,94,0.55)",
  outline:"none",
  transition: "border 0.18s, box-shadow 0.18s",
  boxSizing: "border-box" as const,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color:"#9FD3EA",
  marginBottom: 7,
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = "1px solid rgba(41,128,185,0.55)";
    e.target.style.boxShadow =
      "0 0 0 3px rgba(41,128,185,0.13), inset 0 1px 0 rgba(18,59,94,0.55)";
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = "1px solid rgba(200,225,240,0.9)";
    e.target.style.boxShadow =
      "0 2px 6px rgba(41,128,185,0.05), inset 0 1px 0 rgba(18,59,94,0.55)";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // evita recarregar a página
    setErro("");
    setLoading(true);

    try {
      const res = await authLogin(email, senha, mfaRequired ? mfaCode : undefined);

      if (res.ok) {
        navigate("/dashboard");
      } else if (res.mfaRequired) {
        // Conta com MFA: pede o código do app autenticador.
        setMfaRequired(true);
        setErro("");
      } else {
        setErro(res.error);
      }
    } catch (error) {
      console.error("ERRO:", error);
      setErro("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:FUNDO_AZUL.background, backgroundSize: FUNDO_AZUL.backgroundSize,
      }}
    >
      <style>{gradientKeyframes}</style>

      <MouseGlowBackground />

      {/* Dot texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.55,
          backgroundImage:
            "radial-gradient(circle, rgba(41,128,185,0.22) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 440,
          padding: "0 20px",
        }}
      >
        <div
          style={{
            borderRadius: 20,
            padding: "40px 36px 36px",
            background:"rgba(20,51,84,0.92)",
            backdropFilter: "blur(28px) saturate(170%)",
            WebkitBackdropFilter: "blur(28px) saturate(170%)",
            border:"1px solid rgba(159,211,234,0.18)",
            boxShadow:
              "0 20px 70px rgba(41,128,185,0.16), 0 2px 8px rgba(41,128,185,0.08), inset 0 1px 0 rgba(18,59,94,0.55)",
          }}
        >
          {/* Ícone + título */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                background:"linear-gradient(135deg, rgba(46,111,149,0.12), rgba(26,188,156,0.15))",
                border:"1.5px solid rgba(159,211,234,0.30)",
              }}
            >
              <LogIn style={{ width: 20, height: 20, color:"#9FD3EA" }} />
            </div>

            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color:"#9FD3EA",
                margin: "0 0 8px",
              }}
            >
              Bem-vindo de volta
            </p>

            <h2
              style={{
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color:"#EAF6FB",
                margin: 0,
              }}
            >
              Entre na sua{" "}
              <span
                style={{
                  background:"linear-gradient(90deg, #2E6F95, #2E6F95, #83DDA8, #2E6F95)",
                  backgroundSize: "200% 200%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "gradientShift 4s ease infinite",
                }}
              >
                conta
              </span>
            </h2>
          </div>

          {/* Formulário */}
          <form
            onSubmit={handleLogin}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            {/* Email */}
            <div>
              <label style={labelStyle}>E-mail</label>
              <input
                type="email"
                placeholder="voce@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputBase}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Senha */}
            <div>
              <label style={labelStyle}>Senha</label>
              <input
                type="password"
                placeholder="Sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                style={inputBase}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Código MFA (aparece só quando a conta tem 2FA ativado) */}
            {mfaRequired && (
              <div>
                <label style={labelStyle}>Código de verificação (2FA)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  required
                  autoFocus
                  style={{ ...inputBase, letterSpacing: "0.3em", textAlign: "center" }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <p style={{ fontSize: 11, color:"#9FD3EA", margin: "6px 2px 0" }}>
                  Digite o código do seu app autenticador (ou um código de backup).
                </p>
              </div>
            )}

            {erro && (
              <p
                style={{
                  fontSize: 13,
                  color:"#F7B8B1",
                  background:"rgba(231,76,60,0.08)",
                  border:"1px solid rgba(231,76,60,0.25)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  margin: 0,
                }}
              >
                {erro}
              </p>
            )}

            {/* Botão */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.015 }}
              whileTap={{ scale: loading ? 1 : 0.985 }}
              style={{
                marginTop: 4,
                width: "100%",
                height: 52,
                borderRadius: 12,
                border:"none",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 15,
                fontWeight: 700,
                color:"#fff",
                letterSpacing: "0.01em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background:loading
                  ? "linear-gradient(135deg, #7ab8d4, #6fc5b5)"
                  : "linear-gradient(135deg, #9FD3EA, #83DDA8, #83DDA8, #9FD3EA)",
                backgroundSize: "200% 200%",
                boxShadow: loading
                  ? "none"
                  : "0 8px 28px rgba(41,128,185,0.45), inset 0 1px 0 rgba(255,255,255,0.18)",
                animation: loading ? "none" : "gradientShift 4s ease infinite",
                transition: "box-shadow 0.3s",
              }}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin"
                    style={{ width: 16, height: 16 }}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="rgba(255,255,255,0.35)"
                      strokeWidth="4"
                    />
                    <path fill="white" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </motion.button>
          </form>

          {/* Rodapé */}
          <p
            style={{
              marginTop: 20,
              textAlign: "center",
              fontSize: 12,
              color:"#9FD3EA",
              lineHeight: 1.5,
            }}
          >
            Não tem uma conta?{" "}
            <a
              href="/signup"
              style={{ color:"#9FD3EA", textDecoration: "underline", fontWeight: 600 }}
            >
              Criar conta
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
