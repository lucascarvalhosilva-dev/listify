import type { ProdutoRevisaoPriceGuard } from '@/lib/price-guard'

export interface ProdutoFontePublicacaoML {
  sku: string
  nome: string
  custo: number
  estoque: number
  marca?: string
  categoria?: string
}

export interface DownloadFallbackML {
  path: string
  canal: string
  nome_canal_label: string
  tamanho_bytes: number
}

export interface PublicacaoMLPayload {
  titulo: string
  preco: number
  moeda: 'BRL'
  quantidade: number
  condicao: 'new' | 'used'
  categoria_ml: string
  descricao: string
  fotos: string[]
  atributos?: { id: string; value_name: string }[]
}

export interface ProdutoResumoPublicacaoML {
  sku: string
  nome: string
  titulo: string
  preco: number | null
  categoria: string | null
  estoque: number | null
  quantidade_fotos: number
}

export interface PublicacaoMLCardData {
  acao: 'card_publicacao_ml'
  conectado: boolean
  status: 'pronto' | 'pendente' | 'desconectado'
  titulo: string
  resumo: string
  badge: string
  nickname?: string | null
  total_produtos: number
  produto_preview: ProdutoResumoPublicacaoML | null
  bloqueios: string[]
  payloads?: PublicacaoMLPayload[]
  fallback_download?: DownloadFallbackML
}

interface CriarCardPublicacaoMLParams {
  conectado: boolean
  nickname?: string | null
  produtosOriginais: ProdutoFontePublicacaoML[]
  produtosRevisao: ProdutoRevisaoPriceGuard[]
  driveUrl?: string | null
  fallbackDownload?: DownloadFallbackML | null
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

function numero(valor: unknown): number | null {
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

function pareceCategoriaML(valor: string): boolean {
  return /^MLB\d+$/i.test(valor.trim())
}

function extrairCategoriaML(produto: ProdutoRevisaoPriceGuard, original?: ProdutoFontePublicacaoML): string | null {
  const bruto = produto as unknown as Record<string, unknown>
  const candidatos = [
    bruto.categoria_ml,
    bruto.category_id,
    bruto.categoriaMl,
    original?.categoria,
  ]

  for (const candidato of candidatos) {
    const valor = texto(candidato)
    if (valor && pareceCategoriaML(valor)) return valor.toUpperCase()
  }

  return null
}

function urlImagemPublicavel(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false
  if (/drive\.google\.com\/drive\/folders/i.test(url)) return false
  if (/drive\.google\.com\/file\/d\//i.test(url)) return false
  return true
}

function extrairFotosPublicas(produto: ProdutoRevisaoPriceGuard): string[] {
  const bruto = produto as unknown as Record<string, unknown>
  const fontes = [
    bruto.fotos,
    bruto.foto_urls,
    bruto.fotos_urls,
    bruto.imagens,
    bruto.image_urls,
  ]

  const urls: string[] = []
  for (const fonte of fontes) {
    if (Array.isArray(fonte)) {
      for (const item of fonte) {
        const url = texto(item)
        if (url && urlImagemPublicavel(url)) urls.push(url)
      }
    }
  }

  for (const campo of ['foto_capa_url', 'imagem_url', 'image_url']) {
    const url = texto(bruto[campo])
    if (url && urlImagemPublicavel(url)) urls.push(url)
  }

  return Array.from(new Set(urls))
}

function montarPayload(
  produto: ProdutoRevisaoPriceGuard,
  original?: ProdutoFontePublicacaoML
): { payload: PublicacaoMLPayload | null; resumo: ProdutoResumoPublicacaoML; bloqueios: string[] } {
  const titulo = texto(produto.titulo_ml) || texto(produto.nome) || texto(original?.nome)
  const descricao = texto(produto.descricao_ml)
  const preco = numero(produto.preco_ml)
  const estoque = numero(produto.estoque ?? original?.estoque)
  const categoriaML = extrairCategoriaML(produto, original)
  const fotos = extrairFotosPublicas(produto)
  const bloqueios: string[] = []

  if (!titulo) bloqueios.push(`SKU ${produto.sku}: título do Mercado Livre ausente.`)
  if (!descricao) bloqueios.push(`SKU ${produto.sku}: descrição do Mercado Livre ausente.`)
  if (!preco || preco <= 0) bloqueios.push(`SKU ${produto.sku}: preço do Mercado Livre inválido.`)
  if (!estoque || estoque <= 0) bloqueios.push(`SKU ${produto.sku}: estoque precisa ser maior que zero para publicar.`)
  if (!categoriaML) bloqueios.push(`SKU ${produto.sku}: falta categoria oficial do Mercado Livre (ex: MLB1234).`)
  if (fotos.length === 0) bloqueios.push(`SKU ${produto.sku}: faltam fotos públicas por produto para a API do Mercado Livre.`)

  const resumo: ProdutoResumoPublicacaoML = {
    sku: texto(produto.sku),
    nome: texto(produto.nome) || texto(original?.nome) || 'Produto',
    titulo: titulo || 'Título pendente',
    preco: preco && preco > 0 ? preco : null,
    categoria: categoriaML ?? (texto(original?.categoria) || null),
    estoque: estoque && estoque >= 0 ? estoque : null,
    quantidade_fotos: fotos.length,
  }

  if (bloqueios.length > 0 || !preco || !estoque || !categoriaML) {
    return { payload: null, resumo, bloqueios }
  }

  return {
    resumo,
    bloqueios,
    payload: {
      titulo,
      preco,
      moeda: 'BRL',
      quantidade: estoque,
      condicao: 'new',
      categoria_ml: categoriaML,
      descricao,
      fotos,
    },
  }
}

export function criarCardPublicacaoML(params: CriarCardPublicacaoMLParams): PublicacaoMLCardData {
  const originaisPorSku = new Map(params.produtosOriginais.map(produto => [produto.sku, produto]))
  const resultados = params.produtosRevisao.map(produto => montarPayload(produto, originaisPorSku.get(produto.sku)))
  const bloqueiosDados = resultados.flatMap(resultado => resultado.bloqueios).slice(0, 6)
  const payloads = resultados.map(resultado => resultado.payload).filter((payload): payload is PublicacaoMLPayload => Boolean(payload))
  const total = params.produtosRevisao.length
  const produtoPreview = resultados[0]?.resumo ?? null

  if (!params.conectado) {
    return {
      acao: 'card_publicacao_ml',
      conectado: false,
      status: 'desconectado',
      titulo: 'Publicação direta no Mercado Livre',
      resumo: 'Conecte sua conta para publicar direto pelo Guiamos. Enquanto isso, o cadastro fica salvo e pronto para revisão.',
      badge: 'Conectar conta',
      total_produtos: total,
      produto_preview: produtoPreview,
      bloqueios: ['Mercado Livre ainda não conectado ao Guiamos.'],
      fallback_download: params.fallbackDownload ?? undefined,
    }
  }

  if (total === 0) {
    return {
      acao: 'card_publicacao_ml',
      conectado: true,
      status: 'pendente',
      titulo: 'Revisar e publicar no Mercado Livre',
      resumo: 'Não encontrei produtos revisáveis para publicação direta.',
      badge: 'Revisão necessária',
      nickname: params.nickname,
      total_produtos: 0,
      produto_preview: null,
      bloqueios: ['Nenhum produto processado foi encontrado para publicar.'],
      fallback_download: params.fallbackDownload ?? undefined,
    }
  }

  if (payloads.length !== total) {
    return {
      acao: 'card_publicacao_ml',
      conectado: true,
      status: 'pendente',
      titulo: 'Revisar e publicar no Mercado Livre',
      resumo: params.driveUrl
        ? 'A conta está conectada, mas ainda faltam dados que a API exige antes de publicar com segurança.'
        : 'A conta está conectada, mas preciso das fotos e dos dados obrigatórios antes de publicar pela API.',
      badge: 'Revisão necessária',
      nickname: params.nickname,
      total_produtos: total,
      produto_preview: produtoPreview,
      bloqueios: bloqueiosDados.length > 0 ? bloqueiosDados : ['Revise os dados obrigatórios antes de publicar.'],
      fallback_download: params.fallbackDownload ?? undefined,
    }
  }

  return {
    acao: 'card_publicacao_ml',
    conectado: true,
    status: 'pronto',
    titulo: 'Revisar e publicar no Mercado Livre',
    resumo: total === 1
      ? 'Cadastro pronto para revisão final e publicação direta.'
      : `${total} cadastros prontos para revisão final e publicação direta.`,
    badge: 'Conta conectada',
    nickname: params.nickname,
    total_produtos: total,
    produto_preview: produtoPreview,
    bloqueios: [],
    payloads,
    fallback_download: params.fallbackDownload ?? undefined,
  }
}
