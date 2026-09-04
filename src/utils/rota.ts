// Aritmética do planejador de rota — tudo puro, sobre a matriz que o /table já
// trouxe. Nenhuma função aqui toca a rede.
//
// Este arquivo existe separado do componente porque é a parte que dá para
// verificar sozinha: dado uma matriz, a ordem ótima e o custo de inserção são
// resultados exatos, não questão de gosto. Dentro do componente eles ficariam
// enredados em estado de React e só poderiam ser conferidos no olho.

/** Matriz de distância: `[i][j]` é de i até j. `null` = par sem rota. */
export type MatrizKm = (number | null)[][];

/** Teto de paradas confirmadas na rota. Uma constante só: espalhar o número
 *  pelo código é como o limite passa a valer em um lugar e não em outro. */
export const MAX_PARADAS = 5;

/**
 * Custo de encaixar um ponto na sequência atual, e onde encaixá-lo.
 *
 * Testa as k+1 posições de inserção da ORDEM ATUAL — não reotimiza a rota
 * inteira. Isso é deliberado: reotimizar a cada passada de mouse faria a lista
 * se reordenar sozinha embaixo do cursor, e desfaria em silêncio a ordem que o
 * usuário arrastou à mão. Otimizar continua sendo ação explícita (`ordemOtima`).
 *
 *   custo(i) = d(P_i, C) + d(C, P_i+1) − d(P_i, P_i+1)
 *
 * Com nenhuma parada isso é exatamente d(A,C) + d(C,B) − d(A,B): a fórmula do
 * desvio simples é o caso particular desta, não uma conta concorrente.
 *
 * `posicao` é o índice em que C entra no array de paradas: 0 = antes da
 * primeira parada, k = depois da última (logo antes do destino).
 */
export function melhorInsercao(
  matriz: MatrizKm,
  indiceCandidato: number,
  sequencia: number[],
): { km: number; posicao: number } | null {
  if (sequencia.length < 2) return null;
  let melhor: { km: number; posicao: number } | null = null;

  for (let i = 0; i < sequencia.length - 1; i++) {
    const de = matriz[sequencia[i]]?.[indiceCandidato];
    const para = matriz[indiceCandidato]?.[sequencia[i + 1]];
    const trecho = matriz[sequencia[i]]?.[sequencia[i + 1]];
    // Par inalcançável não vira 0: zero seria lido como "coladinho na rota" e
    // o ponto sem acesso apareceria como o melhor candidato de todos.
    if (de == null || para == null || trecho == null) continue;

    const km = de + para - trecho;
    if (!melhor || km < melhor.km) melhor = { km, posicao: i };
  }
  return melhor;
}

/**
 * Custo de inserir numa posição JÁ escolhida.
 *
 * Existe para os minutos saírem da mesma posição que os quilômetros
 * escolheram. Rodar `melhorInsercao` na matriz de tempo daria o mínimo em
 * tempo, que nem sempre é a mesma posição do mínimo em distância — e a tela
 * mostraria "+2,6 km / +6 min" de dois encaixes diferentes.
 */
export function custoNaPosicao(
  matriz: MatrizKm,
  indiceCandidato: number,
  sequencia: number[],
  posicao: number,
): number | null {
  const de = matriz[sequencia[posicao]]?.[indiceCandidato];
  const para = matriz[indiceCandidato]?.[sequencia[posicao + 1]];
  const trecho = matriz[sequencia[posicao]]?.[sequencia[posicao + 1]];
  if (de == null || para == null || trecho == null) return null;
  return de + para - trecho;
}

/** Distância total de percorrer a sequência na ordem dada. null se algum
 *  trecho não tem rota — somar ignorando o buraco daria um total menor que o
 *  real e faria a ordem impossível parecer a melhor. */
export function custoDaSequencia(matriz: MatrizKm, sequencia: number[]): number | null {
  let total = 0;
  for (let i = 0; i < sequencia.length - 1; i++) {
    const trecho = matriz[sequencia[i]]?.[sequencia[i + 1]];
    if (trecho == null) return null;
    total += trecho;
  }
  return total;
}

/**
 * Ordem de menor distância total, por força bruta.
 *
 * Com origem e destino fixos e no máximo 5 paradas no meio são 5! = 120
 * sequências — testar todas custa microssegundos e dá o ótimo exato. Heurística
 * (vizinho mais próximo, 2-opt) só se justifica quando o exato é inviável, e
 * aqui ele não é; usar aproximação seria trocar certeza por nada.
 *
 * Devolve a permutação das paradas, sem origem nem destino.
 */
export function ordemOtima(
  matriz: MatrizKm,
  origem: number,
  destino: number,
  paradas: number[],
): number[] | null {
  if (paradas.length <= 1) return paradas.slice();

  let melhorOrdem: number[] | null = null;
  let melhorCusto = Infinity;

  const permutar = (restantes: number[], acumulado: number[]) => {
    if (restantes.length === 0) {
      const custo = custoDaSequencia(matriz, [origem, ...acumulado, destino]);
      if (custo != null && custo < melhorCusto) {
        melhorCusto = custo;
        melhorOrdem = acumulado.slice();
      }
      return;
    }
    for (let i = 0; i < restantes.length; i++) {
      const proximo = restantes[i];
      permutar([...restantes.slice(0, i), ...restantes.slice(i + 1)], [...acumulado, proximo]);
    }
  };
  permutar(paradas, []);

  return melhorOrdem;
}

/** Move um item de posição — o resultado do arrasto na lista de paradas. */
export function mover<T>(lista: T[], de: number, para: number): T[] {
  if (de === para || de < 0 || para < 0 || de >= lista.length || para >= lista.length) {
    return lista;
  }
  const copia = lista.slice();
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
}
