/**
 * Aba 4 — Catálogo e perfil da base.
 *
 * Responde "o que vendemos e para quem". Segmento, porte e cidade já estavam
 * no cadastro desde sempre e nunca tinham virado número em lugar nenhum: dava
 * para filtrar a lista por segmento, mas não para saber qual segmento paga.
 */

import { Building2, MapPin, Ruler, ShieldAlert } from "lucide-react";

import RankingItensVendidos from "../../components/RankingItensVendidos";
import { brl } from "../../utils/moeda";
import type { Dados, Filtro } from "../../utils/metricas";
import { coberturaContato, coberturaFollowUp, porCategoria } from "../../utils/metricas";
import {
  BarrasCategoria, Bloco, CaixaSimples, Grade, Nota, Secao, TituloBloco,
} from "./pecas";

const pct = (v: number | null) =>
  v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

// `filtro` chega junto com as outras abas e é deliberadamente ignorado aqui:
// os recortes de vendedor e segmento já vieram aplicados em `dados`, e o de
// período não vale nesta aba (ver a nota no fim do arquivo).
export default function AbaCatalogo({ dados, isMobile }: {
  dados: Dados; filtro: Filtro; isMobile: boolean;
}) {
  const segmentos = porCategoria(dados, "segmento", null, 8);
  const portes = porCategoria(dados, "porte", null, 4);
  const cidades = porCategoria(dados, "cidade", null, 8);

  const semSegmento = dados.empresas.filter(e =>
    e.status !== "Rascunho" && !(e.segmento || "").trim()).length;

  return (
    <>
      <Secao>O que mais vende</Secao>
      {/* Um gráfico por catálogo. Comparar "Gerador 15 kVA" com "Instalação"
          lado a lado não responde pergunta nenhuma: são catálogos com preço e
          volume de ordens de grandeza diferentes.

          ⚠️ Este bloco NÃO obedece ao filtro global: ele vem pronto de
          GET /vendas/insights, que agrega no banco e já aplica o escopo de
          hierarquia, mas não conhece o recorte de período nem o de vendedor
          desta tela. A nota abaixo diz isso ao leitor em vez de deixar dois
          números da mesma tela discordarem em silêncio. */}
      <RankingItensVendidos />
      <Nota>
        Os dois gráficos de catálogo mostram <strong style={{ color: "#DCE9F5" }}>todo o histórico</strong> da
        sua carteira e não seguem o período nem o vendedor escolhidos acima — eles vêm somados do
        servidor. O escopo de equipe continua valendo.
      </Nota>

      <Secao>Para quem se vende</Secao>
      <Grade isMobile={isMobile} colunas={2}>
        <Bloco>
          <TituloBloco icone={Building2} cor="#56A4F5" titulo="Segmento"
            sub="Ordenado por receita aprovada, não por quantidade de empresas" />
          <BarrasCategoria cor="#56A4F5" vazio="Nenhuma empresa cadastrada ainda."
            itens={segmentos.map(s => ({
              rotulo: s.categoria,
              valor: s.valor || s.total,
              valorTexto: s.valor ? brl(s.valor, 0) : `${s.total} na base`,
              dica: s.categoria,
              detalhe: (
                <>
                  <span>{s.total} {s.total === 1 ? "empresa" : "empresas"}</span>
                  <span style={{ color: s.fechados ? "#83DDA8" : undefined }}>{s.fechados} fechados</span>
                  <span>{s.conversao === null ? "sem decisão" : `${pct(s.conversao)} de conversão`}</span>
                </>
              ),
            }))} />
          {semSegmento > 0 && (
            <Nota>
              {semSegmento} {semSegmento === 1 ? "empresa está" : "empresas estão"} sem segmento no
              cadastro e {semSegmento === 1 ? "cai" : "caem"} em “Não informado”. Enquanto essa
              barra for grande, a comparação entre segmentos mede menos do que parece.
            </Nota>
          )}
        </Bloco>

        <Bloco>
          <TituloBloco icone={Ruler} cor="#A78BFA" titulo="Porte da empresa"
            sub="Onde está o volume e onde está o ticket — nem sempre no mesmo lugar" />
          <BarrasCategoria cor="#A78BFA" vazio="Nenhum porte registrado no cadastro."
            itens={portes.map(p => ({
              rotulo: p.categoria,
              valor: p.valor || p.total,
              valorTexto: p.valor ? brl(p.valor, 0) : `${p.total} na base`,
              detalhe: (
                <>
                  <span>{p.total} {p.total === 1 ? "empresa" : "empresas"}</span>
                  <span>{p.conversao === null ? "sem decisão" : `${pct(p.conversao)} de conversão`}</span>
                  {p.fechados > 0 && (
                    <span>{brl(p.valor / p.fechados, 0)} por fechamento</span>
                  )}
                </>
              ),
            }))} />
          <Nota cor="#56A4F5">
            Muitas empresas pequenas com conversão alta e receita baixa contra poucas grandes com
            conversão baixa e receita alta é a decisão de foco mais comum — e as duas colunas
            estão aqui para ela ser tomada com número.
          </Nota>
        </Bloco>
      </Grade>

      <Secao>Onde está a base</Secao>
      <Grade isMobile={isMobile} colunas={2}>
        <Bloco>
          <TituloBloco icone={MapPin} cor="#22D3EE" titulo="Cidade"
            sub="Concentração geográfica da carteira e o que cada praça devolveu" />
          <BarrasCategoria cor="#22D3EE" vazio="Nenhuma cidade registrada no cadastro."
            itens={cidades.map(c => ({
              rotulo: c.categoria,
              valor: c.valor || c.total,
              valorTexto: c.valor ? brl(c.valor, 0) : `${c.total} na base`,
              dica: c.categoria,
              detalhe: (
                <>
                  <span>{c.total} {c.total === 1 ? "empresa" : "empresas"}</span>
                  <span style={{ color: c.fechados ? "#83DDA8" : undefined }}>{c.fechados} fechados</span>
                </>
              ),
            }))} />
          <Nota>
            É contagem por cidade, não distância: o planejador de rota é quem responde “quanto
            custa visitar”. Aqui a pergunta é onde vale abrir praça.
          </Nota>
        </Bloco>

        <Bloco>
          <TituloBloco icone={ShieldAlert} cor="#F0A05A" titulo="Qualidade do cadastro"
            sub="O que falta preencher para a base poder ser trabalhada" />
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr" }}>
            <CaixaSimples rotulo="Empresas ativas com contato" cor="#2CCD93" formato="pct"
              medida={coberturaContato(dados)}
              dica="Empresas ainda no funil com e-mail, celular ou WhatsApp. Sem nenhum dos três, não há como trabalhar o lead." />
            <CaixaSimples rotulo="Cobertura de follow-up" cor="#56A4F5" formato="pct"
              medida={coberturaFollowUp(dados)}
              dica="Empresas ainda no funil com retorno marcado para hoje ou depois." />
          </div>
          <Nota>
            As duas são retrato de hoje e não têm comparação: o cadastro guarda o contato e a
            próxima ação <em>atuais</em>, não quando foram preenchidos. Mostrar um Δ aqui seria
            comparar o presente com ele mesmo.
          </Nota>
        </Bloco>
      </Grade>

      {/* O período está no filtro global e esta aba quase não o usa — dizer
          isso é mais honesto do que deixar o usuário mudar o período e não ver
          nada mudar, concluindo que a tela travou. */}
      <Nota cor="#56A4F5">
        Esta aba descreve a base <strong style={{ color: "#DCE9F5" }}>inteira</strong>, não uma
        janela: “de que segmento é minha carteira” não muda de resposta conforme o período. O
        filtro de vendedor e de segmento continua valendo; o de período, só onde estiver escrito.
      </Nota>
    </>
  );
}
