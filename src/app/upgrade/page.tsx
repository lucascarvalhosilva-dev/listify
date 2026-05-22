'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function Upgrade() {
  const searchParams = useSearchParams()
  const motivo = searchParams.get('motivo')

  const mensagensBloqueio: Record<string, { titulo: string; descricao: string }> = {
    produtos: {
      titulo: 'Você atingiu o limite de produtos do plano Free',
      descricao: 'O plano Free permite processar até 5 produtos por mês. Faça upgrade para continuar cadastrando produtos.',
    },
    canais: {
      titulo: 'Canal não disponível no plano Free',
      descricao: 'O plano Free permite apenas Shopee e Mercado Livre. Faça upgrade para acessar Amazon, TikTok Shop, Magalu e Bling.',
    },
    catalogos: {
      titulo: 'Você atingiu o limite de catálogos do plano Free',
      descricao: 'O plano Free permite salvar apenas 1 catálogo. Faça upgrade para salvar mais catálogos.',
    },
  }
  const planos = [
    {
      nome: 'Starter',
      preco: 'R$29',
      periodo: '/mês',
      destaque: false,
      features: [
        '100 produtos/mês',
        '2 canais simultâneos',
        '5 catálogos salvos',
        'HelpChat com IA',
        'Correção automática de erros',
      ],
    },
    {
      nome: 'Profissional',
      preco: 'R$59',
      periodo: '/mês',
      destaque: true,
      features: [
        '500 produtos/mês',
        '4 canais simultâneos',
        '30 catálogos salvos',
        'HelpChat com IA',
        'Correção automática de erros',
      ],
    },
    {
      nome: 'Agência',
      preco: 'R$127',
      periodo: '/mês',
      destaque: false,
      features: [
        'Produtos ilimitados',
        '6 canais simultâneos',
        'Catálogos ilimitados',
        '3 usuários',
        'HelpChat com IA',
        'Tudo do Profissional',
      ],
    },
  ]

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f8f9fa; color: #202124; }
        .upgrade-wrap { min-height: 100vh; background: #f8f9fa; padding: 48px 24px 80px; }
        .upgrade-header { text-align: center; margin-bottom: 48px; }
        .upgrade-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #5f6368; text-decoration: none; margin-bottom: 32px; }
        .upgrade-back:hover { color: #202124; }
        .upgrade-badge { display: inline-block; background: #fff3e0; color: #e65100; font-size: 12px; font-weight: 600; padding: 6px 16px; border-radius: 20px; margin-bottom: 20px; }
        .upgrade-title { font-size: 36px; font-weight: 700; color: #202124; margin-bottom: 12px; }
        .upgrade-sub { font-size: 16px; color: #5f6368; max-width: 440px; margin: 0 auto; line-height: 1.6; }
        .planos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 900px; margin: 0 auto; }
        .plano { background: #fff; border: 1px solid #e8eaed; border-radius: 24px; padding: 32px; display: flex; flex-direction: column; position: relative; }
        .plano.destaque { border: 2px solid #1a73e8; }
        .plano-badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: #1a73e8; color: #fff; font-size: 11px; font-weight: 500; padding: 5px 16px; border-radius: 12px; white-space: nowrap; }
        .plano-nome { font-size: 11px; font-weight: 600; color: #5f6368; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
        .plano-preco { font-size: 42px; font-weight: 700; color: #202124; line-height: 1; }
        .plano-periodo { font-size: 14px; color: #5f6368; margin-top: 4px; margin-bottom: 24px; }
        .plano-features { list-style: none; flex: 1; display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; }
        .plano-features li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #202124; }
        .plano-features li::before { content: '✓'; color: #1a73e8; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
        .btn-assinar { width: 100%; padding: 13px; border-radius: 24px; font-size: 14px; font-weight: 500; cursor: pointer; border: 1.5px solid #1a73e8; color: #1a73e8; background: transparent; transition: background .15s; }
        .btn-assinar:hover { background: #f0f4ff; }
        .btn-assinar.destaque-btn { background: #1a73e8; color: #fff; border-color: #1a73e8; }
        .btn-assinar.destaque-btn:hover { background: #1557b0; }
        .plano-atual { background: #f8f9fa; border: 1px solid #e8eaed; border-radius: 16px; padding: 20px 28px; max-width: 900px; margin: 0 auto 40px; display: flex; align-items: center; justify-content: space-between; }
        .plano-atual-info { display: flex; align-items: center; gap: 12px; }
        .plano-atual-badge { background: #e8f0fe; color: #1a73e8; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 10px; }
        .plano-atual-texto { font-size: 14px; color: #202124; font-weight: 500; }
        .plano-atual-sub { font-size: 13px; color: #5f6368; margin-top: 2px; }
        .garantia { text-align: center; margin-top: 40px; font-size: 13px; color: #5f6368; }
        .garantia span { font-weight: 600; color: #202124; }
        .bloqueio-banner { background: #fff8e1; border: 1px solid #ffe082; border-radius: 16px; padding: 20px 28px; max-width: 900px; margin: 0 auto 32px; display: flex; align-items: flex-start; gap: 16px; }
        .bloqueio-icone { font-size: 22px; flex-shrink: 0; margin-top: 2px; }
        .bloqueio-titulo { font-size: 15px; font-weight: 600; color: #202124; margin-bottom: 4px; }
        .bloqueio-desc { font-size: 14px; color: #5f6368; line-height: 1.5; }
        @media (max-width: 768px) {
          .planos-grid { grid-template-columns: 1fr; }
          .upgrade-title { font-size: 28px; }
          .plano-atual { flex-direction: column; gap: 12px; align-items: flex-start; }
        }
      `}</style>

      <div className="upgrade-wrap">
        <div className="upgrade-header">
          <Link href="/painel" className="upgrade-back">← Voltar ao painel</Link>
          <div className="upgrade-badge">Você está no plano Free</div>
          <h1 className="upgrade-title">Escolha seu plano</h1>
          <p className="upgrade-sub">Desbloqueie mais produtos, canais e funcionalidades para escalar suas vendas.</p>
        </div>

        {motivo && mensagensBloqueio[motivo] && (
          <div className="bloqueio-banner">
            <div className="bloqueio-icone">⚠️</div>
            <div>
              <div className="bloqueio-titulo">{mensagensBloqueio[motivo].titulo}</div>
              <div className="bloqueio-desc">{mensagensBloqueio[motivo].descricao}</div>
            </div>
          </div>
        )}

        <div className="plano-atual" style={{maxWidth: '900px', margin: '0 auto 40px'}}>
          <div className="plano-atual-info">
            <div className="plano-atual-badge">Free</div>
            <div>
              <div className="plano-atual-texto">Plano atual</div>
              <div className="plano-atual-sub">5 produtos/mês · 2 canais · 1 catálogo</div>
            </div>
          </div>
          <div style={{fontSize: '13px', color: '#5f6368'}}>Sem cobrança</div>
        </div>

        <div className="planos-grid">
          {planos.map((p) => (
            <div key={p.nome} className={`plano${p.destaque ? ' destaque' : ''}`}>
              {p.destaque && <div className="plano-badge">Mais popular</div>}
              <div className="plano-nome">{p.nome}</div>
              <div className="plano-preco">{p.preco}</div>
              <div className="plano-periodo">{p.periodo}</div>
              <ul className="plano-features">
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <button
                className={`btn-assinar${p.destaque ? ' destaque-btn' : ''}`}
                onClick={() => alert('Pagamento em breve — estamos integrando o Mercado Pago.')}
              >
                Assinar {p.nome}
              </button>
            </div>
          ))}
        </div>

        <div className="garantia">
          <span>Sem contrato.</span> Cancele quando quiser. Cobrança mensal.
        </div>
      </div>
    </>
  )
}
