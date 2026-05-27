'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, Loader2, PanelLeft, Paperclip } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ChatFileAttachment from '@/components/ChatFileAttachment'
import SeletorCanais from '@/components/SeletorCanais'
import CardDownloadArquivo from '@/components/CardDownloadArquivo'
import CardEnvioDrive from '@/components/CardEnvioDrive'
import CardPriceGuard, { type PriceGuardData } from '@/components/CardPriceGuard'
import CardComparadorListing, { type ComparadorListingData } from '@/components/CardComparadorListing'
import CardPublicacaoML from '@/components/CardPublicacaoML'
import CardUploadFotosML from '@/components/CardUploadFotosML'
import CardStatusConfianca, { type StatusConfianca } from '@/components/CardStatusConfianca'
import CardValidadorUpload from '@/components/CardValidadorUpload'
import MiniEditorPrecos, { type MensagemAjustePrecos } from '@/components/MiniEditorPrecos'
import SidebarConversas, { type SidebarConversasRef } from '@/components/SidebarConversas'
import Navbar from './components/Navbar'
import ReactMarkdown from 'react-markdown'
import type { ValidadorUploadData } from '@/lib/validador-pre-upload'
import type { PublicacaoMLCardData } from '@/lib/ml/publicacao-card'

const CANAL_LABELS: Record<string, string> = {
  shopee: 'Shopee',
  mercado_livre: 'Mercado Livre',
  amazon: 'Amazon',
  magalu: 'Magalu',
  tiktok_shop: 'TikTok Shop',
  bling: 'Bling',
}

type Botao = {
  acao: 'redirect' | 'mensagem' | 'download' | 'upload' | 'selector_canais' | 'card_download_arquivo' | 'card_envio_drive' | 'card_status_confianca' | 'card_price_guard' | 'card_validador_upload' | 'card_comparador_listing' | 'card_publicacao_ml' | 'card_upload_fotos_ml' | 'botao_ajuda_upload'
  texto?: string
  destino?: string
  valor?: string
  url?: string
  sessao_id?: string
  conversa_id?: string
  canais?: string[]
  path?: string
  canal?: string
  nome_canal_label?: string
  tamanho_bytes?: number
  status?: StatusConfianca
  titulo?: string
  resumo?: string
  total_produtos?: number
  produtos_processados?: number
  arquivos_gerados?: number
  canais_solicitados?: number
  alertas_count?: number
  campos_obrigatorios_ok?: boolean
  precos_calculados?: boolean
  drive_validado?: boolean
  alertas_preview?: string[]
  price_guard?: PriceGuardData
  validador_upload?: ValidadorUploadData
  comparador_listing?: ComparadorListingData
  publicacao_ml?: PublicacaoMLCardData
  produtos_preview?: ComparadorListingData['produtos_preview']
  produtos_com_titulo?: number
  produtos_com_descricao?: number
  produtos?: { sku: string; nome: string }[]
}
type Mensagem = { papel: 'user' | 'assistant'; conteudo: string; acoes_rapidas?: { botoes: Botao[] } | null; temporaria?: boolean; isWelcome?: boolean }
type HistoricoContexto = { papel: 'user' | 'assistant'; conteudo: string }

const HISTORICO_CONTEXTO_LIMITE = 12

const MENSAGEM_RETOMADA: Record<string, string> = {
  aguardando_planilha: 'Notei que você começou um cadastro, mas ainda não enviou o arquivo de produtos. Quer continuar de onde parou ou começar do zero?',
  validando_planilha: 'Seu último arquivo de produtos está em análise. Você pode reenviar o arquivo se preferir.',
  aguardando_drive: 'Você estava na etapa de envio do link do Google Drive com as fotos dos produtos. Pode me enviar agora?',
  validando_drive: 'Estava validando o link do Drive que você enviou. Pode reenviar o link se preferir.',
  processando: 'Sua geração está em andamento. Acompanhe aqui no chat ou aguarde a conclusão.',
}

function criarMensagemBoasVindas(nomeUser: string): Mensagem {
  return {
    papel: 'assistant',
    conteudo: `Olá, ${nomeUser}! Eu sou a IA do Guiamos. Estou aqui para te ajudar a cadastrar seus produtos em marketplaces de forma rápida e automatizada.\n\nO que você quer fazer hoje?`,
    isWelcome: true,
    acoes_rapidas: {
      botoes: [
        { texto: 'Cadastrar produtos', acao: 'mensagem', valor: 'quero cadastrar produtos' },
        { texto: 'Ver meus catálogos', acao: 'redirect', destino: '/painel?aba=catalogos' },
        { texto: 'Tirar uma dúvida', acao: 'mensagem', valor: 'Tenho uma dúvida' },
        { texto: 'Ajustar preços', acao: 'redirect', destino: '/precos' },
        { texto: 'Ver meu plano', acao: 'redirect', destino: '/upgrade' },
      ],
    },
  }
}

function parsearArquivoDaMensagem(conteudo: string): { nome: string; tamanho: number } | null {
  if (!conteudo.startsWith('[PLANILHA_ENVIADA:') && !conteudo.startsWith('[ARQUIVO_PRODUTOS_ENVIADO:')) return null
  try {
    const jsonStr = conteudo
      .replace(/^\[(PLANILHA_ENVIADA|ARQUIVO_PRODUTOS_ENVIADO):\s*/, '')
      .replace(/\]$/, '')
      .trim()
    return JSON.parse(jsonStr)
  } catch {
    return null
  }
}

function montarHistoricoContexto(mensagensBase: Mensagem[], limite = HISTORICO_CONTEXTO_LIMITE): HistoricoContexto[] {
  return mensagensBase
    .filter(m => !m.temporaria && !m.isWelcome && m.conteudo.trim().length > 0)
    .map(m => ({ papel: m.papel, conteudo: m.conteudo }))
    .slice(-limite)
}

async function carregarMensagensConversa(id: string): Promise<Mensagem[] | null> {
  const res = await fetch(`/api/conversas/${id}/mensagens`)
  if (!res.ok) return null

  const data = await res.json() as { mensagens?: Array<Mensagem & { id?: string; criado_em?: string }> }
  return (data.mensagens ?? []).map(m => ({
    papel: m.papel,
    conteudo: m.conteudo,
    acoes_rapidas: m.acoes_rapidas ?? null,
  }))
}

export default function ChatPrincipal() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [carregandoConversa, setCarregandoConversa] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erroUpload, setErroUpload] = useState('')
  const [nome, setNome] = useState('')
  const [primeiraMensagem, setPrimeiraMensagem] = useState(false)
  const [urlsClicadas, setUrlsClicadas] = useState<Set<string>>(new Set())
  const [botoesIniciaisAtivos, setBotoesIniciaisAtivos] = useState(false)
  const [clicadosInicial, setClicadosInicial] = useState<Set<number>>(new Set())
  const [sessaoId, setSessaoId] = useState<string | null>(null)
  const [conversaId, setConversaId] = useState<string | null>(null)
  const [canaisAlvo, setCanaisAlvo] = useState<string[]>([])
  const messagesRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sidebarRef = useRef<SidebarConversasRef>(null)
  const requestIdRef = useRef(0)
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [editorPrecosAberto, setEditorPrecosAberto] = useState<string | null>(null)
  const [fotosUploadadas, setFotosUploadadas] = useState<Record<string, string[]>>({})
  const router = useRouter()
  const supabase = createClient()

  const atualizarUrlConversa = (id: string | null) => {
    router.replace(id ? `/?conversa=${encodeURIComponent(id)}` : '/', { scroll: false })
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/sobre'); return }

      const perfilRes = await fetch('/api/get-profile')
      const perfil = await perfilRes.json()
      const nomeUser = perfil.nome || (perfil.email ? perfil.email.split('@')[0] : 'você')
      setNome(nomeUser)

      const conversaInicial = new URLSearchParams(window.location.search).get('conversa')
      if (conversaInicial) {
        const historicoConversa = await carregarMensagensConversa(conversaInicial)
        if (historicoConversa) {
          setConversaId(conversaInicial)
          setSessaoId(null)
          setMensagens(historicoConversa.length > 0 ? historicoConversa : [criarMensagemBoasVindas(nomeUser)])
          setPrimeiraMensagem(historicoConversa.length === 0)
          setBotoesIniciaisAtivos(historicoConversa.length === 0)
          return
        }
      }

      const histRes = await fetch('/api/chat-historico')
      const {
        historico,
        temSessaoAtiva,
        etapaAtiva,
        sessaoId: sid,
        conversaId: conversaAtivaId,
        canaisAlvo: ca,
      } = await histRes.json()
      if (sid) setSessaoId(sid)
      if (ca?.length > 0) setCanaisAlvo(ca)
      if (conversaAtivaId) {
        setConversaId(conversaAtivaId)
        atualizarUrlConversa(conversaAtivaId)
      }

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
        setMensagens([criarMensagemBoasVindas(nomeUser)])
        setBotoesIniciaisAtivos(true)
        setPrimeiraMensagem(true)
      }
    }
    init()
  }, [])

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensagens])

  useEffect(() => {
    if (!editorPrecosAberto) return
    window.setTimeout(() => {
      messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' })
    }, 80)
  }, [editorPrecosAberto])

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

  const limparEstadoInteracao = () => {
    setInput('')
    setArquivo(null)
    setErroUpload('')
    setUrlsClicadas(new Set())
    setClicadosInicial(new Set())
    setCanaisAlvo([])
    setEditorPrecosAberto(null)
  }

  const selecionarConversa = async (id: string) => {
    const myId = ++requestIdRef.current
    setCarregandoConversa(true)
    setSidebarAberta(false)

    try {
      const historico = await carregarMensagensConversa(id)
      if (myId !== requestIdRef.current) return
      if (!historico) return

      setConversaId(id)
      setSessaoId(null)
      setMensagens(historico)
      setPrimeiraMensagem(false)
      setBotoesIniciaisAtivos(false)
      limparEstadoInteracao()
      atualizarUrlConversa(id)
    } catch {
      if (myId === requestIdRef.current) {
        setMensagens(prev => [...prev, { papel: 'assistant', conteudo: 'Não consegui carregar essa conversa agora. Tenta novamente?' }])
      }
    } finally {
      if (myId === requestIdRef.current) setCarregandoConversa(false)
    }
  }

  const novaConversa = () => {
    requestIdRef.current += 1
    setConversaId(null)
    setSessaoId(null)
    setMensagens([criarMensagemBoasVindas(nome || 'você')])
    setPrimeiraMensagem(true)
    setBotoesIniciaisAtivos(true)
    setCarregando(false)
    setCarregandoConversa(false)
    setUploadando(false)
    setSidebarAberta(false)
    limparEstadoInteracao()
    atualizarUrlConversa(null)
  }

  const enviar = async (texto?: string) => {
    const ocupado = carregando || uploadando || carregandoConversa
    if (ocupado) return

    let currentConversaId: string | null = conversaId
    if (!currentConversaId) {
      try {
        const convRes = await fetch('/api/conversas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        const convData = await convRes.json()
        if (!convData.id) {
          setMensagens(prev => [...prev, { papel: 'assistant', conteudo: 'Erro ao iniciar conversa. Tenta novamente.' }])
          return
        }
        currentConversaId = String(convData.id)
        setConversaId(currentConversaId)
        atualizarUrlConversa(currentConversaId)
        void sidebarRef.current?.refetchConversas()
      } catch {
        setMensagens(prev => [...prev, { papel: 'assistant', conteudo: 'Erro ao iniciar conversa. Tenta novamente.' }])
        return
      }
    }

    if (arquivo) {
      const arq = arquivo
      const marcador = `[ARQUIVO_PRODUTOS_ENVIADO: ${JSON.stringify({ nome: arq.name, tamanho: arq.size })}]`
      const historicoSnapshot = montarHistoricoContexto(mensagens)

      setArquivo(null)
      setInput('')
      setUploadando(true)
      setBotoesIniciaisAtivos(false)
      setMensagens(prev => [...prev, { papel: 'user', conteudo: marcador }])

      try {
        const fd = new FormData()
        fd.append('arquivo', arq)
        if (currentConversaId) fd.append('conversa_id', currentConversaId)
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

        setMensagens(prev => [...prev, { papel: 'assistant', conteudo: 'Analisando seu arquivo de produtos...', temporaria: true }])

        const valRes = await fetch('/api/validar-planilha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessao_id: upData.sessao_id }),
        })
        const valData = await valRes.json()

        setMensagens(prev => prev.filter(m => !m.temporaria))

        let mensagemInterna: string
        if (!valRes.ok || !valData.sucesso) {
          mensagemInterna = '[VALIDACAO_ERRO: Erro interno ao validar o arquivo de produtos. Tente reenviar o arquivo.]'
        } else if (valData.valida) {
          mensagemInterna = `[VALIDACAO_OK: ${valData.total_produtos} produtos]`
        } else {
          mensagemInterna = `[VALIDACAO_ERRO: ${valData.erros_resumo}]`
        }

        const historicoComArquivo = [
          ...historicoSnapshot,
          { papel: 'user' as const, conteudo: marcador },
        ].slice(-HISTORICO_CONTEXTO_LIMITE)
        const res = await fetch('/api/chat-principal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mensagem: mensagemInterna, historico: historicoComArquivo, conversa_id: currentConversaId }),
        })
        const data = await res.json()

        setMensagens(prev => [...prev, {
          papel: 'assistant',
          conteudo: data.resposta,
          acoes_rapidas: data.acoes,
        }])
        void sidebarRef.current?.refetchConversas()
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
      const historicoEnvio = primeiraMensagem ? [] : montarHistoricoContexto(mensagens)
      const res = await fetch('/api/chat-principal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem, historico: historicoEnvio, conversa_id: currentConversaId }),
      })
      const data = await res.json()

      if (data.recarregar_historico) {
        // Geração concluída: gerar-do-chat já inseriu a mensagem de sucesso no histórico.
        // Recarregar para exibir "processando" + "🎉 Pronto!" como mensagens separadas.
        const histRes = await fetch(`/api/conversas/${currentConversaId}/mensagens`)
        const { mensagens: novoHistorico } = await histRes.json()
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
      void sidebarRef.current?.refetchConversas()
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
        enviar(`Baixei o modelo em ${formato} e estou preenchendo.`)
      }
    } else if (botao.acao === 'upload') {
      setErroUpload('')
      fileInputRef.current?.click()
    } else if (botao.acao === 'botao_ajuda_upload' && botao.nome_canal_label) {
      enviar(`Como publicar no ${botao.nome_canal_label}?`)
    }
  }

  const receberAjustePrecos = (mensagem: MensagemAjustePrecos) => {
    setMensagens(prev => [...prev, {
      papel: 'assistant',
      conteudo: mensagem.conteudo,
      acoes_rapidas: { botoes: mensagem.acoes.botoes as Botao[] },
    }])
    void sidebarRef.current?.refetchConversas()
  }

  const ocupado = carregando || uploadando
  const bloqueado = ocupado || carregandoConversa
  const podeSend = !bloqueado && (!!arquivo || !!input.trim())

  return (
    <>
      <Navbar />
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f4f7fb; color: #182233; overflow: hidden; }
        .app { display: flex; flex-direction: row; height: calc(100vh - 64px); background:
          radial-gradient(circle at 18% -8%, rgba(26,115,232,0.12), transparent 28%),
          radial-gradient(circle at 88% 4%, rgba(15,159,117,0.10), transparent 26%),
          linear-gradient(180deg, #f8fbff 0%, #f2f6fb 100%);
        }
        .chat-wrap { flex: 1; min-width: 0; position: relative; display: flex; flex-direction: column; width: 100%; margin: 0; padding: 26px 24px 0; overflow: hidden; }
        .messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; padding: 2px 4px 18px; max-width: 820px; width: 100%; margin: 0 auto; }
        .conversation-loading { align-self: center; display: inline-flex; align-items: center; gap: 8px; min-height: 34px; padding: 7px 12px; border: 1px solid #d8e4f2; border-radius: 999px; background: rgba(255,255,255,0.92); color: #5f6f85; font-size: 12px; font-weight: 800; box-shadow: 0 8px 22px rgba(15,23,42,0.08); }
        .conversation-loading svg { animation: spin .8s linear infinite; color: #155bd5; }
        .sidebar-toggle { display: none; position: absolute; top: 14px; left: 16px; z-index: 30; width: 38px; height: 38px; border: 1px solid #d8e4f2; border-radius: 12px; background: rgba(255,255,255,0.92); color: #155bd5; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 10px 24px rgba(15,23,42,0.10); backdrop-filter: blur(14px); }
        .sidebar-overlay { display: none; position: fixed; top: 64px; left: 0; right: 0; bottom: 0; border: none; background: rgba(15,23,42,0.38); z-index: 80; cursor: pointer; }
        .msg-ai { display: flex; gap: 12px; align-items: flex-start; }
        .bot { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #1a73e8 0%, #0f9f75 100%); color: #fff; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 10px 22px rgba(26,115,232,0.20); }
        .bubble { background: rgba(255,255,255,0.96); border: 1px solid #e2e8f0; border-radius: 18px; border-top-left-radius: 6px; padding: 15px 18px; font-size: 15px; font-family: 'Plus Jakarta Sans', sans-serif; color: #182233; line-height: 1.66; max-width: 560px; box-shadow: 0 10px 30px rgba(15,23,42,0.06); }
        .bubble p { margin-bottom: 8px; }
        .bubble p:last-child { margin-bottom: 0; }
        .bubble ul, .bubble ol { padding-left: 20px; margin-bottom: 8px; }
        .bubble li { margin-bottom: 4px; line-height: 1.65; }
        .bubble strong { font-weight: 600; }
        .bubble em { font-style: italic; }
        .bubble a { color: #155bd5; text-decoration: none; }
        .bubble a:hover { text-decoration: underline; }
        .bubble code { font-family: ui-monospace, monospace; background: #f1f3f4; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
        .bubble h1 { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
        .bubble h2 { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
        .bubble h3 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
        .msg-user { display: flex; justify-content: flex-end; }
        .bubble-user { background: linear-gradient(135deg, #1a73e8 0%, #155bd5 100%); color: #fff; border-radius: 18px; border-top-right-radius: 6px; padding: 13px 18px; font-size: 14px; max-width: 420px; box-shadow: 0 12px 26px rgba(26,115,232,0.18); }
        .quick-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 12px; margin-left: 46px; }
        .quick-btn { background: rgba(255,255,255,0.92); border: 1px solid rgba(26,115,232,0.28); color: #155bd5; font-size: 13px; font-weight: 700; padding: 8px 15px; border-radius: 999px; cursor: pointer; font-family: inherit; transition: background .18s, border-color .18s, box-shadow .18s, transform .18s; }
        .quick-btn:hover { background: #ffffff; border-color: rgba(26,115,232,0.48); box-shadow: 0 8px 22px rgba(26,115,232,0.12); transform: translateY(-1px); }
        .quick-btn-download { background: #155bd5; border: 1px solid #155bd5; color: #fff; font-size: 13px; font-weight: 700; padding: 8px 16px; border-radius: 999px; cursor: pointer; font-family: inherit; transition: background .18s, transform .18s, box-shadow .18s; }
        .quick-btn-download:hover { background: #0f4bb8; box-shadow: 0 8px 22px rgba(26,115,232,0.18); transform: translateY(-1px); }
        .quick-btn-download-usado { background: #f7fafc; border: 1px solid #d8e0eb; color: #697386; font-size: 13px; font-weight: 700; padding: 8px 16px; border-radius: 999px; cursor: default; font-family: inherit; }
        .quick-btn-upload { background: linear-gradient(135deg, #1a73e8 0%, #0f9f75 100%); border: 1px solid transparent; color: #fff; font-size: 14px; font-weight: 700; padding: 11px 24px; border-radius: 999px; cursor: pointer; font-family: inherit; flex-basis: 100%; box-shadow: 0 12px 26px rgba(26,115,232,0.18); }
        .quick-btn-upload:hover { filter: brightness(0.96); }
        .typing { display: flex; gap: 6px; padding: 14px 18px; background: rgba(255,255,255,0.96); border: 1px solid #e2e8f0; border-radius: 18px; border-top-left-radius: 6px; width: fit-content; box-shadow: 0 10px 30px rgba(15,23,42,0.06); }
        .typing span { width: 6px; height: 6px; background: #7a8699; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
        .typing span:nth-child(1) { animation-delay: -0.32s; }
        .typing span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .input-area { padding: 16px 0 20px; border-top: 1px solid rgba(207,216,228,0.72); background: rgba(248,251,255,0.82); backdrop-filter: blur(14px); max-width: 820px; width: 100%; margin: 0 auto; }
        .file-preview { margin-bottom: 8px; }
        .erro-upload { font-size: 12px; color: #ea4335; margin-bottom: 6px; }
        .input-box { background: #fff; border: 1px solid #dbe4ef; border-radius: 18px; display: flex; align-items: center; padding: 7px 7px 7px 8px; gap: 4px; box-shadow: 0 12px 34px rgba(15,23,42,0.08); }
        .clip-btn { background: none; border: none; cursor: pointer; color: #9aa0a6; padding: 6px 8px; display: flex; align-items: center; border-radius: 8px; flex-shrink: 0; }
        .clip-btn:hover:not(:disabled) { color: #1a73e8; background: #f0f4ff; }
        .clip-btn:disabled { cursor: not-allowed; opacity: 0.5; }
        .input-box input { flex: 1; border: none; outline: none; font-size: 14px; color: #182233; font-family: inherit; padding: 10px 6px; background: transparent; }
        .send-btn { background: #155bd5; color: #fff; border: none; width: 38px; height: 38px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background .18s, transform .18s, box-shadow .18s; box-shadow: 0 9px 20px rgba(26,115,232,0.22); }
        .send-btn:hover:not(:disabled) { background: #0f4bb8; transform: translateY(-1px); }
        .send-btn:disabled { background: #9aa0a6; cursor: not-allowed; }
        .send-spinner { animation: spin .8s linear infinite; }
        .hint { font-size: 11px; color: #9aa0a6; text-align: center; margin-top: 8px; }
        @media (max-width: 1023px) {
          .chat-wrap { padding-top: 64px; }
          .sidebar-toggle { display: inline-flex; }
          .app.sidebar-open .sidebar-overlay { display: block; }
        }
      `}</style>

      <div className={`app ${sidebarAberta ? 'sidebar-open' : ''}`}>
        <button className="sidebar-overlay" aria-label="Fechar conversas" onClick={() => setSidebarAberta(false)} />
        <SidebarConversas
          ref={sidebarRef}
          conversaId={conversaId}
          onSelectConversa={selecionarConversa}
          onNovaConversa={novaConversa}
        />
        <div className="chat-wrap">
          <button className="sidebar-toggle" aria-label="Abrir conversas" onClick={() => setSidebarAberta(true)}>
            <PanelLeft size={18} strokeWidth={2.4} />
          </button>
          <div className="messages" ref={messagesRef}>
            {carregandoConversa && (
              <div className="conversation-loading" role="status">
                <Loader2 size={14} />
                Carregando conversa
              </div>
            )}
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
                          {m.acoes_rapidas.botoes
                            .filter(b => b.acao === 'card_comparador_listing')
                            .map((b, j) => (
                              <div key={j} style={{ marginBottom: 8 }}>
                                <CardComparadorListing
                                  acao="card_comparador_listing"
                                  titulo={b.titulo ?? 'Antes e depois do cadastro'}
                                  resumo={b.resumo ?? 'Veja o que o Guiamos transformou a partir dos dados básicos.'}
                                  total_produtos={b.total_produtos ?? 0}
                                  produtos_com_titulo={b.produtos_com_titulo ?? 0}
                                  produtos_com_descricao={b.produtos_com_descricao ?? 0}
                                  canais={b.canais ?? []}
                                  produtos_preview={b.produtos_preview ?? []}
                                />
                              </div>
                            ))
                          }
                          {m.acoes_rapidas.botoes
                            .filter(b => b.acao === 'card_status_confianca')
                            .map((b, j) => (
                              <div key={j} style={{ marginBottom: 8 }}>
                                <CardStatusConfianca
                                  status={b.status ?? 'atencao'}
                                  titulo={b.titulo ?? 'Conferência rápida'}
                                  resumo={b.resumo ?? 'Revise os pontos principais antes de publicar.'}
                                  total_produtos={b.total_produtos ?? 0}
                                  produtos_processados={b.produtos_processados ?? 0}
                                  arquivos_gerados={b.arquivos_gerados ?? 0}
                                  canais_solicitados={b.canais_solicitados ?? 0}
                                  alertas_count={b.alertas_count ?? 0}
                                  campos_obrigatorios_ok={b.campos_obrigatorios_ok ?? false}
                                  precos_calculados={b.precos_calculados ?? false}
                                  drive_validado={b.drive_validado ?? false}
                                  alertas_preview={b.alertas_preview ?? []}
                                />
                              </div>
                            ))
                          }
                          {m.acoes_rapidas.botoes
                            .filter(b => b.acao === 'card_validador_upload' && b.validador_upload)
                            .map((b, j) => (
                              <div key={j} style={{ marginBottom: 8 }}>
                                <CardValidadorUpload {...b.validador_upload!} />
                              </div>
                            ))
                          }
                          {m.acoes_rapidas.botoes
                            .filter(b => b.acao === 'card_price_guard' && b.price_guard)
                            .map((b, j) => {
                              const editorKey = `${i}-price-${j}`
                              const sessaoAjuste = b.sessao_id
                              const conversaAjuste = b.conversa_id ?? conversaId
                              const podeAjustar = !!sessaoAjuste && !!conversaAjuste

                              return (
                                <div key={j} style={{ marginBottom: 8 }}>
                                  <CardPriceGuard
                                    {...b.price_guard!}
                                    onAjustarPrecos={podeAjustar ? () => setEditorPrecosAberto(editorPrecosAberto === editorKey ? null : editorKey) : undefined}
                                  />
                                  {podeAjustar && editorPrecosAberto === editorKey && (
                                    <div style={{ marginTop: 8 }}>
                                      <MiniEditorPrecos
                                        sessaoId={sessaoAjuste}
                                        conversaId={conversaAjuste}
                                        canais={b.price_guard!.canais}
                                        onCancelar={() => setEditorPrecosAberto(null)}
                                        onSucesso={receberAjustePrecos}
                                      />
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          }
                          {m.acoes_rapidas.botoes
                            .filter(b => b.acao === 'card_upload_fotos_ml' && b.produtos?.length)
                            .map((b, j) => (
                              <div key={j} style={{ marginBottom: 8 }}>
                                <CardUploadFotosML
                                  produtos={b.produtos!}
                                  onFotosUploaded={novas => setFotosUploadadas(prev => ({ ...prev, ...novas }))}
                                />
                              </div>
                            ))
                          }
                          {m.acoes_rapidas.botoes
                            .filter(b => b.acao === 'card_publicacao_ml')
                            .map((b, j) => (
                              <div key={j} style={{ marginBottom: 8 }}>
                                <CardPublicacaoML
                                  {...(b as unknown as PublicacaoMLCardData)}
                                  fotosInjetadas={fotosUploadadas}
                                />
                              </div>
                            ))
                          }
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
                          {m.acoes_rapidas.botoes.some(b => b.acao !== 'card_download_arquivo' && b.acao !== 'card_status_confianca' && b.acao !== 'card_price_guard' && b.acao !== 'card_validador_upload' && b.acao !== 'card_comparador_listing' && b.acao !== 'card_publicacao_ml' && b.acao !== 'card_upload_fotos_ml') && (
                            <div className="quick-actions" style={{ marginLeft: 0 }}>
                              {m.acoes_rapidas.botoes
                                .filter(b => b.acao !== 'card_download_arquivo' && b.acao !== 'card_status_confianca' && b.acao !== 'card_price_guard' && b.acao !== 'card_validador_upload' && b.acao !== 'card_comparador_listing' && b.acao !== 'card_publicacao_ml' && b.acao !== 'card_upload_fotos_ml')
                                .map((b, j) => (
                                  <button key={j} className="quick-btn" onClick={() => clicarBotao(b)}>
                                    {b.acao === 'botao_ajuda_upload'
                                      ? (b.texto ?? `📚 Como publicar no ${b.nome_canal_label}?`)
                                      : b.texto}
                                  </button>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      ) : m.acoes_rapidas.botoes.some(b => b.acao === 'card_upload_fotos_ml') ? (
                        <div style={{ marginTop: 12, marginLeft: 44 }}>
                          {m.acoes_rapidas.botoes
                            .filter(b => b.acao === 'card_upload_fotos_ml' && b.produtos?.length)
                            .map((b, j) => (
                              <div key={j} style={{ marginBottom: 8 }}>
                                <CardUploadFotosML
                                  produtos={b.produtos!}
                                  onFotosUploaded={novas => setFotosUploadadas(prev => ({ ...prev, ...novas }))}
                                />
                              </div>
                            ))
                          }
                          {m.acoes_rapidas.botoes.some(b => b.acao !== 'card_upload_fotos_ml') && (
                            <div className="quick-actions" style={{ marginLeft: 0, marginTop: 8 }}>
                              {m.acoes_rapidas.botoes
                                .filter(b => b.acao !== 'card_upload_fotos_ml')
                                .map((b, j) => (
                                  <button key={j} className="quick-btn" onClick={() => clicarBotao(b)}>
                                    {b.texto}
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
                disabled={bloqueado}
                title="Anexar arquivo de produtos (.xlsx, .xls, .csv)"
              >
                <Paperclip size={18} />
              </button>
              <input
                type="text"
                placeholder={arquivo ? 'Pressione enviar para analisar o arquivo...' : 'Pergunte qualquer coisa ou descreva o que quer fazer...'}
                value={arquivo ? '' : input}
                onChange={e => !arquivo && setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && enviar()}
                disabled={bloqueado}
              />
              <button className="send-btn" onClick={() => enviar()} disabled={!podeSend}>
                {uploadando ? <Loader2 size={17} className="send-spinner" /> : <ArrowUp size={18} strokeWidth={2.5} />}
              </button>
            </div>
            <div className="hint">A IA pode cometer erros · Sempre revise as informações importantes</div>
          </div>
        </div>
      </div>
    </>
  )
}
