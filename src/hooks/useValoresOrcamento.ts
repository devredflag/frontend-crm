import { useEffect, useState } from "react";
import { getToken } from "../services/auth";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

// Valor de uma empresa no funil, tirado dos orçamentos que existem de verdade —
// não de um número digitado no cadastro.
//
// "Em aberto" é só o que já foi para o cliente e ainda não tem decisão
// (enviado + em negociação). Rascunho fica de fora de propósito: enquanto não
// sai daqui, não é dinheiro em jogo — contar rascunho infla o pipeline com
// intenção, que era exatamente o problema do ticket estimado.
const ABERTOS = ["enviado", "em_negociacao"];

interface OrcamentoLite {
  empresa_id: string;
  status: string;
  total: number | string | null;
}

export interface ValorEmpresa {
  /** Enviados e em negociação — o que ainda pode fechar. */
  emAberto: number;
  qtdAbertos: number;
  /** Já aprovados — o que fechou. */
  aprovado: number;
  qtdAprovados: number;
  recusado: number;
  /** aprovado / qtdAprovados. Null quando a empresa nunca fechou nada. */
  ticketMedio: number | null;
  /** Peso da empresa no funil: o que está em jogo + o que já fechou. */
  total: number;
}

const VAZIO: ValorEmpresa = {
  emAberto: 0, qtdAbertos: 0, aprovado: 0, qtdAprovados: 0,
  recusado: 0, ticketMedio: null, total: 0,
};

export interface ValoresOrcamento {
  /** Valor de uma empresa; devolve zeros para quem não tem orçamento. */
  valorDe: (empresaId: string) => ValorEmpresa;
  /** Soma de `valorDe` sobre um conjunto de empresas. */
  somar: (empresaIds: string[]) => ValorEmpresa;
  /** Todos os orçamentos da conta, agregados. */
  geral: ValorEmpresa;
  carregando: boolean;
  erro: boolean;
}

function agregar(orcamentos: OrcamentoLite[]): ValorEmpresa {
  const v: ValorEmpresa = { ...VAZIO };
  for (const o of orcamentos) {
    const total = Number(o.total || 0);
    if (ABERTOS.includes(o.status)) { v.emAberto += total; v.qtdAbertos += 1; }
    else if (o.status === "aprovado") { v.aprovado += total; v.qtdAprovados += 1; }
    else if (o.status === "recusado") { v.recusado += total; }
  }
  v.ticketMedio = v.qtdAprovados ? v.aprovado / v.qtdAprovados : null;
  v.total = v.emAberto + v.aprovado;
  return v;
}

/** Junta dois agregados já prontos, sem repassar a lista de orçamentos. */
function juntar(a: ValorEmpresa, b: ValorEmpresa): ValorEmpresa {
  const emAberto = a.emAberto + b.emAberto;
  const aprovado = a.aprovado + b.aprovado;
  const qtdAprovados = a.qtdAprovados + b.qtdAprovados;
  return {
    emAberto, qtdAbertos: a.qtdAbertos + b.qtdAbertos,
    aprovado, qtdAprovados,
    recusado: a.recusado + b.recusado,
    ticketMedio: qtdAprovados ? aprovado / qtdAprovados : null,
    total: emAberto + aprovado,
  };
}

/**
 * Carrega /orcamentos uma vez e devolve os valores por empresa.
 *
 * Existe porque quatro telas mostravam dinheiro do cliente e todas liam o mesmo
 * campo digitado à mão (`ticket_medio_estimado`). Agora todas leem daqui.
 */
export default function useValoresOrcamento(): ValoresOrcamento {
  const [porEmpresa, setPorEmpresa] = useState<Map<string, ValorEmpresa>>(new Map());
  const [geral, setGeral] = useState<ValorEmpresa>(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`${API}/orcamentos`, {
          headers: { Authorization: `Bearer ${getToken() || ""}` },
        });
        if (!res.ok) throw new Error(String(res.status));
        const lista: OrcamentoLite[] = await res.json();
        if (!vivo) return;
        const porId = new Map<string, OrcamentoLite[]>();
        for (const o of lista) {
          if (!o.empresa_id) continue;
          const atual = porId.get(o.empresa_id);
          if (atual) atual.push(o); else porId.set(o.empresa_id, [o]);
        }
        const mapa = new Map<string, ValorEmpresa>();
        porId.forEach((orcs, id) => mapa.set(id, agregar(orcs)));
        setPorEmpresa(mapa);
        setGeral(agregar(lista));
      } catch {
        if (vivo) setErro(true);
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  const valorDe = (empresaId: string) => porEmpresa.get(empresaId) || VAZIO;
  const somar = (empresaIds: string[]) =>
    empresaIds.reduce((acc, id) => juntar(acc, valorDe(id)), { ...VAZIO });

  return { valorDe, somar, geral, carregando, erro };
}
