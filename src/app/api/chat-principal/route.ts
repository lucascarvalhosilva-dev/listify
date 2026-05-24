import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { ANTHROPIC_MODEL } from '@/lib/constants'
import {
  buscarSessaoAtiva,
  criarSessao,
  atualizarEtapa,
  cancelarSessoesAntigas,
} from '@/lib/sessoes-geracao'
import { detectarIntencaoCadastro } from '@/lib/detectar-intencao'
import { TEMPLATE_XLSX_URL, TEMPLATE_CSV_URL } from '@/lib/templates'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT_BASE = `Você é a IA do Guiamos, plataforma de cadastro automatizado de produtos em marketplaces brasileiros (Shopee, Mercado Livre, Amazon, TikTok Shop, Magalu, Bling).

Sua função é guiar o usuário de forma proativa, sempre puxando a conversa e oferecendo opções claras. Seja direto, amigável e use português brasileiro.

REGRAS IMPORTANTES:
- Sempre termine sua mensagem oferecendo 2-4 opções de próximo passo
- Use formato JSON no final da resposta com as ações rápidas
- Detecte a intenção do usuário e ofereça redirecionamento quando apropriado

INTENÇÕES E REDIRECIONAMENTOS:
- Ver catálogos / meus catálogos → redirect: /painel?aba=catalogos
- Ver histórico → redirect: /painel?aba=historico
- Ver plano / fazer upgrade → redirect: /upgrade
- Configurações → redirect: /configuracoes

FORMATO DA RESPOSTA:
Responda com texto natural e ao final adicione um bloco JSON entre <acoes> e </acoes>:
<acoes>
{
  "botoes": [
    {"texto": "Gerar produtos", "acao": "redirect", "destino": "/painel"},
    {"texto": "Tirar dúvida", "acao": "mensagem", "valor": "Como faço uma boa foto de produto?"}
  ]
}
</acoes>

Tipos de ação:
- "redirect" + destino: leva o usuário para outra página
- "mensagem" + valor: envia uma mensagem pré-pronta como se o usuário tivesse digitado`

const CONTEXTO_ETAPA: Record<string, string> = {
  iniciada: `

CONTEXTO DO FLUXO GUIADO:
Você está em fluxo guiado de cadastro. Etapa atual: iniciada. Explique que precisa de uma planilha com nome, custo, estoque e fotos nomeadas SKU_01.jpg. Diga que o upload pelo chat está sendo finalizado e que por enquanto ele pode usar a aba 'Nova Geração' no menu superior. NÃO redirecione automaticamente.`,

  aguardando_planilha: `

CONTEXTO DO FLUXO GUIADO:
Você está em fluxo guiado de cadastro. Etapa atual: aguardando_planilha. O usuário precisa baixar o template e preenchê-lo com seus produtos. Ofereça ao usuário os dois formatos de template que ele pode baixar pelos botões abaixo da mensagem. As colunas obrigatórias são: SKU, Nome do Produto, Marca, Categoria, Custo Unitário (R$) e Estoque. Seja breve e direto. NÃO redirecione automaticamente.`,

  validando_planilha: `

CONTEXTO DO FLUXO GUIADO:
Você está em fluxo guiado de cadastro. Etapa atual: validando_planilha. O usuário já enviou a planilha e está aguardando a análise. Informe que a planilha foi recebida e está sendo verificada. NÃO mostre botões de download de template.`,

  aguardando_drive: `

CONTEXTO DO FLUXO GUIADO:
Você está em fluxo guiado de cadastro. Etapa atual: aguardando_drive. A planilha foi validada com sucesso. Peça ao usuário o link de uma pasta do Google Drive com as fotos dos produtos. As fotos devem ser nomeadas SKU_01.jpg (capa), SKU_02.jpg (extras). A pasta precisa estar compartilhada como "Qualquer pessoa com o link → Visualizador".`,
}

const PALAVRAS_AJUDA = /\b(como|ajuda|exemplo|explica|duvida|dúvida|tutorial|passo|instruc)/i

// ── Parsers de marcadores internos ────────────────────────────────────────────

function parsearMarcadorPlanilha(c: string): { nome: string; tamanho: number } | null {
  if (!c.startsWith('[PLANILHA_ENVIADA:')) return null
  try { return JSON.parse(c.replace(/^\[PLANILHA_ENVIADA:\s*/, '').replace(/\]$/, '').trim()) }
  catch { return null }
}

function parsearMarcadorValidacaoOk(c: string): { total: number } | null {
  if (!c.startsWith('[VALIDACAO_OK:')) return null
  const m = c.match(/\[VALIDACAO_OK:\s*(\d+)\s*produtos?\]/)
  return m ? { total: parseInt(m[1], 10) } : { total: 0 }
}

function parsearMarcadorValidacaoErro(c: string): string | null {
  if (!c.startsWith('[VALIDACAO_ERRO:')) return null
  return c.replace(/^\[VALIDACAO_ERRO:\s*/, '').replace(/\]$/, '').trim()
}

function limparParaClaude(conteudo: string): string {
  const arq = parsearMarcadorPlanilha(conteudo)
  if (arq) return `Enviei minha planilha: ${arq.nome}`
  if (conteudo.startsWith('[VALIDACAO_OK:')) return 'A planilha foi validada com sucesso.'
  if (conteudo.startsWith('[VALIDACAO_ERRO:')) return 'Houve erros na validação da planilha.'
  return conteudo
}

function esMensagemInterna(mensagem: string): boolean {
  return (
    mensagem.startsWith('[VALIDACAO_OK:') ||
    mensagem.startsWith('[VALIDACAO_ERRO:')
  )
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

    const { mensagem, historico } = await request.json()

    // Mensagens internas de validação não são salvas no histórico do chat
    if (!esMensagemInterna(mensagem)) {
      await supabase.from('chat_historico').insert({
        user_id: user.id,
        papel: 'user',
        conteudo: mensagem,
      })
    }

    await cancelarSessoesAntigas(user.id)

    let sessaoAtiva = await buscarSessaoAtiva(user.id)

    if (detectarIntencaoCadastro(mensagem) && !sessaoAtiva) {
      sessaoAtiva = await criarSessao(user.id)
    }

    // ── Detecta marcadores e constrói contexto ────────────────────────────────
    const infoPlanilha = parsearMarcadorPlanilha(mensagem)
    const infoValidacaoOk = parsearMarcadorValidacaoOk(mensagem)
    const infoValidacaoErro = parsearMarcadorValidacaoErro(mensagem)

    let contextoEtapa = sessaoAtiva ? (CONTEXTO_ETAPA[sessaoAtiva.etapa] ?? '') : ''

    if (infoPlanilha) {
      contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
O usuário acabou de enviar uma planilha (nome: ${infoPlanilha.nome}). Etapa atual: validando_planilha. Confirme o recebimento de forma calorosa e diga que vai analisar o conteúdo. Mencione que a análise automática está sendo finalizada. NÃO mostre botões de download de template novamente.`
    } else if (infoValidacaoOk) {
      contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
A planilha foi validada com sucesso. Total de produtos encontrados: ${infoValidacaoOk.total}. Etapa atual: aguardando_drive. Parabenize o usuário pela planilha estar correta, mencione o número de produtos detectados, e explique a próxima etapa: ele precisa enviar o link de uma pasta do Google Drive com as fotos dos produtos. As fotos devem estar nomeadas como SKU_01.jpg (capa), SKU_02.jpg (extras), e a pasta precisa estar compartilhada como 'Qualquer pessoa com o link → Visualizador'. Peça o link do Drive de forma clara.`
    } else if (infoValidacaoErro !== null) {
      contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
A planilha tem erros e precisa ser corrigida. Etapa atual: aguardando_planilha (voltou). Avise o usuário de forma empática (sem dramatizar) que encontrou problemas, liste estes erros exatamente: "${infoValidacaoErro}". Peça pra corrigir e reenviar usando o botão de anexo (clipe) no chat. NÃO ofereça botões de download de template novamente (ele já tem). Ofereça botão rápido 'Como corrigir?' caso o usuário não entenda algum erro.`
    }

    const systemPrompt = SYSTEM_PROMPT_BASE + contextoEtapa
    const mensagemParaClaude = limparParaClaude(mensagem)

    const messages = [
      ...(historico || []).map((h: { papel: string; conteudo: string }) => ({
        role: h.papel === 'user' ? 'user' : 'assistant',
        content: limparParaClaude(h.conteudo),
      })),
      { role: 'user' as const, content: mensagemParaClaude },
    ]

    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const fullText = response.content[0].type === 'text' ? response.content[0].text : ''

    let textoLimpo = fullText
    let acoes: { botoes: Array<Record<string, string>> } | null = null
    const match = fullText.match(/<acoes>([\s\S]*?)<\/acoes>/)
    if (match) {
      try {
        acoes = JSON.parse(match[1].trim())
        textoLimpo = fullText.replace(/<acoes>[\s\S]*?<\/acoes>/, '').trim()
      } catch (e) {
        console.error('Erro ao parsear ações:', e)
      }
    }

    // ── Gerencia etapa e botões de download ───────────────────────────────────
    if (infoPlanilha || infoValidacaoOk || infoValidacaoErro !== null) {
      // Etapa já foi gerenciada pelo chat-upload / validar-planilha
    } else if (sessaoAtiva?.etapa === 'iniciada') {
      await atualizarEtapa(sessaoAtiva.id, 'aguardando_planilha')
    } else if (sessaoAtiva?.etapa === 'aguardando_planilha' && !PALAVRAS_AJUDA.test(mensagem)) {
      const botoesDl = [
        { texto: 'Baixar template Excel', acao: 'download', url: TEMPLATE_XLSX_URL },
        { texto: 'Baixar template CSV', acao: 'download', url: TEMPLATE_CSV_URL },
      ]
      acoes = { botoes: [...(acoes?.botoes ?? []), ...botoesDl] }
    }

    await supabase.from('chat_historico').insert({
      user_id: user.id,
      papel: 'assistant',
      conteudo: textoLimpo,
      acoes_rapidas: acoes,
    })

    return Response.json({ resposta: textoLimpo, acoes })
  } catch (error) {
    console.error('[CHAT PRINCIPAL] erro:', error)
    return Response.json({ error: 'Erro ao processar mensagem' }, { status: 500 })
  }
}
