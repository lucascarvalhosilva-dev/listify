'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw, SlidersHorizontal, Wand2, X } from 'lucide-react'
import type { AplicarAjusteEm, PriceGuardCanalResumo, TipoAjustePreco } from '@/lib/price-guard'

export interface MensagemAjustePrecos {
  conteudo: string
  acoes: { botoes: unknown[] }
}

type Props = {
  sessaoId: string
  conversaId: string
  canais: PriceGuardCanalResumo[]
  onCancelar: () => void
  onSucesso: (mensagem: MensagemAjustePrecos) => void
}

const estilosBotaoModo = (ativo: boolean) => ({
  border: `1px solid ${ativo ? '#155bd5' : '#dfe7f1'}`,
  background: ativo ? '#eaf2ff' : '#fff',
  color: ativo ? '#155bd5' : '#586174',
  borderRadius: 12,
  padding: '9px 10px',
  fontSize: 12,
  fontWeight: 850,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  minHeight: 38,
})

function formatarModo(tipo: TipoAjustePreco) {
  if (tipo === 'percentual') return 'Aumentar por percentual'
  if (tipo === 'valor_fixo') return 'Somar valor fixo'
  return 'Corrigir margem'
}

function textoQuantidade(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`
}

export default function MiniEditorPrecos({ sessaoId, conversaId, canais, onCancelar, onSucesso }: Props) {
  const canaisComAlerta = canais.filter(canal => canal.produtos_com_alerta > 0)
  const canaisDefault = (canaisComAlerta.length > 0 ? canaisComAlerta : canais).map(canal => canal.canal)
  const [tipo, setTipo] = useState<TipoAjustePreco>('margem_minima')
  const [canaisSelecionados, setCanaisSelecionados] = useState<string[]>(canaisDefault)
  const [aplicarEm, setAplicarEm] = useState<AplicarAjusteEm>('com_risco')
  const [margemMinima, setMargemMinima] = useState(10)
  const [percentual, setPercentual] = useState(8)
  const [valorFixo, setValorFixo] = useState(3)
  const [arredondar90, setArredondar90] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const canaisAtivos = useMemo(
    () => canais.filter(canal => canaisSelecionados.includes(canal.canal)),
    [canais, canaisSelecionados]
  )
  const alertasSelecionados = canaisAtivos.reduce((acc, canal) => acc + canal.produtos_com_alerta, 0)
  const produtosSelecionados = canaisAtivos.reduce((acc, canal) => acc + canal.produtos_analisados, 0)
  const menorMargemAtual = canaisAtivos
    .map(canal => canal.margem_minima_percentual)
    .filter((valor): valor is number => typeof valor === 'number' && Number.isFinite(valor))
    .sort((a, b) => a - b)[0] ?? null

  const alternarCanal = (canal: string) => {
    setCanaisSelecionados(prev =>
      prev.includes(canal)
        ? prev.filter(item => item !== canal)
        : [...prev, canal]
    )
  }

  const aplicar = async () => {
    if (enviando) return
    if (canaisSelecionados.length === 0) {
      setErro('Escolha pelo menos um canal.')
      return
    }

    setEnviando(true)
    setErro('')
    try {
      const res = await fetch('/api/ajustar-precos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessao_id: sessaoId,
          conversa_id: conversaId,
          tipo,
          canais: canaisSelecionados,
          aplicar_em: aplicarEm,
          margem_minima: margemMinima,
          percentual,
          valor_fixo: valorFixo,
          arredondar_90: arredondar90,
        }),
      })
      const data = await res.json() as { error?: string; mensagem_sucesso?: MensagemAjustePrecos }
      if (!res.ok || !data.mensagem_sucesso) {
        setErro(data.error ?? 'Não consegui ajustar os preços agora.')
        return
      }
      onSucesso(data.mensagem_sucesso)
      onCancelar()
    } catch {
      setErro('Erro de rede ao ajustar preços.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{
      maxWidth: 520,
      width: '100%',
      border: '1px solid #bfd4f5',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.98)',
      boxShadow: '0 12px 30px rgba(26,115,232,0.10)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 11,
        padding: '14px 16px',
        background: '#f3f8ff',
        borderBottom: '1px solid #dfe7f1',
      }}>
        <span style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          background: '#eaf2ff',
          color: '#155bd5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <SlidersHorizontal size={18} strokeWidth={2.4} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: '#182233', fontSize: 14, fontWeight: 900 }}>Ajustar preços no chat</div>
          <div style={{ color: '#586174', fontSize: 12, lineHeight: 1.45, marginTop: 4 }}>
            Escolha a regra e eu atualizo o cadastro sem alterar títulos, fotos ou descrições.
          </div>
        </div>
        <button
          onClick={onCancelar}
          aria-label="Fechar ajuste de preços"
          style={{
            width: 30,
            height: 30,
            border: '1px solid #d8e4f2',
            borderRadius: 10,
            background: '#fff',
            color: '#697386',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={15} strokeWidth={2.4} />
        </button>
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div>
          <div style={{ color: '#586174', fontSize: 11, fontWeight: 850, marginBottom: 7 }}>Regra de ajuste</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            <button type="button" style={estilosBotaoModo(tipo === 'margem_minima')} onClick={() => setTipo('margem_minima')}>
              <Wand2 size={14} strokeWidth={2.4} />
              Margem
            </button>
            <button type="button" style={estilosBotaoModo(tipo === 'percentual')} onClick={() => setTipo('percentual')}>
              %
              Percentual
            </button>
            <button type="button" style={estilosBotaoModo(tipo === 'valor_fixo')} onClick={() => setTipo('valor_fixo')}>
              R$
              Valor fixo
            </button>
          </div>
        </div>

        <div>
          <div style={{ color: '#586174', fontSize: 11, fontWeight: 850, marginBottom: 7 }}>Canais</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {canais.map(canal => {
              const ativo = canaisSelecionados.includes(canal.canal)
              return (
                <button
                  key={canal.canal}
                  type="button"
                  onClick={() => alternarCanal(canal.canal)}
                  style={{
                    border: `1px solid ${ativo ? '#155bd5' : '#dfe7f1'}`,
                    background: ativo ? '#eaf2ff' : '#fff',
                    color: ativo ? '#155bd5' : '#586174',
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 850,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'inline-flex',
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  {ativo && <CheckCircle2 size={13} strokeWidth={2.5} />}
                  {canal.nome_canal_label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: '#586174', fontSize: 11, fontWeight: 850 }}>
              {tipo === 'margem_minima' ? 'Margem mínima' : tipo === 'percentual' ? 'Aumento' : 'Valor por produto'}
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #dfe7f1',
              borderRadius: 12,
              background: '#fff',
              overflow: 'hidden',
            }}>
              <input
                type="number"
                min={tipo === 'margem_minima' ? 1 : 0}
                max={tipo === 'margem_minima' ? 80 : undefined}
                step={tipo === 'valor_fixo' ? 0.5 : 1}
                value={tipo === 'margem_minima' ? margemMinima : tipo === 'percentual' ? percentual : valorFixo}
                onChange={e => {
                  const valor = Number(e.target.value)
                  if (tipo === 'margem_minima') setMargemMinima(valor)
                  else if (tipo === 'percentual') setPercentual(valor)
                  else setValorFixo(valor)
                }}
                style={{
                  minWidth: 0,
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '10px 10px',
                  fontSize: 13,
                  color: '#182233',
                  fontWeight: 800,
                  fontFamily: 'inherit',
                }}
              />
              <span style={{ color: '#697386', fontSize: 12, fontWeight: 800, paddingRight: 10 }}>
                {tipo === 'valor_fixo' ? 'R$' : '%'}
              </span>
            </div>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: '#586174', fontSize: 11, fontWeight: 850 }}>Aplicar em</span>
            <select
              value={aplicarEm}
              onChange={e => setAplicarEm(e.target.value as AplicarAjusteEm)}
              style={{
                border: '1px solid #dfe7f1',
                borderRadius: 12,
                background: '#fff',
                color: '#182233',
                padding: '10px 10px',
                fontSize: 13,
                fontWeight: 800,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            >
              <option value="com_risco">Só preços com alerta</option>
              <option value="todos">Todos os produtos</option>
            </select>
          </label>
        </div>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          color: '#586174',
          fontSize: 12,
          fontWeight: 750,
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={arredondar90}
            onChange={e => setArredondar90(e.target.checked)}
          />
          Arredondar preços para final .90
        </label>

        <div style={{
          border: '1px solid #dfe7f1',
          borderRadius: 13,
          background: '#fbfdff',
          padding: '10px 12px',
          color: '#586174',
          fontSize: 12,
          lineHeight: 1.5,
        }}>
          <strong style={{ color: '#182233' }}>{formatarModo(tipo)}:</strong>{' '}
          {aplicarEm === 'com_risco'
            ? `${textoQuantidade(alertasSelecionados, 'alerta', 'alertas')} ${alertasSelecionados === 1 ? 'será avaliado' : 'serão avaliados'}.`
            : `${textoQuantidade(produtosSelecionados, 'preço', 'preços')} ${produtosSelecionados === 1 ? 'será recalculado' : 'serão recalculados'}.`}
          {menorMargemAtual !== null && ` Menor margem atual: ${menorMargemAtual.toFixed(1).replace('.', ',')}%.`}
        </div>

        {erro && (
          <div style={{
            border: '1px solid #f7b4ad',
            borderRadius: 12,
            background: '#fff1f0',
            color: '#b42318',
            padding: '9px 10px',
            fontSize: 12,
            fontWeight: 750,
          }}>
            {erro}
          </div>
        )}

        <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onCancelar}
            disabled={enviando}
            style={{
              border: '1px solid #dfe7f1',
              background: '#fff',
              color: '#586174',
              borderRadius: 999,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 800,
              cursor: enviando ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={aplicar}
            disabled={enviando || canaisSelecionados.length === 0}
            style={{
              border: 'none',
              background: enviando || canaisSelecionados.length === 0 ? '#9aa0a6' : '#155bd5',
              color: '#fff',
              borderRadius: 999,
              padding: '9px 15px',
              fontSize: 13,
              fontWeight: 850,
              cursor: enviando || canaisSelecionados.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: enviando || canaisSelecionados.length === 0 ? 'none' : '0 9px 20px rgba(26,115,232,0.18)',
            }}
          >
            {enviando ? <Loader2 size={15} className="send-spinner" /> : <RefreshCw size={15} strokeWidth={2.4} />}
            {enviando ? 'Atualizando' : 'Atualizar cadastro'}
          </button>
        </div>
      </div>
    </div>
  )
}
