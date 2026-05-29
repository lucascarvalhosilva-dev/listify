import { createServiceClient } from '../supabase/service'

interface ChartRow {
  id: string
  attributes: Array<{ id: string; values: Array<{ id?: string; name: string }> }>
}

interface Chart {
  id: string
  domain_id: string
  attributes?: Array<{ id: string; values?: Array<{ id?: string; name: string }> }>
  rows?: ChartRow[]
}

// Medidas de tórax "de" (cm) por tamanho — padrão brasileiro ABNT
const TORAX_DE: Record<string, string> = {
  'PP': '80', 'P': '84', 'M': '88', 'G': '92', 'GG': '96',
  'XGG': '100', 'XXG': '100', 'EGG': '104', 'XXXG': '108',
  '1': '50', '2': '52', '3': '54', '4': '56', '6': '58',
  '8': '60', '10': '64', '12': '68', '14': '72', '16': '76',
  '0-1 M': '40', '2-3 M': '42', '3-6 M': '44', '6-9 M': '46',
  '9-12 M': '48', '12-18 M': '50', '18-24 M': '52',
  'UN': '88', 'Único': '88', 'Sob medida': '88',
}

function extrairRows(chart: Chart): { tamanho: string; row_id: string }[] {
  return (chart.rows ?? []).flatMap(row => {
    const sizeAttr = row.attributes.find(a => a.id === 'SIZE')
    const tamanho = sizeAttr?.values?.[0]?.name ?? ''
    return tamanho ? [{ tamanho, row_id: row.id }] : []
  })
}

export async function obterOuCriarGrade(params: {
  domainId: string
  genero: string
  tamanhos: string[]
  nomeProduto: string
  accessToken: string
  userId: string
}): Promise<{ grid_id: string; rows: { tamanho: string; row_id: string }[] } | null> {
  const { domainId, genero, tamanhos, nomeProduto, accessToken, userId } = params

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }

  // O endpoint /catalog/charts espera domain_id sem o prefixo do site (ex: "T_SHIRTS", não "MLB-T_SHIRTS")
  const domainIdSemPrefixo = domainId.replace(/^MLB-/, '')
  const supabase = createServiceClient()

  try {
    // 1. Busca cache no Supabase por user_id + domain_id + genero
    const { data: cached } = await supabase
      .from('ml_grades')
      .select('grid_id, rows')
      .eq('user_id', userId)
      .eq('domain_id', domainId)
      .eq('genero', genero)
      .maybeSingle()

    if (cached) {
      console.log('[GRADE] cache hit — grid_id:', cached.grid_id)
      return {
        grid_id: cached.grid_id as string,
        rows: cached.rows as { tamanho: string; row_id: string }[],
      }
    }

    // 2. Cache miss → buscar seller_id
    const meRes = await fetch('https://api.mercadolibre.com/users/me', { headers })
    if (!meRes.ok) return null
    const me = await meRes.json() as { id: number }
    const sellerId = me.id

    // 3. Busca charts existentes no ML para o seller
    const searchRes = await fetch(
      `https://api.mercadolibre.com/catalog/charts/search?seller_id=${sellerId}&site_id=MLB`,
      { headers }
    )
    if (searchRes.ok) {
      const searchData = await searchRes.json() as { results?: Chart[] }
      const existing = (searchData.results ?? []).find(chart => {
        if (chart.domain_id !== domainIdSemPrefixo && chart.domain_id !== domainId) return false
        const genderAttr = chart.attributes?.find(a => a.id === 'GENDER')
        if (!genderAttr) return true
        return genderAttr.values?.some(v => v.name?.toLowerCase() === genero.toLowerCase())
      })
      if (existing) {
        const result = { grid_id: existing.id, rows: extrairRows(existing) }
        await supabase.from('ml_grades').upsert(
          { user_id: userId, seller_id: String(sellerId), domain_id: domainId, genero, grid_id: result.grid_id, rows: result.rows },
          { onConflict: 'user_id,domain_id,genero' }
        )
        return result
      }
    }

    // 4. Cria nova grade com medidas padrão por tamanho
    const body = {
      names: { MLB: `${nomeProduto} - Guia de Tamanhos` },
      domain_id: domainIdSemPrefixo,
      site_id: 'MLB',
      type: 'STANDARD',
      seller_id: sellerId,
      attributes: [{ id: 'GENDER', values: [{ name: genero }] }],
      main_attribute: { attributes: [{ site_id: 'MLB', id: 'SIZE' }] },
      rows: tamanhos.map(t => {
        const torax = TORAX_DE[t] ?? '88'
        return {
          attributes: [
            { id: 'SIZE', values: [{ name: t }] },
            { id: 'FILTRABLE_SIZE', values: [{ name: t }] },
            { id: 'CHEST_CIRCUMFERENCE_FROM', values: [{ id: `${torax} cm`, name: `${torax} cm` }] },
          ],
        }
      }),
    }

    const createRes = await fetch('https://api.mercadolibre.com/catalog/charts', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!createRes.ok) {
      const errBody = await createRes.json() as { error?: string; errors?: Array<{ code?: string }> }
      const isNameTaken = errBody.error === 'chart_validation_error' &&
        (errBody.errors ?? []).some(e => e.code === 'chart_name_unavailable')

      if (isNameTaken) {
        // Chart já existe — tenta buscar por domain_id como fallback
        const fallbackRes = await fetch(
          `https://api.mercadolibre.com/catalog/charts/search?seller_id=${sellerId}&domain_id=${domainIdSemPrefixo}&site_id=MLB`,
          { headers }
        )
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json() as { results?: Chart[] }
          const match = (fallbackData.results ?? []).find(chart => {
            const genderAttr = chart.attributes?.find(a => a.id === 'GENDER')
            if (!genderAttr) return true
            return genderAttr.values?.some(v => v.name?.toLowerCase() === genero.toLowerCase())
          })
          if (match) {
            const result = { grid_id: match.id, rows: extrairRows(match) }
            await supabase.from('ml_grades').upsert(
              { user_id: userId, seller_id: String(sellerId), domain_id: domainId, genero, grid_id: result.grid_id, rows: result.rows },
              { onConflict: 'user_id,domain_id,genero' }
            )
            return result
          }
        }
      }

      console.error('criar grade erro:', createRes.status, JSON.stringify(errBody))
      return null
    }
    const created = await createRes.json() as Chart
    const result = { grid_id: created.id, rows: extrairRows(created) }

    // 5. Persiste no Supabase após criação bem-sucedida
    const { error: upsertErr } = await supabase.from('ml_grades').upsert(
      { user_id: userId, seller_id: String(sellerId), domain_id: domainId, genero, grid_id: result.grid_id, rows: result.rows },
      { onConflict: 'user_id,domain_id,genero' }
    )
    if (upsertErr) console.error('[GRADE] upsert erro:', upsertErr)

    return result
  } catch (err) {
    console.error('[GRADE] erro inesperado:', err)
    return null
  }
}
