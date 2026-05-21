export const SHOPEE_ERROR_GUIDE = `
# Guia de Erros de Importação — Shopee Brasil

## Erros de Nome do Produto
- "Nome do produto muito longo" / "Excede X caracteres": truncar para 120 chars, manter palavras-chave no início
- "Nome do produto obrigatório": preencher com nome descritivo do produto
- "Caracteres especiais não permitidos": remover <, >, &, ", '

## Erros de Preço
- "Preço inválido" / "Preço deve ser maior": ajustar para valor >= 1.00
- "Preço obrigatório": preencher com valor numérico positivo

## Erros de Peso e Dimensões
- "Peso inválido" / "Peso deve estar entre": campo "Peso (kg)" deve ser entre 0.001 e 100 (em kg, não gramas)
- "Dimensão inválida": Comprimento/Largura/Altura devem ser inteiros entre 1 e 300 (em cm)
- "Peso obrigatório" / "Dimensões obrigatórias": preencher com valores estimados realistas

## Erros de Estoque
- "Estoque inválido": deve ser inteiro >= 0
- "Estoque obrigatório": preencher com 1 como mínimo

## Erros de NCM
- "NCM inválido": deve ter exatamente 8 dígitos numéricos sem pontos/traços
- "NCM obrigatório": preencher com código NCM correto para a categoria

## Erros de CFOP/CSOSN
- "CFOP inválido": mesmo estado = 5102, outro estado = 6102
- "CSOSN inválido": usar 400

## Erros de Imagem
- "Imagem obrigatória": NÃO É POSSÍVEL CORRIGIR AUTOMATICAMENTE — informar no diagnóstico

## Campos Shopee (nomes exatos das colunas)
- Nome do Produto, Descrição do Produto, SKU principal, Preço, Estoque, Imagem de capa
- Peso (kg), Comprimento (cm), Largura (cm), Altura (cm)
- Correios, NCM, CFOP (Mesmo Estado), CFOP (Outro Estado), Origem, CSOSN, Unidade de Medida
`

export const ML_ERROR_GUIDE = `
# Guia de Erros de Importação — Mercado Livre Brasil

## Erros de Título
- "Título muito longo" / "Excede 60 caracteres": truncar para 60 chars, manter palavra-chave no início
- "Título obrigatório": preencher com nome descritivo
- "Caracteres inválidos": usar apenas alfanuméricos e pontuação básica, sem emojis

## Erros de Preço
- "Preço deve ser maior que" / "Preço mínimo": ajustar para >= R$5.00
- "Preço inválido": deve ser número positivo com até 2 casas decimais

## Erros de Descrição
- "Descrição muito longa": limitar a 50000 caracteres
- "HTML não permitido": remover todas as tags HTML da descrição
- "Descrição obrigatória": preencher com texto descritivo

## Erros de Dimensões e Envio
- "Peso inválido": deve ser entre 0.1 e 70 kg (campo em kg)
- "Dimensão máxima excedida": para Mercado Envios, máximo 105 cm — se exceder, mudar "Forma de envio" para "A combinar"
- "Forma de envio inválida": usar "Mercado Envios" (≤105cm) ou "A combinar" (>105cm)

## Erros de Estoque
- "Estoque mínimo": deve ter >= 1 unidade

## Erros de EAN/GTIN
- "GTIN inválido" / "Código de barras inválido": usar string vazia ou "0" se não houver EAN válido

## Erros de NCM
- "NCM inválido": deve ter exatamente 8 dígitos numéricos

## Erros de Condição / Tipo de Anúncio
- "Condição inválida": usar "Novo"
- "Tipo de anúncio inválido": usar "Clássico"

## Campos ML (nomes exatos das colunas)
- Código do catálogo ML, Título, Condição, Código universal de produto, Fotos
- SKU, Estoque, Preço [R$], Descrição, Tipo de anúncio
- Forma de envio, Custo de envio, Retirar pessoalmente
- Tipo de garantia, Tempo de garantia, Unidade de Tempo de garantia, Marca, Modelo
`
