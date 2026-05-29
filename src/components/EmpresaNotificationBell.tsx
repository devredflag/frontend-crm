  import { useState, useEffect, useRef, useCallback } from "react";
  import { Bell, Mail, X } from "lucide-react";

  const API = "https://backend-crm-production-157b.up.railway.app";

  interface Notif {
    notificacao_id: string;
    tipo: string;
    titulo: string;
    mensagem: string;
    platform?: string;
    empresa_id?: string;
    lida: boolean;
    criado_em: string;
    meta?: { sender_email?: string; sender_name?: string; subject?: string, conversation_id?: string,};
  }

  interface Props {
    empresaId: string;
    empresaNome?: string;
    onVerComunicacoes?: () => void;
  }

  function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)    return "agora";
    if (diff < 3600)  return `${Math.floor(diff / 60)}min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    return `${Math.floor(diff / 86400)}d atrás`;
  }

  export default function EmpresaNotificationBell({ empresaId, empresaNome, onVerComunicacoes }: Props) {
    const [notifs,  setNotifs]  = useState<Notif[]>([]);
    const [open,    setOpen]    = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const mailTabRef = useRef<Window | null>(null);

    const unread = notifs.filter(n => !n.lida).length;

    useEffect(() => {
      function handler(e: MouseEvent) {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      }
      if (open) document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const fetchNotifs = useCallback(async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${API}/notificacoes?empresa_id=${empresaId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data: Notif[] = await res.json();
          const tipos = ["email_interaction","calendar_accepted","calendar_declined","calendar_tentative"];
          setNotifs(data.filter(n => tipos.includes(n.tipo)));
        }
      } finally {
        setLoading(false);
      }
    }, [empresaId]);

    useEffect(() => {
      fetchNotifs();
      const iv = setInterval(fetchNotifs, 60_000);
      return () => clearInterval(iv);
    }, [fetchNotifs]);

    async function markRead(id: string) {
      const token = localStorage.getItem("token");
      await fetch(`${API}/notificacoes/${id}/ler`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifs(prev => prev.map(n => n.notificacao_id === id ? { ...n, lida: true } : n));
    }

    async function markAllRead() {
      await Promise.all(notifs.filter(n => !n.lida).map(n => markRead(n.notificacao_id)));
    }

    const platformLabel = (p?: string) => p === "gmail" ? "Gmail" : "Outlook";
    const platformColor = (p?: string) => p === "gmail"
      ? { bg: "rgba(231,76,60,0.08)", color: "#c0392b", border: "rgba(231,76,60,0.2)" }
      : { bg: "rgba(41,128,185,0.08)", color: "#2980b9", border: "rgba(41,128,185,0.2)" };

    return (
      <div ref={ref} style={{ position: "relative" }}>

        {/* Botão sino */}
        <button
          onClick={() => { setOpen(o => !o); if (!open) fetchNotifs(); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 10, cursor: "pointer",
            border: "1px solid rgba(200,225,240,0.9)",
            background: open ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)",
            position: "relative", transition: "all 0.15s",
          }}
        >
          <Bell style={{ width: 15, height: 15, color: unread > 0 ? "#2980b9" : "rgba(20,45,70,0.4)" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(20,45,70,0.6)" }}>
            Interações
          </span>
          {unread > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              width: 18, height: 18, borderRadius: "50%",
              background: "#e74c3c", color: "#fff",
              fontSize: 10, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid rgba(210,238,248,0.9)",
            }}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 340, borderRadius: 14, zIndex: 300,
            background: "rgba(240,250,255,0.98)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(200,225,240,0.9)",
            boxShadow: "0 12px 48px rgba(41,128,185,0.18)",
            overflow: "hidden",
          }}>

            {/* Header */}
            <div style={{
              padding: "12px 16px", display: "flex",
              alignItems: "center", justifyContent: "space-between",
              borderBottom: "1px solid rgba(200,225,240,0.5)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Bell style={{ width: 13, height: 13, color: "#2980b9" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f2133" }}>
                  Interações por e-mail
                </span>
              </div>
              {unread > 0 && (
                <button onClick={markAllRead} style={{
                  fontSize: 11, fontWeight: 600, color: "#2980b9",
                  background: "none", border: "none", cursor: "pointer",
                }}>
                  Marcar todas lidas
                </button>
              )}
            </div>

            {/* Lista */}
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {loading && (
                <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13,
                  color: "rgba(20,45,70,0.4)" }}>
                  Carregando...
                </div>
              )}

              {!loading && notifs.length === 0 && (
                <div style={{ padding: "32px 16px", textAlign: "center" }}>
                  <Mail style={{ width: 28, height: 28, color: "rgba(41,128,185,0.2)",
                    margin: "0 auto 10px" }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(20,45,70,0.4)" }}>
                    Nenhuma interação detectada
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(20,45,70,0.35)", marginTop: 4 }}>
                    Quando {empresaNome || "este cliente"} responder<br/>
                    um e-mail, aparece aqui automaticamente.
                  </p>
                </div>
              )}

              {!loading && notifs.map(n => {
                const pc = platformColor(n.platform);
                return (
                  <div
                    key={n.notificacao_id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      markRead(n.notificacao_id);
                      setOpen(false);

                      if (n.tipo === "email_interaction") {
                      const id =
                      n.meta?.conversation_id || "";

                      const senderEmail =
                      n.meta?.sender_email || "";

                      const subject =
                      n.meta?.subject || "";

                      const isGmail =
                      n.platform === "gmail";

                      //inicia aqui
                      let targetUrl = "";
                      if (id) {
                        targetUrl = isGmail
                          ? `https://mail.google.com/mail/u/0/#inbox/${id}`
                          : `https://outlook.office.com/mail/inbox/id/${id}`;
                      } else {
                        const busca = `${senderEmail} ${subject}`;

                        targetUrl = isGmail
                          ? `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(busca)}`
                          : `https://outlook.office.com/mail/search?q=${encodeURIComponent(busca)}`;
                      }

                      // reutiliza aba existente
                      if (
                        mailTabRef.current &&
                        !mailTabRef.current.closed
                      ) {
                        mailTabRef.current.location.replace(
                          targetUrl
                        );

                        mailTabRef.current.focus();
                      } else {
                        mailTabRef.current = window.open(
                          "",
                          "crm_mail_tab"
                        );

                        if (mailTabRef.current) {
                          mailTabRef.current.location.href =
                            targetUrl;

                          mailTabRef.current.focus();
                        }
                      }

                      return;
                  }

                      onVerComunicacoes?.();
                  }}
                    style={{
                      padding: "11px 16px", cursor: "pointer",
                      borderBottom: "1px solid rgba(200,225,240,0.3)",
                      background: n.lida ? "transparent" : "rgba(41,128,185,0.04)",
                      display: "flex", gap: 10, alignItems: "flex-start",
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: pc.bg, border: `1px solid ${pc.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Mail style={{ width: 13, height: 13, color: pc.color }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "flex-start", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: n.lida ? 500 : 700,
                          color: "#0f2133", lineHeight: 1.4 }}>
                          {n.titulo}
                        </span>
                        <span style={{ fontSize: 10, color: "rgba(20,45,70,0.4)",
                          flexShrink: 0 }}>
                          {timeAgo(n.criado_em)}
                        </span>
                      </div>
                      <p style={{ margin: "3px 0 5px", fontSize: 11,
                        color: "rgba(20,45,70,0.55)", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.mensagem}
                      </p>
                      {n.meta?.subject && (
                        <p style={{ margin: "0 0 4px", fontSize: 11, fontStyle: "italic",
                          color: "rgba(20,45,70,0.4)", overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {n.meta.subject}
                        </p>
                      )}
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "1px 7px",
                        borderRadius: 10, background: pc.bg, color: pc.color,
                      }}>
                        {platformLabel(n.platform)}
                      </span>
                      {!n.lida && (
                        <span style={{
                          display: "inline-block", marginLeft: 6,
                          width: 6, height: 6, borderRadius: "50%",
                          background: "#e74c3c", verticalAlign: "middle",
                        }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            {notifs.length > 0 && (
              <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(200,225,240,0.4)",
                textAlign: "center" }}>
                <button
                  onClick={() => { setOpen(false); onVerComunicacoes?.(); }}
                  style={{ fontSize: 12, fontWeight: 600, color: "#2980b9",
                    background: "none", border: "none", cursor: "pointer" }}
                >
                  Ver todas as comunicações →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }