import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Search, Building2, Users, ClipboardList, Calendar,
  BarChart3, TrendingUp, Menu, RefreshCw, UserRoundCog, Info, Target,
  Percent, Clock, Wallet, Filter, Compass, Trophy,
} from "lucide-react";

import { getToken } from "../../services/auth";
import CardUsuario, { useUsuarioLogado } from "../../components/CardUsuario";
import FundoAzul from "../../components/FundoAzul";
import EvolucaoDaBase from "../../components/EvolucaoDaBase";
import PrecisamDeAtencao from "../../components/PrecisamDeAtencao";
import useIsMobile from "../../hooks/useIsMobile";
import useEmpresasAoVivo, { notificarEmpresas } from "../../hooks/useEmpresasAoVivo";
import { dataLocal, diasDesde, inicioDoDia } from "../../utils/data";
import { brl, brlCompacto } from "../../utils/moeda";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

// ─────────────────────────────────────────────────────────────────────────────
// Insights
//
// Esta tela existe para o gerente DEFINIR META, e por isso é diferente do
// dashboard: lá se olha a carteira de hoje (quem está em que etapa, o que abrir
// agora); aqui se olha a taxa — conversão, ciclo, ticket, cobertura — que é o
// que vira alvo do mês. O gráfico de evolução saiu do dashboard e veio para cá
// pelo mesmo motivo: ele responde "estamos melhorando?", não "o que faço
// agora?".
//
// Regra herdada do gráfico e mantida em todos os números daqui: só entra
// métrica com dado real por trás. O backend guarda o status ATUAL da empresa e
// a data da última mudança, não o histórico completo — então dá para medir
// desfecho (fechou/perdeu) e o retrato do funil hoje, mas NÃO a passagem
// histórica entre etapas. Onde a conta não é possível sem inventar, a caixa diz
// "sem base" em vez de mostrar um número bonito e falso.
// ─────────────────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
  @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
  .nav-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-radius:10px; cursor:pointer; font-size:13.5px; font-weight:500; color:#FFFFFF; transition:all 0.18s; user-select:none; }
  .nav-item:hover { background:rgba(126,176,219,0.08); color:#fff; }
  .nav-item.active { background:rgba(126,176,219,0.08); color:#fff; font-weight:600; }
  .glass-card { background:#143354; border:1px solid rgba(126,176,219,0.16); border-radius:16px; }
  .kpi-card { background:#143354; border:1px solid rgba(126,176,219,0.16); border-radius:16px; padding:16px 18px; transition:border-color 0.18s; }
  .kpi-card:hover { border-color:rgba(126,176,219,0.32); }
  .skeleton { background:linear-gradient(90deg,rgba(126,176,219,0.08) 25%,rgba(126,176,219,0.24) 50%,rgba(126,176,219,0.08) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
  .secao { font-size:10px; font-weight:700; letter-spacing:0.12em; color:rgba(182,207,228,0.7); text-transform:uppercase; }
  .linha-tabela { border-bottom:1px solid rgba(126,176,219,0.12); align-items:center; column-gap:14px; padding:11px 18px; }
  .linha-tabela:last-child { border-bottom:none; }
  .linha-tabela > .chip { justify-self:start; }
  .chip { display:inline-flex; align-items:center; gap:3px; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; white-space:nowrap; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(86,164,245,0.25); border-radius:4px; }
`;

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",         path: "/dashboard" },
  { icon: TrendingUp,      label: "Insights",           path: "/insights" },
  { icon: Search,          label: "Buscar Empresas",    path: "/buscar" },
  { icon: Building2,       label: "Cadastrar Empresas", path: "/empresas/nova" },
  { icon: Users,           label: "Todos os clientes",  path: "/clientes" },
  { icon: ClipboardList,   label: "Gerenciamento",      path: "/gerenciamento" },
  { icon: Calendar,        label: "Calendário",         path: "/calendario" },
];

// Mesmas etapas e cores do kanban do Gerenciamento. Perdido não entra no funil
// desenhado — é saída, não etapa — e aparece só no cálculo da conversão.
const FUNIL = [
  { key: "Lead",            cor: "#8FC4FA" },
  { key: "Em contato",      cor: "#56A4F5" },
  { key: "Visita agendada", cor: "#22D3EE" },
  { key: "Proposta",        cor: "#A78BFA" },
  { key: "Negociação",      cor: "#F0A05A" },
  { key: "Fechado",         cor: "#2CCD93" },
];

interface Empresa {
  empresa_id: string; nome: string; segmento: string; porte: string;
  cidade: string; status: string; temperatura: string;
  origem_lead: string; ultima_interacao: string | null;
  criado_em: string | null; status_atualizado_em: string | null;
  data_proxima_acao: string | null; vendedor_id: string | null;
}
interface Orcamento {
  orcamento_id: string; empresa_id: string; status: string;
  total: number | string | null; vendedor_id: string | null;
  criado_em: string | null; data_envio: string | null; data_decisao: string | null;
}
interface UsuarioRow { usuario_id: string; nome: string; role: string; ativo: boolean }
interface Me { nome: string; email: string; is_gerente?: boolean; is_supervisor?: boolean; conta_nome?: string }

const ABERTOS = ["enviado", "em_negociacao"];
const pct = (parte: number, todo: number) => (todo > 0 ? (parte / todo) * 100 : 0);
const pctFmt = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/** Média que devolve null em vez de NaN quando não há amostra. */
function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

/** Dias entre duas datas da API, ou null se faltar alguma. */
function diasEntre(de?: string | null, ate?: string | null): number | null {
  const a = dataLocal(de), b = dataLocal(ate);
  if (!a || !b) return null;
  const d = Math.round((inicioDoDia(b).getTime() - inicioDoDia(a).getTime()) / 86_400_000);
  return d < 0 ? null : d;
}

// ── Caixa de indicador ───────────────────────────────────────
// `base` é o denominador da conta e fica visível de propósito: uma conversão de
// 100% sobre dois negócios não é a mesma informação que 100% sobre duzentos, e
// meta cravada sem olhar a amostra é meta chutada.
function Kpi({ icone: Icone, rotulo, valor, base, cor, comoCalcula }: {
  icone: any; rotulo: string; valor: string | null; base: string;
  cor: string; comoCalcula: string;
}) {
  return (
    <div className="kpi-card" title={comoCalcula}>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
        <div style={{width:30,height:30,borderRadius:9,background:`${cor}1F`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Icone style={{width:15,height:15,color:cor}}/>
        </div>
        <span style={{fontSize:11.5,fontWeight:600,color:"#B6CFE4",minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{rotulo}</span>
      </div>
      <div style={{fontSize:26,fontWeight:900,letterSpacing:"-0.03em",color:valor === null ? "#7E9DBB" : cor}}>
        {valor ?? "sem base"}
      </div>
      <div style={{fontSize:11,color:"#8AA9C6",marginTop:5}}>{base}</div>
    </div>
  );
}

/** Cabeçalho de bloco, com o subtítulo dizendo que meta sai dali. */
function TituloBloco({ icone: Icone, titulo, sub, cor }: { icone: any; titulo: string; sub: string; cor: string }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
      <div style={{width:30,height:30,borderRadius:9,background:`${cor}1F`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Icone style={{width:15,height:15,color:cor}}/>
      </div>
      <div style={{minWidth:0}}>
        <div style={{fontSize:15,fontWeight:800,color:"#FFFFFF",letterSpacing:"-0.01em"}}>{titulo}</div>
        <div style={{fontSize:11.5,color:"#B6CFE4",marginTop:2}}>{sub}</div>
      </div>
    </div>
  );
}

function VazioBloco({ texto }: { texto: string }) {
  return (
    <div style={{padding:"28px 12px",textAlign:"center",fontSize:12.5,color:"#B6CFE4"}}>{texto}</div>
  );
}

export default function Insights() {
  const navigate = useNavigate();
  // Insights e tela de gestao: fica fora do menu de quem nao e gerente.
  const ehGerenteMenu = !!useUsuarioLogado()?.is_gerente;
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const empresasVivas = useEmpresasAoVivo<Empresa>(setEmpresas);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [carregandoOrc, setCarregandoOrc] = useState(true);

  const ehGestor = !!(me?.is_gerente || me?.is_supervisor);

  const carregar = useCallback(async () => {
    notificarEmpresas();
    const cab = { Authorization: `Bearer ${getToken() || ""}` };
    try {
      const r = await fetch(`${API}/me`, { headers: cab });
      if (r.ok) setMe(await r.json());
    } catch { /* topo da tela cai para o rótulo genérico */ }
    try {
      const r = await fetch(`${API}/orcamentos`, { headers: cab });
      if (r.ok) setOrcamentos(await r.json());
    } catch { /* os blocos de dinheiro ficam zerados; o aviso abaixo explica */ }
    setCarregandoOrc(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Tela de gestao. Esconder o item do menu nao fecha o caminho: /insights
  // digitado direto abriria assim mesmo. So redireciona depois do /me responder
  // -- enquanto `me` e null nao da para saber a funcao, e chutar expulsaria o
  // gerente na propria carga da pagina.
  useEffect(() => {
    if (me && !me.is_gerente) navigate("/dashboard", { replace: true });
  }, [me, navigate]);

  // A lista de usuários é rota de gestor: pedir como vendedor volta 403 e
  // polui o console. Só é buscada depois do /me confirmar a função.
  useEffect(() => {
    if (!ehGestor) return;
    let vivo = true;
    (async () => {
      try {
        const r = await fetch(`${API}/usuarios`, { headers: { Authorization: `Bearer ${getToken() || ""}` } });
        if (r.ok && vivo) setUsuarios(await r.json());
      } catch { /* a tabela por vendedor some, o resto da tela continua */ }
    })();
    return () => { vivo = false; };
  }, [ehGestor]);

  // Rascunho nunca entra em métrica: é cadastro pela metade, não negócio.
  const reais = useMemo(() => empresas.filter(e => e.status !== "Rascunho"), [empresas]);

  // ── Indicadores do topo ──
  const kpis = useMemo(() => {
    const fechados = reais.filter(e => e.status === "Fechado");
    const perdidos = reais.filter(e => e.status === "Perdido");
    const decididos = fechados.length + perdidos.length;

    const ciclos = fechados
      .map(e => diasEntre(e.criado_em, e.status_atualizado_em))
      .filter((d): d is number => d !== null);
    const cicloMedio = media(ciclos);

    const aprovados = orcamentos.filter(o => o.status === "aprovado");
    const recusados = orcamentos.filter(o => o.status === "recusado");
    const valorAprovado = aprovados.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const ticket = aprovados.length ? valorAprovado / aprovados.length : null;
    const emAberto = orcamentos
      .filter(o => ABERTOS.includes(o.status))
      .reduce((s, o) => s + (Number(o.total) || 0), 0);
    const decididosOrc = aprovados.length + recusados.length;

    // Empresa "ativa" = ainda em jogo. Fechada e perdida não têm follow-up a
    // cobrar, e contá-las derrubaria a cobertura sem que ninguém errasse nada.
    const ativas = reais.filter(e => e.status !== "Fechado" && e.status !== "Perdido");
    const comRetorno = ativas.filter(e => {
      const d = dataLocal(e.data_proxima_acao);
      return !!d && inicioDoDia(d).getTime() >= inicioDoDia().getTime();
    }).length;

    return [
      {
        icone: Percent, cor: "#2CCD93", rotulo: "Taxa de conversão",
        valor: decididos ? pctFmt(pct(fechados.length, decididos)) : null,
        base: decididos ? `${fechados.length} de ${decididos} com desfecho` : "nenhum negócio decidido ainda",
        comoCalcula: "Fechados ÷ (fechados + perdidos). Empresa ainda no funil não entra na conta — ela não decidiu nada.",
      },
      {
        icone: Clock, cor: "#8FC4FA", rotulo: "Ciclo médio de fechamento",
        valor: cicloMedio === null ? null : `${Math.round(cicloMedio)} dias`,
        base: ciclos.length ? `média de ${ciclos.length} fechamento${ciclos.length !== 1 ? "s" : ""}` : "nenhum fechamento com data",
        comoCalcula: "Dias entre o cadastro da empresa e a data em que ela virou Fechado. Só conta quem tem as duas datas.",
      },
      {
        icone: Wallet, cor: "#F2C879", rotulo: "Ticket médio",
        valor: ticket === null ? null : brl(ticket, 0),
        base: aprovados.length ? `${aprovados.length} orçamento${aprovados.length !== 1 ? "s" : ""} aprovado${aprovados.length !== 1 ? "s" : ""}` : "nenhum orçamento aprovado",
        comoCalcula: "Valor total aprovado ÷ quantidade de orçamentos aprovados.",
      },
      {
        icone: TrendingUp, cor: "#56A4F5", rotulo: "Pipeline em aberto",
        valor: brl(emAberto, 0),
        base: `${orcamentos.filter(o => ABERTOS.includes(o.status)).length} proposta(s) sem decisão`,
        comoCalcula: "Soma dos orçamentos enviados e em negociação. Rascunho fica de fora: enquanto não sai daqui, não é dinheiro em jogo.",
      },
      {
        icone: Target, cor: "#A78BFA", rotulo: "Aprovação de proposta",
        valor: decididosOrc ? pctFmt(pct(aprovados.length, decididosOrc)) : null,
        base: decididosOrc ? `${aprovados.length} de ${decididosOrc} decididas` : "nenhuma proposta decidida",
        comoCalcula: "Orçamentos aprovados ÷ (aprovados + recusados). Mede a proposta; a taxa de conversão mede o funil inteiro.",
      },
      {
        icone: Filter, cor: "#F0A05A", rotulo: "Cobertura de follow-up",
        valor: ativas.length ? pctFmt(pct(comRetorno, ativas.length)) : null,
        base: ativas.length ? `${comRetorno} de ${ativas.length} empresas ativas` : "nenhuma empresa ativa",
        comoCalcula: "Empresas ainda no funil com retorno marcado para hoje ou depois ÷ total de empresas ativas.",
      },
    ];
  }, [reais, orcamentos]);

  // ── Retrato do funil ──
  // Contagem por etapa AGORA, com o valor em orçamento de cada uma. Não é taxa
  // de passagem: sem histórico de status, dizer quanto do Lead virou Proposta
  // seria invenção.
  const funil = useMemo(() => {
    const valorPorEmpresa = new Map<string, number>();
    for (const o of orcamentos) {
      if (!ABERTOS.includes(o.status) && o.status !== "aprovado") continue;
      valorPorEmpresa.set(o.empresa_id, (valorPorEmpresa.get(o.empresa_id) || 0) + (Number(o.total) || 0));
    }
    const total = reais.length;
    return FUNIL.map(etapa => {
      const naEtapa = reais.filter(e => e.status === etapa.key);
      return {
        ...etapa,
        quantidade: naEtapa.length,
        fatia: pct(naEtapa.length, total),
        valor: naEtapa.reduce((s, e) => s + (valorPorEmpresa.get(e.empresa_id) || 0), 0),
      };
    });
  }, [reais, orcamentos]);

  const perdidasTotal = useMemo(() => reais.filter(e => e.status === "Perdido").length, [reais]);

  // ── Desempenho por vendedor ──
  const porVendedor = useMemo(() => {
    if (!ehGestor) return [];
    const vendedores = usuarios.filter(u => u.role === "vendedor" || u.role === "supervisor");
    const linhas = vendedores.map(u => {
      const carteira = reais.filter(e => e.vendedor_id === u.usuario_id);
      const fechados = carteira.filter(e => e.status === "Fechado").length;
      const perdidos = carteira.filter(e => e.status === "Perdido").length;
      const meus = orcamentos.filter(o => o.vendedor_id === u.usuario_id);
      const paradas = carteira.filter(e =>
        e.status !== "Fechado" && e.status !== "Perdido" && diasDesde(e.ultima_interacao) >= 15
      ).length;
      return {
        id: u.usuario_id,
        nome: u.nome,
        ativo: u.ativo,
        carteira: carteira.length,
        fechados,
        conversao: fechados + perdidos > 0 ? pct(fechados, fechados + perdidos) : null,
        aberto: meus.filter(o => ABERTOS.includes(o.status)).reduce((s, o) => s + (Number(o.total) || 0), 0),
        aprovado: meus.filter(o => o.status === "aprovado").reduce((s, o) => s + (Number(o.total) || 0), 0),
        paradas,
      };
    });
    // Quem trouxe mais dinheiro primeiro; empate desempata pela carteira, para
    // a lista não reordenar sozinha a cada polling.
    return linhas.sort((a, b) => b.aprovado - a.aprovado || b.carteira - a.carteira || a.nome.localeCompare(b.nome));
  }, [ehGestor, usuarios, reais, orcamentos]);

  // ── Origem do lead ──
  // De onde vem quem FECHA, não de onde vem quem entra. É a métrica que decide
  // onde o time gasta a próxima hora de prospecção.
  const porOrigem = useMemo(() => {
    const mapa = new Map<string, { total: number; fechados: number; perdidos: number }>();
    for (const e of reais) {
      const chave = (e.origem_lead || "").trim() || "Sem origem";
      const atual = mapa.get(chave) || { total: 0, fechados: 0, perdidos: 0 };
      atual.total += 1;
      if (e.status === "Fechado") atual.fechados += 1;
      if (e.status === "Perdido") atual.perdidos += 1;
      mapa.set(chave, atual);
    }
    return Array.from(mapa.entries())
      .map(([origem, v]) => ({
        origem,
        ...v,
        conversao: v.fechados + v.perdidos > 0 ? pct(v.fechados, v.fechados + v.perdidos) : null,
      }))
      .sort((a, b) => b.fechados - a.fechados || b.total - a.total)
      .slice(0, 8);
  }, [reais]);

  const carregando = empresasVivas.carregando || carregandoOrc;
  const gridVend = "1.6fr 90px 90px 100px 1fr 1fr 100px";

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",position:"relative"}}>
      <style>{css}</style>

      <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
        <FundoAzul />
      </div>

      {isMobile && menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{position:"fixed",inset:0,background:"rgba(10,31,51,0.45)",zIndex:999}}/>
      )}

      {/* Sidebar */}
      <div style={{width:220,flexShrink:0,height:"100vh",overflowY:"auto",zIndex:1000,background:"linear-gradient(180deg,#10314F 0%,#0F2E4B 55%,#0D2942 100%)",boxShadow:"1px 0 0 rgba(126,176,219,0.10), 6px 0 28px rgba(3,14,26,0.40)",display:"flex",flexDirection:"column",padding:"0 12px 20px",
        position: isMobile ? "fixed" : "relative", top:0, left:0,
        transform: isMobile && !menuOpen ? "translateX(-100%)" : "translateX(0)",
        transition:"transform 0.28s ease"}}>
        <div style={{padding:"22px 4px 24px",borderBottom:"1px solid rgba(126,176,219,0.16)",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#56A4F5,#56A4F5)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 14px rgba(3,14,26,0.45)"}}>
              <BarChart3 style={{width:18,height:18,color:"#fff"}}/>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>Prospecção</div>
              <div style={{fontSize:11,fontWeight:700,background:"linear-gradient(90deg,#56A4F5,#56A4F5,#2CCD93,#56A4F5)",backgroundSize:"200% 200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"gradientShift 4s ease infinite"}}>CRM</div>
            </div>
          </div>
        </div>
        <nav style={{flex:1,display:"flex",flexDirection:"column",gap:2}}>
          {navItems.filter(nav => nav.label !== "Insights" || ehGerenteMenu).map(item => (
            <div key={item.label} className={`nav-item${item.path === "/insights" ? " active" : ""}`} onClick={() => navigate(item.path)}>
              <item.icon style={{width:16,height:16,flexShrink:0}}/>{item.label}
            </div>
          ))}
          {ehGestor && (
            <div className="nav-item" onClick={() => navigate("/equipe")}>
              <UserRoundCog style={{width:16,height:16}}/>Equipe
            </div>
          )}
        </nav>
        <CardUsuario />
      </div>

      {/* Main */}
      <div style={{flex:1,height:"100vh",overflowY:"auto",position:"relative",zIndex:5}}>

        <div style={{position:"sticky",top:0,zIndex:20,padding:isMobile?"12px 14px":"14px 28px",background:"rgba(15,46,75,0.88)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(126,176,219,0.16)",display:"flex",alignItems:"center",gap:isMobile?10:16}}>
          {isMobile && (
            <button onClick={() => setMenuOpen(true)} style={{width:36,height:36,borderRadius:10,border:"1px solid rgba(126,176,219,0.16)",background:"#143354",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Menu style={{width:18,height:18,color:"#B6CFE4"}}/>
            </button>
          )}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,fontWeight:700,color:"#B6CFE4",letterSpacing:"0.1em",textTransform:"uppercase"}}>{me?.conta_nome || "Análise"}</div>
            <h1 style={{fontSize:18,fontWeight:800,color:"#FFFFFF",letterSpacing:"-0.02em"}}>Insights</h1>
          </div>
          <button onClick={carregar} title="Recarregar" style={{width:38,height:38,borderRadius:10,border:"1px solid rgba(126,176,219,0.16)",background:"#143354",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <RefreshCw style={{width:15,height:15,color:"#B6CFE4"}}/>
          </button>
        </div>

        <div style={{padding:isMobile?"14px":"22px 28px",display:"flex",flexDirection:"column",gap:18}}>

          {/* Para que serve a tela. Sem isso, ela vira "mais um dashboard" e o
              gerente não percebe que é daqui que sai a meta do mês. */}
          <div className="glass-card" style={{padding:"14px 18px",display:"flex",alignItems:"flex-start",gap:11,background:"rgba(86,164,245,0.06)",borderColor:"rgba(86,164,245,0.22)"}}>
            <Info style={{width:15,height:15,color:"#56A4F5",flexShrink:0,marginTop:1}}/>
            <div style={{fontSize:12.5,color:"#DCE9F5",lineHeight:1.55}}>
              <strong style={{color:"#FFFFFF"}}>Daqui saem as metas.</strong>{" "}
              Cada indicador mostra o denominador que usou — a taxa e a amostra andam juntas, porque meta cravada
              sobre três negócios não é meta. Passe o mouse em qualquer caixa para ver como o número é calculado.
            </div>
          </div>

          <div className="secao">Indicadores do período</div>
          {carregando ? (
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,minmax(0,1fr))",gap:14}}>
              {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{height:126,borderRadius:16}}/>)}
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,minmax(0,1fr))",gap:14}}>
              {kpis.map((k, i) => (
                <motion.div key={k.rotulo} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.3,delay:i*0.04}}>
                  <Kpi {...k}/>
                </motion.div>
              ))}
            </div>
          )}

          <div className="secao">Evolução</div>
          <EvolucaoDaBase empresas={empresas}/>

          <div className="secao">Onde a base está</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1fr) 330px",gap:16,alignItems:"stretch"}}>

            {/* Funil */}
            <motion.div className="glass-card" style={{padding:"22px 24px"}} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.35}}>
              <TituloBloco icone={Compass} cor="#56A4F5" titulo="Retrato do funil"
                sub={`${reais.length} empresa${reais.length !== 1 ? "s" : ""} na base · ${perdidasTotal} perdida${perdidasTotal !== 1 ? "s" : ""} fora do funil`}/>

              {reais.length === 0 ? (
                <VazioBloco texto="Nenhuma empresa cadastrada ainda."/>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:13}}>
                  {funil.map(f => (
                    <div key={f.key}>
                      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:10,marginBottom:5}}>
                        <span style={{fontSize:12.5,fontWeight:700,color:"#FFFFFF"}}>{f.key}</span>
                        <span style={{fontSize:11.5,color:"#B6CFE4",whiteSpace:"nowrap"}}>
                          <strong style={{color:f.quantidade ? f.cor : "#7E9DBB",fontSize:13}}>{f.quantidade}</strong>
                          {"  ·  "}{pctFmt(f.fatia)}
                          {f.valor > 0 && <>{"  ·  "}<span style={{color:"#DCE9F5"}}>{brlCompacto(f.valor)}</span></>}
                        </span>
                      </div>
                      <div style={{height:8,borderRadius:6,background:"rgba(126,176,219,0.10)",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${Math.max(f.fatia, f.quantidade ? 2 : 0)}%`,background:f.cor,borderRadius:6,transition:"width 0.4s ease"}}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{marginTop:16,display:"flex",alignItems:"flex-start",gap:7,fontSize:11,color:"#8AA9C6",lineHeight:1.5}}>
                <Info style={{width:12,height:12,flexShrink:0,color:"#F0A05A",marginTop:1}}/>
                Retrato de hoje, não taxa de passagem: o sistema guarda o status atual da empresa e a data da última
                mudança, não o caminho que ela fez entre as etapas.
              </div>
            </motion.div>

            <PrecisamDeAtencao empresas={empresas}/>
          </div>

          {ehGestor && (
            <>
              <div className="secao">Equipe</div>
              <motion.div className="glass-card" style={{padding:"22px 0 8px",overflow:"hidden"}} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.35}}>
                <div style={{padding:"0 24px"}}>
                  <TituloBloco icone={Trophy} cor="#F2C879" titulo="Desempenho por vendedor"
                    sub="Ordenado pelo valor já aprovado — a meta individual sai desta linha"/>
                </div>

                {porVendedor.length === 0 ? (
                  <VazioBloco texto="Nenhum vendedor no seu escopo ainda."/>
                ) : (
                  <div style={{overflowX:"auto"}}>
                    <div style={{minWidth:isMobile?720:undefined}}>
                      <div className="linha-tabela" style={{display:"grid",gridTemplateColumns:gridVend}}>
                        {["Vendedor","Carteira","Fechados","Conversão","Em aberto","Aprovado","Parados 15d+"].map((h,i) => (
                          <span key={h} style={{fontSize:10,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:"#B6CFE4",textAlign:i===0?"left":"right"}}>{h}</span>
                        ))}
                      </div>
                      {porVendedor.map(v => (
                        <div key={v.id} className="linha-tabela" style={{display:"grid",gridTemplateColumns:gridVend}}>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:12.5,fontWeight:700,color:"#FFFFFF",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.nome}</div>
                            {!v.ativo && <div style={{fontSize:10,color:"#F0A05A",marginTop:2}}>inativo</div>}
                          </div>
                          <span style={{fontSize:12,color:"#DCE9F5",textAlign:"right"}}>{v.carteira}</span>
                          <span style={{fontSize:12,fontWeight:700,color:v.fechados ? "#2CCD93" : "#7E9DBB",textAlign:"right"}}>{v.fechados}</span>
                          <span style={{fontSize:12,color:v.conversao === null ? "#7E9DBB" : "#DCE9F5",textAlign:"right"}}>
                            {v.conversao === null ? "—" : pctFmt(v.conversao)}
                          </span>
                          <span style={{fontSize:12,color:v.aberto ? "#FFFFFF" : "#7E9DBB",textAlign:"right"}}>{v.aberto ? brlCompacto(v.aberto) : "—"}</span>
                          <span style={{fontSize:12,fontWeight:700,color:v.aprovado ? "#83DDA8" : "#7E9DBB",textAlign:"right"}}>{v.aprovado ? brlCompacto(v.aprovado) : "—"}</span>
                          <span style={{fontSize:12,fontWeight:700,color:v.paradas ? "#F0A05A" : "#7E9DBB",textAlign:"right"}}>{v.paradas}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}

          <div className="secao">De onde vem o cliente</div>
          <motion.div className="glass-card" style={{padding:"22px 24px"}} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.35}}>
            <TituloBloco icone={Compass} cor="#A78BFA" titulo="Origem dos leads"
              sub="Ordenado por quem mais fecha, não por quem mais entra"/>

            {porOrigem.length === 0 ? (
              <VazioBloco texto="Nenhuma empresa cadastrada ainda."/>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                <div className="linha-tabela" style={{display:"grid",gridTemplateColumns:"2fr 90px 90px 110px",padding:"8px 0"}}>
                  {["Origem","Entradas","Fechados","Conversão"].map((h,i) => (
                    <span key={h} style={{fontSize:10,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:"#B6CFE4",textAlign:i===0?"left":"right"}}>{h}</span>
                  ))}
                </div>
                {porOrigem.map(o => (
                  <div key={o.origem} className="linha-tabela" style={{display:"grid",gridTemplateColumns:"2fr 90px 90px 110px",padding:"11px 0"}}>
                    <span style={{fontSize:12.5,fontWeight:600,color:"#FFFFFF",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.origem}</span>
                    <span style={{fontSize:12,color:"#DCE9F5",textAlign:"right"}}>{o.total}</span>
                    <span style={{fontSize:12,fontWeight:700,color:o.fechados ? "#2CCD93" : "#7E9DBB",textAlign:"right"}}>{o.fechados}</span>
                    <span style={{fontSize:12,color:o.conversao === null ? "#7E9DBB" : "#DCE9F5",textAlign:"right"}}
                      title={o.conversao === null ? "Nenhum negócio decidido nesta origem" : `${o.fechados} de ${o.fechados + o.perdidos} decididos`}>
                      {o.conversao === null ? "—" : pctFmt(o.conversao)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <div style={{height:8}}/>
        </div>
      </div>
    </div>
  );
}
