# Próximos Passos — Roadmap até Lançamento

> Lançamento previsto: ~4 semanas. Plano vivo, atualizar conforme avança.

## Semana 1 — Modelo de negócio e diferenciação (em decisão)

Antes de codar mais coisa, decidir no chat (não no Claude Code):

* Modelo de cobrança: assinatura mensal? Crédito por geração? Freemium? Vitalício? Reavaliar a estrutura atual de Starter/Profissional/Agência.
* Posicionamento: o que faz Guiamos ser escolhido vs concorrente? Qual a entrega que ninguém mais faz?
* Persona ideal: vendedor pequeno (1-10 produtos)? Médio (50+)? Agência?
* Pricing: valor de cada plano, gatilhos de upgrade, política de gratuito.

Output esperado: documento curto em `docs/MODELO-NEGOCIO.md` com decisão tomada (criar arquivo novo, deixar a estrutura — uma seção por tópico acima).

---

## Semana 2 — Polimento de produto

Foco: produto sem bugs, fluxo testado ponta a ponta, visual coeso.

* Testar fluxo completo logado: cadastro → onboarding → chat → geração de cada canal (Shopee, ML, etc) → download → ciclo de correção de erros
* Identificar e corrigir todos os bugs encontrados durante o teste
* Garantir consistência visual (seguir `docs/08-design-ui.md`)
* Streaming de progresso durante geração (pendente)
* Hosting próprio de fotos (Cloudflare R2) — ver `05-fotos.md`, ainda não decidido se entra nesta semana ou backlog
* Favicon Guiamos (SVG com letra G em fundo azul `#1a73e8`)

Output esperado: checklist de bugs zerado, fluxo gravado em vídeo de demonstração interno.

---

## Semana 3 — Checkout e onboarding pago

Foco: usuário consegue assinar plano pago e o sistema reage corretamente.

* Decisão a tomar antes: Mercado Pago vs Stripe (Lucas mencionou interesse em Stripe; trade-offs precisam ser avaliados — MP tem Pix nativo e conversão melhor pro público BR; Stripe exige conta US ou empresa BR homologada).
* Implementar provider escolhido
* Webhook de confirmação → atualizar coluna `plano` em `profiles`
* Página `/upgrade` já tem UI, falta backend
* Fluxo de assinatura recorrente (renovação, cancelamento, downgrade)
* Email transacional de confirmação de pagamento (Resend já configurado)
* Página de gerenciamento de assinatura

Output esperado: usuário consegue pagar plano em produção e funcionalidades pagas são liberadas automaticamente.

---

## Semana 4 — Marketing e materiais de lançamento

Foco: material pronto pra anunciar e atrair primeiros clientes.

* Vídeos para anúncios (Lucas precisa de ferramenta — decisão a tomar: Remotion vs CapCut/Canva manual vs freela. Discutir no chat antes de implementar.)
* Landing `/sobre` revisada com copy de venda forte
* Material orgânico (posts pra Instagram do Guiamos, exemplos de geração reais)
* Configurar tracking de conversão (GA4 ou Plausible) — decidir no chat
* Onboarding email sequence (primeira semana do usuário) — decidir no chat

Output esperado: tudo pronto pra ligar tráfego pago e captar primeiros clientes.

---

## Backlog pós-lançamento (não bloqueia o lançamento)

* Integração Bling API (importar catálogo sem CSV)
* Dashboard de performance (margem real por canal)
* Geração de copies pra Meta Ads / Google Ads baseada nos produtos
* Pesquisa de concorrência (preço médio de mercado)
* Suporte a variações de produto (cor, tamanho, modelo)
* White-label completo (plano Agência)
* App mobile (foto com câmera → cadastro)
* API pública pra ERPs parceiros
* Suporte a Casas Bahia / Via Varejo
* Pricing dinâmico baseado em concorrência
* Chat absorvendo mais ações sem redirecionar (avaliar caso a caso)
* Refinamento de prompts do system message em `/api/chat-principal` (contínuo)

---

## ✅ Já concluído (referência rápida)

* Domínio guiamos.com.br ativo na Vercel
* Email transacional via Resend (`noreply@guiamos.com.br`) com DMARC
* Plano Free funcional (5 produtos, Shopee+ML, 1 catálogo)
* Travas de uso por plano
* Sistema de aprendizado de erros (3 camadas)
* Chat principal como interface principal substituindo painel
* Onboarding 5 telas
* Email de confirmação e reset em PT-BR
* Página `/configuracoes`
* Varredura completa: nome "Listify" substituído por "Guiamos" em todo o projeto
* Histórico de conversas (sidebar estilo Claude com busca, arquivar, restaurar, URL persistente)
* RLS policies corretas em `chat_historico` (correção crítica)
* Contexto de conversa preservado ao continuar (Etapa 4)
* Trigger automático de `atualizada_em` em conversas
* Polimento UX: `/guia-fotos`, `/sobre`, autocomplete de formulários, retomada de sessão
* AGENTS.md atualizado com 4 novas diretrizes de workflow
