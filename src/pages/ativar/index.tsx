import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, CheckCircle2 } from "lucide-react";
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

export default function AtivarConta() {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get("token");

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = "1px solid rgba(41,128,185,0.55)";
    e.target.style.boxShadow =
      "0 0 0 3px rgba(41,128,185,0.13), inset 0 1px 0 rgba(255,255,255,0.9)";
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = "1px solid rgba(200,225,240,0.9)";
    e.target.style.boxShadow =
      "0 2px 6px rgba(41,128,185,0.05), inset 0 1px 0 rgba(255,255,255,0.9)";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (senha !== confirmar) {
      alert("Senhas não conferem");
      return;
    }

    setLoading(true);

    try {
       const res = await fetch("https://backend-crm-production-157b.up.railway.app/ativar-conta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha }),
      });

      if (!res.ok) throw new Error();

      setSuccess(true);
      setTimeout(() => navigate("/"), 2200);
    } catch {
      alert("Erro ao ativar conta");
    }

    setLoading(false);
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
          "linear-gradient(145deg, #c8e8f5 0%, #d6eef5 30%, #cceee8 65%, #c5eae0 100%)",
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
            background: "rgba(225,242,252,0.78)",
            backdropFilter: "blur(28px) saturate(170%)",
            WebkitBackdropFilter: "blur(28px) saturate(170%)",
            border: "1px solid rgba(255,255,255,0.88)",
            boxShadow:
              "0 20px 70px rgba(41,128,185,0.16), 0 2px 8px rgba(41,128,185,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
          }}
        >
          {!success ? (
            <>
              {/* Ícone + título */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
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
                      "linear-gradient(135deg, rgba(41,128,185,0.12), rgba(26,188,156,0.15))",
                    border: "1.5px solid rgba(41,128,185,0.28)",
                  }}
                >
                  <KeyRound style={{ width: 20, height: 20, color: "#2980b9" }} />
                </div>

                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(41,128,185,0.68)",
                    margin: "0 0 8px",
                  }}
                >
                  Ativação de conta
                </p>

                <h2
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    letterSpacing: "-0.02em",
                    color: "#0f2133",
                    margin: 0,
                  }}
                >
                  Crie sua{" "}
                  <span
                    style={{
                      background:
                        "linear-gradient(90deg, #2980b9, #1abc9c, #2ecc71, #2980b9)",
                      backgroundSize: "200% 200%",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      animation: "gradientShift 4s ease infinite",
                    }}
                  >
                    senha
                  </span>
                </h2>
              </div>

              <form
                onSubmit={handleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                {/* Senha */}
                <div>
                  <label style={labelStyle}>Senha</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    style={inputBase}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>

                {/* Confirmar senha */}
                <div>
                  <label style={labelStyle}>Confirmar senha</label>
                  <input
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    required
                    style={inputBase}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>

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
                      ? "linear-gradient(135deg, #7ab8d4, #6fc5b5)"
                      : "linear-gradient(135deg, #2980b9, #1abc9c, #2ecc71, #2980b9)",
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
                      Ativando...
                    </>
                  ) : (
                    "Confirmar senha"
                  )}
                </motion.button>
              </form>
            </>
          ) : (
            /* Success state */
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.38 }}
              style={{ textAlign: "center", padding: "24px 0" }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  background:
                    "linear-gradient(135deg, rgba(41,128,185,0.12), rgba(26,188,156,0.18))",
                  border: "2px solid rgba(26,188,156,0.42)",
                }}
              >
                <CheckCircle2 style={{ width: 30, height: 30, color: "#1abc9c" }} />
              </div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#0f2133",
                  margin: "0 0 10px",
                }}
              >
                Conta ativada com sucesso!
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(20,45,70,0.6)",
                  lineHeight: 1.6,
                  maxWidth: 260,
                  margin: "0 auto",
                }}
              >
                Redirecionando para o sistema...
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
