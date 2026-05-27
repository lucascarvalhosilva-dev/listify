import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const FORMATOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const formData = await request.formData()
  const files = formData.getAll('files') as File[]
  const skusRaw = formData.get('skus')
  if (!files.length || !skusRaw) {
    return Response.json({ error: 'arquivos e skus são obrigatórios' }, { status: 400 })
  }

  let skus: string[]
  try {
    skus = JSON.parse(String(skusRaw)) as string[]
  } catch {
    return Response.json({ error: 'skus deve ser um JSON array' }, { status: 400 })
  }

  if (files.length !== skus.length) {
    return Response.json({ error: 'número de arquivos e skus não coincide' }, { status: 400 })
  }

  const storage = createServiceClient()
  const ts = Date.now()
  const resultado: Record<string, string[]> = {}

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const sku = skus[i]

    if (!FORMATOS_ACEITOS.includes(file.type)) continue
    if (file.size > MAX_BYTES) continue

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const idx = (resultado[sku]?.length ?? 0)
    const path = `${user.id}/${ts}/${sku}_${idx}.${ext}`

    const buffer = await file.arrayBuffer()
    const { error } = await storage.storage
      .from('ml-fotos')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (error) {
      console.error('[ML upload-fotos] erro upload:', sku, error.message)
      continue
    }

    const { data } = storage.storage.from('ml-fotos').getPublicUrl(path)
    if (data?.publicUrl) {
      if (!resultado[sku]) resultado[sku] = []
      resultado[sku].push(data.publicUrl)
    }
  }

  return Response.json({ fotos: resultado })
}
