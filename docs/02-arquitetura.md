# 02 — Arquitetura

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 + TypeScript + CSS inline (style={{}}) |
| UI components | shadcn/ui em `src/components/ui/` (button, input, label, card, badge, separator, sheet, tabs, avatar) |
| Banco de dados | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Deploy | Vercel (plano Pro) + GitHub (deploy automático no push pra `main`) |
| IA | Anthropic API — modelo `claude-sonnet-4-5` |
| Email transacional | Resend com domínio `guiamos-marketplace.com.br` (`noreply@guiamos-marketplace.com.br`) |
| DNS | Cloudflare (domínio `guiamos-marketplace.com.br`) |

## Identidade visual

- **Nome**: Guiamos (logo com "Gu" preto, "ia" azul `#1a73e8`, "mos" preto, font-weight 800)
- **Fonte**: Plus Jakarta Sans
- **Cores**:
  - bg: `#f8f9fa`
  - texto: `#202124`
  - primary: `#1a73e8`
  - borda: `#e8eaed`
  - muted: `#5f6368`

## Tabelas Supabase

| Tabela | Colunas principais |
|---|---|
| `profiles` | `id, regime_tributario, fotos_prontas, onboarding_completo, criado_em, plano, nome, margem_padrao, notif_email, notif_limite` |
| `catalogos` | `id, user_id, nome, produtos (jsonb), drive_url, regime_tributario, canal, arquivo_path, criado_em, atualizado_em` |
| `sessoes_geracao` | `id, user_id, etapa, canais_chat, criado_em` (verificar colunas exatas no código) |
| `produtos_cache` | cache de specs geradas pela IA (evita reprocessar produtos já conhecidos) |
| `erros_aprendidos` | `canal, tipo_erro, causa, solucao, ocorrencias, exemplo_original, exemplo_corrigido` |
| `chat_historico` | `id, user_id, papel, conteudo, acoes_rapidas (jsonb), criado_em` |

## Mapa de rotas (frontend)

| Rota | Arquivo | O que é |
|---|---|---|
| `/` | `src/app/page.tsx` | Interface principal — chat em tela cheia (ChatPrincipal) |
| `/login` | `src/app/login/page.tsx` | Login |
| `/cadastro` | `src/app/cadastro/page.tsx` | Cadastro (inclui regime tributário) |
| `/onboarding` | `src/app/onboarding/page.tsx` | 5 telas apresentando o chat como ferramenta principal |
| `/chat` | `src/app/chat/page.tsx` | **Interface principal** — chat em tela cheia, proativo, com histórico |
| `/painel` | `src/app/painel/page.tsx` | Painel antigo (oculto do menu, ainda funcional) com 4 abas |
| `/precos` | `src/app/precos/page.tsx` | Price Guard recorrente para ajustar preços de catálogos existentes |
| `/adicionar-produtos` | `src/app/adicionar-produtos/page.tsx` | Fluxo 3 steps para SKUs novos (acessível só via `?cat=id`) |
| `/upgrade` | `src/app/upgrade/page.tsx` | Página de planos pagos |
| `/configuracoes` | `src/app/configuracoes/page.tsx` | Perfil, senha, preferências, plano |
| `/guia-fotos` | `src/app/guia-fotos/page.tsx` | Guia de preparo de fotos |

## Mapa de APIs (backend)

| Endpoint | Função |
|---|---|
| `/api/chat-principal` | Conversa do chat principal (claude-sonnet-4) com detecção de intenção |
| `/api/process-catalog` | Processa planilha em batches de 5 produtos via Claude API |
| `/api/get-catalogs` | Lista catálogos do usuário (atenção: inclui coluna `canal` na SELECT) |
| `/api/delete-catalog/[id]` | Deleta catálogo |
| `/api/get-history` | Histórico de gerações |
| `/api/validar-drive` | Valida acesso a pasta do Google Drive |
| `/api/precos/catalogos` | Lista catálogos com diagnóstico Price Guard |
| `/api/precos/ajustar` | Ajusta preços de um catálogo existente e regenera a planilha |
| `/api/help-chat` | Chat de suporte (HelpChat) — painel lateral deslizante |

## Variáveis de ambiente (Vercel)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase — URL Configuration

- **Site URL**: `https://guiamos-marketplace.com.br`
- **Redirect URLs**: `/onboarding`, `/chat`, `/painel`, `/login`

## Domínio canônico

- Produção: `https://guiamos-marketplace.com.br`
- `www.guiamos-marketplace.com.br` deve redirecionar para `https://guiamos-marketplace.com.br`
- `guiamos.com.br` e `www.guiamos.com.br` pertencem a outro projeto e não devem ser configurados neste app
- DNS externo configurado:
  - `A guiamos-marketplace.com.br 76.76.21.21`
  - `A www.guiamos-marketplace.com.br 76.76.21.21`
- Configurações externas alinhadas:
  - Vercel: domínio principal e redirects 308
  - Supabase Auth: Site URL e Redirect URLs
  - Resend: domínio, DKIM e DMARC do remetente `noreply@guiamos-marketplace.com.br`

## Repositório

`github.com/lucascarvalhosilva-dev/listify` (mantém o nome antigo, mas o produto se chama Guiamos)
