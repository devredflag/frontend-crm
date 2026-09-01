import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";

import { getToken } from "../services/auth";
import Dropdown from "./Dropdown";
import useIsMobile from "../hooks/useIsMobile";
import { dataLocal } from "../utils/data";
import { brlCompacto } from "../utils/moeda";

// Este gráfico saiu do /dashboard e passou a ser a peça central de /insights.
// O dashboard ficou com os cards filtrados e a prévia da carteira; a leitura
// de tendência — que exige escolher indicador e janela — vive na outra tela.
const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

/** Recorte da empresa que os indicadores usam. */
export interface EmpresaSerie {
  empresa_id: string;
  status: string;
  temperatura: string;
  criado_em: string | null;
  status_atualizado_em: string | null;
  ultima_interacao: string | null;
  data_proxima_acao: string | null;
}

// ── Evolução da base ────────────────────────────────────────
// Um gráfico só, com o indicador escolhido num dropdown. O período controla
// quantos meses entram na janela; o indicador controla o que é medido e,
// junto, quais quatro números aparecem no rodapé.
//
// Regra que vale para todos: só entra indicador que tem data real por trás.
// O backend guarda o status ATUAL da empresa e a data da última mudança
// (`status_atualizado_em`), não o histórico completo — então dá para saber
// em que mês algo virou Fechado ou Perdido (estados terminais), mas não
// reconstruir quantas empresas estavam "Em contato" em abril. Indicador que
// não pode ser calculado sem inventar não entra na lista.
const MESES_CURTOS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_LONGOS = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

function fimDoMes(base: Date, atras: number) {
  // Dia 0 do mês seguinte = último instante do mês alvo.
  return new Date(base.getFullYear(), base.getMonth() - atras + 1, 0, 23, 59, 59, 999);
}

interface Balde { rotulo: string; mes: number; inicio: Date; fim: Date }
const noBalde = (d: Date | null, b: Balde) => !!d && d >= b.inicio && d <= b.fim;

// Recortes de orçamento e evento — só os campos que o gráfico usa.
interface OrcamentoLite {
  status: string; total: number | string | null;
  criado_em: string | null; data_envio: string | null; data_decisao: string | null;
}
interface EventoLite { tipo: string; data: string }

type Fonte = "orcamentos" | "eventos";
interface Estatistica { rotulo: string; valor: string; cor?: string }
interface ContextoInd {
  empresas: EmpresaSerie[]; orcamentos: OrcamentoLite[]; eventos: EventoLite[];
  baldes: Balde[]; meses: number;
}

/** Variação assinada, com o sinal na frente do número e não do "R$". */
function variacaoFmt(n: number, moeda: boolean) {
  const sinal = n > 0 ? "+" : n < 0 ? "−" : "";
  return sinal + (moeda ? brlCompacto(Math.abs(n)) : String(Math.abs(n)));
}

/**
 * Rodapé padrão: valor do mês, variação contra o mês anterior, a perda
 * correspondente ao indicador e o fechamento do período.
 *
 * A série de perda é diferente em cada indicador (descartado, recusado,
 * valor perdido...) e SEMPRE sai de dado real — onde não existe fonte, o
 * indicador simplesmente não oferece esse número em vez de estimar.
 */
function statsPadrao(o: {
  rotuloPrincipal: string;
  valores: number[];
  rotuloPerda: string;
  perdas: number[];
  rotuloFecho?: string;
  /** Métrica de estoque (ex.: valor em negociação) fecha com o pico, não com a soma. */
  pico?: boolean;
  moeda?: boolean;
  cor: string;
}): Estatistica[] {
  const moeda = !!o.moeda;
  const fmt = (n: number) => moeda ? brlCompacto(n) : String(n);
  const atual = o.valores[o.valores.length - 1] ?? 0;
  const anterior = o.valores[o.valores.length - 2] ?? 0;
  const delta = atual - anterior;
  const perdaMes = o.perdas[o.perdas.length - 1] ?? 0;
  const fecho = o.pico
    ? Math.max(...o.valores, 0)
    : o.valores.reduce((s, v) => s + v, 0);
  return [
    { rotulo: o.rotuloPrincipal, valor: fmt(atual), cor: atual > 0 ? o.cor : "#B6CFE4" },
    { rotulo: "Variação no mês", valor: variacaoFmt(delta, moeda),
      cor: delta > 0 ? "#2CCD93" : delta < 0 ? "#F87171" : "#B6CFE4" },
    { rotulo: o.rotuloPerda, valor: fmt(perdaMes), cor: perdaMes > 0 ? "#F87171" : "#B6CFE4" },
    { rotulo: o.rotuloFecho ?? "Total no período", valor: fmt(fecho) },
  ];
}

interface Indicador {
  chave: string;
  rotulo: string;
  legenda: string;
  cor: string;
  moeda?: boolean;
  /** Dados extras que precisam ser buscados antes de calcular. */
  precisa: Fonte[];
  /** Avisa sobre empresas sem `criado_em` (só faz sentido em quem usa essa data). */
  avisaSemData?: boolean;
  calcular: (c: ContextoInd) => { valores: number[]; stats: Estatistica[] };
}

// Contagens reaproveitadas por vários indicadores.
const perdidasNoMes = (empresas: EmpresaSerie[], baldes: Balde[]) =>
  baldes.map(b => empresas.filter(e =>
    e.status === "Perdido" && noBalde(dataLocal(e.status_atualizado_em), b)
  ).length);
const recusadosNoMes = (orcamentos: OrcamentoLite[], baldes: Balde[]) =>
  baldes.map(b => orcamentos.filter(o =>
    o.status === "recusado" && noBalde(dataLocal(o.data_decisao), b)
  ).length);

const INDICADORES: Indicador[] = [
  {
    chave: "base", rotulo: "Base de clientes", legenda: "Crescimento de clientes",
    cor: "#56A4F5", precisa: [], avisaSemData: true,
    calcular: ({ empresas, baldes, meses }) => {
      const reais = empresas.filter(e => e.status !== "Rascunho");
      // Cumulativo: entrou quem nasceu até o corte, saiu quem virou Perdido até lá.
      const valores = baldes.map(b => reais.filter(e => {
        const nasceu = dataLocal(e.criado_em);
        if (!nasceu || nasceu > b.fim) return false;
        const saiu = e.status === "Perdido" ? dataLocal(e.status_atualizado_em) : null;
        return !(saiu && saiu <= b.fim);
      }).length);
      const ultimo = baldes[baldes.length - 1];
      const novos = reais.filter(e => noBalde(dataLocal(e.criado_em), ultimo)).length;
      const perdidos = reais.filter(e => e.status === "Perdido" && noBalde(dataLocal(e.status_atualizado_em), ultimo)).length;
      return {
        valores,
        stats: [
          { rotulo: "Base atual",        valor: String(reais.filter(e => e.status !== "Perdido").length) },
          { rotulo: "Novos no mês",      valor: `+${novos}`, cor: novos ? "#2CCD93" : "#B6CFE4" },
          { rotulo: "Perdidos no mês",   valor: perdidos ? `−${perdidos}` : "0", cor: perdidos ? "#F87171" : "#B6CFE4" },
          { rotulo: `Há ${meses} meses`, valor: String(valores[0] ?? 0) },
        ],
      };
    },
  },
  {
    chave: "novos", rotulo: "Leads captados", legenda: "Novos contatos entrando no funil",
    cor: "#2CCD93", precisa: [], avisaSemData: true,
    calcular: ({ empresas, baldes }) => {
      const reais = empresas.filter(e => e.status !== "Rascunho");
      const valores = baldes.map(b => reais.filter(e => noBalde(dataLocal(e.criado_em), b)).length);
      return { valores, stats: statsPadrao({
        rotuloPrincipal: "Leads no mês", valores,
        rotuloPerda: "Descartados no mês", perdas: perdidasNoMes(reais, baldes),
        cor: "#2CCD93",
      }) };
    },
  },
  {
    chave: "visitas", rotulo: "Visitas realizadas", legenda: "Visitas da agenda já cumpridas",
    cor: "#A78BFA", precisa: ["eventos"],
    calcular: ({ eventos, baldes }) => {
      const agora = new Date();
      const visitas = eventos.filter(ev => ev.tipo === "visita");
      const valores = baldes.map(b => visitas.filter(ev => {
        const d = dataLocal(ev.data);
        return noBalde(d, b) && !!d && d <= agora;   // agendada no futuro ainda não foi cumprida
      }).length);
      // O evento não guarda comparecimento, então "não compareceram" não tem
      // fonte. No lugar, o que ainda está por vir — que é acionável.
      const aFrente = baldes.map(b => visitas.filter(ev => {
        const d = dataLocal(ev.data);
        return noBalde(d, b) && !!d && d > agora;
      }).length);
      const stats = statsPadrao({
        rotuloPrincipal: "Visitas no mês", valores,
        rotuloPerda: "Ainda agendadas", perdas: aFrente,
        cor: "#A78BFA",
      });
      stats[2].cor = (aFrente[aFrente.length - 1] ?? 0) > 0 ? "#8FC4FA" : "#B6CFE4";
      return { valores, stats };
    },
  },
  {
    chave: "orcamentos", rotulo: "Orçamentos criados", legenda: "Orçamentos abertos por mês",
    cor: "#F0A05A", precisa: ["orcamentos"],
    calcular: ({ orcamentos, baldes }) => {
      const valores = baldes.map(b => orcamentos.filter(o => noBalde(dataLocal(o.criado_em), b)).length);
      return { valores, stats: statsPadrao({
        rotuloPrincipal: "Orçamentos no mês", valores,
        rotuloPerda: "Recusados no mês", perdas: recusadosNoMes(orcamentos, baldes),
        cor: "#F0A05A",
      }) };
    },
  },
  {
    chave: "propostas", rotulo: "Propostas enviadas", legenda: "Orçamentos que saíram para o cliente",
    cor: "#56A4F5", precisa: ["orcamentos"],
    calcular: ({ orcamentos, baldes }) => {
      const valores = baldes.map(b => orcamentos.filter(o => noBalde(dataLocal(o.data_envio), b)).length);
      return { valores, stats: statsPadrao({
        rotuloPrincipal: "Propostas no mês", valores,
        rotuloPerda: "Recusadas no mês", perdas: recusadosNoMes(orcamentos, baldes),
        cor: "#56A4F5",
      }) };
    },
  },
  {
    chave: "negociacao", rotulo: "Valor em negociação", legenda: "Soma das propostas em aberto",
    cor: "#F2C879", precisa: ["orcamentos"], moeda: true,
    calcular: ({ orcamentos, baldes }) => {
      // Métrica de ESTOQUE, reconstruída no fim de cada mês: já tinha saído
      // para o cliente (data_envio) e ainda não tinha decisão naquela data.
      // Um orçamento hoje aprovado esteve em negociação nos meses anteriores,
      // e é isso que data_envio + data_decisao permitem recuperar.
      const valores = baldes.map(b => orcamentos
        .filter(o => {
          const enviou = dataLocal(o.data_envio);
          if (!enviou || enviou > b.fim) return false;
          const decidiu = dataLocal(o.data_decisao);
          return !decidiu || decidiu > b.fim;
        })
        .reduce((s, o) => s + (Number(o.total) || 0), 0));
      const perdido = baldes.map(b => orcamentos
        .filter(o => o.status === "recusado" && noBalde(dataLocal(o.data_decisao), b))
        .reduce((s, o) => s + (Number(o.total) || 0), 0));
      return { valores, stats: statsPadrao({
        rotuloPrincipal: "Em negociação", valores,
        rotuloPerda: "Valor perdido", perdas: perdido,
        // Somar um estoque mês a mês contaria o mesmo orçamento várias vezes.
        rotuloFecho: "Pico no período", pico: true,
        moeda: true, cor: "#F2C879",
      }) };
    },
  },
  {
    chave: "fechados", rotulo: "Negócios fechados", legenda: "Empresas que viraram cliente",
    cor: "#2CCD93", precisa: [],
    calcular: ({ empresas, baldes }) => {
      // "Fechado" é estado terminal: a última mudança de status É o fechamento.
      const valores = baldes.map(b => empresas.filter(e =>
        e.status === "Fechado" && noBalde(dataLocal(e.status_atualizado_em), b)
      ).length);
      return { valores, stats: statsPadrao({
        rotuloPrincipal: "Fechados no mês", valores,
        rotuloPerda: "Perdidos no mês", perdas: perdidasNoMes(empresas, baldes),
        cor: "#2CCD93",
      }) };
    },
  },
  {
    chave: "perdidos", rotulo: "Negócios perdidos", legenda: "Empresas marcadas como perdidas",
    cor: "#F87171", precisa: [],
    calcular: ({ empresas, baldes }) => {
      const valores = perdidasNoMes(empresas, baldes);
      const fechados = baldes.map(b => empresas.filter(e =>
        e.status === "Fechado" && noBalde(dataLocal(e.status_atualizado_em), b)
      ).length);
      const stats = statsPadrao({
        rotuloPrincipal: "Perdidos no mês", valores,
        rotuloPerda: "Fechados no mês", perdas: fechados,
        cor: "#F87171",
      });
      // Único indicador onde subir é ruim: as cores da variação invertem, e a
      // terceira caixa é o contraponto positivo, não uma perda.
      stats[1].cor = stats[1].valor.startsWith("+") ? "#F87171"
                   : stats[1].valor.startsWith("−") ? "#2CCD93" : "#B6CFE4";
      stats[2].cor = (fechados[fechados.length - 1] ?? 0) > 0 ? "#2CCD93" : "#B6CFE4";
      return { valores, stats };
    },
  },
  {
    chave: "valor", rotulo: "Valor aprovado", legenda: "Soma dos orçamentos aprovados",
    cor: "#2CCD93", precisa: ["orcamentos"], moeda: true,
    calcular: ({ orcamentos, baldes }) => {
      const aprovados = orcamentos.filter(o => o.status === "aprovado");
      const valores = baldes.map(b => aprovados
        .filter(o => noBalde(dataLocal(o.data_decisao || o.data_envio || o.criado_em), b))
        .reduce((s, o) => s + (Number(o.total) || 0), 0));
      const perdido = baldes.map(b => orcamentos
        .filter(o => o.status === "recusado" && noBalde(dataLocal(o.data_decisao), b))
        .reduce((s, o) => s + (Number(o.total) || 0), 0));
      return { valores, stats: statsPadrao({
        rotuloPrincipal: "Aprovado no mês", valores,
        rotuloPerda: "Valor perdido", perdas: perdido,
        moeda: true, cor: "#2CCD93",
      }) };
    },
  },
];

/** Marcas do eixo Y em números redondos, ~4 divisões. */
function marcasEixo(maximo: number): number[] {
  if (maximo <= 0) return [0, 1];
  const bruto = maximo / 4;
  const expo = Math.floor(Math.log10(bruto));
  const base = Math.pow(10, expo);
  const n = bruto / base;
  const passo = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * base;
  const topo = Math.ceil(maximo / passo) * passo;
  const marcas: number[] = [];
  for (let v = 0; v <= topo + passo / 1000; v += passo) marcas.push(v);
  return marcas;
}

export default function EvolucaoDaBase({ empresas }: { empresas: EmpresaSerie[] }) {
  const isMobile = useIsMobile();
  const [meses, setMeses] = useState(6);
  const [chave, setChave] = useState("base");

  // Orçamentos e eventos só são buscados quando um indicador precisa deles —
  // quem só olha a base de clientes não paga duas requisições extras.
  const [orcamentos, setOrcamentos] = useState<OrcamentoLite[] | null>(null);
  const [eventos, setEventos] = useState<EventoLite[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [ativo, setAtivo] = useState<number | null>(null);   // mês sob o cursor

  const indicador = INDICADORES.find(i => i.chave === chave) || INDICADORES[0];

  useEffect(() => {
    const faltam = indicador.precisa.filter(f =>
      (f === "orcamentos" ? orcamentos : eventos) === null
    );
    if (faltam.length === 0) return;
    let vivo = true;
    setBuscando(true);
    (async () => {
      const cab = { Authorization: `Bearer ${getToken() || ""}` };
      await Promise.all(faltam.map(async fonte => {
        let dados: any[] = [];
        let ok = false;
        try {
          const r = await fetch(`${API}/${fonte}`, { headers: cab });
          if (r.ok) { dados = await r.json(); ok = true; }
        } catch { /* rede fora: cai no aviso abaixo */ }
        if (!vivo) return;
        if (!ok) setFalhou(true);
        // Grava mesmo em falha (lista vazia) para não repetir a chamada em loop.
        if (fonte === "orcamentos") setOrcamentos(dados); else setEventos(dados);
      }));
      if (vivo) setBuscando(false);
    })();
    return () => { vivo = false; };
  }, [indicador, orcamentos, eventos]);

  // Sem isto, trocar de 12 para 3 meses deixaria `ativo` apontando para um
  // índice que não existe mais e o tooltip apareceria fora do gráfico.
  useEffect(() => { setAtivo(null); }, [chave, meses]);

  const baldes = useMemo<Balde[]>(() => {
    const hoje = new Date();
    return Array.from({ length: meses }, (_, i) => {
      const fim = fimDoMes(hoje, meses - 1 - i);
      return {
        rotulo: MESES_CURTOS[fim.getMonth()],
        mes: fim.getMonth(),
        inicio: new Date(fim.getFullYear(), fim.getMonth(), 1, 0, 0, 0, 0),
        fim,
      };
    });
  }, [meses]);

  const { valores, stats } = useMemo(
    () => indicador.calcular({ empresas, orcamentos: orcamentos || [], eventos: eventos || [], baldes, meses }),
    [indicador, empresas, orcamentos, eventos, baldes, meses]
  );

  const semData = useMemo(
    () => empresas.filter(e => e.status !== "Rascunho" && !e.criado_em).length,
    [empresas]
  );

  // ── Geometria do gráfico ──
  // viewBox fixo (sem preserveAspectRatio="none", que esticava os traços e
  // impediria rótulo no eixo Y) escalado por width:100%.
  const W = 680, H = 250, L = 46, R = 14, T = 18, B = 34;
  const pw = W - L - R, ph = H - T - B;
  const marcas = marcasEixo(Math.max(...valores, 0));
  const topo = marcas[marcas.length - 1] || 1;
  const x = (i: number) => L + (i * pw) / Math.max(valores.length - 1, 1);
  const y = (v: number) => T + (1 - v / topo) * ph;
  const faixa = pw / Math.max(valores.length - 1, 1);

  const linha = valores.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${linha} ${x(valores.length - 1)},${T + ph} ${x(0)},${T + ph}`;
  const fmtValor = (n: number) => indicador.moeda ? brlCompacto(n) : String(n);

  const primeiro = baldes[0], ultimo = baldes[baldes.length - 1];
  const intervalo = primeiro && ultimo
    ? `${MESES_LONGOS[primeiro.mes]} a ${MESES_LONGOS[ultimo.mes]}`
    : "";
  const vazio = valores.every(v => v === 0);

  return (
    <motion.div className="glass-card" style={{padding:"22px 24px"}} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.45}}>

        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:16}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:16,fontWeight:800,color:"#FFFFFF",letterSpacing:"-0.01em"}}>{indicador.rotulo}</div>
            <div style={{fontSize:12,color:"#B6CFE4",marginTop:3}}>{indicador.legenda} · {intervalo}</div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap"}}>
            <Dropdown
              valor={chave} onChange={setChave} ariaLabel="Indicador do gráfico"
              largura={isMobile ? 170 : 196} altura={38} corAtiva={indicador.cor}
              opcoes={INDICADORES.map(i => ({ valor: i.chave, rotulo: i.rotulo, cor: i.cor }))}
            />
            <Dropdown
              valor={String(meses)} onChange={v => setMeses(Number(v))} ariaLabel="Período do gráfico"
              largura={isMobile ? 110 : 124} altura={38}
              opcoes={[3,6,12].map(n => ({ valor: String(n), rotulo: `${n} meses` }))}
            />
          </div>
        </div>

        {/* Números primeiro: o gráfico mostra a forma, as caixas dão a conta.
            Mudam junto com o indicador escolhido. */}
        <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?2:4},minmax(0,1fr))`,gap:10,marginBottom:18}}>
          {stats.map(s=>(
            <div key={s.rotulo} style={{background:"rgba(126,176,219,0.06)",border:"1px solid rgba(126,176,219,0.16)",borderRadius:12,padding:"12px 14px",minWidth:0}}>
              <div style={{fontSize:11.5,color:"#B6CFE4",marginBottom:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.rotulo}</div>
              <div style={{fontSize:21,fontWeight:800,color:s.cor||"#FFFFFF",letterSpacing:"-0.01em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.valor}</div>
            </div>
          ))}
        </div>

        {buscando ? (
          <div className="skeleton" style={{height:250,borderRadius:12}}/>
        ) : (
          // position:relative ancora o tooltip, que é posicionado em % do viewBox
          <div style={{position:"relative"}}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}
                 role="img" aria-label={`${indicador.rotulo} por mês: ${baldes.map((b,i)=>`${b.rotulo}, ${fmtValor(valores[i]??0)}`).join("; ")}`}>
              <defs>
                <linearGradient id={`grad-${indicador.chave}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={indicador.cor} stopOpacity="0.30"/>
                  <stop offset="100%" stopColor={indicador.cor} stopOpacity="0"/>
                </linearGradient>
              </defs>

              {/* Grade + escala. Sem os números do eixo, dava para ver que
                  uma curva subia, não de quanto para quanto. */}
              {marcas.map(m=>(
                <g key={m}>
                  <line x1={L} x2={W-R} y1={y(m)} y2={y(m)} stroke="rgba(126,176,219,0.14)" strokeWidth="1"/>
                  <text x={L-8} y={y(m)+3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="#8AA9C6">
                    {indicador.moeda ? brlCompacto(m).replace("R$ ","") : m.toLocaleString("pt-BR")}
                  </text>
                </g>
              ))}

              {!vazio && <polygon points={area} fill={`url(#grad-${indicador.chave})`}/>}
              <polyline points={linha} fill="none" stroke={indicador.cor} strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"/>

              {valores.map((v,i)=>{
                const fim = i === valores.length - 1;
                const on = ativo === i;
                return (
                  <g key={i}>
                    {on && <line x1={x(i)} x2={x(i)} y1={T} y2={T+ph} stroke={indicador.cor} strokeWidth="1" strokeDasharray="3 3" opacity="0.5"/>}
                    <circle cx={x(i)} cy={y(v)} r={fim||on?5:4}
                            fill={fim||on?indicador.cor:"#143354"} stroke={indicador.cor} strokeWidth="2"/>
                    <text x={x(i)} y={H-B+18} textAnchor="middle" fontSize="11"
                          fontWeight={fim||on?800:600} fill={fim||on?"#FFFFFF":"#B6CFE4"}>
                      {baldes[i]?.rotulo}
                    </text>
                  </g>
                );
              })}

              {/* Faixas de captura: o alvo do mouse é a coluna inteira, não o
                  ponto — acertar um círculo de 4px de raio é sofrimento. */}
              {valores.map((_,i)=>(
                <rect key={`h${i}`} x={x(i)-faixa/2} y={T} width={faixa} height={ph}
                      fill="transparent" tabIndex={0} role="button"
                      aria-label={`${baldes[i]?.rotulo}: ${fmtValor(valores[i]??0)}`}
                      onMouseEnter={()=>setAtivo(i)} onMouseLeave={()=>setAtivo(null)}
                      onFocus={()=>setAtivo(i)} onBlur={()=>setAtivo(null)}/>
              ))}
            </svg>

            {/* Tooltip com a variação contra o mês anterior — o mesmo número
                da caixa "Variação no mês", mas ponto a ponto. */}
            {ativo !== null && (()=>{
              const v = valores[ativo] ?? 0;
              const delta = ativo > 0 ? v - (valores[ativo-1] ?? 0) : null;
              return (
                <div style={{
                  position:"absolute", left:`${(x(ativo)/W)*100}%`, top:`${(y(v)/H)*100}%`,
                  transform:"translate(-50%,-125%)", pointerEvents:"none", zIndex:5,
                  background:"#0A1F33", border:"1px solid rgba(126,176,219,0.30)", borderRadius:8,
                  padding:"7px 10px", fontSize:12, whiteSpace:"nowrap", color:"#FFFFFF",
                  boxShadow:"0 8px 24px rgba(3,14,26,0.55)",
                }}>
                  <span style={{color:"#B6CFE4"}}>{baldes[ativo]?.rotulo}</span>
                  {"  "}
                  <span style={{fontWeight:800}}>{fmtValor(v)}</span>
                  {delta !== null && (
                    <>
                      {"  "}
                      <span style={{fontWeight:700,color:delta>0?"#2CCD93":delta<0?"#F87171":"#B6CFE4"}}>
                        {variacaoFmt(delta, !!indicador.moeda)}
                      </span>
                    </>
                  )}
                </div>
              );
            })()}

            {vazio && (
              <div style={{textAlign:"center",fontSize:12,color:"#B6CFE4",marginTop:-10}}>
                Nenhum registro de “{indicador.rotulo.toLowerCase()}” neste período.
              </div>
            )}
          </div>
        )}

        {falhou && indicador.precisa.length > 0 && (
          <div style={{marginTop:14,display:"flex",alignItems:"center",gap:7,fontSize:11,color:"#B6CFE4"}}>
            <Info style={{width:12,height:12,flexShrink:0,color:"#F0A05A"}}/>
            Não foi possível carregar os dados deste indicador — o gráfico está mostrando zero, não um resultado real.
          </div>
        )}

        {indicador.avisaSemData && semData>0&&(
          <div style={{marginTop:14,display:"flex",alignItems:"center",gap:7,fontSize:11,color:"#B6CFE4"}}>
            <Info style={{width:12,height:12,flexShrink:0,color:"#F0A05A"}}/>
            {semData} {semData===1?"empresa cadastrada antes":"empresas cadastradas antes"} do histórico existir — {semData===1?"conta":"contam"} na base atual, mas {semData===1?"não aparece":"não aparecem"} na curva.
          </div>
        )}
    </motion.div>
  );
}
