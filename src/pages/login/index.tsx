import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import PageBackground from "../../components/landing/PageBackground";
import { login as authLogin } from "../../services/auth";

const gradientKeyframes = `
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
  color: "#16191D",
  background: "#ffffff",
  border: "1px solid #E3E6E9",
  boxShadow:"none",
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
  color: "#5B6570",
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
    e.target.style.border = "1px solid #2563EB";
    e.target.style.boxShadow =
      "0 0 0 3px #2563EB, inset 0 1px 0 #ffffff";
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = "1px solid #E3E6E9";
    e.target.style.boxShadow =
      "0 2px 6px #EFF4FE, inset 0 1px 0 #ffffff";
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
        background:
          "#F6F7F8",
      }}
    >
      <style>{gradientKeyframes}</style>

      <PageBackground />

      {/* Dot texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.55,
          backgroundImage:
            "#2563EB",
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
            borderRadius: 8,
            padding: "40px 36px 36px",
            background: "rgba(225,242,252,0.78)", 
            WebkitBackdropFilter: "blur(28px) saturate(170%)",
            border: "1px solid #ffffff",
            boxShadow:"none",
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
                background:
                  "#EFF4FE",
                border: "1.5px solid #2563EB",
              }}
            >
              <LogIn style={{ width: 20, height: 20, color: "#2563EB" }} />
            </div>

            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#2563EB",
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
                color: "#16191D",
                margin: 0,
              }}
            >
              Entre na sua{" "}
              <span
                style={{
                  background:
                    "#2563EB",
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
                <p style={{ fontSize: 11, color: "#5B6570", margin: "6px 2px 0" }}>
                  Digite o código do seu app autenticador (ou um código de backup).
                </p>
              </div>
            )}

            {erro && (
              <p
                style={{
                  fontSize: 13,
                  color: "#B42318",
                  background: "rgba(231,76,60,0.08)",
                  border: "1px solid rgba(231,76,60,0.25)",
                  borderRadius: 8,
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
                borderRadius: 8,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "0.01em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: loading
                  ? "#7ab8d4"
                  : "#2563EB",
                backgroundSize: "200% 200%",
                boxShadow: loading
                  ? "none"
                  : "0 8px 28px #2563EB, inset 0 1px 0 #ffffff",
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
                      stroke="#ffffff"
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
              color: "#5B6570",
              lineHeight: 1.5,
            }}
          >
            Não tem uma conta?{" "}
            <a
              href="/signup"
              style={{ color: "#2563EB", textDecoration: "underline", fontWeight: 600 }}
            >
              Criar conta
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
