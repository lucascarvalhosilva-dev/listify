# Magazine Luiza (Magalu)

## Pré-requisitos da conta

| Requisito | Observação |
|---|---|
| CNPJ ativo há mais de 3 meses | Magalu rejeita vendedores sem isso |
| Emissão de NF-e ativa | Sem isso, produto não aparece no site após aprovação |
| Painel IntegraCommerce | Integração obrigatória (antigo painel Magalu Marketplace) |

## Campos gerados pelo Guiamos

| Campo | Lógica | Observação crítica |
|---|---|---|
| **Título** | Máx. 100 chars. `Produto + Marca + Modelo + Característica` | Sem caixa alta (TUDO MAIÚSCULO = reprovado). Sem links. Sem contato. |
| **Descrição** | Máx. 4000 chars | Palavras como "raticida" e "praticidade" são bloqueadas (regex Magalu pega similares) |
| **SKU** | Obrigatório. Máx. 32 chars. Sem caracteres especiais. | Identificador do produto na integração |
| **Fotos** | Mín. 2 fotos. 900×900 a 1200×1200. Máx. 2MB/arquivo. | Fundo branco recomendado. JPG. |
| **Variações de cor** | Apenas cores simples: azul, verde, preto, branco, vermelho, amarelo | Não aceita "azul marinho", "verde-água" |
| **Preço** | Comissão Magalu por categoria (varia 12–16%) | Verificar tabela atual no painel |

## Passo a passo de upload

| # | Ação |
|---|---|
| Pré | Validar CNPJ 3+ meses + NF-e ativa |
| 1 | Acessar painel IntegraCommerce |
| 2 | Cadastrar produtos com CSV/planilha gerado pelo Guiamos. Usar apenas cores simples. |
| 3 | Aguardar análise do catálogo Magalu (~24–48h). Produtos reprovados recebem motivo. |
| 4 | Após aprovação, adicionar fotos (mín. 2, 900×900, máx. 2MB) |

## Erros conhecidos

| Erro | Causa | Correção do Guiamos |
|---|---|---|
| Produto reprovado por palavra bloqueada | Lista interna inclui "raticida", "praticidade" e falsos-positivos | Verificar descrição contra lista bloqueada antes de enviar |
| Variação de cor reprovada | Cor complexa ("azul marinho") | Forçar uso de cores básicas |
| Produto não aparece após aprovação | CNPJ sem NF-e ativa ou <3 meses | Verificar pré-requisitos antes de cadastrar |
| SKU com caracteres especiais rejeitado | SKU não pode ter `! @ # ` espaços | Validar SKU: apenas letras, números, hífens |

## Particularidades

- **Integração via IntegraCommerce** é mandatória (não há upload direto pelo painel da loja)
- **Cores simples apenas** — restrição rígida
- **Bloqueio de palavras** é por regex, pega variações similares
