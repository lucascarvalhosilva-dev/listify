# 03 — Fluxos do Usuário

## Fluxo de cadastro

1. Usuário acessa `/cadastro`
2. Preenche nome, email, senha, regime tributário (MEI ou Simples Nacional)
3. Recebe email de confirmação (Resend, template em PT-BR via `noreply@guiamos.com.br`)
4. Clica no link → vai pra `/onboarding`

## Fluxo de onboarding (5 telas)

Apresenta o chat como ferramenta principal. Ao terminar, marca `onboarding_completo=true` na tabela `profiles` e redireciona pra `/chat`.

## Interface principal: o chat (`/chat`)

A interface principal do Guiamos é um **chat em tela cheia**. Substituiu a navegação por abas/painel como ponto de entrada.

Características:
- **Proativo**: sempre puxa a conversa (não fica esperando)
- **Botões rápidos clicáveis**: respostas frequentes viram botões pra acelerar o fluxo
- **Histórico persistente**: salvo na tabela `chat_historico`
- **Detecta intenção**: redireciona pra `/painel`, `/upgrade`, `/configuracoes`, etc. quando faz sentido
- **API**: `/api/chat-principal` (modelo `claude-sonnet-4-20250514`)

> O painel antigo em `/painel` continua acessível e funcional (4 abas: Nova Geração, Catálogos, Histórico, Plano), mas está oculto do menu principal.

## Fluxo de geração de catálogo (caminho feliz)

1. Usuário no chat pede pra gerar pra um canal (ex: "quero publicar na Shopee")
2. Chat redireciona pra fluxo de geração (no painel ou subindo planilha)
3. Upload de planilha `.xlsx` com produtos
4. Seleção de canal(is) — limitada pelo plano do usuário (ver `04-precificacao.md`)
5. **Processamento em batches de 5 produtos** via Claude API (`/api/process-catalog`)
   - Tela de loading com progresso real
6. **Revisão de preços** (Etapa 1) — usuário confirma ou edita valores calculados
7. **Revisão de dimensões** (Etapa 2) — campos inferidos exibidos para edição opcional
8. **Geração de arquivos** + download (`/api/generate-files`)
9. **Ciclo de correção automática**: se upload no canal der erro, usuário envia arquivo de retorno → `/api/fix-errors` diagnostica e gera versão corrigida

## Fluxo de adicionar produtos a catálogo existente

Rota `/adicionar-produtos?cat=<id>`. Fluxo de 3 steps para adicionar SKUs novos a um catálogo já criado. Acessível apenas via link com `?cat=id` (não há entrada direta no menu).

## Estados onboarding vs chat vs sessão

⚠️ **Bug conhecido tratado**: na sessão `aguardando_drive` (e outras intermediárias), o componente de chat precisa carregar o histórico de `chat_historico` ao montar a página, independente de ter sessão ativa. Sem isso, F5 em estado intermediário renderiza tela vazia.

## Travas por plano

- Usuário tenta cadastrar mais produtos que o limite do plano → redireciona pra `/upgrade`
- Usuário Free tenta selecionar canal pago (Amazon, Magalu, TikTok, Bling) → canal aparece bloqueado visualmente com convite pra upgrade

> Detalhes dos planos e limites: ver `04-precificacao.md`.
