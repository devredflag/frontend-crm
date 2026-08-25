// =========================================================================
// Autenticação — token de acesso em MEMÓRIA (nunca em localStorage/sessionStorage,
// que são vulneráveis a XSS). O refresh token fica em cookie httpOnly gerenciado
// pelo backend; ao carregar a página, restauramos a sessão via /refresh.
// =========================================================================

export const API_BASE = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

let accessToken: string | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getToken(): string {
  return accessToken || "";
}

export function isAuthenticated(): boolean {
  return !!accessToken;
}

/** Cabeçalhos de autorização para as chamadas à API. */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
    ...(extra || {}),
  };
}

type LoginResult =
  | { ok: true }
  | { ok: false; mfaRequired: true }
  | { ok: false; mfaRequired: false; error: string };

/** Faz login. Se a conta tiver MFA, retorna mfaRequired para pedir o código. */
export async function login(email: string, senha: string, mfaCode?: string): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // necessário para receber o cookie de refresh
    body: JSON.stringify({ email, senha, mfa_code: mfaCode || null }),
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    /* corpo vazio */
  }

  if (res.ok && data?.mfa_required) {
    return { ok: false, mfaRequired: true };
  }
  if (res.ok && data?.access_token) {
    setAccessToken(data.access_token);
    startAutoRefresh();
    return { ok: true };
  }
  return {
    ok: false,
    mfaRequired: false,
    error: data?.detail || "E-mail ou senha inválidos.",
  };
}

/** Restaura a sessão a partir do cookie httpOnly. Retorna true se conseguiu. */
export async function refresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      setAccessToken(null);
      return false;
    }
    const data = await res.json();
    if (data?.access_token) {
      setAccessToken(data.access_token);
      startAutoRefresh();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Chamado uma vez no boot do app (App.tsx) antes de renderizar rotas protegidas. */
export async function bootstrapAuth(): Promise<boolean> {
  if (accessToken) return true;
  return refresh();
}

/** Mantém o access token (30 min) renovado enquanto a aba estiver aberta. */
export function startAutoRefresh() {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => {
    refresh();
  }, 25 * 60 * 1000); // 25 min
}

export async function logout() {
  try {
    await fetch(`${API_BASE}/logout`, { method: "POST", credentials: "include" });
  } catch {
    /* ignora */
  }
  setAccessToken(null);
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
