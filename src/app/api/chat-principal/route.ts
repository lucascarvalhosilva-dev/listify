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
}

const PALAVRAS_AJUDA = /\b(como|ajuda|exemplo|explica|duvida|dúvida|tutorial|passo|instruc)/i

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

    const { mensagem, historico } = await request.json()

    await supabase.from('chat_historico').insert({
      user_id: user.id,
      papel: 'user',
      conteudo: mensagem,
    })

    await cancelarSessoesAntigas(user.id)

    let sessaoAtiva = await buscarSessaoAtiva(user.id)

    if (detectarIntencaoCadastro(mensagem) && !sessaoAtiva) {
      sessaoAtiva = await criarSessao(user.id)
    }

    const contextoEtapa = sessaoAtiva ? (CONTEXTO_ETAPA[sessaoAtiva.etapa] ?? '') : ''
    const systemPrompt = SYSTEM_PROMPT_BASE + contextoEtapa

    const messages = [
      ...(historico || []).map((h: { papel: string; conteudo: string }) => ({
        role: h.papel === 'user' ? 'user' : 'assistant',
        content: h.conteudo,
      })),
      { role: 'user' as const, content: mensagem },
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

    // Avança etapa e injeta botões de download quando adequado
    if (sessaoAtiva?.etapa === 'iniciada') {
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
