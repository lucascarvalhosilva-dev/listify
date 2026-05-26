import { normalizarCanalParaEngine } from '@/lib/normalizar-canais'

export type PriceGuardStatus = 'ok' | 'atencao' | 'risco'

export interface ProdutoRevisaoPriceGuard {
  sku: string
  nome: string
  custo: number
  preco_ml?: number
  preco_shopee?: number
  preco_tiktok?: number
  preco_bling?: number
  preco_magalu?: number
  preco_amazon?: number
}

export interface PriceGuardCanalResumo {
  canal: string
  nome_canal_label: string
  status: PriceGuardStatus
  produtos_analisados: number
  produtos_com_alerta: number
  produtos_com_prejuizo: number
  preco_medio: number | null
  custo_medio: number | null
  margem_minima_percentual: number | null
  lucro_minimo: number | null
  taxas_percentual: number
  custo_fixo_estimado: number
}

export interface PriceGuardRisco {
  canal: string
  nome_canal_label: string
  sku: string
  nome: string
  motivo: string
  status: PriceGuardStatus
  custo: number
  preco: number | null
  lucro_estimado: number | null
  margem_percentual: number | null
}

export interface PriceGuardData {
  status: PriceGuardStatus
  titulo: string
  resumo: string
  canais: PriceGuardCanalResumo[]
  riscos_preview: PriceGuardRisco[]
  nota: string
}

export interface CardPriceGuardAction {
  acao: 'card_price_guard'
  price_guard: PriceGuardData
}

const CANAL_LABELS: Record<string, string> = {
  shopee: 'Shopee',
  ml: 'Mercado Livre',
  mercado_livre: 'Mercado Livre',
  tiktok_shop: 'TikTok Shop',
  tiktok: 'TikTok Shop',
  bling: 'Bling',
  magalu: 'Magalu',
  amazon: 'Amazon',
}

const PRECO_FIELD_BY_CANAL: Record<string, keyof ProdutoRevisaoPriceGuard> = {
  shopee: 'preco_shopee',
  ml: 'preco_ml',
  mercado_livre: 'preco_ml',
  tiktok: 'preco_tiktok',
  tiktok_shop: 'preco_tiktok',
  bling: 'preco_bling',
  magalu: 'preco_magalu',
  amazon: 'preco_amazon',
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null
  return round2(valores.reduce((acc, valor) => acc + valor, 0) / valores.length)
}

function obterPoliticaPreco(canal: string, regime: 'MEI' | 'SN', preco: number) {
  const imposto = regime === 'SN' ? 0.04 : 0
  const canalNormalizado = normalizarCanalParaEngine(canal)

  if (canalNormalizado === 'shopee') {
    return {
      comissao: 0.14,
      imposto,
      taxaPagamento: 0,
      custoFixo: regime === 'MEI' ? 5.5 : 2.5,
    }
  }

  if (canalNormalizado === 'tiktok' || canalNormalizado === 'tiktok_shop') {
    return {
      comissao: 0,
      imposto: 0.04,
      taxaPagamento: 0.0299,
      custoFixo: 4,
    }
  }

  if (canalNormalizado === 'amazon') {
    return { comissao: 0.15, imposto, taxaPagamento: 0, custoFixo: 5.5 }
  }

  if (canalNormalizado === 'magalu') {
    return { comissao: 0.14, imposto, taxaPagamento: 0, custoFixo: 5.5 }
  }

  const taxaFixaML = preco < 79 ? 6.75 : 0
  return {
    comissao: 0.115,
    imposto,
    taxaPagamento: 0,
    custoFixo: 5.5 + taxaFixaML,
  }
}

export function criarCardPriceGuard(params: {
  produtosRevisao: ProdutoRevisaoPriceGuard[]
  canais: string[]
  regime: 'MEI' | 'SN'
}): CardPriceGuardAction {
  const riscos: PriceGuardRisco[] = []

  const canaisResumo = params.canais.map(canal => {
    const campoPreco = PRECO_FIELD_BY_CANAL[canal]
    const nomeCanal = CANAL_LABELS[normalizarCanalParaEngine(canal)] ?? CANAL_LABELS[canal] ?? canal
    const precosValidos: number[] = []
    const custosValidos: number[] = []
    const margens: number[] = []
    const lucros: number[] = []
    const custosFixos: number[] = []
    const taxas: number[] = []
    let produtosComPrejuizo = 0
    let produtosComAlerta = 0

    for (const produto of params.produtosRevisao) {
      const custo = Number(produto.custo)
      const preco = campoPreco ? Number(produto[campoPreco]) : NaN

      if (!Number.isFinite(custo) || custo < 0 || !Number.isFinite(preco) || preco <= 0) {
        produtosComAlerta += 1
        riscos.push({
          canal,
          nome_canal_label: nomeCanal,
          sku: produto.sku,
          nome: produto.nome,
          motivo: 'preço não calculado para este canal',
          status: 'atencao',
          custo: Number.isFinite(custo) ? round2(custo) : 0,
          preco: null,
          lucro_estimado: null,
          margem_percentual: null,
        })
        continue
      }

      const politica = obterPoliticaPreco(canal, params.regime, preco)
      const taxaPercentual = politica.comissao + politica.imposto + politica.taxaPagamento
      const custoTaxas = preco * taxaPercentual
      const lucroEstimado = preco - custo - politica.custoFixo - custoTaxas
      const margemPercentual = preco > 0 ? (lucroEstimado / preco) * 100 : -100

      precosValidos.push(preco)
      custosValidos.push(custo)
      margens.push(margemPercentual)
      lucros.push(lucroEstimado)
      custosFixos.push(politica.custoFixo)
      taxas.push(taxaPercentual * 100)

      if (lucroEstimado <= 0 || margemPercentual < 10) {
        produtosComAlerta += 1
        const status: PriceGuardStatus = lucroEstimado <= 0 ? 'risco' : 'atencao'
        if (status === 'risco') produtosComPrejuizo += 1
        riscos.push({
          canal,
          nome_canal_label: nomeCanal,
          sku: produto.sku,
          nome: produto.nome,
          motivo: status === 'risco'
            ? `lucro estimado negativo de R$ ${Math.abs(round2(lucroEstimado)).toFixed(2).replace('.', ',')}`
            : 'margem estimada abaixo de 10%',
          status,
          custo: round2(custo),
          preco: round2(preco),
          lucro_estimado: round2(lucroEstimado),
          margem_percentual: round1(margemPercentual),
        })
      }
    }

    if (params.produtosRevisao.length === 0) {
      produtosComAlerta = 1
      riscos.push({
        canal,
        nome_canal_label: nomeCanal,
        sku: '-',
        nome: 'Dados de preço',
        motivo: 'dados de preço não retornados para conferência',
        status: 'atencao',
        custo: 0,
        preco: null,
        lucro_estimado: null,
        margem_percentual: null,
      })
    }

    const status: PriceGuardStatus =
      produtosComPrejuizo > 0 ? 'risco' : produtosComAlerta > 0 ? 'atencao' : 'ok'

    return {
      canal,
      nome_canal_label: nomeCanal,
      status,
      produtos_analisados: precosValidos.length,
      produtos_com_alerta: produtosComAlerta,
      produtos_com_prejuizo: produtosComPrejuizo,
      preco_medio: media(precosValidos),
      custo_medio: media(custosValidos),
      margem_minima_percentual: margens.length > 0 ? round1(Math.min(...margens)) : null,
      lucro_minimo: lucros.length > 0 ? round2(Math.min(...lucros)) : null,
      taxas_percentual: taxas.length > 0 ? round1(taxas[0]) : 0,
      custo_fixo_estimado: media(custosFixos) ?? 0,
    }
  })

  const temPrejuizo = canaisResumo.some(canal => canal.produtos_com_prejuizo > 0)
  const temAlerta = canaisResumo.some(canal => canal.produtos_com_alerta > 0)
  const status: PriceGuardStatus = temPrejuizo ? 'risco' : temAlerta ? 'atencao' : 'ok'

  return {
    acao: 'card_price_guard',
    price_guard: {
      status,
      titulo: status === 'ok'
        ? 'Price Guard: margem positiva'
        : status === 'risco'
          ? 'Price Guard: revise antes do upload'
          : 'Price Guard: atenção nas margens',
      resumo: status === 'ok'
        ? 'Nenhum produto ficou com lucro estimado negativo nas taxas configuradas do Guiamos.'
        : status === 'risco'
          ? 'Encontrei produto com risco de prejuízo. Ajuste o preço antes de publicar.'
          : 'Os preços foram calculados, mas alguns produtos ficaram com margem baixa ou dados incompletos.',
      canais: canaisResumo,
      riscos_preview: riscos.slice(0, 4),
      nota: 'Estimativa baseada no custo informado, regime tributário e taxas configuradas no Guiamos. Revise frete real, promoções e regras fiscais antes de publicar.',
    },
  }
}
