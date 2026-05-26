'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { Archive, MessageSquarePlus, Pencil, RotateCcw, Search } from 'lucide-react'
import { formatarDataHoraCurta, formatarDataRelativa } from '@/lib/data'

type Conversa = {
  id: string
  titulo: string | null
  criada_em: string
  atualizada_em: string
  arquivada?: boolean
}

type SidebarConversasProps = {
  conversaId: string | null
  onSelectConversa: (id: string) => void
  onNovaConversa: () => void
}

export type SidebarConversasRef = {
  refetchConversas: () => Promise<void>
}

function tituloConversa(conversa: Conversa) {
  const titulo = conversa.titulo?.trim()
  if (titulo) return titulo

  return `Conversa de ${formatarDataHoraCurta(conversa.criada_em)}`
}

function normalizarBusca(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function inicioDoDia(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function grupoDaConversa(dataIso: string) {
  const data = new Date(dataIso)
  if (Number.isNaN(data.getTime())) return 'Mais antigas'

  const hoje = inicioDoDia()
  const inicio = inicioDoDia(data)
  const diffDias = Math.floor((hoje.getTime() - inicio.getTime()) / 86400000)

  if (diffDias <= 0) return 'Hoje'
  if (diffDias === 1) return 'Ontem'
  if (diffDias < 7) return 'Esta semana'
  return 'Mais antigas'
}

const GRUPOS_ORDEM = ['Hoje', 'Ontem', 'Esta semana', 'Mais antigas']

const SidebarConversas = forwardRef<SidebarConversasRef, SidebarConversasProps>(function SidebarConversas(
  { conversaId, onSelectConversa, onNovaConversa },
  ref
) {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [renomeandoId, setRenomeandoId] = useState<string | null>(null)
  const [tituloEditando, setTituloEditando] = useState('')
  const [busca, setBusca] = useState('')
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false)

  const carregarConversas = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const url = mostrarArquivadas ? '/api/conversas?arquivadas=1' : '/api/conversas'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Erro ao carregar conversas')

      const data = await res.json() as Conversa[]
      setConversas(Array.isArray(data) ? data : [])
    } catch {
      setErro('Erro ao carregar conversas. Tentar novamente.')
    } finally {
      setCarregando(false)
    }
  }, [mostrarArquivadas])

  useImperativeHandle(ref, () => ({
    refetchConversas: carregarConversas,
  }), [carregarConversas])

  useEffect(() => {
    void carregarConversas()
  }, [carregarConversas])

  const conversasFiltradas = useMemo(() => {
    const termo = normalizarBusca(busca)
    if (!termo) return conversas

    return conversas.filter(conversa => (
      normalizarBusca(tituloConversa(conversa)).includes(termo)
    ))
  }, [busca, conversas])

  const grupos = useMemo(() => (
    GRUPOS_ORDEM
      .map(nome => ({
        nome,
        conversas: conversasFiltradas.filter(conversa => grupoDaConversa(conversa.atualizada_em) === nome),
      }))
      .filter(grupo => grupo.conversas.length > 0)
  ), [conversasFiltradas])

  function iniciarRenomeacao(conversa: Conversa) {
    setRenomeandoId(conversa.id)
    setTituloEditando(tituloConversa(conversa))
  }

  function cancelarRenomeacao() {
    setRenomeandoId(null)
    setTituloEditando('')
  }

  async function finalizarRenomeacao(conversa: Conversa) {
    if (renomeandoId !== conversa.id) return

    const tituloAnterior = conversa.titulo
    const tituloExibidoAnterior = tituloConversa(conversa)
    const novoTitulo = tituloEditando.trim().slice(0, 60)
    setRenomeandoId(null)
    setTituloEditando('')

    if (!novoTitulo || novoTitulo === tituloExibidoAnterior || novoTitulo === (tituloAnterior ?? '')) return

    setConversas(prev => prev.map(item => (
      item.id === conversa.id ? { ...item, titulo: novoTitulo } : item
    )))

    try {
      const res = await fetch(`/api/conversas/${conversa.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: novoTitulo }),
      })
      if (!res.ok) throw new Error('Erro ao renomear')

      const atualizado = await res.json() as Partial<Conversa>
      setConversas(prev => prev.map(item => (
        item.id === conversa.id
          ? { ...item, titulo: atualizado.titulo ?? novoTitulo, atualizada_em: atualizado.atualizada_em ?? item.atualizada_em }
          : item
      )))
    } catch {
      setConversas(prev => prev.map(item => (
        item.id === conversa.id ? { ...item, titulo: tituloAnterior } : item
      )))
      setErro('Não consegui renomear a conversa.')
    }
  }

  async function arquivarConversa(conversa: Conversa) {
    if (!window.confirm('Arquivar esta conversa?')) return

    const listaAnterior = conversas
    setConversas(prev => prev.filter(item => item.id !== conversa.id))
    setErro('')

    try {
      const res = await fetch(`/api/conversas/${conversa.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao arquivar')
    } catch {
      setConversas(listaAnterior)
      setErro('Não consegui arquivar a conversa.')
    }
  }

  async function restaurarConversa(conversa: Conversa) {
    const listaAnterior = conversas
    setConversas(prev => prev.filter(item => item.id !== conversa.id))
    setErro('')

    try {
      const res = await fetch(`/api/conversas/${conversa.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arquivada: false }),
      })
      if (!res.ok) throw new Error('Erro ao restaurar')
    } catch {
      setConversas(listaAnterior)
      setErro('Não consegui restaurar a conversa.')
    }
  }

  function trocarFiltroArquivadas(proximoValor: boolean) {
    setMostrarArquivadas(proximoValor)
    setBusca('')
    setRenomeandoId(null)
    setTituloEditando('')
  }

  const temBusca = busca.trim().length > 0
  const textoVazio = temBusca
    ? mostrarArquivadas
      ? 'Nenhuma conversa arquivada encontrada'
      : 'Nenhuma conversa ativa encontrada'
    : mostrarArquivadas
      ? 'Nenhuma conversa arquivada'
      : 'Suas conversas vão aparecer aqui'

  return (
    <aside className="sidebar-conversas" aria-label="Conversas">
      <style>{`
        .sidebar-conversas {
          width: 240px;
          flex-shrink: 0;
          height: calc(100vh - 64px);
          border-right: 1px solid #dfe7f1;
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(18px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 1px 0 0 rgba(15,23,42,0.02);
        }
        .sidebar-conversas-header {
          padding: 14px 12px 12px;
          border-bottom: 1px solid #e8edf4;
        }
        .sidebar-nova-conversa {
          width: 100%;
          min-height: 40px;
          border: 1px solid #1a73e8;
          background: linear-gradient(135deg, #1a73e8 0%, #155bd5 100%);
          color: #fff;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 10px 22px rgba(26,115,232,0.18);
          transition: transform .18s, box-shadow .18s, filter .18s;
        }
        .sidebar-nova-conversa:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(26,115,232,0.22);
          filter: brightness(0.98);
        }
        .sidebar-filtros {
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin-top: 12px;
        }
        .sidebar-busca {
          min-height: 36px;
          border: 1px solid #dce6f3;
          border-radius: 11px;
          background: #fff;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
          color: #697386;
        }
        .sidebar-busca input {
          min-width: 0;
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          color: #263241;
          font-family: inherit;
          font-size: 12px;
        }
        .sidebar-segmentado {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          padding: 3px;
          border-radius: 11px;
          background: #eef3f8;
        }
        .sidebar-segmentado button {
          min-height: 28px;
          border: none;
          border-radius: 9px;
          background: transparent;
          color: #697386;
          font-family: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: background .15s, color .15s, box-shadow .15s;
        }
        .sidebar-segmentado button.ativo {
          background: #fff;
          color: #155bd5;
          box-shadow: 0 4px 12px rgba(15,23,42,0.08);
        }
        .sidebar-conversas-lista {
          flex: 1;
          overflow-y: auto;
          padding: 10px 8px 14px;
        }
        .sidebar-grupo {
          margin-bottom: 12px;
        }
        .sidebar-grupo-label {
          padding: 8px 10px 5px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #8a94a6;
        }
        .conversa-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          min-height: 50px;
          padding: 8px 9px 8px 10px;
          border-radius: 12px;
          cursor: pointer;
          color: #263241;
          transition: background .15s, color .15s, box-shadow .15s;
          outline: none;
        }
        .conversa-item:hover,
        .conversa-item:focus-visible {
          background: #f4f7fb;
          color: #155bd5;
        }
        .conversa-item.ativa {
          background: #eaf2ff;
          color: #155bd5;
          box-shadow: inset 0 0 0 1px rgba(26,115,232,0.12), 0 6px 18px rgba(26,115,232,0.10);
        }
        .conversa-item.arquivada {
          cursor: default;
        }
        .conversa-info {
          min-width: 0;
          flex: 1;
        }
        .conversa-titulo {
          font-size: 13px;
          font-weight: 800;
          line-height: 1.35;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .conversa-data {
          font-size: 11px;
          color: #697386;
          margin-top: 2px;
        }
        .conversa-item.ativa .conversa-data {
          color: #4078d8;
        }
        .conversa-acoes {
          display: flex;
          align-items: center;
          gap: 2px;
          opacity: 0;
          pointer-events: none;
          transition: opacity .15s;
        }
        .conversa-item:hover .conversa-acoes,
        .conversa-item:focus-within .conversa-acoes {
          opacity: 1;
          pointer-events: auto;
        }
        .conversa-acao {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 9px;
          background: transparent;
          color: #697386;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background .15s, color .15s;
        }
        .conversa-acao:hover {
          background: #ffffff;
          color: #155bd5;
        }
        .conversa-acao-danger:hover {
          color: #c5221f;
          background: #fef2f2;
        }
        .conversa-input {
          width: 100%;
          border: 1px solid #9ec1ff;
          background: #ffffff;
          color: #182233;
          border-radius: 9px;
          padding: 6px 8px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          outline: none;
          box-shadow: 0 0 0 3px rgba(26,115,232,0.10);
        }
        .sidebar-empty,
        .sidebar-error {
          margin: 26px 10px 0;
          padding: 18px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: rgba(255,255,255,0.72);
          color: #697386;
          text-align: center;
          font-size: 13px;
          line-height: 1.5;
        }
        .sidebar-error button {
          margin-top: 10px;
          border: 1px solid #c9d9f3;
          background: #f8fbff;
          color: #155bd5;
          border-radius: 10px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
        }
        .sidebar-skeleton {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 2px 2px;
        }
        .sidebar-skeleton-item {
          height: 50px;
          border-radius: 12px;
          background: linear-gradient(90deg, #eef3f8 0%, #f8fafc 50%, #eef3f8 100%);
          background-size: 200% 100%;
          animation: sidebar-skeleton 1.2s ease-in-out infinite;
        }
        @keyframes sidebar-skeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (max-width: 1023px) {
          .sidebar-conversas {
            position: fixed;
            top: 64px;
            left: 0;
            bottom: 0;
            height: calc(100vh - 64px);
            width: 320px;
            z-index: 90;
            transform: translateX(-105%);
            transition: transform .22s ease;
            box-shadow: 24px 0 60px rgba(15,23,42,0.22);
          }
          .app.sidebar-open .sidebar-conversas {
            transform: translateX(0);
          }
        }
        @media (max-width: 767px) {
          .sidebar-conversas {
            width: 85vw;
          }
        }
      `}</style>

      <div className="sidebar-conversas-header">
        <button className="sidebar-nova-conversa" onClick={onNovaConversa}>
          <MessageSquarePlus size={16} strokeWidth={2.4} />
          Nova conversa
        </button>

        <div className="sidebar-filtros">
          <label className="sidebar-busca">
            <Search size={14} strokeWidth={2.2} />
            <input
              type="search"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar conversa"
            />
          </label>

          <div className="sidebar-segmentado" aria-label="Filtro de conversas">
            <button
              type="button"
              className={!mostrarArquivadas ? 'ativo' : ''}
              onClick={() => trocarFiltroArquivadas(false)}
            >
              Ativas
            </button>
            <button
              type="button"
              className={mostrarArquivadas ? 'ativo' : ''}
              onClick={() => trocarFiltroArquivadas(true)}
            >
              Arquivadas
            </button>
          </div>
        </div>
      </div>

      <div className="sidebar-conversas-lista">
        {carregando ? (
          <div className="sidebar-skeleton" aria-label="Carregando conversas">
            <div className="sidebar-skeleton-item" />
            <div className="sidebar-skeleton-item" />
            <div className="sidebar-skeleton-item" />
          </div>
        ) : erro && conversas.length === 0 ? (
          <div className="sidebar-error">
            {erro}
            <button onClick={() => void carregarConversas()}>Tentar novamente</button>
          </div>
        ) : conversasFiltradas.length === 0 ? (
          <div className="sidebar-empty">{textoVazio}</div>
        ) : (
          <>
            {erro && <div className="sidebar-error" style={{ marginBottom: 10 }}>{erro}</div>}
            {grupos.map(grupo => (
              <div className="sidebar-grupo" key={grupo.nome}>
                <div className="sidebar-grupo-label">{grupo.nome}</div>
                {grupo.conversas.map(conversa => {
                  const ativa = !mostrarArquivadas && conversa.id === conversaId
                  const editando = renomeandoId === conversa.id

                  return (
                    <div
                      key={conversa.id}
                      className={`conversa-item ${ativa ? 'ativa' : ''} ${mostrarArquivadas ? 'arquivada' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!editando && !mostrarArquivadas) onSelectConversa(conversa.id)
                      }}
                      onKeyDown={(e) => {
                        if (editando || mostrarArquivadas) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSelectConversa(conversa.id)
                        }
                      }}
                    >
                      <div className="conversa-info">
                        {editando ? (
                          <input
                            className="conversa-input"
                            value={tituloEditando}
                            autoFocus
                            onChange={e => setTituloEditando(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            onBlur={() => void finalizarRenomeacao(conversa)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                e.preventDefault()
                                cancelarRenomeacao()
                              } else if (e.key === 'Enter') {
                                e.preventDefault()
                                e.currentTarget.blur()
                              }
                            }}
                          />
                        ) : (
                          <>
                            <div className="conversa-titulo">{tituloConversa(conversa)}</div>
                            <div className="conversa-data">{formatarDataRelativa(conversa.atualizada_em)}</div>
                          </>
                        )}
                      </div>

                      {!editando && !mostrarArquivadas && (
                        <div className="conversa-acoes" aria-label="Acoes da conversa">
                          <button
                            className="conversa-acao"
                            title="Renomear"
                            onClick={(e) => {
                              e.stopPropagation()
                              iniciarRenomeacao(conversa)
                            }}
                          >
                            <Pencil size={14} strokeWidth={2.3} />
                          </button>
                          <button
                            className="conversa-acao conversa-acao-danger"
                            title="Arquivar"
                            onClick={(e) => {
                              e.stopPropagation()
                              void arquivarConversa(conversa)
                            }}
                          >
                            <Archive size={14} strokeWidth={2.3} />
                          </button>
                        </div>
                      )}

                      {!editando && mostrarArquivadas && (
                        <div className="conversa-acoes" aria-label="Acoes da conversa">
                          <button
                            className="conversa-acao"
                            title="Restaurar"
                            onClick={(e) => {
                              e.stopPropagation()
                              void restaurarConversa(conversa)
                            }}
                          >
                            <RotateCcw size={14} strokeWidth={2.3} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </aside>
  )
})

export default SidebarConversas
