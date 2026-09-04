/**
 * Taxa de passagem entre as etapas do funil.
 *
 * É a única métrica desta tela que NÃO sai da lista de empresas: ela precisa do
 * histórico de status, que o backend agrega em `GET /funil/transicoes`. Antes
 * dessa rota, a pergunta "quanto de Lead vira Proposta" era impossível — havia
 * só `GET /empresas/{id}/historico-status`, uma chamada por empresa.
 *
 * ── Coorte, e o que isso muda na leitura ───────────────────────────────────
 * O bloco NÃO mede "quantas transições aconteceram no período". Ele pega as
 * empresas que ENTRARAM no funil dentro do período e segue cada uma até o fim.
 * A diferença importa: medindo transições, uma empresa que entrou há dois anos
 * e avançou ontem vira sucesso deste mês, e a taxa passa a medir a idade da
 * base em vez do desempenho do time.
 *
 * O preço disso é um viés que não tem correção: coorte recente teve menos tempo
 * para converter. Por isso o backend devolve `aviso_coorte_recente`, e o aviso
 * aparece na tela — sem ele, o gerente conclui que o time piorou quando o que
 * houve foi falta de tempo.
 */

import { useCallback, useEffect, useState } from "react";
import { GitBranch, TriangleAlert } from "lucide-react";

import { getToken } from "../../services/auth";
import type { Filtro } from "../../utils/metricas";
import { Bloco, Nota, TituloBloco, VazioBloco } from "./pecas";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

interface EtapaTransicao {
  etapa: string;
  alcancaram: number;
  avancaram: number;
  /** null na última etapa: não existe "avançar" a partir de Fechado. */
  taxa_avanco: number | null;
  perdidos: number;
  parados: number;
  dias_ate_avancar: number | null;
  amostra_dias: number;
}

interface RespostaFunil {
  etapas: EtapaTransicao[];
  transicoes: { de: string; para: string; total: number }[];
  retrocessos: number;
  coorte: {
    entraram: number; fecharam: number; perderam: number; em_aberto: number;
    taxa_fechamento: number | null; aviso_coorte_recente: boolean;
  };
  cobertura: {
    empresas_no_escopo: number; com_historico: number; sem_historico: number;
    na_coorte: number; primeiro_registro: string | null;
  };
}

/** As mesmas cores do kanban do Gerenciamento — a etapa não pode ter duas caras. */
const CORES: Record<string, string> = {
  "Lead": "#8FC4FA",
  "Em contato": "#56A4F5",
  "Visita agendada": "#22D3EE",
  "Proposta": "#A78BFA",
  "Negociação": "#F0A05A",
  "Fechado": "#2CCD93",
};

const pct = (v: number | null) =>
  v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

type Estado = "carregando" | "ok" | "erro" | "indisponivel";

export default function TransicoesFunil({ filtro }: { filtro: Filtro }) {
  const [dados, setDados] = useState<RespostaFunil | null>(null);
  const [estado, setEstado] = useState<Estado>("carregando");

  const { meses, vendedor, segmento } = filtro;

  const carregar = useCallback(async (vivo: () => boolean) => {
    const q = new URLSearchParams({ meses: String(meses) });
    if (vendedor !== "todos") q.set("vendedor_id", vendedor);
    if (segmento !== "todos") q.set("segmento", segmento);
    try {
      const r = await fetch(`${API}/funil/transicoes?${q.toString()}`, {
        headers: { Authorization: `Bearer ${getToken() || ""}` },
      });
      if (!vivo()) return;
      // 404 distingue "backend ainda não subiu esta rota" de "deu erro": as
      // duas telas seriam vazias, mas só uma é problema — e a primeira é o
      // estado normal entre o deploy do frontend e o do backend.
      if (r.status === 404) { setEstado("indisponivel"); return; }
      if (!r.ok) { setEstado("erro"); return; }
      setDados(await r.json());
      setEstado("ok");
    } catch {
      if (vivo()) setEstado("erro");
    }
  }, [meses, vendedor, segmento]);

  useEffect(() => {
    let ativo = true;
    setEstado("carregando");
    carregar(() => ativo);
    return () => { ativo = false; };
  }, [carregar]);

  if (estado === "carregando") {
    return <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />;
  }

  const corpo = () => {
    if (estado === "indisponivel") {
      return <VazioBloco texto="O backend ainda não publicou esta rota. O bloco se preenche sozinho no próximo deploy." />;
    }
    if (estado === "erro" || !dados) {
      return <VazioBloco texto="Não foi possível carregar a taxa de passagem." />;
    }
    if (dados.coorte.entraram === 0) {
      return (
        <VazioBloco texto={dados.cobertura.com_historico === 0
          ? "Nenhuma empresa tem histórico de mudança de status ainda. A taxa aparece quando o funil começar a ser movimentado."
          : "Nenhuma empresa entrou no funil dentro deste período. Amplie o período para 12 meses."} />
      );
    }

    const maior = Math.max.apply(null, dados.etapas.map(e => e.alcancaram).concat([1]));

    return (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {dados.etapas.map((e, i) => (
            <div key={e.etapa}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between",
                            gap: 10, marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#FFFFFF" }}>{e.etapa}</span>
                <span style={{ fontSize: 11.5, color: "#B6CFE4", whiteSpace: "nowrap" }}>
                  <strong style={{ color: e.alcancaram ? CORES[e.etapa] : "#7E9DBB", fontSize: 13 }}>
                    {e.alcancaram}
                  </strong>{" "}
                  {e.alcancaram === 1 ? "chegou aqui" : "chegaram aqui"}
                </span>
              </div>

              {/* A barra encolhe etapa a etapa porque `alcancaram` cai — é o
                  formato de funil de verdade, medido, e não o retrato de quem
                  está parado em cada coluna hoje. */}
              <div style={{ height: 9, borderRadius: 5, background: "rgba(126,176,219,0.10)", overflow: "hidden" }}>
                <div style={{ height: "100%", background: CORES[e.etapa], borderRadius: 5,
                              width: `${e.alcancaram ? Math.max((e.alcancaram / maior) * 100, 3) : 0}%`,
                              transition: "width 0.4s ease" }} />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px", marginTop: 6,
                            fontSize: 10.5, color: "#8AA9C6" }}>
                {/* A ordem dos testes importa: `taxa_avanco` vem null tanto
                    na ÚLTIMA etapa (não existe avançar a partir de Fechado)
                    quanto numa etapa sem amostra. Decidir por ele diria "fim do
                    funil" em cima de qualquer etapa vazia do meio. Quem é a
                    última é a posição, não o valor. */}
                {i === dados.etapas.length - 1 ? (
                  <span style={{ color: e.alcancaram ? "#83DDA8" : "#8AA9C6" }}>
                    {e.alcancaram ? "fim do funil" : "ninguém chegou até aqui"}
                  </span>
                ) : e.alcancaram === 0 ? (
                  <span>ninguém passou por aqui nesta safra</span>
                ) : (
                  <>
                    <span>
                      <strong style={{ color: e.avancaram ? "#83DDA8" : "#7E9DBB", fontSize: 11.5 }}>
                        {pct(e.taxa_avanco)}
                      </strong>{" "}
                      avançaram ({e.avancaram} de {e.alcancaram})
                    </span>
                    {e.dias_ate_avancar !== null && (
                      <span title={`Mediana de ${e.amostra_dias} ${e.amostra_dias === 1 ? "empresa" : "empresas"} que avançaram`}>
                        em {e.dias_ate_avancar} {e.dias_ate_avancar === 1 ? "dia" : "dias"} (mediana)
                      </span>
                    )}
                    {e.parados > 0 && <span style={{ color: "#F0A05A" }}>{e.parados} parados aqui</span>}
                    {e.perdidos > 0 && <span style={{ color: "#F87171" }}>{e.perdidos} perdidos aqui</span>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 18,
                      gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))" }}>
          <Resumo rotulo="Entraram no período" valor={String(dados.coorte.entraram)} />
          <Resumo rotulo="Já fecharam" valor={String(dados.coorte.fecharam)} cor="#83DDA8" />
          <Resumo rotulo="Já se perderam" valor={String(dados.coorte.perderam)} cor="#F87171" />
          <Resumo rotulo="Ainda em aberto" valor={String(dados.coorte.em_aberto)} />
          <Resumo rotulo="Fechamento da safra" valor={pct(dados.coorte.taxa_fechamento)} cor="#2CCD93" />
        </div>

        {dados.coorte.aviso_coorte_recente && (
          <Nota cor="#F0A05A">
            <TriangleAlert style={{ width: 11, height: 11, display: "inline", verticalAlign: "-1px" }} aria-hidden="true" />
            {" "}<strong style={{ color: "#DCE9F5" }}>A safra ainda não maturou.</strong> O período
            escolhido é curto perto do tempo que uma empresa leva para avançar de etapa, então boa
            parte destes leads simplesmente ainda não teve tempo de converter. Amplie o período
            antes de concluir que a taxa caiu.
          </Nota>
        )}

        {dados.retrocessos > 0 && (
          <Nota cor="#56A4F5">
            {dados.retrocessos} {dados.retrocessos === 1 ? "empresa voltou" : "empresas voltaram"} para
            uma etapa anterior no período. Não é erro: o tempo de cada etapa conta desde a
            <strong style={{ color: "#DCE9F5" }}> primeira</strong> vez que a empresa chegou nela,
            justamente para o retrabalho aparecer em vez de ser apagado.
          </Nota>
        )}

        {dados.cobertura.sem_historico > 0 && (
          <Nota>
            {dados.cobertura.sem_historico} de {dados.cobertura.empresas_no_escopo} empresas não
            têm histórico de status e ficam de fora desta conta — foram cadastradas antes de o
            registro existir{dados.cobertura.primeiro_registro
              ? `, que começa em ${new Date(dados.cobertura.primeiro_registro).toLocaleDateString("pt-BR")}`
              : ""}. As taxas acima valem para as demais, não para a base inteira.
          </Nota>
        )}
      </>
    );
  };

  return (
    <Bloco>
      <TituloBloco icone={GitBranch} cor="#2CCD93" titulo="Taxa de passagem entre etapas"
        sub="Das empresas que ENTRARAM no funil no período, quantas chegaram a cada etapa — e em quantos dias" />
      {corpo()}
    </Bloco>
  );
}

function Resumo({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div style={{ background: "rgba(126,176,219,0.05)", border: "1px solid rgba(126,176,219,0.14)",
                  borderRadius: 11, padding: "10px 12px", minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: "#8AA9C6", marginBottom: 4, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rotulo}</div>
      <div style={{ fontSize: 17, fontWeight: 900, color: cor || "#FFFFFF" }}>{valor}</div>
    </div>
  );
}
