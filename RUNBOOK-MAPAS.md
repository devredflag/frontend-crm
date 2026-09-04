# Runbook de Mapas — quando o mapa ou a rota param de funcionar

Guia operacional dos **três serviços externos** que sustentam o mapa e o planejador de
rota. Escrito para ser lido com o problema acontecendo.

O CRM depende de três serviços independentes. Eles falham de formas diferentes, dão
sintomas diferentes e — o ponto mais importante deste documento — **têm caminhos de
recuperação completamente diferentes.** Um deles se resolve com um e-mail; os outros dois
não têm a quem pedir.

| Serviço | Para quê | Onde vive | Bloqueio tem conserto? |
|---|---|---|---|
| **OpenFreeMap** | desenho do mapa (tiles) | `utils/mapa.ts` (frontend) | não bloqueia — sem cota, sem chave |
| **OSRM demo** | rota por ruas e matriz de distâncias | `main.py` → `/geo/rota`, `/geo/matriz` | ❌ **não** |
| **Nominatim** | endereço digitado → coordenada | `main.py` → `/geo/buscar` | ❌ **não** |

---

## 0. Diagnóstico em 30 segundos

Olhe a tela e o console (F12) antes de mexer em qualquer coisa.

| O que você vê | Camada com problema | Vá para |
|---|---|---|
| Mapa desenha, rota não aparece | OSRM | [seção 2](#2-osrm--rota-e-matriz) |
| Mapa cinza/branco, resto da tela normal | tiles | [seção 1](#1-tiles--o-desenho-do-mapa) |
| Mapa com quadrados escritos "Access blocked" | tiles, no fallback OSM | [seção 1](#1-tiles--o-desenho-do-mapa) |
| Linha reta entre empresas em vez de rota por ruas | OSRM | [seção 2](#2-osrm--rota-e-matriz) |
| "Endereço não encontrado" para endereço que existe | Nominatim | [seção 3](#3-nominatim--endereço-digitado) |
| Console: `violates ... Content Security Policy` | **CSP**, não o mapa | [seção 1.5](#15-csp--o-host-precisa-estar-liberado) |
| Console: `[mapa] MapLibre nao carregou` | tiles (vetorial) | [seção 1](#1-tiles--o-desenho-do-mapa) |
| Console: `[mapa] provedor de tiles nao respondeu` | tiles (raster) | [seção 1](#1-tiles--o-desenho-do-mapa) |
| Log do backend: `[OSRM] status 403` / `429` | OSRM | [seção 2](#2-osrm--rota-e-matriz) |

**Regra geral: nenhuma dessas falhas derruba a tela.** Todas degradam. Antes de agir com
pressa, confirme que não é só uma indisponibilidade passageira de serviço de terceiro.

---

## 1. Tiles — o desenho do mapa

### Como está montado

Três camadas encadeadas, cada uma cobrindo uma falha diferente da anterior:

```
1º  OpenFreeMap (vetorial, MapLibre GL)   ← o padrão
      ↓ falha se: sem WebGL, CDN do unpkg fora, estilo não responde
2º  Raster de REACT_APP_TILE_URL          ← hoje: Stadia OSM Bright
      ↓ falha se: origem não autorizada (401), provedor fora
3º  tile.openstreetmap.org                ← último recurso
```

A queda é automática. O usuário vê o mapa mudar de aparência, não sumir.

### Por que o OpenFreeMap é o padrão

É o **único** dos provedores avaliados que permite uso comercial de graça: sem chave, sem
cadastro, sem cota, cobrindo o planeta. Os planos gratuitos do **Stadia** e do **MapTiler**
são explicitamente **não comerciais** — o do Stadia considera comercial "uso por
organização com fins lucrativos, independentemente de gerar receita" — e a política do
`tile.openstreetmap.org` também não cobre produto comercial.

> ⚠️ Isso significa que as camadas 2 e 3 são **degradação, não alternativas permanentes**.
> Se o mapa ficar semanas rodando no fallback, isso é uma pendência de licença, não só um
> detalhe técnico.

### Escotilha: desligar o vetorial

Se o MapLibre der problema em alguma máquina ou navegador:

**Vercel → Settings → Environment Variables → `REACT_APP_TILE_STYLE`**

Qualquer valor que **não** comece com `http` desliga o vetorial e volta ao raster:
`off`, `none`, `-`, `{}`. Depois, **Redeploy**.

> ⚠️ Essa variável é uma armadilha se ficar esquecida: ela não muda nada visível (o mapa
> continua funcionando, só que em raster), mas desfaz em silêncio a correção de licença.
> **Depois de resolver o incidente, apague a variável** — não a edite para vazio, porque o
> painel da Vercel não aceita campo vazio.

### Trocar de estilo ou de provedor

`REACT_APP_TILE_STYLE` com uma URL de estilo do OpenFreeMap:
`bright` (atual), `liberty`, `positron`, `dark`.

```
https://tiles.openfreemap.org/styles/liberty
```

Para trocar o **raster de fallback**, use `REACT_APP_TILE_URL`. A atribuição NÃO é
configurável e não deve ser: ela mora em `src/utils/mapa.ts`, deduzida da URL. É texto
obrigatório por licença e já chegou corrompido ao passar por formulário — `&copy;` virou
`copy;` e `<a href=` virou `<ahref=`.

### O bloqueio do OpenStreetMap é SILENCIOSO

Se a camada 3 for atingida, o OSM responde **HTTP 200 com uma imagem escrita "Access
blocked"**. Não é 403. Não gera erro de rede, não aparece no console, e nenhum
monitoramento de status HTTP pegaria.

Sinal para confirmar (só visível fora do navegador):

```bash
curl -sI "https://tile.openstreetmap.org/13/2973/4691.png" | grep -i x-blocked
# x-blocked: Access denied. See https://operations.osmfoundation.org/policies/tiles/
```

O tile bloqueado é byte a byte idêntico para qualquer coordenada — dois tiles diferentes
com o mesmo conteúdo é bloqueio, sem margem para dúvida.

> ⚠️ Testar com `curl` sem `-A` dá falso positivo: o OSM bloqueia o User-Agent do curl. Use
> um User-Agent de navegador para saber se o **app** está bloqueado:
> ```bash
> curl -sI -A "Mozilla/5.0" -e "https://frontend-crm-xi-plum.vercel.app/" \
>   "https://tile.openstreetmap.org/13/2973/4691.png" | grep -i x-blocked
> ```

---

## 1.5. CSP — o host precisa estar liberado

Se o mapa some por inteiro e o console mostra `violates the following Content Security
Policy`, **o problema não é o mapa: é o `vercel.json`.**

Todo host externo novo precisa entrar em `connect-src`. Aconteceu na estreia do
OpenFreeMap: o mapa sumiu em produção porque o host não estava na lista.

> ⚠️ **Por que isso passa despercebido:** o `img-src` libera qualquer `https:`, então tiles
> **raster** funcionam sem tocar no CSP. Já o **vetorial** baixa estilo, fontes, sprites e
> tiles por `fetch`, e fetch cai em `connect-src`. Trocar de raster para vetorial é
> exatamente o momento em que o CSP passa a importar.

O que o OpenFreeMap precisa (tudo no mesmo host, já liberado):

```
https://tiles.openfreemap.org/styles/bright              estilo
https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf   glyphs
https://tiles.openfreemap.org/sprites/ofm_f384/ofm       sprites
https://tiles.openfreemap.org/planet                     tiles vetoriais
https://tiles.openfreemap.org/natural_earth/...          relevo (img-src)
```

Já satisfeitos por outras diretivas e que **não** devem ser removidos: `worker-src 'self'
blob:` (o MapLibre roda workers em blob), `script-src ... unpkg.com` e `style-src ...
unpkg.com` (a biblioteca vem do CDN).

Nota: `router.project-osrm.org`, `nominatim.openstreetmap.org` e `*.openstreetmap.org`
continuam em `connect-src` mas **não são mais usados pelo navegador** — o roteamento e o
geocoding passam pelo backend desde o proxy. São permissões mortas, candidatas a limpeza
numa hora calma (não durante um incidente).

---

## 2. OSRM — rota e matriz

### ❌ Não existe desbloqueio

Este é o ponto mais importante do documento. O `router.project-osrm.org` é um servidor de
**demonstração mantido por voluntários**. Não há conta, não há painel, não há canal de
apelação, e a documentação deles diz explicitamente que **não é para produção**.

Pior: o bloqueio seria pelo **IP de saída do Railway**, que não é nosso e não controlamos.
Não há a quem pedir e não há o que ajustar.

**A única saída é trocar de origem.**

### O que o app faz sozinho

- Planejador: mostra "O serviço de rotas não respondeu" com botão de tentar de novo, e
  **mantém o traçado anterior** em vez de apagar o mapa
- `MapaProximidade`: desenha linha reta em vez de rota por ruas
- Nada trava, nada some

### Proteções já em código

- **Fila de 1 req/s** no backend (`_osrm_aguardar_vez`), com teto de 8s de espera
- **Cache de 6h** por combinação de pontos
- **Uma chamada de `/table`** no lugar de N chamadas de `/route`
- Debounce em toda interação, e descarte de resposta obsoleta

> ⚠️ **A fila é um global do PROCESSO.** Com mais de um worker de uvicorn, ou mais de uma
> instância no Railway, viram 2+ req/s e a proteção falha **em silêncio**. Sintoma no log:
> `[OSRM] ATENCAO: 429 mesmo com fila local`. Se precisar de mais de um worker, a fila
> tem que sair do processo (Redis).

### Migrar para instância própria

O `OSRM_BASE` é variável de ambiente no Railway. Uma instância auto-hospedada fala a
**mesma API** — `/route` e `/table` idênticos — então **é a única coisa que muda**:

**Railway → backend → Variables → `OSRM_BASE`** = `https://seu-osrm:5000` → restart.

Dimensionamento (números a validar rodando, não medidos aqui):

- Extrato do Brasil no Geofabrik: **1,94 GB** (`south-america/brazil-latest.osm.pbf`)
- O `osrm-extract` é o passo pesado — ordem de 16–32 GB de RAM
- **Roda uma vez e não precisa ser no servidor**: processe em outra máquina e suba só os
  artefatos prontos. É isso que torna a hospedagem barata
- O que fica no ar: ordem de 8–16 GB de RAM, ~100 GB de disco, algo entre €10 e €30/mês

> Por que OSRM e não Valhalla: o Valhalla é mais leve, mas tem outra API
> (`/sources_to_targets` no lugar de `/table`, outro formato de resposta) e exigiria
> reescrever o proxy inteiro. A RAM extra sai mais barata que a reescrita.

---

## 3. Nominatim — endereço digitado

Mesma natureza do OSRM: serviço comunitário, sem contrato, sem desbloqueio. A diferença é
o impacto, que é **pequeno**: quebra apenas a busca por endereço digitado no planejador.
Todo o resto usa coordenada já cadastrada.

Proteções em código: throttle de 1,1s por processo (`_NOMINATIM_INTERVALO`), cache
compartilhado com o do OSRM, e User-Agent próprio exigido pela política do OSM.

Quando for a hora, o mesmo servidor que rodar o OSRM roda um Photon ou Nominatim ao lado.

---

## 4. Comandos de verificação

```bash
B=https://frontend-crm-xi-plum.vercel.app

# Qual bundle a Vercel está servindo
J=$(curl -s "$B/?cb=$RANDOM" | grep -oE 'static/js/main\.[a-z0-9]+\.js'); echo $J

# Qual provedor de tiles está ativo em produção
curl -s "$B/$J" | grep -c "tiles.openfreemap.org"    # 1 = vetorial ativo

# ⚠️ grep -c num bundle minificado devolve 0 ou 1 (é uma linha só), não a contagem.
# ⚠️ A Vercel injeta a mensagem do commit no bundle — uma string pode estar lá só
#    porque foi citada num commit. Confira o CONTEXTO com:
#    curl -s "$B/$J" | grep -o ".\{60\}openfreemap.\{40\}"

# As rotas de mapa do backend estão no ar (401 = existe, 404 = não subiu)
BE=https://backend-crm-production-157b.up.railway.app
for p in /geo/rota /geo/matriz /geo/buscar; do
  echo "$p -> $(curl -s -o /dev/null -w '%{http_code}' "$BE$p")"
done

# O OSRM demo está respondendo
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://router.project-osrm.org/route/v1/driving/-49.31,-25.32;-49.27,-25.43?overview=false"

# Teto do /table do OSRM demo: 100 coordenadas passam, 120 voltam TooBig
```

---

## 5. Situação de licença — o que ainda não está regular

| Serviço | Uso comercial permitido? |
|---|---|
| OpenFreeMap (tiles) | ✅ **sim**, explicitamente |
| OSRM demo (rotas) | ❌ não — "não recomendado para produção" |
| Nominatim (geocoding) | ❌ não para produto comercial |

A fila de 1 req/s garante que não abusamos do **volume**. Ela não muda a questão de
**permissão**.

Enquanto o produto não fatura, a leitura de "avaliação / prova de conceito" se sustenta.
**No dia em que houver o primeiro cliente pagante, não se sustenta mais** — e aí a decisão
sobre o servidor próprio de rotas deixa de ser opcional.

---

## Resumo de prioridade

| Item | Estado |
|---|---|
| Tiles com licença resolvida | ✅ feito (OpenFreeMap) |
| Fila, cache e debounce do OSRM | ✅ feito |
| `OSRM_BASE` configurável | ✅ feito — a troca é uma variável, não um deploy |
| Confirmar quantos workers de uvicorn o Railway sobe | 🔴 **não verificado, e a fila depende disso** |
| Servidor próprio de rotas | 🟡 decisão de custo, antes do primeiro cliente pagante |
| Geocoding próprio | 🟠 baixo impacto, pode esperar |
