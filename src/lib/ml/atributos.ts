export interface AtributoML {
  id: string
  name: string
  value_type: string
  values?: { id: string; name: string }[]
}

export interface MapearAtributosResult {
  mapeados: { id: string; value_name: string }[]
  pendentes: AtributoML[]
}

const CORES_PT = [
  'preto', 'branco', 'azul', 'vermelho', 'verde', 'amarelo', 'laranja',
  'roxo', 'rosa', 'cinza', 'marrom', 'bege', 'dourado', 'prata',
]

const TAMANHO_RE = /\b(pp|p|m|g{1,3}|xg|xxg|xs|s|xl|xxl|\d{2,3})\b/i

export async function buscarAtributosObrigatorios(categoryId: string): Promise<AtributoML[]> {
  try {
    const res = await fetch(
      `https://api.mercadolibre.com/categories/${encodeURIComponent(categoryId)}/attributes`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return []
    const data = await res.json() as Array<{
      id: string
      name: string
      value_type: string
      tags?: Record<string, unknown>
      values?: { id: string; name: string }[]
    }>
    if (!Array.isArray(data)) return []
    return data
      .filter(attr => attr.tags?.required === true)
      .map(attr => ({
        id: attr.id,
        name: attr.name,
        value_type: attr.value_type,
        ...(attr.values?.length ? { values: attr.values.slice(0, 20) } : {}),
      }))
  } catch {
    return []
  }
}

export function mapearAtributos(
  atributos: AtributoML[],
  produto: { marca?: string; nome?: string }
): MapearAtributosResult {
  const mapeados: { id: string; value_name: string }[] = []
  const pendentes: AtributoML[] = []
  const nomeMin = (produto.nome ?? '').toLowerCase()

  for (const attr of atributos) {
    const id = attr.id.toUpperCase()

    if (id === 'BRAND' || id === 'MARCA') {
      if (produto.marca) {
        mapeados.push({ id: attr.id, value_name: produto.marca })
        continue
      }
    } else if (id === 'COLOR' || id === 'COR') {
      const cor = CORES_PT.find(c => nomeMin.includes(c))
      if (cor) {
        mapeados.push({ id: attr.id, value_name: cor })
        continue
      }
    } else if (id === 'SIZE' || id === 'TAMANHO') {
      const match = nomeMin.match(TAMANHO_RE)
      if (match) {
        mapeados.push({ id: attr.id, value_name: match[0].toUpperCase() })
        continue
      }
    }

    pendentes.push(attr)
  }

  return { mapeados, pendentes }
}
