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
  if (!url.includes('/folders/') && !url.includes('open?id=')) {
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

    if (res.status === 404) {
      return {
        acessivel: false,
        tipo_erro: 'nao_encontrado',
        mensagem_erro: mensagemErroAmigavel('nao_encontrado'),
      }
    }

    if (res.status === 200) {
      if (res.url.includes('accounts.google.com')) {
        return {
          acessivel: false,
          tipo_erro: 'nao_publico',
          mensagem_erro: mensagemErroAmigavel('nao_publico'),
        }
      }
      const body = await res.text()
      if (
        body.includes('Sign in') ||
        body.includes('Fazer login') ||
        body.includes('ServiceLogin') ||
        body.includes('accounts.google.com')
      ) {
        return {
          acessivel: false,
          tipo_erro: 'nao_publico',
          mensagem_erro: mensagemErroAmigavel('nao_publico'),
        }
      }
      return { acessivel: true }
    }

    return {
      acessivel: false,
      tipo_erro: 'nao_publico',
      mensagem_erro: mensagemErroAmigavel('nao_publico'),
    }
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
