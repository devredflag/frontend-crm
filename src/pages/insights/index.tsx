import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, BarChart3, Boxes, Building2, Calendar, ClipboardList, Compass,
  LayoutDashboard, Menu, RefreshCw, Search, TrendingUp, Users, Users2, UserRoundCog,
} from "lucide-react";

import CardUsuario, { podeVerInsights, useUsuarioLogado } from "../../components/CardUsuario";
import FundoAzul from "../../components/FundoAzul";
import useEmpresasAoVivo, { notificarEmpresas } from "../../hooks/useEmpresasAoVivo";
import useIsMobile from "../../hooks/useIsMobile";
import { getToken } from "../../services/auth";
import {
  FILTRO_PADRAO, KPIS_DESTAQUE,
  aplicarFiltro, baldesMensais, calcularKpis, janelaAnterior, janelaMeses, segmentosDisponiveis,
} from "../../utils/metricas";
import type {
  Dados, EmpresaMetrica, EventoMetrica, Filtro, OrcamentoMetrica, UsuarioMetrica,
} from "../../utils/metricas";
import AbaCatalogo from "./AbaCatalogo";
import AbaFunil from "./AbaFunil";
import AbaRitmo from "./AbaRitmo";
import AbaTime from "./AbaTime";
import AbaVisaoGeral from "./AbaVisaoGeral";
import FiltroGlobal, { intervaloEmPalavras } from "./FiltroGlobal";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

// ─────────────────────────────────────────────────────────────────────────────
// Insights
//
// Esta tela existe para o gestor DEFINIR META, e por isso é diferente do
// dashboard: lá se olha a carteira de hoje (quem está em que etapa, o que abrir
// agora); aqui se olha a taxa — conversão, ciclo, ticket, cobertura — que é o
// que vira alvo do mês.
//
// ── As três decisões de estrutura ──────────────────────────────────────────
//
// 1. O FILTRO É GLOBAL. Antes o seletor de período morava dentro do card do
//    gráfico de evolução e os outros blocos o ignoravam, então dois números da
//    mesma tela podiam falar de janelas diferentes sem nada avisando. Agora ele
//    fica acima de tudo e vale para tudo — e onde um bloco não obedece (o
//    ranking de catálogo, que vem agregado do servidor), o próprio bloco diz.
//
// 2. TODO INDICADOR TEM COMPARAÇÃO. Uma taxa sozinha não vira meta: "32% de
//    conversão" só significa alguma coisa contra os 28% do semestre passado. A
//    referência é sempre a janela imediatamente anterior de mesmo tamanho, que é
//    o que o dado sustenta sem inventar. Onde o passado não é reconstruível, a
//    caixa diz "não tem histórico para comparar" em vez de mostrar um Δ falso.
//
// 3. QUATRO ABAS. A tela passou de 7 para 18 blocos; numa rolagem só, nenhum
//    deles seria lido. O filtro fica acima das abas, então trocar de aba nunca
//    troca o recorte por baixo do usuário.
//
// ── Hierarquia ─────────────────────────────────────────────────────────────
// O gerente vê a conta inteira, o supervisor vê a própria equipe. Esse recorte
// é feito no BACKEND (`escopo_vendedores`), e as quatro rotas que esta tela
// consome já chegam filtradas. O frontend NÃO ramifica em `is_gerente` para
// decidir o que medir — só rotula o que está sendo mostrado, para o supervisor
// não ler "conversão da empresa" onde está escrita a da equipe dele.
//
// ── A regra herdada, e mantida ─────────────────────────────────────────────
// Só entra métrica com dado real por trás. Onde a conta exigiria inventar, a
// caixa diz "sem base" em vez de mostrar um número bonito e falso. A aritmética
// toda mora em `utils/metricas.ts`, com testes — esta tela não pode ser aberta
// no navegador durante o desenvolvimento, e componente que faz conta na
// marcação seria número que ninguém consegue conferir.
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
  .kpi-card { background:#143354; border:1px solid rgba(126,176,219,0.16); border-radius:16px; padding:16px 18px; transition:border-color 0.18s, background 0.18s; }
  .kpi-card:hover { border-color:rgba(126,176,219,0.32); }
  .kpi-card:focus-visible, .aba-btn:focus-visible { outline:2px solid #56A4F5; outline-offset:2px; }
  .skeleton { background:linear-gradient(90deg,rgba(126,176,219,0.08) 25%,rgba(126,176,219,0.24) 50%,rgba(126,176,219,0.08) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
  .secao { font-size:10px; font-weight:700; letter-spacing:0.12em; color:rgba(182,207,228,0.7); text-transform:uppercase; margin-top:4px; }
  .linha-tabela { border-bottom:1px solid rgba(126,176,219,0.12); align-items:center; column-gap:14px; }
  .linha-tabela:last-child { border-bottom:none; }
  .aba-btn { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:11px; cursor:pointer; font-size:12.5px; font-weight:600; white-space:nowrap; border:1px solid rgba(126,176,219,0.16); background:#0F2E4B; color:#B6CFE4; transition:all 0.18s; }
  .aba-btn:hover { background:#143354; color:#FFFFFF; }
  .aba-btn[aria-selected="true"] { background:#1A3F63; color:#FFFFFF; border-color:rgba(126,176,219,0.42); box-shadow:inset 0 -2px 0 #56A4F5; }
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

type ChaveAba = "geral" | "funil" | "ritmo" | "time" | "catalogo";

// A ordem é a da pergunta que cada aba responde: quanto (geral) → onde trava
// (funil) → quando e por quê (ritmo) → quem (time) → o quê (catálogo). "Ritmo"
// vem depois de "Funil" porque só faz sentido depois de saber que a taxa
// existe: ela é a mesma conversão, aberta dia a dia.
const ABAS: { chave: ChaveAba; rotulo: string; curto: string; icone: any }[] = [
  { chave: "geral",    rotulo: "Visão geral",       curto: "Geral",    icone: BarChart3 },
  { chave: "funil",    rotulo: "Funil e conversão", curto: "Funil",    icone: Compass },
  { chave: "ritmo",    rotulo: "Ritmo e padrões",   curto: "Ritmo",    icone: Activity },
  { chave: "time",     rotulo: "Time",              curto: "Time",     icone: Users2 },
  { chave: "catalogo", rotulo: "Catálogo e base",   curto: "Catálogo", icone: Boxes },
];

interface Me {
  nome: string; email: string;
  is_gerente?: boolean; is_supervisor?: boolean;
  conta_nome?: string;
  /** Recursos do plano (GET /me). Insights é recurso pago — ver podeVerInsights. */
  recursos?: string[];
}

export default function Insights() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const usuarioMenu = useUsuarioLogado();
  const podeInsights = podeVerInsights(usuarioMenu);

  const [menuOpen, setMenuOpen] = useState(false);
  const [aba, setAba] = useState<ChaveAba>("geral");
  const [filtro, setFiltro] = useState<Filtro>(FILTRO_PADRAO);
  const [comparar, setComparar] = useState(true);
  const [kpiEscolhido, setKpiEscolhido] = useState(KPIS_DESTAQUE[0]);

  const [empresas, setEmpresas] = useState<EmpresaMetrica[]>([]);
  const empresasVivas = useEmpresasAoVivo<EmpresaMetrica>(setEmpresas);
  const [orcamentos, setOrcamentos] = useState<OrcamentoMetrica[]>([]);
  const [eventos, setEventos] = useState<EventoMetrica[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioMetrica[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [carregandoResto, setCarregandoResto] = useState(true);

  const ehGestor = !!(me?.is_gerente || me?.is_supervisor);

  const carregar = useCallback(async () => {
    notificarEmpresas();
    const cab = { Authorization: `Bearer ${getToken() || ""}` };
    const buscar = async <T,>(rota: string): Promise<T[] | null> => {
      try {
        const r = await fetch(`${API}/${rota}`, { headers: cab });
        return r.ok ? await r.json() : null;
      } catch {
        return null;   // rede fora: o bloco fica vazio, não quebra a tela
      }
    };
    try {
      const r = await fetch(`${API}/me`, { headers: cab });
      if (r.ok) setMe(await r.json());
    } catch { /* topo da tela cai para o rótulo genérico */ }

    // Em paralelo: são três rotas independentes e em série a tela levaria o
    // triplo do tempo para acabar de montar.
    const [orc, evs] = await Promise.all([
      buscar<OrcamentoMetrica>("orcamentos"),
      buscar<EventoMetrica>("eventos"),
    ]);
    if (orc) setOrcamentos(orc);
    if (evs) setEventos(evs);
    setCarregandoResto(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Tela de gestão (gerente e supervisor) é recurso pago. Esconder o item do
  // menu não fecha o caminho: /insights digitado direto abriria assim mesmo. Só
  // redireciona depois do /me responder — enquanto `me` é null não dá para
  // saber a função, e chutar expulsaria o gerente na própria carga da página.
  //
  // Isto é conveniência, não segurança: quem fecha o recurso de verdade é o
  // backend (`exigir_recurso` no main.py). Bundle editado não pode virar acesso.
  useEffect(() => {
    if (!me) return;
    if (!podeVerInsights(me)) navigate("/dashboard", { replace: true });
  }, [me, navigate]);

  // `/usuarios` exige gestor. Só é buscada depois do /me confirmar a função —
  // pedir antes devolveria 403 e poluiria o console. A lista já chega escopada
  // pelo backend: gerente recebe a conta, supervisor recebe a própria equipe.
  useEffect(() => {
    if (!ehGestor) return;
    let vivo = true;
    (async () => {
      try {
        const r = await fetch(`${API}/usuarios`, { headers: { Authorization: `Bearer ${getToken() || ""}` } });
        if (r.ok && vivo) setUsuarios(await r.json());
      } catch { /* a aba de time some, o resto da tela continua */ }
    })();
    return () => { vivo = false; };
  }, [ehGestor]);

  const brutos: Dados = useMemo(
    () => ({ empresas, orcamentos, eventos }),
    [empresas, orcamentos, eventos]
  );
  const dados = useMemo(() => aplicarFiltro(brutos, filtro), [brutos, filtro]);

  const segmentos = useMemo(() => segmentosDisponiveis(empresas), [empresas]);
  const baldes = useMemo(() => baldesMensais(filtro.meses), [filtro.meses]);
  const kpis = useMemo(
    () => calcularKpis(KPIS_DESTAQUE, dados, filtro.meses),
    [dados, filtro.meses]
  );

  const janela = janelaMeses(filtro.meses);
  const anterior = janelaAnterior(filtro.meses);
  const rotuloAnterior = intervaloEmPalavras(anterior.inicio, anterior.fim);

  const carregando = empresasVivas.carregando || carregandoResto;

  // Só o rótulo muda com a função — o dado já veio recortado do servidor.
  const escopoTexto = me?.is_gerente ? "Conta inteira"
    : me?.is_supervisor ? "Sua equipe" : "Sua carteira";

  // O recorte ativo vive no cabeçalho, que é o único elemento fixo da tela.
  //
  // A barra de filtro NÃO é fixa de propósito: ela e o cabeçalho dividem o
  // mesmo container de rolagem, e dois `position:sticky` em `top:0` ali não
  // coexistem — a de baixo desliza por trás da de cima e some. Repetir o
  // recorte aqui resolve o que a barra fixa resolveria (saber, no meio da
  // página, de que período é o número que se está lendo) sem ocupar o dobro
  // da altura no celular.
  const recorte = [
    escopoTexto,
    intervaloEmPalavras(janela.inicio, janela.fim),
    filtro.vendedor !== "todos"
      ? (usuarios.filter(u => u.usuario_id === filtro.vendedor)[0]?.nome || "vendedor")
      : null,
    filtro.segmento !== "todos" ? filtro.segmento : null,
  ].filter(Boolean).join(" · ");

  const props = { dados, filtro, isMobile };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
      <style>{css}</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
        <FundoAzul />
      </div>

      {isMobile && menuOpen && (
        <div onClick={() => setMenuOpen(false)}
             style={{ position: "fixed", inset: 0, background: "rgba(10,31,51,0.45)", zIndex: 999 }} />
      )}

      {/* Sidebar */}
      <div style={{ width: 220, flexShrink: 0, height: "100vh", overflowY: "auto", zIndex: 1000,
                    background: "linear-gradient(180deg,#10314F 0%,#0F2E4B 55%,#0D2942 100%)",
                    boxShadow: "1px 0 0 rgba(126,176,219,0.10), 6px 0 28px rgba(3,14,26,0.40)",
                    display: "flex", flexDirection: "column", padding: "0 12px 20px",
                    position: isMobile ? "fixed" : "relative", top: 0, left: 0,
                    transform: isMobile && !menuOpen ? "translateX(-100%)" : "translateX(0)",
                    transition: "transform 0.28s ease" }}>
        <div style={{ padding: "22px 4px 24px", borderBottom: "1px solid rgba(126,176,219,0.16)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#56A4F5",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 4px 14px rgba(3,14,26,0.45)" }}>
              <BarChart3 style={{ width: 18, height: 18, color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Prospecção</div>
              <div style={{ fontSize: 11, fontWeight: 700,
                            background: "linear-gradient(90deg,#56A4F5,#56A4F5,#2CCD93,#56A4F5)",
                            backgroundSize: "200% 200%", WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent", animation: "gradientShift 4s ease infinite" }}>
                CRM
              </div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.filter(nav => nav.label !== "Insights" || podeInsights).map(item => (
            <div key={item.label} className={`nav-item${item.path === "/insights" ? " active" : ""}`}
                 onClick={() => navigate(item.path)}>
              <item.icon style={{ width: 16, height: 16, flexShrink: 0 }} />{item.label}
            </div>
          ))}
          {ehGestor && (
            <div className="nav-item" onClick={() => navigate("/equipe")}>
              <UserRoundCog style={{ width: 16, height: 16 }} />Equipe
            </div>
          )}
        </nav>
        <CardUsuario />
      </div>

      {/* Main */}
      <div style={{ flex: 1, height: "100vh", overflowY: "auto", position: "relative", zIndex: 5 }}>

        <div style={{ position: "sticky", top: 0, zIndex: 20,
                      padding: isMobile ? "12px 14px" : "14px 28px",
                      background: "rgba(15,46,75,0.92)", backdropFilter: "blur(20px)",
                      borderBottom: "1px solid rgba(126,176,219,0.16)",
                      display: "flex", alignItems: "center", gap: isMobile ? 10 : 16 }}>
          {isMobile && (
            <button onClick={() => setMenuOpen(true)} aria-label="Abrir menu"
                    style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                             border: "1px solid rgba(126,176,219,0.16)", background: "#143354",
                             cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Menu style={{ width: 18, height: 18, color: "#B6CFE4" }} />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#B6CFE4", letterSpacing: "0.1em",
                          textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: "nowrap" }}>
              {/* O escopo vem primeiro para o supervisor não ler os números da
                  equipe dele como se fossem os da empresa; o período e os
                  filtros vêm em seguida porque, rolando a página, esta é a
                  única linha que ainda diz de que recorte é o número na tela. */}
              {me?.conta_nome ? `${me.conta_nome} · ${recorte}` : recorte}
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
              Insights
            </h1>
          </div>
          <button onClick={carregar} title="Recarregar" aria-label="Recarregar dados"
                  style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                           border: "1px solid rgba(126,176,219,0.16)", background: "#143354",
                           cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw style={{ width: 15, height: 15, color: "#B6CFE4" }} />
          </button>
        </div>

        <div style={{ padding: isMobile ? "14px" : "18px 28px", display: "flex",
                      flexDirection: "column", gap: 16 }}>

          <FiltroGlobal
            filtro={filtro} aoMudar={setFiltro} usuarios={usuarios} segmentos={segmentos}
            comparar={comparar} aoTrocarComparar={() => setComparar(v => !v)}
            intervalo={intervaloEmPalavras(janela.inicio, janela.fim)}
          />

          <div role="tablist" aria-label="Áreas dos insights"
               style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {ABAS.map(a => (
              <button key={a.chave} type="button" role="tab" className="aba-btn"
                      id={`aba-${a.chave}`} aria-controls={`painel-${a.chave}`}
                      aria-selected={aba === a.chave}
                      // Aba não selecionada sai da ordem de tabulação: com
                      // role="tablist", a navegação entre abas é por seta, e
                      // deixar as quatro tabuláveis faria o Tab passar por
                      // todas antes de chegar ao conteúdo.
                      tabIndex={aba === a.chave ? 0 : -1}
                      onKeyDown={e => {
                        const passo = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                        if (!passo) return;
                        e.preventDefault();
                        const i = ABAS.findIndex(x => x.chave === aba);
                        const proxima = ABAS[(i + passo + ABAS.length) % ABAS.length];
                        setAba(proxima.chave);
                        document.getElementById(`aba-${proxima.chave}`)?.focus();
                      }}
                      onClick={() => setAba(a.chave)}>
                <a.icone style={{ width: 14, height: 14, flexShrink: 0 }} aria-hidden="true" />
                {isMobile ? a.curto : a.rotulo}
              </button>
            ))}
          </div>

          {carregando ? (
            <Esqueleto isMobile={isMobile} />
          ) : (
            // A opacidade cai durante a revalidação em vez de o esqueleto
            // voltar: piscar a tela inteira a cada ciclo do relógio faz o
            // usuário perder o lugar onde estava lendo.
            <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`}
                 style={{ display: "flex", flexDirection: "column", gap: 16,
                          opacity: empresasVivas.carregando ? 0.6 : 1,
                          transition: "opacity 0.2s ease" }}>
              {aba === "geral" && (
                <AbaVisaoGeral {...props} kpis={kpis} baldes={baldes} comparar={comparar}
                  rotuloAnterior={rotuloAnterior} escolhido={kpiEscolhido}
                  aoEscolher={setKpiEscolhido} />
              )}
              {aba === "funil" && <AbaFunil {...props} />}
              {aba === "ritmo" && <AbaRitmo {...props} />}
              {aba === "time" && <AbaTime {...props} usuarios={usuarios} />}
              {aba === "catalogo" && <AbaCatalogo {...props} />}
            </div>
          )}

          <div style={{ height: 8 }} />
        </div>
      </div>
    </div>
  );
}

function Esqueleto({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gap: 14,
                    gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,minmax(0,1fr))" }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton" style={{ height: 150, borderRadius: 16 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 330, borderRadius: 16 }} />
    </div>
  );
}
