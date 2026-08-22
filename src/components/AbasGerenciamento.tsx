import { Users, FileText } from "lucide-react";
import useIsMobile from "../hooks/useIsMobile";

// Navegação principal do Gerenciamento (Clientes x Vendas).
//
// Antes era um sublinhado fino de 2px, que se perdia na tela: o usuário não
// percebia que ali havia DUAS áreas navegáveis. Virou um segmented control em
// cards, e o estado ativo é marcado por quatro sinais somados — fundo
// preenchido, borda, cor/peso do texto e barra inferior — para não depender só
// de cor (acessibilidade) nem só de uma linha fina.

export type AbaGerenciamento = "clientes" | "vendas";

const ABAS = [
  {
    key: "clientes" as const,
    label: "Gerenciamento de clientes",
    curto: "Clientes",
    descricao: "Carteira, funil e prospecção",
    icon: Users,
  },
  {
    key: "vendas" as const,
    label: "Gerenciamento de vendas",
    curto: "Vendas",
    descricao: "Orçamentos, catálogo e fechamento",
    icon: FileText,
  },
];

export default function AbasGerenciamento({
  aba,
  onChange,
  /** Versão de uma linha só, sem a descrição — usada no Dashboard. */
  compacto = false,
}: {
  aba: AbaGerenciamento;
  onChange: (a: AbaGerenciamento) => void;
  compacto?: boolean;
}) {
  const isMobile = useIsMobile();

  return (
    <div
      role="tablist"
      aria-label="Áreas do gerenciamento"
      style={{
        display: "grid",
        // Em telas estreitas as duas opções empilham em largura total, para o
        // rótulo longo não quebrar feio no meio.
        gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
        gap: 10,
        padding: 6,
        borderRadius: 8,
        background: "#ffffff",
        border: "1px solid #E3E6E9",
        boxShadow:"none",
      }}
    >
      {ABAS.map(t => {
        const ativo = aba === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={ativo}
            aria-controls={`painel-${t.key}`}
            onClick={() => onChange(t.key)}
            className={`aba-ger${ativo ? " ativa" : ""}`}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              minHeight: compacto ? 52 : 62,
              padding: compacto ? "10px 14px" : "12px 16px",
              borderRadius: 8,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              overflow: "hidden",
              transition: "all 0.18s ease",
              border: ativo
                ? "1.5px solid #2563EB"
                : "1.5px solid #E3E6E9",
              background: ativo
                ? "#2563EB"
                : "#ffffff",
              boxShadow: ativo
                ? "0 6px 18px #EFF4FE"
                : "0 1px 2px rgba(10,31,51,0.04)",
            }}
          >
            {/* Ícone em bloco: cheio quando ativo, discreto quando inativo */}
            <span
              aria-hidden
              style={{
                width: compacto ? 32 : 38,
                height: compacto ? 32 : 38,
                borderRadius: 8,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                background: ativo
                  ? "#2563EB"
                  : "#2563EB",
                boxShadow: ativo ? "0 4px 12px #2563EB" : "none",
                transition: "all 0.18s ease",
              }}
            >
              <t.icon
                style={{
                  width: compacto ? 15 : 17,
                  height: compacto ? 15 : 17,
                  color: ativo ? "#fff" : "#2563EB",
                }}
              />
            </span>

            <span style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  display: "block",
                  fontSize: compacto ? 13 : 13.5,
                  fontWeight: ativo ? 800 : 650,
                  letterSpacing: "-0.01em",
                  color: ativo ? "#15547f" : "#16191D",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {isMobile ? t.curto : t.label}
              </span>
              {!compacto && (
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 600,
                    marginTop: 2,
                    color: ativo ? "rgba(21,84,127,0.72)" : "#5B6570",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {t.descricao}
                </span>
              )}
            </span>

            {/* Marca de "você está aqui" — reforço que não depende de cor */}
            {ativo && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  bottom: 0,
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                  background: "#2563EB",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Estilos de hover/foco ficam em CSS porque inline não cobre :hover/:focus-visible.
// Cada página injeta esta string no <style> que já mantém.
export const cssAbasGerenciamento = `
  .aba-ger:hover { border-color:#2563EB !important; background:#ffffff !important; transform:translateY(-1px); }
  .aba-ger.ativa:hover { background:#EFF4FE !important; }
  .aba-ger:focus-visible { outline:2px solid #2563EB; outline-offset:2px; }
`;
