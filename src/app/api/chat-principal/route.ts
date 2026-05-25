import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { ANTHROPIC_MODEL } from '@/lib/constants'

export const maxDuration = 60
import {
  buscarSessaoAtiva,
  criarSessao,
  atualizarEtapa,
  cancelarSessoesAntigas,
} from '@/lib/sessoes-geracao'
import { detectarIntencaoCadastro } from '@/lib/detectar-intencao'
import { TEMPLATE_XLSX_URL, TEMPLATE_CSV_URL } from '@/lib/templates'
import { extrairUrlDrive, validarAcessoDrive, type ResultadoValidacaoDrive } from '@/lib/validador-drive'

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
Você está em fluxo guiado de cadastro. Etapa atual: aguardando_planilha. O template de planilha já está disponível para download nos botões abaixo (adicionados automaticamente pelo sistema — NÃO os inclua no JSON de acoes). Explique brevemente o que preencher: SKU (código único do produto), Nome do Produto (mínimo 3 caracteres), Marca, Categoria, Custo Unitário em R$ (ex: 11.60 ou 11,60) e Estoque (número inteiro). Seja breve e direto. NÃO redirecione automaticamente.`,

  validando_planilha: `

CONTEXTO DO FLUXO GUIADO:
Você está em fluxo guiado de cadastro. Etapa atual: validando_planilha. O usuário já enviou a planilha e está aguardando a análise. Informe que a planilha foi recebida e está sendo verificada. NÃO mostre botões de download de template.`,

  aguardando_drive: `

CONTEXTO DO FLUXO GUIADO:
Você está em fluxo guiado de cadastro. Etapa atual: aguardando_drive. A planilha foi validada com sucesso. Peça ao usuário o link de uma pasta do Google Drive com as fotos dos produtos. As fotos devem ser nomeadas SKU_01.jpg (capa), SKU_02.jpg (extras). A pasta precisa estar compartilhada como "Qualquer pessoa com o link → Visualizador". Um campo dedicado para colar o link aparece automaticamente abaixo desta mensagem (adicionado pelo sistema — NÃO inclua botões de envio de link no JSON de acoes). Você pode oferecer os botões "Como compartilhar?" e "Tirar dúvida" com ação mensagem.`,
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

    // Avança 'iniciada' → 'aguardando_planilha' antes de montar o prompt,
    // garantindo contexto e botões corretos já na primeira resposta.
    if (sessaoAtiva?.etapa === 'iniciada') {
      await atualizarEtapa(sessaoAtiva.id, 'aguardando_planilha')
      sessaoAtiva = { ...sessaoAtiva, etapa: 'aguardando_planilha' }
    }

    // ── Detecta e valida link do Google Drive ────────────────────────────────
    let urlDrive: string | null = null
    let resultadoDrive: ResultadoValidacaoDrive | null = null

    if (
      sessaoAtiva &&
      (sessaoAtiva.etapa === 'aguardando_drive' || sessaoAtiva.etapa === 'validando_drive')
    ) {
      urlDrive = extrairUrlDrive(mensagem)
      console.log('[DRIVE] etapa:', sessaoAtiva.etapa, '| url detectada:', urlDrive ? 'sim' : 'não')

      if (urlDrive) {
        const { error: e1 } = await supabase
          .from('sessoes_geracao')
          .update({ etapa: 'validando_drive' })
          .eq('id', sessaoAtiva.id)
        if (e1) console.error('[DRIVE] erro ao marcar validando_drive:', e1)
        sessaoAtiva = { ...sessaoAtiva, etapa: 'validando_drive' }

        resultadoDrive = await validarAcessoDrive(urlDrive)
        console.log('[DRIVE] resultado:', resultadoDrive.acessivel ? 'acessivel' : resultadoDrive.tipo_erro)

        if (resultadoDrive.acessivel) {
          const { error: e2 } = await supabase
            .from('sessoes_geracao')
            .update({
              etapa: 'processando',
              drive_url: urlDrive,
              dados_planilha: { ...(sessaoAtiva.dados_planilha ?? {}), drive_validado: true },
            })
            .eq('id', sessaoAtiva.id)
          if (e2) console.error('[DRIVE] erro ao marcar processando:', e2)
          sessaoAtiva = { ...sessaoAtiva, etapa: 'processando', drive_url: urlDrive }
        } else {
          const { error: e3 } = await supabase
            .from('sessoes_geracao')
            .update({ etapa: 'aguardando_drive' })
            .eq('id', sessaoAtiva.id)
          if (e3) console.error('[DRIVE] erro ao reverter aguardando_drive:', e3)
          sessaoAtiva = { ...sessaoAtiva, etapa: 'aguardando_drive' }
        }
      }
    }

    // ── Seleção de canais: short-circuit quando processando sem canais ────────
    if (sessaoAtiva?.etapa === 'processando') {
      const canaisAlvo: string[] = sessaoAtiva.canais_alvo ?? []
      if (canaisAlvo.length === 0) {
        const resposta = 'Ótimo! Agora vou preparar os cadastros. Para quais marketplaces você quer gerar? Selecione um ou mais nos botões abaixo. Você pode escolher quantos quiser — vou criar arquivos otimizados para cada um.'
        const acoes = { botoes: [{ texto: 'Selecionar canais', acao: 'selector_canais', sessao_id: sessaoAtiva.id }] }
        await supabase.from('chat_historico').insert({
          user_id: user.id,
          papel: 'assistant',
          conteudo: resposta,
          acoes_rapidas: acoes,
        })
        return Response.json({ resposta, acoes })
      }
    }

    // ── Detecta marcadores e constrói contexto ────────────────────────────────
    const infoPlanilha = parsearMarcadorPlanilha(mensagem)
    const infoValidacaoOk = parsearMarcadorValidacaoOk(mensagem)
    const infoValidacaoErro = parsearMarcadorValidacaoErro(mensagem)

    let contextoEtapa = sessaoAtiva ? (CONTEXTO_ETAPA[sessaoAtiva.etapa] ?? '') : ''

    const eTirandoDuvida = mensagem === 'Tenho uma dúvida'
    const eBaixouTemplate = mensagem.startsWith('Baixei o template em')
    const eCanaisEscolhidos = mensagem.startsWith('Canais escolhidos:')

    console.log('[CHAT] msg:', mensagem.slice(0, 80))
    console.log('[CHAT] etapa:', sessaoAtiva?.etapa ?? 'sem_sessao')
    console.log('[CHAT] canaisAlvo:', JSON.stringify(sessaoAtiva?.canais_alvo ?? null))
    console.log('[CHAT] eCanaisEscolhidos:', eCanaisEscolhidos, '| geracao_disparada:', (sessaoAtiva?.dados_planilha as Record<string,unknown>)?.geracao_disparada ?? null)

    type ArquivoBaixavel = { canal: string; nome_canal_label: string; path: string; tamanho_bytes: number; catalogo_id?: string | null }
    let arquivosBaixaveis: ArquivoBaixavel[] = []

    if (eTirandoDuvida) {
      contextoEtapa = `

CONTEXTO: O usuário quer tirar uma dúvida geral sobre o Guiamos. Responda de forma acolhedora, pergunte qual é a dúvida especificamente, e ofereça botões rápidos com tópicos comuns como: 'Como funciona o Guiamos?', 'Quais marketplaces suportam?', 'Como funciona a precificação?', 'Sobre os planos'.`
    } else if (eCanaisEscolhidos && sessaoAtiva?.etapa === 'processando' && (sessaoAtiva.canais_alvo ?? []).length > 0) {
      const lista = mensagem.replace('Canais escolhidos: ', '')
      const dadosAtual = (sessaoAtiva.dados_planilha ?? {}) as Record<string, unknown>
      console.log('[CHAT] branch eCanaisEscolhidos: geracao_disparada =', dadosAtual?.geracao_disparada ?? false)

      if (dadosAtual?.geracao_disparada) {
        if (dadosAtual?.geracao_concluida) {
          contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
A geração já foi concluída com sucesso. Canais: ${lista}. Informe ao usuário de forma breve que os cadastros já foram gerados e estão disponíveis para download na aba 'Meus Catálogos'.`
        } else if (dadosAtual?.geracao_erro) {
          contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
A geração anterior terminou com erro. Canais solicitados: ${lista}. Peça desculpas ao usuário de forma empática e ofereça um botão 'Tentar de novo' com ação de mensagem.`
        } else {
          contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
A geração está em andamento para os canais: ${lista}. Informe o usuário que o processo está sendo concluído.`
        }
      } else {
        const cookieHeader = request.headers.get('cookie') ?? ''
        const gerarUrl = new URL('/api/gerar-do-chat', request.url).toString()
        console.log('[CHAT] chamando gerar-do-chat:', gerarUrl, '| sessaoId:', sessaoAtiva.id)
        let geracaoOk = false
        let arquivosCount = 0
        let alertasTxt = ''

        try {
          const gerarResp = await fetch(gerarUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
            body: JSON.stringify({ sessao_id: sessaoAtiva.id }),
          })
          console.log('[CHAT] gerar-do-chat status:', gerarResp.status)
          if (gerarResp.ok) {
            const gerarData = await gerarResp.json() as { sucesso: boolean; canais_processados: number; arquivos_count: number; alertas: string[]; arquivos_baixaveis?: ArquivoBaixavel[] }
            geracaoOk = true
            arquivosCount = gerarData.arquivos_count
            alertasTxt = gerarData.alertas.length > 0 ? ` Alertas: ${gerarData.alertas.join('; ')}.` : ''
            arquivosBaixaveis = gerarData.arquivos_baixaveis ?? []
          } else {
            const errBody = await gerarResp.text()
            console.error('[CHAT PRINCIPAL] gerar-do-chat erro:', gerarResp.status, errBody)
          }
        } catch (e) {
          console.error('[CHAT PRINCIPAL] erro ao chamar gerar-do-chat:', e)
        }

        if (geracaoOk) {
          contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
A geração foi concluída com sucesso. Canais: ${lista}. Arquivos gerados: ${arquivosCount}.${alertasTxt}
Os cards de download aparecem automaticamente abaixo desta mensagem (adicionados pelo sistema — NÃO os inclua no JSON de acoes e NÃO liste os arquivos).
Celebre o sucesso em 1-2 frases curtas. Mencione brevemente:
- Os arquivos estão prontos nos cards abaixo
- Foram salvos automaticamente em Meus Catálogos (acesso permanente)
- Os links dos cards expiram em 1h, mas o catálogo fica salvo para sempre
Ofereça 2-3 opções de próximo passo como 'Cadastrar mais produtos', 'Ver Meus Catálogos', 'Tirar uma dúvida'. NÃO redirecione automaticamente.`
        } else {
          contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
Houve um erro na geração dos cadastros para os canais: ${lista}. Peça desculpas ao usuário de forma empática. Ofereça um botão 'Tentar de novo' com ação de mensagem.`
        }
      }
    } else if (urlDrive !== null && resultadoDrive !== null) {
      if (resultadoDrive.acessivel) {
        contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
O usuário enviou o link do Drive e ele está acessível. Etapa atual: processando. Confirme o recebimento de forma objetiva e diga que a próxima etapa é escolher os canais de venda. NÃO invente números de fotos. NÃO prometa validação de SKU. NÃO ofereça botões que redirecionem automaticamente.`
      } else {
        contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
O link do Google Drive não pôde ser validado. Etapa: aguardando_drive (link rejeitado, aguardando novo link). Informe ao usuário de forma empática que o link tem um problema. Explique exatamente: "${resultadoDrive.mensagem_erro}". O campo para reenviar o link aparece automaticamente abaixo (adicionado pelo sistema — NÃO inclua botões de envio de link no JSON de acoes).`
      }
    } else if (eBaixouTemplate) {
      contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
O usuário acabou de baixar o template. Confirme de forma curta e amigável (1-2 frases). Oriente que assim que terminar de preencher a planilha, ele deve clicar no botão grande abaixo para enviar. NÃO ofereça mais botões de download.`
    } else if (infoPlanilha) {
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
    let acoes: { botoes: Array<Record<string, unknown>> } | null = null
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
    if (arquivosBaixaveis.length > 0) {
      const cardBotoes = arquivosBaixaveis.map(a => ({
        acao: 'card_download_arquivo',
        path: a.path,
        canal: a.canal,
        nome_canal_label: a.nome_canal_label,
        tamanho_bytes: a.tamanho_bytes,
      }))
      const aiAcoes = acoes?.botoes ?? []
      acoes = { botoes: [...cardBotoes, ...aiAcoes] }
    } else if (sessaoAtiva?.etapa === 'aguardando_drive') {
      // Injeta card de input de Drive — cobre: estado inicial, retry após URL inválida,
      // e mensagem genérica enquanto aguarda. URL da tentativa anterior vai em valor.
      const valorUrl = (urlDrive && resultadoDrive && !resultadoDrive.acessivel) ? urlDrive : undefined
      const cardBotao: Record<string, unknown> = { acao: 'card_envio_drive' }
      if (valorUrl) cardBotao.valor = valorUrl
      const aiAcoes = (acoes?.botoes ?? []).filter(b => (b as Record<string, unknown>)['acao'] !== 'card_envio_drive')
      acoes = { botoes: [cardBotao, ...aiAcoes] }
    } else if (infoPlanilha || infoValidacaoOk || infoValidacaoErro !== null) {
      // Etapa já foi gerenciada pelo chat-upload / validar-planilha
    } else if (urlDrive !== null) {
      // URL de Drive válida: etapa avançou para processando, short-circuit já retornou
    } else if (eBaixouTemplate) {
      const botaoUpload = { texto: '📎 Enviar planilha preenchida', acao: 'upload' }
      acoes = { botoes: [botaoUpload, ...(acoes?.botoes ?? [])] }
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
