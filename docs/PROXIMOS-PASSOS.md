# Próximos Passos — Roadmap até Lançamento

> Lançamento revisado: 3-4 meses (set/out 2026). Plano vivo, atualizar conforme avança.
> Posicionamento: "Camada inteligente de preparação de cadastro para marketplaces brasileiros".
> Detalhes do modelo de negócio: docs/09-modelo-negocio-diferenciacao.md
> Regra de prioridade: nada deve passar na frente de upload aceito, preço seguro, validação visível e correção de erro.

## Fase 0 — Validação com usuários (próximas 2 semanas)

Antes de codar features novas, validar hipóteses com vendedores reais.

- Prospectar 5-10 vendedores reais de marketplace (grupos de Shopee/ML, WhatsApp, Facebook, LinkedIn, clientes/fornecedores próximos)
- Entrevistar cada um (30-45min) sobre: tempo gasto cadastrando, maior dor, modelo de pagamento preferido, percepção do "momento uau"
- Fazer pelo menos 3 testes guiados com produto/fotos reais do vendedor
- Documentar respostas em docs/VALIDACAO-USUARIOS.md (a criar)
- Decidir quais features da Fase 1 são confirmadas e quais precisam ajuste
- Registrar qualquer ajuda manual do Lucas como regra futura de produto, não como "caso isolado"

Output esperado: relatório curto com 8 hipóteses validadas/refutadas (lista em 09-modelo-negocio-diferenciacao.md, seção "Hipoteses a validar com usuarios") e pelo menos 3 tentativas reais de upload ou simulação de upload.

## Fase 1 — Beta vendável (4-6 semanas)

Foco: vendedor sai de "tenho produto e fotos" para "tenho cadastro pronto e validado".

Bloqueadores da V1:

- [x] Cadastro funcionando no chat
- [x] Histórico de catálogos e conversas
- [ ] Validador antes do upload
- [x] Price Guard simples
- [ ] Detector de produto restrito/proibido por canal
- [ ] Comparador antes/depois do listing
- [x] Status de confiança no resultado: conferência rápida com campos, produtos, preço, arquivos, fotos/Drive e alertas
- [ ] Instrumentar métricas da V1: arquivo gerado, arquivo baixado, upload aceito, erro reportado, erro corrigido
- [ ] Beta fechado: 10-30 usuários grátis em troca de feedback

Importante, mas não deve bloquear o beta:

- [ ] Polimento visual contínuo (seguir docs/08-design-ui.md, sem bugs visíveis)
- [ ] Streaming de progresso durante geração (pendente do bloco 3)
- [ ] Favicon Guiamos (SVG com letra G em fundo azul `#1a73e8`)

Output esperado: usuários do beta geram cadastros publicáveis com assistência mínima. Toda assistência manual deve virar regra, checklist ou tarefa.

## Fase 2 — Recorrência (6-8 semanas)

Foco: vendedor volta toda semana e justifica pagar mensalidade.

- [ ] Publicar em outro canal a partir de catálogo existente
- [ ] Correção de erros por upload (sobe log do marketplace → Guiamos corrige)
- [ ] Catalog Quality Score
- [ ] Geração de vídeo curto do produto (Remotion + Cloud Run) — diferencial prioritário para canais que valorizam/exigem vídeo
- [ ] Alertas de qualidade integrados ao Quality Score
- [ ] Melhorias de título/SEO a partir do histórico do catálogo
- [ ] Biblioteca de erros reais por marketplace e categoria
- [ ] Hosting próprio de fotos (Cloudflare R2) somente se Google Drive gerar atrito recorrente — ver docs/05-fotos.md

Output esperado: usuários do beta voltam ao produto pelo menos 1x/semana após cadastro inicial ou reutilizam um catálogo em outro canal.

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
| Abrir planos pagos | 5 usuários reais geraram arquivo e pelo menos 3 tentaram upload |
| Subir preço para Pro R$149+ | Usuários citam economia de tempo/redução de erro sem serem induzidos |
| Construir remoção de fundo | Pelo menos 30% dos erros/retrabalhos envolvem foto/fundo |
| Construir vídeo curto | Arquivo base validado + 3 produtos reais com fotos aptas para gerar MVP simples de vídeo |
| Construir integração Bling/Tiny | 5 usuários beta já usam Bling/Tiny e pedem import/export |
| Construir publicação direta via API | Upload por planilha tem alta taxa de sucesso e suporte está controlado |

---

## Backlog pós-lançamento (não bloqueia o lançamento)

- Remoção de fundo automática nas fotos
- Otimização de palavras-chave SEO por marketplace
- Análise de viabilidade de produto antes do cadastro
- Biblioteca profunda do nicho pesca → expansão pra outros nichos
- Suporte a variações de produto (cor, tamanho, modelo)
- Reprecificação automática
- Monitor de concorrência
- Otimização contínua de listagem baseada em performance
- Integração Bling API (importar catálogo sem CSV)
- Dashboard de performance (margem real por canal) — só se não virar ERP
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
- Publicação direta via API na V1
- Gestão de pedidos, emissão fiscal, expedição e conciliação financeira
- Reprecificação automática antes de validar Price Guard manual/assistido

---

## Ordem de prioridade operacional

1. Upload aceito e arquivo correto.
2. Price Guard e margem visível.
3. Validador pré-upload.
4. Detector de produto restrito/proibido por canal.
5. Comparador antes/depois (confiança visível na V1).
6. Publicar em outro canal a partir do mesmo catálogo.
7. Correção de erros por upload.
8. Vídeo curto do produto.
9. Quality Score.
10. Import/export com ERP.
11. Remoção de fundo.
12. Viabilidade, concorrência e reprecificação.

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
- Status de confiança pós-geração no chat (campos, produtos, preço, arquivos, Drive e alertas)
- Price Guard simples pós-geração no chat (margem estimada por canal e alertas de prejuízo)
- Ajuste assistido de preços no chat a partir do Price Guard, com regeração de planilhas e atualização dos catálogos
- Área `/precos` na navegação para ajustar preços de catálogos existentes sem cadastrar produtos novamente
- Migração de domínio para `guiamos-marketplace.com.br`: domínio canônico, redirect de `www`, Supabase Auth e Resend alinhados
- AGENTS.md com diretrizes de workflow
