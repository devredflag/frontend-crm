import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Package, Wrench, Info } from "lucide-react";

import { getToken } from "../services/auth";
import { aoMudarOrcamentos } from "../hooks/useValoresOrcamento";
import useIsMobile from "../hooks/useIsMobile";
import { brl } from "../utils/moeda";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

// ─────────────────────────────────────────────────────────────────────────────
// Os dois gráficos de item da tela de Insights.
//
// Um por catálogo — equipamentos/materiais à esquerda, serviços à direita —
// porque comparar "Gerador 15 kVA" com "Instalação" lado a lado não responde
// pergunta nenhuma: são catálogos diferentes, com preço e volume de ordens de
// grandeza distintas. Dentro de um catálogo, o ranking decide desconto e
// reposição.
//
// Barra horizontal e não vertical: nome de item é texto longo ("Bomba
// submersa 3cv"), e em barra vertical o rótulo vira diagonal ou reticências.
//
// Mede o que FECHOU, não o que foi ofertado. A oferta continua no rodapé como
// contexto: sem ela, "0 vendidos" tanto pode ser encalhe quanto item que
// ninguém chegou a oferecer.
// ─────────────────────────────────────────────────────────────────────────────

type TipoItem = "equipamento" | "servico";

interface ItemVendido {
  nome: string;
  /** Ausente enquanto o backend não subir: tudo cai em "equipamento". */
  tipo?: TipoItem;
  quantidade: number;
  valor: number;
  qtd_aprovada: number;
  valor_aprovado: number;
  qtd_recusada: number;
  qtd_aberta: number;
  valor_aberto: number;
  /** null = nada decidido ainda. Diferente de 0% — ver comentário no backend. */
  taxa_aprovacao: number | null;
}

/** Quantas barras por gráfico. Acima disso a coluna vira lista e deixa de ser leitura de relance. */
const POR_GRAFICO = 8;

const COLUNAS: { tipo: TipoItem; rotulo: string; icone: any; cor: string; vazio: string }[] = [
  {
    tipo: "equipamento", rotulo: "Equipamentos / Materiais", icone: Package,
    cor: "#56A4F5", vazio: "Nenhum equipamento vendido ainda.",
  },
  {
    tipo: "servico", rotulo: "Serviços", icone: Wrench,
    cor: "#A78BFA", vazio: "Nenhum serviço vendido ainda.",
  },
];

export default function RankingItensVendidos() {
  const isMobile = useIsMobile();
  const [itens, setItens] = useState<ItemVendido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [semDetalhe, setSemDetalhe] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`${API}/vendas/insights`, {
        headers: { Authorization: `Bearer ${getToken() || ""}` },
      });
      if (r.ok) {
        const d = await r.json();
        // Distingue "backend antigo, sem o detalhamento" de "conta sem venda":
        // as duas telas são vazias, mas só uma é problema.
        setSemDetalhe(!("equipamentos" in d));
        setItens(d.equipamentos || []);
        setErro(false);
      } else {
        setErro(true);
      }
    } catch {
      setErro(true);
    }
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Aprovar um orçamento no Gerenciamento tem que mexer aqui; sem isto o
  // gráfico mostraria o número velho até o F5.
  useEffect(() => aoMudarOrcamentos(() => { carregar(); }), [carregar]);

  const rankings = useMemo(() => {
    const monta = (tipo: TipoItem) => [...itens]
      .filter(e => (e.tipo === "servico" ? "servico" : "equipamento") === tipo)
      .sort((a, b) => b.qtd_aprovada - a.qtd_aprovada || b.valor_aprovado - a.valor_aprovado)
      .slice(0, POR_GRAFICO);
    return { equipamento: monta("equipamento"), servico: monta("servico") };
  }, [itens]);

  if (carregando) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 16 }}>
        <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 16, alignItems: "stretch" }}>
      {COLUNAS.map((col, i) => (
        <motion.div key={col.tipo} className="glass-card" style={{ padding: "22px 24px" }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `${col.cor}1F`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <col.icone style={{ width: 15, height: 15, color: col.cor }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em" }}>{col.rotulo}</div>
              <div style={{ fontSize: 11.5, color: "#B6CFE4", marginTop: 2 }}>
                Pelo que fechou, não pelo que foi ofertado
              </div>
            </div>
          </div>

          <GraficoBarras itens={rankings[col.tipo]} cor={col.cor}
            vazio={erro ? "Não foi possível carregar os dados de vendas."
                  : semDetalhe ? "O backend ainda não envia o detalhamento por item."
                  : col.vazio} />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Uma coluna de barras horizontais.
 *
 * A escala é relativa ao PRIMEIRO item da própria lista, não ao maior dos dois
 * catálogos: serviço costuma vender em volume muito diferente de equipamento, e
 * escala compartilhada esmagaria a coluna menor até a barra sumir.
 */
function GraficoBarras({ itens, cor, vazio }: {
  itens: ItemVendido[]; cor: string; vazio: string;
}) {
  const topo = Math.max(1, ...itens.map(e => e.qtd_aprovada));

  if (itens.length === 0) {
    return (
      <div style={{ padding: "34px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Info style={{ width: 18, height: 18, color: "rgba(126,176,219,0.55)" }} />
        <span style={{ fontSize: 12, color: "#B6CFE4" }}>{vazio}</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {itens.map(e => (
        <div key={e.nome}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
            <span title={e.nome}
              style={{ fontSize: 12.5, fontWeight: 700, color: "#FFFFFF", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.nome}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", color: e.qtd_aprovada ? cor : "#7E9DBB" }}>
              {e.qtd_aprovada} vendido{e.qtd_aprovada === 1 ? "" : "s"}
            </span>
          </div>
          <div style={{ height: 9, borderRadius: 6, background: "rgba(126,176,219,0.10)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max((e.qtd_aprovada / topo) * 100, e.qtd_aprovada ? 4 : 0)}%`, background: cor, borderRadius: 6, transition: "width 0.4s ease" }} />
          </div>
          {/* O rodapé é o porquê da posição: sem a oferta ao lado, "0 vendidos"
              tanto pode ser encalhe quanto item que ninguém ofereceu — e o que
              está em aberto ainda pode virar venda, então não é fracasso. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", marginTop: 5, fontSize: 10.5, color: "#8AA9C6" }}>
            <span>{e.quantidade}x ofertado</span>
            {e.qtd_aberta > 0 && <span style={{ color: "#F0A05A" }}>{e.qtd_aberta} em aberto</span>}
            {e.valor_aprovado > 0 && (
              <span>fechou <strong style={{ color: "#83DDA8" }}>{brl(e.valor_aprovado)}</strong></span>
            )}
            <span title={e.taxa_aprovacao === null
              ? "Nenhuma proposta decidida ainda"
              : `${e.qtd_aprovada} aprovados de ${e.qtd_aprovada + e.qtd_recusada} decididos`}>
              {e.taxa_aprovacao === null ? "sem decisão ainda" : `${e.taxa_aprovacao}% de aprovação`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
