# 01 — Visão Geral

## O que o Guiamos faz

Automatiza o cadastro de produtos em marketplaces brasileiros. O usuário fornece o **mínimo real** — nome do produto, fotos, estoque, custo e regime tributário — e a IA pesquisa, infere e gera tudo que cada canal exige: título otimizado, descrição SEO-ready, preço calculado e arquivo de upload no formato exato do canal.

## Os 3 princípios inegociáveis

### 1. Mínimo real
5 inputs do usuário. A IA infere o resto. Dimensões, NCM, EAN, categoria e descrições são inferidos ou pesquisados automaticamente.

### 2. Canais independentes
Cada marketplace é um módulo separado. Não existe ordem obrigatória. O catálogo é salvo e reaproveitado nos próximos canais.

### 3. Templates internos
Templates de upload de cada canal armazenados internamente. Usuário nunca precisa baixar template — recebe só o arquivo preenchido.

## Os 5 inputs obrigatórios

Critério: um campo só é obrigatório se sua ausência resulta em upload rejeitado, produto não publicável ou risco real de prejuízo financeiro.

| # | Input | Por que é obrigatório |
|---|---|---|
| 1 | Nome e modelo do produto | Base de toda inferência. Sem o nome, a IA não consegue inferir nada. |
| 2 | Fotos do produto (padrão `SKU_01.jpg`, `SKU_02.jpg`...) | Shopee/ML/TikTok: sem foto = upload rejeitado ou rascunho permanente. |
| 3 | Quantidade em estoque | Campo obrigatório em todos os canais. Estoque 0 = produto inativo ou rejeitado. |
| 4 | Custo unitário pago | Sem custo, a plataforma não calcula o preço de venda. Preço errado = prejuízo garantido por venda. |
| 5 | Regime tributário (MEI ou Simples Nacional) | MEI e SN têm cálculos completamente diferentes. Erro de até 4% no preço calculado. |

## O que NÃO é obrigatório (a IA resolve)

| Campo | Como a IA resolve |
|---|---|
| Dimensões físicas | Inferidas pelo nome/tipo/modelo via web search + fallback de tabela típica por tipo. |
| NCM | Banco de regras fixo por tipo de produto (varas→95071000, molinetes→95073000, linhas→95079000). |
| EAN/GTIN | Web search por nome+marca. Fallback: padrão da marca ou campo em branco (Amazon é exceção). |
| Categoria do canal | Banco de mapeamentos interno por canal. |
| Descrição técnica | Gerada pela IA com base em nome, specs inferidas e pesquisa de mercado. |
| Preço de venda | Calculado automaticamente. Usuário revisa antes do upload. |

> Detalhes do cálculo de preço: ver `04-precificacao.md`.
> Detalhes por canal: ver `canais/<nome>.md`.
