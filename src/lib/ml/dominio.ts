interface DomainDiscoveryResult {
  domain_id: string
  domain_name: string
  category_id: string
}

export async function buscarDominioML(
  nomeProduto: string
): Promise<{ domain_id: string; domain_name: string; category_id: string } | null> {
  try {
    const url = `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(nomeProduto)}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = await res.json() as DomainDiscoveryResult[]
    if (!Array.isArray(data) || data.length === 0) return null
    const first = data[0]
    if (!first?.domain_id) return null
    return { domain_id: first.domain_id, domain_name: first.domain_name ?? '', category_id: first.category_id ?? '' }
  } catch {
    return null
  }
}
