export interface GradeTamanho {
  grid_id: string
  grid_name: string
  values: { id: string; name: string }[]
}

export async function buscarGradeTamanho(categoryId: string): Promise<GradeTamanho | null> {
  try {
    const res = await fetch(
      `https://api.mercadolibre.com/categories/${encodeURIComponent(categoryId)}/attributes`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return null

    const data = await res.json() as Array<{
      id: string
      name: string
      value_type: string
      values?: { id: string; name: string }[]
    }>
    if (!Array.isArray(data)) return null

    const sizeGridAttr = data.find(a => a.id === 'SIZE_GRID_ID')
    console.log('[GRADE-DEBUG] sizeGridAttr:', JSON.stringify(sizeGridAttr ?? null))
    if (!sizeGridAttr?.values?.length) return null

    const primeiroGrid = sizeGridAttr.values[0]

    const sizeAttr = data.find(a => a.id === 'SIZE')
    console.log('[GRADE-DEBUG] sizeAttr values count:', sizeAttr?.values?.length ?? 0)
    const values = (sizeAttr?.values ?? []).map(v => ({ id: v.id, name: v.name }))

    return {
      grid_id: primeiroGrid.id,
      grid_name: primeiroGrid.name,
      values,
    }
  } catch {
    return null
  }
}
