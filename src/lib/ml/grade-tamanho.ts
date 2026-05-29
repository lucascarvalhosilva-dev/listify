export interface GradeTamanhoSpec {
  main_attribute_id: string
  sizes: { id: string; name: string }[]
  gender_values: { id: string; name: string }[]
}

interface TechSpecAttribute {
  id: string
  name: string
  tags?: Record<string, unknown>
  values?: Array<{ id: string; name: string }>
}

interface TechSpecResponse {
  input?: {
    groups?: Array<{
      components?: Array<{
        attributes?: TechSpecAttribute[]
      }>
    }>
  }
}

export async function buscarSpecGrade(domainId: string, accessToken: string): Promise<GradeTamanhoSpec | null> {
  try {
    const url = `https://api.mercadolibre.com/domains/${encodeURIComponent(domainId)}/technical_specs`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!res.ok) return null
    const data = await res.json() as TechSpecResponse

    const allAttributes: TechSpecAttribute[] = []
    for (const group of data.input?.groups ?? []) {
      for (const component of group.components ?? []) {
        for (const attr of component.attributes ?? []) {
          allAttributes.push(attr)
        }
      }
    }

    const sizeAttr = allAttributes.find(a => a.id === 'SIZE' || a.id === 'ALPHANUMERIC_SIZE')
    if (!sizeAttr) return null

    const genderAttr = allAttributes.find(a => a.id === 'GENDER')

    return {
      main_attribute_id: sizeAttr.id,
      sizes: (sizeAttr.values ?? []).map(v => ({ id: v.id, name: v.name })),
      gender_values: (genderAttr?.values ?? []).map(v => ({ id: v.id, name: v.name })),
    }
  } catch {
    return null
  }
}
