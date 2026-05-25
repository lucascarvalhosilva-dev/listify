# 02 — Arquitetura

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| UI components | shadcn/ui em `src/components/ui/` (button, input, label, card, badge, separator, sheet, tabs, avatar) |
| Banco de dados | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Deploy | Vercel (plano Hobby) + GitHub (deploy automático no push pra `main`) |
| IA | Anthropic API — modelo `claude-sonnet-4-20250514` |
| Email transacional | Resend com domínio `guiamos.com.br` (`noreply@guiamos.com.br`) |
| DNS | Cloudflare (domínio `guiamos.com.br`) |

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
| `catalogos` | `id, user_id, nome, produtos (jsonb), drive_url, regime_tributario, canal, criado_em, atualizado_em` |
| `geracoes` | `id, user_id, canais (text[]), total_produtos, criado_em` |
| `produtos_cache` | cache de specs geradas pela IA (evita reprocessar produtos já conhecidos) |
| `erros_aprendidos` | `canal, tipo_erro, causa, solucao, ocorrencias, exemplo_original, exemplo_corrigido` |
| `chat_historico` | `id, user_id, papel, conteudo, acoes_rapidas (jsonb), criado_em` |

## Mapa de rotas (frontend)

| Rota | Arquivo | O que é |
|---|---|---|
| `/` | `src/app/page.tsx` | Landing page (tema claro, marca Guiamos) |
| `/login` | `src/app/login/page.tsx` | Login |
| `/cadastro` | `src/app/cadastro/page.tsx` | Cadastro (inclui regime tributário) |
| `/onboarding` | `src/app/onboarding/page.tsx` | 5 telas apresentando o chat como ferramenta principal |
| `/chat` | `src/app/chat/page.tsx` | **Interface principal** — chat em tela cheia, proativo, com histórico |
| `/painel` | `src/app/painel/page.tsx` | Painel antigo (oculto do menu, ainda funcional) com 4 abas |
| `/adicionar-produtos` | `src/app/adicionar-produtos/page.tsx` | Fluxo 3 steps para SKUs novos (acessível só via `?cat=id`) |
| `/upgrade` | `src/app/upgrade/page.tsx` | Página de planos pagos |
| `/configuracoes` | `src/app/configuracoes/page.tsx` | Perfil, senha, preferências, plano |
| `/guia-fotos` | `src/app/guia-fotos/page.tsx` | Guia de preparo de fotos |

## Mapa de APIs (backend)

| Endpoint | Função |
|---|---|
| `/api/chat-principal` | Conversa do chat principal (claude-sonnet-4) com detecção de intenção |
| `/api/process-catalog` | Processa planilha em batches de 5 produtos via Claude API |
| `/api/generate-files` | Gera arquivos finais por canal (xlsx/csv) |
| `/api/save-catalog` | Salva catálogo no Supabase |
| `/api/get-catalogs` | Lista catálogos do usuário (atenção: inclui coluna `canal` na SELECT) |
| `/api/delete-catalog/[id]` | Deleta catálogo |
| `/api/get-history` | Histórico de gerações |
| `/api/fix-errors` | Ciclo de correção automática (recebe arquivo de erro do canal, gera versão corrigida) |
| `/api/check-drive` | Valida acesso a pasta do Google Drive |
| `/api/help-chat` | Chat de suporte (HelpChat) — painel lateral deslizante |

## Variáveis de ambiente (Vercel)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase — URL Configuration

- **Site URL**: `https://guiamos.com.br`
- **Redirect URLs**: `/onboarding`, `/chat`, `/painel`, `/login`

## Repositório

`github.com/lucascarvalhosilva-dev/listify` (mantém o nome antigo, mas o produto se chama Guiamos)
