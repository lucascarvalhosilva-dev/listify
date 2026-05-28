interface MLSearchResult {
  attributes?: Array<{ id: string; value_name?: string }>
}

interface MLSearchResponse {
  results?: MLSearchResult[]
}

export async function buscarGTIN(
  nomeProduto: string,
  marca?: string,
  categoryId?: string
): Promise<string | null> {
  try {
    const q = [nomeProduto, marca].filter(Boolean).join(' ')
    const params = new URLSearchParams({ q, limit: '5' })
    if (categoryId) params.set('category', categoryId)

    const res = await fetch(
      `https://api.mercadolibre.com/sites/MLB/search?${params.toString()}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return null

    const data = await res.json() as MLSearchResponse
    for (const item of data.results ?? []) {
      for (const attr of item.attributes ?? []) {
        if (attr.id === 'GTIN' || attr.id === 'EAN') {
          const valor = attr.value_name?.trim() ?? ''
          if (/^\d{13}$/.test(valor)) return valor
        }
      }
    }
    return null
  } catch {
    return null
  }
}
