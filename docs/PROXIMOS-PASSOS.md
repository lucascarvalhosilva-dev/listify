# Próximos Passos — Roadmap até Lançamento

> Lançamento revisado: após plataforma completa (ver princípio abaixo). Plano vivo, atualizar conforme avança.
> Posicionamento: "Copiloto de cadastro e publicacao multicanal para marketplaces brasileiros".
> Detalhes do modelo de negócio: docs/09-modelo-negocio-diferenciacao.md
> Regra de prioridade: nada deve passar na frente de publicacao segura, preco protegido, validacao visivel e erro traduzido.

---

> **PRINCÍPIO DE LANÇAMENTO:** nenhuma etapa de monetização, checkout ou lançamento pago começa antes da plataforma estar completa em todos os canais, com qualidade de anúncio, gerador de vídeo, tratamento de imagem e dashboard multicanal. Plataforma completa primeiro, venda depois.

---

## Decisao estrategica atual — pivot API-first

Decisao aprovada em 2026-05-27: o Guiamos deve evoluir de gerador de arquivo pronto para copiloto que prepara, valida e publica produtos por API nos marketplaces conectados. Exportacao tecnica continua como apoio temporario para canais sem conector, nao como promessa principal.

Ordem estrategica de canais:

1. Mercado Livre API como primeiro conector real.
2. Bling como integracao auxiliar de catalogo/estoque, nao canal de venda.
3. Shopee ou Magalu como segundo marketplace, dependendo de acesso real e API liberada.
4. TikTok Shop depois de confirmar escopo Brasil e Product API.
5. Amazon por ultimo entre os grandes, por causa da complexidade da SP-API e Product Type Definitions.

## Decisao estrategica adicional — plataforma completa antes de monetizacao (2026-05-29)

O lançamento pago e qualquer checkout (Mercado Pago/Stripe) só começam DEPOIS que a plataforma estiver completa: todos os canais com API completa (publicar + sincronizar + editar + status + qualidade), gerador de vídeo, tratamento de imagem, dashboard multicanal. Inverte a lógica anterior que colocava checkout na Fase 3. Nada de monetização antes da plataforma estar pronta e sólida.

---

## Fase 1 — Mercado Livre completo

Foco: ML não só publica, mas é controlado inteiramente pelo Guiamos.

- [x] Publicar produto com variações, fotos, atributos e grade de tamanhos (concluído 2026-05-29)
- [x] Persistir publicações (tabela ml_publicacoes) com vínculo catálogo/sku_base
- [x] UX pós-publicação: anti-duplicata, status de processamento, confirmação de prejuízo, hidratação no F5
- [ ] Sincronização de estoque por API (atualizar estoque do anúncio a partir do Guiamos)
- [ ] Sincronização de preço por API
- [ ] Pausar / ativar / encerrar anúncio pelo Guiamos
- [ ] Editar anúncio publicado (título, descrição, fotos, atributos) refletindo no ML
- [ ] Ler status real do anúncio (ativo/pausado/sob revisão) e refletir no Guiamos
- [ ] Tratamento de rejeição/moderação: anúncio reprovado → Guiamos avisa e ajuda a corrigir
- [ ] Sincronização reversa: quando vende no ML, baixar estoque no Guiamos [NOTA: expande o posicionamento em direção a controle de estoque — decisão consciente do Lucas em 2026-05-29; revisar se pesa demais para o escopo "não-ERP"]
- [ ] Qualidade máxima de anúncio ML: resolver warnings hoje ignorados (AGE_GROUP etc.), ficha técnica completa, todos os atributos recomendados
- [ ] Robustez: testar e adaptar publicação para categorias não-moda (sem grade de tamanho, com atributos próprios como voltagem/capacidade) — hoje só validado em moda
- [ ] Robustez do chat: testar caminhos alternativos (usuário clica "erro", pula etapas, sai da ordem) e garantir que o fluxo guia até gerar o cadastro

## Fase 2 — Gerador de vídeo

Foco: vídeo a partir das fotos do usuário, requisito de qualidade máxima em ML/Shopee.

- [ ] Gerar vídeo vertical 15-30s a partir das fotos enviadas (avaliar Remotion + Cloud Run vs alternativa)
- [ ] Anexar vídeo gerado ao anúncio nos canais que suportam
- [ ] Integrar vídeo ao fluxo de qualidade de anúncio

## Fase 3 — Tratamento de imagem em massa

Foco: imagens no padrão de qualidade dos marketplaces (dor real — vendedor hoje usa Photoroom manualmente).

- [ ] Remoção de fundo automática
- [ ] Fundo branco padronizado
- [ ] Adição de sombra
- [ ] Processamento em massa (lote inteiro de uma vez)

## Fase 4 — Shopee completa

Foco: Shopee no mesmo nível do ML (publicar + sincronizar + editar + status + qualidade + vídeo).

- [ ] OAuth e conexão de conta Shopee (confirmar acesso real à Open Platform Brasil antes)
- [ ] Publicar produto (categoria, atributos, fotos, preço, estoque, variações)
- [ ] Sincronização de estoque e preço
- [ ] Pausar/ativar/editar/encerrar anúncio
- [ ] Ler status e tratar rejeição/moderação
- [ ] Sincronização reversa de estoque
- [ ] Qualidade máxima de anúncio Shopee + vídeo
- [ ] Persistência e dashboard (reaproveitar padrão do ML)

## Fase 5 — Demais canais (Magalu, Amazon, TikTok Shop, Bling)

Foco: cada canal no mesmo padrão completo do ML/Shopee. Ordem: Magalu → Amazon → TikTok → Bling.

Para cada marketplace (Magalu, Amazon, TikTok Shop): OAuth, publicar, sincronizar estoque/preço, editar, status, rejeição, sincronização reversa, qualidade, vídeo, persistência.

- [ ] Magalu completo
- [ ] Amazon completo (SP-API, Product Type Definitions — mais complexo, deixar por último entre os grandes)
- [ ] TikTok Shop completo (confirmar escopo Brasil e Product API antes)
- [ ] Bling como integração de catálogo/estoque (importar produtos, custo, estoque, fotos; sincronizar estoque/preço) — NÃO é canal de venda

## Fase 6 — Dashboard multicanal

Foco: visão estratégica de tudo publicado, em todos os canais.

- [ ] Visão geral de todos os anúncios em todos os canais simultaneamente
- [ ] Comparação entre canais (preço, margem, estoque, status, performance) para decisão estratégica
- [ ] Status consolidado por produto: onde está publicado, qual versão ativa, estoque por canal
- [ ] Quality Score por anúncio e por canal
- [ ] Filtros e visões por canal, categoria, status

## Fase 7 — Qualidade e robustez final

Foco: produto sólido, sem bugs, fluxo testado ponta a ponta antes de pensar em venda.

- [ ] Teste ponta a ponta de todos os canais com produtos reais de várias categorias
- [ ] Polimento visual e consistência (docs/08-design-ui.md)
- [ ] Tratamento de erros e estados de borda em todos os fluxos
- [ ] Otimização de palavras-chave SEO por marketplace
- [ ] Análise de viabilidade de produto antes do cadastro
- [ ] Catalog Quality Score consolidado

## Fase 8 — Checkout, lançamento e marketing (SÓ APÓS FASES 1–7 COMPLETAS)

Foco: monetização. Nada aqui começa antes das fases 1–7 estarem prontas.

- [ ] Decisão: Stripe vs Mercado Pago (Stripe exige conta US ou empresa BR; MP tem Pix nativo, conversão BR melhor)
- [ ] Implementar provider escolhido
- [ ] Webhook de confirmação → atualizar coluna `plano` em `profiles`
- [ ] Página `/upgrade` já tem UI, falta backend
- [ ] Fluxo de assinatura recorrente (renovação, cancelamento, downgrade)
- [ ] Email transacional de confirmação de pagamento (Resend já configurado)
- [ ] Página de gerenciamento de assinatura
- [ ] Migrar usuários do beta para plano pago (com período promocional)
- [ ] Paywall depois do valor percebido: gerar primeiro arquivo antes de pressionar upgrade
- [ ] Landing `/sobre` com copy de venda forte (mensagens da seção "Mensagens de venda para testar" em 09-modelo-negocio-diferenciacao.md)
- [ ] Vídeos de demonstração do produto
- [ ] Material orgânico para Instagram/TikTok do Guiamos
- [ ] Tracking de conversão (decisão: GA4 ou Plausible)
- [ ] Email sequence de onboarding (primeira semana do usuário)
- [ ] Venda assistida: oferta "primeiro catálogo pronto" para nicho inicial antes de depender de tráfego pago

---

## Gates antes de avançar

| Avanço | Gate mínimo |
|---|---|
| Considerar planos pagos | Fases 1–7 completas: todos os canais com API, vídeo, imagem e dashboard funcionando |
| Abrir checkout de fato | 5+ usuários reais testaram a plataforma completa e pelo menos 3 publicaram com sucesso em 2+ canais |
| Subir preço para Pro R$149+ | Usuários citam economia de tempo/redução de erro sem serem induzidos |
| Construir gerador de vídeo (Fase 2) | Fase 1 ML completa e estável; pelo menos 1 categoria validada ponta a ponta |
| Construir tratamento de imagem (Fase 3) | Pelo menos 30% dos erros/retrabalhos do uso real envolvem foto/fundo |
| Entrar no Shopee (Fase 4) | Fase 1 ML completa + acesso real confirmado na Open Platform Brasil |
| Cada canal novo (Fase 5) | Canal anterior estável + acesso real aprovado no novo canal + erros traduzidos |
| Dashboard multicanal (Fase 6) | Pelo menos 2 canais com API completa funcionando |
| Construir integração Bling como catálogo | ML API MVP estável + pelo menos 3 usuários do beta já usam Bling |

---

## Backlog pós-lançamento (não bloqueia o lançamento)

- Reprecificação automática
- Monitor de concorrência (preço médio de mercado)
- Upgrade futuro da tela `/precos`: reprecificação automática, análise de concorrência, regras por categoria, agendamento de ajustes e histórico avançado de versões
- Otimização contínua de listagem baseada em performance
- Dashboard de performance (margem real por canal) — só se não virar ERP
- White-label completo (plano Agência)
- App mobile (foto com câmera → cadastro)
- API pública pra ERPs parceiros
- Suporte a Casas Bahia / Via Varejo
- Pricing dinâmico baseado em concorrência
- Chat absorvendo mais ações sem redirecionar (avaliar caso a caso)
- Refinamento contínuo de prompts do system message
- Biblioteca profunda do nicho pesca → expansão para outros nichos verticais
- Instrumentar métricas completas: rascunho gerado, conta conectada, publicação aprovada, publicação concluída, rejeição por canal, exportação técnica baixada, erro corrigido

---

## Removido do escopo (referência)

- Geração de copies para anúncios Meta/Google Ads (fora do escopo "preparação de cadastro")
- Tradução automática multi-país (PT→EN/ES) — não relevante pro nicho inicial brasileiro
- Dashboard executivo de vendas/performance (vira ERP, sai do posicionamento)
- Publicação sem revisão humana
- Gestão de pedidos, emissão fiscal, expedição e conciliação financeira
- Reprecificação automática antes de validar Price Guard manual/assistido

---

## Ordem de prioridade operacional

1. Mercado Livre completo: sincronização, edição, status, rejeição, qualidade máxima, robustez por categoria.
2. Gerador de vídeo: requisito de qualidade em ML/Shopee/TikTok.
3. Tratamento de imagem em massa: fundo branco, remoção, sombra.
4. Shopee completa: mesmo padrão do ML.
5. Demais canais (Magalu, Amazon, TikTok, Bling): cada um no padrão completo.
6. Dashboard multicanal: visão estratégica consolidada.
7. Qualidade e robustez final: testes ponta a ponta, SEO, viabilidade, Quality Score.
8. Checkout, lançamento e marketing: só após tudo acima.

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
- Publicação ML com variações, fotos, atributos, grade de tamanhos e SIZE_GRID_ROW_ID corretamente posicionado (2026-05-29)
- Persistência de publicações na tabela `ml_publicacoes` com vínculo a `catalogo_id` e `sku_base`; endpoint GET `/api/ml/publicacoes` para listar e hidratar o card no F5
- UX pós-publicação ML: anti-duplicata (botão "Publicado" desabilitado), status `paused` explicado, confirmação de prejuízo antes de publicar, hidratação do card ao recarregar a página
- Fotos por variação: cada variação carrega `picture_ids` próprios com fallback para fotos do produto pai
- Supressão de cards de exportação/ajuda/validação para canais com conector (`CANAIS_COM_CONECTOR`/`temConector` em `normalizar-canais.ts`)
- Colapso visual de `CardComparadorListing` (colapsado por padrão) e `CardPriceGuard` (expande automaticamente quando há risco)
- Sentinela de renderização de cards robusta: qualquer card complexo ativa o branch correto, independente da presença de download
- Fix de roteamento de conversa no F5: leitura síncrona via `window.location.search` dentro do `useEffect`, `history.replaceState` para atualizar URL sem re-render
