# Próximos Passos — Roadmap até Lançamento

> Lançamento revisado: 3-4 meses (set/out 2026). Plano vivo, atualizar conforme avança.
> Posicionamento: "Camada inteligente de preparação de cadastro para marketplaces brasileiros".
> Detalhes do modelo de negócio: docs/09-modelo-negocio-diferenciacao.md

## Fase 0 — Validação com usuários (próximas 2 semanas)

Antes de codar features novas, validar hipóteses com vendedores reais.

- Prospectar 5-10 vendedores reais de marketplace (LinkedIn, grupos, Reddit)
- Entrevistar cada um (30-45min) sobre: tempo gasto cadastrando, maior dor, modelo de pagamento preferido, percepção do "momento uau"
- Documentar respostas em docs/VALIDACAO-USUARIOS.md (a criar)
- Decidir quais features da Fase 1 são confirmadas e quais precisam ajuste

Output esperado: relatório curto com 8 hipóteses validadas/refutadas (lista em 09-modelo-negocio-diferenciacao.md, seção "Hipoteses a validar com usuarios").

## Fase 1 — Beta vendável (4-6 semanas)

Foco: vendedor sai de "tenho produto e fotos" para "tenho cadastro pronto e validado".

- [x] Cadastro funcionando no chat
- [x] Histórico de catálogos e conversas
- [ ] Validador antes do upload
- [ ] Price Guard simples
- [ ] Detector de produto restrito/proibido por canal
- [ ] Comparador antes/depois do listing
- [ ] Polimento visual (seguir docs/08-design-ui.md, sem bugs visíveis)
- [ ] Streaming de progresso durante geração (pendente do bloco 3)
- [ ] Beta fechado: 10-30 usuários grátis em troca de feedback

Output esperado: usuários do beta usam o produto sem assistência e geram cadastros publicáveis.

## Fase 2 — Recorrência (6-8 semanas)

Foco: vendedor volta toda semana e justifica pagar mensalidade.

- [ ] Publicar em outro canal a partir de catálogo existente
- [ ] Correção de erros por upload (sobe log do marketplace → Guiamos corrige)
- [ ] Catalog Quality Score
- [ ] Geração de vídeo curto do produto (Remotion + Cloud Run) — 3-4 semanas só desta feature
- [ ] Remoção de fundo automática nas fotos
- [ ] Alertas de qualidade integrados ao Quality Score
- [ ] Hosting próprio de fotos (Cloudflare R2) — ver docs/05-fotos.md
- [ ] Favicon Guiamos (SVG com letra G em fundo azul `#1a73e8`)

Output esperado: usuários do beta voltam ao produto pelo menos 1x/semana após cadastro inicial.

## Fase 3 — Checkout e lançamento pago (2 semanas)

Foco: usuário consegue assinar plano pago e o sistema reage corretamente.

- [ ] Decisão: Stripe vs Mercado Pago (Lucas sinalizou Stripe; precisa avaliar trade-offs — Stripe exige conta US ou empresa BR; MP tem Pix nativo, conversão BR melhor)
- [ ] Implementar provider escolhido
- [ ] Webhook de confirmação → atualizar coluna `plano` em `profiles`
- [ ] Página `/upgrade` já tem UI, falta backend
- [ ] Fluxo de assinatura recorrente (renovação, cancelamento, downgrade)
- [ ] Email transacional de confirmação de pagamento (Resend já configurado)
- [ ] Página de gerenciamento de assinatura
- [ ] Migrar usuários do beta para plano pago (com período promocional)

## Fase 4 — Marketing e materiais de lançamento (paralelo às últimas semanas)

Foco: material pronto pra atrair primeiros clientes pagantes.

- [ ] Landing `/sobre` revisada com copy de venda forte (mensagens da seção "Mensagens de venda para testar" em 09-modelo-negocio-diferenciacao.md)
- [ ] Vídeos de demonstração do produto (decisão: Remotion próprio vs CapCut manual vs freela — discutir em chat)
- [ ] Material orgânico para Instagram/TikTok do Guiamos
- [ ] Tracking de conversão (decisão: GA4 ou Plausible — discutir em chat)
- [ ] Email sequence de onboarding (primeira semana do usuário)

---

## Backlog pós-lançamento (não bloqueia o lançamento)

- Otimização de palavras-chave SEO por marketplace
- Análise de viabilidade de produto antes do cadastro
- Biblioteca profunda do nicho pesca → expansão pra outros nichos
- Suporte a variações de produto (cor, tamanho, modelo)
- Reprecificação automática
- Monitor de concorrência
- Otimização contínua de listagem baseada em performance
- Integração Bling API (importar catálogo sem CSV)
- Dashboard de performance (margem real por canal) — avaliar se entra ou se fica fora do escopo
- Pesquisa de concorrência (preço médio de mercado)
- White-label completo (plano Agência)
- App mobile (foto com câmera → cadastro)
- API pública pra ERPs parceiros
- Suporte a Casas Bahia / Via Varejo
- Pricing dinâmico baseado em concorrência
- Chat absorvendo mais ações sem redirecionar (avaliar caso a caso)
- Refinamento contínuo de prompts do system message

---

## Removido do escopo (referência)

- Geração de copies para anúncios Meta/Google Ads (fora do escopo "preparação de cadastro")
- Tradução automática multi-país (PT→EN/ES) — não relevante pro nicho inicial brasileiro
- Dashboard executivo de vendas/performance (vira ERP, sai do posicionamento)

---

## ✅ Já concluído (referência rápida)

- Domínio guiamos.com.br ativo na Vercel
- Email transacional via Resend (`noreply@guiamos.com.br`) com DMARC
- Plano Free funcional (5 produtos, Shopee+ML, 1 catálogo)
- Travas de uso por plano
- Sistema de aprendizado de erros (3 camadas)
- Chat principal como interface principal
- Onboarding 5 telas
- Email de confirmação e reset em PT-BR
- Página `/configuracoes`
- Varredura completa: nome "Listify" substituído por "Guiamos"
- Histórico de conversas (sidebar estilo Claude com busca, arquivar, restaurar, URL persistente)
- RLS policies corretas em `chat_historico`
- Contexto de conversa preservado ao continuar (Etapa 4)
- Polimento UX: `/guia-fotos`, `/sobre`, autocomplete de formulários, retomada de sessão
- AGENTS.md com diretrizes de workflow
