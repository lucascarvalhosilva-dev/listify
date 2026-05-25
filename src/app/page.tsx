'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Paperclip } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ChatFileAttachment from '@/components/ChatFileAttachment'
import SeletorCanais from '@/components/SeletorCanais'
import CardDownloadArquivo from '@/components/CardDownloadArquivo'
import CardEnvioDrive from '@/components/CardEnvioDrive'
import Navbar from './components/Navbar'
import ReactMarkdown from 'react-markdown'

const CANAL_LABELS: Record<string, string> = {
  shopee: 'Shopee',
  mercado_livre: 'Mercado Livre',
  amazon: 'Amazon',
  magalu: 'Magalu',
  tiktok_shop: 'TikTok Shop',
  bling: 'Bling',
}

type Botao = {
  acao: 'redirect' | 'mensagem' | 'download' | 'upload' | 'selector_canais' | 'card_download_arquivo' | 'card_envio_drive' | 'botao_ajuda_upload'
  texto?: string
  destino?: string
  valor?: string
  url?: string
  sessao_id?: string
  path?: string
  canal?: string
  nome_canal_label?: string
  tamanho_bytes?: number
}
type Mensagem = { papel: 'user' | 'assistant'; conteudo: string; acoes_rapidas?: { botoes: Botao[] } | null; temporaria?: boolean; isWelcome?: boolean }

const MENSAGEM_RETOMADA: Record<string, string> = {
  aguardando_planilha: 'Notei que você começou um cadastro, mas ainda não enviou a planilha. Quer continuar de onde parou ou começar do zero?',
  validando_planilha: 'Sua última planilha está em análise. Você pode reenviar o arquivo se preferir.',
  aguardando_drive: 'Você estava na etapa de envio do link do Google Drive com as fotos dos produtos. Pode me enviar agora?',
  validando_drive: 'Estava validando o link do Drive que você enviou. Pode reenviar o link se preferir.',
  processando: 'Sua geração está em andamento. Acompanhe aqui no chat ou aguarde a conclusão.',
}

function parsearArquivoDaMensagem(conteudo: string): { nome: string; tamanho: number } | null {
  if (!conteudo.startsWith('[PLANILHA_ENVIADA:')) return null
  try {
    const jsonStr = conteudo.replace(/^\[PLANILHA_ENVIADA:\s*/, '').replace(/\]$/, '').trim()
    return JSON.parse(jsonStr)
  } catch {
    return null
  }
}

export default function ChatPrincipal() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erroUpload, setErroUpload] = useState('')
  const [nome, setNome] = useState('')
  const [primeiraMensagem, setPrimeiraMensagem] = useState(false)
  const [urlsClicadas, setUrlsClicadas] = useState<Set<string>>(new Set())
  const [botoesIniciaisAtivos, setBotoesIniciaisAtivos] = useState(false)
  const [clicadosInicial, setClicadosInicial] = useState<Set<number>>(new Set())
  const [sessaoId, setSessaoId] = useState<string | null>(null)
  const [canaisAlvo, setCanaisAlvo] = useState<string[]>([])
  const messagesRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/sobre'); return }

      const perfilRes = await fetch('/api/get-profile')
      const perfil = await perfilRes.json()
      const nomeUser = perfil.nome || (perfil.email ? perfil.email.split('@')[0] : 'você')
      setNome(nomeUser)

      const histRes = await fetch('/api/chat-historico')
      const { historico, temSessaoAtiva, etapaAtiva, sessaoId: sid, canaisAlvo: ca } = await histRes.json()
      if (sid) setSessaoId(sid)
      if (ca?.length > 0) setCanaisAlvo(ca)

      if (historico && historico.length > 0) {
        setMensagens(historico)
      } else if (temSessaoAtiva && etapaAtiva) {
        const textoRetomada = MENSAGEM_RETOMADA[etapaAtiva] ??
          'Notei que você tem uma sessão em andamento. Quer continuar ou começar do zero?'
        const retomada: Mensagem = {
          papel: 'assistant',
          conteudo: textoRetomada,
          acoes_rapidas: {
            botoes: [
              { texto: 'Continuar de onde parei', acao: 'mensagem', valor: 'Quero continuar o cadastro' },
              { texto: 'Começar do zero', acao: 'mensagem', valor: 'Quero cancelar e começar do zero' },
            ],
          },
        }
        setMensagens([retomada])
      } else {
        const saudacao: Mensagem = {
          papel: 'assistant',
          conteudo: `Olá, ${nomeUser}! Eu sou a IA do Guiamos. Estou aqui para te ajudar a cadastrar seus produtos em marketplaces de forma rápida e automatizada.\n\nO que você quer fazer hoje?`,
          isWelcome: true,
          acoes_rapidas: {
            botoes: [
              { texto: 'Cadastrar produtos', acao: 'mensagem', valor: 'quero cadastrar produtos' },
              { texto: 'Ver meus catálogos', acao: 'redirect', destino: '/painel?aba=catalogos' },
              { texto: 'Tirar uma dúvida', acao: 'mensagem', valor: 'Tenho uma dúvida' },
              { texto: 'Ver meu plano', acao: 'redirect', destino: '/configuracoes' },
            ],
          },
        }
        setMensagens([saudacao])
        setBotoesIniciaisAtivos(true)
        setPrimeiraMensagem(true)
      }
    }
    init()
  }, [])

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensagens])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 10 * 1024 * 1024) {
      setErroUpload('Arquivo muito grande. Limite máximo: 10 MB.')
      return
    }
    setErroUpload('')
    setArquivo(f)
  }

  const enviar = async (texto?: string) => {
    const ocupado = carregando || uploadando
    if (ocupado) return

    if (arquivo) {
      const arq = arquivo
      const marcador = `[PLANILHA_ENVIADA: ${JSON.stringify({ nome: arq.name, tamanho: arq.size })}]`
      const historicoSnapshot = mensagens.map(m => ({ papel: m.papel, conteudo: m.conteudo }))

      setArquivo(null)
      setInput('')
      setUploadando(true)
      setBotoesIniciaisAtivos(false)
      setMensagens(prev => [...prev, { papel: 'user', conteudo: marcador }])

      try {
        const fd = new FormData()
        fd.append('arquivo', arq)
        const upRes = await fetch('/api/chat-upload', { method: 'POST', body: fd })
        const upData = await upRes.json()

        if (!upRes.ok) {
          setMensagens(prev => [...prev, {
            papel: 'assistant',
            conteudo: `Não consegui receber o arquivo: ${upData.error ?? 'Erro desconhecido'}. Tenta novamente?`,
          }])
          return
        }

        setUploadando(false)
        setCarregando(true)

        setMensagens(prev => [...prev, { papel: 'assistant', conteudo: 'Analisando sua planilha...', temporaria: true }])

        const valRes = await fetch('/api/validar-planilha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessao_id: upData.sessao_id }),
        })
        const valData = await valRes.json()

        setMensagens(prev => prev.filter(m => !m.temporaria))

        let mensagemInterna: string
        if (!valRes.ok || !valData.sucesso) {
          mensagemInterna = '[VALIDACAO_ERRO: Erro interno ao validar a planilha. Tente reenviar o arquivo.]'
        } else if (valData.valida) {
          mensagemInterna = `[VALIDACAO_OK: ${valData.total_produtos} produtos]`
        } else {
          mensagemInterna = `[VALIDACAO_ERRO: ${valData.erros_resumo}]`
        }

        const historicoComArquivo = [...historicoSnapshot, { papel: 'user', conteudo: marcador }]
        const res = await fetch('/api/chat-principal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mensagem: mensagemInterna, historico: historicoComArquivo }),
        })
        const data = await res.json()

        setMensagens(prev => [...prev, {
          papel: 'assistant',
          conteudo: data.resposta,
          acoes_rapidas: data.acoes,
        }])
        setPrimeiraMensagem(false)
      } catch {
        setMensagens(prev => [
          ...prev.filter(m => !m.temporaria),
          { papel: 'assistant', conteudo: 'Tive um problema ao processar o arquivo. Tenta novamente?' },
        ])
      } finally {
        setCarregando(false)
        setUploadando(false)
      }
      return
    }

    const mensagem = texto || input.trim()
    if (!mensagem) return

    setInput('')
    setCarregando(true)
    setBotoesIniciaisAtivos(false)
    setMensagens(prev => [...prev, { papel: 'user', conteudo: mensagem }])

    try {
      const historicoEnvio = primeiraMensagem ? [] : mensagens.map(m => ({ papel: m.papel, conteudo: m.conteudo }))
      const res = await fetch('/api/chat-principal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem, historico: historicoEnvio }),
      })
      const data = await res.json()

      if (data.recarregar_historico) {
        // Geração concluída: gerar-do-chat já inseriu a mensagem de sucesso no histórico.
        // Recarregar para exibir "processando" + "🎉 Pronto!" como mensagens separadas.
        const histRes = await fetch('/api/chat-historico')
        const { historico: novoHistorico } = await histRes.json()
        if (novoHistorico?.length > 0) {
          setMensagens(novoHistorico)
        }
      } else {
        setMensagens(prev => [...prev, {
          papel: 'assistant',
          conteudo: data.resposta,
          acoes_rapidas: data.acoes,
        }])
      }
      setPrimeiraMensagem(false)
    } catch {
      setMensagens(prev => [...prev, { papel: 'assistant', conteudo: 'Tive um problema para responder. Tenta novamente?' }])
    } finally {
      setCarregando(false)
    }
  }

  const clicarBotao = (botao: Botao, indiceInicial?: number) => {
    if (indiceInicial !== undefined) {
      setClicadosInicial(prev => new Set([...prev, indiceInicial]))
    }
    if (botao.acao === 'redirect' && botao.destino) {
      router.push(botao.destino)
    } else if (botao.acao === 'mensagem' && botao.valor) {
      enviar(botao.valor)
    } else if (botao.acao === 'download' && botao.url) {
      const jaClicado = urlsClicadas.has(botao.url)
      window.open(botao.url, '_blank')
      if (!jaClicado) {
        setUrlsClicadas(prev => new Set([...prev, botao.url!]))
        const formato = botao.url!.toLowerCase().includes('.csv') ? 'CSV' : 'Excel'
        enviar(`Baixei o template em ${formato} e estou preenchendo.`)
      }
    } else if (botao.acao === 'upload') {
      setErroUpload('')
      fileInputRef.current?.click()
    } else if (botao.acao === 'botao_ajuda_upload' && botao.nome_canal_label) {
      enviar(`Como subir no ${botao.nome_canal_label}?`)
    }
  }

  const ocupado = carregando || uploadando
  const podeSend = !ocupado && (!!arquivo || !!input.trim())

  return (
    <>
      <Navbar />
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f8f9fa; color: #202124; overflow: hidden; }
        .app { display: flex; flex-direction: column; height: calc(100vh - 60px); background: #f8f9fa; }
        .chat-wrap { flex: 1; display: flex; flex-direction: column; max-width: 760px; width: 100%; margin: 0 auto; padding: 24px 24px 0; overflow: hidden; }
        .messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; padding-bottom: 16px; }
        .msg-ai { display: flex; gap: 12px; align-items: flex-start; }
        .bot { width: 32px; height: 32px; border-radius: 50%; background: #1a73e8; color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .bubble { background: #fff; border: 1px solid #e8eaed; border-radius: 16px; border-top-left-radius: 4px; padding: 14px 18px; font-size: 15px; font-family: 'Plus Jakarta Sans', sans-serif; color: #202124; line-height: 1.65; max-width: 520px; }
        .bubble p { margin-bottom: 8px; }
        .bubble p:last-child { margin-bottom: 0; }
        .bubble ul, .bubble ol { padding-left: 20px; margin-bottom: 8px; }
        .bubble li { margin-bottom: 4px; line-height: 1.65; }
        .bubble strong { font-weight: 600; }
        .bubble em { font-style: italic; }
        .bubble a { color: #1a73e8; text-decoration: none; }
        .bubble a:hover { text-decoration: underline; }
        .bubble code { font-family: ui-monospace, monospace; background: #f1f3f4; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
        .bubble h1 { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
        .bubble h2 { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
        .bubble h3 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
        .msg-user { display: flex; justify-content: flex-end; }
        .bubble-user { background: #1a73e8; color: #fff; border-radius: 16px; border-top-right-radius: 4px; padding: 12px 18px; font-size: 14px; max-width: 380px; }
        .quick-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; margin-left: 44px; }
        .quick-btn { background: #fff; border: 1px solid #1a73e8; color: #1a73e8; font-size: 13px; font-weight: 500; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-family: inherit; }
        .quick-btn:hover { background: #e8f0fe; }
        .quick-btn-download { background: #1a73e8; border: 1px solid #1a73e8; color: #fff; font-size: 13px; font-weight: 500; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-family: inherit; }
        .quick-btn-download:hover { background: #1557b0; }
        .quick-btn-download-usado { background: #fff; border: 1px solid #d1d5db; color: #6b7280; font-size: 13px; font-weight: 500; padding: 8px 16px; border-radius: 20px; cursor: default; font-family: inherit; }
        .quick-btn-upload { background: #1a73e8; border: 1px solid #1a73e8; color: #fff; font-size: 14px; font-weight: 600; padding: 10px 24px; border-radius: 20px; cursor: pointer; font-family: inherit; flex-basis: 100%; }
        .quick-btn-upload:hover { background: #1557b0; }
        .typing { display: flex; gap: 6px; padding: 14px 18px; background: #fff; border: 1px solid #e8eaed; border-radius: 16px; border-top-left-radius: 4px; width: fit-content; }
        .typing span { width: 6px; height: 6px; background: #9aa0a6; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
        .typing span:nth-child(1) { animation-delay: -0.32s; }
        .typing span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
        .input-area { padding: 16px 0 20px; border-top: 1px solid #e8eaed; background: #f8f9fa; }
        .file-preview { margin-bottom: 8px; }
        .erro-upload { font-size: 12px; color: #ea4335; margin-bottom: 6px; }
        .input-box { background: #fff; border: 1px solid #e8eaed; border-radius: 16px; display: flex; align-items: center; padding: 6px 6px 6px 8px; gap: 4px; }
        .clip-btn { background: none; border: none; cursor: pointer; color: #9aa0a6; padding: 6px 8px; display: flex; align-items: center; border-radius: 8px; flex-shrink: 0; }
        .clip-btn:hover:not(:disabled) { color: #1a73e8; background: #f0f4ff; }
        .clip-btn:disabled { cursor: not-allowed; opacity: 0.5; }
        .input-box input { flex: 1; border: none; outline: none; font-size: 14px; color: #202124; font-family: inherit; padding: 10px 6px; background: transparent; }
        .send-btn { background: #1a73e8; color: #fff; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .send-btn:disabled { background: #9aa0a6; cursor: not-allowed; }
        .hint { font-size: 11px; color: #9aa0a6; text-align: center; margin-top: 8px; }
      `}</style>

      <div className="app">
        <div className="chat-wrap">
          <div className="messages" ref={messagesRef}>
            {mensagens.map((m, i) => {
              if (m.papel === 'user') {
                const arqInfo = parsearArquivoDaMensagem(m.conteudo)
                return (
                  <div key={i} className="msg-user">
                    {arqInfo
                      ? <ChatFileAttachment nome={arqInfo.nome} tamanho={arqInfo.tamanho} />
                      : <div className="bubble-user">{m.conteudo}</div>
                    }
                  </div>
                )
              }
              return (
                <div key={i} className="msg-ai">
                  <div className="bot">G</div>
                  <div>
                    <div className="bubble"><ReactMarkdown>{m.conteudo}</ReactMarkdown></div>
                    {m.acoes_rapidas?.botoes && (!m.isWelcome || botoesIniciaisAtivos) && (
                      m.acoes_rapidas.botoes.some(b => b.acao === 'card_download_arquivo') ? (
                        <div style={{ marginTop: 12, marginLeft: 44 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                            {m.acoes_rapidas.botoes
                              .filter(b => b.acao === 'card_download_arquivo')
                              .map((b, j) => (
                                <CardDownloadArquivo
                                  key={j}
                                  path={b.path!}
                                  canal={b.canal!}
                                  nome_canal_label={b.nome_canal_label!}
                                  tamanho_bytes={b.tamanho_bytes!}
                                />
                              ))
                            }
                          </div>
                          {m.acoes_rapidas.botoes.some(b => b.acao !== 'card_download_arquivo') && (
                            <div className="quick-actions" style={{ marginLeft: 0 }}>
                              {m.acoes_rapidas.botoes
                                .filter(b => b.acao !== 'card_download_arquivo')
                                .map((b, j) => (
                                  <button key={j} className="quick-btn" onClick={() => clicarBotao(b)}>
                                    {b.acao === 'botao_ajuda_upload'
                                      ? (b.texto ?? `📚 Como subir no ${b.nome_canal_label}?`)
                                      : b.texto}
                                  </button>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      ) : m.acoes_rapidas.botoes.some(b => b.acao === 'card_envio_drive') ? (
                        <div style={{ marginTop: 12, marginLeft: 44 }}>
                          {m.acoes_rapidas.botoes
                            .filter(b => b.acao === 'card_envio_drive')
                            .slice(0, 1)
                            .map((b, j) => (
                              <CardEnvioDrive
                                key={j}
                                valorInicial={b.valor}
                                onEnviar={(url) => enviar(url)}
                              />
                            ))
                          }
                          {m.acoes_rapidas.botoes.some(b => b.acao !== 'card_envio_drive') && (
                            <div className="quick-actions" style={{ marginLeft: 0, marginTop: 8 }}>
                              {m.acoes_rapidas.botoes
                                .filter(b => b.acao !== 'card_envio_drive')
                                .map((b, j) => (
                                  <button key={j} className="quick-btn" onClick={() => clicarBotao(b)}>
                                    {b.texto}
                                  </button>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      ) : m.acoes_rapidas.botoes.some(b => b.acao === 'selector_canais') ? (
                        m.acoes_rapidas.botoes
                          .filter(b => b.acao === 'selector_canais')
                          .map((b, j) => (
                            <SeletorCanais
                              key={j}
                              sessaoId={b.sessao_id ?? sessaoId ?? ''}
                              onConfirmar={(canais) => {
                                setCanaisAlvo(canais)
                                const labels = canais.map(c => CANAL_LABELS[c] ?? c).join(', ')
                                enviar(`Canais escolhidos: ${labels}`)
                              }}
                              valorInicial={canaisAlvo}
                            />
                          ))
                      ) : (
                        <div className="quick-actions">
                          {m.acoes_rapidas.botoes.map((b, j) => {
                            if (m.isWelcome) {
                              const clicado = clicadosInicial.has(j)
                              return (
                                <button
                                  key={j}
                                  className={clicado ? 'quick-btn-download-usado' : 'quick-btn'}
                                  onClick={() => clicarBotao(b, j)}
                                >
                                  {clicado ? `✓ ${b.texto}` : b.texto}
                                </button>
                              )
                            }
                            if (b.acao === 'upload') {
                              return (
                                <button key={j} className="quick-btn-upload" onClick={() => clicarBotao(b)}>
                                  {b.texto}
                                </button>
                              )
                            }
                            if (b.acao === 'download') {
                              const usado = !!b.url && urlsClicadas.has(b.url)
                              return (
                                <button
                                  key={j}
                                  className={usado ? 'quick-btn-download-usado' : 'quick-btn-download'}
                                  onClick={() => clicarBotao(b)}
                                  disabled={usado}
                                >
                                  {usado ? `✓ ${b.texto}` : `↓ ${b.texto}`}
                                </button>
                              )
                            }
                            return (
                              <button key={j} className="quick-btn" onClick={() => clicarBotao(b)}>
                                {b.texto}
                              </button>
                            )
                          })}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            })}
            {ocupado && (
              <div className="msg-ai">
                <div className="bot">G</div>
                <div className="typing"><span></span><span></span><span></span></div>
              </div>
            )}
          </div>

          <div className="input-area">
            {erroUpload && <div className="erro-upload">{erroUpload}</div>}
            {arquivo && (
              <div className="file-preview">
                <ChatFileAttachment nome={arquivo.name} tamanho={arquivo.size} onRemover={() => setArquivo(null)} />
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <div className="input-box">
              <button
                className="clip-btn"
                onClick={() => { setErroUpload(''); fileInputRef.current?.click() }}
                disabled={ocupado}
                title="Anexar planilha (.xlsx, .xls, .csv)"
              >
                <Paperclip size={18} />
              </button>
              <input
                type="text"
                placeholder={arquivo ? 'Pressione enviar para fazer o upload…' : 'Pergunte qualquer coisa ou descreva o que quer fazer...'}
                value={arquivo ? '' : input}
                onChange={e => !arquivo && setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enviar()}
                disabled={ocupado}
              />
              <button className="send-btn" onClick={() => enviar()} disabled={!podeSend}>
                {uploadando ? '⏳' : '↑'}
              </button>
            </div>
            <div className="hint">A IA pode cometer erros · Sempre revise as informações importantes</div>
          </div>
        </div>
      </div>
    </>
  )
}
