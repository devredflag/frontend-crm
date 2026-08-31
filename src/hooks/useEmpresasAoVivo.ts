import { useEffect, useRef, useState } from "react";
import { getToken } from "../services/auth";

const API = (process.env.REACT_APP_API_URL || "https://backend-crm-production-157b.up.railway.app");

// Mesmo ritmo do store de orçamentos e do polling de notificações: as partes da
// tela envelhecem juntas em vez de cada uma no seu tempo.
const INTERVALO_MS = 5000;

/**
 * Uma linha de /empresas, do jeito que o backend devolve. O store não conhece
 * os campos: cada tela declara a própria `interface Empresa` com o que usa, e
 * recebe a lista já no seu tipo. Unificar isso aqui obrigaria as cinco telas a
 * concordarem sobre um tipo que nenhuma delas usa inteiro.
 */
type Linha = Record<string, unknown> & { empresa_id: string };

const inscritos = new Set<(lista: Linha[]) => void>();

let lista: Linha[] = [];
let carregando = true;
let erro = false;
let assinatura: string | null = null;
let emVoo: Promise<void> | null = null;
let relogio: ReturnType<typeof setInterval> | null = null;

/**
 * Mudanças aplicadas na tela antes de o servidor confirmar (arrastar um card
 * para outra etapa, por exemplo). Ficam pinadas e são reaplicadas por cima de
 * toda leitura, senão um ciclo do relógio que chegasse no meio do caminho
 * devolveria o card para a coluna antiga por um segundo.
 */
interface Pendente {
  patch: Record<string, unknown>;
  /** Campos que o servidor devolve iguais ao que enviamos — usados para saber
   *  que a mudanca chegou. Um carimbo de hora gerado aqui nunca serve. */
  confirmarPor: string[];
  em: number;
}
const pendentes = new Map<string, Pendente>();
/** Rede de segurança: um patch que o servidor nunca confirma não fica preso para sempre. */
const VALIDADE_PATCH_MS = 20000;

function avisarTodos() {
  inscritos.forEach(aplicar => aplicar(lista));
}

function comPendentes(bruta: Linha[]): Linha[] {
  if (pendentes.size === 0) return bruta;
  const agora = Date.now();
  return bruta.map(linha => {
    const pendente = pendentes.get(linha.empresa_id);
    if (!pendente) return linha;
    // O servidor já concorda com a mudança (ou o patch venceu): pode soltar.
    const chegou = pendente.confirmarPor.every(k => linha[k] === pendente.patch[k]);
    const venceu = agora - pendente.em > VALIDADE_PATCH_MS;
    if (chegou || venceu) {
      pendentes.delete(linha.empresa_id);
      return linha;
    }
    return { ...linha, ...pendente.patch };
  });
}

/** Impressão digital do conteúdo: pega mudança em qualquer campo, de qualquer linha. */
function digital(l: Linha[]) {
  return JSON.stringify(
    [...l].sort((a, b) => a.empresa_id.localeCompare(b.empresa_id))
  );
}

/** Relê a lista. Chamadas simultâneas viram uma requisição só. */
function buscar(): Promise<void> {
  if (emVoo) return emVoo;
  emVoo = (async () => {
    try {
      const res = await fetch(`${API}/empresas`, {
        headers: { Authorization: `Bearer ${getToken() || ""}` },
      });
      if (!res.ok) throw new Error(String(res.status));
      const bruta: Linha[] = await res.json();
      const nova = digital(bruta);
      const mudou = assinatura !== nova;
      assinatura = nova;
      erro = false;
      carregando = false;
      // Só troca a lista (e re-renderiza as telas) quando algo mudou de fato —
      // sem isso, cada ciclo criaria um array novo e remontaria as animações
      // dos cards a cada 5 segundos.
      if (mudou || pendentes.size > 0) {
        lista = comPendentes(bruta);
        avisarTodos();
      }
    } catch {
      // Falha de rede não apaga o que está na tela.
      erro = true;
      carregando = false;
      avisarTodos();
    } finally {
      emVoo = null;
    }
  })();
  return emVoo;
}

function aoFicarVisivel() {
  if (document.visibilityState === "visible") buscar();
}

function ligarRelogio() {
  if (relogio) return;
  relogio = setInterval(() => {
    if (document.visibilityState === "visible") buscar();
  }, INTERVALO_MS);
  window.addEventListener("focus", aoFicarVisivel);
  document.addEventListener("visibilitychange", aoFicarVisivel);
}

function desligarRelogio() {
  if (relogio) { clearInterval(relogio); relogio = null; }
  window.removeEventListener("focus", aoFicarVisivel);
  document.removeEventListener("visibilitychange", aoFicarVisivel);
}

/** Chame depois de criar, editar, mover ou excluir uma empresa. */
export function notificarEmpresas() {
  buscar();
}

/**
 * Aplica uma mudança na hora, antes da resposta do servidor, em todas as telas
 * montadas. O patch fica pinado até a leitura seguinte confirmar que o servidor
 * já concorda — é o que faz o card ficar onde você soltou.
 */
export function patchLocalEmpresa(
  empresaId: string,
  patch: Record<string, unknown>,
  /** Por quais campos dá para saber que o servidor aceitou. Padrão: todos. */
  confirmarPor: string[] = Object.keys(patch),
) {
  const antes = pendentes.get(empresaId);
  pendentes.set(empresaId, {
    patch: { ...(antes ? antes.patch : {}), ...patch },
    confirmarPor,
    em: Date.now(),
  });
  lista = lista.map(l => (l.empresa_id === empresaId ? { ...l, ...patch } : l));
  avisarTodos();
}

/** Tira uma empresa da lista na hora (exclusão), sem esperar a releitura. */
export function removerEmpresaLocal(empresaId: string) {
  lista = lista.filter(l => l.empresa_id !== empresaId);
  assinatura = null; // força a próxima leitura a valer como mudança
  avisarTodos();
  buscar();
}

/**
 * Mantém a lista de empresas da tela viva: primeira carga, releitura a cada 5s
 * com a aba visível, ao voltar o foco e quando alguém mexe numa empresa.
 *
 * A tela continua dona do próprio estado — passa o `setEmpresas` e recebe a
 * lista já tipada. Só existe UMA requisição por ciclo, mesmo com várias telas
 * montadas.
 */
export default function useEmpresasAoVivo<T>(
  aplicar: (lista: T[]) => void,
  /** Passe `false` quando a tela ainda nao precisa da lista: nada e buscado e o
   *  relogio nao roda. Serve para casos como "so busca se a empresa tem
   *  coordenada", que antes eram um `if` dentro do useEffect. */
  ativo: boolean = true,
) {
  const [estado, setEstado] = useState({ carregando, erro });
  // A tela pode passar uma função nova a cada render; a inscrição não deve
  // depender disso.
  const ultimoAplicar = useRef(aplicar);
  ultimoAplicar.current = aplicar;

  useEffect(() => {
    if (!ativo) return;
    const receber = (l: Linha[]) => {
      ultimoAplicar.current(l as unknown as T[]);
      // Objeto novo só quando algo mudou de fato: senão cada ciclo do relógio
      // re-renderizaria a tela inteira sem motivo.
      setEstado(anterior =>
        anterior.carregando === carregando && anterior.erro === erro
          ? anterior
          : { carregando, erro });
    };
    inscritos.add(receber);
    if (inscritos.size === 1) ligarRelogio();
    // Já tem lista de outra tela? Mostra na hora e revalida por baixo.
    if (lista.length) receber(lista);
    buscar();

    return () => {
      inscritos.delete(receber);
      if (inscritos.size === 0) desligarRelogio();
    };
  }, [ativo]);

  return { ...estado, recarregar: buscar };
}
