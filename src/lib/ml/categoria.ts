interface DomainDiscoveryResult {
  category_id: string
  category_name: string
}

export async function buscarCategoriaML(
  nomeProduto: string
): Promise<{ id: string; name: string } | null> {
  try {
    const url = `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(nomeProduto)}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = await res.json() as DomainDiscoveryResult[]
    if (!Array.isArray(data) || data.length === 0) return null
    const first = data[0]
    if (!first?.category_id) return null
    return { id: first.category_id, name: first.category_name ?? '' }
  } catch {
    return null
  }
}
