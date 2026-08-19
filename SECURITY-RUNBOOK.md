# Runbook de Segurança — Infra e Configuração

Guia operacional dos itens que **não são código** (dashboards Cloudflare/Vercel/Railway)
e das variáveis de ambiente exigidas pelas mudanças de código já aplicadas.

Stack: **Vercel** (frontend CRA) + **Railway** (backend FastAPI) + **Postgres** (Railway).

---

## 0. AÇÃO OBRIGATÓRIA — variáveis de ambiente (fazer antes do deploy)

As mudanças de código dependem destas variáveis. Configure no **Railway → projeto do
backend → Variables**:

| Variável | Valor | Por quê |
|---|---|---|
| `JWT_SECRET` | string aleatória longa (ex.: `openssl rand -base64 64`) | **CRÍTICO.** O código antes usava `"super_secret_key"` hardcoded — qualquer um podia forjar tokens. Sem essa var, o backend gera uma chave aleatória a cada restart (desloga todo mundo). |
| `FRONTEND_ORIGINS` | `https://frontend-crm-xi-plum.vercel.app` (+ domínio customizado, separados por vírgula) | CORS restrito. Sem isso usa o default do código. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` (opcional) | Vida do access token. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` (opcional) | Vida do refresh token. |
| `ALERTA_EXPORTACAO_MASSA` | `100` (opcional) | Nº de leads numa listagem que dispara alerta de auditoria. |
| `LGPD_RETENCAO_MESES` | `18` (opcional) | Meses sem interação p/ virar candidato a anonimização. |
| `LGPD_RETENCAO_AUTO` | `false` (**mantenha false**) | Se `true`, o job APAGA os leads elegíveis. Deixe `false` até validar a política. |

> ⚠️ **`JWT_SECRET` deve ser gerado UMA vez e mantido fixo.** Se mudar, todos os usuários
> são deslogados. Guarde-o só no Railway (nunca no código).

Dependências novas do backend (já em `requirements.txt`): `slowapi`, `pyotp`, `qrcode[pil]`, `requests`.

### Deploy conjunto (importante)
O frontend novo espera o access token curto + `/refresh`. **Faça deploy do backend e do
frontend juntos.** Teste antes em **preview deploy** da Vercel (ver seção 6).

---

## 1. Cloudflare na frente de Vercel + Railway  🔴

1. Criar conta Cloudflare e adicionar o domínio (nameservers apontando pra Cloudflare).
2. Registro do frontend (CNAME → Vercel) com **proxy ativado** (nuvem laranja).
3. Registro da API (CNAME → domínio do Railway) com **proxy ativado**.
   - No Railway, adicionar o domínio customizado da API e usá-lo no `FRONTEND`/`api.ts`
     em vez do `*.up.railway.app` (para o Cloudflare cobrir a API também).
4. SSL/TLS mode: **Full (strict)**.
5. Guardar "Under Attack Mode" para ativar manualmente em caso de ataque.

## 2. WAF / Rate limit de borda (Cloudflare)  🔴

- **Rate Limiting Rules**: `/login` e `/signup` → ~10 req/min por IP (reforça o rate
  limit da aplicação, que é in-memory e por instância).
- **Firewall rules**: se o público é só BR, considerar challenge/bloqueio por país.
- Bot Fight Mode: ativar.

## 3. Turnstile + honeypot (se/quando houver formulário PÚBLICO de lead)  🔴

> Hoje o app **não tem** formulário público de captura (o cadastro é autenticado).
> Ao criar uma landing com formulário de lead, aplicar:
- Cloudflare Turnstile no formulário; validar o token no backend antes de gravar.
- Campo honeypot invisível (`name="website"`), descartar submissão se preenchido.
- Já existe rate limit de aplicação (slowapi) pronto para reaproveitar na rota.

## 4. Headers de segurança (Vercel)  ✅ FEITO NO CÓDIGO

`vercel.json` já define HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
Permissions-Policy (com `geolocation=(self)` porque o mapa usa GPS) e um CSP calibrado
para Google Maps/OSRM/OpenStreetMap/Waze/Fonts. Conferir no deploy com
[securityheaders.com](https://securityheaders.com).

## 5. Secrets  ✅ / ⚠️

- ✅ `.env` do frontend removido do rastreamento do git + adicionado ao `.gitignore`.
- ✅ `SECRET_KEY` do backend movido para `JWT_SECRET` (env).
- ⚠️ **Rotacionar** a chave do Google Maps (`VITE_GOOGLE_MAPS_KEY`) no Google Cloud
  Console e **restringir por referrer HTTP** (domínio do site). Ela é embutida no bundle
  do navegador — a proteção real é a restrição por domínio, não o segredo.
- ⚠️ Considerar reescrever o histórico do git para remover o `.env` antigo, **ou**
  simplesmente rotacionar a chave (mais simples e suficiente aqui).

## 6. Validação em preview antes de produção  🔴

1. Deploy do backend novo num ambiente/preview (ou direto, fora de pico) com as vars.
2. Preview deploy da Vercel apontando para o backend novo.
3. Testar o fluxo completo:
   - Login OK → dashboard; recarregar a página (F5) → **continua logado** (bootstrap via `/refresh`).
   - Login com senha errada → mensagem genérica "E-mail ou senha inválidos".
   - 5 tentativas erradas → bloqueio de 15 min (429).
   - Ativar MFA no `/perfil`, deslogar, logar → pede código; código errado bloqueia.
   - Callbacks Google/Outlook continuam conectando (token restaurado após redirect).
4. Rodar OWASP ZAP básico contra o preview.

## 7. Backup e continuidade  🟡

- Railway Postgres: confirmar **snapshot diário** habilitado.
- **Testar restauração** ao menos uma vez.
- Configurar **alerta de billing** e **teto de autoscaling** no Railway (evita custo em ataque).

## 8. Dependências / CI  🟠

- `npm audit` no frontend e `pip-audit` no backend no CI.
- Habilitar **Dependabot** no GitHub.

## 9. Observabilidade  🟠

- Integrar **Sentry** (erros) no frontend e backend.
- Logs de auditoria já gravam em `audit_log` (tabela) e printam alertas de exportação
  em massa no stdout → encaminhar stdout do Railway para **Better Stack/Logtail** e criar
  alerta para as ações `LEADS_EXPORTACAO_MASSA`, `REFRESH_REUSO_DETECTADO`, `MFA_FALHOU`.

## 10. Plano de resposta a incidente  🟡

Fluxo: Detecção (alertas) → Contenção (revogar sessões via `/logout-all` / rotacionar
`JWT_SECRET`) → Avaliação de impacto → Notificação ANPD/titulares se risco relevante →
Remediação → Documentação. Definir responsável técnico e contato de emergência.

---

## Resumo de prioridade

| Prioridade | Item | Onde |
|---|---|---|
| 🔴 Já | Definir `JWT_SECRET` + `FRONTEND_ORIGINS` no Railway | Dashboard |
| 🔴 Já | Deploy conjunto backend+frontend + validar em preview | Vercel/Railway |
| 🔴 Depois | Cloudflare proxy + WAF na frente de Vercel e Railway | Cloudflare |
| 🟠 Em seguida | Rotacionar/restringir chave Google Maps | Google Cloud |
| 🟠 Em seguida | Sentry + encaminhar logs + alertas de auditoria | Sentry/Logtail |
| 🟡 Depois | Backup testado + billing cap + plano de incidente | Railway |
