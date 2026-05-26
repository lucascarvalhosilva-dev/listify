import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { normalizarCanaisChatParaEngine, normalizarCanalParaEngine } from '@/lib/normalizar-canais'
import {
  aplicarAjustePrecos,
  criarCardPriceGuard,
  getCanalLabelPriceGuard,
  type AplicarAjusteEm,
  type TipoAjustePreco,
  type ProdutoRevisaoPriceGuard,
} from '@/lib/price-guard'
import {
  CANAL_LABELS_CATALOGO,
  CONTENT_TYPE_CATALOGO,
  EXTENSAO_CATALOGO,
  gerarArquivosCatalogo,
  type ProdutoRevisaoCatalogo,
} from '@/lib/catalog-file-generator'

export const maxDuration = 60

interface AjustarPrecosBody {
  sessao_id: string
  conversa_id: string
  tipo: TipoAjustePreco
  canais: string[]
  aplicar_em?: AplicarAjusteEm
  margem_minima?: number
  percentual?: number
  valor_fixo?: number
  arredondar_90?: boolean
}

interface ArquivoGerado {
  canal: string
  path: string
  tamanho_bytes: number
  catalogo_id?: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatarDataLabel(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function listarCanais(canais: string[]): string {
  const labels = canais.map(canal => getCanalLabelPriceGuard(canal))
  return Array.from(new Set(labels)).join(', ')
}

function normalizarListaCanais(canais: string[]): string[] {
  return Array.from(new Set(normalizarCanaisChatParaEngine(canais).map(normalizarCanalParaEngine)))
}

function mesclarArquivosGerados(atuais: unknown, novos: ArquivoGerado[]): ArquivoGerado[] {
  const arquivosAtuais = Array.isArray(atuais)
    ? atuais.filter((arquivo): arquivo is ArquivoGerado => isRecord(arquivo) && typeof arquivo.canal === 'string' && typeof arquivo.path === 'string')
    : []
  const canaisNovos = new Set(novos.map(arquivo => arquivo.canal))
  return [
    ...arquivosAtuais.filter(arquivo => !canaisNovos.has(arquivo.canal)),
    ...novos,
  ]
}

function obterCatalogoIdPorCanal(arquivos: unknown): Map<string, string> {
  const mapa = new Map<string, string>()
  if (!Array.isArray(arquivos)) return mapa

  for (const arquivo of arquivos) {
    if (!isRecord(arquivo)) continue
    const canal = typeof arquivo.canal === 'string' ? normalizarCanalParaEngine(arquivo.canal) : null
    const catalogoId = typeof arquivo.catalogo_id === 'string' ? arquivo.catalogo_id : null
    if (canal && catalogoId) mapa.set(canal, catalogoId)
  }

  return mapa
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

    const body = await request.json() as AjustarPrecosBody
    const {
      sessao_id,
      conversa_id,
      tipo,
      margem_minima,
      percentual,
      valor_fixo,
      arredondar_90,
    } = body

    if (!sessao_id || typeof sessao_id !== 'string') {
      return Response.json({ error: 'sessao_id inválido' }, { status: 400 })
    }
    if (!conversa_id || typeof conversa_id !== 'string') {
      return Response.json({ error: 'conversa_id obrigatório' }, { status: 400 })
    }
    if (!['margem_minima', 'percentual', 'valor_fixo', 'preco_manual'].includes(tipo)) {
      return Response.json({ error: 'tipo de ajuste inválido' }, { status: 400 })
    }

    const canaisSelecionados = normalizarListaCanais(Array.isArray(body.canais) ? body.canais : [])
    if (canaisSelecionados.length === 0) {
      return Response.json({ error: 'selecione ao menos um canal para ajustar' }, { status: 400 })
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
    if (sessao.conversa_id && sessao.conversa_id !== conversa_id) {
      return Response.json({ error: 'sessão não pertence a esta conversa' }, { status: 403 })
    }
    if (sessao.etapa !== 'concluida') {
      return Response.json({ error: 'a geração ainda não está concluída' }, { status: 400 })
    }
    if (!sessao.drive_url || typeof sessao.drive_url !== 'string') {
      return Response.json({ error: 'drive_url não definida' }, { status: 400 })
    }

    const dados = isRecord(sessao.dados_planilha) ? sessao.dados_planilha : {}
    const produtosRevisao = Array.isArray(dados.produtos_revisao)
      ? dados.produtos_revisao as ProdutoRevisaoPriceGuard[]
      : []

    if (produtosRevisao.length === 0) {
      return Response.json({
        error: 'esta geração não tem dados editáveis de preço. Gere os arquivos novamente para habilitar o ajuste no chat.',
      }, { status: 400 })
    }

    const regime: 'MEI' | 'SN' = dados.regime === 'SN' ? 'SN' : 'MEI'
    const aplicarEm: AplicarAjusteEm = body.aplicar_em === 'todos' ? 'todos' : 'com_risco'
    const canaisOriginais = Array.isArray(dados.canais_engine)
      ? normalizarListaCanais(dados.canais_engine.filter((canal: unknown): canal is string => typeof canal === 'string'))
      : normalizarListaCanais(Array.isArray(sessao.canais_alvo) ? sessao.canais_alvo : canaisSelecionados)

    const resultado = aplicarAjustePrecos({
      produtos: produtosRevisao,
      canais: canaisSelecionados,
      regime,
      tipo,
      aplicarEm,
      margemMinimaPercentual: margem_minima,
      percentual,
      valorFixo: valor_fixo,
      arredondarFinal90: arredondar_90 !== false,
    })

    if (resultado.alteracoes.length === 0) {
      return Response.json({ error: 'nenhum preço precisou mudar com esses critérios.' }, { status: 400 })
    }

    const produtosCatalogo = resultado.produtos as ProdutoRevisaoCatalogo[]
    const { arquivos } = gerarArquivosCatalogo({
      produtos: produtosCatalogo,
      regime,
      canais: canaisSelecionados,
      drive_folder_url: sessao.drive_url,
    })

    const agora = new Date()
    const ts = agora.toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const arquivosGerados: ArquivoGerado[] = []

    for (const [canal, b64] of Object.entries(arquivos)) {
      if (!b64) continue
      const canalNormalizado = normalizarCanalParaEngine(canal)
      const ext = EXTENSAO_CATALOGO[canalNormalizado] ?? 'csv'
      const contentType = CONTENT_TYPE_CATALOGO[canalNormalizado] ?? 'text/csv'
      const filePath = `${user.id}/${sessao_id}/${canalNormalizado}-ajustado-${ts}.${ext}`
      const buffer = Buffer.from(b64, 'base64')

      const { error: uploadErr } = await supabase.storage
        .from('geracoes')
        .upload(filePath, buffer, { contentType, upsert: true })

      if (uploadErr) {
        console.error('[AJUSTAR-PRECOS] erro ao fazer upload:', canalNormalizado, uploadErr)
      } else {
        arquivosGerados.push({ canal: canalNormalizado, path: filePath, tamanho_bytes: buffer.byteLength })
      }
    }

    if (arquivosGerados.length === 0) {
      return Response.json({ error: 'não consegui gerar os arquivos ajustados' }, { status: 500 })
    }

    const serviceClient = createServiceClient()
    const catalogoIdPorCanal = obterCatalogoIdPorCanal(dados.arquivos_gerados)
    const dataLabel = formatarDataLabel(agora)
    const catalogosIds = new Set<string>(
      Array.isArray(dados.catalogos_ids)
        ? dados.catalogos_ids.filter((id: unknown): id is string => typeof id === 'string')
        : []
    )

    for (const arquivo of arquivosGerados) {
      const catalogoId = catalogoIdPorCanal.get(arquivo.canal)
      const nomeCanal = CANAL_LABELS_CATALOGO[arquivo.canal] ?? arquivo.canal

      if (catalogoId) {
        const { error: updateCatErr } = await serviceClient
          .from('catalogos')
          .update({
            produtos: produtosCatalogo,
            arquivo_path: arquivo.path,
            atualizado_em: agora.toISOString(),
          })
          .eq('id', catalogoId)
          .eq('user_id', user.id)

        if (updateCatErr) {
          console.error('[AJUSTAR-PRECOS] erro ao atualizar catálogo:', catalogoId, updateCatErr)
        } else {
          arquivo.catalogo_id = catalogoId
          catalogosIds.add(catalogoId)
        }
      } else {
        const { data: cat, error: insertCatErr } = await serviceClient
          .from('catalogos')
          .insert({
            user_id: user.id,
            nome: `Cadastro ${nomeCanal} - ${dataLabel}`,
            produtos: produtosCatalogo,
            drive_url: sessao.drive_url,
            regime_tributario: typeof dados.regime_label === 'string' ? dados.regime_label : regime,
            canal: arquivo.canal,
            arquivo_path: arquivo.path,
          })
          .select('id')
          .single()

        if (insertCatErr || !cat) {
          console.error('[AJUSTAR-PRECOS] erro ao criar catálogo ajustado:', insertCatErr)
        } else {
          const catId = (cat as { id: string }).id
          arquivo.catalogo_id = catId
          catalogosIds.add(catId)
        }
      }
    }

    const priceGuardAtualizado = criarCardPriceGuard({
      produtosRevisao: resultado.produtos,
      canais: canaisOriginais.length > 0 ? canaisOriginais : canaisSelecionados,
      regime,
    })
    const priceGuardAction = {
      ...priceGuardAtualizado,
      sessao_id,
      conversa_id,
      canais: canaisOriginais.length > 0 ? canaisOriginais : canaisSelecionados,
    }
    const arquivosMesclados = mesclarArquivosGerados(dados.arquivos_gerados, arquivosGerados)
    const ajustesAnteriores = Array.isArray(dados.ajustes_precos) ? dados.ajustes_precos : []

    const { error: updateSessaoErr } = await supabase
      .from('sessoes_geracao')
      .update({
        dados_planilha: {
          ...dados,
          produtos_revisao: resultado.produtos,
          price_guard: priceGuardAtualizado.price_guard,
          arquivos_gerados: arquivosMesclados,
          catalogos_ids: Array.from(catalogosIds),
          ajustes_precos: [
            ...ajustesAnteriores,
            {
              criado_em: agora.toISOString(),
              tipo,
              canais: canaisSelecionados,
              aplicar_em: aplicarEm,
              margem_minima,
              percentual,
              valor_fixo,
              arredondar_90: arredondar_90 !== false,
              alteracoes_count: resultado.alteracoes.length,
            },
          ],
        },
      })
      .eq('id', sessao_id)
      .eq('user_id', user.id)

    if (updateSessaoErr) {
      console.error('[AJUSTAR-PRECOS] erro ao atualizar sessão:', updateSessaoErr)
      return Response.json({ error: 'não consegui salvar os preços ajustados' }, { status: 500 })
    }

    const arquivosBaixaveis = arquivosGerados.map(arquivo => ({
      acao: 'card_download_arquivo',
      path: arquivo.path,
      canal: arquivo.canal,
      nome_canal_label: CANAL_LABELS_CATALOGO[arquivo.canal] ?? arquivo.canal,
      tamanho_bytes: arquivo.tamanho_bytes,
    }))

    const canaisTexto = listarCanais(canaisSelecionados)
    const n = arquivosGerados.length
    const conteudo = [
      `**Preços ajustados.** Recalculei **${resultado.alteracoes.length} preço${resultado.alteracoes.length > 1 ? 's' : ''}** em ${canaisTexto}.`,
      ``,
      `Gerei **${n} planilha${n > 1 ? 's' : ''} atualizada${n > 1 ? 's' : ''}** e salvei a nova versão em **Meus Catálogos**.`,
      ``,
      `Baixe os arquivos abaixo e revise antes de enviar ao marketplace.`,
    ].join('\n')

    const botoes = [
      priceGuardAction,
      ...arquivosBaixaveis,
      { acao: 'mensagem', texto: 'Cadastrar mais produtos', valor: 'quero cadastrar mais produtos' },
      { acao: 'mensagem', texto: 'Tirar uma dúvida', valor: 'Tenho uma dúvida' },
    ]

    const { error: histErr } = await serviceClient.from('chat_historico').insert({
      user_id: user.id,
      papel: 'assistant',
      conteudo,
      acoes_rapidas: { botoes },
      conversa_id,
    })
    if (histErr) console.error('[AJUSTAR-PRECOS] erro ao inserir histórico:', histErr)

    return Response.json({
      sucesso: true,
      alteracoes_count: resultado.alteracoes.length,
      arquivos_count: arquivosGerados.length,
      price_guard: priceGuardAtualizado.price_guard,
      mensagem_sucesso: {
        conteudo,
        acoes: { botoes },
      },
    })
  } catch (error) {
    console.error('[AJUSTAR-PRECOS] erro:', error)
    return Response.json({ error: 'erro interno' }, { status: 500 })
  }
}
