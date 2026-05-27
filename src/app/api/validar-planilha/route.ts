import { createClient } from '@/lib/supabase/server'
import { atualizarEtapa } from '@/lib/sessoes-geracao'
import {
  baixarPlanilhaDoStorage,
  parsearPlanilha,
  validarEstrutura,
  formatarErrosParaIA,
  LIMITE_PRODUTOS,
} from '@/lib/validador-planilha'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'não autenticado' }, { status: 401 })

    const { sessao_id } = await request.json()

    const { data: sessao } = await supabase
      .from('sessoes_geracao')
      .select('*')
      .eq('id', sessao_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!sessao) return Response.json({ error: 'Sessão não encontrada.' }, { status: 404 })
    if (sessao.etapa !== 'validando_planilha') {
      return Response.json({ error: `Sessão não está em validando_planilha (etapa: ${sessao.etapa}).` }, { status: 400 })
    }

    const planilhaPath = sessao.dados_planilha?.planilha_path as string | undefined
    const planilhaNome = (sessao.dados_planilha?.planilha_nome as string | undefined) ?? 'arquivo de produtos'

    if (!planilhaPath) {
      return Response.json({ error: 'Caminho do arquivo de produtos não encontrado na sessão.' }, { status: 400 })
    }

    // ── Download ──────────────────────────────────────────────────────────────
    let buffer: Buffer
    try {
      buffer = await baixarPlanilhaDoStorage(planilhaPath)
    } catch {
      return Response.json({
        error: 'Não consegui abrir o arquivo. Verifique se ele não está corrompido.',
      }, { status: 500 })
    }

    // ── Parse ─────────────────────────────────────────────────────────────────
    let linhas: Array<Record<string, unknown>>
    try {
      linhas = parsearPlanilha(buffer, planilhaNome)
    } catch {
      return Response.json({
        error: 'Não consegui abrir o arquivo. Verifique se ele não está corrompido.',
      }, { status: 500 })
    }

    // ── Limite ────────────────────────────────────────────────────────────────
    if (linhas.length > LIMITE_PRODUTOS) {
      const errosResumido = `Arquivo muito grande. Máximo ${LIMITE_PRODUTOS} produtos por envio (encontrados: ${linhas.length}).`
      await atualizarEtapa(sessao.id, 'aguardando_planilha', {
        validacao_ok: false,
        erros_resumo: errosResumido,
        total_erros: 1,
      })
      return Response.json({ sucesso: true, valida: false, erros_resumo: errosResumido, total_erros: 1, total_linhas: linhas.length })
    }

    // ── Validação estrutural ──────────────────────────────────────────────────
    const resultado = validarEstrutura(linhas)

    if (resultado.valida) {
      await atualizarEtapa(sessao.id, 'aguardando_drive', {
        validacao_ok: true,
        total_produtos: resultado.produtos_validos.length,
        produtos: resultado.produtos_validos.slice(0, 50),
      })
      return Response.json({
        sucesso: true,
        valida: true,
        total_produtos: resultado.produtos_validos.length,
      })
    } else {
      const errosResumido = formatarErrosParaIA(resultado)
      await atualizarEtapa(sessao.id, 'aguardando_planilha', {
        validacao_ok: false,
        erros_resumo: errosResumido,
        total_erros: resultado.total_erros,
      })
      return Response.json({
        sucesso: true,
        valida: false,
        erros_resumo: errosResumido,
        total_erros: resultado.total_erros,
        total_linhas: resultado.total_linhas,
      })
    }
  } catch (error) {
    console.error('[VALIDAR-PLANILHA] erro:', error)
    return Response.json({ error: 'Erro interno ao validar arquivo de produtos.' }, { status: 500 })
  }
}
