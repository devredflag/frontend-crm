import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../services/auth";

const API = "https://backend-crm-production-157b.up.railway.app";

// Card de identificação do usuário logado, usado no rodapé da sidebar de TODAS
// as páginas autenticadas. Existe em um lugar só: cada página monta a própria
// sidebar (herança do projeto), mas o card em si não é copiado — é este
// componente. Nome, função e iniciais vêm sempre do usuário real (GET /me);
// nada aqui é hardcoded.

export interface UsuarioCard {
  nome?: string;
  email?: string;
  role?: string;
  funcao?: string;
  cargo?: string;
  is_gerente?: boolean;
  is_supervisor?: boolean;
}

// Rótulo da função como o usuário final lê. O backend já manda `funcao` pronta
// em /me; o mapa cobre respostas antigas em cache e chamadas que só têm `role`.
const ROTULO_FUNCAO: Record<string, string> = {
  gerente: "Gerente",
  supervisor: "Supervisor",
  vendedor: "Vendedor",
};

export function funcaoDoUsuario(u?: UsuarioCard | null): string {
  if (!u) return "";
  if (u.funcao) return u.funcao;
  if (u.role && ROTULO_FUNCAO[u.role]) return ROTULO_FUNCAO[u.role];
  if (u.is_gerente) return "Gerente";
  if (u.is_supervisor) return "Supervisor";
  return "Vendedor";
}

export function initials(n?: string) {
  return n?.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
}

export function avatarColor(n?: string) {
  const c = ["#2563EB", "#2563EB", "#5B6570", "#8A5A00", "#0F7B4F", "#B42318"];
  return c[(n?.charCodeAt(0) || 0) % c.length];
}

// Cache de módulo: várias páginas já buscam /me por conta própria e passam o
// usuário via prop. Quando não passam, o card busca sozinho — e uma vez só por
// carregamento da aba, para não repetir a chamada a cada navegação.
let cacheMe: UsuarioCard | null = null;
let promessaMe: Promise<UsuarioCard | null> | null = null;

function carregarMe(): Promise<UsuarioCard | null> {
  if (cacheMe) return Promise.resolve(cacheMe);
  if (!promessaMe) {
    promessaMe = fetch(`${API}/me`, { headers: { Authorization: `Bearer ${getToken() || ""}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { cacheMe = d; return d; })
      .catch(() => null)
      .finally(() => { promessaMe = null; });
  }
  return promessaMe;
}

export default function CardUsuario({
  usuario,
  compacto = false,
}: {
  /** Usuário já carregado pela página. Se omitido, o card busca em /me. */
  usuario?: UsuarioCard | null;
  /** Versão reduzida, para drawers/menus estreitos. */
  compacto?: boolean;
}) {
  const navigate = useNavigate();
  const [proprio, setProprio] = useState<UsuarioCard | null>(cacheMe);

  useEffect(() => {
    if (usuario) return;                 // a página já forneceu os dados
    let vivo = true;
    carregarMe().then(d => { if (vivo && d) setProprio(d); });
    return () => { vivo = false; };
  }, [usuario]);

  const u = usuario || proprio;
  const nome = u?.nome || "";
  const funcao = funcaoDoUsuario(u);
  const carregando = !u;

  return (
    <button
      type="button"
      onClick={() => navigate("/perfil")}
      aria-label={nome ? `Abrir perfil de ${nome} — ${funcao}` : "Abrir perfil"}
      style={{
        marginTop: 16, padding: compacto ? "9px 10px" : 12, width: "100%",
        borderRadius: 8, background: "#ffffff",
        border: "1px solid #ffffff", display: "flex",
        alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left",
        fontFamily: "inherit", transition: "background 0.18s, border-color 0.18s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "#ffffff"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; }}
      onFocus={e => { e.currentTarget.style.borderColor = "rgba(26,188,156,0.7)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "#ffffff"; }}
    >
      <div
        aria-hidden
        style={{
          width: compacto ? 30 : 34, height: compacto ? 30 : 34, borderRadius: "50%",
          background: `${avatarColor(nome)}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
        }}
      >
        {carregando ? "…" : initials(nome)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {carregando ? "Carregando…" : nome || "Meu perfil"}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {carregando ? "" : funcao}
        </div>
      </div>
    </button>
  );
}
