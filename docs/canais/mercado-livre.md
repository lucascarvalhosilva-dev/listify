# Mercado Livre

## Pré-requisitos da conta

| Requisito | Como verificar | Como resolver |
|---|---|---|
| Conta empresarial (CNPJ) | Perfil ML → tipo de conta | Conta pessoal não tem Mercado Envios. Criar conta empresarial. |
| Mercado Envios habilitado | Configurações → Envios → Mercado Envios | Solicitar habilitação (1–2 dias) |
| CNPJ ativo | — | Necessário para Mercado Envios Coleta |

⚠️ Conta recém-criada exibe prazo de entrega mais longo até reputação ser construída (~10 vendas).

## Campos gerados pelo Guiamos

| Campo | Lógica |
|---|---|
| **Título** | Máx. 60 chars. `Tipo + Marca + Modelo + Atributo`. Palavra-chave no início. Sem caracteres especiais. |
| **Condição** | Novo (padrão) |
| **EAN/GTIN** | Pesquisado + padrão da marca. Se não achar: "O produto não tem código cadastrado" |
| **SKU** | Input do usuário |
| **Tipo de anúncio** | Clássico (padrão). Premium disponível por escolha. |
| **Frete** | Mercado Envios se ≤105cm. "Por minha conta" se >105cm (detectado pelas dimensões inferidas) |
| **Garantia** | 12 meses (padrão ML pra produtos novos) |
| **Descrição** | Texto corrido (ML não aceita HTML). Specs técnicas + benefícios + uso. |
| **Ficha técnica** | Comprimento, ação, potência, material, rolamentos, drag — do parsing + web search |
| **Preço** | `(Custo + R$5,50) / (1 - 0,115 - impostos)`. Ajustado se frete grátis. |
| **Fotos** | NÃO incluídas na planilha. Adicionar pelo editor do ML após upload. |

## Passo a passo de upload

| # | Ação |
|---|---|
| 1 | ML → Vender → Produtos → Anunciador em Massa → Carregar planilha |
| 2 | Selecionar `.xlsx` gerado pelo Guiamos. **Não editar o arquivo** — qualquer alteração pode quebrar a estrutura. |
| 3 | Aguardar processamento (1–5 min). ML envia email quando concluído. |
| 4 | Baixar arquivo de resultado. Se houver erros, enviar pro Guiamos pra correção automática (`/api/fix-errors`). |
| 5 | Acessar Meus Anúncios → adicionar fotos manualmente em cada produto (~2 min/produto). |
| 6 (se usa Bling) | Bling → Integrações → ML → Trazer anúncio pelo MLB. **Ativar "Atualizar dimensões ao exportar produto"** ⚠️ |

> Limite: 10.000 anúncios por dia.

## Erros conhecidos

| Erro | Causa | Correção do Guiamos |
|---|---|---|
| "Entrega a combinar" em todos os anúncios | Conta pessoal sem Mercado Envios | Detectar no onboarding e bloquear até confirmar conta empresarial |
| Template com produtos de outras marcas | ML gera sugestões ao criar template | Limpar automaticamente todas as linhas de dados, manter só cabeçalhos |
| Prazo de entrega ~25 dias | Dimensões zeradas no Bling → ML não calcula frete | Inferir dimensões antes de gerar; alertar configuração do Bling |
| Anúncio pausado por "informação incorreta" | GTIN errado, categoria inadequada ou ficha incompleta | Validar GTIN contra GS1, categorizar corretamente |
| Anúncio com "moderação de conteúdo" | Descrição com links, contatos ou menção a frete | Não incluir URLs, telefones, endereços ou frete na descrição |
| Anúncios patrocinados causando prejuízo | ROAS 4 + comissão 11,5% + impostos | Calcular ROAS mínimo e alertar produtos que não suportam ads |
| Varas longas sem Mercado Envios | Correios não aceita >105cm | Detectar dimensões e configurar "frete a combinar" automaticamente |
| Produto padrão do ML Catálogo — obrigatório vincular | EAN coincide com produto do catálogo ML | Vincular ao listing existente em vez de criar duplicata |

## Particularidades

- **Não aceita HTML** na descrição — texto corrido apenas com quebras de linha
- **Limite de 60 chars no título** é rigoroso — corte é automático sem aviso
