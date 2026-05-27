# Próximos Passos — Roadmap até Lançamento

> Lançamento revisado: 3-4 meses (set/out 2026). Plano vivo, atualizar conforme avança.
> Posicionamento: "Copiloto de cadastro e publicacao multicanal para marketplaces brasileiros".
> Detalhes do modelo de negócio: docs/09-modelo-negocio-diferenciacao.md
> Regra de prioridade: nada deve passar na frente de publicacao segura, preco protegido, validacao visivel e erro traduzido.

## Decisao estrategica atual — pivot API-first

Decisao aprovada em 2026-05-27: o Guiamos deve evoluir de gerador de arquivo pronto para copiloto que prepara, valida e publica produtos por API nos marketplaces conectados. Exportacao tecnica continua como apoio temporario para canais sem conector, nao como promessa principal.

Ordem estrategica:

1. Mercado Livre API como primeiro conector real.
2. Bling como integracao auxiliar de catalogo/estoque, nao canal de venda.
3. Shopee ou Magalu como segundo marketplace, dependendo de acesso real e API liberada.
4. TikTok Shop depois de confirmar escopo Brasil e Product API.
5. Amazon por ultimo entre os grandes, por causa da complexidade da SP-API e Product Type Definitions.

## Fase 0 — Validação com usuários (próximas 2 semanas)

Antes de codar features novas, validar hipóteses com vendedores reais.

- Prospectar 5-10 vendedores reais de marketplace (grupos de Shopee/ML, WhatsApp, Facebook, LinkedIn, clientes/fornecedores próximos)
- Entrevistar cada um (30-45min) sobre: tempo gasto cadastrando, maior dor, modelo de pagamento preferido, percepção do "momento uau" e interesse em conectar conta do marketplace
- Fazer pelo menos 3 testes guiados com produto/fotos reais do vendedor
- Levantar pré-requisitos reais: conta Mercado Livre, CNPJ/MEI, Mercado Envios, GTIN/marca, fotos públicas e permissão para app externo
- Documentar respostas em docs/VALIDACAO-USUARIOS.md (a criar)
- Decidir quais features da Fase 1 são confirmadas e quais precisam ajuste
- Registrar qualquer ajuda manual do Lucas como regra futura de produto, não como "caso isolado"

Output esperado: relatório curto com hipóteses validadas/refutadas, pelo menos 3 testes reais de cadastro e decisão clara: seguir primeiro com Mercado Livre API, manter exportação técnica temporária, ou priorizar outro conector.

## Fase 1 — Beta vendável (4-6 semanas)

Foco: vendedor sai de "tenho produto e fotos" para "tenho cadastro pronto, validado e com publicação assistida em pelo menos um canal".

Bloqueadores da V1:

- [x] Cadastro funcionando no chat
- [x] Histórico de catálogos e conversas
- [x] Validador antes da publicação (V1 Shopee + Mercado Livre)
- [x] Price Guard simples
- [x] Detector de produto restrito/proibido por canal (V1 heurística no validador pré-publicação)
- [x] Comparador antes/depois do listing (V1 no chat pós-geração)
- [x] Status de confiança no resultado: conferência rápida com campos, produtos, preço, arquivos, fotos/Drive e alertas
- [ ] Arquitetura API-first: contas conectadas, tokens seguros, jobs de publicação, listings externos e eventos
- [ ] Decisão de fila/worker para jobs assíncronos (avaliar Supabase Edge Functions com cron, Upstash QStash ou trigger.dev — Vercel serverless não serve para jobs longos)
- [ ] Política de token expirado: comportamento quando refresh token falha no meio de publicação em lote (pausar job, notificar usuário, retomar após reconexão)
- [ ] Cláusula LGPD para armazenamento de token de terceiro (Mercado Livre, Shopee, etc) — atualizar política de privacidade
- [ ] Estratégia de rollback: se publicação em massa der erro parcial, como reverter ou marcar anúncios criados incorretamente
- [ ] POC Mercado Livre API: publicar 1 produto simples com aprovação humana, fotos, preço, estoque, categoria e status salvo
- [ ] Tela/fluxo "Conexões" para conectar Mercado Livre e ver status da conta
- [x] Card no chat "Revisar e publicar" para Mercado Livre, com detecção server-side de conexão e exportação técnica como apoio
- [ ] Instrumentar métricas da V1: rascunho gerado, conta conectada, publicação aprovada, publicação concluída, rejeição por canal, exportação técnica baixada, erro corrigido
- [ ] Beta fechado: 10-30 usuários grátis em troca de feedback

Importante, mas não deve bloquear o beta:

- [ ] Polimento visual contínuo (seguir docs/08-design-ui.md, sem bugs visíveis)
- [ ] Streaming de progresso durante geração (pendente do bloco 3)
- [ ] Favicon Guiamos (SVG com letra G em fundo azul `#1a73e8`)

Output esperado: usuários do beta geram cadastros publicáveis com assistência mínima. Toda assistência manual deve virar regra, checklist ou tarefa.

## Fase 2 — Recorrência (6-8 semanas)

Foco: vendedor volta toda semana e justifica pagar mensalidade.

- [ ] Publicar em outro canal a partir de catálogo existente
- [ ] Correção de erros por API/importação (retorno do marketplace → Guiamos corrige)
- [ ] Atualização de preço e estoque por API nos canais conectados
- [ ] Segundo conector marketplace: Shopee ou Magalu, escolhido por acesso real e maturidade da API
- [ ] Integração Bling como fonte de catálogo: importar produtos, custo, estoque e fotos para reduzir atrito de onboarding (não tratar como canal de venda)
- [ ] Catalog Quality Score
- [ ] Geração de vídeo curto do produto (Remotion + Cloud Run) — diferencial prioritário para canais que valorizam/exigem vídeo
- [ ] Alertas de qualidade integrados ao Quality Score
- [ ] Melhorias de título/SEO a partir do histórico do catálogo
- [ ] Biblioteca de erros reais por marketplace e categoria
- [ ] Hosting próprio de fotos (Cloudflare R2) somente se Google Drive gerar atrito recorrente — ver docs/05-fotos.md

Output esperado: usuários do beta voltam ao produto pelo menos 1x/semana após cadastro inicial, reutilizam um catálogo em outro canal ou atualizam preço/estoque em anúncio já publicado.

## Fase 3 — Checkout mínimo e lançamento pago (2 semanas)

Foco: usuário consegue assinar plano pago e o sistema reage corretamente.

Crítica estratégica: checkout não precisa esperar todas as features de recorrência ficarem prontas. A validação de preço deve começar assim que Fase 1 provar valor real. O ideal é configurar checkout mínimo em paralelo ao fim da Fase 1, mesmo que o lançamento público espere mais.

- [ ] Decisão: Stripe vs Mercado Pago (Lucas sinalizou Stripe; precisa avaliar trade-offs — Stripe exige conta US ou empresa BR; MP tem Pix nativo, conversão BR melhor)
- [ ] Implementar provider escolhido
- [ ] Webhook de confirmação → atualizar coluna `plano` em `profiles`
- [ ] Página `/upgrade` já tem UI, falta backend
- [ ] Fluxo de assinatura recorrente (renovação, cancelamento, downgrade)
- [ ] Email transacional de confirmação de pagamento (Resend já configurado)
- [ ] Página de gerenciamento de assinatura
- [ ] Migrar usuários do beta para plano pago (com período promocional)
- [ ] Paywall depois do valor percebido: gerar primeiro arquivo antes de pressionar upgrade

## Fase 4 — Marketing e materiais de lançamento (paralelo às últimas semanas)

Foco: material pronto pra atrair primeiros clientes pagantes.

- [ ] Landing `/sobre` revisada com copy de venda forte (mensagens da seção "Mensagens de venda para testar" em 09-modelo-negocio-diferenciacao.md)
- [ ] Vídeos de demonstração do produto (decisão: Remotion próprio vs CapCut manual vs freela — discutir em chat)
- [ ] Material orgânico para Instagram/TikTok do Guiamos
- [ ] Tracking de conversão (decisão: GA4 ou Plausible — discutir em chat)
- [ ] Email sequence de onboarding (primeira semana do usuário)
- [ ] Venda assistida: oferta "primeiro catálogo pronto" para nicho inicial antes de depender de tráfego pago

---

## Gates antes de avançar

| Avanço | Gate mínimo |
|---|---|
| Entrar no beta fechado | 3 testes guiados com produtos reais e problemas documentados |
| Abrir planos pagos | 5 usuários reais geraram cadastro e pelo menos 3 chegaram a publicação assistida ou importação aceita |
| Subir preço para Pro R$149+ | Usuários citam economia de tempo/redução de erro sem serem induzidos |
| Construir remoção de fundo | Pelo menos 30% dos erros/retrabalhos envolvem foto/fundo |
| Construir vídeo curto | Arquivo base validado + 3 produtos reais com fotos aptas para gerar MVP simples de vídeo |
| Construir integração Bling como fonte de catálogo | ML API MVP estável + pelo menos 3 usuários do beta já usam Bling |
| Construir Mercado Livre API MVP | App/conta dev aprovado + 1 produto simples publicado com revisão humana e log salvo |
| Expandir API para segundo marketplace | ML API MVP estável + acesso real aprovado no segundo canal + erros traduzidos |

---

## Backlog pós-lançamento (não bloqueia o lançamento)

- Remoção de fundo automática nas fotos
- Otimização de palavras-chave SEO por marketplace
- Análise de viabilidade de produto antes do cadastro
- Biblioteca profunda do nicho pesca → expansão pra outros nichos
- Suporte a variações de produto (cor, tamanho, modelo)
- Reprecificação automática
- Monitor de concorrência
- Upgrade futuro da tela `/precos`: reprecificação automática, análise de concorrência, regras por categoria, agendamento de ajustes e histórico avançado de versões
- Otimização contínua de listagem baseada em performance
- Dashboard de performance (margem real por canal) — só se não virar ERP
- Pesquisa de concorrência (preço médio de mercado)
- White-label completo (plano Agência)
- App mobile (foto com câmera → cadastro)
- API pública pra ERPs parceiros
- Publicação API em Amazon e TikTok Shop após validação de Mercado Livre + segundo canal
- Suporte a Casas Bahia / Via Varejo
- Pricing dinâmico baseado em concorrência
- Chat absorvendo mais ações sem redirecionar (avaliar caso a caso)
- Refinamento contínuo de prompts do system message

---

## Removido do escopo (referência)

- Geração de copies para anúncios Meta/Google Ads (fora do escopo "preparação de cadastro")
- Tradução automática multi-país (PT→EN/ES) — não relevante pro nicho inicial brasileiro
- Dashboard executivo de vendas/performance (vira ERP, sai do posicionamento)
- Publicação direta via API em todos os canais na V1
- Publicação sem revisão humana
- Gestão de pedidos, emissão fiscal, expedição e conciliação financeira
- Reprecificação automática antes de validar Price Guard manual/assistido

---

## Ordem de prioridade operacional

1. Arquitetura API-first segura: contas conectadas, tokens, jobs, listings e eventos.
2. Mercado Livre API MVP com publicação assistida e exportação técnica temporária.
3. Price Guard e margem visível antes de publicar.
4. Validador pré-publicação: campos, fotos, atributos, restrições e exportação técnica.
5. Detector de produto restrito/proibido por canal.
6. Comparador antes/depois (confiança visível na V1).
7. Publicar em outro canal a partir do mesmo catálogo.
8. Correção de erros por API/importação.
9. Atualização de preço e estoque por API.
10. Vídeo curto do produto.
11. Quality Score.
12. Import/export com ERP.
13. Remoção de fundo.
14. Viabilidade, concorrência e reprecificação.

---

## ✅ Já concluído (referência rápida)

- Domínio `guiamos.com.br` reservado para outro projeto; Guiamos Marketplace usa apenas `guiamos-marketplace.com.br`
- Email transacional via Resend/DMARC alinhado ao remetente novo `noreply@guiamos-marketplace.com.br`
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
- Status de confiança pós-geração substituído no chat pelo Validador pré-publicação, mantendo diagnóstico operacional sem cards duplicados
- Price Guard simples pós-geração no chat (margem estimada por canal e alertas de prejuízo)
- Validador pré-publicação V1 no chat e em `/precos` para Shopee e Mercado Livre, com status pronto/revisar/bloqueado por catálogo
- Detector V1 de produto restrito/proibido por canal integrado ao validador pré-publicação, com bloqueio para sinais fortes e avisos para categorias reguladas
- Card de publicação Mercado Livre no chat com detecção server-side de conta conectada, validação de dados exigidos pela API e exportação técnica como apoio
- Comparador antes/depois V1 no chat pós-geração, mostrando o que foi transformado dos dados básicos para o cadastro otimizado
- Ajuste assistido de preços no chat a partir do Price Guard, com atualização de cadastros e catálogos
- Área `/precos` na navegação para ajustar preços de catálogos existentes sem cadastrar produtos novamente, incluindo seleção manual de SKUs e filtros por status/margem
- Migração de domínio para `guiamos-marketplace.com.br`: domínio canônico, redirect de `www`, Supabase Auth e Resend alinhados
- AGENTS.md com diretrizes de workflow
