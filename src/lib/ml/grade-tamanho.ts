export interface GradeTamanho {
  grid_id: string
  grid_name: string
  values: { id: string; name: string }[]
}

export async function buscarGradeTamanho(categoryId: string, accessToken?: string): Promise<GradeTamanho | null> {
  try {
    // 1. Busca um item real da categoria para pegar o grid_id usado
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

    const searchRes = await fetch(
      `https://api.mercadolibre.com/sites/MLB/search?category=${encodeURIComponent(categoryId)}&limit=5`,
      { headers }
    )
    if (!searchRes.ok) return null

    const searchData = await searchRes.json() as {
      results?: Array<{ attributes?: Array<{ id: string; value_id?: string; value_name?: string }> }>
    }

    let gridId: string | null = null
    for (const item of searchData.results ?? []) {
      const attr = (item.attributes ?? []).find(a => a.id === 'SIZE_GRID_ID')
      if (attr?.value_id) { gridId = attr.value_id; break }
    }

    if (!gridId) return null

    // 2. Busca os valores da grade pelo grid_id
    const gradeRes = await fetch(
      `https://api.mercadolibre.com/size_specs/${encodeURIComponent(gridId)}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!gradeRes.ok) return null

    const gradeData = await gradeRes.json() as {
      id: string
      name: string
      rows?: Array<{ local_name?: string; sizes?: Array<{ id?: string; name?: string }> }>
    }

    const values: { id: string; name: string }[] = []
    for (const row of gradeData.rows ?? []) {
      for (const size of row.sizes ?? []) {
        if (size.id && size.name) values.push({ id: size.id, name: size.name })
      }
    }

    return {
      grid_id: gradeData.id,
      grid_name: gradeData.name,
      values,
    }
  } catch {
    return null
  }
}
