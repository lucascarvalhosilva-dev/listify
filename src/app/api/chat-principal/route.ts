import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { ANTHROPIC_MODEL } from '@/lib/constants'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `Você é a IA do Guiamos, plataforma de cadastro automatizado de produtos em marketplaces brasileiros (Shopee, Mercado Livre, Amazon, TikTok Shop, Magalu, Bling).

Sua função é guiar o usuário de forma proativa, sempre puxando a conversa e oferecendo opções claras. Seja direto, amigável e use português brasileiro.

REGRAS IMPORTANTES:
- Sempre termine sua mensagem oferecendo 2-4 opções de próximo passo
- Use formato JSON no final da resposta com as ações rápidas
- Detecte a intenção do usuário e ofereça redirecionamento quando apropriado

INTENÇÕES E REDIRECIONAMENTOS:
- Gerar produtos / cadastrar produtos / fazer novo catálogo → redirect: /painel
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
      system: SYSTEM_PROMPT,
      messages,
    })

    const fullText = response.content[0].type === 'text' ? response.content[0].text : ''

    let textoLimpo = fullText
    let acoes = null
    const match = fullText.match(/<acoes>([\s\S]*?)<\/acoes>/)
    if (match) {
      try {
        acoes = JSON.parse(match[1].trim())
        textoLimpo = fullText.replace(/<acoes>[\s\S]*?<\/acoes>/, '').trim()
      } catch (e) {
        console.error('Erro ao parsear ações:', e)
      }
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
