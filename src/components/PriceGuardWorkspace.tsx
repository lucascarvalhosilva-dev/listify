'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  ListChecks,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wand2,
} from 'lucide-react'
import CardPriceGuard from '@/components/CardPriceGuard'
import {
  aplicarAjustePrecos,
  calcularMetricasPriceGuard,
  getCampoPrecoPorCanal,
  type AlteracaoPreco,
  type AplicarAjusteEm,
  type PriceGuardStatus,
  type TipoAjustePreco,
} from '@/lib/price-guard'
import type { CatalogoPrecoItem } from '@/lib/precos-catalogos'

interface CatalogosResponse {
  catalogos: CatalogoPrecoItem[]
  error?: string
}

interface AjustarResponse {
  sucesso?: boolean
  error?: string
  alteracoes?: AlteracaoPreco[]
  alteracoes_count?: number
  arquivo?: {
    canal: string
    nome_canal_label: string
    path: string
    tamanho_bytes: number
  }
  catalogo?: CatalogoPrecoItem
}

function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function formatarData(valor: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(valor))
}

function statusColor(status: CatalogoPrecoItem['price_guard']['status']) {
  if (status === 'ok') return '#0f7b58'
  if (status === 'risco') return '#b42318'
  return '#a16207'
}

function statusLabel(status: CatalogoPrecoItem['price_guard']['status']) {
  if (status === 'ok') return 'Margem ok'
  if (status === 'risco') return 'Risco'
  return 'Atenção'
}

function modoLabel(tipo: TipoAjustePreco) {
  if (tipo === 'percentual') return 'Aumentar por percentual'
  if (tipo === 'valor_fixo') return 'Somar valor fixo'
  return 'Garantir margem mínima'
}

function margemLabel(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '-'
  return `${valor.toFixed(1).replace('.', ',')}%`
}

const estiloBotaoModo = (ativo: boolean) => ({
  border: `1px solid ${ativo ? '#155bd5' : '#dfe7f1'}`,
  background: ativo ? '#eaf2ff' : '#fff',
  color: ativo ? '#155bd5' : '#586174',
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 850,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  minHeight: 40,
})

export default function PriceGuardWorkspace() {
  const [catalogos, setCatalogos] = useState<CatalogoPrecoItem[]>([])
  const [catalogoId, setCatalogoId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [buscaProduto, setBuscaProduto] = useState('')
  const [skusSelecionados, setSkusSelecionados] = useState<string[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [tipo, setTipo] = useState<TipoAjustePreco>('margem_minima')
  const [aplicarEm, setAplicarEm] = useState<AplicarAjusteEm>('com_risco')
  const [margemMinima, setMargemMinima] = useState(10)
  const [percentual, setPercentual] = useState(8)
  const [valorFixo, setValorFixo] = useState(3)
  const [arredondar90, setArredondar90] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const [erroAcao, setErroAcao] = useState('')
  const [sucesso, setSucesso] = useState<AjustarResponse | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch('/api/precos/catalogos')
      const data = await res.json() as CatalogosResponse
      if (!res.ok) throw new Error(data.error ?? 'Erro ao carregar catálogos.')
      setCatalogos(data.catalogos ?? [])
      setCatalogoId(prev => prev ?? data.catalogos?.[0]?.id ?? null)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao carregar catálogos.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const catalogosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return catalogos
    return catalogos.filter(catalogo =>
      `${catalogo.nome} ${catalogo.nome_canal_label}`.toLowerCase().includes(termo)
    )
  }, [busca, catalogos])

  const catalogo = catalogos.find(item => item.id === catalogoId) ?? catalogosFiltrados[0] ?? null
  const skusSelecionadosSet = useMemo(() => new Set(skusSelecionados), [skusSelecionados])

  const preview = useMemo(() => {
    if (!catalogo?.editavel) return null
    return aplicarAjustePrecos({
      produtos: catalogo.produtos,
      canais: [catalogo.canal],
      regime: catalogo.regime,
      tipo,
      aplicarEm,
      margemMinimaPercentual: margemMinima,
      percentual,
      valorFixo,
      arredondarFinal90: arredondar90,
      skusSelecionados,
    })
  }, [catalogo, tipo, aplicarEm, margemMinima, percentual, valorFixo, arredondar90, skusSelecionados])

  const alteracoesPreview = preview?.alteracoes ?? []
  const podeGerarPlanilha = Boolean(catalogo?.editavel && !salvando && alteracoesPreview.length > 0)
  const dicaGerarPlanilha = !catalogo?.editavel
    ? 'Este catálogo ainda não está disponível para ajuste.'
    : aplicarEm === 'selecionados' && skusSelecionados.length === 0
      ? 'Selecione ao menos um produto para gerar uma nova planilha.'
    : alteracoesPreview.length === 0
      ? 'Altere a regra ou aplique em todos os produtos para gerar uma nova planilha.'
      : 'Gerar uma nova planilha com os preços simulados.'
  const totalAlertas = catalogo?.price_guard.canais.reduce((acc, canal) => acc + canal.produtos_com_alerta, 0) ?? 0
  const menorMargem = catalogo?.price_guard.canais
    .map(canal => canal.margem_minima_percentual)
    .filter((valor): valor is number => typeof valor === 'number' && Number.isFinite(valor))
    .sort((a, b) => a - b)[0] ?? null
  const produtosDoCatalogo = useMemo(() => {
    if (!catalogo) return []
    const termo = buscaProduto.trim().toLowerCase()
    const campoPreco = getCampoPrecoPorCanal(catalogo.canal)

    return catalogo.produtos
      .map(produto => {
        const metricas = calcularMetricasPriceGuard(produto, catalogo.canal, catalogo.regime)
        const preco = campoPreco ? Number(produto[campoPreco]) : NaN
        const status: PriceGuardStatus = !metricas
          ? 'atencao'
          : metricas.lucro_estimado <= 0
            ? 'risco'
            : metricas.margem_percentual < margemMinima
              ? 'atencao'
              : 'ok'

        return {
          sku: produto.sku,
          nome: produto.nome,
          preco: Number.isFinite(preco) ? preco : null,
          margem: metricas?.margem_percentual ?? null,
          status,
        }
      })
      .filter(produto => {
        if (!termo) return true
        return `${produto.sku} ${produto.nome}`.toLowerCase().includes(termo)
      })
  }, [catalogo, buscaProduto, margemMinima])

  const selecionarCatalogo = (id: string) => {
    setCatalogoId(id)
    setErroAcao('')
    setSucesso(null)
    setBuscaProduto('')
    setSkusSelecionados([])
  }

  const alternarProduto = (sku: string) => {
    setSucesso(null)
    setAplicarEm('selecionados')
    setSkusSelecionados(prev => prev.includes(sku) ? prev.filter(item => item !== sku) : [...prev, sku])
  }

  const selecionarTodosProdutosVisiveis = () => {
    setSucesso(null)
    setAplicarEm('selecionados')
    setSkusSelecionados(produtosDoCatalogo.map(produto => produto.sku))
  }

  const limparSelecaoProdutos = () => {
    setSucesso(null)
    setSkusSelecionados([])
  }

  const gerarPlanilha = async () => {
    if (!catalogo || salvando || alteracoesPreview.length === 0) return
    setSalvando(true)
    setErroAcao('')
    setSucesso(null)

    try {
      const res = await fetch('/api/precos/ajustar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogo_id: catalogo.id,
          tipo,
          aplicar_em: aplicarEm,
          margem_minima: margemMinima,
          percentual,
          valor_fixo: valorFixo,
          arredondar_90: arredondar90,
          skus_selecionados: skusSelecionados,
        }),
      })
      const data = await res.json() as AjustarResponse
      if (!res.ok || !data.catalogo) {
        setErroAcao(data.error ?? 'Não consegui gerar a planilha ajustada.')
        return
      }

      setCatalogos(prev => prev.map(item => item.id === data.catalogo!.id ? data.catalogo! : item))
      setCatalogoId(data.catalogo.id)
      setSucesso(data)
    } catch {
      setErroAcao('Erro de rede ao gerar a planilha ajustada.')
    } finally {
      setSalvando(false)
    }
  }

  const baixarArquivo = async (path?: string) => {
    if (!path || baixando) return
    setBaixando(true)
    setErroAcao('')
    try {
      const res = await fetch('/api/download-arquivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Erro ao gerar download.')

      const a = document.createElement('a')
      a.href = data.url
      a.download = path.split('/').pop() ?? 'planilha-ajustada'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      setErroAcao(error instanceof Error ? error.message : 'Erro ao baixar planilha.')
    } finally {
      setBaixando(false)
    }
  }

  return (
    <>
      <style>{`
        @media (max-width: 1040px) {
          .precos-main-grid,
          .precos-detail-grid {
            grid-template-columns: 1fr !important;
          }
          .precos-sidebar-list {
            max-height: 360px !important;
          }
        }
        @media (max-width: 720px) {
          .precos-page {
            padding: 24px 14px 54px !important;
          }
          .precos-header-metrics,
          .precos-inline-metrics,
          .precos-form-grid,
          .precos-mode-grid {
            grid-template-columns: 1fr !important;
            min-width: 0 !important;
          }
        }
      `}</style>
      <main className="precos-page" style={{
        minHeight: 'calc(100vh - 64px)',
        background: 'radial-gradient(circle at top left, rgba(26,115,232,0.08), transparent 31%), linear-gradient(180deg, #f5f8fc 0%, #f8fafc 48%, #ffffff 100%)',
        padding: '34px 24px 70px',
      }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#155bd5', background: '#eaf2ff', border: '1px solid #c9d9f3', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 850, marginBottom: 10 }}>
              <ShieldCheck size={14} strokeWidth={2.4} />
              Price Guard
            </div>
            <h1 style={{ margin: 0, color: '#182233', fontSize: 30, fontWeight: 900, letterSpacing: 0 }}>Ajustar preços</h1>
            <p style={{ color: '#586174', fontSize: 14, lineHeight: 1.6, margin: '8px 0 0', maxWidth: 680 }}>
              Simule margens, corrija produtos com risco e gere uma planilha atualizada sem cadastrar tudo de novo.
            </p>
          </div>

          {catalogos.length > 0 && (
            <div className="precos-header-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(110px, 1fr))', gap: 10, minWidth: 360 }}>
              <ResumoMetric label="Catálogos" value={catalogos.length} />
              <ResumoMetric label="Com alerta" value={catalogos.filter(c => c.price_guard.status !== 'ok').length} destaque />
              <ResumoMetric label="Produtos" value={catalogos.reduce((acc, c) => acc + c.total_produtos, 0)} />
            </div>
          )}
        </header>

        <div className="precos-main-grid" style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
          <aside style={{
            border: '1px solid #dfe7f1',
            borderRadius: 18,
            background: 'rgba(255,255,255,0.94)',
            boxShadow: '0 12px 32px rgba(15,23,42,0.06)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: 14, borderBottom: '1px solid #e8edf4' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #dfe7f1', borderRadius: 12, background: '#fff', padding: '0 10px' }}>
                <Search size={15} color="#697386" strokeWidth={2.3} />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar catálogo"
                  style={{ border: 'none', outline: 'none', minWidth: 0, flex: 1, height: 38, fontSize: 13, color: '#182233', fontFamily: 'inherit', background: 'transparent' }}
                />
              </label>
            </div>

            <div className="precos-sidebar-list" style={{ maxHeight: 690, overflowY: 'auto', padding: 8 }}>
              {carregando ? (
                <div style={{ padding: 14, color: '#697386', fontSize: 13 }}>Carregando catálogos...</div>
              ) : erro ? (
                <div style={{ padding: 12 }}>
                  <div style={{ color: '#b42318', fontSize: 13, fontWeight: 750, marginBottom: 10 }}>{erro}</div>
                  <button type="button" onClick={carregar} style={botaoSecundario()}>
                    Tentar novamente
                  </button>
                </div>
              ) : catalogosFiltrados.length === 0 ? (
                <div style={{ padding: 18, textAlign: 'center', color: '#697386', fontSize: 13, lineHeight: 1.5 }}>
                  Seus catálogos aparecem aqui depois da primeira geração.
                </div>
              ) : (
                catalogosFiltrados.map(item => {
                  const ativo = item.id === catalogo?.id
                  const cor = statusColor(item.price_guard.status)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selecionarCatalogo(item.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: `1px solid ${ativo ? '#bfd4f5' : 'transparent'}`,
                        background: ativo ? '#eaf2ff' : 'transparent',
                        color: '#182233',
                        borderRadius: 13,
                        padding: '11px 12px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 7,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.nome}
                          </div>
                          <div style={{ color: '#697386', fontSize: 11, marginTop: 3 }}>
                            {item.nome_canal_label} · {item.total_produtos} produto{item.total_produtos === 1 ? '' : 's'}
                          </div>
                        </div>
                        <span style={{ color: cor, background: '#fff', border: '1px solid #dfe7f1', borderRadius: 999, padding: '3px 7px', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap' }}>
                          {statusLabel(item.price_guard.status)}
                        </span>
                      </div>
                      <div style={{ color: '#697386', fontSize: 11 }}>Atualizado em {formatarData(item.atualizado_em)}</div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          <section style={{ minWidth: 0 }}>
            {!catalogo ? (
              <EstadoVazio />
            ) : (
              <div className="precos-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 520px) minmax(340px, 1fr)', gap: 16, alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <CardPriceGuard {...catalogo.price_guard} />

                  <div style={{
                    border: '1px solid #dfe7f1',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.95)',
                    padding: 14,
                    boxShadow: '0 10px 28px rgba(15,23,42,0.05)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 9,
                  }} className="precos-inline-metrics">
                    <ResumoMetric label="Canal" value={catalogo.nome_canal_label} compact />
                    <ResumoMetric label="Alertas" value={totalAlertas} destaque={totalAlertas > 0} compact />
                    <ResumoMetric label="Menor margem" value={menorMargem === null ? '-' : `${menorMargem.toFixed(1).replace('.', ',')}%`} destaque={catalogo.price_guard.status !== 'ok'} compact />
                  </div>

                  <div style={{
                    border: '1px solid #dfe7f1',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.95)',
                    boxShadow: '0 10px 28px rgba(15,23,42,0.05)',
                    overflow: 'hidden',
                  }}>
                    <div style={{ padding: '13px 14px', borderBottom: '1px solid #e8edf4', display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                        <span style={{ width: 30, height: 30, borderRadius: 10, background: '#eaf2ff', color: '#155bd5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ListChecks size={16} strokeWidth={2.4} />
                        </span>
                        <div>
                          <div style={{ color: '#182233', fontSize: 14, fontWeight: 900 }}>Produtos do catálogo</div>
                          <div style={{ color: '#697386', fontSize: 11, lineHeight: 1.4, marginTop: 2 }}>
                            Marque produtos para ajustar apenas alguns SKUs.
                          </div>
                        </div>
                      </div>
                      <div style={{ color: '#155bd5', fontSize: 11, fontWeight: 900 }}>
                        {skusSelecionados.length} selecionado{skusSelecionados.length === 1 ? '' : 's'}
                      </div>
                    </div>

                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #dfe7f1', borderRadius: 12, background: '#fff', padding: '0 10px' }}>
                        <Search size={14} color="#697386" strokeWidth={2.3} />
                        <input
                          value={buscaProduto}
                          onChange={e => setBuscaProduto(e.target.value)}
                          placeholder="Buscar SKU ou produto"
                          style={{ border: 'none', outline: 'none', minWidth: 0, flex: 1, height: 36, fontSize: 12, color: '#182233', fontFamily: 'inherit', background: 'transparent' }}
                        />
                      </label>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" onClick={selecionarTodosProdutosVisiveis} style={botaoTexto()}>
                          Selecionar visíveis
                        </button>
                        <button type="button" onClick={limparSelecaoProdutos} style={botaoTexto()}>
                          Limpar seleção
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 280, overflowY: 'auto' }}>
                        {produtosDoCatalogo.length === 0 ? (
                          <div style={{ color: '#697386', fontSize: 12, padding: '8px 2px' }}>Nenhum produto encontrado.</div>
                        ) : (
                          produtosDoCatalogo.map(produto => {
                            const selecionado = skusSelecionadosSet.has(produto.sku)
                            const corStatus = statusColor(produto.status)
                            return (
                              <label
                                key={produto.sku}
                                style={{
                                  border: `1px solid ${selecionado ? '#bfd4f5' : '#e8edf4'}`,
                                  borderRadius: 12,
                                  background: selecionado ? '#f3f7ff' : '#fff',
                                  padding: '9px 10px',
                                  display: 'grid',
                                  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                                  gap: 9,
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selecionado}
                                  onChange={() => alternarProduto(produto.sku)}
                                />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ color: '#182233', fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {produto.sku} · {produto.nome}
                                  </div>
                                  <div style={{ color: '#697386', fontSize: 11, marginTop: 3 }}>
                                    {formatarMoeda(produto.preco)} · margem {margemLabel(produto.margem)}
                                  </div>
                                </div>
                                <span style={{ color: corStatus, background: '#fff', border: '1px solid #dfe7f1', borderRadius: 999, padding: '3px 7px', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap' }}>
                                  {statusLabel(produto.status)}
                                </span>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  border: '1px solid #dfe7f1',
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.96)',
                  boxShadow: '0 12px 32px rgba(15,23,42,0.06)',
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '16px 18px', borderBottom: '1px solid #e8edf4', background: '#fbfdff', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ width: 38, height: 38, borderRadius: 13, background: '#eaf2ff', color: '#155bd5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <SlidersHorizontal size={19} strokeWidth={2.4} />
                    </span>
                    <div>
                      <div style={{ color: '#182233', fontSize: 16, fontWeight: 900 }}>Simular ajuste</div>
                      <div style={{ color: '#586174', fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>
                        A planilha nova mantém títulos, fotos e descrições. Só os preços selecionados mudam.
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {!catalogo.editavel && (
                      <AlertaErro>{catalogo.motivo_bloqueio ?? 'Este catálogo não está disponível para ajuste.'}</AlertaErro>
                    )}

                    <div>
                      <div style={label()}>Regra de ajuste</div>
                      <div className="precos-mode-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                        <button type="button" style={estiloBotaoModo(tipo === 'margem_minima')} onClick={() => { setTipo('margem_minima'); setSucesso(null) }}>
                          <Wand2 size={14} strokeWidth={2.4} />
                          Margem
                        </button>
                        <button type="button" style={estiloBotaoModo(tipo === 'percentual')} onClick={() => { setTipo('percentual'); setSucesso(null) }}>
                          %
                          Percentual
                        </button>
                        <button type="button" style={estiloBotaoModo(tipo === 'valor_fixo')} onClick={() => { setTipo('valor_fixo'); setSucesso(null) }}>
                          R$
                          Valor fixo
                        </button>
                      </div>
                    </div>

                    <div className="precos-form-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={label()}>
                          {tipo === 'margem_minima' ? 'Margem mínima' : tipo === 'percentual' ? 'Aumento' : 'Valor por produto'}
                        </span>
                        <div style={inputShell()}>
                          <input
                            type="number"
                            min={tipo === 'margem_minima' ? 1 : 0}
                            max={tipo === 'margem_minima' ? 80 : undefined}
                            step={tipo === 'valor_fixo' ? 0.5 : 1}
                            value={tipo === 'margem_minima' ? margemMinima : tipo === 'percentual' ? percentual : valorFixo}
                            onChange={e => {
                              const valor = Number(e.target.value)
                              setSucesso(null)
                              if (tipo === 'margem_minima') setMargemMinima(valor)
                              else if (tipo === 'percentual') setPercentual(valor)
                              else setValorFixo(valor)
                            }}
                            style={input()}
                          />
                          <span style={{ color: '#697386', fontSize: 12, fontWeight: 850, paddingRight: 10 }}>
                            {tipo === 'valor_fixo' ? 'R$' : '%'}
                          </span>
                        </div>
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={label()}>Aplicar em</span>
                        <select
                          value={aplicarEm}
                          onChange={e => { setAplicarEm(e.target.value as AplicarAjusteEm); setSucesso(null) }}
                          style={{
                            border: '1px solid #dfe7f1',
                            borderRadius: 12,
                            background: '#fff',
                            color: '#182233',
                            padding: '10px',
                            fontSize: 13,
                            fontWeight: 800,
                            fontFamily: 'inherit',
                            outline: 'none',
                            width: '100%',
                          }}
                        >
                          <option value="com_risco">Com alerta</option>
                          <option value="selecionados">Selecionados</option>
                          <option value="todos">Todos</option>
                        </select>
                        <span style={{ color: '#697386', fontSize: 10, lineHeight: 1.35 }}>
                          {aplicarEm === 'com_risco'
                            ? 'Corrige somente produtos em risco.'
                            : aplicarEm === 'selecionados'
                              ? 'Atualiza apenas os produtos marcados.'
                              : 'Atualiza todos os produtos do catálogo.'}
                        </span>
                      </label>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#586174', fontSize: 12, fontWeight: 750, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={arredondar90}
                        onChange={e => { setArredondar90(e.target.checked); setSucesso(null) }}
                      />
                      Arredondar preços para final .90
                    </label>

                    <div style={{ border: '1px solid #dfe7f1', borderRadius: 14, background: '#fbfdff', padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#182233', fontSize: 13, fontWeight: 900, marginBottom: 10 }}>
                        <CircleDollarSign size={16} color="#155bd5" strokeWidth={2.4} />
                        Prévia do ajuste
                      </div>

                      {alteracoesPreview.length === 0 ? (
                        <div style={{ color: '#697386', fontSize: 12, lineHeight: 1.5 }}>
                          {aplicarEm === 'selecionados' && skusSelecionados.length === 0
                            ? 'Selecione um ou mais produtos na lista para simular o ajuste.'
                            : 'Nenhum preço muda com os critérios atuais. Altere a regra ou aplique em todos os produtos.'}
                        </div>
                      ) : (
                        <>
                          <div style={{ color: '#586174', fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
                            <strong style={{ color: '#182233' }}>{modoLabel(tipo)}:</strong> {alteracoesPreview.length} preço{alteracoesPreview.length === 1 ? '' : 's'} {alteracoesPreview.length === 1 ? 'será atualizado' : 'serão atualizados'}.
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 240, overflowY: 'auto' }}>
                            {alteracoesPreview.slice(0, 8).map(item => (
                              <div key={`${item.sku}-${item.canal}`} style={{ border: '1px solid #e8edf4', borderRadius: 12, background: '#fff', padding: '9px 10px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center' }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ color: '#182233', fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sku} · {item.nome}</div>
                                  <div style={{ color: '#697386', fontSize: 11, marginTop: 3 }}>
                                    Margem {item.margem_anterior === null ? '-' : `${item.margem_anterior.toFixed(1).replace('.', ',')}%`} → {item.margem_nova === null ? '-' : `${item.margem_nova.toFixed(1).replace('.', ',')}%`}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <div style={{ color: '#697386', fontSize: 11, textDecoration: 'line-through' }}>{formatarMoeda(item.preco_anterior)}</div>
                                  <div style={{ color: '#155bd5', fontSize: 13, fontWeight: 950 }}>{formatarMoeda(item.preco_novo)}</div>
                                </div>
                              </div>
                            ))}
                            {alteracoesPreview.length > 8 && (
                              <div style={{ color: '#697386', fontSize: 11, fontWeight: 750, padding: '2px 4px' }}>
                                +{alteracoesPreview.length - 8} ajustes adicionais entram na planilha.
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {erroAcao && <AlertaErro>{erroAcao}</AlertaErro>}

                    {sucesso?.arquivo && (
                      <div style={{ border: '1px solid #b7ead2', borderRadius: 14, background: '#ecfdf5', padding: 12, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 9, alignItems: 'center', minWidth: 0 }}>
                          <CheckCircle2 size={18} color="#0f7b58" strokeWidth={2.5} />
                          <div>
                            <div style={{ color: '#0f7b58', fontSize: 13, fontWeight: 900 }}>Planilha atualizada</div>
                            <div style={{ color: '#49796a', fontSize: 11 }}>{sucesso.alteracoes_count} ajuste{sucesso.alteracoes_count === 1 ? '' : 's'} salvo{sucesso.alteracoes_count === 1 ? '' : 's'} em Meus Catálogos.</div>
                          </div>
                        </div>
                        <button type="button" onClick={() => baixarArquivo(sucesso.arquivo?.path)} disabled={baixando} style={botaoPrimario(false)}>
                          {baixando ? <Loader2 size={15} className="send-spinner" /> : <Download size={15} strokeWidth={2.4} />}
                          Baixar planilha
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => baixarArquivo(catalogo.arquivo_path ?? undefined)} disabled={!catalogo.arquivo_path || baixando} style={botaoSecundario()}>
                        {baixando ? <Loader2 size={15} className="send-spinner" /> : <Download size={15} strokeWidth={2.4} />}
                        Baixar planilha atual
                      </button>
                      <button
                        type="button"
                        onClick={gerarPlanilha}
                        disabled={!podeGerarPlanilha}
                        title={dicaGerarPlanilha}
                        aria-label={dicaGerarPlanilha}
                        style={botaoPrimario(!podeGerarPlanilha)}
                      >
                        {salvando ? <Loader2 size={15} className="send-spinner" /> : <RefreshCw size={15} strokeWidth={2.4} />}
                        {salvando ? 'Gerando' : 'Gerar planilha ajustada'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      </main>
    </>
  )
}

function ResumoMetric({ label, value, destaque, compact }: { label: string; value: string | number; destaque?: boolean; compact?: boolean }) {
  return (
    <div style={{
      border: '1px solid #dfe7f1',
      borderRadius: compact ? 12 : 14,
      background: '#fff',
      padding: compact ? '9px 10px' : '12px 14px',
      boxShadow: compact ? 'none' : '0 8px 20px rgba(15,23,42,0.04)',
      minWidth: 0,
    }}>
      <div style={{ color: '#697386', fontSize: 11, fontWeight: 850, marginBottom: 4 }}>{label}</div>
      <div style={{ color: destaque ? '#b42318' : '#182233', fontSize: compact ? 13 : 18, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  )
}

function EstadoVazio() {
  return (
    <div style={{ border: '1px solid #dfe7f1', borderRadius: 18, background: '#fff', padding: '56px 24px', textAlign: 'center', boxShadow: '0 12px 32px rgba(15,23,42,0.06)' }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, background: '#eaf2ff', color: '#155bd5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <FileSpreadsheet size={26} strokeWidth={2.2} />
      </div>
      <div style={{ color: '#182233', fontSize: 18, fontWeight: 900, marginBottom: 6 }}>Nenhum catálogo disponível</div>
      <div style={{ color: '#697386', fontSize: 13 }}>Gere um cadastro pelo chat para começar a ajustar preços.</div>
    </div>
  )
}

function AlertaErro({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #f7b4ad', borderRadius: 13, background: '#fff1f0', color: '#b42318', padding: '10px 12px', fontSize: 12, fontWeight: 800, display: 'flex', gap: 8, alignItems: 'center' }}>
      <AlertCircle size={15} strokeWidth={2.4} />
      {children}
    </div>
  )
}

function label() {
  return { color: '#586174', fontSize: 11, fontWeight: 850, marginBottom: 7 }
}

function inputShell() {
  return { display: 'flex', alignItems: 'center', border: '1px solid #dfe7f1', borderRadius: 12, background: '#fff', overflow: 'hidden' }
}

function input() {
  return {
    minWidth: 0,
    flex: 1,
    border: 'none',
    outline: 'none',
    padding: '10px',
    fontSize: 13,
    color: '#182233',
    fontWeight: 850,
    fontFamily: 'inherit',
  }
}

function botaoSecundario() {
  return {
    border: '1px solid #dfe7f1',
    background: '#fff',
    color: '#586174',
    borderRadius: 999,
    padding: '9px 14px',
    fontSize: 13,
    fontWeight: 850,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  }
}

function botaoTexto() {
  return {
    border: '1px solid #dfe7f1',
    background: '#fff',
    color: '#155bd5',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 850,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}

function botaoPrimario(disabled: boolean) {
  return {
    border: 'none',
    background: disabled ? '#9aa0a6' : '#155bd5',
    color: '#fff',
    borderRadius: 999,
    padding: '9px 15px',
    fontSize: 13,
    fontWeight: 900,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: disabled ? 'none' : '0 9px 20px rgba(26,115,232,0.18)',
  }
}
