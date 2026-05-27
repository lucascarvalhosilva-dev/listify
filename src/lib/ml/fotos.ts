import { createServiceClient } from '@/lib/supabase/service'

function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com\/(file\/d\/|uc\?)/i.test(url)
}

function extractDriveFileId(url: string): string | null {
  // https://drive.google.com/file/d/{ID}/view ou /file/d/{ID}
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch) return fileMatch[1]

  // https://drive.google.com/uc?export=view&id={ID} ou ?id={ID}
  const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (ucMatch) return ucMatch[1]

  return null
}

async function downloadDriveFile(fileId: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      `https://drive.google.com/uc?export=download&id=${fileId}`,
      { redirect: 'follow' }
    )
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

export async function prepararFotosML(fotos: string[], userId: string): Promise<string[]> {
  const supabase = createServiceClient()
  const ts = Date.now()
  const resultado: string[] = []

  for (let i = 0; i < fotos.length; i++) {
    const url = fotos[i]

    if (!isGoogleDriveUrl(url)) {
      resultado.push(url)
      continue
    }

    const fileId = extractDriveFileId(url)
    if (!fileId) continue

    const buffer = await downloadDriveFile(fileId)
    if (!buffer) continue

    const path = `${userId}/${ts}_${i}.jpg`
    const { error } = await supabase.storage
      .from('ml-fotos')
      .upload(path, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) continue

    const { data } = supabase.storage.from('ml-fotos').getPublicUrl(path)
    if (data?.publicUrl) resultado.push(data.publicUrl)
  }

  return resultado
}
