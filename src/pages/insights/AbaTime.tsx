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

import { CalendarCheck2, Trophy, Users2 } from "lucide-react";

import { brl } from "../../utils/moeda";
import type { Dados, Filtro, LinhaVendedor, UsuarioMetrica } from "../../utils/metricas";
import {
  atividadesPorTipo, equipesComparaveis, esforcoPorFechamento, janelaMeses,
  porEquipe, porVendedor, taxaAceiteConvite, ativasSemAgenda,
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
  const equipes = porEquipe(linhas);
  const comparaEquipes = equipesComparaveis(linhas);
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
              sub="Os mesmos vendedores somados pelo supervisor de cada um" />
            <Tabela larguraMinima={720}
              chaveDe={e => e.equipe} linhas={equipes}
              vazio="Nenhuma equipe no seu escopo."
              colunas={[
                { chave: "equipe", rotulo: "Equipe", largura: "1.6fr",
                  render: e => (
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "#FFFFFF" }}>{e.equipe}</span>
                  ) },
                { chave: "vend", rotulo: "Vendedores", largura: "104px", alinha: "right",
                  render: e => <Num v={e.vendedores} /> },
                { chave: "cart", rotulo: "Carteira", largura: "92px", alinha: "right",
                  render: e => <Num v={e.carteira} /> },
                { chave: "fech", rotulo: "Fechados", largura: "92px", alinha: "right",
                  render: e => <Num v={e.fechados} cor="#2CCD93" forte /> },
                { chave: "conv", rotulo: "Conversão", largura: "100px", alinha: "right",
                  render: e => <Num v={e.conversao === null ? "—" : pct(e.conversao)} /> },
                { chave: "apr", rotulo: "Aprovado", largura: "1.2fr", alinha: "right",
                  render: e => <Num v={e.aprovado ? brl(e.aprovado, 0) : 0} cor="#83DDA8" forte /> },
                { chave: "par", rotulo: "Parados 15d+", largura: "108px", alinha: "right",
                  render: e => <Num v={e.paradas} cor="#F0A05A" forte /> },
              ]} />
            <Nota cor="#56A4F5">
              A conversão da equipe sai dos números somados, nunca da média das taxas dos
              vendedores: média de porcentagem daria o mesmo peso a quem decidiu dois negócios e
              a quem decidiu sessenta.
            </Nota>
          </Bloco>
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
