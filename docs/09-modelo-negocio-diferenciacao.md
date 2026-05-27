# 09 - Modelo de Negocio e Diferenciacao

Atualizado em: 2026-05-27

## Resumo executivo

O Guiamos faz sentido, mas precisa ser posicionado com precisao. O melhor lugar competitivo nao e "mais um ERP" nem "mais um hub de marketplace". O espaco mais promissor passa a ser:

> Copiloto de cadastro e publicacao multicanal para marketplaces brasileiros.

Em portugues claro: o Guiamos deve transformar informacao incompleta do vendedor em um cadastro publicavel, rentavel e adequado para cada canal e, quando a conta estiver conectada, publicar por API com revisao humana antes do envio. O produto entra antes ou ao lado de Bling, Tiny, UpSeller, Plugg.To, Ideris e ANYMARKET. Ele resolve uma dor anterior: criar o produto certo, com titulo, descricao, preco, fotos, categoria e atributos sem o usuario conhecer as regras de cada marketplace. Planilha deixa de ser promessa central e vira fallback/exportacao.

O modelo mensal faz sentido, mas nao sozinho. Cadastro de produto pode ser episodico: o cliente pode assinar, gerar um lote e cancelar. Para reduzir churn, o produto precisa gerar valor recorrente por meio de revisao de margem, atualizacao de regras dos canais, correcao de erros, publicacao em novos canais, melhoria de anuncios antigos e historico operacional. A recomendacao e usar modelo hibrido:

- assinatura mensal para acesso, historico, canais, suporte e automacoes;
- limite por produtos/creditos para controlar custo de IA;
- pacotes extras para picos;
- opcional de setup assistido para clientes que querem resultado rapido.

## Tese central

O mercado brasileiro tem ferramentas fortes para gestao operacional depois que a venda existe: ERP, hub, estoque, pedidos, notas, expedicao e sincronizacao. A lacuna esta no comeco do fluxo:

1. O vendedor nao sabe preencher direito o cadastro.
2. Cada canal exige atributos, titulos, fotos e campos diferentes.
3. O preco correto depende de comissao, frete, custo fixo, imposto, margem e estrategia por canal.
4. O erro aparece tarde, normalmente no upload.
5. O vendedor pequeno nao quer aprender Bling, Tiny, Plugg.To, Ideris e os paineis de cada marketplace antes de vender.

O Guiamos deve ser o produto que diz:

> "Me envie o produto, custo e fotos. Eu devolvo o cadastro pronto, revisado e lucrativo para cada marketplace."

## Pivot aprovado: API-first com planilha como fallback

Decisao aprovada em 2026-05-27: o Guiamos deve evoluir de "gerador de planilha pronta" para um copiloto que prepara, valida e publica produtos por API nos marketplaces conectados. A planilha continua existindo como fallback, exportacao e ponte para canais sem API liberada, mas nao deve ser o produto final de maior valor.

### Nova promessa do produto

> "Conecte seus marketplaces uma vez. Depois envie produtos e fotos para o Guiamos revisar, calcular margem e publicar nos canais certos."

Essa mudanca aumenta valor percebido porque remove etapas manuais, reduz erro de upload, encurta o caminho ate o anuncio publicado e cria recorrencia natural: o usuario volta para corrigir rejeicoes, atualizar preco, publicar em novo canal e acompanhar status.

### O que muda no fluxo

Fluxo atual:

1. usuario envia planilha base;
2. envia link do Drive;
3. escolhe canais;
4. Guiamos gera arquivos;
5. usuario baixa planilha;
6. usuario sobe manualmente no marketplace;
7. erro aparece fora do Guiamos.

Fluxo alvo:

1. usuario conecta a conta do marketplace;
2. envia produto, custo, estoque e fotos;
3. Guiamos prepara rascunho por canal;
4. usuario revisa Price Guard, atributos, fotos, restricoes e margem;
5. usuario aprova a publicacao;
6. Guiamos envia por API;
7. usuario acompanha status, erro, correcao e URL do anuncio.

### Regras do pivot

- Publicacao via API deve sempre ter revisao humana no inicio. Nada de publicar invisivelmente sem confirmacao do usuario.
- Planilha continua como fallback para canais sem API, contas sem permissao ou erro temporario.
- O Guiamos nao vira ERP: sem pedidos, nota fiscal, expedicao, atendimento ou conciliacao financeira.
- A primeira integracao deve provar publicacao real de ponta a ponta antes de abrir varios canais.
- Erros de API sao ativo estrategico: cada rejeicao deve virar regra, mensagem clara e aprendizado por marketplace/categoria.

### Ordem recomendada de canais API

1. **Mercado Livre**: melhor primeiro conector. API madura, documentacao publica, dor forte, alto valor para vendedor brasileiro e bom encaixe com categoria, atributos, fotos, preco e estoque.
2. **Bling**: nao e marketplace, mas entra na Fase 2 do roadmap como fonte de catalogo/estoque. Reduz atrito de onboarding para vendedores que ja tem produtos cadastrados em ERP. Tratar como integracao de catalogo, nao canal de venda.
3. **Shopee ou Magalu**: segundo marketplace deve ser escolhido por acesso real, permissao de API e menor atrito operacional, nao por desejo comercial.
4. **TikTok Shop**: importante para video curto e social commerce, mas depende de confirmacao de maturidade, acesso Brasil e escopo da API para sellers.
5. **Amazon**: deixar por ultimo entre os grandes, por causa de SP-API, Product Type Definitions, atributos obrigatorios por categoria, GTIN/marca e processo mais rigoroso.

### Analise por plataforma

#### Mercado Livre

Melhor candidato para MVP. A API permite trabalhar com categorias, atributos, imagens, criacao/edicao de itens, preco, estoque e status do anuncio. O desafio nao e apenas enviar JSON: e escolher categoria correta, preencher atributos obrigatorios, lidar com catalogo/GTIN, fotos, tipo de anuncio, frete, variacoes e moderacao.

Escopo MVP recomendado:

- OAuth da conta Mercado Livre;
- buscar dados do usuario/seller;
- predizer ou escolher categoria;
- buscar atributos obrigatorios da categoria;
- preparar rascunho com titulo, descricao, preco, estoque, fotos e dimensoes;
- publicar produto simples sem variacao;
- salvar id externo, URL e status;
- traduzir erros tecnicos em acoes simples.

Nao incluir no MVP: variacoes complexas, catalogo oficial obrigatorio, anuncios premium dinamicos, pedidos, mensagens, fiscal e ads.

#### Shopee

Tem encaixe de produto forte, mas a Open Platform costuma exigir autorizacao de app/loja, escopos corretos e regras por regiao. O fluxo esperado envolve autorizacao da loja, categorias/atributos, upload/uso de imagens, criacao de item, estoque/preco e logistica. Antes de codar, confirmar acesso real no portal e quais endpoints estao liberados para Brasil.

Escopo recomendado:

- usar Shopee como segundo canal somente depois de confirmar acesso API;
- comecar com produto simples, sem variacao;
- validar categoria e atributos antes de publicar;
- manter planilha fallback enquanto a API nao estiver estavel.

#### Magalu

Magalu Developers tem APIs de produtos/SKUs e estrutura de portfolio, mas o uso real depende de credenciais, conta seller/parceiro e regras de catalogo. Pode ser um bom segundo canal se o acesso for mais facil do que Shopee. A complexidade central esta em SKUs, portfolio, imagens, atributos, preco e estoque.

Escopo recomendado:

- confirmar processo de credencial e sandbox;
- mapear produto interno para SKU Magalu;
- publicar/atualizar SKU simples;
- salvar status e erro por SKU.

#### TikTok Shop

E estrategicamente importante por video curto e social commerce, mas nao deve ser primeiro conector. A Product API tende a exigir categoria, atributos, imagens, pacotes/dimensoes, preco, estoque e possivelmente regras de warehouse/logistica. O ponto critico e confirmar disponibilidade/escopo Brasil e maturidade para sellers locais.

Escopo recomendado:

- manter como Fase 3;
- antes, construir video curto e catalogo com fotos/atributos confiaveis;
- publicar apenas quando houver conta e API liberadas.

#### Amazon

Amazon SP-API e a mais poderosa e a mais pesada. Para listar produto, normalmente e preciso lidar com Listings Items API, Product Type Definitions, atributos obrigatorios por product type, marca, GTIN/isencao, compliance, variacoes e validacoes rigorosas. Pode virar vantagem competitiva, mas nao e bom primeiro canal.

Escopo recomendado:

- deixar para depois de ML + um segundo canal;
- usar Product Type Definitions como fonte de schema;
- comecar com categorias estreitas e produtos sem variacao;
- tratar Amazon como canal premium do plano Pro/Growth.

#### Bling

Bling deve ser tratado como integracao de catalogo/ERP, nao marketplace. O valor e importar produto, custo, estoque e talvez sincronizar preco/estoque, reduzindo preenchimento manual. Ele tambem pode ser caminho para usuarios que ja operam marketplace por ERP.

Escopo recomendado:

- importar catalogo/SKUs do Bling;
- usar Guiamos para enriquecer cadastro, margem e atributos;
- devolver preco/estoque ou publicar nos marketplaces diretamente;
- nao entrar em pedidos, nota fiscal ou financeiro.

### Impactos tecnicos obrigatorios

Publicar por API exige uma nova camada de produto:

- `marketplace_accounts`: contas conectadas, seller_id, scopes, token criptografado, refresh token, expiracao e status.
- `marketplace_listings`: produto, canal, id externo, URL, status, erro atual e ultima sincronizacao.
- `publication_jobs`: fila assicrona de publicacao, idempotencia, tentativas, payload enviado e resposta recebida.
- `publication_events`: timeline auditavel para mostrar ao usuario o que aconteceu.
- `media_assets`: fotos hospedadas em ambiente controlado, com URLs publicas estaveis. Google Drive pode continuar no MVP, mas API-first pede storage proprio.
- `category_mappings`: categoria interna do Guiamos para categoria externa por marketplace.
- `attribute_mappings`: atributos exigidos por categoria/canal, com confianca e origem.
- conectores por canal com interface comum: validar, publicar, atualizar preco, atualizar estoque, consultar status e traduzir erros.

### Funcionalidades que ganham prioridade com o pivot

- Tela de conexoes: conectar/desconectar Mercado Livre, Shopee, Magalu, Amazon, TikTok e Bling conforme ficarem disponiveis.
- Publicacao assistida no chat: card "Revisar e publicar" substitui "Baixar planilha" quando a conta estiver conectada.
- Central de status: rascunho, pronto para publicar, publicando, publicado, rejeitado, precisa revisar.
- Tradutor de erros: transformar retorno tecnico da API em acao simples.
- Atualizacao de preco e estoque por API: primeira fonte forte de recorrencia mensal.
- Catalogo vivo: cada produto guarda onde foi publicado e qual versao esta ativa em cada canal.

### Risco do pivot

O risco principal e elevar a complexidade antes de validar com usuarios reais. A mitigacao e construir Mercado Livre primeiro, com escopo estreito:

- publicar produto simples sem variacao;
- categoria inicial controlada;
- foto hospedada corretamente;
- preco e estoque enviados;
- erro traduzido em linguagem simples;
- planilha fallback disponivel se a API falhar.

## Estado atual do Guiamos

O produto atual ja tem uma base coerente:

- chat como experiencia principal;
- 5 inputs obrigatorios;
- geracao de planilha por canal;
- historico de catalogos;
- preparacao de fotos via Google Drive;
- calculo de preco por regime tributario;
- canais independentes;
- template interno por canal;
- inicio de memoria/conversas e catalogos.

Isso esta bem alinhado com uma proposta de "operador de cadastro". O ponto que ainda precisa amadurecer e o valor percebido recorrente: por que o usuario continuaria pagando todo mes depois de gerar os primeiros arquivos?

## Mapa competitivo

### 1. ERPs brasileiros

Exemplos: Bling e Olist Tiny.

Eles resolvem gestao da operacao: estoque, pedidos, nota fiscal, financeiro, usuarios, armazenamento, integracoes e expedicao. O Bling comunica planos por quantidade de pedidos marketplace/API e inclui gestao multicanal, estoque e notas fiscais. O Tiny/Olist comunica ERP, hub, pedidos, notas, usuarios, armazenamento e planos por faturamento/maturidade operacional.

Leitura estrategica:

- Sao produtos de "sistema operacional da empresa".
- Sao necessarios quando a loja cresce.
- Nao sao necessariamente simples para quem so quer preparar um catalogo bom.
- Podem ser parceiros/integracoes futuras, nao inimigos diretos.

### 2. Hubs de marketplace brasileiros

Exemplos: Plugg.To, Ideris e ANYMARKET.

Eles resolvem publicacao, sincronizacao, estoque, pedidos, anuncios e operacao multicanal. Plugg.To comunica acesso a dezenas de marketplaces, integracoes com ERPs, gestao centralizada, preco/estoque e suporte. Ideris cobra por faixas de pedidos e canais, com calculador de preco por marketplace, expedicao e recursos como copiar anuncio concorrente. ANYMARKET comunica automacao de criacao/publicacao, predicao de categoria, otimizacao com IA, tarefas em lote e gestao de preco.

Leitura estrategica:

- Sao fortes para operacoes mais maduras.
- Precos publicos partem de centenas de reais por mes em hubs especializados.
- A proposta deles e "conectar e operar varios canais".
- O Guiamos pode ser mais simples, mais barato e mais focado no momento anterior: gerar cadastro bom e publicar/exportar com seguranca.

### 3. Ferramentas brasileiras com IA para marketplace

Exemplo relevante: MeliUnlocker.

O MeliUnlocker ja comunica criacao de anuncios com IA, categoria automatica, ficha tecnica, precificacao, monitor de concorrentes, cadastro em massa via planilha/Tiny/Bling e foco forte em Mercado Livre.

Leitura estrategica:

- Confirma que existe demanda para IA aplicada a cadastro e precificacao.
- Tambem mostra um risco: a diferenciacao "tem IA" sozinha nao basta.
- O Guiamos precisa ser multicanal desde a narrativa, com foco em publicacao assistida, simplicidade, regras brasileiras por canal e planilha fallback.

### 4. Plataformas internacionais de multicanal

Exemplos: Sellbrite, Zentail e Linnworks.

Sellbrite cobra por volume de pedidos e oferece canais/SKUs/usuarios ilimitados, sincronizacao de inventario/preco, listing manager e templates. Zentail parte de planos mais altos e vende automacao de catalogo, listing, pedidos, inventario e crescimento em marketplaces. Linnworks enfatiza gestao de listings, bulk edit, precificacao por canal, sincronizacao e mais de 100 integracoes.

Leitura estrategica:

- Fora do Brasil, o mercado valoriza muito catalogo central, regras por canal e automacao de listing.
- Esses produtos geralmente ficam caros quando viram infraestrutura operacional.
- Existe espaco para uma versao brasileira menor, guiada por IA, sem exigir implantacao pesada.

### 5. IA nativa dos marketplaces e plataformas

Amazon, eBay e Shopify ja usam IA para gerar ou melhorar descricoes/listings. Amazon divulgou geracao por texto, imagem, URL e planilha, alem de melhoria de listings existentes. eBay divulgou ferramenta que usa titulo, categoria e foto para gerar descricao, dados, preco e envio. Shopify Magic gera descricoes a partir de titulo e palavras-chave.

Leitura estrategica:

- A direcao global e clara: cadastro de produto vai ficar cada vez mais assistido por IA.
- A IA nativa ajuda dentro de um canal, mas nao resolve bem a traducao entre varios marketplaces, imposto brasileiro, comissoes locais, planilhas, catalogos e reaproveitamento multicanal.
- O Guiamos deve ser a camada neutra entre canais, nao uma ferramenta presa a um marketplace.

### 6. Pesquisa aplicada e tendencia tecnica

Um estudo de produto listing multimodal mostrou uma ferramenta em producao que gera descricoes a partir de fotos e atributos. O paper reporta que 72% dos usuarios publicaram listings baseados no conteudo gerado e que esses listings tiveram qualidade 5,6% maior do que listings sem assistencia de IA.

Leitura estrategica:

- Foto como input e uma direcao forte.
- A qualidade melhora quando o modelo e ajustado ao dominio e combina RAG/regras especificas.
- Para o Guiamos, isso valida investir em fotos, atributos por categoria, regras por canal e memoria de erros.

## Lacuna no Brasil

O que parece menos explorado no Brasil, especialmente para pequenos vendedores:

1. Cadastro guiado por IA do zero ate publicacao assistida, com poucos inputs.
2. Validacao pre-upload por canal, antes do erro aparecer no marketplace.
3. Precificacao com margem protegida por canal, considerando MEI/SN, frete, comissao e custo fixo.
4. Reaproveitamento real do mesmo catalogo para varios marketplaces.
5. Correcao automatica a partir do arquivo/log de erro retornado pelo canal.
6. Explicacao simples do "por que esse campo foi preenchido assim".
7. Produto brasileiro, em portugues, com regras locais e marketplaces locais.

Essa lacuna e suficientemente boa para um MVP pago, desde que o produto entregue confianca operacional e nao pareca apenas "um ChatGPT com botoes".

## Posicionamento recomendado

### Frase curta

Guiamos transforma dados simples e fotos em anuncios prontos para publicar em marketplaces brasileiros.

### Frase comercial

Cadastre produtos em Mercado Livre, Shopee, Amazon, Magalu e TikTok Shop em minutos. O Guiamos gera titulo, descricao, preco, fotos organizadas, valida regras de cada canal e publica por API quando sua conta estiver conectada. Planilha pronta continua disponivel como fallback.

### Categoria

Copiloto de cadastro, precificacao e publicacao para marketplace.

Evitar, por enquanto:

- "ERP";
- "gestor completo de marketplace";
- "publicacao automatica sem revisao";
- "hub completo de integracao".

Essas promessas elevam suporte, complexidade tecnica e expectativa alem do escopo. A promessa correta e publicacao assistida, validada e rastreavel.

## Cliente ideal inicial

### ICP 1 - vendedor pequeno com catalogo em planilha

Perfil:

- MEI ou Simples Nacional;
- vende em Shopee e Mercado Livre;
- tem 10 a 500 produtos;
- usa planilha, Bling/Tiny basico ou painel manual;
- sofre com cadastro, foto, preco e erro de upload.

Mensagem:

> "Voce nao precisa aprender o template de cada marketplace. O Guiamos monta o arquivo certo para voce."

### ICP 2 - loja fisica querendo entrar em marketplace

Perfil:

- ja tem produto e estoque;
- nao domina ecommerce;
- quer testar ML/Shopee sem contratar consultoria;
- precisa transformar catalogo fisico em catalogo digital.

Mensagem:

> "Me mande os produtos e fotos. Saia com os cadastros prontos para vender online."

### ICP 3 - consultor/agencia de marketplace

Perfil:

- cria catalogos para clientes;
- faz implantacao de Bling/Tiny/hub;
- cobra setup ou mensalidade;
- quer acelerar a parte repetitiva.

Mensagem:

> "Gere arquivos padronizados para clientes em horas, nao dias."

## Modelo de cobranca

### Assinatura mensal faz sentido?

Sim, mas com cuidado. O valor recorrente precisa vir de manutencao, reuso e melhoria continua, nao apenas da primeira geracao.

O risco:

- usuario gera lote inicial;
- baixa planilhas;
- cancela;
- volta meses depois com outro lote.

Como reduzir:

- historico de catalogos salvo;
- "publicar em outro canal" a partir de catalogo existente;
- auditoria mensal de preco/margem;
- atualizacao de regras e templates;
- correcao de erros;
- monitor de qualidade de cadastro;
- packs de produtos para picos;
- plano anual com desconto;
- setup assistido para capturar valor no inicio.

### Recomendacao de planos

Os precos atuais documentados (Free, R$29, R$59, R$127) sao bons para beta, mas provavelmente baixos para produto lancado se o Guiamos entregar correcao, regra por canal, IA e suporte. Eles tambem podem ancorar o produto como "baratinho", enquanto a dor resolvida pode valer bem mais.

Sugestao para beta fechado:

| Plano | Preco | Limite | Canais | Objetivo |
|---|---:|---:|---|---|
| Free | R$0 | 5 produtos/mes | Shopee + ML | ativacao e prova |
| Starter | R$49/mes | 100 produtos/mes | Shopee + ML | pequeno vendedor |
| Pro | R$99 ou R$119/mes | 500 produtos/mes | 4 canais | loja em crescimento |
| Growth | R$249/mes | 2.000 produtos/mes | 6 canais | consultor/loja maior |

Sugestao para lancamento apos prova:

| Plano | Preco | Limite | Canais | Recursos chave |
|---|---:|---:|---|---|
| Free | R$0 | 5 produtos | 2 canais | teste real com marca Guiamos discreta |
| Starter | R$59/mes | 100 produtos | 2 canais | geracao + catalogos + suporte base |
| Pro | R$149/mes | 500 produtos | 4 canais | correcao de erros + price guard + historico |
| Growth | R$299/mes | 2.000 produtos | 6 canais | multiusuario leve + prioridade + packs melhores |
| Agencia | R$499+/mes | sob consulta | 6 canais | clientes, white-label leve, volume e SLA |

### Add-ons recomendados

- Pack 100 produtos: R$39.
- Pack 500 produtos: R$129.
- Setup assistido: R$297 a R$697, dependendo do volume.
- Revisao de catalogo antigo: preco por lote.
- Consultoria de precificacao/canal: opcional, nao produto principal.

### O que cobrar como valor, nao como custo

Nao vender "tokens de IA". Vender:

- produtos prontos;
- canais liberados;
- margem protegida;
- correcao de erro;
- tempo economizado;
- seguranca no upload.

## Diferenciais que devem entrar no produto

### 1. Validador antes do upload

Antes de entregar o arquivo, o Guiamos deve mostrar:

- campos obrigatorios preenchidos;
- fotos encontradas;
- nomes de fotos batendo com SKU;
- preco com margem positiva;
- campos suspeitos;
- atributos inferidos com baixa confianca;
- alertas por canal.

Esse recurso aumenta confianca e diferencia de "gerador de texto".

### 2. Price Guard

Um bloco claro no catalogo:

- custo;
- preco sugerido;
- margem esperada;
- comissao estimada;
- imposto;
- custo fixo;
- canal;
- alerta se margem ficar negativa.

O vendedor brasileiro sente dor real com taxa, frete gratis e comissao. Esse diferencial pode vender assinatura.

### 3. Correcao de erros por upload

Prioridade alta.

Fluxo alvo:

1. usuario sobe arquivo/log de erro do marketplace;
2. Guiamos identifica linha, SKU, campo e causa provavel;
3. corrige o catalogo;
4. gera novo arquivo;
5. salva aprendizado.

Isso cria recorrencia e moat, porque cada erro real vira regra do produto.

### 4. Catalog Quality Score

Cada catalogo deveria ter score simples:

- "Pronto para upload";
- "Precisa revisar fotos";
- "Preco com risco";
- "Atributos incompletos";
- "Erro corrigivel".

Nao precisa parecer sofisticado. Precisa ajudar o usuario a decidir o proximo passo.

### 5. Publicar em outro canal

O botao atual tem muito potencial. A promessa deve ser:

> "Use este catalogo para publicar em Mercado Livre, Shopee, Amazon, Magalu ou TikTok com as regras de cada canal."

Esse e o argumento de recorrencia mais forte. No MVP, pode gerar arquivo quando a API nao estiver disponivel. No produto alvo, deve publicar ou atualizar o anuncio por API, com status e erro visiveis.

### 6. Biblioteca de regras por categoria

Comecar estreito e profundo pode ser melhor do que amplo e raso.

Exemplo: se pesca e uma categoria inicial forte, criar regras de:

- varas;
- molinetes;
- carretilhas;
- linhas;
- anzol;
- iscas;
- caixas;
- roupas/acessorios.

Isso melhora NCM, dimensoes, titulos, atributos e precificacao.

### 7. Explicacao com confianca

Para campos inferidos, mostrar quando necessario:

- "Inferido pelo tipo de produto";
- "Baseado na regra da categoria";
- "Baixa confianca: revise antes do upload".

Isso reduz risco de alucinacao e aumenta confianca.

### 8. Integracoes API sem virar ERP

Ordem recomendada apos o pivot:

1. publicar no Mercado Livre por API;
2. manter planilha como fallback e exportacao;
3. importar catalogo do Bling/Tiny quando houver demanda real;
4. atualizar preco e estoque por API nos canais conectados;
5. expandir para Shopee/Magalu/TikTok/Amazon conforme acesso e maturidade.

O produto deve preservar simplicidade: publicar e manter anuncio, nao operar pedido, fiscal, expedicao ou financeiro.

## Funcionalidades a evitar no lancamento

Nao tentar fazer tudo agora:

- controle completo de estoque;
- emissao fiscal;
- gestao de pedidos;
- expedicao;
- atendimento pos-venda;
- conciliacao financeira;
- publicacao direta em todos os canais ao mesmo tempo;
- publicacao sem revisao humana;
- dashboard executivo complexo.

Essas areas ja tem concorrentes fortes e aumentam muito suporte.

## Roadmap recomendado antes do lancamento

### Fase 1 — Beta vendável (4-6 semanas)

Objetivo: vendedor sai de "tenho produto e fotos" para "tenho cadastro pronto, validado e com caminho claro de publicacao".

- Fluxo de cadastro funcionando (ja existe)
- Catalogo salvo, historico, download (ja existe)
- Validador antes do upload (campos, fotos, atributos, alertas por canal)
- Price Guard simples (custo, preco, margem, comissao, alerta de margem negativa)
- Detector de produto restrito/proibido por canal
- Comparador antes/depois do listing
- Arquitetura base de conectores: contas conectadas, jobs de publicacao, listings externos e eventos
- POC Mercado Livre API: publicar 1 produto simples com aprovacao humana e registrar status
- Guia de fotos claro (ja existe, ajustes pontuais)
- Cobranca configurada (Stripe ou Mercado Pago — decisao pendente)

### Fase 2 — Recorrência (6-8 semanas)

Objetivo: vendedor volta toda semana e justifica assinatura recorrente.

- Publicar em outro canal a partir de catalogo existente
- Correcao de erros por API ou upload (retorno do marketplace → Guiamos corrige)
- Catalog Quality Score
- Atualizacao de preco e estoque por API nos canais conectados
- Geracao de video curto do produto (Remotion + Cloud Run) — diferencial prioritario para canais que valorizam/exigem video
- Alertas de qualidade (integrados ao Quality Score)
- Revisao de preco/margem em catalogos ja gerados
- Melhorias de titulo/SEO a partir do historico do catalogo

### Fase 3 — Expansão (pós-lançamento, 3+ meses)

Objetivo: aprofundar diferenciais e expandir nichos.

- Remocao de fundo automatica nas fotos
- Otimizacao de palavras-chave SEO por marketplace
- Analise de viabilidade de produto
- Biblioteca profunda do nicho pesca → expansao pra outros nichos verticais
- Suporte multi-variacao (cor, tamanho, modelo)
- Reprecificacao automatica
- Monitor de concorrencia
- Integracoes com ERP (Bling/Tiny) — importar/exportar catalogo sem virar ERP
- Expansao de publicacao API para Shopee, Magalu, TikTok Shop e Amazon conforme acesso aprovado

## Hipoteses a validar com usuarios

Antes de investir pesado, validar:

1. Quanto tempo o usuario leva hoje para cadastrar 20 produtos?
2. Ele sofre mais com texto, preco, foto, categoria ou erro no upload?
3. Ele pagaria por produto, por mes ou por lote?
4. Ele quer planilha pronta, publicacao direta ou os dois dependendo do canal?
5. Ele confia em NCM/EAN inferidos por IA?
6. Ele ja usa Bling/Tiny? O Guiamos entra antes ou depois?
7. O principal canal inicial e Shopee, Mercado Livre ou Amazon?
8. Qual seria o "momento uau": baixar planilha, corrigir erro ou publicar outro canal?

## Metricas de produto

Medir desde o beta:

- tempo ate primeiro rascunho gerado;
- percentual de usuarios que conectam marketplace;
- percentual de rascunhos aprovados para publicacao;
- percentual de publicacoes por API com sucesso;
- percentual de publicacoes rejeitadas por canal e motivo;
- tempo ate anuncio publicado;
- percentual de usuarios que baixam arquivo fallback;
- percentual que faz upload com sucesso;
- numero de erros por canal;
- tempo ate correcao;
- produtos gerados por usuario;
- catalogos reutilizados em outro canal;
- conversao Free -> pago;
- uso recorrente em 30 dias;
- churn apos primeiro lote.

## Mensagens de venda para testar

### Variante A - tempo

Cadastre produtos em marketplaces em minutos, nao em horas.

### Variante B - simplicidade

Envie nome, custo e fotos. Receba a planilha pronta para upload.

### Variante B2 - API-first

Conecte seu marketplace uma vez. Depois aprove e publique produtos com poucos cliques.

### Variante C - margem

Gere cadastros com preco calculado para nao vender no prejuizo.

### Variante D - multicanal

Crie um catalogo uma vez e adapte para Shopee, Mercado Livre, Amazon, Magalu e TikTok Shop.

### Variante E - erro

Errou no upload? Envie o retorno do marketplace e o Guiamos corrige o arquivo.

## Decisao recomendada

Continuar o projeto faz sentido. O produto tem uma tese boa e um espaco claro, mas a estrategia deve ser ajustada:

1. Posicionar como copiloto de cadastro, precificacao e publicacao assistida, nao ERP/hub completo.
2. Manter o chat como interface central, mas com cards operacionais fortes.
3. Priorizar confianca: validador, price guard, score e correcao de erros.
4. Precificar acima do beta atual quando houver correcao e validacao.
5. Criar recorrencia com catalogo vivo, publicacao em novo canal, revisao de margem, atualizacao de preco/estoque e erros.
6. Construir moat com regras brasileiras, templates, erros aprendidos e categorias verticais.

O Guiamos nao precisa ser maior que Bling, Tiny ou Plugg.To. Precisa ser a melhor ponte entre o vendedor comum e o primeiro cadastro publicavel em marketplace.

## Decisões consolidadas com o usuário (2026-05-26)

Após análise de mercado e discussão de produto, o Lucas confirmou:

**Posicionamento adotado:** "Camada inteligente de preparação de cadastro para marketplaces brasileiros".

**Modelo de cobrança:** Assinatura mensal (mantida). Estrutura híbrida com add-ons opcionais (packs de produtos, setup assistido). Pricing migra de beta (R$29/59/127) para produto lançado (R$59/149/299/499+) quando funcionalidades de retenção estiverem entregues.

**Beta pré-lançamento:** 10-30 usuários grátis em troca de feedback. Validação prévia com 5-10 vendedores reais antes de codar features de retenção (Validador, Price Guard).

**Nicho inicial:** Pesca (vertical, profundo). Expansão para outras categorias pós-lançamento. Justificativa: criar biblioteca de regras profunda em 1-2 nichos cria moat competitivo real, conforme análise.

**Prazo de lançamento revisado:** 3-4 meses (vs. plano original de 4 semanas). Justificativa: features de retenção exigem trabalho real que não cabe em 1 mês.

**Funcionalidades removidas do escopo:**
- Geração de copies para anúncios Meta/Google Ads (fora do escopo "preparação de cadastro" — anúncio é venda, não cadastro)
- Tradução automática multi-país (PT→EN/ES) — não relevante pro nicho inicial brasileiro
- Dashboard executivo de vendas/performance (vira ERP, sai do posicionamento)

**Novos diferenciais incorporados (não estavam na análise original):**
1. **Geração de vídeo curto do produto** — Vídeo vertical 15-30s pra Shopee/ML/TikTok Shop/Amazon. Hoje todos os marketplaces top valorizam ou exigem vídeo. Implementação prevista via Remotion + Cloud Run.
2. **Detector de produto restrito/proibido por canal** — Salva vendedor de suspensão de conta. Lista de produtos restritos + classificação por canal.
3. **Comparador antes/depois do listing** — UX que mostra "o que você escreveria" vs "o que Guiamos sugere". Gera confiança no primeiro mês, reduz churn.
4. **Remoção de fundo automática nas fotos** — Marketplaces top exigem fundo branco. Hoje vendedor depende de apps tipo Remove.bg.
5. **Otimização de palavras-chave SEO por marketplace** — Cada marketplace tem algoritmo de busca diferente; vendedor pequeno não sabe.
6. **Análise de viabilidade de produto antes do cadastro** — "Esse produto tem 234 concorrentes no ML, sua margem ficaria 3%. Recomendamos não anunciar nesse canal." Pós-lançamento.

## Revisao critica Codex (2026-05-26)

A tese do Claude esta correta: preparar cadastro e nao virar ERP. O ponto critico e sequenciamento. O documento agora tem diferenciais suficientes para imaginar um produto grande, mas lancar bem exige resistir a tres tentacoes:

1. **Construir features visuais antes de provar upload.** Remocao de fundo pode ficar depois. Video curto sobe de prioridade por ser requisito/diferencial de marketplace, mas deve nascer como MVP simples depois do arquivo base estar confiavel.
2. **Virar consultoria disfarçada.** Setup assistido e beta concierge ajudam a aprender, mas o produto precisa transformar os aprendizados em regras, templates e validadores reutilizaveis.
3. **Prometer publicacao automatica em todos os canais cedo demais.** Publicacao via API aumenta complexidade, suporte e risco de conta. A promessa inicial deve ser publicacao assistida, com Mercado Livre primeiro, revisao humana e planilha fallback.

Decisao critica: o "momento uau" da V1 nao deve ser dashboard ou monitor de concorrente. Deve ser:

> O usuario enviar poucos dados, aprovar um cadastro confiavel e publicar ou exportar sem entender regras tecnicas do marketplace.

Video curto entra como acelerador desse momento quando o canal exigir ou favorecer video, desde que nao bloqueie a entrega da planilha base.

## Decisoes estrategicas adicionais

### 1. North Star da V1

A metrica principal nao deve ser "produtos gerados". Produto gerado pode estar errado. A metrica principal deve ser:

> Percentual de catalogos gerados que viram publicacao aceita pelo marketplace sem retrabalho manual relevante.

Metricas de suporte:

- tempo ate primeiro arquivo;
- percentual de arquivos baixados;
- percentual de publicacao/upload aceito;
- quantidade de erros por 100 produtos;
- percentual de erros corrigidos pelo Guiamos;
- percentual de catalogos reutilizados em outro canal.

### 2. Beta deve ser concierge, mas medido

Fazer beta gratis com 10-30 usuarios e bom, mas precisa ser tratado como experimento pago em aprendizado. Para cada usuario beta, registrar:

- nicho;
- canal alvo;
- produtos enviados;
- tempo manual estimado antes do Guiamos;
- problemas encontrados no upload;
- quanto pagaria se funcionasse;
- se recomendaria para outro vendedor.

Regra: qualquer intervencao manual feita pelo Lucas durante o beta deve virar uma regra documentada ou uma tarefa de produto. Se nao virar regra, vira custo operacional invisivel.

### 3. Vertical inicial precisa ter vantagem real

Pesca e um bom nicho se o Lucas tiver acesso a produtos, usuarios e conhecimento real. Nao escolher pesca apenas porque parece facil. O nicho inicial deve cumprir pelo menos 4 dos 5 criterios:

- acesso a vendedores reais para entrevistas;
- variedade de produtos suficiente para testar atributos;
- dor real de cadastro/foto/preco;
- margem que justifique pagar ferramenta;
- baixa complexidade regulatoria comparada a produtos restritos.

Se pesca nao cumprir isso, escolher outro nicho com acesso mais facil vale mais do que insistir em uma tese bonita.

### 4. Plano Free nao pode treinar usuario a nao pagar

O Free deve provar valor, nao substituir o produto. Decisao recomendada:

- Free com 5 produtos totais ou mensais muito limitados;
- sem correcao automatica de erros;
- sem publicar em outro canal em massa;
- com marca/limite operacional discreto;
- upgrade disparado por "quero gerar mais produtos" ou "quero corrigir erro".

O paywall deve aparecer no momento em que o usuario ja viu valor, nao antes do primeiro arquivo.

### 5. Cobranca deve vender resultado, nao acesso

O plano mensal deve ser explicado como "capacidade operacional", nao como "acesso ao chat". Exemplo:

- Starter: ate 100 produtos prontos por mes.
- Pro: ate 500 produtos, mais correcao de erro e Price Guard.
- Growth: volume, multiplos canais e prioridade.

Add-ons entram quando o cliente tem pico de catalogo, nao quando falta uma feature essencial.

### 6. Definir o que e proibido para V1

Para proteger o produto, V1 nao deve incluir:

- publicacao direta via API em todos os canais;
- publicacao sem aprovacao humana;
- gestao profunda de variacoes complexas;
- gestao de pedidos;
- emissao fiscal;
- reprecificacao automatica;
- monitoramento continuo de concorrentes;
- dashboard de performance de vendas;
- geracao de video bloqueando a entrega da planilha base;
- remocao de fundo obrigatoria para concluir fluxo.

Esses itens podem entrar depois, mas nao devem bloquear o lancamento.

### 7. Erros reais sao o moat

O diferencial mais defensavel nao e "usar IA", porque concorrentes podem copiar. O moat e acumular:

- erros reais por marketplace;
- regras por categoria;
- templates versionados;
- traducoes de campos de cada canal;
- heuristicas de preco/margem;
- exemplos de publicacao/upload aceito.

Cada erro corrigido deve alimentar uma biblioteca. Esse banco vira ativo estrategico e argumento de venda.

### 8. Confiança precisa ser visivel na interface

O usuario nao deve apenas receber uma planilha. Ele precisa ver por que pode confiar nela:

- "Fotos encontradas: 3/3";
- "Campos obrigatorios: 100%";
- "Margem estimada: 22%";
- "Risco: revisar NCM";
- "Pronto para Shopee";
- "Mercado Livre exige atributo X".

Isso transforma IA em ferramenta operacional, nao caixa-preta.

### 9. Venda assistida pode ser o primeiro canal

Antes de depender de marketing pago, testar venda direta:

- abordar vendedores pequenos em nichos escolhidos;
- oferecer "primeiro catalogo pronto";
- cobrar setup baixo ou fazer beta controlado;
- medir objecoes reais;
- transformar objecoes em produto e copy.

Se o usuario nao aceita uma conversa manual de 15 minutos para resolver o problema, provavelmente a dor ainda nao esta clara.

## Gates de decisao antes de construir features grandes

| Decisao | Gate minimo antes de investir |
|---|---|
| Lançar planos pagos | 5 usuarios reais geraram arquivo e pelo menos 3 tentaram upload |
| Subir preco para R$149+ | Usuarios citam economia de tempo ou reducao de erro sem serem induzidos |
| Construir video curto | Arquivo base validado + 3 produtos reais com fotos aptas para gerar MVP simples de video |
| Construir remocao de fundo | Pelo menos 30% dos erros ou retrabalhos do beta envolvem foto/fundo |
| Construir integracao Bling/Tiny | Pelo menos 5 usuarios beta ja usam Bling/Tiny e pedem import/export |
| Construir Mercado Livre API MVP | Conta dev/app aprovado + 1 produto simples publicado com revisao humana e log salvo |
| Expandir publicacao API para outro canal | ML API MVP estavel + acesso real aprovado no segundo canal + erros traduzidos |
| Expandir alem de pesca | Pesca validou upload, preco e recorrencia; ou outro nicho prova acesso comercial melhor |

## Riscos estrategicos e mitigacoes

| Risco | Por que importa | Mitigacao |
|---|---|---|
| IA preencher campo errado | Pode gerar prejuizo, rejeicao ou perda de confianca | Validacao, score, campos com baixa confianca e revisao explicita |
| Regras dos marketplaces mudam | Templates e taxas ficam obsoletos | Templates versionados e rotina mensal de revisao |
| Cliente usar uma vez e cancelar | Cadastro inicial e episodico | Publicar em outro canal, correcao de erros, revisao de margem e catalogo vivo |
| Suporte virar manual demais | Margem do SaaS some | Registrar toda intervencao e converter em regra/produto |
| Concorrente copiar "IA para anuncios" | IA generica nao e defensavel | Focar em regras brasileiras, erros reais, publicacao aceita e preco por canal |
| Produto parecer complexo | Vendedor pequeno abandona | Chat central + cards operacionais simples + proximo passo claro |
| Promessa fiscal/tributaria perigosa | Preco e imposto podem ter implicacoes | Comunicar "estimativa operacional" e pedir revisao contábil quando necessario |

## Ordem de prioridade revisada

1. Arquitetura API-first segura: contas conectadas, tokens, jobs, listings e eventos.
2. Mercado Livre API MVP com publicacao assistida e planilha fallback.
3. Price Guard e margem visivel antes de publicar.
4. Validador pre-publicacao: campos, fotos, atributos, restricoes e arquivo fallback.
5. Detector de produto restrito/proibido por canal.
6. Comparador antes/depois (confianca visivel na V1).
7. Publicar em outro canal a partir do mesmo catalogo.
8. Correcao de erros por API/upload.
9. Atualizacao de preco e estoque por API.
10. Video curto do produto.
11. Quality Score.
12. Import/export com ERP.
13. Remocao de fundo.
14. Viabilidade, concorrencia e reprecificacao.

Essa ordem deve guiar produto, nao apenas roadmap. Se uma feature nova nao melhora upload, confianca, margem ou recorrencia, ela provavelmente fica para depois.

## Fontes pesquisadas

- Bling - Planos e precos: https://www.bling.com.br/planos-e-precos
- Olist Tiny - Planos: https://tiny.com.br/planos
- Ideris - Planos: https://www.ideris.com.br/planos/
- Plugg.To - Planos: https://plugg.to/planos/
- Plugg.To - Hub: https://plugg.to/
- ANYMARKET - Gestao de marketplaces: https://marketplace.anymarket.com.br/gestao-de-marketplaces/
- UpSeller - Precos: https://www.upseller.com/pt/pricing/
- MeliUnlocker: https://meliunlocker.com.br/
- Zentail - Pricing: https://www.zentail.com/pricing
- Sellbrite - Pricing: https://www.sellbrite.com/pricing-pro
- Linnworks - Multichannel Listing: https://www.linnworks.com/features/multichannel-listings/
- Amazon - Generative AI listing tools: https://www.aboutamazon.com/news/innovation-at-amazon/amazon-generative-ai-seller-growth-shopping-experience
- eBay - Magical listing tool: https://innovation.ebayinc.com/stories/magical-listing-tool-harnesses-the-power-of-ai-to-make-selling-on-ebay-faster-easier-and-more-accurate/
- Shopify Magic - Product descriptions: https://help.shopify.com/en/manual/products/details/product-descriptions/shopify-magic
- IPL paper - Multimodal intelligent product listing: https://arxiv.org/abs/2410.16977
- Mercado Livre Developers - APIs de itens, categorias e publicacao: https://developers.mercadolivre.com.br/
- Amazon Selling Partner API - Listings Items e Product Type Definitions: https://developer-docs.amazon.com/sp-api/
- Magalu Developers - APIs de produtos/SKUs: https://developers.magalu.com/docs/apis/products/overview
- TikTok Shop Open API - Product API: https://partner.tiktokshop.com/docv2/
- Bling API v3 - Produtos e OAuth: https://developer.bling.com.br/
- Shopee Open Platform - Product API: https://open.shopee.com/
