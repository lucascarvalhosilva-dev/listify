export interface AtributoML {
  id: string
  name: string
  value_type: string
  values?: { id: string; name: string }[]
}

export interface AtributoMLMapeado {
  id: string
  value_name?: string
  value_id?: string
}

export interface MapearAtributosResult {
  mapeados: AtributoMLMapeado[]
  pendentes: AtributoML[]
}

const CORES_PT = [
  'preto', 'preta', 'branco', 'branca', 'azul', 'azuis',
  'vermelho', 'vermelha', 'verde', 'amarelo', 'amarela',
  'laranja', 'roxo', 'roxa', 'rosa', 'cinza', 'marrom',
  'bege', 'dourado', 'dourada', 'prata', 'off-white', 'offwhite',
  'creme', 'nude', 'vinho', 'bordo', 'bordô', 'lilás', 'lilas',
]

const TAMANHO_RE = /\b(pp|p|m|g{1,3}|xg|xxg|xs|s|xl|xxl|\d{2,3})\b/i

const GENERO_MAP: [string[], string][] = [
  [['masculino', 'masc', 'homem', 'masculina'], 'Masculino'],
  [['feminino', 'fem', 'mulher', 'feminina'], 'Feminino'],
  [['unissex', 'unisex'], 'Unissex'],
  [['infantil', 'kids', 'crianca', 'criança', 'bebe', 'bebê'], 'Infantil'],
]

const TIPO_ROUPA_MAP: [string[], string][] = [
  [['camiseta', 'camisetas', 't-shirt', 'tshirt'], 'Camiseta'],
  [['moletom', 'moletoms', 'sweatshirt'], 'Moletom'],
  [['shorts', 'short', 'bermuda', 'bermudas'], 'Shorts'],
  [['calça', 'calca', 'calcas', 'jeans', 'legging', 'leggings'], 'Calça'],
  [['vestido', 'vestidos'], 'Vestido'],
  [['saia', 'saias'], 'Saia'],
  [['jaqueta', 'jaquetas', 'jacket'], 'Jaqueta'],
  [['casaco', 'casacos', 'sobretudo'], 'Casaco'],
  [['camisa polo', 'polo shirt'], 'Camisa Polo'],
  [['camisa', 'camisas'], 'Camisa'],
]

const MANGA_MAP: [string[], string][] = [
  [['manga longa', 'manga comprida'], 'Manga longa'],
  [['manga curta', 'manga curto'], 'Manga curta'],
  [['sem manga', 'regata', 'sleeveless'], 'Sem manga'],
]

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function expandirCandidatosGenero(valor: string): string[] {
  const n = normalizar(valor)
  if (['masculino', 'masculina', 'masc', 'homem', 'homens'].some(v => n.includes(v))) {
    return ['Masculino', 'Homem', 'Homens', 'Masculina']
  }
  if (['feminino', 'feminina', 'fem', 'mulher', 'mulheres'].some(v => n.includes(v))) {
    return ['Feminino', 'Mulher', 'Mulheres', 'Feminina']
  }
  if (['unissex', 'unisex', 'sem genero', 'sem gênero'].some(v => n.includes(v))) {
    return ['Unissex', 'Sem genero', 'Sem gênero']
  }
  if (['infantil', 'crianca', 'criança', 'kids', 'menino', 'menina'].some(v => n.includes(v))) {
    return ['Infantil', 'Meninos', 'Meninas', 'Crianças']
  }
  return [valor]
}

function expandirCandidatosCor(valor: string): string[] {
  const n = normalizar(valor)
  const pares: [string[], string][] = [
    [['preto', 'preta'], 'Preto'],
    [['branco', 'branca'], 'Branco'],
    [['vermelho', 'vermelha'], 'Vermelho'],
    [['amarelo', 'amarela'], 'Amarelo'],
    [['roxo', 'roxa'], 'Roxo'],
    [['cinza'], 'Cinza'],
    [['azul'], 'Azul'],
    [['verde'], 'Verde'],
    [['rosa'], 'Rosa'],
    [['marrom'], 'Marrom'],
    [['bege'], 'Bege'],
  ]
  const par = pares.find(([palavras]) => palavras.some(p => n.includes(p)))
  return par ? [par[1], valor] : [valor]
}

function candidatosParaAtributo(id: string, valor: string): string[] {
  if (id === 'GENDER' || id === 'GENERO' || id === 'GÊNERO') return expandirCandidatosGenero(valor)
  if (id === 'COLOR' || id === 'COR' || id === 'MAIN_COLOR') return expandirCandidatosCor(valor)
  return [valor]
}

function exigeValorFechado(id: string, valueType: string): boolean {
  const idNormalizado = id.toUpperCase()
  if (idNormalizado === 'BRAND' || idNormalizado === 'MARCA') return false
  if (idNormalizado === 'MODEL' || idNormalizado === 'MODELO') return false
  if (idNormalizado === 'UNITS_PER_PACK') return false
  if (idNormalizado === 'GTIN') return false
  return valueType === 'list' || valueType === 'boolean'
}

function mapearValorFechado(attr: AtributoML, valor: string): AtributoMLMapeado | null {
  if (!attr.values?.length) return { id: attr.id, value_name: valor }
  if (!exigeValorFechado(attr.id, attr.value_type)) return { id: attr.id, value_name: valor }

  const id = attr.id.toUpperCase()
  const candidatos = candidatosParaAtributo(id, valor).map(normalizar)
  const match = attr.values.find(value => candidatos.includes(normalizar(value.name)))
  if (!match) return null

  return { id: attr.id, value_id: match.id, value_name: match.name }
}

function atributoDeveEntrar(attr: { id: string; tags?: Record<string, unknown> }): boolean {
  const id = attr.id.toUpperCase()
  const tags = attr.tags ?? {}
  return tags.required === true ||
    tags.catalog_required === true ||
    tags.conditional_required === true ||
    id === 'SIZE_GRID_ID'
}

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
      .filter(atributoDeveEntrar)
      .map(attr => ({
        id: attr.id,
        name: attr.name,
        value_type: attr.value_type,
        ...(attr.values?.length ? { values: attr.values.slice(0, 80) } : {}),
      }))
  } catch {
    return []
  }
}

export function mapearAtributos(
  atributos: AtributoML[],
  produto: { marca?: string; nome?: string; cor?: string; genero?: string; tipo_roupa?: string; tipo_manga?: string }
): MapearAtributosResult {
  const mapeados: AtributoMLMapeado[] = []
  const pendentes: AtributoML[] = []
  const nomeMin = (produto.nome ?? '').toLowerCase()

  for (const attr of atributos) {
    const id = attr.id.toUpperCase()
    let valorMapeado: string | null = null

    if (id === 'BRAND' || id === 'MARCA') {
      if (produto.marca) valorMapeado = produto.marca
    } else if (id === 'MODEL' || id === 'MODELO') {
      if (produto.nome) valorMapeado = produto.nome
    } else if (id === 'UNITS_PER_PACK') {
      valorMapeado = '1'
    } else if (id === 'COLOR' || id === 'COR' || id === 'MAIN_COLOR') {
      if (produto.cor) {
        valorMapeado = produto.cor
      } else {
        const cor = CORES_PT.find(c => nomeMin.includes(c))
        if (cor) valorMapeado = cor
      }
    } else if (id === 'SIZE' || id === 'TAMANHO') {
      const match = nomeMin.match(TAMANHO_RE)
      if (match) valorMapeado = match[0].toUpperCase()
    } else if (id === 'GENDER' || id === 'GENERO' || id === 'GÊNERO') {
      if (produto.genero) {
        valorMapeado = produto.genero
      } else {
        for (const [palavras, valor] of GENERO_MAP) {
          if (palavras.some(p => nomeMin.includes(p))) { valorMapeado = valor; break }
        }
      }
    } else if (id === 'GARMENT_TYPE' || id === 'TIPO_ROUPA') {
      if (produto.tipo_roupa) {
        valorMapeado = produto.tipo_roupa
      } else {
        for (const [palavras, valor] of TIPO_ROUPA_MAP) {
          if (palavras.some(p => nomeMin.includes(p))) { valorMapeado = valor; break }
        }
      }
    } else if (id === 'SLEEVE_TYPE' || id === 'TIPO_MANGA') {
      if (produto.tipo_manga) {
        valorMapeado = produto.tipo_manga
      } else {
        for (const [palavras, valor] of MANGA_MAP) {
          if (palavras.some(p => nomeMin.includes(p))) { valorMapeado = valor; break }
        }
      }
    }

    if (valorMapeado) {
      const atributoMapeado = mapearValorFechado(attr, valorMapeado)
      if (atributoMapeado) {
        mapeados.push(atributoMapeado)
      } else {
        pendentes.push(attr)
      }
    } else {
      pendentes.push(attr)
    }
  }

  console.log(
    `[atributos ML] produto="${produto.nome ?? ''}" | mapeados: [${mapeados.map(m => m.id).join(', ')}] | pendentes: [${pendentes.map(p => p.id).join(', ')}]`
  )

  return { mapeados, pendentes }
}

export function normalizarAtributosML(
  atributosCategoria: AtributoML[],
  atributosRecebidos: AtributoMLMapeado[]
): AtributoMLMapeado[] {
  const atributosPorId = new Map(atributosCategoria.map(attr => [attr.id.toUpperCase(), attr]))

  return atributosRecebidos.map(attr => {
    if (attr.value_id || !attr.value_name) return attr
    const atributoCategoria = atributosPorId.get(attr.id.toUpperCase())
    if (!atributoCategoria) return attr
    return mapearValorFechado(atributoCategoria, attr.value_name) ?? attr
  })
}
