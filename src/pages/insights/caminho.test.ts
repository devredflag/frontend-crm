/**
 * Testes do traçado com buracos.
 *
 * É a lógica mais fácil de errar em silêncio de toda a tela: um caminho SVG
 * malformado não lança erro, não aparece no build e não quebra teste nenhum —
 * ele simplesmente desenha a linha ligando os dois lados do buraco, que é
 * exatamente a mentira que essa função existe para impedir. Como esta tela não
 * pode ser aberta no navegador durante o desenvolvimento, a única forma de
 * saber que o vão está lá é conferir a string.
 */

import { caminhoComBuracos } from "./pecas";

// Escalas de identidade: o `d` fica legível e o teste fala de estrutura, não
// de aritmética de coordenadas — que é o que importa aqui.
const x = (i: number) => i;
const y = (v: number) => v;

describe("caminhoComBuracos", () => {
  it("série inteira vira um traço só", () => {
    expect(caminhoComBuracos([1, 2, 3], x, y)).toBe("M0,1 L1,2 L2,3");
  });

  it("o buraco INTERROMPE o traço em vez de saltar por cima", () => {
    const d = caminhoComBuracos([1, 2, null, 4, 5], x, y);
    expect(d).toBe("M0,1 L1,2 M3,4 L4,5");
    // A garantia que interessa: nenhum segmento liga o antes ao depois do vão.
    expect(d).not.toContain("L3,4 L4,5 M");
    expect(d.split("M")).toHaveLength(3);   // "" + dois trechos
  });

  it("buracos seguidos abrem um trecho só depois deles", () => {
    expect(caminhoComBuracos([1, null, null, 4], x, y)).toBe("M0,1 L0,1 M3,4 L3,4");
  });

  it("ponto sozinho vira segmento de comprimento zero, que o linecap arredonda", () => {
    // Sem isto, um "M" seguido de nada não desenha coisa alguma e o único mês
    // com dado do período sumiria do gráfico.
    expect(caminhoComBuracos([null, 7, null], x, y)).toBe("M1,7 L1,7");
  });

  it("buraco na ponta não deixa traço solto", () => {
    expect(caminhoComBuracos([null, 2, 3], x, y)).toBe("M1,2 L2,3");
    expect(caminhoComBuracos([1, 2, null], x, y)).toBe("M0,1 L1,2");
  });

  it("série toda vazia devolve caminho vazio", () => {
    expect(caminhoComBuracos([null, null], x, y)).toBe("");
  });

  it("zero é valor e continua ligado — não é buraco", () => {
    expect(caminhoComBuracos([0, 0, 1], x, y)).toBe("M0,0 L1,0 L2,1");
  });
});
