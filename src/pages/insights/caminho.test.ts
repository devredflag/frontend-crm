/**
 * Testes dos ajudantes puros de desenho: o traçado com buracos e a varredura
 * do cursor.
 *
 * É a lógica mais fácil de errar em silêncio de toda a tela: um caminho SVG
 * malformado não lança erro, não aparece no build e não quebra teste nenhum —
 * ele simplesmente desenha a linha ligando os dois lados do buraco, que é
 * exatamente a mentira que essa função existe para impedir. Como esta tela não
 * pode ser aberta no navegador durante o desenvolvimento, a única forma de
 * saber que o vão está lá é conferir a string.
 */

import { caminhoComBuracos, mesMaisProximo, mesSobCursor, posicaoNoViewBox } from "./pecas";

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

// ═══════════════════════════════════════════════════════════════════════════
// Varredura do cursor
//
// Estes três decidem qual mês o gráfico mostra enquanto o mouse anda. Erro de
// um aqui não quebra nada e não aparece no build: o desenho continua plausível,
// só mostrando o mês errado — que é a pior categoria de bug num painel de
// métrica, porque a pessoa confia no número.
// ═══════════════════════════════════════════════════════════════════════════

describe("posicaoNoViewBox", () => {
  // Caixa renderizada com 360px representando um viewBox de 720: escala 2x.
  const caixa = { left: 100, width: 360 };
  const W = 720, L = 48, R = 16;

  it("mapeia a posição da tela para o viewBox pela escala", () => {
    expect(posicaoNoViewBox(100 + 180, caixa, W, L, R)).toBe(360);   // meio
  });

  it("prende na margem esquerda em vez de sair do gráfico", () => {
    expect(posicaoNoViewBox(100, caixa, W, L, R)).toBe(L);
    expect(posicaoNoViewBox(0, caixa, W, L, R)).toBe(L);             // fora, à esquerda
  });

  it("prende na margem direita", () => {
    expect(posicaoNoViewBox(100 + 360, caixa, W, L, R)).toBe(W - R);
    expect(posicaoNoViewBox(9999, caixa, W, L, R)).toBe(W - R);
  });

  it("caixa de largura zero devolve null em vez de dividir por zero", () => {
    expect(posicaoNoViewBox(200, { left: 0, width: 0 }, W, L, R)).toBeNull();
  });
});

describe("mesMaisProximo (linha)", () => {
  // 6 meses, pontos em 48, 178, 308, 438, 568, 698 — faixa de 130.
  const L = 48, faixa = 130, n = 6;

  it("em cima do ponto devolve aquele mês", () => {
    expect(mesMaisProximo(48, L, faixa, n)).toBe(0);
    expect(mesMaisProximo(308, L, faixa, n)).toBe(2);
    expect(mesMaisProximo(698, L, faixa, n)).toBe(5);
  });

  it("arredonda para o mais próximo, não para o anterior", () => {
    // 240 está a 62 do mês 1 (178) e a 68 do mês 2 (308): ganha o 1.
    expect(mesMaisProximo(240, L, faixa, n)).toBe(1);
    // 250 já está mais perto do 2.
    expect(mesMaisProximo(250, L, faixa, n)).toBe(2);
  });

  it("as pontas têm meia faixa de alcance", () => {
    expect(mesMaisProximo(48 + 60, L, faixa, n)).toBe(0);
    expect(mesMaisProximo(698 - 60, L, faixa, n)).toBe(5);
  });

  it("nunca sai do intervalo", () => {
    expect(mesMaisProximo(-500, L, faixa, n)).toBe(0);
    expect(mesMaisProximo(99999, L, faixa, n)).toBe(n - 1);
  });

  it("série de um mês só não quebra", () => {
    expect(mesMaisProximo(300, L, faixa, 1)).toBe(0);
    expect(mesMaisProximo(300, L, 0, 6)).toBe(0);
  });
});

describe("mesSobCursor (coluna)", () => {
  // 6 colunas de 110 a partir de 52: [52,162), [162,272), ...
  const L = 52, passo = 110, n = 6;

  it("a coluna vale da borda esquerda até a próxima", () => {
    expect(mesSobCursor(52, L, passo, n)).toBe(0);
    expect(mesSobCursor(161, L, passo, n)).toBe(0);
    expect(mesSobCursor(162, L, passo, n)).toBe(1);   // a borda pertence à seguinte
  });

  it("não arredonda: metade da coluna não pertence à vizinha", () => {
    // Com `round` no lugar de `floor`, 120 cairia na coluna 1 — e a coluna
    // realçada não seria a que está debaixo do cursor.
    expect(mesSobCursor(120, L, passo, n)).toBe(0);
  });

  it("nunca sai do intervalo", () => {
    expect(mesSobCursor(-999, L, passo, n)).toBe(0);
    expect(mesSobCursor(99999, L, passo, n)).toBe(n - 1);
  });

  it("sem colunas ou sem passo não quebra", () => {
    expect(mesSobCursor(300, L, passo, 0)).toBe(0);
    expect(mesSobCursor(300, L, 0, 6)).toBe(0);
  });
});
