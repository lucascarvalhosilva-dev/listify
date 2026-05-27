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
- Ajustar preços / Price Guard / margem / reprecificar produtos → redirect: /precos
- Ver conversas antigas / histórico de conversa → orientar a usar a sidebar de conversas do chat, sem redirecionar
- Ver plano / fazer upgrade → redirect: /upgrade
- Configurações → redirect: /configuracoes

FORMATO DA RESPOSTA:
Responda com texto natural e ao final adicione um bloco JSON entre <acoes> e </acoes>:
<acoes>
{
  "botoes": [
    {"texto": "Cadastrar produtos", "acao": "mensagem", "valor": "quero cadastrar produtos"},
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
Você está em fluxo guiado de cadastro. Etapa atual: iniciada. Explique que precisa de um arquivo de produtos com nome, custo, estoque e fotos nomeadas SKU_01.jpg. Oriente o usuário a baixar o modelo e enviar o arquivo preenchido pelo próprio chat. NÃO redirecione automaticamente.`,

  aguardando_planilha: `

CONTEXTO DO FLUXO GUIADO:
Você está em fluxo guiado de cadastro. Etapa atual: aguardando_planilha. O modelo de arquivo já está disponível para download nos botões abaixo (adicionados automaticamente pelo sistema — NÃO os inclua no JSON de acoes). Explique brevemente o que preencher: SKU (código único do produto), Nome do Produto (mínimo 3 caracteres), Marca, Categoria, Custo Unitário em R$ (ex: 11.60 ou 11,60) e Estoque (número inteiro). Seja breve e direto. NÃO redirecione automaticamente.`,

  validando_planilha: `

CONTEXTO DO FLUXO GUIADO:
Você está em fluxo guiado de cadastro. Etapa atual: validando_planilha. O usuário já enviou o arquivo de produtos e está aguardando a análise. Informe que o arquivo foi recebido e está sendo verificado. NÃO mostre botões de download de modelo.`,

  aguardando_drive: `

CONTEXTO DO FLUXO GUIADO:
Você está em fluxo guiado de cadastro. Etapa atual: aguardando_drive. O arquivo de produtos foi validado com sucesso. Peça ao usuário o link de uma pasta do Google Drive com as fotos dos produtos. As fotos devem ser nomeadas SKU_01.jpg (capa), SKU_02.jpg (extras). A pasta precisa estar compartilhada como "Qualquer pessoa com o link → Visualizador". Um campo dedicado para colar o link aparece automaticamente abaixo desta mensagem (adicionado pelo sistema — NÃO inclua botões de envio de link no JSON de acoes). Você pode oferecer os botões "Como compartilhar?" e "Tirar dúvida" com ação mensagem.`,
}

const PALAVRAS_AJUDA = /\b(como|ajuda|exemplo|explica|duvida|dúvida|tutorial|passo|instruc)/i

const TITULOS_EXCLUIDOS = new Set([
  'Cadastrar produtos',
  'quero cadastrar produtos',
  'quero cadastrar mais produtos',
  'Ver meus catálogos',
  'Ajustar preços',
  'Tirar uma dúvida',
  'Tenho uma dúvida',
  'Quero continuar o cadastro',
  'Quero cancelar e começar do zero',
  'Ver meu plano',
])

const HISTORICO_CONTEXTO_LIMITE = 12

type HistoricoContexto = {
  papel: 'user' | 'assistant'
  conteudo: string
}

function normalizarHistoricoContexto(historico: unknown): HistoricoContexto[] {
  if (!Array.isArray(historico)) return []

  return historico
    .filter((item): item is { papel: unknown; conteudo: unknown } => (
      item !== null &&
      typeof item === 'object' &&
      'papel' in item &&
      'conteudo' in item
    ))
    .map(item => ({
      papel: item.papel === 'user' ? 'user' as const : item.papel === 'assistant' ? 'assistant' as const : null,
      conteudo: typeof item.conteudo === 'string' ? item.conteudo.trim() : '',
    }))
    .filter((item): item is HistoricoContexto => item.papel !== null && item.conteudo.length > 0)
    .slice(-HISTORICO_CONTEXTO_LIMITE)
}

function normalizarComparacaoTitulo(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizarTituloConversa(mensagem: unknown): string | null {
  if (typeof mensagem !== 'string') return null

  let titulo = mensagem.trim().replace(/\s+/g, ' ')
  if (!titulo || titulo.startsWith('[')) return null

  const comparacao = normalizarComparacaoTitulo(titulo)
  const excluido = Array.from(TITULOS_EXCLUIDOS).some(item => (
    normalizarComparacaoTitulo(item) === comparacao
  ))
  if (excluido) return null

  if (
    comparacao.startsWith('baixei o template') ||
    comparacao.startsWith('baixei o modelo') ||
    comparacao.startsWith('canais escolhidos:') ||
    comparacao.startsWith('como publicar no ')
  ) {
    return null
  }

  titulo = titulo
    .replace(/^(quero|gostaria de|preciso|pode me ajudar a|me ajuda a)\s+/i, '')
    .replace(/[?.!]+$/g, '')
    .trim()

  if (titulo.length < 8) return null
  if (titulo.length > 56) titulo = `${titulo.slice(0, 53).trim()}...`

  return titulo.charAt(0).toUpperCase() + titulo.slice(1)
}

const INSTRUCOES_UPLOAD: Record<string, string> = {
  'Shopee': `O usuário pediu ajuda para publicar no Shopee. Explique passo a passo, com clareza e formatação Markdown:
1. **Pré-requisito:** Configurações → Envio → Canal Logístico → Correios ATIVO (toggle verde)
2. **Acessar:** Central do Vendedor → Produto → Upload em massa → aba **ENVIO** (não 'Baixar')
3. Selecione o arquivo **.xlsx** exportado pela Guiamos (NÃO usar o modelo original da Shopee)
4. Aguardar processamento — checar 'Registros' até aparecer 'Sucesso X/X'
5. Se houver erros: exportar o resultado e enviar pra Guiamos (mencione brevemente o ciclo de correção automática)
6. Quando tudo OK: Produto → Rascunho (X) → Selecionar todos → Ações em Massa → Publicar
7. Opcional: Ferramentas de Produto → Editar Características → preencher atributos
Termine perguntando se ficou alguma dúvida específica. Não invente passos.`,

  'Mercado Livre': `O usuário pediu ajuda para publicar no Mercado Livre. Explique passo a passo:
1. **Pré-requisito:** conta ML **EMPRESARIAL** (CNPJ) com Mercado Envios habilitado
2. Se a conta estiver conectada ao Guiamos, use o card **Revisar e publicar no Mercado Livre**
3. Revise título, preço, categoria, estoque e fotos antes de confirmar
4. Se a publicação direta ainda estiver bloqueada, use a exportação técnica apenas como apoio temporário
5. Se houver erros do Mercado Livre, envie a mensagem exata para o Guiamos traduzir e orientar a correção
Termine perguntando se ficou alguma dúvida.`,

  'Amazon': `O usuário pediu ajuda para publicar na Amazon. Explique passo a passo:
1. **Pré-requisito:** verificar se o produto já existe no catálogo Amazon (busca por EAN). Se sim: vincular ao listing existente, não criar novo.
2. Se não tem EAN: solicitar isenção de GTIN em sellercentral.amazon.com.br (24-48h)
3. **Acessar:** Seller Central → Catálogo → Adicionar Produtos (ou upload em massa via template Amazon)
4. Preencher Informações Vitais (EAN, título, marca, categoria)
5. Completar abas: Variações, Oferta, Imagens (upload direto, mín. 1000x1000px), Descrição
6. Salvar e finalizar — aguardar aprovação (~15 min a 24h)
Termine perguntando se ficou alguma dúvida.`,

  'Magalu': `O usuário pediu ajuda para publicar no Magalu. Explique passo a passo:
1. **Pré-requisito:** CNPJ ativo há +3 meses + emissão de NF-e ativa
2. Acessar o painel **IntegraCommerce** (fornecido pelo Magalu)
3. Cadastrar produtos com o arquivo de cadastro exportado pela Guiamos
4. Atenção: apenas cores simples (azul, preto, verde...) — evitar 'azul marinho', 'verde-água'
5. Aguardar análise do catálogo (~24-48h)
6. Após aprovação, adicionar fotos (mín. 2, 900x900px, fundo branco, máx. 2MB)
Termine perguntando se ficou alguma dúvida.`,

  'TikTok Shop': `O usuário pediu ajuda para publicar no TikTok Shop. Explique passo a passo:
1. **Acessar:** seller.tiktok.com → Produtos → Importar produtos em massa (menu lateral esquerdo)
2. Selecionar o **CSV** gerado pela Guiamos (marcas e dimensões já validadas/ajustadas)
3. Aguardar processamento (~10 min) — TikTok notifica quando concluído
4. Para cada produto: adicionar fotos manualmente + vídeo (vídeo curto 15-30s dá boost significativo do algoritmo)
5. Ativar produtos: Meus Produtos → Inativo → Ativar
Termine perguntando se ficou alguma dúvida.`,

  'Bling': `O usuário pediu ajuda para importar o cadastro no Bling. Explique passo a passo:
1. Bling → Produtos → Importar Produtos → Selecionar arquivo
2. Selecionar o **CSV** gerado pela Guiamos (campos pré-mapeados — Bling reconhece automaticamente)
3. Confirmar importação
4. Produtos aparecem com dimensões, fotos e categorias preenchidas — prontos pra emissão de NF-e e controle de estoque

Em seção separada ao final:
💡 **Avançado (opcional):** Se você quiser que o Bling sincronize estoque automaticamente com ML/Shopee, ative as integrações em Bling → Configurações → Integrações. Importante: ao ativar a integração com ML, habilite também a opção 'Atualizar dimensões ao exportar produto' — sem isso, o ML pode mostrar prazos de entrega errados nos seus anúncios.

Termine perguntando se ficou alguma dúvida.`,
}

// ── Parsers de marcadores internos ────────────────────────────────────────────

function parsearMarcadorPlanilha(c: string): { nome: string; tamanho: number } | null {
  if (!c.startsWith('[PLANILHA_ENVIADA:') && !c.startsWith('[ARQUIVO_PRODUTOS_ENVIADO:')) return null
  try {
    return JSON.parse(
      c
        .replace(/^\[(PLANILHA_ENVIADA|ARQUIVO_PRODUTOS_ENVIADO):\s*/, '')
        .replace(/\]$/, '')
        .trim()
    )
  }
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
  if (arq) return `Enviei meu arquivo de produtos: ${arq.nome}`
  if (conteudo.startsWith('[VALIDACAO_OK:')) return 'O arquivo de produtos foi validado com sucesso.'
  if (conteudo.startsWith('[VALIDACAO_ERRO:')) return 'Houve erros na validação do arquivo de produtos.'
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

    const { mensagem, historico, conversa_id } = await request.json()

    if (!conversa_id || typeof conversa_id !== 'string') {
      return Response.json({ error: 'conversa_id obrigatório' }, { status: 400 })
    }

    const { data: conversa } = await supabase
      .from('conversas')
      .select('id, titulo')
      .eq('id', conversa_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!conversa) return Response.json({ error: 'conversa não encontrada' }, { status: 403 })

    // Mensagens internas de validação não são salvas no histórico do chat
    if (!esMensagemInterna(mensagem)) {
      const { data: dataUser, error: errUser, status: statusUser } = await supabase
        .from('chat_historico')
        .insert({
          user_id: user.id,
          papel: 'user',
          conteudo: mensagem,
          conversa_id,
        })
        .select()

      if (errUser) console.error('[chat-principal] INSERT user falhou:', JSON.stringify(errUser))

      const tituloSugerido = conversa.titulo === null ? normalizarTituloConversa(mensagem) : null
      const atualizacaoConversa: { atualizada_em: string; titulo?: string } = {
        atualizada_em: new Date().toISOString(),
      }
      if (tituloSugerido) atualizacaoConversa.titulo = tituloSugerido

      const { error: errConversa } = await supabase
        .from('conversas')
        .update(atualizacaoConversa)
        .eq('id', conversa_id)
        .eq('user_id', user.id)

      if (errConversa) console.error('[chat-principal] UPDATE conversa falhou:', JSON.stringify(errConversa))
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
        const { error: errSel } = await supabase.from('chat_historico').insert({
          user_id: user.id,
          papel: 'assistant',
          conteudo: resposta,
          acoes_rapidas: acoes,
          conversa_id,
        })
        if (errSel) console.error('[chat-principal] INSERT seletor_canais falhou:', errSel)
        return Response.json({ resposta, acoes })
      }
    }

    // ── Detecta marcadores e constrói contexto ────────────────────────────────
    const infoPlanilha = parsearMarcadorPlanilha(mensagem)
    const infoValidacaoOk = parsearMarcadorValidacaoOk(mensagem)
    const infoValidacaoErro = parsearMarcadorValidacaoErro(mensagem)

    let contextoEtapa = sessaoAtiva ? (CONTEXTO_ETAPA[sessaoAtiva.etapa] ?? '') : ''

    const eTirandoDuvida = mensagem === 'Tenho uma dúvida'
    const eBaixouTemplate = mensagem.startsWith('Baixei o template em') || mensagem.startsWith('Baixei o modelo em')
    const eCanaisEscolhidos = mensagem.startsWith('Canais escolhidos:')
    const eAjudaUpload = mensagem.startsWith('Como subir no ') || mensagem.startsWith('Como publicar no ')

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
A geração já foi concluída com sucesso. Canais: ${lista}. Informe ao usuário de forma breve que os cadastros já foram preparados e estão disponíveis em 'Meus Catálogos'.`
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

        // Salva mensagem "processando" ANTES de disparar — garante ordem no histórico
        const procesandoTexto = `Perfeito! Estou preparando os cadastros para ${lista}. Isso pode levar alguns instantes... ⏳`
        const { error: errProc } = await supabase.from('chat_historico').insert({
          user_id: user.id,
          papel: 'assistant',
          conteudo: procesandoTexto,
          acoes_rapidas: null,
          conversa_id,
        })
        if (errProc) console.error('[chat-principal] INSERT processando falhou:', errProc)

        let geracaoOk = false
        let geracaoData: {
          mensagem_sucesso?: {
            conteudo: string
            acoes: { botoes: Array<Record<string, unknown>> }
          } | null
        } | null = null
        try {
          const gerarResp = await fetch(gerarUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
            body: JSON.stringify({ sessao_id: sessaoAtiva.id, conversa_id }),
          })
          console.log('[CHAT] gerar-do-chat status:', gerarResp.status)
          geracaoOk = gerarResp.ok
          if (geracaoOk) {
            geracaoData = await gerarResp.json().catch(() => null)
          } else {
            const errBody = await gerarResp.text()
            console.error('[CHAT PRINCIPAL] gerar-do-chat erro:', gerarResp.status, errBody)
          }
        } catch (e) {
          console.error('[CHAT PRINCIPAL] erro ao chamar gerar-do-chat:', e)
        }

        if (geracaoOk) {
          if (geracaoData?.mensagem_sucesso) {
            console.log('[CHAT] retornando mensagem_sucesso direta')
            return Response.json({
              resposta: geracaoData.mensagem_sucesso.conteudo,
              acoes: geracaoData.mensagem_sucesso.acoes,
            })
          }

          // gerar-do-chat já inseriu a mensagem de sucesso com cards + botões de ajuda
          // Frontend vai recarregar o histórico pra exibir ambas as mensagens
          return Response.json({ resposta: procesandoTexto, acoes: null, recarregar_historico: true })
        }

        // Falha: cai no fluxo normal do Anthropic com contexto de erro
        contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
Houve um erro na geração dos cadastros para os canais: ${lista}. Peça desculpas ao usuário de forma empática. Ofereça um botão 'Tentar de novo' com ação de mensagem.`
      }
    } else if (eAjudaUpload) {
      const nomeCanal = mensagem.replace(/^Como (subir|publicar) no /, '').replace(/\?$/, '').trim()
      const instrucoes = INSTRUCOES_UPLOAD[nomeCanal]
      if (instrucoes) {
        contextoEtapa = `\n\n${instrucoes}`
      } else {
        contextoEtapa = `\n\nO usuário pediu ajuda para publicar produtos no marketplace "${nomeCanal}". Explique de forma clara e estruturada o que você sabe sobre cadastro/publicação nessa plataforma. Se não tiver informação específica suficiente, oriente o usuário a consultar a central de ajuda do marketplace.`
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
O usuário acabou de baixar o modelo. Confirme de forma curta e amigável (1-2 frases). Oriente que assim que terminar de preencher o arquivo, ele deve clicar no botão grande abaixo para enviar. NÃO ofereça mais botões de download.`
    } else if (infoPlanilha) {
      contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
O usuário acabou de enviar um arquivo de produtos (nome: ${infoPlanilha.nome}). Etapa atual: validando_planilha. Confirme o recebimento de forma calorosa e diga que vai analisar o conteúdo. Mencione que a análise automática está sendo finalizada. NÃO mostre botões de download de modelo novamente.`
    } else if (infoValidacaoOk) {
      contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
O arquivo de produtos foi validado com sucesso. Total de produtos encontrados: ${infoValidacaoOk.total}. Etapa atual: aguardando_drive. Parabenize o usuário pelo arquivo estar correto, mencione o número de produtos detectados, e explique a próxima etapa: ele precisa enviar o link de uma pasta do Google Drive com as fotos dos produtos. As fotos devem estar nomeadas como SKU_01.jpg (capa), SKU_02.jpg (extras), e a pasta precisa estar compartilhada como 'Qualquer pessoa com o link → Visualizador'. Peça o link do Drive de forma clara.`
    } else if (infoValidacaoErro !== null) {
      contextoEtapa = `

CONTEXTO DO FLUXO GUIADO:
O arquivo de produtos tem erros e precisa ser corrigido. Etapa atual: aguardando_planilha (voltou). Avise o usuário de forma empática (sem dramatizar) que encontrou problemas, liste estes erros exatamente: "${infoValidacaoErro}". Peça pra corrigir e reenviar usando o botão de anexo (clipe) no chat. NÃO ofereça botões de download de modelo novamente (ele já tem). Ofereça botão rápido 'Como corrigir?' caso o usuário não entenda algum erro.`
    }

    const systemPrompt = SYSTEM_PROMPT_BASE + contextoEtapa
    const mensagemParaClaude = limparParaClaude(mensagem)
    const historicoContexto = normalizarHistoricoContexto(historico)

    const messages = [
      ...historicoContexto.map(h => ({
        role: h.papel,
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
    if (eAjudaUpload) {
      const aiAcoes = acoes?.botoes ?? []
      acoes = {
        botoes: [
          ...aiAcoes,
          { acao: 'mensagem', texto: 'Tirar outra dúvida', valor: 'Tenho uma dúvida' },
          { acao: 'mensagem', texto: 'Cadastrar mais produtos', valor: 'quero cadastrar mais produtos' },
        ],
      }
    } else if (arquivosBaixaveis.length > 0) {
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
      const botaoUpload = { texto: '📎 Enviar arquivo preenchido', acao: 'upload' }
      acoes = { botoes: [botaoUpload, ...(acoes?.botoes ?? [])] }
    } else if (sessaoAtiva?.etapa === 'aguardando_planilha' && !PALAVRAS_AJUDA.test(mensagem)) {
      const botoesDl = [
        { texto: 'Baixar modelo Excel', acao: 'download', url: TEMPLATE_XLSX_URL },
        { texto: 'Baixar modelo CSV', acao: 'download', url: TEMPLATE_CSV_URL },
      ]
      acoes = { botoes: [...(acoes?.botoes ?? []), ...botoesDl] }
    }

    const { data: dataAssistant, error: errAssistant, status: statusAssistant } = await supabase
      .from('chat_historico')
      .insert({
        user_id: user.id,
        papel: 'assistant',
        conteudo: textoLimpo,
        acoes_rapidas: acoes,
        conversa_id,
      })
      .select()

    if (errAssistant) console.error('[chat-principal] INSERT assistant falhou:', JSON.stringify(errAssistant))

    return Response.json({ resposta: textoLimpo, acoes })
  } catch (error) {
    console.error('[CHAT PRINCIPAL] erro:', error)
    return Response.json({ error: 'Erro ao processar mensagem' }, { status: 500 })
  }
}
