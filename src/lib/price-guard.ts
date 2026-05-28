import { normalizarCanalParaEngine } from '@/lib/normalizar-canais'

export type PriceGuardStatus = 'ok' | 'atencao' | 'risco'
export type RegimePriceGuard = 'MEI' | 'SN'
export type AplicarAjusteEm = 'todos' | 'com_risco' | 'selecionados'
export type TipoAjustePreco = 'margem_minima' | 'percentual' | 'valor_fixo' | 'preco_manual'
export type CampoPrecoProduto =
  | 'preco_ml'
  | 'preco_shopee'
  | 'preco_tiktok'
  | 'preco_bling'
  | 'preco_magalu'
  | 'preco_amazon'

export interface VariacaoML {
  sku: string
  attribute_combinations: Array<{ id: string; value_name?: string; value_id?: string }>
  available_quantity: number
  price: number
}

export interface ProdutoRevisaoPriceGuard {
  sku: string
  nome: string
  marca?: string
  categoria?: string
  cor?: string
  genero?: string
  tipo_roupa?: string
  tipo_manga?: string
  tamanho?: string
  custo: number
  estoque?: number
  embalagem?: number
  preco_ml?: number
  preco_shopee?: number
  preco_tiktok?: number
  preco_bling?: number
  preco_magalu?: number
  preco_amazon?: number
  peso_g?: number
  comprimento_cm?: number
  largura_cm?: number
  altura_cm?: number
  confianca_dimensoes?: 'alta' | 'media'
  titulo_ml?: string
  titulo_shopee?: string
  titulo_amazon?: string
  descricao_ml?: string
  descricao_shopee?: string
  descricao_tiktok?: string
  descricao_magalu?: string
  descricao_bling?: string
  descricao_amazon?: string
  bullet_point1?: string
  bullet_point2?: string
  bullet_point3?: string
  bullet_point4?: string
  bullet_point5?: string
  ncm?: string
  gtin?: string
  categoria_ml?: string
  fotos?: string[]
  atributos_ml?: { id: string; value_name?: string; value_id?: string }[]
  atributos_pendentes_ml?: { id: string; name: string }[]
  variations?: VariacaoML[]
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
  sessao_id?: string
  conversa_id?: string
  canais?: string[]
}

export interface PoliticaPreco {
  comissao: number
  imposto: number
  taxaPagamento: number
  custoFixo: number
}

export interface PriceGuardMetricas {
  custo: number
  preco: number
  lucro_estimado: number
  margem_percentual: number
  taxas_percentual: number
  custo_fixo: number
}

export interface AjustePrecoManual {
  sku: string
  canal: string
  preco: number
}

export interface AplicarAjustePrecosParams {
  produtos: ProdutoRevisaoPriceGuard[]
  canais: string[]
  regime: RegimePriceGuard
  tipo: TipoAjustePreco
  aplicarEm: AplicarAjusteEm
  margemMinimaPercentual?: number
  percentual?: number
  valorFixo?: number
  arredondarFinal90?: boolean
  ajustesManuais?: AjustePrecoManual[]
  skusSelecionados?: string[]
}

export interface AlteracaoPreco {
  sku: string
  nome: string
  canal: string
  nome_canal_label: string
  preco_anterior: number
  preco_novo: number
  margem_anterior: number | null
  margem_nova: number | null
}

export interface AplicarAjustePrecosResultado {
  produtos: ProdutoRevisaoPriceGuard[]
  alteracoes: AlteracaoPreco[]
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

const PRECO_FIELD_BY_CANAL: Record<string, CampoPrecoProduto> = {
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

function formatarMoedaCurta(valor: number): string {
  return valor.toFixed(2).replace('.', ',')
}

export function normalizarCanalPriceGuard(canal: string): string {
  return normalizarCanalParaEngine(canal)
}

export function getCanalLabelPriceGuard(canal: string): string {
  const normalizado = normalizarCanalPriceGuard(canal)
  return CANAL_LABELS[normalizado] ?? CANAL_LABELS[canal] ?? canal
}

export function getCampoPrecoPorCanal(canal: string): CampoPrecoProduto | null {
  const normalizado = normalizarCanalPriceGuard(canal)
  return PRECO_FIELD_BY_CANAL[normalizado] ?? PRECO_FIELD_BY_CANAL[canal] ?? null
}

export function obterPoliticaPreco(canal: string, regime: RegimePriceGuard, preco: number): PoliticaPreco {
  const imposto = regime === 'SN' ? 0.04 : 0
  const canalNormalizado = normalizarCanalPriceGuard(canal)

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

export function calcularMetricasPriceGuard(
  produto: ProdutoRevisaoPriceGuard,
  canal: string,
  regime: RegimePriceGuard
): PriceGuardMetricas | null {
  const campoPreco = getCampoPrecoPorCanal(canal)
  const custo = Number(produto.custo)
  const preco = campoPreco ? Number(produto[campoPreco]) : NaN

  if (!Number.isFinite(custo) || custo < 0 || !Number.isFinite(preco) || preco <= 0) {
    return null
  }

  const politica = obterPoliticaPreco(canal, regime, preco)
  const taxaPercentual = politica.comissao + politica.imposto + politica.taxaPagamento
  const custoTaxas = preco * taxaPercentual
  const lucroEstimado = preco - custo - politica.custoFixo - custoTaxas
  const margemPercentual = preco > 0 ? (lucroEstimado / preco) * 100 : -100

  return {
    custo: round2(custo),
    preco: round2(preco),
    lucro_estimado: round2(lucroEstimado),
    margem_percentual: round1(margemPercentual),
    taxas_percentual: round1(taxaPercentual * 100),
    custo_fixo: round2(politica.custoFixo),
  }
}

function statusPorMetricas(metricas: PriceGuardMetricas | null, margemMinimaPercentual = 10): PriceGuardStatus {
  if (!metricas) return 'atencao'
  if (metricas.lucro_estimado <= 0) return 'risco'
  if (metricas.margem_percentual < margemMinimaPercentual) return 'atencao'
  return 'ok'
}

export function arredondarPrecoFinal90(preco: number): number {
  if (!Number.isFinite(preco) || preco <= 0) return 0
  const base = Math.floor(preco) + 0.9
  return round2(base >= preco ? base : Math.floor(preco) + 1.9)
}

function calcularPrecoComPolitica(
  custo: number,
  canal: string,
  regime: RegimePriceGuard,
  margemPercentual: number,
  precoReferencia: number
): number {
  const politica = obterPoliticaPreco(canal, regime, precoReferencia)
  const taxaPercentual = politica.comissao + politica.imposto + politica.taxaPagamento
  const margem = margemPercentual / 100
  const denominador = 1 - taxaPercentual - margem
  if (denominador <= 0.05) return custo + politica.custoFixo
  return (custo + politica.custoFixo) / denominador
}

export function calcularPrecoParaMargem(params: {
  custo: number
  canal: string
  regime: RegimePriceGuard
  margemPercentual: number
  arredondarFinal90?: boolean
}): number {
  const custo = Number(params.custo)
  const margem = Number(params.margemPercentual)
  if (!Number.isFinite(custo) || custo < 0 || !Number.isFinite(margem)) return 0

  const canalNormalizado = normalizarCanalPriceGuard(params.canal)
  let preco: number

  if (canalNormalizado === 'ml' || canalNormalizado === 'mercado_livre') {
    const precoComTaxaBaixa = calcularPrecoComPolitica(custo, params.canal, params.regime, margem, 0)
    if (precoComTaxaBaixa < 79) {
      preco = precoComTaxaBaixa
    } else {
      const precoSemTaxaBaixa = calcularPrecoComPolitica(custo, params.canal, params.regime, margem, 79)
      preco = precoSemTaxaBaixa >= 79 ? precoSemTaxaBaixa : 79
    }
  } else {
    preco = calcularPrecoComPolitica(custo, params.canal, params.regime, margem, 0)
  }

  const arredondado = params.arredondarFinal90 ? arredondarPrecoFinal90(preco) : round2(preco)
  return Math.max(0, arredondado)
}

export function aplicarAjustePrecos(params: AplicarAjustePrecosParams): AplicarAjustePrecosResultado {
  const produtos = params.produtos.map(produto => ({ ...produto }))
  const alteracoes: AlteracaoPreco[] = []
  const margemAlvo = Math.max(1, Math.min(80, Number(params.margemMinimaPercentual ?? 10)))
  const skusSelecionados = new Set((params.skusSelecionados ?? []).map(sku => sku.trim()).filter(Boolean))

  if (params.tipo === 'preco_manual') {
    for (const ajuste of params.ajustesManuais ?? []) {
      const produto = produtos.find(p => p.sku === ajuste.sku)
      const campoPreco = getCampoPrecoPorCanal(ajuste.canal)
      const precoNovo = Number(ajuste.preco)
      if (!produto || !campoPreco || !Number.isFinite(precoNovo) || precoNovo <= 0) continue

      const precoAnterior = Number(produto[campoPreco])
      if (!Number.isFinite(precoAnterior) || Math.abs(precoNovo - precoAnterior) < 0.01) continue

      const metricasAntes = calcularMetricasPriceGuard(produto, ajuste.canal, params.regime)
      produto[campoPreco] = round2(precoNovo)
      const metricasDepois = calcularMetricasPriceGuard(produto, ajuste.canal, params.regime)
      alteracoes.push({
        sku: produto.sku,
        nome: produto.nome,
        canal: normalizarCanalPriceGuard(ajuste.canal),
        nome_canal_label: getCanalLabelPriceGuard(ajuste.canal),
        preco_anterior: round2(precoAnterior),
        preco_novo: round2(precoNovo),
        margem_anterior: metricasAntes?.margem_percentual ?? null,
        margem_nova: metricasDepois?.margem_percentual ?? null,
      })
    }

    return { produtos, alteracoes }
  }

  for (const produto of produtos) {
    if (params.aplicarEm === 'selecionados' && !skusSelecionados.has(produto.sku)) continue

    for (const canal of params.canais) {
      const campoPreco = getCampoPrecoPorCanal(canal)
      if (!campoPreco) continue

      const precoAnterior = Number(produto[campoPreco])
      const metricasAntes = calcularMetricasPriceGuard(produto, canal, params.regime)
      const statusAntes = statusPorMetricas(metricasAntes, margemAlvo)

      if (params.aplicarEm === 'com_risco' && statusAntes === 'ok') continue
      if (!Number.isFinite(precoAnterior) || precoAnterior <= 0) continue

      let precoNovo = precoAnterior

      if (params.tipo === 'margem_minima') {
        precoNovo = calcularPrecoParaMargem({
          custo: produto.custo,
          canal,
          regime: params.regime,
          margemPercentual: margemAlvo,
          arredondarFinal90: params.arredondarFinal90,
        })
        precoNovo = Math.max(precoAnterior, precoNovo)
      } else if (params.tipo === 'percentual') {
        const percentual = Number(params.percentual ?? 0)
        if (!Number.isFinite(percentual) || percentual === 0) continue
        precoNovo = precoAnterior * (1 + percentual / 100)
        if (params.arredondarFinal90) precoNovo = arredondarPrecoFinal90(precoNovo)
      } else if (params.tipo === 'valor_fixo') {
        const valorFixo = Number(params.valorFixo ?? 0)
        if (!Number.isFinite(valorFixo) || valorFixo === 0) continue
        precoNovo = precoAnterior + valorFixo
        if (params.arredondarFinal90) precoNovo = arredondarPrecoFinal90(precoNovo)
      }

      precoNovo = round2(precoNovo)
      if (!Number.isFinite(precoNovo) || precoNovo <= 0 || Math.abs(precoNovo - precoAnterior) < 0.01) continue

      produto[campoPreco] = precoNovo
      const metricasDepois = calcularMetricasPriceGuard(produto, canal, params.regime)

      alteracoes.push({
        sku: produto.sku,
        nome: produto.nome,
        canal: normalizarCanalPriceGuard(canal),
        nome_canal_label: getCanalLabelPriceGuard(canal),
        preco_anterior: round2(precoAnterior),
        preco_novo: precoNovo,
        margem_anterior: metricasAntes?.margem_percentual ?? null,
        margem_nova: metricasDepois?.margem_percentual ?? null,
      })
    }
  }

  return { produtos, alteracoes }
}

export function criarCardPriceGuard(params: {
  produtosRevisao: ProdutoRevisaoPriceGuard[]
  canais: string[]
  regime: RegimePriceGuard
}): CardPriceGuardAction {
  const riscos: PriceGuardRisco[] = []

  const canaisResumo = params.canais.map(canal => {
    const nomeCanal = getCanalLabelPriceGuard(canal)
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
      const metricas = calcularMetricasPriceGuard(produto, canal, params.regime)

      if (!metricas) {
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

      precosValidos.push(metricas.preco)
      custosValidos.push(metricas.custo)
      margens.push(metricas.margem_percentual)
      lucros.push(metricas.lucro_estimado)
      custosFixos.push(metricas.custo_fixo)
      taxas.push(metricas.taxas_percentual)

      const status = statusPorMetricas(metricas)
      if (status !== 'ok') {
        produtosComAlerta += 1
        if (status === 'risco') produtosComPrejuizo += 1
        riscos.push({
          canal,
          nome_canal_label: nomeCanal,
          sku: produto.sku,
          nome: produto.nome,
          motivo: status === 'risco'
            ? `lucro estimado negativo de R$ ${formatarMoedaCurta(Math.abs(metricas.lucro_estimado))}`
            : 'margem estimada abaixo de 10%',
          status,
          custo: metricas.custo,
          preco: metricas.preco,
          lucro_estimado: metricas.lucro_estimado,
          margem_percentual: metricas.margem_percentual,
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
