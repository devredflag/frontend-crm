/**
 * Aba 2 — Funil e conversão.
 *
 * Responde "onde a base trava e por que ela se perde". É a aba com mais
 * material novo: motivo de perda e motivo de recusa já existiam no banco e
 * nunca tinham aparecido em lugar nenhum da aplicação — perdia-se o negócio e
 * a razão morria dentro do cadastro.
 */

import { Clock3, Compass, Flame, HeartCrack, ThermometerSun, TrendingDown } from "lucide-react";

import { brl } from "../../utils/moeda";
import type { Dados, Filtro } from "../../utils/metricas";
import {
  agingPropostas, janelaMeses, motivosRecusa, porCategoria, retratoFunil,
  tempoRespostaCliente,
} from "../../utils/metricas";
import {
  BarrasCategoria, Bloco, Grade, Nota, Secao, TituloBloco, VazioBloco,
} from "./pecas";
import TransicoesFunil from "./TransicoesFunil";

/** Cor única por bloco: categoria nominal não tem ordem, então uma cor só. */
const COR_PERDA = "#F87171";
const COR_ORIGEM = "#A78BFA";

const pct = (v: number | null) =>
  v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export default function AbaFunil({ dados, filtro, isMobile }: {
  dados: Dados; filtro: Filtro; isMobile: boolean;
}) {
  const janela = janelaMeses(filtro.meses);
  const funil = retratoFunil(dados);
  const reais = dados.empresas.filter(e => e.status !== "Rascunho");
  const perdidas = reais.filter(e => e.status === "Perdido").length;

  const aging = agingPropostas(dados);
  const totalAberto = aging.reduce((s, f) => s + f.quantidade, 0);
  const atrasadas = aging.filter(f => f.alerta).reduce((s, f) => s + f.quantidade, 0);
  const resposta = tempoRespostaCliente(dados, janela);

  const motivosPerda = porCategoria(dados, "motivo_perdido", null, 7);
  const recusas = motivosRecusa(dados, janela, 7);
  const temperatura = porCategoria(dados, "temperatura", null, 4);
  const origem = porCategoria(dados, "origem_lead", janela, 8);

  return (
    <>
      <Secao>O funil está funcionando?</Secao>
      {/* Vem antes do retrato de propósito: esta é a pergunta da aba. O retrato
          logo abaixo diz onde as empresas ESTÃO agora; este bloco diz se elas
          se movem, que é o que decide meta. */}
      <TransicoesFunil filtro={filtro} />

      <Secao>Onde a base está parada</Secao>
      <Grade isMobile={isMobile} colunas={2}>
        <Bloco>
          <TituloBloco icone={Compass} cor="#56A4F5" titulo="Retrato do funil"
            sub={`${reais.length} ${reais.length === 1 ? "empresa" : "empresas"} na base · ${perdidas} ${perdidas === 1 ? "perdida" : "perdidas"} fora do funil`} />

          {reais.length === 0 ? (
            <VazioBloco texto="Nenhuma empresa cadastrada ainda." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {funil.map(f => (
                <div key={f.etapa}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between",
                                gap: 10, marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "#FFFFFF" }}>{f.etapa}</span>
                    <span style={{ fontSize: 11.5, color: "#B6CFE4", whiteSpace: "nowrap" }}>
                      <strong style={{ color: f.quantidade ? CORES_ETAPA[f.etapa] : "#7E9DBB", fontSize: 13 }}>
                        {f.quantidade}
                      </strong>
                      {"  ·  "}{pct(f.fatia)}
                      {f.valor > 0 && <>{"  ·  "}<span style={{ color: "#DCE9F5" }}>{brl(f.valor, 0)}</span></>}
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 5, background: "rgba(126,176,219,0.10)", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: CORES_ETAPA[f.etapa], borderRadius: 5,
                                  width: `${Math.max(f.fatia, f.quantidade ? 2 : 0)}%`,
                                  transition: "width 0.4s ease" }} />
                  </div>
                  {/* O número que a tela antiga não tinha: há quanto tempo quem
                      está nesta etapa está parado nela. É onde o funil entope. */}
                  <div style={{ fontSize: 10.5, color: "#8AA9C6", marginTop: 4 }}>
                    {f.diasParado === null ? "ninguém nesta etapa" : (
                      <>parados há <strong style={{ color: f.diasParado >= 30 ? "#F0A05A" : "#B6CFE4" }}>
                        {f.diasParado} {f.diasParado === 1 ? "dia" : "dias"}</strong> (mediana)</>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Nota>
            Retrato de hoje, não taxa de passagem: o sistema guarda o status atual e a data da
            última mudança, não o caminho que a empresa fez entre as etapas. “Parados” é há
            quanto tempo quem está na etapa não se move — mediana, para uma empresa esquecida há
            um ano não arrastar a leitura da etapa inteira.
          </Nota>
        </Bloco>

        <Bloco>
          <TituloBloco icone={Clock3} cor="#F0A05A" titulo="Propostas esperando resposta"
            sub={totalAberto
              ? `${totalAberto} em aberto · ${atrasadas} passaram de 15 dias`
              : "Nenhuma proposta aguardando decisão"} />

          <BarrasCategoria cor="#F0A05A" vazio="Nenhuma proposta em aberto com data de envio."
            itens={aging.filter(f => f.quantidade > 0).map(f => ({
              rotulo: f.rotulo,
              valor: f.quantidade,
              valorTexto: `${f.quantidade}`,
              detalhe: (
                <>
                  <span>{brl(f.valor, 0)} parados</span>
                  {f.alerta && <span style={{ color: "#F0A05A" }}>passou do ponto de cobrar</span>}
                </>
              ),
            }))} />

          <Nota cor={resposta.valor === null ? "#F0A05A" : "#56A4F5"}>
            {resposta.valor === null
              ? "Ainda não há proposta respondida no período, então não dá para dizer qual é o tempo normal desta conta — as faixas acima usam os cortes padrão de 7, 15 e 30 dias."
              : <>O cliente desta conta responde em <strong style={{ color: "#DCE9F5" }}>
                  {Math.round(resposta.valor)} dias</strong> em média ({resposta.base}).
                  Proposta acima disso já passou do normal e é onde a cobrança rende.</>}
          </Nota>
        </Bloco>
      </Grade>

      <Secao>Por que se perde</Secao>
      <Grade isMobile={isMobile} colunas={2}>
        <Bloco>
          <TituloBloco icone={HeartCrack} cor={COR_PERDA} titulo="Motivos de perda do negócio"
            sub="Por que a empresa saiu do funil — o campo preenchido no cadastro ao marcar Perdido" />
          <BarrasCategoria cor={COR_PERDA}
            vazio="Nenhuma empresa marcada como perdida ainda."
            itens={motivosPerda.map(m => ({
              rotulo: m.categoria,
              valor: m.total,
              valorTexto: `${m.total}`,
              dica: m.categoria,
              detalhe: <span>{pctDoTotal(m.total, perdidas)} das perdas</span>,
            }))} />
          {motivosPerda.filter(m => m.categoria === "Motivo não registrado").length > 0 && (
            <Nota>
              “Motivo não registrado” é perda em que ninguém escreveu o porquê. É a barra que mais
              vale reduzir: enquanto ela for a maior, esta análise não tem o que dizer.
            </Nota>
          )}
        </Bloco>

        <Bloco>
          <TituloBloco icone={TrendingDown} cor={COR_PERDA} titulo="Motivos de recusa da proposta"
            sub="Por que o orçamento foi recusado — decisões do período" />
          <BarrasCategoria cor={COR_PERDA}
            vazio="Nenhuma proposta recusada neste período."
            itens={recusas.map(m => ({
              rotulo: m.motivo,
              valor: m.valor || m.total,
              valorTexto: brl(m.valor, 0),
              dica: m.motivo,
              detalhe: <span>{m.total} {m.total === 1 ? "proposta" : "propostas"}</span>,
            }))} />
          <Nota cor="#56A4F5">
            Ordenado por VALOR, não por quantidade: cinco recusas pequenas por prazo custam menos
            que uma grande por preço, e é o valor que decide se a política de desconto muda.
          </Nota>
        </Bloco>
      </Grade>

      <Secao>De onde vem quem fecha</Secao>
      <Grade isMobile={isMobile} colunas={2}>
        <Bloco>
          <TituloBloco icone={Compass} cor={COR_ORIGEM} titulo="Origem dos leads"
            sub="Leads que ENTRARAM no período, e no que deram — ordenado por receita, não por volume" />
          <BarrasCategoria cor={COR_ORIGEM}
            vazio="Nenhuma empresa cadastrada neste período."
            itens={origem.map(o => ({
              rotulo: o.categoria,
              valor: o.valor || o.total,
              valorTexto: o.valor ? brl(o.valor, 0) : `${o.total} ${o.total === 1 ? "lead" : "leads"}`,
              dica: o.categoria,
              detalhe: (
                <>
                  <span>{o.total} {o.total === 1 ? "entrada" : "entradas"}</span>
                  <span style={{ color: o.fechados ? "#83DDA8" : undefined }}>{o.fechados} fechados</span>
                  <span title={o.conversao === null
                    ? "Nenhum negócio decidido nesta origem"
                    : `${o.fechados} de ${o.fechados + o.perdidos} decididos`}>
                    {o.conversao === null ? "sem decisão ainda" : `${pct(o.conversao)} de conversão`}
                  </span>
                </>
              ),
            }))} />
          <Nota cor="#56A4F5">
            O recorte é pela ENTRADA da empresa: “os leads que captei nestes meses, em que deram”.
            Misturar entradas de janelas diferentes no mesmo denominador tornaria as taxas
            incomparáveis entre si.
          </Nota>
        </Bloco>

        <Bloco>
          <TituloBloco icone={ThermometerSun} cor="#F0A05A" titulo="Conversão por temperatura"
            sub="A leitura que o vendedor deu ao lead acertou? É o teste do critério, não do lead" />
          <BarrasCategoria cor="#F0A05A"
            vazio="Nenhuma empresa com temperatura registrada."
            itens={temperatura.map(t => ({
              rotulo: t.categoria,
              valor: t.total,
              valorTexto: t.conversao === null ? "sem decisão" : pct(t.conversao),
              detalhe: (
                <>
                  <span>{t.total} na base</span>
                  <span style={{ color: t.fechados ? "#83DDA8" : undefined }}>{t.fechados} fechados</span>
                  {t.valor > 0 && <span>{brl(t.valor, 0)} aprovados</span>}
                </>
              ),
            }))} />
          <Nota>
            Se “Quente” não converte mais que “Frio”, o problema não é o funil — é o critério com
            que a temperatura vem sendo marcada, e nenhuma meta conserta isso.
          </Nota>
        </Bloco>
      </Grade>

      {/* Sinalização única do bloco inteiro quando não há nada decidido: sem
          isto, seis blocos vazios parecem seis defeitos diferentes. */}
      {reais.length > 0 && perdidas === 0 && (
        <Nota cor="#2CCD93">
          <Flame style={{ width: 11, height: 11, display: "inline", verticalAlign: "-1px" }} aria-hidden="true" />
          {" "}Nenhuma empresa foi marcada como perdida ainda — por isso os blocos de perda estão
          vazios. Eles se preenchem sozinhos conforme o funil for sendo trabalhado.
        </Nota>
      )}
    </>
  );
}

/** As mesmas cores do kanban do Gerenciamento — a etapa não pode ter duas caras. */
const CORES_ETAPA: Record<string, string> = {
  "Lead": "#8FC4FA",
  "Em contato": "#56A4F5",
  "Visita agendada": "#22D3EE",
  "Proposta": "#A78BFA",
  "Negociação": "#F0A05A",
  "Fechado": "#2CCD93",
};

const pctDoTotal = (parte: number, todo: number) =>
  todo > 0 ? `${((parte / todo) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%` : "—";
