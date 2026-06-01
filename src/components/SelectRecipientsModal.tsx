// src/components/SelectRecipientsModal.tsx
import { useState, useMemo, useEffect } from "react";
import { getCommPrefs } from "../utils/commPrefs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Phone, MessageCircle, Link2,
  Send, X, User, Users, ChevronLeft,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────
export type SendChannel = "email" | "whatsapp" | "telefone" | "linkedin";
export type EmailProvider = "outlook" | "gmail";

export interface Recipient {
  id: string;
  nome: string;
  funcao?: string;
  valor: string;
  principal?: boolean;
  decisor?: boolean;
}

interface SelectRecipientsModalProps {
  open: boolean;
  channel: SendChannel;
  recipients: Recipient[];
  onConfirm: (selected: Recipient[], provider?: EmailProvider) => void;
  onClose: () => void;
}

// ── Config por canal ───────────────────────────────────────────
const CHANNEL_CONFIG = {
  email:    { label:"E-mail",    color:"#2980b9", bg:"rgba(41,128,185,0.08)",  border:"rgba(41,128,185,0.25)",  icon:Mail          },
  whatsapp: { label:"WhatsApp",  color:"#27ae60", bg:"rgba(39,174,96,0.08)",   border:"rgba(39,174,96,0.25)",   icon:MessageCircle },
  telefone: { label:"Telefone",  color:"#e67e22", bg:"rgba(230,126,34,0.08)",  border:"rgba(230,126,34,0.25)",  icon:Phone         },
  linkedin: { label:"LinkedIn",  color:"#0077b5", bg:"rgba(0,119,181,0.08)",   border:"rgba(0,119,181,0.25)",   icon:Link2         },
} as const;

const API = "https://backend-crm-production-157b.up.railway.app";

const gradientShift = `
  @keyframes gradientShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
`;

function avatarColor(n: string) {
  const c = ["#2980b9","#1abc9c","#8e44ad","#e67e22","#27ae60","#e74c3c"];
  return c[(n?.charCodeAt(0)||0) % c.length];
}
function initials(n: string) {
  return n?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() || "?";
}

type Step = "provider" | "recipients";
type Mode = "principal" | "selecionar";

// ── Modal principal ────────────────────────────────────────────
export default function SelectRecipientsModal({
  open, channel, recipients, onConfirm, onClose,
}: SelectRecipientsModalProps) {
  const cfg = CHANNEL_CONFIG[channel];
  const Icon = cfg.icon;

  // provider state
  const [step, setStep]               = useState<Step>("recipients");
  const [provider, setProvider]       = useState<EmailProvider>("outlook");
  const [outlookOk, setOutlookOk]     = useState(false);
  const [gmailOk, setGmailOk]         = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);

  // recipients state
  const [mode, setMode]       = useState<Mode>("principal");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const principal = useMemo(
    () => recipients.find(r => r.principal) || recipients[0],
    [recipients]
  );
  const allSelected = selected.size === recipients.length && recipients.length > 0;

  // Ao abrir: reset e verifica provedores se for email
  useEffect(() => {
    if (!open) return;
    setMode("principal");
    setSelected(new Set());

    if (channel !== "email") {
      setStep("recipients");
      return;
    }

    setCheckingAuth(true);
    const token = localStorage.getItem("token") || "";
    const h = { Authorization: `Bearer ${token}` };

    // Se usuário já tem um provider salvo nas preferências, usa direto
    const savedProvider = getCommPrefs().emailProvider;

    Promise.all([
      fetch(`${API}/auth/outlook/status`, { headers: h }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/auth/google/status`,  { headers: h }).then(r => r.json()).catch(() => ({})),
    ]).then(([o, g]) => {
      const hasOutlook = !!o?.conectado;
      const hasGmail   = !!g?.conectado;
      setOutlookOk(hasOutlook);
      setGmailOk(hasGmail);
      setCheckingAuth(false);

      if (savedProvider && ((savedProvider === "gmail" && hasGmail) || (savedProvider === "outlook" && hasOutlook))) {
        // preferência salva e provedor conectado → pula seleção
        setProvider(savedProvider);
        setStep("recipients");
      } else if (hasOutlook && hasGmail) {
        // ambos conectados, sem preferência → mostra seleção
        setStep("provider");
      } else {
        // só um ou nenhum conectado → define automaticamente
        setProvider(hasGmail && !hasOutlook ? "gmail" : "outlook");
        setStep("recipients");
      }
    });
  }, [open, channel]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setAllSelected(allSelected ? new Set() : new Set(recipients.map(r => r.id)));
  };
  const setAllSelected = (s: Set<string>) => setSelected(s);

  const canConfirm = mode === "principal" ? !!principal : selected.size > 0;

  const handleConfirm = () => {
    const chosenProvider = channel === "email" ? provider : undefined;
    if (mode === "principal") {
      if (principal) onConfirm([principal], chosenProvider);
    } else {
      const list = recipients.filter(r => selected.has(r.id));
      if (list.length > 0) onConfirm(list, chosenProvider);
    }
  };

  const handleProviderSelect = (p: EmailProvider) => {
    setProvider(p);
    setStep("recipients");
  };

  const accentColor = channel === "email" && step === "provider"
    ? (provider === "gmail" ? "#EA4335" : "#0078d4")
    : cfg.color;

  return (
    <AnimatePresence>
      {open && (
        <>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
            * { font-family:'Plus Jakarta Sans',sans-serif; box-sizing:border-box; }
            ${gradientShift}
          `}</style>

          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={onClose}
            style={{
              position:"fixed", inset:0, zIndex:9999,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:"rgba(10,31,51,0.4)", backdropFilter:"blur(6px)",
            }}
          >
            <motion.div
              initial={{ scale:0.88, opacity:0, y:24 }}
              animate={{ scale:1, opacity:1, y:0 }}
              exit={{ scale:0.92, opacity:0, y:14 }}
              transition={{ duration:0.24, ease:[0.4,0,0.2,1] }}
              onClick={e => e.stopPropagation()}
              style={{
                width:480, maxHeight:"90vh",
                background:"rgba(248,252,255,0.97)",
                backdropFilter:"blur(24px)",
                borderRadius:20,
                border:`1.5px solid ${cfg.border}`,
                boxShadow:`0 28px 72px rgba(10,31,51,0.24)`,
                overflow:"hidden", position:"relative",
              }}
            >
              {/* Barra topo colorida */}
              <div style={{
                height:4,
                background:`linear-gradient(90deg,${accentColor},${accentColor}aa,${accentColor})`,
                backgroundSize:"200% 100%",
                animation:"gradientShift 3s ease infinite",
              }}/>

              {/* Fechar */}
              <button onClick={onClose} style={{
                position:"absolute", top:16, right:16,
                width:28, height:28, borderRadius:8,
                border:"1px solid rgba(200,225,240,0.7)",
                background:"rgba(255,255,255,0.8)",
                cursor:"pointer", display:"flex",
                alignItems:"center", justifyContent:"center",
                color:"rgba(20,45,70,0.4)", zIndex:2, transition:"all 0.18s",
              }}
                onMouseEnter={e => (e.currentTarget.style.color="#e74c3c")}
                onMouseLeave={e => (e.currentTarget.style.color="rgba(20,45,70,0.4)")}
              >
                <X style={{ width:13, height:13 }}/>
              </button>

              <div style={{ padding:"24px 24px 20px", overflowY:"auto", maxHeight:"calc(90vh - 4px)" }}>

                {/* ── STEP: loading auth ── */}
                {channel === "email" && checkingAuth && (
                  <div style={{ padding:"40px 0", textAlign:"center" }}>
                    <div style={{ width:36, height:36, border:`3px solid rgba(41,128,185,0.15)`, borderTop:`3px solid #2980b9`, borderRadius:"50%", margin:"0 auto 16px", animation:"spin 0.8s linear infinite" }}/>
                    <div style={{ fontSize:13, fontWeight:600, color:"rgba(20,45,70,0.5)" }}>Verificando provedores...</div>
                    <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
                  </div>
                )}

                {/* ── STEP: escolher provedor ── */}
                <AnimatePresence mode="wait">
                  {!checkingAuth && step === "provider" && (
                    <motion.div key="provider"
                      initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
                      exit={{ opacity:0, x:-20 }} transition={{ duration:0.2 }}
                    >
                      {/* Header */}
                      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
                        <div style={{
                          width:44, height:44, borderRadius:13,
                          background:cfg.bg, border:`1.5px solid ${cfg.border}`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                        }}>
                          <Icon style={{ width:20, height:20, color:cfg.color }}/>
                        </div>
                        <div>
                          <div style={{ fontSize:16, fontWeight:800, color:"#0f2133", letterSpacing:"-0.02em" }}>
                            Enviar e-mail
                          </div>
                          <div style={{ fontSize:12, color:"rgba(20,45,70,0.5)" }}>
                            Escolha o provedor de e-mail
                          </div>
                        </div>
                      </div>

                      {/* Opção Outlook */}
                      <ProviderButton
                        name="Outlook"
                        subtitle="Microsoft Outlook"
                        color="#0078d4"
                        bgColor="rgba(0,120,212,0.06)"
                        borderColor="rgba(0,120,212,0.2)"
                        hoverBg="rgba(0,120,212,0.1)"
                        hoverBorder="rgba(0,120,212,0.4)"
                        icon={<OutlookIcon/>}
                        onClick={() => handleProviderSelect("outlook")}
                      />

                      <div style={{ height:10 }}/>

                      {/* Opção Gmail */}
                      <ProviderButton
                        name="Gmail"
                        subtitle="Google Gmail"
                        color="#EA4335"
                        bgColor="rgba(234,67,53,0.06)"
                        borderColor="rgba(234,67,53,0.2)"
                        hoverBg="rgba(234,67,53,0.1)"
                        hoverBorder="rgba(234,67,53,0.4)"
                        icon={<GmailIcon/>}
                        onClick={() => handleProviderSelect("gmail")}
                      />
                    </motion.div>
                  )}

                  {/* ── STEP: destinatários ── */}
                  {!checkingAuth && step === "recipients" && (
                    <motion.div key="recipients"
                      initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
                      exit={{ opacity:0, x:-20 }} transition={{ duration:0.2 }}
                    >
                      {/* Header */}
                      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                        {/* Botão voltar só aparece se ambos estiverem conectados */}
                        {channel === "email" && outlookOk && gmailOk && (
                          <button onClick={() => setStep("provider")} style={{
                            width:32, height:32, borderRadius:9,
                            border:"1px solid rgba(200,225,240,0.9)",
                            background:"rgba(255,255,255,0.8)",
                            cursor:"pointer", display:"flex",
                            alignItems:"center", justifyContent:"center",
                            flexShrink:0, transition:"all 0.15s",
                          }}
                            onMouseEnter={e => (e.currentTarget.style.background="rgba(255,255,255,1)")}
                            onMouseLeave={e => (e.currentTarget.style.background="rgba(255,255,255,0.8)")}
                          >
                            <ChevronLeft style={{ width:14, height:14, color:"rgba(20,45,70,0.5)" }}/>
                          </button>
                        )}

                        <div style={{
                          width:44, height:44, borderRadius:13,
                          background: channel === "email"
                            ? (provider === "gmail" ? "rgba(234,67,53,0.08)" : "rgba(0,120,212,0.08)")
                            : cfg.bg,
                          border:`1.5px solid ${channel === "email"
                            ? (provider === "gmail" ? "rgba(234,67,53,0.25)" : "rgba(0,120,212,0.25)")
                            : cfg.border}`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          flexShrink:0,
                        }}>
                          {channel === "email"
                            ? (provider === "gmail"
                                ? <GmailIcon size={20}/>
                                : <OutlookIcon size={20}/>)
                            : <Icon style={{ width:20, height:20, color:cfg.color }}/>
                          }
                        </div>

                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:16, fontWeight:800, color:"#0f2133", letterSpacing:"-0.02em" }}>
                            {channel === "email"
                              ? `Enviar via ${provider === "gmail" ? "Gmail" : "Outlook"}`
                              : `Enviar via ${cfg.label}`}
                          </div>
                          <div style={{ fontSize:12, color:"rgba(20,45,70,0.5)" }}>
                            Escolha para quem deseja enviar
                          </div>
                        </div>
                      </div>

                      {/* Modos */}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:18 }}>
                        <ModeButton
                          active={mode === "principal"}
                          color={channel === "email"
                            ? (provider === "gmail" ? "#EA4335" : "#0078d4")
                            : cfg.color}
                          icon={<User style={{ width:14, height:14 }}/>}
                          label={`${cfg.label} principal`}
                          sub="Contato 1"
                          onClick={() => setMode("principal")}
                        />
                        <ModeButton
                          active={mode === "selecionar"}
                          color={channel === "email"
                            ? (provider === "gmail" ? "#EA4335" : "#0078d4")
                            : cfg.color}
                          icon={<Users style={{ width:14, height:14 }}/>}
                          label="Contatos selecionados"
                          sub={`${recipients.length} disponível${recipients.length !== 1 ? "s" : ""}`}
                          onClick={() => {
                            setMode("selecionar");
                            if (selected.size === 0 && principal)
                              setSelected(new Set([principal.id]));
                          }}
                        />
                      </div>

                      {/* Lista */}
                      <AnimatePresence mode="wait">
                        {mode === "principal" && (
                          <motion.div key="p"
                            initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                            exit={{ opacity:0, y:-6 }} transition={{ duration:0.18 }}
                          >
                            {principal
                              ? <RecipientRow recipient={principal} cfg={cfg} checked={false} hideCheckbox/>
                              : <EmptyState cfg={cfg}/>}
                          </motion.div>
                        )}
                        {mode === "selecionar" && (
                          <motion.div key="s"
                            initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                            exit={{ opacity:0, y:-6 }} transition={{ duration:0.18 }}
                          >
                            {recipients.length === 0 ? <EmptyState cfg={cfg}/> : (
                              <>
                                {/* Toggle todos */}
                                <button onClick={toggleAll} style={{
                                  width:"100%", display:"flex", alignItems:"center", gap:8,
                                  padding:"9px 14px", borderRadius:9, marginBottom:8,
                                  border:`1.5px solid ${allSelected ? cfg.border : "rgba(200,225,240,0.7)"}`,
                                  background:allSelected ? cfg.bg : "rgba(255,255,255,0.6)",
                                  cursor:"pointer", transition:"all 0.18s",
                                }}>
                                  <Checkbox checked={allSelected} color={cfg.color}/>
                                  <span style={{ fontSize:12, fontWeight:700, color:allSelected ? cfg.color : "rgba(20,45,70,0.65)" }}>
                                    Selecionar todos ({recipients.length})
                                  </span>
                                  {selected.size > 0 && !allSelected && (
                                    <span style={{ marginLeft:"auto", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10, background:cfg.bg, color:cfg.color }}>
                                      {selected.size} selecionado{selected.size !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </button>
                                <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:240, overflowY:"auto", paddingRight:2 }}>
                                  {recipients.map(r => (
                                    <RecipientRow key={r.id} recipient={r} cfg={cfg}
                                      checked={selected.has(r.id)} onToggle={() => toggle(r.id)}/>
                                  ))}
                                </div>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Divisor + botões */}
                      <div style={{ height:1, background:"rgba(200,225,240,0.5)", margin:"18px 0 16px" }}/>
                      <div style={{ display:"flex", gap:10 }}>
                        <button onClick={onClose} style={{
                          flex:1, height:44, borderRadius:10,
                          border:"1.5px solid rgba(200,225,240,0.9)",
                          background:"rgba(255,255,255,0.75)",
                          cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif",
                          fontWeight:600, fontSize:13, color:"rgba(20,45,70,0.65)",
                        }}>Cancelar</button>
                        <button onClick={handleConfirm} disabled={!canConfirm} style={{
                          flex:2, height:44, borderRadius:10, border:"none",
                          cursor:canConfirm ? "pointer" : "not-allowed",
                          fontFamily:"'Plus Jakarta Sans',sans-serif",
                          fontWeight:700, fontSize:13, color:"#fff",
                          background:canConfirm
                            ? `linear-gradient(135deg,${accentColor},${accentColor}cc,${accentColor})`
                            : "rgba(200,220,230,0.6)",
                          backgroundSize:"200% 200%",
                          animation:canConfirm ? "gradientShift 3s ease infinite" : "none",
                          boxShadow:canConfirm ? `0 4px 14px ${accentColor}40` : "none",
                          display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                          transition:"all 0.18s",
                        }}>
                          <Send style={{ width:14, height:14 }}/>
                          {mode === "principal"
                            ? `Enviar via ${cfg.label} principal`
                            : `Enviar para ${selected.size} contato${selected.size !== 1 ? "s" : ""}`}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── ProviderButton ─────────────────────────────────────────────
function ProviderButton({ name, subtitle, color, bgColor, borderColor, hoverBg, hoverBorder, icon, onClick }: {
  name: string; subtitle: string; color: string;
  bgColor: string; borderColor: string; hoverBg: string; hoverBorder: string;
  icon: React.ReactNode; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      style={{
        width:"100%", display:"flex", alignItems:"center", gap:14,
        padding:"16px 18px", borderRadius:13,
        border:`1.5px solid ${borderColor}`,
        background:bgColor, cursor:"pointer", transition:"all 0.18s", textAlign:"left",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = hoverBg;
        e.currentTarget.style.borderColor = hoverBorder;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = bgColor;
        e.currentTarget.style.borderColor = borderColor;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{
        width:44, height:44, borderRadius:11,
        background:color, display:"flex",
        alignItems:"center", justifyContent:"center", flexShrink:0,
      }}>
        {icon}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#0f2133" }}>{name}</div>
        <div style={{ fontSize:11, color:"rgba(20,45,70,0.5)", marginTop:2 }}>{subtitle}</div>
      </div>
      <div style={{
        fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:6,
        background:`${color}18`, color,
      }}>
        Conectado
      </div>
    </button>
  );
}

// ── Ícones ─────────────────────────────────────────────────────
function OutlookIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <rect x="1" y="5" width="20" height="13" rx="2" fill="white" fillOpacity="0.9"/>
      <path d="M1 8l10 6 10-6" stroke="#0078d4" strokeWidth="1.5"/>
    </svg>
  );
}
function GmailIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <rect x="1" y="5" width="20" height="13" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
      <path d="M1 8l10 6 10-6" stroke="white" strokeWidth="1.5"/>
    </svg>
  );
}

// ── Checkbox ───────────────────────────────────────────────────
function Checkbox({ checked, color }: { checked: boolean; color: string }) {
  return (
    <div style={{
      width:16, height:16, borderRadius:4, flexShrink:0, transition:"all 0.15s",
      border:`1.5px solid ${checked ? color : "rgba(200,225,240,0.9)"}`,
      background:checked ? color : "#fff",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      {checked && (
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <polyline points="2,5 4,7.5 8,2.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}

// ── RecipientRow ───────────────────────────────────────────────
function RecipientRow({ recipient, cfg, checked, onToggle, hideCheckbox }: {
  recipient: Recipient;
  cfg: typeof CHANNEL_CONFIG[SendChannel];
  checked: boolean; onToggle?: () => void; hideCheckbox?: boolean;
}) {
  return (
    <div onClick={onToggle} style={{
      display:"flex", alignItems:"center", gap:10,
      padding:"10px 14px", borderRadius:11, transition:"all 0.15s",
      border:`1.5px solid ${checked && !hideCheckbox ? cfg.border : "rgba(200,225,240,0.6)"}`,
      background:checked && !hideCheckbox ? cfg.bg : "rgba(255,255,255,0.6)",
      cursor:hideCheckbox ? "default" : "pointer",
    }}>
      {!hideCheckbox && <Checkbox checked={checked} color={cfg.color}/>}
      <div style={{ width:32, height:32, borderRadius:"50%", background:avatarColor(recipient.nome), display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>
        {initials(recipient.nome)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
          <span style={{ fontSize:12, fontWeight:700, color:"#0f2133", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{recipient.nome}</span>
          {recipient.principal && (
            <span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:4, background:`${cfg.color}18`, color:cfg.color, border:`1px solid ${cfg.color}30`, flexShrink:0 }}>PRINCIPAL</span>
          )}
          {recipient.decisor && (
            <span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:4, background:"rgba(39,174,96,0.1)", color:"#27ae60", border:"1px solid rgba(39,174,96,0.2)", flexShrink:0 }}>Decisor</span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:cfg.color, fontWeight:500 }}>
          <cfg.icon style={{ width:10, height:10, flexShrink:0 }}/>
          <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {recipient.valor || <span style={{ color:"rgba(20,45,70,0.35)", fontStyle:"italic" }}>Não informado</span>}
          </span>
        </div>
      </div>
      {recipient.funcao && (
        <span style={{ fontSize:10, color:"rgba(20,45,70,0.35)", whiteSpace:"nowrap", flexShrink:0 }}>{recipient.funcao}</span>
      )}
    </div>
  );
}

// ── ModeButton ─────────────────────────────────────────────────
function ModeButton({ active, color, icon, label, sub, onClick }: {
  active: boolean; color: string; icon: React.ReactNode;
  label: string; sub: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      padding:"12px 14px", borderRadius:11, textAlign:"left", transition:"all 0.18s",
      border:`1.5px solid ${active ? color+"50" : "rgba(200,225,240,0.8)"}`,
      background:active ? `${color}0d` : "rgba(255,255,255,0.7)",
      cursor:"pointer",
      boxShadow:active ? `0 0 0 3px ${color}15` : "none",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
        <span style={{ color:active ? color : "rgba(20,45,70,0.4)" }}>{icon}</span>
        <span style={{ fontSize:12, fontWeight:700, color:active ? color : "rgba(20,45,70,0.55)" }}>{label}</span>
      </div>
      <div style={{ fontSize:10, color:active ? color+"aa" : "rgba(20,45,70,0.35)", fontWeight:500, paddingLeft:21 }}>{sub}</div>
    </button>
  );
}

// ── EmptyState ─────────────────────────────────────────────────
function EmptyState({ cfg }: { cfg: typeof CHANNEL_CONFIG[SendChannel] }) {
  return (
    <div style={{ padding:"28px 16px", textAlign:"center", borderRadius:12, border:"1.5px dashed rgba(200,225,240,0.7)", background:"rgba(255,255,255,0.4)" }}>
      <cfg.icon style={{ width:28, height:28, color:`${cfg.color}40`, margin:"0 auto 8px" }}/>
      <div style={{ fontSize:12, fontWeight:600, color:"rgba(20,45,70,0.4)" }}>
        Nenhum contato com {cfg.label} cadastrado
      </div>
    </div>
  );
}