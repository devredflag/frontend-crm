import { useState, useEffect } from "react";
import { getToken } from "../services/auth";
import { FileText, TrendingUp, Package, DollarSign, Percent } from "lucide-react";

const API = "https://backend-crm-production-157b.up.railway.app";

const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  rascunho:      { label: "Rascunho",      color: "#566573", bg: "rgba(149,165,166,0.15)" },
  enviado:       { label: "Enviado",       color: "#2980b9", bg: "rgba(41,128,185,0.12)"  },
  em_negociacao: { label: "Em negociação", color: "#d68910", bg: "rgba(214,137,16,0.12)"  },
  aprovado:      { label: "Aprovado",      color: "#16a34a", bg: "rgba(22,163,74,0.12)"   },
  recusado:      { label: "Recusado",      color: "#dc2626", bg: "rgba(220,38,38,0.1)"    },
};
const ORDEM = ["rascunho", "enviado", "em_negociacao", "aprovado", "recusado"];

interface Insights {
  por_status: Record<string, { total: number; valor: number }>;
  total_orcamentos: number;
  valor_em_aberto: number;
  valor_aprovado: number;
  taxa_conversao: number;
  equipamentos_mais_orcados: { nome: string; quantidade: number; valor: number }[];
}

function brl(v?: number | null) {
  return `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export default function VendasInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      try {
        const res = await fetch(`${API}/vendas/insights`, {
          headers: { Authorization: `Bearer ${getToken() || ""}` },
        });
        if (res.ok) setData(await res.json());
      } catch { /* mantém o estado vazio; a tela mostra o zerado */ }
      setLoading(false);
    };
    carregar();
  }, []);

  if (loading) {
    return <div className="skeleton" style={{ height: 220, borderRadius: 16 }} />;
  }

  const d = data || {
    por_status: {}, total_orcamentos: 0, valor_em_aberto: 0,
    valor_aprovado: 0, taxa_conversao: 0, equipamentos_mais_orcados: [],
  };
  const maxQtd = Math.max(1, ...d.equipamentos_mais_orcados.map(e => e.quantidade));

  const cards = [
    { label: "Orçamentos",     value: String(d.total_orcamentos),   icon: FileText,   color: "#2980b9" },
    { label: "Em aberto",      value: brl(d.valor_em_aberto),       icon: TrendingUp, color: "#d68910" },
    { label: "Aprovado",       value: brl(d.valor_aprovado),        icon: DollarSign, color: "#16a34a" },
    { label: "Conversão",      value: `${d.taxa_conversao}%`,       icon: Percent,    color: "#8e44ad" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Números do topo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${c.color}1a`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <c.icon style={{ width: 18, height: 18, color: c.color }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(20,45,70,0.45)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#0f2133", letterSpacing: "-0.02em" }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
        {/* Funil por status */}
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#0f2133", marginBottom: 14 }}>Orçamentos por status</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {ORDEM.map(s => {
              const info = STATUS_INFO[s];
              const v = d.por_status[s] || { total: 0, valor: 0 };
              const pct = d.total_orcamentos ? (v.total / d.total_orcamentos) * 100 : 0;
              return (
                <div key={s}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: info.color, flex: 1 }}>{info.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#0f2133" }}>{v.total}</span>
                    <span style={{ fontSize: 10, color: "rgba(20,45,70,0.45)", minWidth: 90, textAlign: "right" }}>{brl(v.valor)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: "rgba(200,225,240,0.5)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: info.color, borderRadius: 4, transition: "width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ranking de equipamentos */}
        <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#0f2133", marginBottom: 14 }}>Equipamentos mais orçados</div>
          {d.equipamentos_mais_orcados.length === 0 ? (
            <div style={{ padding: "30px 0", textAlign: "center", color: "rgba(20,45,70,0.4)" }}>
              <Package style={{ width: 26, height: 26, marginBottom: 6 }} />
              <p style={{ fontSize: 12, fontWeight: 700 }}>Nada orçado ainda.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {d.equipamentos_mais_orcados.map(e => (
                <div key={e.nome}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#0f2133", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.nome}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#2980b9" }}>{e.quantidade}x</span>
                    <span style={{ fontSize: 10, color: "rgba(20,45,70,0.45)", minWidth: 90, textAlign: "right" }}>{brl(e.valor)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: "rgba(200,225,240,0.5)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(e.quantidade / maxQtd) * 100}%`, background: "linear-gradient(90deg,#2980b9,#1abc9c)", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
