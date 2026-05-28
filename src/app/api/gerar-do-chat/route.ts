import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { normalizarCanalParaEngine, normalizarCanaisChatParaEngine } from '@/lib/normalizar-canais'
import { criarCardPriceGuard, type ProdutoRevisaoPriceGuard } from '@/lib/price-guard'
import { consolidarValidadoresUpload, validarPreUploadCatalogo } from '@/lib/validador-pre-upload'
import { criarComparadorListing } from '@/lib/comparador-listing'
import { criarCardPublicacaoML } from '@/lib/ml/publicacao-card'
import { buscarCategoriaML } from '@/lib/ml/categoria'
import { buscarAtributosObrigatorios, mapearAtributos, type AtributoML } from '@/lib/ml/atributos'
import { buscarGTIN } from '@/lib/ml/gtin'
import { buscarGradeTamanho } from '@/lib/ml/grade-tamanho'

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
  tiktok_shop: 'TikTok Shop',
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
  cor?: string
  genero?: string
  tipo_roupa?: string
  tipo_manga?: string
  tamanho?: string
}

interface ArquivoGerado {
  canal: string
  path: string
  tamanho_bytes: number
  catalogo_id?: string
}

interface CardStatusConfianca {
  acao: 'card_status_confianca'
  status: 'pronto' | 'atencao'
  titulo: string
  resumo: string
  total_produtos: number
  produtos_processados: number
  arquivos_gerados: number
  canais_solicitados: number
  alertas_count: number
  campos_obrigatorios_ok: boolean
  precos_calculados: boolean
  drive_validado: boolean
  alertas_preview: string[]
}

interface ProcessCatalogResponse {
  status: string
  produtos_processados: number
  alertas: string[]
  arquivos: Record<string, string | null>
  produtos_revisao?: ProdutoRevisaoPriceGuard[]
}

function formatarDataLabel(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function criarCardStatusConfianca(params: {
  totalProdutos: number
  produtosProcessados: number
  arquivosGerados: number
  canaisSolicitados: number
  alertas: string[]
  driveValidado: boolean
  camposObrigatoriosOk: boolean
  precosCalculados: boolean
}): CardStatusConfianca {
  const tudoProcessado = params.produtosProcessados === params.totalProdutos && params.totalProdutos > 0
  const todosArquivos = params.arquivosGerados === params.canaisSolicitados && params.canaisSolicitados > 0
  const semAlertas = params.alertas.length === 0
  const pronto = tudoProcessado && todosArquivos && params.driveValidado && params.camposObrigatoriosOk && params.precosCalculados && semAlertas

  return {
    acao: 'card_status_confianca',
    status: pronto ? 'pronto' : 'atencao',
    titulo: pronto ? 'Conferência rápida: pronto para publicar' : 'Conferência rápida: revise antes de publicar',
    resumo: pronto
      ? 'Campos obrigatórios, fotos e cadastros passaram na conferência automática.'
      : 'Os cadastros foram preparados, mas há pontos importantes para revisar antes de publicar.',
    total_produtos: params.totalProdutos,
    produtos_processados: params.produtosProcessados,
    arquivos_gerados: params.arquivosGerados,
    canais_solicitados: params.canaisSolicitados,
    alertas_count: params.alertas.length,
    campos_obrigatorios_ok: params.camposObrigatoriosOk,
    precos_calculados: params.precosCalculados,
    drive_validado: params.driveValidado,
    alertas_preview: params.alertas.slice(0, 3),
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

    const { sessao_id, conversa_id, fotos_upload } = await request.json()
    const fotosUpload = (fotos_upload ?? {}) as Record<string, string[]>
    if (!sessao_id || typeof sessao_id !== 'string') {
      return Response.json({ error: 'sessao_id inválido' }, { status: 400 })
    }
    if (!conversa_id || typeof conversa_id !== 'string') {
      return Response.json({ error: 'conversa_id obrigatório' }, { status: 400 })
    }

    const { data: conversa } = await supabase
      .from('conversas')
      .select('id')
      .eq('id', conversa_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!conversa) return Response.json({ error: 'conversa não encontrada' }, { status: 403 })

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
        conversa_id,
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
      marca: p.marca,
      categoria: p.categoria,
      custo: p.custo,
      estoque: p.estoque,
      cor: p.cor,
      genero: p.genero,
      tipo_roupa: p.tipo_roupa,
      tipo_manga: p.tipo_manga,
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

    const temML = canaisEngine.map(normalizarCanalParaEngine).includes('ml')
    const produtosRevisaoBase = processData.produtos_revisao ?? []
    const produtosPorSku = new Map(produtos.map(p => [p.sku, p]))
    let produtosRevisao: ProdutoRevisaoPriceGuard[] = produtosRevisaoBase
    if (temML) {
      const comCategorias = await Promise.all(
        produtosRevisaoBase.map(async (p) => {
          const cat = await buscarCategoriaML(p.nome).catch(() => null)
          return cat ? { ...p, categoria_ml: cat.id } : p
        })
      )
      const categoriasUnicas = [...new Set(
        comCategorias.map(p => p.categoria_ml).filter((c): c is string => Boolean(c))
      )]
      const atributosPorCategoria = new Map<string, AtributoML[]>()
      await Promise.all(
        categoriasUnicas.map(async (catId) => {
          const attrs = await buscarAtributosObrigatorios(catId).catch(() => [] as AtributoML[])
          atributosPorCategoria.set(catId, attrs)
        })
      )
      const TAMANHO_RE_LOCAL = /\b(pp|p|m|g{1,3}|xg|xxg|xs|s|xl|xxl|\d{2,3})\b/i
      const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

      produtosRevisao = await Promise.all(comCategorias.map(async p => {
        const catId = p.categoria_ml
        if (!catId) return p
        const atributos = atributosPorCategoria.get(catId) ?? []
        if (atributos.length === 0) return p
        const original = produtosPorSku.get(p.sku)
        const marca = p.marca ?? original?.marca
        const { mapeados, pendentes } = mapearAtributos(atributos, {
          ...p,
          marca,
          cor: original?.cor,
          genero: original?.genero,
          tipo_roupa: original?.tipo_roupa,
          tipo_manga: original?.tipo_manga,
          tamanho: original?.tamanho,
        })

        const mapeadosFinal = [...mapeados]
        const pendentesFinal = [...pendentes]

        // ── GTIN: busca automática → fallback "sem GTIN" ──────────────────────
        const gtinIdx = pendentesFinal.findIndex(a => a.id.toUpperCase() === 'GTIN')
        if (gtinIdx !== -1) {
          const gtinAttr = pendentesFinal[gtinIdx]
          console.log('[GTIN] buscando para:', p.nome, marca)
          const gtin = await buscarGTIN(p.nome, marca, catId).catch(() => null)
          console.log('[GTIN] resultado:', gtin)
          const gtinFinal = gtin ?? 'Este produto não tem GTIN'
          console.log('[GTIN] resolvido como:', gtin ? gtinFinal : 'sem GTIN - usando EMPTY_GTIN_REASON')
          pendentesFinal.splice(gtinIdx, 1)
          mapeadosFinal.push({ id: gtinAttr.id, value_name: gtinFinal })
        }

        // ── SIZE_GRID_ID: resolver grade e tamanho ────────────────────────────
        const sizeGridIdx = pendentesFinal.findIndex(a => a.id.toUpperCase() === 'SIZE_GRID_ID')
        if (sizeGridIdx !== -1) {
          const sizeGridAttr = pendentesFinal[sizeGridIdx]
          const tamanho = original?.tamanho
            ?? mapeadosFinal.find(m => ['SIZE', 'TAMANHO', 'ALPHANUMERIC_SIZE'].includes(m.id.toUpperCase()))?.value_name
            ?? (() => { const m = (p.nome ?? '').toLowerCase().match(TAMANHO_RE_LOCAL); return m ? m[0].toUpperCase() : null })()

          console.log('[SIZE] tamanho do produto:', tamanho)
          if (!tamanho) {
            pendentesFinal[sizeGridIdx] = { ...sizeGridAttr, name: 'Adicione coluna Tamanho na planilha' }
          } else {
            console.log('[SIZE] buscando grade para categoria:', catId)
            const grade = await buscarGradeTamanho(catId).catch(() => null)
            console.log('[SIZE] grade encontrada:', grade ? `grid_id=${grade.grid_id} values=${grade.values.length}` : 'null')
            if (grade?.values.length) {
              const match = grade.values.find(v => norm(v.name) === norm(tamanho) || norm(v.id) === norm(tamanho))
              console.log('[SIZE] match resultado:', match ? `${match.id}/${match.name}` : 'sem match')
              if (match) {
                pendentesFinal.splice(sizeGridIdx, 1)
                mapeadosFinal.push({ id: sizeGridAttr.id, value_id: grade.grid_id, value_name: grade.grid_name })
                // Atualiza SIZE em mapeados com value_id correto
                const sizeMapIdx = mapeadosFinal.findIndex(m => ['SIZE', 'TAMANHO', 'ALPHANUMERIC_SIZE'].includes(m.id.toUpperCase()))
                if (sizeMapIdx !== -1) {
                  mapeadosFinal[sizeMapIdx] = { ...mapeadosFinal[sizeMapIdx], value_id: match.id, value_name: match.name }
                } else {
                  mapeadosFinal.push({ id: 'SIZE', value_id: match.id, value_name: match.name })
                }
                // Remove SIZE de pendentes se estiver lá
                const sizePendIdx = pendentesFinal.findIndex(a => ['SIZE', 'TAMANHO', 'ALPHANUMERIC_SIZE'].includes(a.id.toUpperCase()))
                if (sizePendIdx !== -1) pendentesFinal.splice(sizePendIdx, 1)
              } else {
                pendentesFinal[sizeGridIdx] = { ...sizeGridAttr, name: `Tamanho '${tamanho}' não encontrado na grade do ML` }
              }
            }
          }
        }

        return {
          ...p,
          marca,
          categoria: p.categoria ?? original?.categoria,
          ...(mapeadosFinal.length ? { atributos_ml: mapeadosFinal } : {}),
          ...(pendentesFinal.length ? { atributos_pendentes_ml: pendentesFinal.map(a => ({ id: a.id, name: a.name })) } : {}),
        }
      }))
    }

    const produtosRevisaoML = Object.keys(fotosUpload).length > 0
      ? produtosRevisao.map(p => {
          const fotos = fotosUpload[p.sku]
          return fotos?.length ? { ...p, fotos } : p
        })
      : produtosRevisao

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
            produtos: produtosRevisao.length > 0 ? produtosRevisao : produtos,
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
            `Catálogo para ${nomeCanal} não foi salvo automaticamente. A exportação técnica ficou disponível como apoio.`
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
    const statusConfianca = criarCardStatusConfianca({
      totalProdutos: produtos.length,
      produtosProcessados: processData.produtos_processados,
      arquivosGerados: arquivosGerados.length,
      canaisSolicitados: canaisAlvo.length,
      alertas: alertasFinal,
      driveValidado: dados.drive_validado === true,
      camposObrigatoriosOk: produtos.length > 0,
      precosCalculados: processData.produtos_processados > 0,
    })
    const priceGuard = criarCardPriceGuard({
      produtosRevisao,
      canais: canaisEngine,
      regime,
    })
    const priceGuardAction = {
      ...priceGuard,
      sessao_id,
      conversa_id,
      canais: canaisEngine,
    }
    const validadoresUpload = arquivosGerados.map(arquivo =>
      validarPreUploadCatalogo({
        produtos: produtosRevisao,
        canal: arquivo.canal,
        driveUrl: sessao.drive_url,
        arquivoPath: arquivo.path,
      })
    )
    const validadorUploadChat = consolidarValidadoresUpload(validadoresUpload)
    const validadorUploadAction = validadorUploadChat
      ? [{
          acao: 'card_validador_upload' as const,
          validador_upload: validadorUploadChat,
        }]
      : []
    const comparadorListing = criarComparadorListing({
      produtosOriginais: produtos,
      produtosRevisao,
      canais: canaisEngine,
    })
    const comparadorListingAction = comparadorListing ? [comparadorListing] : []

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
          status_confianca: statusConfianca,
          validadores_upload: validadoresUpload,
          comparador_listing: comparadorListing,
          price_guard: priceGuard.price_guard,
          produtos_revisao: produtosRevisao,
          canais_engine: canaisEngine,
          regime,
          regime_label: regimeRaw,
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
    const temMercadoLivre = canaisEngine.map(normalizarCanalParaEngine).includes('ml')
    const arquivoMercadoLivre = arquivosBaixaveis.find(a => normalizarCanalParaEngine(a.canal) === 'ml')
    let contaML: { nickname?: string | null; ml_user_id?: string | null } | null = null
    if (temMercadoLivre) {
      const { data, error } = await supabase
        .from('ml_contas')
        .select('nickname, ml_user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) console.error('[GERAR-DO-CHAT] erro ao consultar ml_contas:', error)
      contaML = data
    }
    const publicacaoMLCard = temMercadoLivre
      ? criarCardPublicacaoML({
          conectado: Boolean(contaML),
          nickname: contaML?.nickname ?? null,
          produtosOriginais: produtos,
          produtosRevisao: produtosRevisaoML,
          driveUrl: sessao.drive_url,
          fallbackDownload: arquivoMercadoLivre ?? null,
        })
      : null
    const publicacaoMLAction = publicacaoMLCard ? [publicacaoMLCard] : []
    const temFotosUpload = Object.keys(fotosUpload).length > 0
    const uploadFotosAction = publicacaoMLCard?.status === 'pendente' && Boolean(contaML) && !temFotosUpload
      ? [{
          acao: 'card_upload_fotos_ml' as const,
          produtos: produtos.map(p => ({ sku: p.sku, nome: p.nome })),
        }]
      : []

    // ── Inserir mensagem de sucesso no histórico do chat ──────────────────────
    if (arquivosGerados.length > 0) {
      const n = arquivosGerados.length
      const conteudoSucesso = [
        `🎉 **Pronto!** Seus cadastros foram preparados com sucesso!`,
        ``,
        `Você tem **${n} cadastro${n > 1 ? 's' : ''}** salvo${n > 1 ? 's' : ''} automaticamente em **Meus Catálogos** para revisar e reutilizar sempre que precisar.`,
        ``,
        temMercadoLivre
          ? `Revise o card do Mercado Livre abaixo para publicar pela API. Para canais sem conector ativo, deixei a exportação técnica disponível como apoio.`
          : `Para canais sem conector ativo, deixei a exportação técnica disponível como apoio enquanto a publicação direta não está liberada.`,
      ].join('\n')

      const botoesSucesso = [
        ...comparadorListingAction,
        ...validadorUploadAction,
        priceGuardAction,
        ...uploadFotosAction,
        ...publicacaoMLAction,
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
            texto: `📚 Como publicar no ${nomeLabel}?`,
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
        conversa_id,
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
      mensagem_sucesso: arquivosGerados.length > 0 ? {
        conteudo: [
          `**Pronto!** Seus cadastros foram preparados com sucesso!`,
          ``,
          `Você tem **${arquivosGerados.length} cadastro${arquivosGerados.length > 1 ? 's' : ''}** salvo${arquivosGerados.length > 1 ? 's' : ''} automaticamente em **Meus Catálogos** para revisar e reutilizar sempre que precisar.`,
          ``,
          temMercadoLivre
            ? `Revise o card do Mercado Livre abaixo para publicar pela API. Para canais sem conector ativo, deixei a exportação técnica disponível como apoio.`
            : `Para canais sem conector ativo, deixei a exportação técnica disponível como apoio enquanto a publicação direta não está liberada.`,
        ].join('\n'),
        acoes: {
          botoes: [
            ...validadorUploadAction,
            ...comparadorListingAction,
            priceGuardAction,
            ...uploadFotosAction,
            ...publicacaoMLAction,
            ...arquivosBaixaveis.map(a => ({
              acao: 'card_download_arquivo',
              path: a.path,
              canal: a.canal,
              nome_canal_label: a.nome_canal_label,
              tamanho_bytes: a.tamanho_bytes,
            })),
            ...canaisAlvo.map(canalChat => {
              const nomeLabel = CANAL_LABELS[normalizarCanalParaEngine(canalChat)] ?? canalChat
              return {
                acao: 'botao_ajuda_upload',
                canal: canalChat,
                nome_canal_label: nomeLabel,
                texto: `Como publicar no ${nomeLabel}?`,
              }
            }),
            { acao: 'mensagem', texto: 'Cadastrar mais produtos', valor: 'quero cadastrar mais produtos' },
            { acao: 'mensagem', texto: 'Tirar uma dúvida', valor: 'Tenho uma dúvida' },
          ],
        },
      } : null,
      mensagem_sucesso_inserida: arquivosGerados.length > 0,
    })
  } catch (error) {
    console.error('[GERAR-DO-CHAT] erro:', error)
    return Response.json({ error: 'erro interno' }, { status: 500 })
  }
}
