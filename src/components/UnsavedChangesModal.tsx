import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Save, FileText, ArrowRight, X } from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────
export type UnsavedChangesAction =
  | "save"       // Salvar empresa (campos obrigatórios preenchidos)
  | "draft"      // Salvar como rascunho
  | "continue"   // Continuar editando
  | "discard";   // Sair mesmo assim

interface UnsavedChangesModalProps {
  open: boolean;
  /** Se false, o botão "Salvar empresa" fica desabilitado (campos obrigatórios faltando) */
  canSave?: boolean;
  onAction: (action: UnsavedChangesAction) => void;
}

// ── CSS inline compartilhado ──────────────────────────────────
const gradientShift = `
  @keyframes gradientShift {
    0%,100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }
`;

// ── Botão gradiente ───────────────────────────────────────────
function BtnGrad({
  children,
  onClick,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: 10,
        color: "#fff",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        background:
          "linear-gradient(135deg,#2980b9,#1abc9c,#2ecc71,#2980b9)",
        backgroundSize: "200% 200%",
        animation: disabled ? "none" : "gradientShift 4s ease infinite",
        boxShadow: disabled
          ? "none"
          : "0 4px 14px rgba(41,128,185,0.35)",
        opacity: disabled ? 0.45 : 1,
        transition: "transform 0.15s, box-shadow 0.15s",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.transform =
            "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform =
          "translateY(0)";
      }}
    >
      {children}
    </button>
  );
}

// ── Botão fantasma ────────────────────────────────────────────
function BtnGhost({
  children,
  onClick,
  style,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  style?: React.CSSProperties;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: danger
          ? "1.5px solid rgba(231,76,60,0.3)"
          : "1.5px solid rgba(200,225,240,0.9)",
        background: danger
          ? "rgba(231,76,60,0.06)"
          : "rgba(255,255,255,0.75)",
        cursor: "pointer",
        borderRadius: 10,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 600,
        color: danger ? "#e74c3c" : "rgba(20,45,70,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        transition: "all 0.18s",
        ...style,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = danger
          ? "rgba(231,76,60,0.12)"
          : "rgba(255,255,255,0.95)";
        if (!danger)
          (e.currentTarget as HTMLButtonElement).style.color = "#2980b9";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = danger
          ? "rgba(231,76,60,0.06)"
          : "rgba(255,255,255,0.75)";
        if (!danger)
          (e.currentTarget as HTMLButtonElement).style.color =
            "rgba(20,45,70,0.65)";
      }}
    >
      {children}
    </button>
  );
}

// ── Modal principal ───────────────────────────────────────────
export default function UnsavedChangesModal({
  open,
  canSave = true,
  onAction,
}: UnsavedChangesModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
            * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }
            ${gradientShift}
          `}</style>

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onAction("continue")}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(10,31,51,0.4)",
              backdropFilter: "blur(6px)",
            }}
          >
            {/* Card */}
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 14 }}
              transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 460,
                background: "rgba(248,252,255,0.97)",
                backdropFilter: "blur(24px)",
                borderRadius: 20,
                border: "1.5px solid rgba(230,126,34,0.25)",
                boxShadow:
                  "0 28px 72px rgba(10,31,51,0.24), 0 0 0 1px rgba(230,126,34,0.12)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Barra laranja no topo */}
              <div
                style={{
                  height: 4,
                  background:
                    "linear-gradient(90deg, #e67e22, #f39c12, #e67e22)",
                  backgroundSize: "200% 100%",
                  animation: "gradientShift 3s ease infinite",
                }}
              />

              {/* Botão fechar (continuar) */}
              <button
                onClick={() => onAction("continue")}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "1px solid rgba(200,225,240,0.7)",
                  background: "rgba(255,255,255,0.8)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(20,45,70,0.4)",
                  transition: "all 0.18s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,1)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#e74c3c";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.8)";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "rgba(20,45,70,0.4)";
                }}
              >
                <X style={{ width: 13, height: 13 }} />
              </button>

              <div style={{ padding: "28px 28px 24px" }}>
                {/* Ícone + título */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    marginBottom: 22,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: "rgba(230,126,34,0.1)",
                      border: "1.5px solid rgba(230,126,34,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AlertTriangle
                      style={{ width: 22, height: 22, color: "#e67e22" }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#0f2133",
                        marginBottom: 4,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      Alterações não salvas
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(20,45,70,0.55)",
                        lineHeight: 1.55,
                      }}
                    >
                      Caso mude de guia, as informações preenchidas serão
                      perdidas. O que deseja fazer?
                    </div>
                  </div>
                </div>

                {/* Opções */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginBottom: 20,
                  }}
                >
                  {/* Opção 1 — Salvar empresa */}
                  <OptionButton
                    icon={
                      <Save
                        style={{ width: 15, height: 15, color: "#2980b9" }}
                      />
                    }
                    iconBg="rgba(41,128,185,0.1)"
                    label="Salvar empresa"
                    description={
                      canSave
                        ? "Salva todos os dados e vai para a próxima tela"
                        : "Preencha os campos obrigatórios antes de salvar"
                    }
                    disabled={!canSave}
                    onClick={() => onAction("save")}
                    badge={canSave ? undefined : "Campos obrigatórios faltando"}
                    badgeColor="#e67e22"
                  />

                  {/* Opção 2 — Salvar como rascunho */}
                  <OptionButton
                    icon={
                      <FileText
                        style={{ width: 15, height: 15, color: "#8e44ad" }}
                      />
                    }
                    iconBg="rgba(142,68,173,0.1)"
                    label="Salvar como rascunho"
                    description="Salva o progresso parcial. Você pode completar depois"
                    onClick={() => onAction("draft")}
                  />

                  {/* Opção 3 — Continuar editando */}
                  <OptionButton
                    icon={
                      <ArrowRight
                        style={{ width: 15, height: 15, color: "#27ae60" }}
                      />
                    }
                    iconBg="rgba(39,174,96,0.1)"
                    label="Continuar editando"
                    description="Voltar ao formulário e continuar preenchendo"
                    onClick={() => onAction("continue")}
                  />
                </div>

                {/* Divisor */}
                <div
                  style={{
                    height: 1,
                    background: "rgba(200,225,240,0.5)",
                    marginBottom: 16,
                  }}
                />

                {/* Opção 4 — Sair mesmo assim */}
                <BtnGhost
                  onClick={() => onAction("discard")}
                  danger
                  style={{ width: "100%", height: 40, fontSize: 13 }}
                >
                  <X style={{ width: 13, height: 13 }} />
                  Sair mesmo assim — descartar alterações
                </BtnGhost>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Sub-componente: linha de opção ────────────────────────────
function OptionButton({
  icon,
  iconBg,
  label,
  description,
  disabled,
  onClick,
  badge,
  badgeColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 12,
        border: "1.5px solid rgba(200,225,240,0.7)",
        background: disabled
          ? "rgba(240,244,248,0.5)"
          : "rgba(255,255,255,0.75)",
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        transition: "all 0.18s",
        opacity: disabled ? 0.55 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,1)";
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            "rgba(41,128,185,0.3)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 4px 16px rgba(41,128,185,0.1)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(255,255,255,0.75)";
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          "rgba(200,225,240,0.7)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: disabled ? "rgba(20,45,70,0.45)" : "#0f2133",
            marginBottom: 2,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {label}
          {badge && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 4,
                background: `${badgeColor}18`,
                color: badgeColor,
                border: `1px solid ${badgeColor}30`,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(20,45,70,0.45)",
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>
      {!disabled && (
        <ArrowRight
          style={{
            width: 13,
            height: 13,
            color: "rgba(20,45,70,0.25)",
            flexShrink: 0,
          }}
        />
      )}
    </button>
  );
}