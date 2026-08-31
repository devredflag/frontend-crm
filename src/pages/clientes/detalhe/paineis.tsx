import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Package, ShoppingCart, FileText, Send, CheckCircle2, XCircle, Calendar,
  Trash2, Tag, Loader2, NotebookPen, Edit3,
} from "lucide-react";
import { getToken } from "../../../services/auth";
import { dataLocal, formatarData } from "../../../utils/data";
import { brl, brlCurto } from "../../../utils/moeda";
import { STATUS_ORCAMENTO, numeroOrcamento } from "../../../utils/orcamento";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

// Painéis pesados da ficha da empresa. Moram fora do index porque cada um tem
// busca, estado e tabela própria — juntos passavam de 2 mil linhas num arquivo
// que já carregava a casca da página inteira.

export interface OrcamentoDet {
  orcamento_id: string;
  titulo?: string | null;
  status: string;
  total: number | string | null;
  criado_em?: string | null;
  data_envio?: string | null;
  data_decisao?: string | null;
  motivo_recusa?: string | null;
  vendedor_nome?: string | null;
  qtd_itens?: number | null;
  qtd_pecas?: number | null;
  item_principal?: string | null;
}

export const num = (v: number | string | null | undefined) => Number(v ?? 0) || 0;
export const formatDate = (d?: string | null) => formatarData(d ?? null);

// ── peças de UI repetidas em todos os painéis ──────────────────
export const CARD: React.CSSProperties = {
  background: "#143354", border: "1px solid rgba(159,211,234,0.18)", borderRadius: 16,
};
const LINHA = "1px solid rgba(159,211,234,0.14)";
export const TD: React.CSSProperties = { padding: "11px 14px", borderBottom: LINHA, color: "#EAF6FB", verticalAlign: "top" };
export const TD_NUM: React.CSSProperties = { ...TD, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const TABELA: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 12.5 };

export function Th({ children, r }: { children: React.ReactNode; r?: boolean }) {
  return (
    <th style={{
      textAlign: r ? "right" : "left", padding: "10px 14px", fontSize: 10.5, letterSpacing: "0.07em",
      textTransform: "uppercase", color: "#9FD3EA", fontWeight: 700,
      borderBottom: "1px solid rgba(159,211,234,0.18)", whiteSpace: "nowrap",
    }}>{children}</th>
  );
}

export function Cabecalho({ titulo, sub, children }: { titulo: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 18px", borderBottom: "1px solid rgba(159,211,234,0.18)", flexWrap: "wrap" }}>
      <div>
        <h2 style={{ fontSize: 14.5, fontWeight: 800, color: "#EAF6FB", letterSpacing: "-0.01em" }}>{titulo}</h2>
        {sub && <div style={{ fontSize: 11.5, color: "#9FD3EA", marginTop: 2 }}>{sub}</div>}
      </div>
      {children && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{children}</div>}
    </div>
  );
}

export function Caixa({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ ...CARD, padding: 16 }}>
      <h3 style={{ fontSize: 12.5, fontWeight: 800, color: "#EAF6FB", marginBottom: 14 }}>{titulo}</h3>
      {children}
    </div>
  );
}

export function Facts({ itens }: { itens: { rot: string; val: React.ReactNode; cor?: string }[] }) {
  return (
    <dl>
      {itens.map((f, i) => (
        <div key={f.rot} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", fontSize: 12.5, borderBottom: i === itens.length - 1 ? 0 : LINHA }}>
          <dt style={{ color: "#9FD3EA" }}>{f.rot}</dt>
          <dd style={{ fontWeight: 700, color: f.cor || "#EAF6FB", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{f.val}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Barras horizontais — proporção dentro do próprio grupo, nunca contra 100%. */
export function Rank({ itens, vazio = "Nada por aqui ainda." }: {
  itens: { rot: string; val: React.ReactNode; peso: number; cor?: string }[];
  vazio?: string;
}) {
  if (itens.length === 0) return <p style={{ fontSize: 11.5, color: "#9FD3EA", fontWeight: 600, padding: "10px 0" }}>{vazio}</p>;
  const topo = Math.max(...itens.map(i => i.peso), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      {itens.map(i => (
        <div key={i.rot}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, marginBottom: 5 }}>
            <span style={{ color: "#9FD3EA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.rot}</span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: "#EAF6FB", fontWeight: 700, flexShrink: 0 }}>{i.val}</span>
          </div>
          <div style={{ background: "rgba(18,59,94,0.85)", borderRadius: 999, height: 7, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", borderRadius: 999, background: i.cor || "#2E6F95", width: `${Math.max(2, (i.peso / topo) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Vazio({ icon: Icon, titulo, dica }: { icon: React.ElementType; titulo: string; dica?: string }) {
  return (
    <div style={{ padding: "44px 20px", textAlign: "center", color: "#9FD3EA" }}>
      <Icon style={{ width: 28, height: 28, marginBottom: 8, opacity: 0.7 }} />
      <p style={{ fontSize: 12.5, fontWeight: 700 }}>{titulo}</p>
      {dica && <p style={{ fontSize: 11.5, marginTop: 4, opacity: 0.85 }}>{dica}</p>}
    </div>
  );
}

export function Chip({ status }: { status: string }) {
  const info = STATUS_ORCAMENTO[status] || STATUS_ORCAMENTO.rascunho;
  return <span className="chip" style={{ background: info.bg, color: info.color }}>{info.label}</span>;
}

const COLUNAS: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0,1fr) 272px", gap: 16, alignItems: "start" };
const RAIL: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };

/** Uma coluna só abaixo de 1080px — o rail vira faixa embaixo da tabela. */
function useDuasColunas() {
  const [largo, setLargo] = useState(() => window.innerWidth > 1080);
  useEffect(() => {
    const ao = () => setLargo(window.innerWidth > 1080);
    window.addEventListener("resize", ao);
    return () => window.removeEventListener("resize", ao);
  }, []);
  return largo;
}

export function Colunas({ children, rail }: { children: React.ReactNode; rail: React.ReactNode }) {
  const duas = useDuasColunas();
  return (
    <div style={duas ? COLUNAS : { display: "flex", flexDirection: "column", gap: 16 }}>
      {children}
      <aside style={duas ? RAIL : { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>{rail}</aside>
    </div>
  );
}

// ── VENDAS ────────────────────────────────────────────────────
// "Venda" aqui é orçamento aprovado. Pedido faturado não existe no sistema:
// não há tabela de pedidos nem de nota fiscal, e inventar uma coluna de
// faturamento seria mostrar número que ninguém pode conferir.
export function PainelVendas({ orcamentos }: { orcamentos: OrcamentoDet[] }) {
  const vendas = useMemo(() => orcamentos
    .filter(o => o.status === "aprovado")
    .sort((a, b) => (dataLocal(b.data_decisao || b.data_envio || b.criado_em)?.getTime() ?? 0)
                  - (dataLocal(a.data_decisao || a.data_envio || a.criado_em)?.getTime() ?? 0)),
  [orcamentos]);

  const total = vendas.reduce((s, o) => s + num(o.total), 0);
  const ticket = vendas.length ? total / vendas.length : 0;

  const porVendedor = useMemo(() => {
    const mapa = new Map<string, { qtd: number; valor: number }>();
    vendas.forEach(o => {
      const nome = o.vendedor_nome || "Sem vendedor";
      const atual = mapa.get(nome) || { qtd: 0, valor: 0 };
      mapa.set(nome, { qtd: atual.qtd + 1, valor: atual.valor + num(o.total) });
    });
    return Array.from(mapa.entries()).sort((a, b) => b[1].valor - a[1].valor);
  }, [vendas]);

  return (
    <Colunas rail={<>
      <Caixa titulo="Resumo do período">
        <Facts itens={[
          { rot: "Total fechado", val: brl(total, 0) },
          { rot: "Ticket médio", val: vendas.length ? brl(ticket, 0) : "—" },
          { rot: "Vendas", val: vendas.length, cor: "#83DDA8" },
          { rot: "Última", val: formatDate(vendas[0]?.data_decisao || vendas[0]?.data_envio) },
        ]} />
      </Caixa>
      <Caixa titulo="Por vendedor">
        <Rank vazio="Nenhuma venda fechada ainda."
          itens={porVendedor.map(([nome, v]) => ({
            rot: nome, val: `${v.qtd} · ${brlCurto(v.valor)}`, peso: v.valor, cor: "#2E6F95",
          }))} />
      </Caixa>
    </>}>
      <section style={{ ...CARD, overflow: "hidden" }}>
        <Cabecalho titulo="Vendas fechadas"
          sub="Orçamentos aprovados desta empresa — o pedido faturado ainda não existe no sistema" />
        {vendas.length === 0 ? (
          <Vazio icon={ShoppingCart} titulo="Nenhuma venda fechada com esta empresa"
            dica="Um orçamento aprovado aparece aqui na hora." />
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={TABELA}>
                <thead><tr>
                  <Th>#</Th><Th>Data</Th><Th>Nº</Th><Th>Produto / serviço</Th>
                  <Th r>Itens</Th><Th r>Peças</Th><Th r>Valor</Th><Th>Vendedor</Th>
                </tr></thead>
                <tbody>
                  {vendas.map((o, i) => (
                    <tr key={o.orcamento_id}>
                      <td style={{ ...TD_NUM, color: "#9FD3EA", width: 26 }}>{i + 1}</td>
                      <td style={TD_NUM}>{formatDate(o.data_decisao || o.data_envio)}</td>
                      <td style={TD_NUM}>{numeroOrcamento({ orcamento_id: o.orcamento_id, criado_em: o.criado_em })}</td>
                      <td style={TD}>
                        <span style={{ fontWeight: 600, display: "block" }}>{o.item_principal || o.titulo || "Orçamento"}</span>
                        {o.item_principal && o.titulo && (
                          <span style={{ display: "block", fontSize: 11, color: "#9FD3EA", marginTop: 1 }}>{o.titulo}</span>
                        )}
                      </td>
                      <td style={{ ...TD_NUM, textAlign: "right" }}>{o.qtd_itens ?? "—"}</td>
                      <td style={{ ...TD_NUM, textAlign: "right" }}>{o.qtd_pecas ?? "—"}</td>
                      <td style={{ ...TD_NUM, textAlign: "right", fontWeight: 700 }}>{brl(o.total, 0)}</td>
                      <td style={{ ...TD, color: o.vendedor_nome ? "#EAF6FB" : "#9FD3EA", whiteSpace: "nowrap" }}>{o.vendedor_nome || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#9FD3EA", borderTop: "1px solid rgba(159,211,234,0.18)" }}>
              <span>{vendas.length} venda{vendas.length === 1 ? "" : "s"} fechada{vendas.length === 1 ? "" : "s"}</span>
              <span style={{ fontWeight: 800, color: "#EAF6FB", fontVariantNumeric: "tabular-nums" }}>{brl(total, 0)}</span>
            </div>
          </>
        )}
      </section>
    </Colunas>
  );
}

// ── PRODUTOS ──────────────────────────────────────────────────
interface ProdutoComprado {
  nome: string;
  quantidade: number;
  valor: number | string;
  compras: number;
  ultima_compra: string | null;
}

export function PainelProdutos({ empresaId }: { empresaId: string }) {
  const [produtos, setProdutos] = useState<ProdutoComprado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`${API}/empresas/${empresaId}/produtos`, {
          headers: { Authorization: `Bearer ${getToken() || ""}` },
        });
        if (!vivo) return;
        if (res.ok) { setProdutos(await res.json()); setErro(false); } else setErro(true);
      } catch { if (vivo) setErro(true); }
      if (vivo) setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [empresaId]);

  const totalGeral = produtos.reduce((s, p) => s + num(p.valor), 0);

  return (
    <Colunas rail={
      <Caixa titulo="Mais comprados por valor">
        <Rank vazio="Nada comprado ainda."
          itens={produtos.slice(0, 5).map(p => ({
            rot: p.nome, val: brlCurto(num(p.valor)), peso: num(p.valor), cor: "#2E6F95",
          }))} />
      </Caixa>
    }>
      <section style={{ ...CARD, overflow: "hidden" }}>
        <Cabecalho titulo="Produtos comprados"
          sub="Consolidado dos itens que saíram em orçamentos aprovados" />
        {carregando ? (
          <div className="skeleton" style={{ height: 200, margin: 16, borderRadius: 12 }} />
        ) : erro ? (
          <Vazio icon={Package} titulo="Não foi possível carregar os produtos." />
        ) : produtos.length === 0 ? (
          <Vazio icon={Package} titulo="Esta empresa ainda não comprou nada"
            dica="A lista se monta sozinha quando o primeiro orçamento for aprovado." />
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={TABELA}>
                <thead><tr>
                  <Th>Produto</Th><Th r>Qtd total</Th><Th r>Compras</Th>
                  <Th r>Valor acumulado</Th><Th r>Preço médio</Th><Th>Última compra</Th>
                </tr></thead>
                <tbody>
                  {produtos.map(p => (
                    <tr key={p.nome}>
                      <td style={{ ...TD, fontWeight: 600 }}>{p.nome}</td>
                      <td style={{ ...TD_NUM, textAlign: "right" }}>{p.quantidade}</td>
                      <td style={{ ...TD_NUM, textAlign: "right" }}>{p.compras}</td>
                      <td style={{ ...TD_NUM, textAlign: "right", fontWeight: 700 }}>{brl(p.valor, 0)}</td>
                      <td style={{ ...TD_NUM, textAlign: "right", color: "#9FD3EA" }}>
                        {p.quantidade ? brl(num(p.valor) / p.quantidade, 0) : "—"}
                      </td>
                      <td style={TD_NUM}>{formatDate(p.ultima_compra)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#9FD3EA", borderTop: "1px solid rgba(159,211,234,0.18)" }}>
              <span>{produtos.length} produto{produtos.length === 1 ? "" : "s"} distinto{produtos.length === 1 ? "" : "s"}</span>
              <span style={{ fontWeight: 800, color: "#EAF6FB", fontVariantNumeric: "tabular-nums" }}>{brl(totalGeral, 0)}</span>
            </div>
          </>
        )}
      </section>
    </Colunas>
  );
}

// ── TIMELINE ──────────────────────────────────────────────────
type Grupo = "orcamento" | "agenda";
interface Evento {
  id: string;
  quando: Date;
  grupo: Grupo;
  titulo: string;
  descricao?: string;
  quem?: string;
  cor: string;
  fundo: string;
  icone: React.ElementType;
}

/**
 * A linha do tempo é MONTADA aqui, das datas que os próprios registros já
 * carregam — não existe tabela de eventos. Por isso ela só sabe de orçamento e
 * agenda: são os dois lugares onde o sistema carimba data.
 */
function montarEventos(orcamentos: OrcamentoDet[], atividades: any[]): Evento[] {
  const eventos: Evento[] = [];
  const põe = (d: string | null | undefined, e: Omit<Evento, "quando" | "id"> & { id: string }) => {
    const quando = dataLocal(d);
    if (quando) eventos.push({ ...e, quando });
  };

  orcamentos.forEach(o => {
    const numero = numeroOrcamento({ orcamento_id: o.orcamento_id, criado_em: o.criado_em });
    const valor = brl(o.total, 0);
    põe(o.criado_em, {
      id: `${o.orcamento_id}-criado`, grupo: "orcamento", icone: FileText,
      cor: "#9FD3EA", fundo: "rgba(46,111,149,0.16)",
      titulo: `Orçamento ${numero} criado`,
      descricao: `${o.titulo || "Sem título"} · ${valor}`,
      quem: o.vendedor_nome || undefined,
    });
    põe(o.data_envio, {
      id: `${o.orcamento_id}-enviado`, grupo: "orcamento", icone: Send,
      cor: "#9FD3EA", fundo: "rgba(86,164,245,0.16)",
      titulo: `Orçamento ${numero} enviado`,
      descricao: `${valor} · ${o.qtd_itens ?? "?"} ite${o.qtd_itens === 1 ? "m" : "ns"}`,
      quem: o.vendedor_nome || undefined,
    });
    if (o.status === "aprovado") {
      põe(o.data_decisao, {
        id: `${o.orcamento_id}-aprovado`, grupo: "orcamento", icone: CheckCircle2,
        cor: "#83DDA8", fundo: "rgba(39,174,96,0.16)",
        titulo: `Orçamento ${numero} aprovado`, descricao: valor,
        quem: o.vendedor_nome || undefined,
      });
    }
    if (o.status === "recusado") {
      põe(o.data_decisao, {
        id: `${o.orcamento_id}-recusado`, grupo: "orcamento", icone: XCircle,
        cor: "#F7B8B1", fundo: "rgba(220,38,38,0.14)",
        titulo: `Orçamento ${numero} recusado`,
        descricao: o.motivo_recusa ? `${valor} · motivo: ${o.motivo_recusa}` : valor,
        quem: o.vendedor_nome || undefined,
      });
    }
  });

  atividades.forEach((a: any) => {
    põe(a.data_hora || a.data, {
      id: `ev-${a.evento_id || a.id}`, grupo: "agenda", icone: Calendar,
      cor: "#C9B6E4", fundo: "rgba(142,68,173,0.16)",
      titulo: a.titulo || a.nome || "Compromisso",
      descricao: a.tipo || undefined,
      quem: a.status_resposta ? `resposta: ${a.status_resposta}` : undefined,
    });
  });

  return eventos.sort((a, b) => b.quando.getTime() - a.quando.getTime());
}

const rotuloMes = (d: Date) =>
  d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, c => c.toUpperCase());

export function PainelTimeline({ orcamentos, atividades }: { orcamentos: OrcamentoDet[]; atividades: any[] }) {
  const [filtro, setFiltro] = useState<"tudo" | Grupo>("tudo");
  const todos = useMemo(() => montarEventos(orcamentos, atividades), [orcamentos, atividades]);
  const eventos = filtro === "tudo" ? todos : todos.filter(e => e.grupo === filtro);

  // Agrupa por mês preservando a ordem já ordenada.
  const meses: { rotulo: string; itens: Evento[] }[] = [];
  eventos.forEach(e => {
    const rot = rotuloMes(e.quando);
    if (meses[meses.length - 1]?.rotulo !== rot) meses.push({ rotulo: rot, itens: [] });
    meses[meses.length - 1].itens.push(e);
  });

  const filtros: { chave: "tudo" | Grupo; rot: string }[] = [
    { chave: "tudo", rot: "Tudo" },
    { chave: "orcamento", rot: "Orçamentos" },
    { chave: "agenda", rot: "Agenda" },
  ];

  return (
    <Colunas rail={<>
      <Caixa titulo="Atividade registrada">
        <Facts itens={[
          { rot: "Eventos", val: todos.length },
          { rot: "De orçamento", val: todos.filter(e => e.grupo === "orcamento").length },
          { rot: "Da agenda", val: todos.filter(e => e.grupo === "agenda").length },
          { rot: "Mais recente", val: todos[0] ? formatarData(todos[0].quando.toISOString()) : "—" },
        ]} />
      </Caixa>
      <Caixa titulo="Como isto é montado">
        <p style={{ fontSize: 11.5, color: "#9FD3EA", lineHeight: 1.65 }}>
          A linha do tempo é montada das datas que os orçamentos e a agenda já
          gravam. Não existe registro de auditoria por empresa, então mudança de
          status da empresa e envio de e-mail ainda não aparecem aqui.
        </p>
      </Caixa>
    </>}>
      <section style={{ ...CARD, overflow: "hidden" }}>
        <Cabecalho titulo="Timeline" sub="O que aconteceu nesta conta, do mais recente para o mais antigo">
          {filtros.map(f => (
            <button key={f.chave} onClick={() => setFiltro(f.chave)}
              style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                border: `1.5px solid ${filtro === f.chave ? "rgba(159,211,234,0.45)" : "rgba(159,211,234,0.18)"}`,
                background: filtro === f.chave ? "rgba(46,111,149,0.30)" : "rgba(18,59,94,0.55)",
                color: filtro === f.chave ? "#EAF6FB" : "#9FD3EA",
              }}>{f.rot}</button>
          ))}
        </Cabecalho>

        {eventos.length === 0 ? (
          <Vazio icon={Calendar} titulo="Nada registrado ainda"
            dica="Orçamentos e compromissos de agenda alimentam esta lista." />
        ) : (
          <div style={{ padding: "18px 18px 8px", position: "relative" }}>
            {meses.map(m => (
              <div key={m.rotulo}>
                <div style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9FD3EA", margin: "14px 0 8px 48px", fontWeight: 700 }}>
                  {m.rotulo}
                </div>
                {m.itens.map(e => (
                  <div key={e.id} style={{ display: "flex", gap: 14, padding: "8px 0", position: "relative" }}>
                    {/* fio ligando os pontos; o último de cada mês corta sozinho */}
                    <div style={{ position: "absolute", left: 17, top: 0, bottom: 0, width: 1, background: "rgba(159,211,234,0.18)" }} />
                    <div style={{ width: 35, height: 35, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, background: e.fundo, border: "3px solid #143354", zIndex: 1 }}>
                      <e.icone style={{ width: 16, height: 16, color: e.cor }} />
                    </div>
                    <div style={{ paddingTop: 3, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#EAF6FB" }}>{e.titulo}</div>
                      {e.descricao && <div style={{ fontSize: 12, color: "#9FD3EA", marginTop: 2 }}>{e.descricao}</div>}
                      <div style={{ fontSize: 11.5, color: "#9FD3EA", marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap", opacity: 0.8 }}>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>
                          {e.quando.toLocaleDateString("pt-BR")} · {e.quando.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {e.quem && <span>{e.quem}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </Colunas>
  );
}

// ── OBSERVAÇÕES ───────────────────────────────────────────────
interface Observacao {
  observacao_id: string;
  texto: string;
  marcador: string | null;
  criado_em: string | null;
  autor_nome: string | null;
}

const MARCADORES: Record<string, { cor: string; bg: string }> = {
  Comercial:  { cor: "#9FD3EA", bg: "rgba(46,111,149,0.20)" },
  Financeiro: { cor: "#C9B6E4", bg: "rgba(142,68,173,0.18)" },
  Logística:  { cor: "#F2C879", bg: "rgba(214,137,16,0.16)" },
  Técnico:    { cor: "#83DDA8", bg: "rgba(39,174,96,0.16)" },
  Prazo:      { cor: "#F2C879", bg: "rgba(214,137,16,0.16)" },
  Perda:      { cor: "#F7B8B1", bg: "rgba(220,38,38,0.14)" },
};

function iniciais(nome?: string | null) {
  return (nome || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

export function PainelObservacoes({ empresaId, textoCadastro, onEditarCadastro }: {
  empresaId: string;
  textoCadastro?: string;
  onEditarCadastro: () => void;
}) {
  const [notas, setNotas] = useState<Observacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState("");
  const [marcador, setMarcador] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const hdrs = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken() || ""}` });

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`${API}/empresas/${empresaId}/observacoes`, { headers: hdrs() });
      if (res.ok) setNotas(await res.json());
      else setErro("Não foi possível carregar as observações.");
    } catch { setErro("Erro de conexão ao carregar as observações."); }
    setCarregando(false);
  }, [empresaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    if (!texto.trim() || salvando) return;
    setSalvando(true); setErro(null);
    try {
      const res = await fetch(`${API}/empresas/${empresaId}/observacoes`, {
        method: "POST", headers: hdrs(), body: JSON.stringify({ texto: texto.trim(), marcador }),
      });
      if (res.ok) {
        // Insere no topo com o que o servidor devolveu — sem rebuscar a lista.
        const nova: Observacao = await res.json();
        setNotas(atual => [nova, ...atual]);
        setTexto(""); setMarcador(null);
      } else {
        const d = await res.json().catch(() => ({}));
        setErro(typeof d.detail === "string" ? d.detail : "Não foi possível salvar.");
      }
    } catch { setErro("Erro de conexão ao salvar."); }
    setSalvando(false);
  };

  const excluir = async (id: string) => {
    if (!window.confirm("Excluir esta observação?")) return;
    try {
      const res = await fetch(`${API}/empresas/${empresaId}/observacoes/${id}`, { method: "DELETE", headers: hdrs() });
      if (res.ok) setNotas(atual => atual.filter(n => n.observacao_id !== id));
      else {
        const d = await res.json().catch(() => ({}));
        setErro(typeof d.detail === "string" ? d.detail : "Não foi possível excluir.");
      }
    } catch { setErro("Erro de conexão ao excluir."); }
  };

  const porMarcador = useMemo(() => {
    const mapa = new Map<string, number>();
    notas.forEach(n => { if (n.marcador) mapa.set(n.marcador, (mapa.get(n.marcador) || 0) + 1); });
    return Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]);
  }, [notas]);

  const autorMaisAtivo = useMemo(() => {
    const mapa = new Map<string, number>();
    notas.forEach(n => { const a = n.autor_nome || "—"; mapa.set(a, (mapa.get(a) || 0) + 1); });
    return Array.from(mapa.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [notas]);

  return (
    <Colunas rail={<>
      <Caixa titulo="Resumo">
        <Facts itens={[
          { rot: "Anotações", val: notas.length },
          { rot: "Última", val: notas[0] ? formatDate(notas[0].criado_em) : "—" },
          { rot: "Quem mais anota", val: autorMaisAtivo },
        ]} />
      </Caixa>
      <Caixa titulo="Marcadores">
        {porMarcador.length === 0 ? (
          <p style={{ fontSize: 11.5, color: "#9FD3EA", fontWeight: 600 }}>Nenhum marcador usado ainda.</p>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {porMarcador.map(([m, qtd]) => {
              const c = MARCADORES[m] || { cor: "#9FD3EA", bg: "rgba(46,111,149,0.20)" };
              return <span key={m} className="chip" style={{ background: c.bg, color: c.cor }}>{m} · {qtd}</span>;
            })}
          </div>
        )}
      </Caixa>
    </>}>
      <section style={{ ...CARD, overflow: "hidden" }}>
        <Cabecalho titulo="Observações" sub="Anotações da equipe sobre esta conta" />

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Observação do cadastro: campo único do formulário da empresa. Fica
              separado das anotações porque tem outro dono e outra edição. */}
          {textoCadastro && (
            <div style={{ background: "rgba(18,59,94,0.55)", border: "1px solid rgba(159,211,234,0.18)", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9FD3EA" }}>
                  Observação do cadastro
                </span>
                <button onClick={onEditarCadastro}
                  style={{ display: "flex", alignItems: "center", gap: 5, height: 28, padding: "0 11px", borderRadius: 8, border: "1px solid rgba(159,211,234,0.30)", background: "rgba(46,111,149,0.10)", color: "#9FD3EA", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <Edit3 style={{ width: 12, height: 12 }} /> Editar
                </button>
              </div>
              <p style={{ fontSize: 13, color: "#EAF6FB", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{textoCadastro}</p>
            </div>
          )}

          {/* Composer */}
          <div style={{ background: "rgba(18,59,94,0.55)", border: "1px solid rgba(159,211,234,0.18)", borderRadius: 12, padding: 12 }}>
            <textarea value={texto} onChange={e => setTexto(e.target.value)}
              placeholder="Escreva uma observação sobre o cliente…"
              style={{ width: "100%", background: "transparent", border: 0, resize: "vertical", color: "#EAF6FB", fontFamily: "inherit", fontSize: 13, minHeight: 58, outline: "none" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <Tag style={{ width: 13, height: 13, color: "#9FD3EA" }} />
                {Object.keys(MARCADORES).map(m => {
                  const on = marcador === m;
                  const c = MARCADORES[m];
                  return (
                    <button key={m} onClick={() => setMarcador(on ? null : m)}
                      style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        border: `1.5px solid ${on ? c.cor : "rgba(159,211,234,0.18)"}`,
                        background: on ? c.bg : "transparent", color: on ? c.cor : "#9FD3EA" }}>
                      {m}
                    </button>
                  );
                })}
              </div>
              <button onClick={salvar} disabled={!texto.trim() || salvando}
                style={{ display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 16px", borderRadius: 9, border: "none",
                  cursor: texto.trim() && !salvando ? "pointer" : "default", color: "#EAF6FB", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit",
                  opacity: texto.trim() && !salvando ? 1 : 0.5,
                  background: "linear-gradient(135deg,#2E6F95,#2E6F95,#83DDA8,#2E6F95)", backgroundSize: "200% 200%" }}>
                {salvando ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <NotebookPen style={{ width: 13, height: 13 }} />}
                Salvar observação
              </button>
            </div>
          </div>

          {erro && (
            <div style={{ padding: "9px 13px", borderRadius: 10, background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.25)", fontSize: 12, color: "#F7B8B1", fontWeight: 600 }}>
              {erro}
            </div>
          )}

          {carregando ? (
            <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
          ) : notas.length === 0 ? (
            <Vazio icon={NotebookPen} titulo="Nenhuma anotação ainda"
              dica="O que a equipe descobre em campo vale mais escrito aqui do que na memória." />
          ) : notas.map(n => {
            const c = n.marcador ? (MARCADORES[n.marcador] || { cor: "#9FD3EA", bg: "rgba(46,111,149,0.20)" }) : null;
            return (
              <article key={n.observacao_id} style={{ border: "1px solid rgba(159,211,234,0.18)", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(46,111,149,0.30)", color: "#9FD3EA", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                    {iniciais(n.autor_nome)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#EAF6FB" }}>{n.autor_nome || "Autor removido"}</div>
                    <div style={{ fontSize: 11, color: "#9FD3EA", fontVariantNumeric: "tabular-nums" }}>{formatDate(n.criado_em)}</div>
                  </div>
                  <button onClick={() => excluir(n.observacao_id)} title="Excluir observação"
                    aria-label="Excluir observação"
                    style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(159,211,234,0.18)", background: "rgba(159,211,234,0.06)", color: "#9FD3EA", cursor: "pointer", display: "grid", placeItems: "center" }}>
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                </div>
                <p style={{ fontSize: 13, color: "#EAF6FB", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{n.texto}</p>
                {c && n.marcador && (
                  <div style={{ marginTop: 10 }}>
                    <span className="chip" style={{ background: c.bg, color: c.cor }}>{n.marcador}</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </Colunas>
  );
}

// ── FUNIL DE ORÇAMENTOS ───────────────────────────────────────
/** As seis caixas do topo da aba Orçamentos: onde a carteira desta empresa está. */
export function FunilOrcamentos({ orcamentos }: { orcamentos: OrcamentoDet[] }) {
  const conta = (st: string) => orcamentos.filter(o => o.status === st).length;
  const aprovados = conta("aprovado");
  const decididos = aprovados + conta("recusado");
  const passos = [
    { rot: "Rascunho", val: conta("rascunho"), cor: "#9FD3EA" },
    { rot: "Enviados", val: conta("enviado"), cor: "#9FD3EA" },
    { rot: "Em negociação", val: conta("em_negociacao"), cor: "#F2C879" },
    { rot: "Aprovados", val: aprovados, cor: "#83DDA8" },
    { rot: "Recusados", val: conta("recusado"), cor: "#F7B8B1" },
    { rot: "Conversão", val: decididos ? `${Math.round((aprovados / decididos) * 100)}%` : "—", cor: "#EAF6FB" },
  ];
  return (
    <div style={{ ...CARD, padding: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: 10 }}>
        {passos.map(p => (
          <div key={p.rot} style={{ background: "rgba(18,59,94,0.55)", border: "1px solid rgba(159,211,234,0.18)", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: p.cor, fontVariantNumeric: "tabular-nums" }}>{p.val}</div>
            <div style={{ fontSize: 11, color: "#9FD3EA", marginTop: 2 }}>{p.rot}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
