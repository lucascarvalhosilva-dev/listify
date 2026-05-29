export interface GradeTamanho {
  grid_id: string
  grid_name: string
  values: { id: string; name: string }[]
}

export async function buscarGradeTamanho(categoryId: string, accessToken: string): Promise<GradeTamanho | null> {
  try {
    // 1. Busca um item real da categoria para pegar o grid_id usado
    const searchRes = await fetch(
      `https://api.mercadolibre.com/sites/MLB/search?category=${encodeURIComponent(categoryId)}&limit=5`,
      { headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` } }
    )
    console.log('[GRADE-DEBUG] search status:', searchRes.status)
    if (!searchRes.ok) return null

    const searchData = await searchRes.json() as {
      results?: Array<{ attributes?: Array<{ id: string; value_id?: string; value_name?: string }> }>
    }

    let gridId: string | null = null
    for (const item of searchData.results ?? []) {
      const attr = (item.attributes ?? []).find(a => a.id === 'SIZE_GRID_ID')
      if (attr?.value_id) { gridId = attr.value_id; break }
    }

    console.log('[GRADE-DEBUG] gridId encontrado:', gridId)
    if (!gridId) return null

    // 2. Busca os valores da grade pelo grid_id
    const gradeRes = await fetch(
      `https://api.mercadolibre.com/size_specs/${encodeURIComponent(gridId)}`,
      { headers: { Accept: 'application/json' } }
    )
    console.log('[GRADE-DEBUG] grade status:', gradeRes.status)
    if (!gradeRes.ok) return null

    const gradeData = await gradeRes.json() as {
      id: string
      name: string
      rows?: Array<{ local_name?: string; sizes?: Array<{ id?: string; name?: string }> }>
    }

    console.log('[GRADE-DEBUG] grade body:', JSON.stringify(gradeData).slice(0, 300))

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
  } catch (err) {
    console.log('[GRADE-DEBUG] erro:', String(err))
    return null
  }
}
