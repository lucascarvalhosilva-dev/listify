import { createClient } from '@/lib/supabase/server'
import { normalizarCanaisChatParaEngine } from '@/lib/normalizar-canais'

export const maxDuration = 60

const EXTENSAO: Record<string, string> = {
  shopee: 'xlsx',
  ml: 'xlsx',
  tiktok: 'csv',
  bling: 'csv',
  magalu: 'csv',
  amazon: 'csv',
}

const CONTENT_TYPE: Record<string, string> = {
  shopee: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ml: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  tiktok: 'text/csv',
  bling: 'text/csv',
  magalu: 'text/csv',
  amazon: 'text/csv',
}

interface ProdutoValido {
  sku: string
  nome: string
  custo: number
  estoque: number
  marca?: string
  categoria?: string
}

interface ProcessCatalogResponse {
  status: string
  produtos_processados: number
  alertas: string[]
  arquivos: Record<string, string | null>
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

    const { sessao_id } = await request.json()
    if (!sessao_id || typeof sessao_id !== 'string') {
      return Response.json({ error: 'sessao_id inválido' }, { status: 400 })
    }

    const { data: sessao, error: sessaoErr } = await supabase
      .from('sessoes_geracao')
      .select('*')
      .eq('id', sessao_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (sessaoErr || !sessao) {
      return Response.json({ error: 'sessão não encontrada' }, { status: 404 })
    }
    if (sessao.etapa !== 'processando') {
      return Response.json({ error: 'sessão não está em processando' }, { status: 400 })
    }

    const canaisAlvo: string[] = sessao.canais_alvo ?? []
    if (canaisAlvo.length === 0) {
      return Response.json({ error: 'canais_alvo vazio' }, { status: 400 })
    }

    const dados = (sessao.dados_planilha ?? {}) as Record<string, unknown>
    if (dados?.geracao_disparada) {
      return Response.json({ error: 'geração já foi disparada' }, { status: 409 })
    }

    const produtos = dados?.produtos as ProdutoValido[] | undefined
    if (!produtos || produtos.length === 0) {
      return Response.json({ error: 'dados_planilha.produtos inválido' }, { status: 400 })
    }

    if (!sessao.drive_url) {
      return Response.json({ error: 'drive_url não definida' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('regime_tributario')
      .eq('id', user.id)
      .maybeSingle()

    const regimeRaw = (profile?.regime_tributario as string) || 'MEI'
    const regime: 'MEI' | 'SN' =
      regimeRaw === 'Simples Nacional' || regimeRaw === 'SN' ? 'SN' : 'MEI'

    const { error: markErr } = await supabase
      .from('sessoes_geracao')
      .update({
        dados_planilha: {
          ...dados,
          geracao_disparada: true,
          disparada_em: new Date().toISOString(),
        },
      })
      .eq('id', sessao_id)
    if (markErr) console.error('[GERAR-DO-CHAT] erro ao marcar geracao_disparada:', markErr)

    const canaisEngine = normalizarCanaisChatParaEngine(canaisAlvo)
    const produtosEngine = produtos.map(p => ({
      sku: p.sku,
      nome: p.nome,
      custo: p.custo,
      estoque: p.estoque,
    }))

    const cookieHeader = request.headers.get('cookie') ?? ''
    const processUrl = new URL('/api/process-catalog', request.url).toString()
    console.log('[GERAR-DO-CHAT] chamando process-catalog, canais:', canaisEngine, 'produtos:', produtosEngine.length)

    const processResp = await fetch(processUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        produtos: produtosEngine,
        regime,
        canais: canaisEngine,
        drive_folder_url: sessao.drive_url,
      }),
    })

    if (!processResp.ok) {
      const errBody = await processResp.text()
      console.error('[GERAR-DO-CHAT] process-catalog erro:', processResp.status, errBody)
      await supabase
        .from('sessoes_geracao')
        .update({
          dados_planilha: {
            ...dados,
            geracao_disparada: true,
            geracao_erro: true,
            erro_em: new Date().toISOString(),
            erro_mensagem: `process-catalog ${processResp.status}`,
          },
        })
        .eq('id', sessao_id)
      return Response.json({ error: 'erro na geração' }, { status: 500 })
    }

    const processData = await processResp.json() as ProcessCatalogResponse
    console.log('[GERAR-DO-CHAT] process-catalog ok, produtos_processados:', processData.produtos_processados)

    const ts = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const arquivosGerados: Array<{ canal: string; path: string; tamanho_bytes: number }> = []

    for (const [canal, b64] of Object.entries(processData.arquivos)) {
      if (!b64) continue
      const ext = EXTENSAO[canal] ?? 'csv'
      const contentType = CONTENT_TYPE[canal] ?? 'text/csv'
      const filePath = `${user.id}/${sessao_id}/${canal}-${ts}.${ext}`
      const buffer = Buffer.from(b64, 'base64')

      const { error: uploadErr } = await supabase.storage
        .from('geracoes')
        .upload(filePath, buffer, { contentType, upsert: true })

      if (uploadErr) {
        console.error('[GERAR-DO-CHAT] erro ao fazer upload:', canal, uploadErr)
      } else {
        arquivosGerados.push({ canal, path: filePath, tamanho_bytes: buffer.byteLength })
        console.log('[GERAR-DO-CHAT] arquivo salvo:', filePath, `(${buffer.byteLength} bytes)`)
      }
    }

    const { error: updateErr } = await supabase
      .from('sessoes_geracao')
      .update({
        dados_planilha: {
          ...dados,
          geracao_disparada: true,
          geracao_concluida: true,
          concluida_em: new Date().toISOString(),
          arquivos_gerados: arquivosGerados,
          alertas: processData.alertas ?? [],
          canais_processados: processData.produtos_processados,
        },
      })
      .eq('id', sessao_id)
    if (updateErr) console.error('[GERAR-DO-CHAT] erro ao salvar resultado:', updateErr)

    return Response.json({
      sucesso: true,
      canais_processados: processData.produtos_processados,
      arquivos_count: arquivosGerados.length,
      alertas: processData.alertas ?? [],
    })
  } catch (error) {
    console.error('[GERAR-DO-CHAT] erro:', error)
    return Response.json({ error: 'erro interno' }, { status: 500 })
  }
}
