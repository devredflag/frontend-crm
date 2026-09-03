import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../services/auth";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

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
  /** Plano da assinatura (GET /me). Informativo — quem decide é `recursos`. */
  plano?: string;
  /** Recursos liberados pelo plano, já resolvidos pelo backend. */
  recursos?: string[];
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

/**
 * Único ponto da UI que decide se um recurso pago aparece.
 *
 * Existe para que "Insights é pago" não vire `if (plano === 'x')` espalhado por
 * tela: o backend resolve o pacote e manda a lista pronta em /me, e aqui só se
 * pergunta pelo nome do recurso.
 *
 * FAIL-OPEN de propósito: `recursos` ausente significa backend atrás num deploy
 * (o campo é novo), não plano restrito. Esconder a tela nesse caso tiraria o
 * Insights do gerente durante a janela entre os dois deploys. O bloqueio de
 * verdade é server side — ver exigir_recurso() no main.py.
 */
export function temRecurso(u: UsuarioCard | null | undefined, nome: string): boolean {
  if (!u || !Array.isArray(u.recursos)) return true;
  return u.recursos.includes(nome);
}

/**
 * Quem enxerga a tela de Insights.
 *
 * Regra em UM lugar de propósito: a sidebar é remontada dentro de cada página
 * (herança do projeto), e antes disso a condição estava copiada em 12 arquivos
 * — com a checagem de plano em apenas um deles, o que já era divergência.
 *
 * Gerente e supervisor: os dois definem meta, cada um no seu escopo. O
 * supervisor vê só o próprio ramo, e quem recorta isso é o backend
 * (`escopo_vendedores`), não esta função.
 */
export function podeVerInsights(u?: UsuarioCard | null): boolean {
  return !!(u?.is_gerente || u?.is_supervisor) && temRecurso(u, "insights");
}

export function initials(n?: string) {
  return n?.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
}

export function avatarColor(n?: string) {
  const c = ["#9FD3EA", "#83DDA8", "#C9B6E4", "#F2C879", "#83DDA8", "#F7B8B1"];
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

/**
 * Usuario logado, do MESMO cache de modulo que o card usa.
 *
 * Existe para as sidebars decidirem o que mostrar por funcao (hoje: Insights, so
 * do gerente) sem cada pagina ter que buscar /me por conta propria -- varias nem
 * buscam. `carregarMe` funde chamadas simultaneas e guarda o resultado, entao
 * usar isto nao acrescenta nenhuma requisicao.
 */
export function useUsuarioLogado(): UsuarioCard | null {
  const [u, setU] = useState<UsuarioCard | null>(cacheMe);
  useEffect(() => {
    let vivo = true;
    carregarMe().then(d => { if (vivo && d) setU(d); });
    return () => { vivo = false; };
  }, []);
  return u;
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
        borderRadius: 12, background:"rgba(159,211,234,0.08)",
        border:"1px solid rgba(159,211,234,0.18)", display: "flex",
        alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left",
        fontFamily: "inherit", transition: "background 0.18s, border-color 0.18s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
      onFocus={e => { e.currentTarget.style.borderColor = "rgba(26,188,156,0.7)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
    >
      <div
        aria-hidden
        style={{
          width: compacto ? 30 : 34, height: compacto ? 30 : 34, borderRadius: "50%",
          background:`linear-gradient(135deg,${avatarColor(nome)},#2E6F95)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color:"#fff", flexShrink: 0,
        }}
      >
        {carregando ? "…" : initials(nome)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color:"#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {carregando ? "Carregando…" : nome || "Meu perfil"}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color:"rgba(255,255,255,0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {carregando ? "" : funcao}
        </div>
      </div>
    </button>
  );
}
