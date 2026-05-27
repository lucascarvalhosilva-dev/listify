import {
  getCampoPrecoPorCanal,
  getCanalLabelPriceGuard,
  type ProdutoRevisaoPriceGuard,
} from '@/lib/price-guard'
import { normalizarCanalParaEngine } from '@/lib/normalizar-canais'

export type ValidadorUploadStatus = 'pronto' | 'atencao' | 'bloqueado'
export type ValidadorUploadNivel = 'ok' | 'aviso' | 'erro'

export interface ValidadorUploadItem {
  nivel: ValidadorUploadNivel
  titulo: string
  detalhe: string
  sku?: string
  campo?: string
}

export interface ValidadorUploadCheck {
  label: string
  valor: string
  ok: boolean
}

export interface ValidadorUploadData {
  status: ValidadorUploadStatus
  titulo: string
  resumo: string
  canal: string
  nome_canal_label: string
  total_produtos: number
  erros_count: number
  avisos_count: number
  checks: ValidadorUploadCheck[]
  itens_preview: ValidadorUploadItem[]
}

function textoValido(valor: unknown): boolean {
  return typeof valor === 'string' && valor.trim().length > 0
}

function numeroPositivo(valor: unknown): boolean {
  const n = Number(valor)
  return Number.isFinite(n) && n > 0
}

function numeroNaoNegativo(valor: unknown): boolean {
  const n = Number(valor)
  return Number.isFinite(n) && n >= 0
}

function adicionarItem(
  itens: ValidadorUploadItem[],
  nivel: ValidadorUploadNivel,
  titulo: string,
  detalhe: string,
  produto?: ProdutoRevisaoPriceGuard,
  campo?: string
) {
  itens.push({
    nivel,
    titulo,
    detalhe,
    sku: produto?.sku,
    campo,
  })
}

function validarTitulo(params: {
  itens: ValidadorUploadItem[]
  produto: ProdutoRevisaoPriceGuard
  canal: string
}) {
  const { itens, produto, canal } = params

  if (canal === 'shopee') {
    if (!textoValido(produto.titulo_shopee)) {
      adicionarItem(itens, 'erro', 'Título ausente', 'Shopee exige título preenchido para o produto.', produto, 'titulo_shopee')
      return
    }
    if ((produto.titulo_shopee ?? '').length > 120) {
      adicionarItem(itens, 'erro', 'Título muito longo', 'Shopee aceita até 120 caracteres no título.', produto, 'titulo_shopee')
    }
    return
  }

  if (canal === 'ml' || canal === 'mercado_livre') {
    if (!textoValido(produto.titulo_ml)) {
      adicionarItem(itens, 'erro', 'Título ausente', 'Mercado Livre exige título preenchido para o produto.', produto, 'titulo_ml')
      return
    }
    if ((produto.titulo_ml ?? '').length > 60) {
      adicionarItem(itens, 'erro', 'Título muito longo', 'Mercado Livre aceita até 60 caracteres no título.', produto, 'titulo_ml')
    }
  }
}

function validarDescricao(params: {
  itens: ValidadorUploadItem[]
  produto: ProdutoRevisaoPriceGuard
  canal: string
}) {
  const { itens, produto, canal } = params

  if (canal === 'shopee') {
    if (!textoValido(produto.descricao_shopee)) {
      adicionarItem(itens, 'erro', 'Descrição ausente', 'Shopee exige descrição preenchida para publicar.', produto, 'descricao_shopee')
    }
    return
  }

  if (canal === 'ml' || canal === 'mercado_livre') {
    const descricao = produto.descricao_ml ?? ''
    if (!textoValido(descricao)) {
      adicionarItem(itens, 'erro', 'Descrição ausente', 'Mercado Livre exige descrição preenchida para publicar.', produto, 'descricao_ml')
      return
    }
    if (/<[^>]+>/.test(descricao) || /https?:\/\//i.test(descricao)) {
      adicionarItem(itens, 'erro', 'Descrição com conteúdo proibido', 'Mercado Livre não aceita HTML, links ou contatos na descrição.', produto, 'descricao_ml')
    }
  }
}

export function validarPreUploadCatalogo(params: {
  produtos: ProdutoRevisaoPriceGuard[]
  canal: string
  driveUrl?: string | null
  arquivoPath?: string | null
}): ValidadorUploadData {
  const canal = normalizarCanalParaEngine(params.canal)
  const nomeCanal = getCanalLabelPriceGuard(canal)
  const produtos = params.produtos
  const itens: ValidadorUploadItem[] = []
  const campoPreco = getCampoPrecoPorCanal(canal)

  if (produtos.length === 0) {
    adicionarItem(itens, 'erro', 'Catálogo vazio', 'Nenhum produto editável foi encontrado neste catálogo.')
  }

  if (!params.arquivoPath) {
    adicionarItem(itens, 'erro', 'Planilha indisponível', 'Gere ou ajuste a planilha antes de tentar subir no marketplace.')
  }

  if (canal === 'shopee' && !textoValido(params.driveUrl)) {
    adicionarItem(itens, 'erro', 'Fotos sem Drive validado', 'Shopee precisa das fotos acessíveis pelo Drive para publicar com imagem.')
  }

  if ((canal === 'ml' || canal === 'mercado_livre') && !textoValido(params.driveUrl)) {
    adicionarItem(itens, 'aviso', 'Fotos exigem ação manual', 'Mercado Livre não recebe fotos pela planilha; adicione as imagens no editor após o upload.')
  }

  for (const produto of produtos) {
    if (!textoValido(produto.sku)) {
      adicionarItem(itens, 'erro', 'SKU ausente', 'Todo produto precisa de SKU para upload em massa.', produto, 'sku')
    }
    if (!textoValido(produto.nome)) {
      adicionarItem(itens, 'erro', 'Nome interno ausente', 'O nome ajuda a revisar e localizar o produto no catálogo.', produto, 'nome')
    }
    if (!numeroNaoNegativo(produto.estoque)) {
      adicionarItem(itens, 'erro', 'Estoque inválido', 'Estoque precisa ser zero ou maior.', produto, 'estoque')
    }
    if (!campoPreco || !numeroPositivo(produto[campoPreco])) {
      adicionarItem(itens, 'erro', 'Preço inválido', `${nomeCanal} precisa de preço maior que zero.`, produto, campoPreco ?? 'preco')
    }
    if (!numeroPositivo(produto.peso_g)) {
      adicionarItem(itens, 'erro', 'Peso inválido', 'Peso precisa ser maior que zero para o cálculo logístico.', produto, 'peso_g')
    }
    if (!numeroPositivo(produto.comprimento_cm) || !numeroPositivo(produto.largura_cm) || !numeroPositivo(produto.altura_cm)) {
      adicionarItem(itens, 'erro', 'Dimensões inválidas', 'Comprimento, largura e altura precisam ser maiores que zero.', produto, 'dimensoes')
    }
    if (Number(produto.comprimento_cm) > 105) {
      adicionarItem(itens, 'aviso', 'Produto acima de 105 cm', `${nomeCanal} pode exigir logística manual ou configuração especial.`, produto, 'comprimento_cm')
    }
    if (produto.confianca_dimensoes === 'media') {
      adicionarItem(itens, 'aviso', 'Dimensões com confiança média', 'Revise peso e medidas antes do upload.', produto, 'confianca_dimensoes')
    }
    if (!textoValido(produto.gtin)) {
      adicionarItem(itens, 'aviso', 'GTIN/EAN ausente', 'Se o marketplace exigir código de barras, o anúncio pode cair em revisão.', produto, 'gtin')
    }

    validarTitulo({ itens, produto, canal })
    validarDescricao({ itens, produto, canal })
  }

  const erros = itens.filter(item => item.nivel === 'erro')
  const avisos = itens.filter(item => item.nivel === 'aviso')
  const status: ValidadorUploadStatus = erros.length > 0 ? 'bloqueado' : avisos.length > 0 ? 'atencao' : 'pronto'
  const camposObrigatoriosOk = erros.length === 0
  const dimensoesOk = !itens.some(item => item.nivel === 'erro' && ['peso_g', 'dimensoes'].includes(item.campo ?? ''))
  const titulosOk = !itens.some(item => item.nivel === 'erro' && ['titulo_shopee', 'titulo_ml'].includes(item.campo ?? ''))
  const precosOk = !itens.some(item => item.nivel === 'erro' && (item.campo ?? '').startsWith('preco'))
  const arquivoOk = Boolean(params.arquivoPath)
  const fotosOk = canal === 'shopee' ? textoValido(params.driveUrl) : true

  return {
    status,
    titulo: status === 'pronto'
      ? 'Validação pré-upload: pronto'
      : status === 'bloqueado'
        ? 'Validação pré-upload: bloqueado'
        : 'Validação pré-upload: revisar',
    resumo: status === 'pronto'
      ? 'Os principais campos para upload passaram na validação automática.'
      : status === 'bloqueado'
        ? 'Existem erros que podem impedir o upload. Corrija antes de publicar.'
        : 'A planilha pode subir, mas há pontos que merecem revisão.',
    canal,
    nome_canal_label: nomeCanal,
    total_produtos: produtos.length,
    erros_count: erros.length,
    avisos_count: avisos.length,
    checks: [
      { label: 'Campos', valor: camposObrigatoriosOk ? 'ok' : `${erros.length} erro${erros.length === 1 ? '' : 's'}`, ok: camposObrigatoriosOk },
      { label: 'Títulos', valor: titulosOk ? 'ok' : 'revisar', ok: titulosOk },
      { label: 'Preços', valor: precosOk ? 'ok' : 'revisar', ok: precosOk },
      { label: 'Dimensões', valor: dimensoesOk ? 'ok' : 'revisar', ok: dimensoesOk },
      { label: 'Fotos', valor: fotosOk ? 'ok' : 'revisar', ok: fotosOk },
      { label: 'Arquivo', valor: arquivoOk ? 'pronto' : 'ausente', ok: arquivoOk },
    ],
    itens_preview: [...erros, ...avisos].slice(0, 6),
  }
}

export function consolidarValidadoresUpload(validadores: ValidadorUploadData[]): ValidadorUploadData | null {
  if (validadores.length === 0) return null
  if (validadores.length === 1) return validadores[0]

  const errosCount = validadores.reduce((acc, item) => acc + item.erros_count, 0)
  const avisosCount = validadores.reduce((acc, item) => acc + item.avisos_count, 0)
  const status: ValidadorUploadStatus = errosCount > 0 ? 'bloqueado' : avisosCount > 0 ? 'atencao' : 'pronto'
  const canaisLabel = validadores.map(item => item.nome_canal_label).join(', ')
  const checks = ['Campos', 'Títulos', 'Preços', 'Dimensões', 'Fotos', 'Arquivo'].map(label => {
    const relacionados = validadores.flatMap(item => item.checks.filter(check => check.label === label))
    const ok = relacionados.every(check => check.ok)
    return {
      label,
      valor: ok ? (label === 'Arquivo' ? 'pronto' : 'ok') : 'revisar',
      ok,
    }
  })

  return {
    status,
    titulo: status === 'pronto'
      ? 'Validação pré-upload: pronto'
      : status === 'bloqueado'
        ? 'Validação pré-upload: bloqueado'
        : 'Validação pré-upload: revisar',
    resumo: status === 'pronto'
      ? `Shopee e Mercado Livre passaram na validação automática.`
      : status === 'bloqueado'
        ? `Existem erros em ${canaisLabel}. Corrija antes de publicar.`
        : `Há pontos de atenção em ${canaisLabel}. Revise antes de publicar.`,
    canal: 'multicanal',
    nome_canal_label: canaisLabel,
    total_produtos: Math.max(...validadores.map(item => item.total_produtos)),
    erros_count: errosCount,
    avisos_count: avisosCount,
    checks,
    itens_preview: validadores.flatMap(item =>
      item.itens_preview.map(alerta => ({
        ...alerta,
        detalhe: `${item.nome_canal_label}: ${alerta.detalhe}`,
      }))
    ).slice(0, 6),
  }
}
