export type ResultadoValidacaoDrive = {
  acessivel: boolean
  tipo_erro?: 'nao_publico' | 'nao_encontrado' | 'nao_e_pasta' | 'erro_rede'
  mensagem_erro?: string
}

export function extrairUrlDrive(mensagem: string): string | null {
  const match = mensagem.match(/https:\/\/drive\.google\.com\/\S+/)
  if (!match) return null
  // Strip common sentence-ending punctuation that users paste after URLs
  return match[0].replace(/[,.)}\]"'!?]+$/, '')
}

export async function validarAcessoDrive(url: string): Promise<ResultadoValidacaoDrive> {
  // Arquivo individual (não pasta)
  if (url.includes('/file/d/')) {
    return {
      acessivel: false,
      tipo_erro: 'nao_e_pasta',
      mensagem_erro: mensagemErroAmigavel('nao_e_pasta'),
    }
  }
  if (
    !url.includes('/folders/') &&
    !url.includes('open?id=') &&
    !url.includes('folderview?id=')
  ) {
    return {
      acessivel: false,
      tipo_erro: 'nao_e_pasta',
      mensagem_erro: mensagemErroAmigavel('nao_e_pasta'),
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)

    const urlFinal = res.url.includes('accounts.google.com') ? 'accounts.google.com' : 'drive.google.com'
    console.log('[DRIVE] status HTTP:', res.status, '| url final:', urlFinal)

    if (res.status === 404) {
      return {
        acessivel: false,
        tipo_erro: 'nao_encontrado',
        mensagem_erro: mensagemErroAmigavel('nao_encontrado'),
      }
    }

    // Redirect para signin = definitivamente privado (sinal negativo forte sem precisar ler body)
    if (
      res.url.includes('accounts.google.com/signin') ||
      res.url.includes('accounts.google.com/ServiceLogin')
    ) {
      console.log('[DRIVE] sinal negativo forte: redirect para accounts.google.com')
      return {
        acessivel: false,
        tipo_erro: 'nao_publico',
        mensagem_erro: mensagemErroAmigavel('nao_publico'),
      }
    }

    if (res.status !== 200) {
      return {
        acessivel: false,
        tipo_erro: 'nao_publico',
        mensagem_erro: mensagemErroAmigavel('nao_publico'),
      }
    }

    const body = await res.text()
    const htmlKb = Math.round(body.length / 1024)

    // ── Sinais POSITIVOS (pasta provavelmente pública) ────────────────────────
    const sinaisPositivos: string[] = []
    if (/\.(jpg|jpeg|png|webp)/i.test(body)) sinaisPositivos.push('imagens-listadas')
    if (body.includes('og:image') && body.includes('drive.google.com')) sinaisPositivos.push('og-image-drive')
    if (body.includes('"Google Drive"') || body.includes("'Google Drive'")) sinaisPositivos.push('og-site-name-drive')
    if (body.includes('_DriveCookie') || body.includes('folderView')) sinaisPositivos.push('estrutura-pasta-drive')
    if (
      body.includes('application/json+oembed') ||
      body.includes('drive.google.com/drive/folders')
    ) sinaisPositivos.push('metadata-pasta')

    // ── Sinais NEGATIVOS FORTES (alta certeza de pasta privada) ──────────────
    const sinaisNegativos: string[] = []
    if (body.includes('Sign in') && body.includes('to continue')) sinaisNegativos.push('sign-in-to-continue')
    if (body.includes('You need access')) sinaisNegativos.push('you-need-access')
    if (
      body.includes('Você precisa solicitar acesso') ||
      body.includes('Solicitar acesso')
    ) sinaisNegativos.push('solicitar-acesso')
    if (body.includes('Request access')) sinaisNegativos.push('request-access')
    if (body.includes('ServiceLogin') && body.includes('continue=')) sinaisNegativos.push('service-login-redirect')

    console.log(
      '[DRIVE] html:', htmlKb + 'kb',
      '| positivos:', sinaisPositivos.join(',') || 'nenhum',
      '| negativos:', sinaisNegativos.join(',') || 'nenhum',
    )

    // ── Decisão: aceitar no caso de dúvida ───────────────────────────────────
    if (sinaisPositivos.length > 0) {
      return { acessivel: true }
    }
    if (sinaisNegativos.length > 0) {
      return {
        acessivel: false,
        tipo_erro: 'nao_publico',
        mensagem_erro: mensagemErroAmigavel('nao_publico'),
      }
    }

    // Nenhum sinal conclusivo → aceitar (falso negativo é menos prejudicial)
    console.log('[DRIVE] sem sinais conclusivos — aceitando no caso de dúvida')
    return { acessivel: true }

  } catch {
    clearTimeout(timeout)
    return {
      acessivel: false,
      tipo_erro: 'erro_rede',
      mensagem_erro: mensagemErroAmigavel('erro_rede'),
    }
  }
}

export function mensagemErroAmigavel(tipo: string): string {
  switch (tipo) {
    case 'nao_publico':
      return "A pasta não está pública. Clique direito na pasta no Drive → Compartilhar → 'Qualquer pessoa com o link' → Visualizador. Depois copie o link novamente."
    case 'nao_encontrado':
      return 'Não consegui encontrar essa pasta. Verifique se o link está completo e correto.'
    case 'nao_e_pasta':
      return 'Esse link parece ser de um arquivo individual, não de uma pasta. Compartilhe a pasta inteira que contém as fotos.'
    case 'erro_rede':
      return 'Não consegui acessar o link agora. Tente novamente em alguns segundos.'
    default:
      return 'Ocorreu um erro ao validar o link. Tente novamente.'
  }
}
