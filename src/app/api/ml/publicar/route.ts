import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getValidMLToken } from '@/lib/ml/token'
import { prepararFotosML } from '@/lib/ml/fotos'
import { buscarAtributosObrigatorios, normalizarAtributosML } from '@/lib/ml/atributos'

interface PublicarBody {
  titulo: string
  sku_base?: string
  catalogo_id?: string
  preco: number
  moeda: string
  quantidade: number
  condicao: 'new' | 'used'
  categoria_ml: string
  descricao: string
  fotos: string[]
  atributos?: { id: string; value_name?: string; value_id?: string }[]
  variations?: Array<{
    sku?: string
    attribute_combinations: Array<{ id: string; value_name?: string; value_id?: string }>
    available_quantity: number
    price: number
    picture_ids?: string[]
    size_grid_row_id?: string
  }>
}

function traduzirErroMercadoLivre(mlBody: Record<string, unknown>): string {
  const causas = Array.isArray(mlBody.cause) ? mlBody.cause : []
  const mensagens = causas
    .map(causa => {
      if (!causa || typeof causa !== 'object') return null
      const item = causa as Record<string, unknown>
      const code = typeof item.code === 'string' ? item.code : ''
      const message = typeof item.message === 'string' ? item.message : ''

      if (code.includes('missing.fashion_grid.grid_id') || message.includes('[SIZE_GRID_ID]')) {
        return 'A categoria exige grade de tamanhos do Mercado Livre. Ainda precisamos configurar essa etapa antes de publicar direto.'
      }
      if (message.includes('[GENDER]') || code.includes('invalid.item.attribute.values')) {
        return 'O Mercado Livre recusou um atributo com lista fechada. Revise gênero/cor/tamanho e gere o cadastro novamente.'
      }
      if (message) return message
      return null
    })
    .filter((mensagem): mensagem is string => Boolean(mensagem))

  if (mensagens.length > 0) return Array.from(new Set(mensagens)).join(' ')
  return typeof mlBody.message === 'string' ? mlBody.message : 'Erro ao publicar no Mercado Livre'
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const ml = await getValidMLToken(user.id)
  if (!ml) return Response.json({ error: 'ML não conectado' }, { status: 401 })

  const body = await request.json() as PublicarBody

  const [fotosPublicas, atributosCategoria] = await Promise.all([
    prepararFotosML(body.fotos, user.id),
    buscarAtributosObrigatorios(body.categoria_ml).catch(() => []),
  ])
  const atributosNormalizados = normalizarAtributosML(atributosCategoria, body.atributos ?? [])
  const exigeGradeTamanhos = atributosCategoria.some(attr => attr.id.toUpperCase() === 'SIZE_GRID_ID')
  const temGradeTamanhos = atributosNormalizados.some(attr => attr.id.toUpperCase() === 'SIZE_GRID_ID' && (attr.value_id || attr.value_name))

  const temVariacoes = (body.variations?.length ?? 0) > 0

  if (exigeGradeTamanhos && !temGradeTamanhos && !temVariacoes) {
    return Response.json({
      error: 'A categoria exige grade de tamanhos do Mercado Livre. Ainda precisamos configurar essa etapa antes de publicar direto.',
    }, { status: 422 })
  }

  // SIZE/COLOR vão em attribute_combinations por variação — remover de attributes
  const IDS_VARIACAO = new Set(['SIZE', 'TAMANHO', 'ALPHANUMERIC_SIZE', 'COLOR', 'COR', 'MAIN_COLOR'])
  const atributosFinais = temVariacoes
    ? atributosNormalizados.filter(a => !IDS_VARIACAO.has(a.id.toUpperCase()))
    : atributosNormalizados

  const variacoesProcessadas = temVariacoes
    ? await Promise.all(body.variations!.map(async v => {
        const combinacoes = v.attribute_combinations.filter(
          a => a.id.toUpperCase() !== 'SIZE_GRID_ROW_ID'
        )
        const pictureIdsProcessados = v.picture_ids?.length
          ? await prepararFotosML(v.picture_ids, user.id)
          : []
        return {
          attribute_combinations: combinacoes,
          ...(v.size_grid_row_id ? {
            attributes: [{ id: 'SIZE_GRID_ROW_ID', value_name: v.size_grid_row_id }]
          } : {}),
          available_quantity: v.available_quantity,
          price: v.price,
          ...(pictureIdsProcessados.length ? { picture_ids: pictureIdsProcessados } : {}),
          ...(v.sku ? { seller_custom_field: v.sku } : {}),
        }
      }))
    : []

  const payload = {
    title: body.titulo,
    price: body.preco,
    currency_id: body.moeda ?? 'BRL',
    ...(temVariacoes ? {} : { available_quantity: body.quantidade }),
    condition: body.condicao,
    category_id: body.categoria_ml,
    listing_type_id: 'gold_special',
    description: { plain_text: body.descricao },
    pictures: fotosPublicas.map(url => ({ source: url })),
    ...(atributosFinais.length ? { attributes: atributosFinais } : {}),
    ...(temVariacoes ? { variations: variacoesProcessadas } : {}),
  }

  console.log('[ML publicar] userId:', user.id, '| categoria:', body.categoria_ml, '| titulo:', body.titulo)

  const mlRes = await fetch('https://api.mercadolibre.com/items', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ml.access_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const mlBody = await mlRes.json() as Record<string, unknown>

  console.log('[ML publicar] ML response status:', mlRes.status, '| body:', JSON.stringify(mlBody))

  if (!mlRes.ok) {
    const mensagem = traduzirErroMercadoLivre(mlBody)
    return Response.json({ error: mensagem, detalhes: mlBody }, { status: 502 })
  }

  // Persiste histórico da publicação — falha silenciosa (ML já aceitou, não pode reverter)
  function normalizarCombKey(combs: unknown): string {
    if (!Array.isArray(combs)) return ''
    return JSON.stringify(
      (combs as Array<{ id?: string; value_name?: string }>)
        .map(a => ({ id: a.id ?? '', value_name: a.value_name ?? '' }))
        .sort((a, b) => a.id.localeCompare(b.id))
    )
  }

  const skuPorCombs = new Map<string, string>()
  for (const v of body.variations ?? []) {
    if (v.sku) skuPorCombs.set(normalizarCombKey(v.attribute_combinations), v.sku)
  }

  const mlVariations = Array.isArray(mlBody.variations)
    ? (mlBody.variations as Record<string, unknown>[]).map(v => {
        const skuDaResposta = typeof v.seller_custom_field === 'string' ? v.seller_custom_field : null
        const skuFallback = skuPorCombs.get(normalizarCombKey(v.attribute_combinations)) ?? null
        return {
          id: v.id,
          user_product_id: v.user_product_id,
          attribute_combinations: v.attribute_combinations,
          available_quantity: v.available_quantity,
          price: v.price,
          sku: skuDaResposta ?? skuFallback,
        }
      })
    : null

  const supabaseService = createServiceClient()
  const { error: upsertErr } = await supabaseService
    .from('ml_publicacoes')
    .upsert(
      {
        user_id: user.id,
        ml_item_id: String(mlBody.id),
        catalogo_id: body.catalogo_id ?? null,
        sku_base: body.sku_base ?? null,
        titulo: body.titulo,
        permalink: typeof mlBody.permalink === 'string' ? mlBody.permalink : null,
        status: typeof mlBody.status === 'string' ? mlBody.status : null,
        variations: mlVariations,
        ml_payload: mlBody,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,ml_item_id' }
    )

  if (upsertErr) console.error('[ML publicar] erro ao persistir:', upsertErr)

  return Response.json({
    id: mlBody.id,
    permalink: mlBody.permalink,
    status: mlBody.status,
  })
}
