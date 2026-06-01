export interface CommPrefs {
  emailProvider?: "gmail" | "outlook";
  outlookMode?: "web" | "app" | null;
  whatsappMode?: "web" | "app" | null;
  notifPrefs?: {
    rascunho_aviso: boolean;
    rascunho_excluido: boolean;
    email_interaction: boolean;
    calendar_accepted: boolean;
    calendar_declined: boolean;
    visita_lembrete: boolean;
  };
}

export function getCommPrefs(): CommPrefs {
  try {
    const s = localStorage.getItem("crm_comm_prefs");
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}

// Referência global para reutilizar a aba de e-mail
const mailTab: { ref: Window | null } = { ref: null };

export function openEmail(email: string, forceProvider?: "gmail" | "outlook") {
  const prefs = getCommPrefs();
  const provider = forceProvider || prefs.emailProvider || "outlook";
  const outlookMode = prefs.outlookMode || "web";

  let url = "";
  if (provider === "gmail") {
    url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
  } else if (outlookMode === "app") {
    window.location.href = `mailto:${email}`;
    return;
  } else {
    url = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(email)}`;
  }

  if (mailTab.ref && !mailTab.ref.closed) {
    mailTab.ref.location.href = url;
    mailTab.ref.focus();
  } else {
    mailTab.ref = window.open(url, "crm_mail_tab");
    mailTab.ref?.focus();
  }
}

export function openWhatsApp(phone: string) {
  const prefs = getCommPrefs();
  const mode = prefs.whatsappMode || "web";
  const digits = phone.replace(/\D/g, "");
  if (mode === "app") {
    window.open(`whatsapp://send?phone=${digits}`);
  } else {
    window.open(`https://wa.me/${digits}`, "_blank");
  }
}

export function isNotifEnabled(tipo: string): boolean {
  const prefs = getCommPrefs();
  const n = prefs.notifPrefs;
  if (!n) return true;
  return tipo in n ? (n as Record<string, boolean>)[tipo] : true;
}
