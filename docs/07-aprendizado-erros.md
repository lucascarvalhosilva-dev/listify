# 07 — Aprendizado Automático de Erros

> Este é um sistema **novo**, não documentado na v5. Substitui o "banco de erros estático" que existia antes.

## O que é

Sistema de 3 camadas que aprende com erros reais em produção. Toda vez que um upload de canal retorna erro, o sistema captura, classifica e usa esse aprendizado para corrigir automaticamente erros futuros do mesmo tipo.

## Tabela `erros_aprendidos`

| Coluna | Tipo | Descrição |
|---|---|---|
| `canal` | text | Marketplace onde o erro ocorreu (shopee, ml, amazon, etc.) |
| `tipo_erro` | text | Categoria do erro (ex: dimensão, GTIN, dropdown XML) |
| `causa` | text | Causa raiz identificada |
| `solucao` | text | Correção que resolveu o caso |
| `ocorrencias` | int | Contador de vezes que o erro foi visto |
| `exemplo_original` | jsonb | Linha/produto que gerou o erro |
| `exemplo_corrigido` | jsonb | Como ficou após correção |

## As 3 camadas

### Camada 1 — Banco fixo (regras conhecidas)
Erros documentados na doc original e implementados como regras determinísticas no código. Exemplos:
- Shopee: campo Correios precisa de `"Ligado"` (não `"Ativar"`) — corrigido no XML antes do upload
- ML: dimensões zeradas → habilitar "Atualizar dimensões ao exportar produto" no Bling
- TikTok: comprimento > 100cm → ajustar pra 99cm automaticamente

Ver arquivos individuais por canal em `canais/<nome>.md`.

### Camada 2 — Aprendizado por classificação (LLM)

⚠️ STATUS: planejada, não implementada ainda. /api/fix-errors não existe no código.

Quando upload retorna erro novo (não coberto pela camada 1), o sistema:
1. Lê o arquivo de erro retornado pelo canal
2. Envia pra Claude API com contexto do produto original
3. Pede pra classificar: causa raiz + correção sugerida
4. Aplica a correção e re-tenta o upload
5. Se funcionar, salva em `erros_aprendidos` pra uso futuro

### Camada 3 — Detecção de padrões recorrentes

⚠️ STATUS: planejada, não implementada ainda.

Quando um erro aparece N vezes (atualmente threshold de 3), o sistema:
1. Promove o aprendizado da camada 2 pra regra determinística da camada 1
2. Notifica o mantenedor (no dashboard interno) que uma nova regra foi candidatada
3. A regra passa a ser aplicada **antes** do upload, evitando o erro de vez

## API de correção

Endpoint planejado — ainda não implementado. O fluxo descrito abaixo é o comportamento alvo.

Fluxo do usuário:
1. Usuário faz upload no canal (Shopee, ML, etc.)
2. Canal retorna arquivo de erro
3. Usuário envia esse arquivo pra Guiamos via chat ou painel
4. `/api/fix-errors` processa e devolve versão corrigida pronta pra novo upload

## Erros conhecidos (regras determinísticas atuais)

> Lista completa por canal nos arquivos `canais/<nome>.md` — seção "Erros conhecidos".

Resumo dos erros mais frequentes:

| Canal | Erro | Solução |
|---|---|---|
| Shopee | Template não carrega (openpyxl trava) | Script automático: limpar atributo `activePane` do XML |
| Shopee | Erro 90006 — Correios rejeitado | Trocar valor `"Ativar"` por `"Ligado"` no campo XML |
| ML | Prazo de entrega 25+ dias | Dimensões zeradas — alertar configuração do Bling |
| ML | "Entrega a combinar" em tudo | Conta ML pessoal sem Mercado Envios — exigir CNPJ no onboarding |
| TikTok | "Package length must be 0–100cm" | Detectar e ajustar pra 99cm automaticamente |
| TikTok | "Não foi possível criar marca X" | Substituir por "Sem marca" |
| Magalu | Produto reprovado por palavra bloqueada | Filtrar termos como "raticida", "praticidade" antes do envio |
| Amazon | "GTIN inválido" / conflito | Validar EAN via GS1 antes de usar; senão, solicitar isenção de GTIN |
| Bling | Dimensões zeradas no ML | Configuração "Atualizar dimensões ao exportar" desativada |

## Por que isso importa pra economia de tokens

Quando o Claude Code for implementar lógica de correção de erro, ele consulta:
1. Primeiro `canais/<nome>.md` (regra determinística da camada 1)
2. Se não tiver, consulta `07-aprendizado-erros.md` pra entender como acionar a camada 2

Em vez de re-explicar a arquitetura toda vez.
