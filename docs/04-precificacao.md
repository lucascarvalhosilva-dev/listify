# 04 — Precificação

## Fórmula base de preço de venda

```
Preço = (Custo + Custo Fixo + Lucro Alvo) / (1 - Comissão% - Imposto%)
```

- **MEI**: `Imposto% = 0%` (DAS fixo mensal, não há imposto proporcional por venda)
- **Simples Nacional**: `Imposto% = alíquota da faixa` (geralmente 4–6%)

## Tabela de cálculo por canal/modalidade

| Canal / Modalidade | Comissão | Imposto | Custo Fixo | Taxa adicional | Observação |
|---|---|---|---|---|---|
| ML Clássico — frete comprador | 11,5% | 4% SN / 0% MEI | R$ 5,50 | R$ 6,75 se preço R$20–R$79 | Taxa fixa zerada para preços ≥ R$79 |
| ML Clássico — frete grátis | 11,5% | 4% SN / 0% MEI | R$ 5,50 + frete real | Frete médio R$12–R$20 | Frete por CEP de origem |
| ML Premium — frete grátis | 16% | 4% SN / 0% MEI | R$ 5,50 + frete real | — | Maior exposição, menor margem |
| Shopee — MEI | 14% | 0% | R$ 2,50 | — | Provado em produção |
| Shopee — Simples Nacional | 14% | 4% | R$ 2,50 | — | — |
| Amazon Brasil | ~15% (pesca) | 4% SN | R$ 5,50 | FBA: custos adicionais | Comissão varia por subcategoria |
| Magalu | ~12–16% (varia) | 4% SN | R$ 5,50 | — | Verificar tabela atual no painel |
| TikTok — Promo 90 dias | 0% | 4% SN | R$ 4,00 | Pagamento: 2,99% | Somente novos sellers |
| TikTok — Normal | 6% | 4% SN | R$ 4,00 | Pagamento: 2,99% | Após período promo |
| Orgânico (site próprio) | 0% | 4% SN | R$ 2,50 | Gateway: 6,5% | Melhor margem |
| Atacado A (≥ R$500) | 0% | 4% SN | R$ 5,50 | — | Markup ~1,40x |

## Planos atuais do Guiamos

> ⚠️ Preços **atualizados** em relação à doc v5 (que listava Starter R$97 / Profissional R$197 / Agência R$497). Os preços abaixo são os vigentes.

| Plano | Preço/mês | Produtos/mês | Canais | Catálogos | Para quem |
|---|---|---|---|---|---|
| **Free** | R$ 0 | 5 produtos | 2 (Shopee + ML) | 1 catálogo | Quem está experimentando |
| **Starter** | R$ 29 | 100 produtos | 2 canais | 5 catálogos | Vendedor iniciando |
| **Profissional** | R$ 59 | 500 produtos | 4 canais | 30 catálogos | Loja expandindo |
| **Agência** | R$ 127 | ilimitado | 6 canais | ilimitado, 3 usuários | Consultores / agências |

### Recursos por plano

| Recurso | Free | Starter | Profissional | Agência |
|---|---|---|---|---|
| Geração de catálogos | ✅ | ✅ | ✅ | ✅ |
| Shopee + ML | ✅ | ✅ | ✅ | ✅ |
| TikTok / Magalu / Amazon / Bling | ❌ | ❌ | ✅ | ✅ |
| HelpChat (chat de suporte) | ❌ | ✅ | ✅ | ✅ |
| Correção automática de erros | ❌ | ✅ | ✅ | ✅ |
| White-label / multi-usuário | ❌ | ❌ | ❌ | ✅ |

### Trava de uso

Quando usuário bate o limite do plano:
- Tentar gerar > limite de produtos → redireciona pra `/upgrade`
- Tentar criar catálogo > limite → redireciona pra `/upgrade`
- Tentar usar canal bloqueado → canal aparece desabilitado visualmente com link pra `/upgrade`

## Mercado Pago (pendente)

⚠️ **Checkout e assinaturas ainda não implementados**. Plano Free funciona sem pagamento, mas os planos pagos dependem da integração com Mercado Pago. Ver `PROXIMOS-PASSOS.md`.
