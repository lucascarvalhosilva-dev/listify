import { normalizarCanalParaEngine } from '@/lib/normalizar-canais'
import type { ProdutoRevisaoPriceGuard } from '@/lib/price-guard'

export type RestricaoProdutoNivel = 'proibido' | 'restrito'

export interface RestricaoProdutoDetectada {
  nivel: RestricaoProdutoNivel
  categoria: string
  motivo: string
  termo: string
  sku: string
  campo: string
}

interface RegraRestricao {
  nivel: RestricaoProdutoNivel
  categoria: string
  termos: string[]
  motivo: string
  canais?: string[]
}

const REGRAS_RESTRICAO: RegraRestricao[] = [
  {
    nivel: 'proibido',
    categoria: 'Drogas e substâncias proibidas',
    termos: ['cannabis', 'canabidiol', 'cbd', 'maconha', 'haxixe', 'cogumelo magico', 'peyote', 'kratom', 'popper', 'bong'],
    motivo: 'Marketplaces removem anúncios ligados a drogas, canabinoides ou acessórios de consumo.',
  },
  {
    nivel: 'proibido',
    categoria: 'Medicamentos e alegações terapêuticas',
    termos: ['medicamento', 'remedio', 'antibiotico', 'sibutramina', 'ozempic', 'rybelsus', 'saxenda', 'anabolizante', 'testosterona', 'hormonio do crescimento', 'cura ', 'trata ', 'previne doença'],
    motivo: 'Medicamentos e produtos com promessa de cura/prevenção exigem controle regulatório e podem ser proibidos.',
  },
  {
    nivel: 'proibido',
    categoria: 'Armas, munições e explosivos',
    termos: ['arma de fogo', 'municao', 'munição', 'pistola', 'revolver', 'revólver', 'explosivo', 'dinamite', 'polvora', 'pólvora', 'detonador', 'fogos de artificio', 'fogos de artifício', 'bomba'],
    motivo: 'Armas, munições, explosivos e materiais pirotécnicos são categorias proibidas ou altamente reguladas.',
  },
  {
    nivel: 'proibido',
    categoria: 'Produtos químicos perigosos',
    termos: ['soda caustica', 'soda cáustica', 'formol', 'formaldeido', 'formaldeído', 'mercurio', 'mercúrio', 'arsenico', 'arsênico', 'metanol', 'cloroformio', 'clorofórmio', 'acido sulfurico', 'ácido sulfúrico', 'acido nitrico', 'ácido nítrico'],
    motivo: 'Produtos químicos tóxicos/controlados podem ser barrados por segurança e legislação.',
  },
  {
    nivel: 'proibido',
    categoria: 'Animais e vida silvestre',
    termos: ['animal vivo', 'animais vivos', 'marfim', 'barbatana de tubarao', 'barbatana de tubarão', 'cavalo marinho', 'coral real', 'couro de jacare', 'couro de jacaré', 'chifre de rinoceronte'],
    motivo: 'Animais vivos, partes de animais e itens de vida silvestre protegida são proibidos.',
  },
  {
    nivel: 'proibido',
    categoria: 'Produtos falsificados ou pirataria',
    termos: ['replica', 'réplica', 'primeira linha', '1 linha', '1ª linha', 'pirata', 'falsificado', 'similar original', 'tipo original'],
    motivo: 'Termos associados a falsificação ou violação de propriedade intelectual podem derrubar o anúncio.',
  },
  {
    nivel: 'restrito',
    categoria: 'Bebidas alcoólicas',
    termos: ['cerveja', 'vinho', 'vodka', 'whisky', 'cachaça', 'cachaca', 'gin ', 'licor', 'bebida alcoolica', 'bebida alcoólica'],
    motivo: 'Bebidas alcoólicas podem exigir autorização, documentação ou categoria específica.',
  },
  {
    nivel: 'restrito',
    categoria: 'Eletrônicos regulados',
    termos: ['celular', 'smartphone', 'roteador', 'radio comunicador', 'rádio comunicador', 'walkie talkie', 'drone', 'carregador sem homologacao', 'carregador sem homologação'],
    motivo: 'Alguns eletrônicos exigem homologação, IMEI ou documentação regulatória.',
  },
  {
    nivel: 'restrito',
    categoria: 'Saúde, beleza e suplementos',
    termos: ['suplemento', 'termogenico', 'termogênico', 'emagrecedor', 'lente de contato', 'oculos de grau', 'óculos de grau', 'produto anvisa', 'cosmetico terapeutico', 'cosmético terapêutico'],
    motivo: 'Itens de saúde, beleza e suplementos podem exigir registro, autorização ou cuidado com alegações.',
  },
  {
    nivel: 'restrito',
    categoria: 'Airsoft e sobrevivência',
    termos: ['airsoft', 'paintball', 'simulacro', 'arma de pressão', 'arma de pressao', 'carabina de pressão', 'carabina de pressao'],
    motivo: 'Itens de airsoft/sobrevivência costumam exigir autorização ou documentação complementar.',
  },
]

function removerAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizarTexto(valor: unknown): string {
  if (typeof valor !== 'string') return ''
  return removerAcentos(valor).toLowerCase()
}

function contemTermo(texto: string, termo: string): boolean {
  const termoNormalizado = normalizarTexto(termo).trim()
  if (!termoNormalizado) return false
  return texto.includes(termoNormalizado)
}

function textoProduto(produto: ProdutoRevisaoPriceGuard): { texto: string; campo: string } {
  const campos = [
    'nome',
    'marca',
    'categoria',
    'titulo_ml',
    'titulo_shopee',
    'titulo_amazon',
    'descricao_ml',
    'descricao_shopee',
    'descricao_tiktok',
    'descricao_magalu',
    'descricao_bling',
    'descricao_amazon',
    'ncm',
  ] as const

  const partes = campos
    .map(campo => ({ campo, valor: normalizarTexto(produto[campo]) }))
    .filter(item => item.valor.length > 0)

  return {
    texto: partes.map(item => item.valor).join(' | '),
    campo: partes[0]?.campo ?? 'nome',
  }
}

export function detectarRestricoesProduto(params: {
  produto: ProdutoRevisaoPriceGuard
  canal: string
}): RestricaoProdutoDetectada[] {
  const canal = normalizarCanalParaEngine(params.canal)
  const { texto, campo } = textoProduto(params.produto)
  if (!texto) return []

  const restricoes: RestricaoProdutoDetectada[] = []

  for (const regra of REGRAS_RESTRICAO) {
    if (regra.canais && !regra.canais.includes(canal)) continue

    const termoEncontrado = regra.termos.find(termo => contemTermo(texto, termo))
    if (!termoEncontrado) continue

    restricoes.push({
      nivel: regra.nivel,
      categoria: regra.categoria,
      motivo: regra.motivo,
      termo: termoEncontrado,
      sku: params.produto.sku,
      campo,
    })
  }

  const vistas = new Set<string>()
  return restricoes.filter(item => {
    const chave = `${item.nivel}:${item.categoria}:${item.sku}`
    if (vistas.has(chave)) return false
    vistas.add(chave)
    return true
  })
}
