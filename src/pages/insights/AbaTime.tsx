/**
 * Aba 3 — Time.
 *
 * ── Hierarquia ─────────────────────────────────────────────────────────────
 * Esta aba é a mesma para o gerente e para o supervisor. A diferença não é
 * feita aqui: o backend (`escopo_vendedores`) já entregou ao gerente a conta
 * inteira e ao supervisor apenas a si mesmo e os vendedores que apontam para
 * ele. Reimplementar o recorte no frontend criaria uma segunda regra de
 * hierarquia, que um dia divergiria da do backend — e divergência de escopo é
 * vazamento de dado, não bug de layout.
 *
 * O único bloco que aparece para um e não para o outro é a comparação ENTRE
 * equipes, e mesmo esse é decidido pelo DADO (`equipesComparaveis`), não pelo
 * papel: com uma equipe só no escopo, o agrupamento devolveria um grupo e não
 * compararia nada. Na prática isso dá a leitura certa — o gerente vê as
 * equipes lado a lado, o supervisor vê a dele —, mas pela via que não pode
 * discordar do servidor.
 */

import { CalendarCheck2, LineChart, Trophy, Users2 } from "lucide-react";

import { brl } from "../../utils/moeda";
import type {
  Dados, Filtro, LinhaEquipeDetalhe, LinhaVendedor, UsuarioMetrica,
} from "../../utils/metricas";
import {
  atividadesPorTipo, ativasSemAgenda, baldesMensais, equipesComparaveis,
  esforcoPorFechamento, janelaMeses, porEquipeDetalhado, porVendedor,
  serieEquipeMensal, taxaAceiteConvite,
} from "../../utils/metricas";
import {
  Bloco, CaixaSimples, ColunaTabela, Nota, Num, Secao, Tabela, TituloBloco,
} from "./pecas";

const pct = (v: number | null) =>
  v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export default function AbaTime({ dados, filtro, usuarios, isMobile }: {
  dados: Dados; filtro: Filtro; usuarios: UsuarioMetrica[]; isMobile: boolean;
}) {
  const janela = janelaMeses(filtro.meses);
  const linhas = porVendedor(dados, usuarios, filtro.meses);
  const equipes = porEquipeDetalhado(linhas);
  const comparaEquipes = equipesComparaveis(linhas);
  const curvasEquipe = serieEquipeMensal(dados, usuarios, filtro.meses);
  const baldes = baldesMensais(filtro.meses);
  // Escala COMUM entre os mini-graficos: aqui o que se compara e o tamanho de
  // uma equipe contra a outra, e escala propria por quadro faria a equipe
  // pequena desenhar a mesma montanha da grande. E o oposto do caso das
  // atividades, logo abaixo, onde o que se compara e a forma.
  const tetoEquipes = Math.max.apply(null,
    curvasEquipe.map(c => Math.max.apply(null, c.valores.concat([0]))).concat([0])) || 1;
  const atividades = atividadesPorTipo(dados, filtro.meses);
  const totalAtividades = atividades.reduce((s, a) => s + a.total, 0);

  const colunas: ColunaTabela<LinhaVendedor>[] = [
    {
      chave: "nome", rotulo: "Vendedor", largura: "1.7fr",
      render: l => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#FFFFFF", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.nome}</div>
          <div style={{ fontSize: 10, marginTop: 2, color: l.ativo ? "#8AA9C6" : "#F0A05A",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {l.ativo ? (l.equipe ? `equipe de ${l.equipe}` : "sem supervisor") : "inativo"}
          </div>
        </div>
      ),
    },
    { chave: "carteira", rotulo: "Carteira", largura: "82px", alinha: "right",
      dica: "Empresas sob responsabilidade dele HOJE — não depende do período",
      render: l => <Num v={l.carteira} /> },
    { chave: "propostas", rotulo: "Propostas", largura: "88px", alinha: "right",
      dica: "Propostas enviadas dentro do período",
      render: l => <Num v={l.propostas} /> },
    { chave: "fechados", rotulo: "Fechados", largura: "84px", alinha: "right",
      dica: "Negócios fechados dentro do período",
      render: l => <Num v={l.fechados} cor="#2CCD93" forte /> },
    { chave: "conversao", rotulo: "Conversão", largura: "94px", alinha: "right",
      dica: "Fechados ÷ (fechados + perdidos) no período",
      render: l => (
        <span title={l.conversao === null ? "Nada decidido no período"
                     : `${l.fechados} de ${l.fechados + l.perdidos} decididos`}>
          <Num v={l.conversao === null ? "—" : pct(l.conversao)} />
        </span>
      ) },
    { chave: "aberto", rotulo: "Em aberto", largura: "1fr", alinha: "right",
      dica: "Propostas da carteira dele sem decisão — estoque de hoje",
      render: l => <Num v={l.aberto ? brl(l.aberto, 0) : 0} cor="#FFFFFF" /> },
    {
      chave: "aprovado", rotulo: "Aprovado", largura: "1.15fr", alinha: "right",
      dica: "Valor aprovado no período, e a variação contra o período anterior",
      render: l => (
        <div>
          <Num v={l.aprovado ? brl(l.aprovado, 0) : 0} cor="#83DDA8" forte />
          {/* O Δ por vendedor é o "versionamento" na linha: quem cresceu e quem
              encolheu contra a mesma janela recuada. Some quando não havia nada
              antes — crescer a partir do zero não é informação comparável. */}
          {l.deltaAprovado !== null && (
            <div style={{ fontSize: 10, marginTop: 2, fontWeight: 700,
                          color: l.deltaAprovado > 0 ? "#2CCD93"
                               : l.deltaAprovado < 0 ? "#F87171" : "#8AA9C6" }}>
              {l.deltaAprovado > 0 ? "▲" : l.deltaAprovado < 0 ? "▼" : "—"} {brl(Math.abs(l.deltaAprovado), 0)}
            </div>
          )}
        </div>
      ),
    },
    { chave: "ticket", rotulo: "Ticket", largura: "1fr", alinha: "right",
      dica: "Valor aprovado ÷ orçamentos aprovados dele no período",
      render: l => <Num v={l.ticket === null ? "—" : brl(l.ticket, 0)} /> },
    { chave: "atividades", rotulo: "Atividades", largura: "92px", alinha: "right",
      dica: "Compromissos na agenda das empresas da carteira dele, no período",
      render: l => <Num v={l.atividades} /> },
    { chave: "paradas", rotulo: "Parados 15d+", largura: "104px", alinha: "right",
      dica: "Empresas ativas da carteira sem contato há 15 dias ou mais",
      render: l => <Num v={l.paradas} cor="#F0A05A" forte /> },
  ];

  const colunasEquipe: ColunaTabela<LinhaEquipeDetalhe>[] = [
    {
      chave: "equipe", rotulo: "Equipe", largura: "1.8fr",
      render: e => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#FFFFFF", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.equipe}</div>
          <div style={{ fontSize: 10, color: "#8AA9C6", marginTop: 2, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {e.destaque
              ? `puxada por ${e.destaque.nome} (${pct(e.destaque.fatia)})`
              : "nenhum valor aprovado no período"}
          </div>
        </div>
      ),
    },
    { chave: "vend", rotulo: "Vendedores", largura: "98px", alinha: "right",
      render: e => <Num v={e.vendedores} /> },
    { chave: "cart", rotulo: "Carteira", largura: "86px", alinha: "right",
      dica: "Empresas sob a equipe HOJE — não depende do período",
      render: e => <Num v={e.carteira} /> },
    { chave: "prop", rotulo: "Propostas", largura: "90px", alinha: "right",
      dica: "Propostas enviadas pela equipe dentro do período",
      render: e => <Num v={e.propostas} /> },
    { chave: "fech", rotulo: "Fechados", largura: "86px", alinha: "right",
      render: e => <Num v={e.fechados} cor="#2CCD93" forte /> },
    { chave: "conv", rotulo: "Conversão", largura: "94px", alinha: "right",
      dica: "Fechados ÷ (fechados + perdidos) somados — nunca a média das taxas dos vendedores",
      render: e => (
        <span title={e.conversao === null ? "Nada decidido no período"
                     : `${e.fechados} de ${e.fechados + e.perdidos} decididos`}>
          <Num v={pct(e.conversao)} />
        </span>
      ) },
    {
      chave: "apr", rotulo: "Aprovado", largura: "1.35fr", alinha: "right",
      dica: "Valor aprovado no período, a variação contra o período anterior e a fatia do total do escopo",
      render: e => (
        <div>
          <Num v={e.aprovado ? brl(e.aprovado, 0) : 0} cor="#83DDA8" forte />
          <div style={{ fontSize: 10, marginTop: 2, display: "flex", gap: 7,
                        justifyContent: "flex-end", flexWrap: "wrap" }}>
            {e.deltaAprovado !== null && (
              <span style={{ fontWeight: 700,
                             color: e.deltaAprovado > 0 ? "#2CCD93"
                                  : e.deltaAprovado < 0 ? "#F87171" : "#8AA9C6" }}>
                {e.deltaAprovado > 0 ? "▲" : e.deltaAprovado < 0 ? "▼" : "—"} {brl(Math.abs(e.deltaAprovado), 0)}
              </span>
            )}
            <span style={{ color: "#8AA9C6" }}>{pct(e.participacao)} do total</span>
          </div>
        </div>
      ),
    },
    { chave: "porv", rotulo: "Por vendedor", largura: "1.15fr", alinha: "right",
      dica: "Valor aprovado ÷ vendedores da equipe — é o que permite comparar times de tamanhos diferentes",
      render: e => <Num v={e.aprovadoPorVendedor ? brl(e.aprovadoPorVendedor, 0) : 0} /> },
    { chave: "tick", rotulo: "Ticket", largura: "1fr", alinha: "right",
      dica: "Valor aprovado ÷ orçamentos aprovados da equipe",
      render: e => <Num v={e.ticket === null ? "—" : brl(e.ticket, 0)} /> },
    { chave: "conc", rotulo: "Concentração", largura: "110px", alinha: "right",
      dica: "Fatia do maior vendedor no total da própria equipe. Acima de 70%, o resultado do time depende de uma pessoa.",
      render: e => (
        <Num v={e.concentracao === null ? "—" : pct(e.concentracao)}
             cor={e.concentracao !== null && e.concentracao >= 70 ? "#F0A05A" : "#DCE9F5"}
             forte={e.concentracao !== null && e.concentracao >= 70} />
      ) },
    { chave: "esf", rotulo: "Esforço", largura: "88px", alinha: "right",
      dica: "Compromissos ÷ fechamentos da equipe. Subir sem a conversão subir junto é trabalhar mais para ganhar o mesmo.",
      render: e => (
        <Num v={e.esforco === null ? "—"
                : e.esforco.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} />
      ) },
    { chave: "par", rotulo: "Parados 15d+", largura: "106px", alinha: "right",
      render: e => <Num v={e.paradas} cor="#F0A05A" forte /> },
  ];

  return (
    <>
      <Secao>Desempenho individual</Secao>
      <Bloco>
        <TituloBloco icone={Trophy} cor="#F2C879" titulo="Por vendedor"
          sub="Ordenado pelo valor já aprovado no período — a meta individual sai desta linha" />
        <Tabela colunas={colunas} linhas={linhas} chaveDe={l => l.id}
          larguraMinima={1080}
          vazio="Nenhum vendedor no seu escopo ainda." />
        <Nota>
          <strong style={{ color: "#DCE9F5" }}>Carteira</strong> e{" "}
          <strong style={{ color: "#DCE9F5" }}>Em aberto</strong> são retratos de hoje;
          as demais colunas são do período escolhido. Estão na mesma linha porque a pergunta é
          “quanto esta carteira produziu no período”, e as duas metades só respondem juntas.
        </Nota>
      </Bloco>

      {comparaEquipes && (
        <>
          <Secao>Comparação entre equipes</Secao>
          <Bloco>
            <TituloBloco icone={Users2} cor="#A78BFA" titulo="Por equipe"
              sub="Os mesmos vendedores somados pelo supervisor de cada um — ordenado pelo valor aprovado" />
            <Tabela larguraMinima={1300} chaveDe={e => e.equipe} linhas={equipes}
              vazio="Nenhuma equipe no seu escopo." colunas={colunasEquipe} />
            <Nota cor="#56A4F5">
              Toda taxa da equipe sai dos <strong style={{ color: "#DCE9F5" }}>números somados</strong>,
              nunca da média das taxas dos vendedores: média de porcentagem daria o mesmo peso a quem
              decidiu dois negócios e a quem decidiu sessenta. Pelo mesmo motivo o ticket da equipe usa
              a contagem somada de orçamentos aprovados, e não a média dos tickets individuais.
            </Nota>
            <Nota>
              <strong style={{ color: "#DCE9F5" }}>Concentração</strong> é a fatia do maior vendedor no
              total da própria equipe, e é o número que separa “equipe boa” de “equipe com um bom
              vendedor”: cinco pessoas em que uma faz 85% não é um time — é um risco de saída, e
              nenhuma das outras colunas mostra isso. <strong style={{ color: "#DCE9F5" }}>Por
              vendedor</strong> existe pelo motivo gêmeo: sem ela, a equipe maior ganha a comparação
              só por ser maior.
            </Nota>
          </Bloco>

          {curvasEquipe.length > 0 && (
            <Bloco>
              <TituloBloco icone={LineChart} cor="#A78BFA" titulo="Valor aprovado mês a mês, por equipe"
                sub="Mesma escala em todos os quadros — aqui a altura compara equipes, não só a forma de cada uma" />
              <div style={{ display: "grid", gap: 14,
                            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(230px,1fr))" }}>
                {curvasEquipe.map(c => (
                  <MiniEquipe key={c.equipe} equipe={c.equipe} valores={c.valores} total={c.total}
                    teto={tetoEquipes} rotulos={baldes.map(b => b.rotulo)} />
                ))}
              </div>
              <Nota>
                Um quadro por equipe, e não linhas coloridas num eixo só: as cores desta paleta que a
                intuição escolheria para séries irmãs — o azul e o roxo — ficam a ΔE 0,7 sob
                deuteranopia, ou seja, a MESMA cor para parte dos usuários. Separadas, cada série é
                única e a cor não precisa distinguir coisa nenhuma.
              </Nota>
            </Bloco>
          )}
        </>
      )}

      <Secao>Esforço</Secao>
      <div style={{ display: "grid", gap: 14,
                    gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,minmax(0,1fr))" }}>
        <CaixaSimples rotulo="Atividades por fechamento" cor="#56A4F5" formato="inteiro"
          medida={esforcoPorFechamento(dados, janela)}
          dica="Compromissos registrados ÷ negócios fechados no período. Subir sem a conversão subir junto significa trabalhar mais para ganhar o mesmo." />
        <CaixaSimples rotulo="Aceite de convite" cor="#2CCD93" formato="pct"
          medida={taxaAceiteConvite(dados, janela)}
          dica="Convites de reunião aceitos ÷ convites com resposta registrada. Evento sem convidado fica fora do denominador." />
        <CaixaSimples rotulo="Ativas sem nada agendado" cor="#F0A05A" formato="inteiro"
          medida={ativasSemAgenda(dados)}
          dica="Empresas ainda no funil sem nenhum compromisso marcado daqui para a frente." />
      </div>

      <Secao>Atividades por tipo</Secao>
      <Bloco>
        <TituloBloco icone={CalendarCheck2} cor="#56A4F5" titulo="O que o time fez, mês a mês"
          sub={totalAtividades
            ? `${totalAtividades} ${totalAtividades === 1 ? "compromisso cumprido" : "compromissos cumpridos"} no período`
            : "Nenhum compromisso cumprido no período"} />

        {/* Quatro gráficos pequenos, e não quatro linhas num só. Medido: o azul
            da call e o roxo da reunião ficam a ΔE 11 em OKLab para visão normal
            e 0,7 sob deuteranopia — as duas linhas seriam a mesma cor. Separado,
            cada gráfico tem uma série só e a cor não precisa distinguir nada. */}
        <div style={{ display: "grid", gap: 14,
                      gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))" }}>
          {atividades.map(a => (
            <MiniSerie key={a.chave} rotulo={a.rotulo} cor={a.cor} valores={a.valores}
              total={a.total} aFrente={a.aFrente} />
          ))}
        </div>

        <Nota>
          Conta só o que já aconteceu — compromisso marcado para a frente aparece como “agendadas”,
          não como realizado. O tipo “Outro” do calendário fica de fora: é a caixa de tudo que não
          se classificou, e somá-lo esconderia mais do que mostra.
        </Nota>
      </Bloco>
    </>
  );
}

/**
 * Um gráfico pequeno de uma série só.
 *
 * Sem eixo e sem grade de propósito: em small multiples o que se compara é a
 * FORMA entre os quadros, e cada um tem escala própria — o número embaixo dá a
 * grandeza. Escala compartilhada esmagaria o tipo de atividade menos frequente
 * até a linha sumir.
 */
function MiniSerie({ rotulo, cor, valores, total, aFrente }: {
  rotulo: string; cor: string; valores: number[]; total: number; aFrente: number;
}) {
  const W = 100, H = 34, P = 4;
  const max = Math.max.apply(null, valores.concat([0]));
  const x = (i: number) => (i * W) / Math.max(valores.length - 1, 1);
  const y = (v: number) => P + (1 - (max ? v / max : 0)) * (H - P * 2);

  return (
    <div style={{ background: "rgba(126,176,219,0.05)", border: "1px solid rgba(126,176,219,0.14)",
                  borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#B6CFE4" }}>{rotulo}</span>
        <span style={{ marginLeft: "auto", fontSize: 18, fontWeight: 900,
                       color: total ? "#FFFFFF" : "#7E9DBB" }}>{total}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true"
           style={{ width: "100%", height: 34, display: "block", marginTop: 8, overflow: "visible" }}>
        {max === 0 ? (
          <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke={cor} strokeWidth="1.6"
                strokeOpacity="0.3" vectorEffect="non-scaling-stroke" />
        ) : (
          <>
            <polyline points={valores.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none"
                      stroke={cor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke" />
            <circle cx={x(valores.length - 1)} cy={y(valores[valores.length - 1])} r="2.4" fill={cor} />
          </>
        )}
      </svg>
      <div style={{ fontSize: 10, color: "#8AA9C6", marginTop: 6 }}>
        {aFrente > 0 ? `${aFrente} ainda ${aFrente === 1 ? "agendada" : "agendadas"}` : "nada agendado à frente"}
      </div>
    </div>
  );
}


/**
 * Um quadro por equipe, em ESCALA COMPARTILHADA.
 *
 * Diferente do `MiniSerie` das atividades logo acima, que usa escala própria de
 * propósito: lá o que se compara é a forma de cada tipo de compromisso ao longo
 * do tempo, e escala comum esmagaria o tipo menos frequente até a linha sumir.
 * Aqui a pergunta é outra — qual equipe produz mais —, então a altura precisa
 * significar a mesma coisa nos dois quadros. Trocar uma regra pela outra faz o
 * desenho continuar plausível e a conclusão virar o oposto.
 */
function MiniEquipe({ equipe, valores, total, teto, rotulos }: {
  equipe: string; valores: number[]; total: number; teto: number; rotulos: string[];
}) {
  const W = 100, H = 40, P = 3;
  const n = Math.max(valores.length, 1);
  const largura = W / n;
  const altura = (v: number) => (teto > 0 ? (v / teto) * (H - P * 2) : 0);

  return (
    <div style={{ background: "rgba(126,176,219,0.05)", border: "1px solid rgba(126,176,219,0.14)",
                  borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#DCE9F5", overflow: "hidden",
                       textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={equipe}>{equipe}</span>
        <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 900, whiteSpace: "nowrap",
                       color: total ? "#83DDA8" : "#7E9DBB" }}>
          {total ? brl(total, 0) : "R$ 0"}
        </span>
      </div>
      {/* Colunas, e não linha: valor aprovado por mês é fluxo — cada mês é uma
          quantia fechada, não um nível que se atravessa de um mês ao outro. */}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true"
           style={{ width: "100%", height: 40, display: "block", marginTop: 9 }}>
        <line x1="0" y1={H - P} x2={W} y2={H - P} stroke="rgba(126,176,219,0.25)"
              strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {valores.map((v, i) => v > 0 && (
          <rect key={i} x={i * largura + largura * 0.18} y={H - P - altura(v)}
                width={largura * 0.64} height={Math.max(altura(v), 1)} fill="#A78BFA" rx="0.5" />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5,
                    color: "#7E9DBB", marginTop: 5 }}>
        <span>{rotulos[0]}</span>
        <span>{rotulos[rotulos.length - 1]}</span>
      </div>
    </div>
  );
}
