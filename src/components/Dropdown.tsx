import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";

/**
 * Dropdown padrão do CRM — substitui o <select> nativo, que herda o tema do
 * sistema operacional e destoa do resto da tela (no Windows a lista abre branca,
 * com fonte do SO).
 *
 * O painel é OPACO de propósito: sobre um fundo naval, um painel translúcido
 * deixa o conteúdo de baixo vazar por trás dos itens e a leitura fica ruim.
 */

export interface OpcaoDropdown {
  valor: string;
  rotulo: string;
  /** Segunda linha, quando o rótulo sozinho não identifica a opção. */
  detalhe?: string;
  /** Valor alinhado à direita — preço, quantidade. */
  sufixo?: string;
  icone?: React.ElementType;
  cor?: string;
}

// Superfícies opacas. O painel fica um degrau acima do card para se destacar
// dele sem depender de transparência.
const PAINEL = "#12385C";
const TRIGGER = "#123253";
const BORDA = "rgba(159,211,234,0.22)";
const BORDA_FORTE = "rgba(159,211,234,0.45)";

export default function Dropdown({
  valor, opcoes, onChange, placeholder = "Selecione…", disabled = false,
  busca = false, ariaLabel, id, largura, altura = 42, corAtiva = "#9FD3EA",
}: {
  valor: string;
  opcoes: OpcaoDropdown[];
  onChange: (valor: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Mostra campo de busca no topo — vale a pena acima de ~8 opções. */
  busca?: boolean;
  ariaLabel?: string;
  id?: string;
  largura?: number | string;
  altura?: number;
  /** Cor do estado selecionado; segue o contexto (função, status…). */
  corAtiva?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const caixa = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  // O painel vai num portal com position:fixed porque os dropdowns vivem dentro
  // de containers com overflow (a tabela da equipe rola na horizontal, o modal
  // do orçamento na vertical) — em fluxo normal ele seria recortado pela borda
  // desses containers em vez de flutuar sobre a tela.
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxAltura: number } | null>(null);

  const medir = useCallback(() => {
    const el = caixa.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const espacoAbaixo = window.innerHeight - r.bottom - 10;
    const espacoAcima = r.top - 10;
    // Abre para cima quando não cabe embaixo e há mais espaço em cima.
    const paraCima = espacoAbaixo < 180 && espacoAcima > espacoAbaixo;
    const maxAltura = Math.min(300, Math.max(140, paraCima ? espacoAcima : espacoAbaixo));
    // Em colunas estreitas (a de "Função" tem 110px) o painel herdaria a largura
    // do gatilho e cortaria o texto das opções — daí a largura mínima, alinhada
    // à direita do gatilho quando ela estoura a borda da tela.
    const largura = Math.min(Math.max(r.width, 210), window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - largura - 8));
    setPos({
      left,
      top: paraCima ? r.top - 6 - maxAltura : r.bottom + 6,
      width: largura,
      maxAltura,
    });
  }, []);

  useEffect(() => {
    if (!aberto) { setPos(null); return; }
    medir();
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (caixa.current?.contains(alvo) || painel.current?.contains(alvo)) return;
      setAberto(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    // `true` na captura para acompanhar o scroll de qualquer ancestral, não só
    // o da janela — a lista da equipe rola dentro do próprio card.
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto, medir]);

  const selecionada = opcoes.find(o => o.valor === valor) || null;

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return opcoes;
    return opcoes.filter(o =>
      o.rotulo.toLowerCase().includes(q) || (o.detalhe || "").toLowerCase().includes(q)
    );
  }, [opcoes, filtro]);

  const Icone = selecionada?.icone;

  return (
    <div ref={caixa} style={{ position: "relative", width: largura ?? "100%" }}>
      <button
        type="button" id={id} disabled={disabled}
        onClick={() => { if (!disabled) { setAberto(a => !a); setFiltro(""); } }}
        aria-haspopup="listbox" aria-expanded={aberto} aria-label={ariaLabel}
        style={{
          width: "100%", height: altura, display: "flex", alignItems: "center", gap: 8,
          padding: "0 12px", borderRadius: 10, fontFamily: "inherit", textAlign: "left",
          border: `1.5px solid ${aberto ? BORDA_FORTE : BORDA}`,
          background: TRIGGER,
          color: selecionada ? "#EAF6FB" : "#9FD3EA",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.55 : 1,
          boxShadow: aberto ? "0 0 0 3px rgba(86,164,245,0.16)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      >
        {Icone && <Icone style={{ width: 14, height: 14, color: selecionada?.cor || corAtiva, flexShrink: 0 }} />}
        <span style={{
          flex: 1, minWidth: 0, fontSize: 13, fontWeight: selecionada ? 700 : 600,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: selecionada?.cor || (selecionada ? "#EAF6FB" : "#9FD3EA"),
        }}>
          {selecionada ? selecionada.rotulo : placeholder}
        </span>
        <ChevronDown style={{
          width: 15, height: 15, color: "#9FD3EA", flexShrink: 0,
          transform: aberto ? "rotate(180deg)" : "none", transition: "transform 0.16s",
        }} />
      </button>

      {aberto && pos && createPortal(
        <div ref={painel} role="listbox" aria-label={ariaLabel} style={{
          position: "fixed", left: pos.left, top: pos.top, width: pos.width, zIndex: 3000,
          maxHeight: pos.maxAltura, overflowY: "auto", borderRadius: 12,
          background: PAINEL, border: `1px solid ${BORDA_FORTE}`,
          boxShadow: "0 18px 48px rgba(3,14,26,0.55)",
        }}>
          {busca && (
            <div style={{ position: "sticky", top: 0, background: PAINEL, padding: 8, borderBottom: `1px solid ${BORDA}` }}>
              <div style={{ position: "relative" }}>
                <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#9FD3EA" }} />
                <input
                  autoFocus value={filtro} onChange={e => setFiltro(e.target.value)}
                  placeholder="Buscar…" aria-label="Buscar opção"
                  style={{
                    width: "100%", height: 34, padding: "0 10px 0 30px", borderRadius: 8, fontSize: 12,
                    border: `1.5px solid ${BORDA}`, background: "#0F2E4B", color: "#EAF6FB",
                    outline: "none", fontFamily: "inherit",
                  }}
                />
              </div>
            </div>
          )}

          {filtradas.length === 0 ? (
            <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, fontWeight: 600, color: "#9FD3EA" }}>
              Nada encontrado.
            </div>
          ) : filtradas.map(o => {
            const on = o.valor === valor;
            const OpIcone = o.icone;
            return (
              <button
                key={o.valor} type="button" role="option" aria-selected={on}
                onClick={() => { onChange(o.valor); setAberto(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 12px",
                  border: "none", borderBottom: `1px solid ${BORDA}`, cursor: "pointer",
                  textAlign: "left", fontFamily: "inherit",
                  background: on ? `${o.cor || corAtiva}22` : "transparent",
                  borderLeft: `3px solid ${on ? (o.cor || corAtiva) : "transparent"}`,
                }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = "rgba(126,176,219,0.10)"; }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = "transparent"; }}
              >
                {OpIcone && <OpIcone style={{ width: 14, height: 14, color: o.cor || "#9FD3EA", flexShrink: 0 }} />}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: "block", fontSize: 12.5, fontWeight: on ? 800 : 700,
                    color: on ? (o.cor || "#FFFFFF") : "#EAF6FB",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {o.rotulo}
                  </span>
                  {o.detalhe && (
                    <span style={{
                      display: "block", fontSize: 11, color: "#9FD3EA", marginTop: 1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {o.detalhe}
                    </span>
                  )}
                </span>
                {o.sufixo && (
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#83DDA8", flexShrink: 0, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                    {o.sufixo}
                  </span>
                )}
                {on && <Check style={{ width: 14, height: 14, color: o.cor || corAtiva, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
