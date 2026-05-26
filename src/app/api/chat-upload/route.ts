import { createClient } from '@/lib/supabase/server'
import { buscarSessaoAtiva, atualizarEtapa } from '@/lib/sessoes-geracao'

const TIPOS_VALIDOS = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'text/plain',
])
const EXTENSOES_VALIDAS = new Set(['xlsx', 'xls', 'csv'])
const TAMANHO_MAX = 10 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

    const sessao = await buscarSessaoAtiva(user.id)
    if (!sessao || !['aguardando_planilha', 'validando_planilha'].includes(sessao.etapa)) {
      return Response.json({ error: 'Nenhuma sessão aguardando planilha.' }, { status: 400 })
    }

    const formData = await request.formData()
    const arquivo = formData.get('arquivo') as File | null
    if (!arquivo) return Response.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    const conversa_id = formData.get('conversa_id') as string | null
    if (!conversa_id) return Response.json({ error: 'conversa_id obrigatório' }, { status: 400 })

    const ext = arquivo.name.split('.').pop()?.toLowerCase() ?? ''
    if (!EXTENSOES_VALIDAS.has(ext)) {
      return Response.json({ error: 'Formato inválido. Use .xlsx, .xls ou .csv.' }, { status: 400 })
    }

    if (!TIPOS_VALIDOS.has(arquivo.type) && ext !== 'csv') {
      return Response.json({ error: 'Tipo de arquivo inválido.' }, { status: 400 })
    }

    if (arquivo.size > TAMANHO_MAX) {
      return Response.json({ error: 'Arquivo muito grande. Limite: 10 MB.' }, { status: 400 })
    }

    const timestamp = Date.now()
    const nomeSeguro = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${user.id}/${sessao.id}/${timestamp}-${nomeSeguro}`

    const buffer = await arquivo.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('planilhas-chat')
      .upload(path, buffer, { contentType: arquivo.type || 'application/octet-stream' })

    if (uploadError) {
      console.error('[CHAT-UPLOAD] storage error:', uploadError)
      return Response.json({ error: 'Erro ao salvar o arquivo.' }, { status: 500 })
    }

    await atualizarEtapa(sessao.id, 'validando_planilha', {
      planilha_path: path,
      planilha_nome: arquivo.name,
      planilha_tamanho: arquivo.size,
      enviada_em: new Date().toISOString(),
    })

    // Persiste o card do arquivo no histórico do chat
    const { error: errUpload } = await supabase.from('chat_historico').insert({
      user_id: user.id,
      papel: 'user',
      conteudo: `[PLANILHA_ENVIADA: ${JSON.stringify({ nome: arquivo.name, tamanho: arquivo.size })}]`,
      conversa_id,
    })
    if (errUpload) console.error('[chat-upload] INSERT chat_historico falhou:', errUpload)

    return Response.json({
      sucesso: true,
      nome_arquivo: arquivo.name,
      tamanho_kb: Math.round(arquivo.size / 1024),
      sessao_id: sessao.id,
    })
  } catch (error) {
    console.error('[CHAT-UPLOAD] erro:', error)
    return Response.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
