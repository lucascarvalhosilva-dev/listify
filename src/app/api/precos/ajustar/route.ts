import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  CANAL_LABELS_CATALOGO,
  CONTENT_TYPE_CATALOGO,
  EXTENSAO_CATALOGO,
  gerarArquivosCatalogo,
  type ProdutoRevisaoCatalogo,
} from '@/lib/catalog-file-generator'
import { normalizarCanalParaEngine } from '@/lib/normalizar-canais'
import { aplicarAjustePrecos, type AplicarAjusteEm, type TipoAjustePreco } from '@/lib/price-guard'
import {
  montarCatalogoPreco,
  normalizarProdutosPreco,
  normalizarRegimePreco,
  type CatalogoPrecoRow,
} from '@/lib/precos-catalogos'

export const maxDuration = 60

interface AjustarCatalogoBody {
  catalogo_id: string
  tipo: TipoAjustePreco
  aplicar_em?: AplicarAjusteEm
  margem_minima?: number
  percentual?: number
  valor_fixo?: number
  arredondar_90?: boolean
  skus_selecionados?: string[]
}

function isTipoAjuste(tipo: unknown): tipo is TipoAjustePreco {
  return tipo === 'margem_minima' || tipo === 'percentual' || tipo === 'valor_fixo' || tipo === 'preco_manual'
}

function chaveArquivoPorCanal(canal: string): keyof ReturnType<typeof gerarArquivosCatalogo>['arquivos'] {
  if (canal === 'mercado_livre') return 'ml'
  if (canal === 'tiktok_shop') return 'tiktok'
  return canal as keyof ReturnType<typeof gerarArquivosCatalogo>['arquivos']
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'nao autenticado' }, { status: 401 })

    const body = await request.json() as AjustarCatalogoBody
    if (!body.catalogo_id || typeof body.catalogo_id !== 'string') {
      return Response.json({ error: 'catalogo_id obrigatorio' }, { status: 400 })
    }
    if (!isTipoAjuste(body.tipo)) {
      return Response.json({ error: 'tipo de ajuste invalido' }, { status: 400 })
    }

    const { data: catalogo, error: catErr } = await supabase
      .from('catalogos')
      .select('id, nome, canal, criado_em, atualizado_em, regime_tributario, drive_url, arquivo_path, produtos')
      .eq('id', body.catalogo_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (catErr || !catalogo) {
      return Response.json({ error: 'catalogo nao encontrado' }, { status: 404 })
    }

    const canal = typeof catalogo.canal === 'string' ? normalizarCanalParaEngine(catalogo.canal) : ''
    if (!canal) return Response.json({ error: 'catalogo sem canal definido' }, { status: 400 })
    if (!catalogo.drive_url || typeof catalogo.drive_url !== 'string') {
      return Response.json({ error: 'catalogo sem link do Drive para regenerar a planilha' }, { status: 400 })
    }

    const produtos = normalizarProdutosPreco(catalogo.produtos)
    if (produtos.length === 0) {
      return Response.json({ error: 'catalogo sem produtos editaveis' }, { status: 400 })
    }

    const regime = normalizarRegimePreco(catalogo.regime_tributario)
    const aplicarEm: AplicarAjusteEm =
      body.aplicar_em === 'todos'
        ? 'todos'
        : body.aplicar_em === 'selecionados'
          ? 'selecionados'
          : 'com_risco'
    const skusSelecionados = Array.isArray(body.skus_selecionados)
      ? body.skus_selecionados.filter((sku): sku is string => typeof sku === 'string' && sku.trim().length > 0)
      : []

    if (aplicarEm === 'selecionados' && skusSelecionados.length === 0) {
      return Response.json({ error: 'selecione ao menos um produto para ajustar' }, { status: 400 })
    }

    const resultado = aplicarAjustePrecos({
      produtos,
      canais: [canal],
      regime,
      tipo: body.tipo,
      aplicarEm,
      margemMinimaPercentual: body.margem_minima,
      percentual: body.percentual,
      valorFixo: body.valor_fixo,
      arredondarFinal90: body.arredondar_90 !== false,
      skusSelecionados,
    })

    if (resultado.alteracoes.length === 0) {
      return Response.json({ error: 'nenhum preco precisou mudar com esses criterios' }, { status: 400 })
    }

    const produtosCatalogo = resultado.produtos as ProdutoRevisaoCatalogo[]
    const { arquivos } = gerarArquivosCatalogo({
      produtos: produtosCatalogo,
      regime,
      canais: [canal],
      drive_folder_url: catalogo.drive_url,
    })

    const arquivoBase64 = arquivos[chaveArquivoPorCanal(canal)]
    if (!arquivoBase64) {
      return Response.json({ error: 'nao consegui gerar a planilha ajustada' }, { status: 500 })
    }

    const agora = new Date()
    const ts = agora.toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const ext = EXTENSAO_CATALOGO[canal] ?? 'csv'
    const contentType = CONTENT_TYPE_CATALOGO[canal] ?? 'text/csv'
    const filePath = `${user.id}/precos/${catalogo.id}/${canal}-ajustado-${ts}.${ext}`
    const buffer = Buffer.from(arquivoBase64, 'base64')

    const { error: uploadErr } = await supabase.storage
      .from('geracoes')
      .upload(filePath, buffer, { contentType, upsert: true })

    if (uploadErr) {
      console.error('[PRECOS/AJUSTAR] erro ao fazer upload:', uploadErr)
      return Response.json({ error: 'nao consegui salvar a planilha ajustada' }, { status: 500 })
    }

    const serviceClient = createServiceClient()
    const { data: atualizado, error: updateErr } = await serviceClient
      .from('catalogos')
      .update({
        produtos: produtosCatalogo,
        arquivo_path: filePath,
        atualizado_em: agora.toISOString(),
      })
      .eq('id', catalogo.id)
      .eq('user_id', user.id)
      .select('id, nome, canal, criado_em, atualizado_em, regime_tributario, drive_url, arquivo_path, produtos')
      .single()

    if (updateErr || !atualizado) {
      console.error('[PRECOS/AJUSTAR] erro ao atualizar catalogo:', updateErr)
      return Response.json({ error: 'planilha salva, mas nao consegui atualizar o catalogo' }, { status: 500 })
    }

    return Response.json({
      sucesso: true,
      alteracoes: resultado.alteracoes,
      alteracoes_count: resultado.alteracoes.length,
      arquivo: {
        canal,
        nome_canal_label: CANAL_LABELS_CATALOGO[canal] ?? canal,
        path: filePath,
        tamanho_bytes: buffer.byteLength,
      },
      catalogo: montarCatalogoPreco(atualizado as CatalogoPrecoRow),
    })
  } catch (error) {
    console.error('[PRECOS/AJUSTAR] erro:', error)
    return Response.json({ error: 'erro interno' }, { status: 500 })
  }
}
