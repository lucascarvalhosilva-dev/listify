# TikTok Shop

## Campos gerados pelo Guiamos

| Campo | Lógica | Observação crítica |
|---|---|---|
| **Marca** | Validada contra banco de marcas aceitas. Fallback: "Sem marca" | Marcas não cadastradas causam erro de importação |
| **Dimensões** | Inferidas. Comprimento >100cm → ajuste automático pra 99cm | Limite TikTok: 100cm por lado da embalagem |
| **Categoria** | Esportes ao ar livre → Acessórios esportivos | Verificar se categoria foi atualizada |
| **Preço promo** | `(Custo+R$4) / (1 - 0,04 - 0,0299)`. Comissão 0% nos primeiros 90 dias. | Promo válida só para novas lojas |
| **Preço normal** | `(Custo+R$4) / (1 - 0,06 - 0,04 - 0,0299)`. Comissão 6% após período promo. | — |
| **Fotos** | Adicionar pelo painel após upload do CSV | Drive não confiável pro TikTok |
| **Vídeo de produto** | Fortemente recomendado | Anúncios com vídeo recebem boost do algoritmo — diferencial significativo |

## Passo a passo de upload

| # | Ação |
|---|---|
| 1 | `seller.tiktok.com` → Produtos → Importar produtos em massa |
| 2 | Selecionar CSV gerado pelo Guiamos. Marca validada e dimensões ajustadas automaticamente. |
| 3 | Aguardar processamento (~10 min). TikTok notifica quando concluído. |
| 4 | Acessar cada produto → adicionar fotos e vídeo |
| 5 | Ativar produtos (Meus Produtos → Inativo → Ativar) |

## Erros conhecidos

| Erro | Causa | Correção do Guiamos |
|---|---|---|
| "Dimensões não cadastradas" | Dimensões zeradas no produto de origem | Sempre inferir dimensões antes de gerar |
| "Não foi possível criar a marca X" | Marca não cadastrada no banco TikTok | Substituir automaticamente por "Sem marca" |
| "Package length must be between 0-100cm" | Comprimento >100cm | Detectar e ajustar pra 99cm |

## Particularidades

- **Promo 90 dias** disponível só pra novas lojas
- **Mobile-first**: primeiros 30 chars do título são os mais vistos
- **Vídeo é diferencial significativo** — 15–30 segundos
- **Drive não confiável** — TikTok bloqueia redirects em muitos casos
