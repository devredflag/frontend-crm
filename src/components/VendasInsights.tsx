import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Send, Repeat, CheckCircle2, XCircle, Clock, CalendarCheck,
  Package, ArrowRight, Percent, Wallet, Timer, Info, Building2, AlertTriangle,
} from "lucide-react";

import { getToken } from "../services/auth";
import { aoMudarOrcamentos } from "../hooks/useValoresOrcamento";
import useIsMobile from "../hooks/useIsMobile";
import { STATUS_ORCAMENTO } from "../utils/orcamento";
import { dataLocal, diasDesde, formatarData } from "../utils/data";
import { brl, brlCompacto } from "../utils/moeda";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

// ─────────────────────────────────────────────────────────────────────────────
// Visão de vendas do dashboard.
//
// Antes eram quatro números parados e duas listas de barras: dava para ver o
// tamanho do funil, mas não havia o que FAZER com aquilo — nenhum número levava
// a uma lista, e nenhuma lista dizia o que estava travado.
//
// Agora segue o mesmo contrato da visão de clientes: card é filtro, e o painel
// de baixo mostra os orçamentos daquele recorte. Os dois cards que não são
// status — "Sem resposta" e "Fechados no mês" — são o motivo da tela existir:
// eles não aparecem em lugar nenhum do CRM e são exatamente o que o vendedor
// precisa abrir de manhã.
// ─────────────────────────────────────────────────────────────────────────────

/** Dias sem resposta a partir dos quais uma proposta enviada vira cobrança. */
const DIAS_SEM_RESPOSTA = 7;

const ABERTOS = ["enviado", "em_negociacao"];

interface Equipamento {
  nome: string;
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

interface Insights {
  por_status: Record<string, { total: number; valor: number }>;
  total_orcamentos: number;
  valor_em_aberto: number;
  valor_aprovado: number;
  taxa_conversao: number;
  // Campos da rodada nova. Opcionais de propósito: se o front subir antes do
  // backend, os blocos somem em vez de quebrar a tela.
  ticket_medio?: number | null;
  tempo_medio_resposta_dias?: number | null;
  equipamentos?: Equipamento[];
}

interface Orcamento {
  orcamento_id: string;
  empresa_id: string;
  empresa_nome?: string | null;
  titulo: string;
  status: string;
  total: number | string | null;
  criado_em: string | null;
  data_envio: string | null;
  data_decisao: string | null;
  atualizado_em?: string | null;
  qtd_itens?: number | null;
  qtd_pecas?: number | null;
  item_principal?: string | null;
}

type FiltroVendas =
  | "todos" | "rascunho" | "enviado" | "em_negociacao"
  | "aprovado" | "recusado" | "sem_resposta" | "mes";

/** Proposta que saiu, ainda não teve decisão e já passou do prazo de cobrança. */
function semResposta(o: Orcamento) {
  return o.status === "enviado" && !o.data_decisao && diasDesde(o.data_envio) >= DIAS_SEM_RESPOSTA;
}

function noMesCorrente(valor?: string | null) {
  const d = dataLocal(valor);
  if (!d) return false;
  const hoje = new Date();
  return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
}

/** Há quanto tempo o orçamento está parado onde está. */
function paradoHa(o: Orcamento): number {
  const referencia =
    o.status === "enviado" ? (o.data_envio || o.atualizado_em || o.criado_em)
    : (o.atualizado_em || o.criado_em);
  return diasDesde(referencia);
}

export default function VendasInsights() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [filtro, setFiltro] = useState<FiltroVendas>("todos");

  const carregar = useCallback(async () => {
    const cab = { Authorization: `Bearer ${getToken() || ""}` };
    try {
      const [iRes, oRes] = await Promise.all([
        fetch(`${API}/vendas/insights`, { headers: cab }),
        fetch(`${API}/orcamentos`, { headers: cab }),
      ]);
      if (iRes.ok) setInsights(await iRes.json());
      if (oRes.ok) setOrcamentos(await oRes.json());
      setErro(!iRes.ok || !oRes.ok);
    } catch {
      setErro(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Alguém mexeu num orçamento (aqui ou em outra aba): o store do dinheiro
  // percebe pelo polling e avisa. Sem isto, aprovar um orçamento no
  // Gerenciamento deixaria este painel mostrando o número velho.
  useEffect(() => aoMudarOrcamentos(() => { carregar(); }), [carregar]);

  const d = insights || {
    por_status: {}, total_orcamentos: 0, valor_em_aberto: 0,
    valor_aprovado: 0, taxa_conversao: 0,
  } as Insights;

  // ── Recortes ──
  // Um mapa só, usado tanto pela contagem dos cards quanto pela lista de baixo:
  // impossível o card dizer 7 e a lista mostrar 5.
  const recortes = useMemo<Record<FiltroVendas, Orcamento[]>>(() => ({
    todos:         orcamentos,
    rascunho:      orcamentos.filter(o => o.status === "rascunho"),
    enviado:       orcamentos.filter(o => o.status === "enviado"),
    em_negociacao: orcamentos.filter(o => o.status === "em_negociacao"),
    aprovado:      orcamentos.filter(o => o.status === "aprovado"),
    recusado:      orcamentos.filter(o => o.status === "recusado"),
    sem_resposta:  orcamentos.filter(semResposta),
    mes:           orcamentos.filter(o => o.status === "aprovado" && noMesCorrente(o.data_decisao)),
  }), [orcamentos]);

  const soma = (lista: Orcamento[]) => lista.reduce((s, o) => s + (Number(o.total) || 0), 0);

  const cards: {
    key: FiltroVendas; label: string; icon: any; color: string; bg: string; dica: string;
  }[] = [
    { key:"todos",         label:"Orçamentos",      icon:FileText,      color:"#56A4F5", bg:"rgba(86,164,245,0.12)",  dica:"Tudo que existe na sua carteira" },
    { key:"rascunho",      label:"Rascunhos",       icon:Package,       color:"#A78BFA", bg:"rgba(167,139,250,0.12)", dica:"Montado, mas ainda não saiu para o cliente" },
    { key:"enviado",       label:"Enviados",        icon:Send,          color:"#8FC4FA", bg:"rgba(143,196,250,0.12)", dica:"Na mão do cliente, aguardando resposta" },
    { key:"em_negociacao", label:"Em negociação",   icon:Repeat,        color:"#F0A05A", bg:"rgba(240,160,90,0.12)",  dica:"Conversa aberta sobre preço ou escopo" },
    { key:"aprovado",      label:"Aprovados",       icon:CheckCircle2,  color:"#2CCD93", bg:"rgba(44,205,147,0.12)",  dica:"Fechados — o valor já é receita" },
    { key:"recusado",      label:"Recusados",       icon:XCircle,       color:"#F87171", bg:"rgba(248,113,113,0.12)", dica:"Perdidos. O motivo fica no orçamento" },
    { key:"sem_resposta",  label:`Sem resposta ${DIAS_SEM_RESPOSTA}d+`, icon:Clock, color:"#F2C879", bg:"rgba(242,200,121,0.12)", dica:`Enviados há ${DIAS_SEM_RESPOSTA} dias ou mais e ainda sem decisão — é a fila de cobrança` },
    { key:"mes",           label:"Fechados no mês", icon:CalendarCheck, color:"#2CCD93", bg:"rgba(44,205,147,0.12)",  dica:"Aprovados com decisão dentro do mês corrente" },
  ];

  const lista = recortes[filtro];
  const cardAtivo = cards.find(c => c.key === filtro) || cards[0];
  const cobranca = recortes.sem_resposta;

  // ── Ritmo da venda ──
  // Taxas, não contagens: não viram card-filtro porque não existe "a lista dos
  // 32%". Ficam num bloco separado de propósito.
  const ritmo = [
    {
      icon: Percent, cor: "#2CCD93", rotulo: "Taxa de conversão",
      valor: `${d.taxa_conversao}%`,
      sub: `${d.por_status.aprovado?.total || 0} de ${(d.por_status.aprovado?.total || 0) + (d.por_status.recusado?.total || 0)} decididas`,
    },
    {
      icon: Wallet, cor: "#F2C879", rotulo: "Ticket médio",
      valor: d.ticket_medio ? brl(d.ticket_medio, 0) : "—",
      sub: d.ticket_medio ? "por orçamento aprovado" : "nenhum aprovado ainda",
    },
    {
      icon: Timer, cor: "#8FC4FA", rotulo: "Resposta do cliente",
      valor: d.tempo_medio_resposta_dias != null ? `${d.tempo_medio_resposta_dias} dias` : "—",
      sub: d.tempo_medio_resposta_dias != null ? "média do envio até a decisão" : "nenhuma proposta decidida",
    },
  ];

  // ── Equipamentos ──
  // useMemo e nao `d.equipamentos || []` direto: o fallback cria array novo a
  // cada render e o useMemo de baixo recalcularia sempre.
  const equipamentos = useMemo(() => insights?.equipamentos || [], [insights]);
  const maxQtd = Math.max(1, ...equipamentos.map(e => e.quantidade));
  // O item que mais aparece em proposta e nunca fechou: o alerta mais barato de
  // preço fora do mercado que este CRM consegue dar.
  const nuncaFecha = useMemo(() => {
    const candidatos = equipamentos.filter(e => e.taxa_aprovacao !== null && e.taxa_aprovacao === 0);
    return candidatos.sort((a, b) => b.quantidade - a.quantidade)[0] || null;
  }, [equipamentos]);

  if (loading) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:12}}>
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton" style={{height:112,borderRadius:16}}/>)}
        </div>
        <div className="skeleton" style={{height:260,borderRadius:16}}/>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>

      {erro && (
        <div className="glass-card" style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:9,borderColor:"rgba(240,160,90,0.28)",background:"rgba(240,160,90,0.06)"}}>
          <Info style={{width:14,height:14,color:"#F0A05A",flexShrink:0}}/>
          <span style={{fontSize:12,color:"#DCE9F5"}}>
            Não foi possível carregar os dados de vendas — os números abaixo estão zerados, não são um resultado real.
          </span>
        </div>
      )}

      {/* Fila de cobrança: some quando não há nada a cobrar, porque banner que
          fica sempre na tela deixa de ser lido. */}
      <AnimatePresence>
        {cobranca.length > 0 && filtro !== "sem_resposta" && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
            style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",borderRadius:14,background:"rgba(242,200,121,0.07)",border:"1.5px solid rgba(242,200,121,0.22)"}}>
            <div style={{width:40,height:40,borderRadius:11,background:"rgba(242,200,121,0.12)",border:"1px solid rgba(242,200,121,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <AlertTriangle style={{width:18,height:18,color:"#F2C879"}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:"#FFFFFF"}}>
                {cobranca.length} proposta{cobranca.length!==1?"s":""} sem resposta há {DIAS_SEM_RESPOSTA} dias ou mais
              </div>
              <div style={{fontSize:11,color:"#B6CFE4",marginTop:1}}>
                {brl(soma(cobranca), 0)} parados esperando um retorno seu
              </div>
            </div>
            <button onClick={()=>setFiltro("sem_resposta")}
              style={{padding:"7px 14px",borderRadius:8,border:"1.5px solid rgba(242,200,121,0.3)",background:"rgba(242,200,121,0.1)",color:"#F2C879",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>
              Ver fila
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards-filtro */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:12}}>
        {cards.map((c,i) => {
          const recorte = recortes[c.key];
          const valor = soma(recorte);
          const ativo = filtro === c.key;
          return (
            <motion.div key={c.key} className="metric-card" title={c.dica}
              style={{borderColor:ativo?c.color:undefined,boxShadow:ativo?`0 0 0 3px ${c.color}22`:undefined,
                outline:c.key==="sem_resposta"&&recorte.length>0&&!ativo?"1.5px dashed rgba(242,200,121,0.35)":undefined}}
              initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.35,delay:i*0.04}}
              onClick={()=>setFiltro(c.key)}
            >
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{width:32,height:32,borderRadius:9,background:c.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <c.icon style={{width:15,height:15,color:c.color}}/>
                </div>
                {ativo && <div style={{width:8,height:8,borderRadius:"50%",background:c.color}}/>}
              </div>
              <div style={{fontSize:24,fontWeight:900,color:"#FFFFFF",letterSpacing:"-0.03em"}}>{recorte.length}</div>
              <div style={{fontSize:10,color:"#B6CFE4",fontWeight:600,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.label}</div>
              {/* O valor é o que diferencia vendas de clientes: contar proposta
                  sem olhar quanto ela vale esconde o que importa. */}
              <div style={{fontSize:12,fontWeight:700,color:valor>0?c.color:"#7E9DBB",marginTop:7}}>
                {valor>0?brlCompacto(valor):"—"}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Lista do recorte selecionado */}
      <motion.div className="glass-card" style={{overflow:"hidden"}} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.3}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(126,176,219,0.16)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,background:`linear-gradient(90deg,${cardAtivo.bg},transparent)`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
            <div style={{width:30,height:30,borderRadius:8,background:cardAtivo.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <cardAtivo.icon style={{width:14,height:14,color:cardAtivo.color}}/>
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:"#FFFFFF"}}>{cardAtivo.label}</div>
              <div style={{fontSize:11,color:"#B6CFE4"}}>
                {lista.length} orçamento{lista.length!==1?"s":""} · {brl(soma(lista), 0)}
              </div>
            </div>
          </div>
          <button onClick={()=>navigate(`/gerenciamento?aba=vendas${filtro!=="todos"&&filtro!=="sem_resposta"&&filtro!=="mes"?`&status=${filtro}`:""}`)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,border:`1px solid ${cardAtivo.color}40`,background:cardAtivo.bg,fontSize:11,fontWeight:600,color:"#FFFFFF",cursor:"pointer",flexShrink:0}}>
            Ver no CRM <ArrowRight style={{width:11,height:11}}/>
          </button>
        </div>

        {lista.length === 0 ? (
          <div style={{padding:"40px 20px",textAlign:"center"}}>
            <FileText style={{width:32,height:32,color:"rgba(126,176,219,0.55)",margin:"0 auto 10px"}}/>
            <p style={{fontSize:13,fontWeight:600,color:"#B6CFE4"}}>
              {filtro==="sem_resposta"
                ? "Nenhuma proposta esperando retorno — a fila está limpa."
                : "Nenhum orçamento neste recorte."}
            </p>
          </div>
        ) : (
          <>
            <div className="venda-th">
              {["Empresa","Status","Itens","Parado há","Valor"].map(h=>(
                <span key={h} style={{fontSize:10,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:"#B6CFE4"}}>{h}</span>
              ))}
            </div>
            <div style={{maxHeight:260,overflowY:"auto"}}>
              {lista.slice(0,12).map(o => {
                const info = STATUS_ORCAMENTO[o.status] || { label:o.status, color:"#B6CFE4", bg:"rgba(126,176,219,0.12)" };
                const dias = paradoHa(o);
                // Decidido não fica "parado": mostra a data da decisão. Cobrar
                // tempo de quem já respondeu seria ruído.
                const decidido = o.status === "aprovado" || o.status === "recusado";
                const alerta = !decidido && ABERTOS.includes(o.status) && dias >= DIAS_SEM_RESPOSTA;
                return (
                  <div key={o.orcamento_id} className="venda-row"
                    onClick={()=>navigate(`/clientes/${o.empresa_id}`)}
                    title={`${o.titulo || "Orçamento"} — abrir a ficha de ${o.empresa_nome || "empresa"}`}>
                    <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                      <div style={{width:28,height:28,borderRadius:8,background:info.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <Building2 style={{width:13,height:13,color:info.color}}/>
                      </div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:"#FFFFFF",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {o.empresa_nome || "Empresa não vinculada"}
                        </div>
                        <div style={{fontSize:10,color:"#B6CFE4",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {o.item_principal || o.titulo || "Sem itens"}
                        </div>
                      </div>
                    </div>
                    <span className="chip" style={{background:info.bg,color:info.color,border:`1px solid ${info.color}40`}}>{info.label}</span>
                    <span style={{fontSize:11,color:"#B6CFE4"}}>
                      {o.qtd_itens ? `${o.qtd_itens} item${o.qtd_itens!==1?"ns":""}` : "—"}
                    </span>
                    {decidido ? (
                      <span style={{fontSize:11,color:"#B6CFE4"}}>{formatarData(o.data_decisao)}</span>
                    ) : (
                      <span style={{fontSize:11,fontWeight:alerta?700:400,color:alerta?"#F2C879":"#B6CFE4"}}>
                        {Number.isFinite(dias) ? `${dias} dia${dias!==1?"s":""}` : "—"}
                      </span>
                    )}
                    <span style={{fontSize:12,fontWeight:700,color:o.status==="aprovado"?"#83DDA8":"#FFFFFF"}}>
                      {brlCompacto(Number(o.total) || 0)}
                    </span>
                  </div>
                );
              })}
            </div>
            {lista.length > 12 && (
              <div style={{padding:"10px 20px",fontSize:11,color:"#B6CFE4",borderTop:"1px solid rgba(126,176,219,0.16)"}}>
                Mostrando 12 de {lista.length} — o restante está no Gerenciamento.
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Ritmo + funil */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"330px minmax(0,1fr)",gap:16,alignItems:"stretch"}}>

        <motion.div className="glass-card" style={{padding:"20px 22px",display:"flex",flexDirection:"column"}}
          initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.35}}>
          <div style={{fontSize:15,fontWeight:800,color:"#FFFFFF",letterSpacing:"-0.01em"}}>Ritmo da venda</div>
          <div style={{fontSize:11.5,color:"#B6CFE4",marginTop:3}}>Taxas — não filtram lista, orientam a meta</div>
          <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"space-around",marginTop:10}}>
            {ritmo.map((r,i) => (
              <div key={r.rotulo} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 0",borderTop:i===0?"none":"1px solid rgba(126,176,219,0.16)"}}>
                <div style={{width:32,height:32,borderRadius:9,background:`${r.cor}1F`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <r.icon style={{width:15,height:15,color:r.cor}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:700,color:"#FFFFFF"}}>{r.rotulo}</div>
                  <div style={{fontSize:10.5,color:"#B6CFE4",marginTop:2}}>{r.sub}</div>
                </div>
                <span style={{fontSize:15,fontWeight:800,color:r.cor,flexShrink:0}}>{r.valor}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="glass-card" style={{padding:"20px 22px"}}
          initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.4}}>
          <div style={{fontSize:15,fontWeight:800,color:"#FFFFFF",letterSpacing:"-0.01em"}}>Funil de orçamentos</div>
          <div style={{fontSize:11.5,color:"#B6CFE4",marginTop:3,marginBottom:16}}>Quantidade e valor parados em cada etapa</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {["rascunho","enviado","em_negociacao","aprovado","recusado"].map(s => {
              const info = STATUS_ORCAMENTO[s];
              const v = d.por_status[s] || { total: 0, valor: 0 };
              const fatia = d.total_orcamentos ? (v.total / d.total_orcamentos) * 100 : 0;
              return (
                <div key={s} onClick={()=>setFiltro(s as FiltroVendas)} style={{cursor:"pointer"}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:5}}>
                    <span style={{fontSize:12.5,fontWeight:700,color:info.color,flex:1}}>{info.label}</span>
                    <span style={{fontSize:13,fontWeight:800,color:"#FFFFFF"}}>{v.total}</span>
                    <span style={{fontSize:11,color:"#B6CFE4",minWidth:78,textAlign:"right"}}>{brlCompacto(v.valor)}</span>
                  </div>
                  <div style={{height:8,borderRadius:6,background:"rgba(126,176,219,0.10)",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.max(fatia, v.total?2:0)}%`,background:info.color,borderRadius:6,transition:"width 0.4s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Equipamentos */}
      <motion.div className="glass-card" style={{padding:"20px 22px"}}
        initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.45}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:16}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:15,fontWeight:800,color:"#FFFFFF",letterSpacing:"-0.01em"}}>Desempenho por equipamento</div>
            <div style={{fontSize:11.5,color:"#B6CFE4",marginTop:3}}>Ordenado pelo que mais fecha, não pelo que mais é ofertado</div>
          </div>
          {equipamentos.length > 0 && (
            <div style={{display:"flex",alignItems:"center",gap:12,fontSize:10.5,color:"#B6CFE4",flexShrink:0}}>
              {[["Aprovado","#2CCD93"],["Em aberto","#F0A05A"],["Recusado","#F87171"]].map(([r,c])=>(
                <span key={r} style={{display:"inline-flex",alignItems:"center",gap:5}}>
                  <span style={{width:8,height:8,borderRadius:2,background:c as string}}/>{r}
                </span>
              ))}
            </div>
          )}
        </div>

        {equipamentos.length === 0 ? (
          <div style={{padding:"30px 0",textAlign:"center",color:"#B6CFE4"}}>
            <Package style={{width:26,height:26,marginBottom:8,opacity:0.6}}/>
            <p style={{fontSize:12.5,fontWeight:600}}>
              {insights && !("equipamentos" in insights)
                ? "O backend ainda não envia o detalhamento por equipamento."
                : "Nenhum item orçado ainda."}
            </p>
          </div>
        ) : (
          <>
            {nuncaFecha && (
              <div style={{display:"flex",alignItems:"center",gap:9,padding:"11px 14px",borderRadius:11,background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.22)",marginBottom:16}}>
                <AlertTriangle style={{width:14,height:14,color:"#F87171",flexShrink:0}}/>
                <span style={{fontSize:12,color:"#DCE9F5",lineHeight:1.5}}>
                  <strong style={{color:"#FFFFFF"}}>{nuncaFecha.nome}</strong> foi ofertado {nuncaFecha.quantidade}x
                  e nunca foi aprovado — vale conferir preço ou a ficha do produto.
                </span>
              </div>
            )}

            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {equipamentos.slice(0,8).map(e => {
                const decidido = e.qtd_aprovada + e.qtd_recusada;
                // A barra é proporcional ao item MAIS ofertado, para comparar
                // volume entre linhas; dentro dela, a divisão é o desfecho.
                const escala = (e.quantidade / maxQtd) * 100;
                const parte = (q: number) => (e.quantidade ? (q / e.quantidade) * 100 : 0);
                return (
                  <div key={e.nome}>
                    <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:5}}>
                      <span style={{fontSize:12.5,fontWeight:700,color:"#FFFFFF",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.nome}</span>
                      <span style={{fontSize:11,color:"#B6CFE4",whiteSpace:"nowrap"}}>{e.quantidade}x ofertado</span>
                      <span title={decidido ? `${e.qtd_aprovada} aprovados de ${decidido} decididos` : "Nenhum decidido ainda"}
                        style={{fontSize:12.5,fontWeight:800,minWidth:54,textAlign:"right",
                          color:e.taxa_aprovacao === null ? "#7E9DBB"
                            : e.taxa_aprovacao >= 50 ? "#2CCD93"
                            : e.taxa_aprovacao > 0 ? "#F0A05A" : "#F87171"}}>
                        {e.taxa_aprovacao === null ? "—" : `${e.taxa_aprovacao}%`}
                      </span>
                    </div>
                    <div style={{height:9,borderRadius:6,background:"rgba(126,176,219,0.08)",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.max(escala,2)}%`,display:"flex",borderRadius:6,overflow:"hidden"}}>
                        <div style={{width:`${parte(e.qtd_aprovada)}%`,background:"#2CCD93"}}/>
                        <div style={{width:`${parte(e.qtd_aberta)}%`,background:"#F0A05A"}}/>
                        <div style={{width:`${parte(e.qtd_recusada)}%`,background:"#F87171"}}/>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:14,marginTop:5,fontSize:10.5,color:"#8AA9C6"}}>
                      <span>Fechado <strong style={{color:e.valor_aprovado?"#83DDA8":"#7E9DBB"}}>{brlCompacto(e.valor_aprovado)}</strong></span>
                      <span>Em jogo <strong style={{color:e.valor_aberto?"#DCE9F5":"#7E9DBB"}}>{brlCompacto(e.valor_aberto)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

// Grid da lista de orçamentos. Fica aqui e não no CSS do dashboard porque as
// colunas são deste painel — a `.preview-row` de lá tem outra proporção e o
// mesmo nome de classe em duas grades diferentes é como o bug do chip esticado
// voltou da última vez.
export const cssVendasInsights = `
  .venda-row { display:grid; grid-template-columns:2.2fr 1fr 0.8fr 0.9fr 0.8fr; column-gap:14px; align-items:center; padding:11px 18px; border-bottom:1px solid rgba(126,176,219,0.16); cursor:pointer; transition:background 0.13s; }
  .venda-row:hover { background:rgba(126,176,219,0.07); }
  .venda-row:last-child { border-bottom:none; }
  .venda-th { display:grid; grid-template-columns:2.2fr 1fr 0.8fr 0.9fr 0.8fr; column-gap:14px; align-items:center; padding:8px 18px; border-bottom:1px solid rgba(126,176,219,0.16); }
  .venda-row > .chip { justify-self:start; }
`;
