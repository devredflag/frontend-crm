import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Phone, MessageCircle, Link2,
  CheckSquare, Square, Users, Send, X,
  ChevronDown, User,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────
export type SendChannel = "email" | "whatsapp" | "telefone" | "linkedin";

export interface Recipient {
  id: string;
  nome: string;
  funcao?: string;
  /** Valor do canal (email, whatsapp, telefone, linkedin) */
  valor: string;
  /** Se true, é o contato principal / contato 1 */
  principal?: boolean;
  decisor?: boolean;
}

interface SelectRecipientsModalProps {
  open: boolean;
  channel: SendChannel;
  /** Lista de destinatários disponíveis para o canal escolhido */
  recipients: Recipient[];
  onConfirm: (selected: Recipient[]) => void;
  onClose: () => void;
}

// ── Configuração por canal ─────────────────────────────────────
const CHANNEL_CONFIG: Record<
  SendChannel,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ElementType;
    placeholder: string;
  }
> = {
  email: {
    label: "E-mail",
    color: "#2980b9",
    bg: "rgba(41,128,185,0.08)",
    border: "rgba(41,128,185,0.25)",
    icon: Mail,
    placeholder: "email@empresa.com",
  },
  whatsapp: {
    label: "WhatsApp",
    color: "#27ae60",
    bg: "rgba(39,174,96,0.08)",
    border: "rgba(39,174,96,0.25)",
    icon: MessageCircle,
    placeholder: "(00) 00000-0000",
  },
  telefone: {
    label: "Telefone",
    color: "#e67e22",
    bg: "rgba(230,126,34,0.08)",
    border: "rgba(230,126,34,0.25)",
    icon: Phone,
    placeholder: "(00) 00000-0000",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0077b5",
    bg: "rgba(0,119,181,0.08)",
    border: "rgba(0,119,181,0.25)",
    icon: Link2,
    placeholder: "linkedin.com/in/...",
  },
};

type Mode = "principal" | "selecionar";

const gradientShift = `
  @keyframes gradientShift {
    0%,100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

// ── Helpers visuais ───────────────────────────────────────────
function avatarColor(n: string) {
  const c = ["#2980b9", "#1abc9c", "#8e44ad", "#e67e22", "#27ae60", "#e74c3c"];
  return c[(n?.charCodeAt(0) || 0) % c.length];
}
function initials(n: string) {
  return (
    n
      ?.split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

// ── Modal ─────────────────────────────────────────────────────
export default function SelectRecipientsModal({
  open,
  channel,
  recipients,
  onConfirm,
  onClose,
}: SelectRecipientsModalProps) {
  const cfg = CHANNEL_CONFIG[channel];
  const Icon = cfg.icon;

  const [mode, setMode] = useState<Mode>("principal");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const principal = useMemo(
    () => recipients.find((r) => r.principal) || recipients[0],
    [recipients]
  );

  const allSelected = selected.size === recipients.length && recipients.length > 0;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(recipients.map((r) => r.id)));
    }
  };

  const handleConfirm = () => {
    if (mode === "principal") {
      if (principal) onConfirm([principal]);
    } else {
      const list = recipients.filter((r) => selected.has(r.id));
      if (list.length > 0) onConfirm(list);
    }
  };

  const canConfirm =
    mode === "principal"
      ? !!principal
      : selected.size > 0;

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
            onClick={onClose}
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
                width: 480,
                maxHeight: "90vh",
                overflowY: "auto",
                background: "rgba(248,252,255,0.97)",
                backdropFilter: "blur(24px)",
                borderRadius: 20,
                border: `1.5px solid ${cfg.border}`,
                boxShadow: `0 28px 72px rgba(10,31,51,0.24), 0 0 0 1px ${cfg.border}`,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Barra colorida no topo */}
              <div
                style={{
                  height: 4,
                  background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}aa, ${cfg.color})`,
                  backgroundSize: "200% 100%",
                  animation: "gradientShift 3s ease infinite",
                  flexShrink: 0,
                }}
              />

              {/* Botão fechar */}
              <button
                onClick={onClose}
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
                  zIndex: 2,
                  transition: "all 0.18s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#e74c3c";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "rgba(20,45,70,0.4)";
                }}
              >
                <X style={{ width: 13, height: 13 }} />
              </button>

              <div style={{ padding: "24px 24px 20px", overflowY: "auto" }}>
                {/* Cabeçalho */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 13,
                      background: cfg.bg,
                      border: `1.5px solid ${cfg.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ width: 20, height: 20, color: cfg.color }} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#0f2133",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      Enviar via {cfg.label}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "rgba(20,45,70,0.5)" }}
                    >
                      Escolha para quem deseja enviar
                    </div>
                  </div>
                </div>

                {/* Opções de modo */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginBottom: 18,
                  }}
                >
                  <ModeButton
                    active={mode === "principal"}
                    color={cfg.color}
                    icon={<User style={{ width: 14, height: 14 }} />}
                    label={`${cfg.label} principal`}
                    sub="Contato 1"
                    onClick={() => setMode("principal")}
                  />
                  <ModeButton
                    active={mode === "selecionar"}
                    color={cfg.color}
                    icon={<Users style={{ width: 14, height: 14 }} />}
                    label="Contatos selecionados"
                    sub={`${recipients.length} disponível${recipients.length !== 1 ? "s" : ""}`}
                    onClick={() => {
                      setMode("selecionar");
                      if (selected.size === 0 && principal) {
                        setSelected(new Set([principal.id]));
                      }
                    }}
                  />
                </div>

                {/* Painel Opção 1: Principal */}
                <AnimatePresence mode="wait">
                  {mode === "principal" && (
                    <motion.div
                      key="principal"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      {principal ? (
                        <RecipientRow
                          recipient={principal}
                          channel={channel}
                          cfg={cfg}
                          checked={false}
                          hideCheckbox
                        />
                      ) : (
                        <EmptyState cfg={cfg} />
                      )}
                    </motion.div>
                  )}

                  {/* Painel Opção 2: Selecionar */}
                  {mode === "selecionar" && (
                    <motion.div
                      key="selecionar"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      {recipients.length === 0 ? (
                        <EmptyState cfg={cfg} />
                      ) : (
                        <>
                          {/* Toggle todos */}
                          <button
                            onClick={toggleAll}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "9px 14px",
                              borderRadius: 9,
                              border: `1.5px solid ${
                                allSelected ? cfg.border : "rgba(200,225,240,0.7)"
                              }`,
                              background: allSelected ? cfg.bg : "rgba(255,255,255,0.6)",
                              cursor: "pointer",
                              marginBottom: 8,
                              transition: "all 0.18s",
                            }}
                          >
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 4,
                                border: `1.5px solid ${
                                  allSelected ? cfg.color : "rgba(200,225,240,0.9)"
                                }`,
                                background: allSelected ? cfg.color : "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                transition: "all 0.18s",
                              }}
                            >
                              {allSelected && (
                                <svg
                                  width="9"
                                  height="9"
                                  viewBox="0 0 10 10"
                                  fill="none"
                                >
                                  <polyline
                                    points="2,5 4,7.5 8,2.5"
                                    stroke="#fff"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: allSelected ? cfg.color : "rgba(20,45,70,0.65)",
                              }}
                            >
                              Selecionar todos ({recipients.length})
                            </span>
                            {selected.size > 0 && !allSelected && (
                              <span
                                style={{
                                  marginLeft: "auto",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: 10,
                                  background: cfg.bg,
                                  color: cfg.color,
                                }}
                              >
                                {selected.size} selecionado
                                {selected.size !== 1 ? "s" : ""}
                              </span>
                            )}
                          </button>

                          {/* Lista de contatos */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                              maxHeight: 260,
                              overflowY: "auto",
                              paddingRight: 2,
                            }}
                          >
                            {recipients.map((r) => (
                              <RecipientRow
                                key={r.id}
                                recipient={r}
                                channel={channel}
                                cfg={cfg}
                                checked={selected.has(r.id)}
                                onToggle={() => toggle(r.id)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Divisor */}
                <div
                  style={{
                    height: 1,
                    background: "rgba(200,225,240,0.5)",
                    margin: "18px 0 16px",
                  }}
                />

                {/* Botões */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={onClose}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 10,
                      border: "1.5px solid rgba(200,225,240,0.9)",
                      background: "rgba(255,255,255,0.75)",
                      cursor: "pointer",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
                      color: "rgba(20,45,70,0.65)",
                      transition: "all 0.18s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,1)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.75)";
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    style={{
                      flex: 2,
                      height: 44,
                      borderRadius: 10,
                      border: "none",
                      cursor: canConfirm ? "pointer" : "not-allowed",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#fff",
                      background: canConfirm
                        ? `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc, ${cfg.color})`
                        : "rgba(200,220,230,0.6)",
                      backgroundSize: "200% 200%",
                      animation: canConfirm ? "gradientShift 3s ease infinite" : "none",
                      boxShadow: canConfirm
                        ? `0 4px 14px ${cfg.color}40`
                        : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      transition: "all 0.18s",
                    }}
                  >
                    <Send style={{ width: 14, height: 14 }} />
                    {mode === "principal"
                      ? `Enviar via ${cfg.label} principal`
                      : `Enviar para ${selected.size} contato${selected.size !== 1 ? "s" : ""}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Sub-componente: botão de modo ─────────────────────────────
function ModeButton({
  active,
  color,
  icon,
  label,
  sub,
  onClick,
}: {
  active: boolean;
  color: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 14px",
        borderRadius: 11,
        border: `1.5px solid ${active ? color + "50" : "rgba(200,225,240,0.8)"}`,
        background: active ? `${color}0d` : "rgba(255,255,255,0.7)",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.18s",
        boxShadow: active ? `0 0 0 3px ${color}15` : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 3,
        }}
      >
        <span style={{ color: active ? color : "rgba(20,45,70,0.4)" }}>
          {icon}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: active ? color : "rgba(20,45,70,0.55)",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 10,
          color: active ? color + "aa" : "rgba(20,45,70,0.35)",
          fontWeight: 500,
          paddingLeft: 21,
        }}
      >
        {sub}
      </div>
    </button>
  );
}

// ── Sub-componente: linha de contato ──────────────────────────
function RecipientRow({
  recipient,
  channel,
  cfg,
  checked,
  onToggle,
  hideCheckbox,
}: {
  recipient: Recipient;
  channel: SendChannel;
  cfg: (typeof CHANNEL_CONFIG)[SendChannel];
  checked: boolean;
  onToggle?: () => void;
  hideCheckbox?: boolean;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 11,
        border: `1.5px solid ${
          checked && !hideCheckbox ? cfg.border : "rgba(200,225,240,0.6)"
        }`,
        background:
          checked && !hideCheckbox ? cfg.bg : "rgba(255,255,255,0.6)",
        cursor: hideCheckbox ? "default" : "pointer",
        transition: "all 0.15s",
      }}
    >
      {/* Checkbox */}
      {!hideCheckbox && (
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            border: `1.5px solid ${checked ? cfg.color : "rgba(200,225,240,0.9)"}`,
            background: checked ? cfg.color : "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
        >
          {checked && (
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <polyline
                points="2,5 4,7.5 8,2.5"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      )}

      {/* Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: avatarColor(recipient.nome),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
        }}
      >
        {initials(recipient.nome)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#0f2133",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {recipient.nome}
          </span>
          {recipient.principal && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: 4,
                background: `${cfg.color}18`,
                color: cfg.color,
                border: `1px solid ${cfg.color}30`,
                flexShrink: 0,
              }}
            >
              PRINCIPAL
            </span>
          )}
          {recipient.decisor && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: 4,
                background: "rgba(39,174,96,0.1)",
                color: "#27ae60",
                border: "1px solid rgba(39,174,96,0.2)",
                flexShrink: 0,
              }}
            >
              Decisor
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: cfg.color,
            fontWeight: 500,
          }}
        >
          <cfg.icon style={{ width: 10, height: 10, flexShrink: 0 }} />
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {recipient.valor || (
              <span style={{ color: "rgba(20,45,70,0.35)", fontStyle: "italic" }}>
                Não informado
              </span>
            )}
          </span>
        </div>
      </div>

      {recipient.funcao && (
        <span
          style={{
            fontSize: 10,
            color: "rgba(20,45,70,0.35)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {recipient.funcao}
        </span>
      )}
    </div>
  );
}

// ── Sub-componente: estado vazio ──────────────────────────────
function EmptyState({ cfg }: { cfg: (typeof CHANNEL_CONFIG)[SendChannel] }) {
  return (
    <div
      style={{
        padding: "28px 16px",
        textAlign: "center",
        borderRadius: 12,
        border: "1.5px dashed rgba(200,225,240,0.7)",
        background: "rgba(255,255,255,0.4)",
      }}
    >
      <cfg.icon
        style={{
          width: 28,
          height: 28,
          color: `${cfg.color}40`,
          margin: "0 auto 8px",
        }}
      />
      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(20,45,70,0.4)" }}>
        Nenhum contato com {cfg.label} cadastrado
      </div>
    </div>
  );
}