import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, MapPin } from "lucide-react";
import MouseGlowBackground from "../../components/landing/MouseGlowBackground";

const benefits: string[] = [
  "Onboarding guiado com um especialista",
  "Importação gratuita da sua base atual",
  "Treinamento para vendedores e gestores",
  "Suporte por WhatsApp em horário comercial",
];

interface FormState {
  nome: string;
  email: string;
  empresa: string;
  telefone: string;
}

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

// CSS injetado uma vez para o keyframe do gradient animado
const gradientKeyframes = `
  @keyframes gradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes gradientShiftBtn {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

export default function Cadastro() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    nome: "",
    email: "",
    empresa: "",
    telefone: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("https://backend-crm-production-157b.up.railway.app/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          telefone: form.telefone,
        }),
      });
      setSuccess(true);
    } catch {
      alert("Erro ao criar conta");
    }
    setLoading(false);
  };

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

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        background:
          "linear-gradient(145deg, #c8e8f5 0%, #d6eef5 30%, #cceee8 65%, #c5eae0 100%)",
      }}
    >
      {/* Inject keyframes */}
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

      {/* ── Main grid ── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
          padding: "96px 40px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "80px",
          alignItems: "center",
        }}
      >
        {/* ── LEFT: copy ── */}
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.52 }}
        >
          {/* "COMEÇAR AGORA" eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 1.5, background: "rgba(41,128,185,0.55)" }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "rgba(41,128,185,0.75)",
              }}
            >
              Começar Agora
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: "clamp(36px, 4vw, 52px)",
              fontWeight: 900,
              lineHeight: 1.12,
              color: "#0f2133",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Seu próximo cliente
            <br />
            já está{" "}
            {/* Animated gradient text — suave, cicla infinitamente */}
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
              no mapa.
            </span>
          </h1>

          {/* Subtext */}
          <p
            style={{
              marginTop: 22,
              fontSize: 15,
              lineHeight: 1.65,
              color: "rgba(20,45,70,0.6)",
              maxWidth: 420,
            }}
          >
            Coloque seu time comercial no ProspectCRM em menos de 48 horas. Teste 14 dias com
            todos os recursos, sem compromisso.
          </p>

          {/* Benefits list */}
          <ul
            style={{
              marginTop: 28,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {benefits.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.38, delay: 0.18 + i * 0.07 }}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "linear-gradient(135deg, rgba(41,128,185,0.1), rgba(26,188,156,0.1))",
                    border: "1.5px solid rgba(41,128,185,0.30)",
                  }}
                >
                  <CheckCircle2 style={{ width: 12, height: 12, color: "#2980b9" }} />
                </div>
                <span style={{ fontSize: 14, color: "rgba(20,45,70,0.72)", fontWeight: 500 }}>
                  {item}
                </span>
              </motion.li>
            ))}
          </ul>

          {/* Map pin footer */}
          <div
            style={{
              marginTop: 32,
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: "rgba(41,128,185,0.7)",
            }}
          >
            <MapPin style={{ width: 14, height: 14 }} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>
              Prospecção geográfica inteligente inclusa
            </span>
          </div>
        </motion.div>

        {/* ── RIGHT: form card ── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.58, delay: 0.08 }}
        >
          <div
            style={{
              borderRadius: 20,
              padding: "36px 36px 32px",
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
                {/* Card eyebrow */}
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(41,128,185,0.68)",
                    margin: "0 0 22px",
                  }}
                >
                  Crie sua conta em 30 segundos
                </p>

                <form
                  onSubmit={handleSubmit}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  {/* Nome */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "rgba(20,45,70,0.55)",
                        marginBottom: 7,
                      }}
                    >
                      Seu Nome
                    </label>
                    <input
                      type="text"
                      name="nome"
                      value={form.nome}
                      onChange={handleChange}
                      placeholder="Ex: João Paulo"
                      required
                      style={inputBase}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "rgba(20,45,70,0.55)",
                        marginBottom: 7,
                      }}
                    >
                      E-mail Corporativo
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="voce@empresa.com.br"
                      required
                      style={inputBase}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>

                  {/* Empresa + Telefone */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "rgba(20,45,70,0.55)",
                          marginBottom: 7,
                        }}
                      >
                        Empresa
                      </label>
                      <input
                        type="text"
                        name="empresa"
                        value={form.empresa}
                        onChange={handleChange}
                        placeholder="Ex: Roma Sul"
                        required
                        style={inputBase}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "rgba(20,45,70,0.55)",
                          marginBottom: 7,
                        }}
                      >
                        Telefone
                      </label>
                      <input
                        type="tel"
                        name="telefone"
                        value={form.telefone}
                        onChange={handleChange}
                        placeholder="(11) 90000-0000"
                        style={inputBase}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                  </div>

                  {/* Submit button — também com gradient animado suave */}
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
                      animation: loading ? "none" : "gradientShiftBtn 4s ease infinite",
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
                        Criando conta...
                      </>
                    ) : (
                      <>
                        Começar agora →
                        <ArrowRight style={{ width: 16, height: 16 }} />
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Fine print */}
                <p
                  style={{
                    marginTop: 14,
                    textAlign: "center",
                    fontSize: 11.5,
                    color: "rgba(20,45,70,0.42)",
                    lineHeight: 1.5,
                  }}
                >
                  Ao continuar, você concorda com os{" "}
                  <a
                    href="#"
                    style={{ color: "rgba(41,128,185,0.75)", textDecoration: "underline" }}
                  >
                    Termos de Uso
                  </a>{" "}
                  e{" "}
                  <a
                    href="#"
                    style={{ color: "rgba(41,128,185,0.75)", textDecoration: "underline" }}
                  >
                    Política de Privacidade
                  </a>
                  .
                </p>
              </>
            ) : (
              /* Success state */
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.38 }}
                style={{ textAlign: "center", padding: "32px 0" }}
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
                  Conta criada com sucesso!
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(20,45,70,0.6)",
                    lineHeight: 1.6,
                    maxWidth: 280,
                    margin: "0 auto",
                  }}
                >
                  Em breve nossa equipe entrará em contato para o onboarding. Bem-vindo ao
                  ProspectCRM!
                </p>
                <button
                  onClick={() => navigate("/")}
                  style={{
                    marginTop: 24,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#2980b9",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Voltar para o site
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}