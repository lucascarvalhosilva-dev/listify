export interface Precos {
  preco_ml: number
  preco_shopee: number
  preco_tiktok_promo: number
  preco_tiktok_normal: number
  preco_amazon: number
  tipo_frete: 'mercado_envios' | 'a_combinar'
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// Rounds up to nearest X.90 (e.g. 15.34 → 15.90, 15.91 → 16.90)
function roundTo90(value: number): number {
  return Math.ceil(value - 0.9) + 0.9
}

function calcularML(custo: number, imposto: number): number {
  let fixo = 5.5
  let preco = (custo + fixo) / (1 - 0.115 - imposto)
  if (preco < 79) {
    fixo += 6.75
    preco = (custo + fixo) / (1 - 0.115 - imposto)
  }
  return round2(preco)
}

export function detectarFrete(comprimento_cm: number): 'mercado_envios' | 'a_combinar' {
  return comprimento_cm <= 105 ? 'mercado_envios' : 'a_combinar'
}

export function calcularPrecos(
  custo: number,
  regime: 'MEI' | 'SN',
  comprimento_cm: number
): Precos {
  const imposto = regime === 'SN' ? 0.04 : 0

  const preco_ml = calcularML(custo, imposto)

  const preco_shopee =
    regime === 'MEI'
      ? roundTo90((custo + 2.5 + 3.0) / 0.86)
      : round2((custo + 2.5) / (1 - 0.14 - 0.04))

  const preco_tiktok_promo = round2((custo + 4.0) / (1 - 0.04 - 0.0299))
  const preco_tiktok_normal = round2((custo + 4.0) / (1 - 0.06 - 0.04 - 0.0299))
  const preco_amazon = round2((custo + 5.5) / (1 - 0.15 - imposto))

  return {
    preco_ml,
    preco_shopee,
    preco_tiktok_promo,
    preco_tiktok_normal,
    preco_amazon,
    tipo_frete: detectarFrete(comprimento_cm),
  }
}
