---
version: alpha
name: ProspectaGeo
description: Ferramenta de operação para prospecção em campo — densa, neutra, sem ornamento.
colors:
  canvas: "#F6F7F8"
  surface: "#FFFFFF"
  surface-sunken: "#F0F2F4"
  ink: "#16191D"
  ink-muted: "#5B6570"
  ink-faint: "#8A929B"
  line: "#E3E6E9"
  line-strong: "#CBD1D7"
  primary: "#2563EB"
  primary-hover: "#1D4FD7"
  primary-wash: "#EFF4FE"
  on-primary: "#FFFFFF"
  positive: "#0F7B4F"
  positive-wash: "#ECF6F1"
  warning: "#8A5A00"
  warning-wash: "#FBF4E6"
  danger: "#B42318"
  danger-wash: "#FDF1F0"
typography:
  h1:
    fontFamily: system-ui
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  h2:
    fontFamily: system-ui
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.005em
  h3:
    fontFamily: system-ui
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: system-ui
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: system-ui
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: system-ui
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  overline:
    fontFamily: system-ui
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.06em
  data:
    fontFamily: ui-monospace
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "'tnum' 1"
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  gutter: 16px
  sidebar: 232px
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    height: 34px
    padding: "0 {spacing.md}"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: 34px
    padding: "0 {spacing.md}"
    typography: "{typography.label}"
  button-secondary-hover:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    height: 34px
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: 34px
    padding: "0 {spacing.md}"
    typography: "{typography.body}"
  input-placeholder:
    textColor: "{colors.ink-faint}"
  input-disabled:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink-muted}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  list-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    padding: "{spacing.md} {spacing.lg}"
    typography: "{typography.label}"
  list-row-hover:
    backgroundColor: "{colors.surface-sunken}"
  list-row-selected:
    backgroundColor: "{colors.primary-wash}"
    textColor: "{colors.ink}"
  badge:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
    padding: "2px {spacing.sm}"
    typography: "{typography.caption}"
  badge-positive:
    backgroundColor: "{colors.positive-wash}"
    textColor: "{colors.positive}"
    rounded: "{rounded.sm}"
    typography: "{typography.caption}"
  badge-warning:
    backgroundColor: "{colors.warning-wash}"
    textColor: "{colors.warning}"
    rounded: "{rounded.sm}"
    typography: "{typography.caption}"
  badge-danger:
    backgroundColor: "{colors.danger-wash}"
    textColor: "{colors.danger}"
    rounded: "{rounded.sm}"
    typography: "{typography.caption}"
  page:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  table-header:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.overline}"
  data-cell:
    textColor: "{colors.ink}"
    typography: "{typography.data}"
---

# ProspectaGeo

## Overview

Uma ferramenta de operação interna, do registro visual de Linear, Height ou do painel
administrativo do Stripe. O usuário é um vendedor em campo que abre o CRM entre uma visita e
outra, muitas vezes no celular, na rua, com pressa e com o sol batendo na tela. Ele não vem
para ser impressionado; vem para saber quais empresas faltam na região, o que já foi
conversado e quanto vale o orçamento aberto.

A interface tem que **sumir na frente do dado**. Densidade é uma virtude: cabe mais empresa na
tela, menos rolagem, menos toque. O prazer visual vem do alinhamento, do respiro consistente e
da tipografia legível — nunca de efeito. Uma tela bem resolvida aqui parece um instrumento bem
construído: sóbria, previsível, sem nada piscando.

O produto tem duas plateias e uma só língua visual. O vendedor quer velocidade; o gerente
quer confiança para assinar. Ambos são melhor servidos por uma tela que parece feita para
trabalhar do que por uma que parece feita para vender.

## Colors

Um sistema de neutros com **um único acento**. A cor não decora: ela indica ação ou estado.
Se um elemento não é clicável e não comunica estado, ele é neutro.

- **Canvas** {colors.canvas} é o fundo da página — um cinza levemente frio, sólido, sem
  gradiente e sem textura. É a mesa sobre a qual o conteúdo se apoia.
- **Surface** {colors.surface} é o branco de todo painel, card, linha de lista e campo. O
  contraste entre canvas e surface é o que separa conteúdo de fundo; não usamos sombra para
  isso.
- **Surface sunken** {colors.surface-sunken} é o degrau para baixo: cabeçalho de tabela,
  estado hover de linha, fundo de badge neutro, campo desabilitado.
- **Ink** {colors.ink} carrega todo texto primário e todo ícone ativo. Nunca preto puro.
- **Ink muted** {colors.ink-muted} é rótulo, metadado e texto secundário. **Ink faint**
  {colors.ink-faint} é placeholder e texto desabilitado — o piso da hierarquia, nunca usado
  para informação que importa.
- **Line** {colors.line} desenha toda separação: borda de card, divisória de lista, régua de
  tabela. Sempre 1px, sempre sólida. **Line strong** {colors.line-strong} é a borda de
  elemento interativo em repouso (campo, botão secundário), um degrau mais visível porque
  convida ao toque.
- **Primary** {colors.primary} é o único azul do sistema e aparece em três lugares: fundo do
  botão primário, borda de foco e indicação do item ativo na navegação. **Primary wash**
  {colors.primary-wash} é a versão de fundo para linha selecionada e anel de foco.
- **Positive** {colors.positive}, **warning** {colors.warning} e **danger** {colors.danger}
  são estados, não enfeites: orçamento aprovado, prazo vencendo, exclusão. Cada um tem um
  *wash* correspondente para fundo de badge. Um vermelho na tela deve significar que algo
  está errado — se ele aparece como cor de marca, perde o poder de alarmar.

Os status do funil (Lead, Contato, Proposta, Fechado) usam **ink-muted sobre surface-sunken**,
com o acento apenas na etapa corrente. Um funil pintado com cinco cores diferentes vira um
gráfico de pizza: bonito e ilegível.

## Typography

Uma família só, a do sistema operacional (`system-ui`), porque uma ferramenta de operação deve
parecer nativa da máquina em que roda e carregar instantaneamente no 4G do vendedor. A
diferenciação vem de **peso e tamanho**, não de fontes diferentes.

- **H1** {typography.h1} é o nome da tela, uma vez por página. Não existe título maior que
  este em lugar nenhum.
- **H2** {typography.h2} nomeia seção ou painel; **H3** {typography.h3} nomeia card e linha de
  destaque.
- **Body** {typography.body} a 14px é o corpo de tudo. 14px é a medida de app operacional;
  16px já é registro de site institucional.
- **Label** {typography.label} é texto de botão, aba e rótulo de campo. **Caption**
  {typography.caption} é metadado sob o dado principal.
- **Overline** {typography.overline}, em caixa alta com entreletra aberta, é o único uso de
  maiúsculas do sistema: rotula um bloco (`PROSPECÇÃO`, `EQUIPAMENTOS`). Nunca em botão,
  nunca em frase.
- **Data** {typography.data} é monoespaçada com numerais tabulares e existe para número que
  se compara na vertical: valor de orçamento, contagem, distância, CNPJ, data. Coluna de
  números em fonte proporcional não alinha, e não alinhar é erro de leitura, não de gosto.

A escala é modesta de propósito: do corpo ao título maior há 1,7×. Salto tipográfico grande é
recurso de landing page.

## Layout

Coluna de navegação fixa de {spacing.sidebar} à esquerda no desktop, colapsando em menu
sobreposto no mobile. O conteúdo ocupa o resto da largura sem `max-width` estreito — é uma
ferramenta, não um artigo; a tela larga do gerente deve caber mais linhas, não mais margem.

Escala de espaço de base 4, usada em toda a régua: {spacing.xs}, {spacing.sm}, {spacing.md},
{spacing.lg}, {spacing.xl}, {spacing.2xl}. Padding interno de card é {spacing.lg}; a distância
entre blocos de uma mesma tela é {spacing.xl}.

Listas são **linhas com divisória**, não uma pilha de cards flutuando com espaço entre eles.
A lista de empresas em `/buscar` e a de orçamentos em `/gerenciamento` são o coração do
produto: cada linha é uma divisória de 1px, hover em surface-sunken, e a ação aparece à
direita alinhada em coluna. Isso cabe o dobro de itens na mesma altura de tela que o formato
de card.

## Elevation & Depth

**O sistema é plano.** Hierarquia se comunica por linha de 1px, por degrau tonal entre canvas,
surface e surface-sunken, e por posição — nunca por sombra.

A única exceção é o que flutua de verdade acima da página e precisa de separação inequívoca:
modal, dropdown e a InfoWindow do mapa. Esses recebem uma sombra só, neutra e discreta
(`0 4px 12px rgba(22,25,29,0.10)`), mais 1px de {colors.line}. Sombra colorida não existe no
sistema. Sombra para "dar profundidade" a card estático não existe no sistema.

Não há `backdrop-filter` em lugar nenhum. Vidro fosco é o efeito que mais denuncia interface
gerada e, num celular no meio da rua, é também o que mais custa em bateria e legibilidade.

## Shapes

Cantos discretos e consistentes: {rounded.md} para botão, campo e badge; {rounded.lg} para
card e painel; {rounded.sm} para marcações mínimas. **Nada acima de 8px**, exceto avatar e
ponto de status, que são {rounded.full}.

Raio grande arredonda o clima junto: 16px ou 20px em card empurra a interface para o registro
de app de consumo. Aqui o retângulo é honesto.

## Components

**Botão.** Três variantes e nenhuma a mais. *Primário*: fundo {colors.primary}, texto branco,
altura 34px, uma ocorrência por área de tela — se há dois primários lado a lado, um deles não
é primário. *Secundário*: surface com borda {colors.line-strong}. *Fantasma*: só texto
{colors.ink-muted}, para ação destrutiva ou terciária. Ícone dentro de botão tem 16px e fica
à esquerda do texto.

**Campo.** Altura 34px, borda 1px {colors.line-strong}, raio {rounded.md}, placeholder em
{colors.ink-faint}. Foco troca a borda para {colors.primary} e adiciona anel de 2px em
{colors.primary-wash} — sem glow, sem transição de cor demorada. Erro troca a borda para
{colors.danger} e escreve a razão embaixo, em caption; nunca só pinta a borda de vermelho e
deixa o usuário adivinhar.

**Card.** Surface, borda 1px {colors.line}, raio {rounded.lg}, padding {spacing.lg}. Sem
sombra. Um card é um recipiente de conteúdo relacionado — se não há conteúdo relacionado, é
só uma caixa.

**Linha de lista.** Divisória de 1px embaixo, padding vertical {spacing.md}, hover em
surface-sunken, seleção em accent-wash com barra de 2px em {colors.primary} à esquerda. Nome
em label, endereço e metadados em caption/ink-muted, números em data.

**Badge de status.** Texto em caption, fundo no *wash* do estado, texto na cor do estado, raio
{rounded.sm}, sem borda e sem ponto colorido antes do texto. O badge é retângulo pequeno, não
pílula: pílula é registro de rede social.

**Aba.** Texto em label, ink-muted quando inativa, ink quando ativa, com sublinhado de 2px em
{colors.primary} apenas na ativa. Sem cápsula, sem fundo, sem sombra.

**Mapa.** O mapa é o único elemento cromaticamente rico da interface, e é assim de propósito —
é conteúdo, não decoração. Os controles sobre ele seguem o sistema: surface, 1px de linha,
raio {rounded.md}. O marcador de empresa usa {colors.primary}; o de posição do usuário usa
{colors.ink}; empresa já cadastrada usa {colors.positive}.

## Motion

Transições curtas e mecânicas: 120ms para retorno de interação (hover, foco, pressionar) e
180ms para transição de conteúdo (painel, modal, aba), sempre em `cubic-bezier(0.2, 0, 0, 1)`.
Nada acima de 200ms, nada que balance, nada que repita.

Não existe animação em laço na interface. Gradiente que anda, elemento que flutua e pulso que
respira são o vocabulário do site promocional. Sob `prefers-reduced-motion`, toda duração
colapsa para 0ms.

## Do's and Don'ts

- **Don't** usar fundo decorativo: nada de círculos borrados flutuando, malha de pontinhos,
  gradiente diagonal ou textura. O fundo da página é {colors.canvas} sólido.
- **Don't** usar `backdrop-filter` / vidro fosco em lugar nenhum.
- **Don't** usar gradiente. Nem em botão, nem em texto, nem em fundo, nem em ícone. Uma cor
  chapada sempre.
- **Don't** animar cor de texto em laço, nem usar `background-clip: text`.
- **Don't** usar sombra em card, botão, campo ou badge. Sombra só no que flutua (modal,
  dropdown, InfoWindow), e neutra.
- **Don't** usar raio maior que 8px, exceto avatar e ponto de status.
- **Don't** usar emoji como ícone de interface. Ícone é do Lucide, 16px, `stroke-width` 1.5,
  na cor do texto que acompanha.
- **Don't** usar mais de um azul. Se precisa de outro azul, o que você precisa é de neutro.
- **Don't** pintar cada status do funil de uma cor diferente.
- **Don't** empilhar cards com espaço entre eles onde a informação é uma lista. Lista é linha
  com divisória.
- **Don't** centralizar texto de conteúdo. Centralizado só em estado vazio.
- **Do** tratar densidade como funcionalidade: mais linhas visíveis é uma melhoria, não um
  problema.
- **Do** alinhar todo número à direita e em {typography.data}.
- **Do** deixar o estado vazio explicar o que fazer em uma frase e oferecer a ação — sem
  ilustração e sem ícone gigante.
- **Do** manter uma única ação primária por área de tela.
- **Do** confiar em 1px de {colors.line}. Quando uma tela parecer "sem graça", o problema
  quase sempre é alinhamento ou espaçamento inconsistente, não falta de efeito.
