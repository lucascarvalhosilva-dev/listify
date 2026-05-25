# Bling (ERP)

## Por que está aqui

O Bling não é marketplace — é um ERP. Está nesta documentação porque integra com ML, Amazon e outros canais, sincronizando estoque e dimensões. Erros no Bling viram erros nos marketplaces.

## Campos gerados pelo Guiamos

| Campo | Lógica | Observação crítica |
|---|---|---|
| **Descrição** | Nome completo otimizado | Base de dados pra todos os canais |
| **Preço custo/venda** | Informado pelo usuário / calculado com markup | Bling sincroniza preço com ML, Amazon e outros integrados |
| **NCM** | Mapeado por tipo de produto | Obrigatório pra NF-e |
| **Peso e dimensões** | Inferidos por tipo/modelo | ⚠️ **Crítico**: habilitar "Atualizar dimensões ao exportar produto" nas configurações de integração |
| **GTIN/EAN** | Pesquisado + padrão da marca | Bling usa pra vincular ao catálogo dos marketplaces |
| **Categoria** | Varas > Telescópica, Molinetes, Carretilhas, Acessórios | Afeta categoria sugerida nos marketplaces integrados |
| **URLs de fotos** | Mapeadas do Drive: SKU → SKU_01.jpg, SKU_02.jpg... | Bling aceita Drive URLs (provado em produção) |

## Passo a passo de upload

| # | Ação |
|---|---|
| Pré | Bling → Configurações → Integrações → ML → **"Atualizar dimensões ao exportar produto" = ATIVO** ⚠️ |
| 1 | Bling → Produtos → Importar Produtos → Selecionar arquivo |
| 2 | Selecionar CSV gerado pelo Guiamos (formato padrão Bling) |
| 3 | Confirmar importação. Produtos aparecem com dimensões, fotos e categorias preenchidas. |

## Erros conhecidos

| Erro | Causa | Correção do Guiamos |
|---|---|---|
| Dimensões zeradas ao exportar pro ML | Opção "Atualizar dimensões ao exportar" desativada | Alerta no onboarding com link direto pra configuração |
| Fotos não aparecem após importação | URL do Drive sem permissão pública | Validar acessibilidade da URL antes de incluir |
| CSV importado duplica produtos | Bling trata como novo cadastro se não há ID do produto | Incluir coluna de ID do Bling pra forçar atualização |

## Particularidades

- **Drive URLs funcionam** (provado em produção)
- **Sincronização com ML** depende do toggle "Atualizar dimensões" — sem isso, ML recebe dimensões zeradas e calcula frete errado (prazo 25+ dias)
