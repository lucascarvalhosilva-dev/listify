# Shopee

## Pré-requisitos da conta

| Requisito | Como verificar | Como resolver |
|---|---|---|
| Correios habilitado | Configurações → Envio → Canal Logístico → Correios | Toggle "Habilitar este canal" verde. Sem isso: erro 90006. |
| Fotos no Drive com acesso público | Abrir link da pasta em aba anônima | Pasta → Compartilhar → Qualquer pessoa → Visualizador |

## Campos gerados pelo Guiamos

| Campo | Lógica |
|---|---|
| **Nome** | Máx. 120 chars. Palavra-chave no início. Title Case. Sem emojis/caracteres especiais. |
| **Descrição** | Bullet points + indicação de uso + conteúdo da embalagem + garantia |
| **Preço MEI** | `(Custo + R$2,50 + R$3,00) / 0,86` — arredondado para `.90` |
| **Preço Simples Nacional** | `(Custo + R$2,50 + lucro) / (1 - 0,14 - 0,04)` |
| **Fotos** | URLs do Drive mapeadas automaticamente (`SKU_01.jpg` = capa, demais = extras) |
| **GTIN** | Pesquisado por nome/modelo + padrão da marca |
| **Peso e dimensões** | Inferidos por tipo/modelo. Exibidos para revisão antes de gerar. |
| **Canal logístico (Correios)** | Valor XML correto: **`"Ligado"`** (não `"Ativar"`) |
| **NCM** | 95071000 (varas) / 95073000 (molinetes/carretilhas) / 95079000 (linhas) |
| **CFOP** | 5102 (mesmo estado) / 6102 (outro estado) |
| **CSOSN** | 400 (Simples Nacional / MEI) |
| **Produtos >105cm** | Removidos do canal logístico automaticamente com alerta ao usuário |

## Passo a passo de upload

| # | Ação |
|---|---|
| 1 | Central do Vendedor → Produto → Upload em massa → aba **Envio** (não Baixar) |
| 2 | Selecionar `.xlsx` gerado pelo Guiamos. **Não usar template original da Shopee.** |
| 3 | Verificar nos Registros: "Sucesso X/X" = todos processados |
| 4 | Se houver falhas: baixar resultado, enviar pro Guiamos (`/api/fix-errors`) |
| 5 | Produto → Rascunho → Selecionar todos → Ações em Massa → Publicar |
| 6 (opcional) | Ferramentas de Produto → Editar Características → preencher Material, Tipo de Pesca, Comprimento, Garantia → melhora ranqueamento |

## Erros conhecidos

| Erro | Causa | Correção do Guiamos |
|---|---|---|
| Template não carrega, openpyxl trava | Atributo `activePane` inválido no XML interno | Script automático: `re.sub(r'activePane="[^"]*"', '', content)` em todos os worksheets do ZIP |
| Erro 90006 — Correios rejeitado | Campo preenchido com `"Ativar"` mas XML aceita `"Ligado"` | Inspecionar XML do template e usar valores válidos dos dropdowns |
| "Falha em Todos" (ex: 0/13) | Combinação dos dois erros acima | XML fix + mapeamento de dropdowns como etapas obrigatórias |
| Produto em rascunho permanente | Sem foto de capa ou URL inacessível | Validar URLs antes de incluir |
| Varas longas bloqueadas | Limite Correios ~105cm | Detectar e remover canal logístico desses produtos |
| Produto suspenso por "cadastro inadequado" | Informações incompletas ou categoria errada | Categoria correta é crítica — categoria errada aciona bloqueio automático |
| Produto duplicado | Mesmo produto cadastrado duas vezes | Shopee detecta e suspende o mais novo |
| Atributos não editáveis via planilha | Disponíveis só no editor web | Incluir no guia: preencher em Ferramenta de Características após publicação |

## Particularidades

- **Drive funciona como fonte de fotos** (provado em produção)
- **Sempre usar a aba "Envio"** no upload em massa, nunca a "Baixar"
- **Limite 120 chars no título** com tolerância
