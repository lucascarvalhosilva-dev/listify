# Amazon Brasil

## Pré-requisitos da conta

| Requisito | Observação |
|---|---|
| Conta seller (individual ou profissional) | Profissional tem taxa mensal mas sem comissão por item |
| GTIN/EAN ou isenção formal | Amazon é o único canal que **rejeita** produtos sem EAN sem isenção formal |
| Aprovação de marca | Marcas conhecidas precisam aprovação prévia em Seller Central → Catálogo → Aprovar venda de marca |

## Campos gerados pelo Guiamos

| Campo | Lógica | Observação crítica |
|---|---|---|
| **Título** | Máx. 200 chars. `Marca + Nome + Característica + Material/Cor + Quantidade` | Sem termos subjetivos ("melhor", "top") |
| **GTIN/EAN** | Obrigatório. Pesquisado ou solicitar isenção. | Validar contra GS1 antes de usar (`gs1br.org`) |
| **Bullet points (5)** | 5 características em texto curto. Benefício + spec técnica por bullet. | Mais importantes que a descrição longa para indexação |
| **Descrição A+** | Texto longo com HTML estruturado (opcional, recomendado) | Disponível apenas para marcas no Brand Registry |
| **Palavras-chave backend** | Termos de busca não visíveis ao comprador, indexados pela Amazon | Campo "Palavras-chave" no Seller Central |
| **Preço** | Comissão Amazon (~15% pesca) + impostos + custo logístico FBM ou FBA | Comissão varia por categoria — verificar tabela atual |
| **Fotos** | Upload direto pela Seller Central | Mínimo 1, ideal 7+. Mínimo 1000×1000px. Drive URLs não aceitas. |

## Passo a passo de upload

| # | Ação |
|---|---|
| Pré-1 | Verificar se produto já existe no catálogo Amazon (busca por EAN). Se existe: vincular ao listing existente, **não criar novo**. |
| Pré-2 | Se não tem EAN: solicitar isenção em `sellercentral.amazon.com.br` (24–48h) |
| 1 | Seller Central → Catálogo → Adicionar Produtos (ou upload em massa via template Amazon) |
| 2 | Preencher Informações Vitais: EAN/GTIN, título, marca, categoria. EAN validado automaticamente contra GS1. |
| 3 | Completar abas: Variações, Oferta, Imagens, Descrição. Fotos upload direto (mín. 1000×1000, fundo branco). |
| 4 | Salvar e Finalizar. Aguardar aprovação (~15 min a 24h). |

## Erros conhecidos

| Erro | Causa | Correção do Guiamos |
|---|---|---|
| "GTIN inválido" / conflito | EAN não validado pela GS1 ou já associado | Validar EAN via GS1 antes de usar; se inválido, solicitar isenção |
| "Marca não autorizada" | Tentativa de listar marca conhecida sem aprovação | Solicitar aprovação em Seller Central |
| Listing duplicado | Produto existe no catálogo, criação de novo em vez de vincular | Buscar por EAN antes de criar; se existe, vincular |
| Produto suspenso por imagem | <1000px, fundo não-branco ou texto sobre imagem | Validar specs antes do upload |
| Descrição A+ não disponível | Marca não registrada no Brand Registry | Brand Registry requer marca registrada no INPI (6–18 meses) |

## Particularidades

- **GTIN obrigatório** (único canal que exige isso sem alternativa simples)
- **FBA vs FBM**: FBA (Amazon entrega) melhora Buy Box mas requer envio ao CD da Amazon
- **Drive URLs não aceitas** — sempre upload direto pela Seller Central
- **Comissão varia por subcategoria** — segmento de pesca fica ~15%
