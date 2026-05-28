export interface GradeTamanho {
  grid_id: string
  grid_name: string
  values: { id: string; name: string }[]
}

export async function buscarGradeTamanho(categoryId: string): Promise<GradeTamanho | null> {
  try {
    const res = await fetch(
      `https://api.mercadolibre.com/size_specs/search?category_id=${encodeURIComponent(categoryId)}&limit=10`,
      { headers: { Accept: 'application/json' } }
    )
    console.log('[GRADE-DEBUG] size_specs status:', res.status)
    const raw = await res.text()
    console.log('[GRADE-DEBUG] size_specs body:', raw.slice(0, 500))
    if (!res.ok) return null

    const data = JSON.parse(raw) as Array<{
      id: string
      name: string
      rows?: { values?: Array<{ id: string; name: string }> }[]
    }>
    if (!Array.isArray(data) || data.length === 0) return null

    const grid = data[0]
    const values: { id: string; name: string }[] = []

    for (const row of grid.rows ?? []) {
      for (const v of row.values ?? []) {
        if (v.id && v.name) values.push({ id: v.id, name: v.name })
      }
    }

    return {
      grid_id: grid.id,
      grid_name: grid.name,
      values,
    }
  } catch {
    return null
  }
}
