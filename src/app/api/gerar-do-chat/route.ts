import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { normalizarCanalParaEngine, normalizarCanaisChatParaEngine } from '@/lib/normalizar-canais'

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

const CANAL_LABELS: Record<string, string> = {
  shopee: 'Shopee',
  ml: 'Mercado Livre',
  tiktok: 'TikTok Shop',
  bling: 'Bling',
  magalu: 'Magalu',
  amazon: 'Amazon',
}

interface ProdutoValido {
  sku: string
  nome: string
  custo: number
  estoque: number
  marca?: string
  categoria?: string
}

interface ArquivoGerado {
  canal: string
  path: string
  tamanho_bytes: number
  catalogo_id?: string
}

interface ProcessCatalogResponse {
  status: string
  produtos_processados: number
  alertas: string[]
  arquivos: Record<string, string | null>
}

function formatarDataLabel(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
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

    // ── Upload de arquivos para bucket 'geracoes' ─────────────────────────────
    const ts = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const arquivosGerados: ArquivoGerado[] = []

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

    // ── Salvar catálogos e avançar etapa ─────────────────────────────────────
    const alertasCatalogos: string[] = []
    const catalogosIds: string[] = []
    const agora = new Date()
    const dataLabel = formatarDataLabel(agora)

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      console.error('[CATALOGOS] SUPABASE_SERVICE_ROLE_KEY não definida — inserts vão falhar')
    }

    console.log('[CATALOGOS] iniciando insert de', arquivosGerados.length, 'catalogos')

    if (arquivosGerados.length > 0) {
      const supabaseService = createServiceClient()

      for (const arquivo of arquivosGerados) {
        const nomeCanal = CANAL_LABELS[arquivo.canal] ?? arquivo.canal
        console.log('[CATALOGOS] inserindo canal:', arquivo.canal, '| arquivo_path:', arquivo.path)

        const { data: cat, error: catErr } = await supabaseService
          .from('catalogos')
          .insert({
            user_id: user.id,
            nome: `Cadastro ${nomeCanal} - ${dataLabel}`,
            produtos: produtos,
            drive_url: sessao.drive_url,
            regime_tributario: regimeRaw,
            canal: arquivo.canal,
            arquivo_path: arquivo.path,
          })
          .select('id')
          .single()

        if (catErr || !cat) {
          console.error('[CATALOGOS] falha no insert canal=' + arquivo.canal + ':', JSON.stringify(catErr))
          alertasCatalogos.push(
            `Catálogo para ${nomeCanal} não foi salvo automaticamente. Os arquivos estão disponíveis para download.`
          )
        } else {
          const catId = (cat as { id: string }).id
          arquivo.catalogo_id = catId
          catalogosIds.push(catId)
          console.log('[CATALOGOS] insert ok: canal=' + arquivo.canal + ' id=' + catId)
        }
      }
    }

    const alertasFinal = [...(processData.alertas ?? []), ...alertasCatalogos]

    console.log('[ETAPA] atualizando pra concluida | catalogos salvos:', catalogosIds.length)
    const { error: updateErr } = await supabase
      .from('sessoes_geracao')
      .update({
        etapa: 'concluida',
        dados_planilha: {
          ...dados,
          geracao_disparada: true,
          geracao_concluida: true,
          concluida_em: agora.toISOString(),
          arquivos_gerados: arquivosGerados,
          alertas: alertasFinal,
          canais_processados: processData.produtos_processados,
          catalogos_ids: catalogosIds,
        },
      })
      .eq('id', sessao_id)
    if (updateErr) {
      console.error('[ETAPA] falha:', JSON.stringify(updateErr))
    } else {
      console.log('[ETAPA] update ok — sessao', sessao_id, 'agora concluida')
    }

    const arquivosBaixaveis = arquivosGerados.map(a => ({
      canal: a.canal,
      nome_canal_label: CANAL_LABELS[a.canal] ?? a.canal,
      path: a.path,
      tamanho_bytes: a.tamanho_bytes,
      catalogo_id: a.catalogo_id ?? null,
    }))

    // ── Inserir mensagem de sucesso no histórico do chat ──────────────────────
    if (arquivosGerados.length > 0) {
      const n = arquivosGerados.length
      const conteudoSucesso = [
        `🎉 **Pronto!** Seus arquivos foram gerados com sucesso!`,
        ``,
        `Você tem **${n} arquivo${n > 1 ? 's' : ''}** pronto${n > 1 ? 's' : ''} para baixar abaixo. Eles também foram salvos automaticamente em **Meus Catálogos** para você acessar sempre que precisar.`,
        ``,
        `👇 Baixe os arquivos e, se precisar de ajuda pra subir em algum marketplace, é só clicar nos botões abaixo!`,
      ].join('\n')

      const botoesSucesso = [
        ...arquivosGerados.map(a => ({
          acao: 'card_download_arquivo',
          path: a.path,
          canal: a.canal,
          nome_canal_label: CANAL_LABELS[a.canal] ?? a.canal,
          tamanho_bytes: a.tamanho_bytes,
        })),
        ...canaisAlvo.map(canalChat => {
          const nomeLabel = CANAL_LABELS[normalizarCanalParaEngine(canalChat)] ?? canalChat
          return {
            acao: 'botao_ajuda_upload',
            canal: canalChat,
            nome_canal_label: nomeLabel,
            texto: `📚 Como subir no ${nomeLabel}?`,
          }
        }),
        { acao: 'mensagem', texto: 'Cadastrar mais produtos', valor: 'quero cadastrar mais produtos' },
        { acao: 'mensagem', texto: 'Tirar uma dúvida', valor: 'Tenho uma dúvida' },
      ]

      const supabaseService = createServiceClient()
      const { error: histErr } = await supabaseService.from('chat_historico').insert({
        user_id: user.id,
        papel: 'assistant',
        conteudo: conteudoSucesso,
        acoes_rapidas: { botoes: botoesSucesso },
      })
      if (histErr) console.error('[GERAR-DO-CHAT] erro ao inserir mensagem de sucesso:', histErr)
      else console.log('[GERAR-DO-CHAT] mensagem de sucesso inserida no histórico')
    }

    return Response.json({
      sucesso: true,
      canais_processados: processData.produtos_processados,
      arquivos_count: arquivosGerados.length,
      alertas: alertasFinal,
      arquivos_baixaveis: arquivosBaixaveis,
      mensagem_sucesso_inserida: arquivosGerados.length > 0,
    })
  } catch (error) {
    console.error('[GERAR-DO-CHAT] erro:', error)
    return Response.json({ error: 'erro interno' }, { status: 500 })
  }
}
