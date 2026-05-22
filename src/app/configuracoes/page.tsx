'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Configuracoes() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [regime, setRegime] = useState('MEI')
  const [margem, setMargem] = useState('30')
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifLimite, setNotifLimite] = useState(true)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaConfirm, setSenhaConfirm] = useState('')
  const [plano, setPlano] = useState('free')
  const [produtosUsados, setProdutosUsados] = useState(0)
  const [limiteProdutos, setLimiteProdutos] = useState(5)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{tipo: 'success' | 'error', texto: string} | null>(null)

  useEffect(() => {
    const fetchDados = async () => {
      const res = await fetch('/api/get-profile')
      if (res.ok) {
        const data = await res.json()
        setNome(data.nome || '')
        setEmail(data.email || '')
        setRegime(data.regime_tributario || 'MEI')
        setMargem(data.margem_padrao || '30')
        setNotifEmail(data.notif_email !== false)
        setNotifLimite(data.notif_limite !== false)
        setPlano(data.plano || 'free')
        setProdutosUsados(data.produtos_usados || 0)
        setLimiteProdutos(data.limite_produtos || 5)
      }
    }
    fetchDados()
  }, [])

  const salvarPerfil = async () => {
    setSalvando(true)
    const res = await fetch('/api/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, regime, margem, notif_email: notifEmail, notif_limite: notifLimite })
    })
    setSalvando(false)
    if (res.ok) {
      setMensagem({ tipo: 'success', texto: 'Configurações salvas com sucesso.' })
    } else {
      setMensagem({ tipo: 'error', texto: 'Erro ao salvar. Tente novamente.' })
    }
    setTimeout(() => setMensagem(null), 3000)
  }

  const trocarSenha = async () => {
    if (senhaNova !== senhaConfirm) {
      setMensagem({ tipo: 'error', texto: 'As senhas não coincidem.' })
      setTimeout(() => setMensagem(null), 3000)
      return
    }
    setSalvando(true)
    const res = await fetch('/api/update-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha_atual: senhaAtual, senha_nova: senhaNova })
    })
    setSalvando(false)
    if (res.ok) {
      setMensagem({ tipo: 'success', texto: 'Senha alterada com sucesso.' })
      setSenhaAtual('')
      setSenhaNova('')
      setSenhaConfirm('')
    } else {
      const data = await res.json()
      setMensagem({ tipo: 'error', texto: data.error || 'Erro ao trocar senha.' })
    }
    setTimeout(() => setMensagem(null), 3000)
  }

  const nomesPlano: Record<string, string> = {
    free: 'Free',
    starter: 'Starter — R$29/mês',
    profissional: 'Profissional — R$59/mês',
    agencia: 'Agência — R$127/mês',
  }

  const pct = Math.min(100, Math.round((produtosUsados / limiteProdutos) * 100))

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f8f9fa; color: #202124; }
        .cfg-wrap { max-width: 720px; margin: 0 auto; padding: 48px 24px 80px; }
        .cfg-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #5f6368; text-decoration: none; margin-bottom: 32px; }
        .cfg-back:hover { color: #202124; }
        .cfg-title { font-size: 28px; font-weight: 700; color: #202124; margin-bottom: 32px; }
        .cfg-section { background: #fff; border: 1px solid #e8eaed; border-radius: 20px; padding: 28px; margin-bottom: 20px; }
        .cfg-section-title { font-size: 15px; font-weight: 600; color: #202124; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e8eaed; }
        .cfg-field { margin-bottom: 16px; }
        .cfg-label { font-size: 13px; font-weight: 500; color: #5f6368; margin-bottom: 6px; display: block; }
        .cfg-input { width: 100%; padding: 10px 14px; border: 1px solid #e8eaed; border-radius: 10px; font-size: 14px; color: #202124; background: #fff; font-family: inherit; }
        .cfg-input:focus { outline: none; border-color: #1a73e8; }
        .cfg-input:disabled { background: #f8f9fa; color: #9aa0a6; cursor: not-allowed; }
        .cfg-select { width: 100%; padding: 10px 14px; border: 1px solid #e8eaed; border-radius: 10px; font-size: 14px; color: #202124; background: #fff; font-family: inherit; cursor: pointer; }
        .cfg-select:focus { outline: none; border-color: #1a73e8; }
        .cfg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .cfg-toggle { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #e8eaed; }
        .cfg-toggle:last-child { border-bottom: none; padding-bottom: 0; }
        .cfg-toggle-info { font-size: 14px; color: #202124; }
        .cfg-toggle-sub { font-size: 12px; color: #5f6368; margin-top: 2px; }
        .toggle-btn { width: 44px; height: 24px; border-radius: 12px; border: none; cursor: pointer; position: relative; transition: background .2s; flex-shrink: 0; }
        .toggle-btn.on { background: #1a73e8; }
        .toggle-btn.off { background: #e8eaed; }
        .toggle-btn::after { content: ''; position: absolute; width: 18px; height: 18px; border-radius: 50%; background: #fff; top: 3px; transition: left .2s; }
        .toggle-btn.on::after { left: 23px; }
        .toggle-btn.off::after { left: 3px; }
        .plano-badge { display: inline-block; background: #e8f0fe; color: #1a73e8; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 10px; margin-bottom: 16px; }
        .uso-label { display: flex; justify-content: space-between; font-size: 13px; color: #5f6368; margin-bottom: 8px; }
        .uso-bar { height: 8px; background: #e8eaed; border-radius: 4px; overflow: hidden; margin-bottom: 16px; }
        .uso-fill { height: 100%; border-radius: 4px; background: #1a73e8; transition: width .3s; }
        .uso-fill.danger { background: #ea4335; }
        .btn-upgrade { display: inline-block; background: #1a73e8; color: #fff; font-size: 13px; font-weight: 500; padding: 9px 20px; border-radius: 20px; text-decoration: none; }
        .btn-upgrade:hover { background: #1557b0; }
        .btn-save { background: #1a73e8; color: #fff; border: none; padding: 11px 28px; border-radius: 20px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; }
        .btn-save:hover { background: #1557b0; }
        .btn-save:disabled { background: #9aa0a6; cursor: not-allowed; }
        .mensagem { padding: 12px 16px; border-radius: 10px; font-size: 14px; margin-bottom: 20px; }
        .mensagem.success { background: #e6f4ea; color: #137333; }
        .mensagem.error { background: #fce8e6; color: #c5221f; }
        @media (max-width: 600px) { .cfg-row { grid-template-columns: 1fr; } }
      `}</style>

      <div className="cfg-wrap">
        <Link href="/painel" className="cfg-back">← Voltar ao painel</Link>
        <h1 className="cfg-title">Configurações</h1>

        {mensagem && (
          <div className={`mensagem ${mensagem.tipo}`}>{mensagem.texto}</div>
        )}

        {/* MINHA CONTA */}
        <div className="cfg-section">
          <div className="cfg-section-title">Minha conta</div>
          <div className="cfg-field">
            <label className="cfg-label">Nome de exibição</label>
            <input className="cfg-input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="cfg-field">
            <label className="cfg-label">E-mail</label>
            <input className="cfg-input" value={email} disabled />
          </div>
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:'8px'}}>
            <button className="btn-save" onClick={salvarPerfil} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* TROCAR SENHA */}
        <div className="cfg-section">
          <div className="cfg-section-title">Trocar senha</div>
          <div className="cfg-field">
            <label className="cfg-label">Senha atual</label>
            <input className="cfg-input" type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="cfg-row">
            <div className="cfg-field">
              <label className="cfg-label">Nova senha</label>
              <input className="cfg-input" type="password" value={senhaNova} onChange={e => setSenhaNova(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="cfg-field">
              <label className="cfg-label">Confirmar nova senha</label>
              <input className="cfg-input" type="password" value={senhaConfirm} onChange={e => setSenhaConfirm(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:'8px'}}>
            <button className="btn-save" onClick={trocarSenha} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Trocar senha'}
            </button>
          </div>
        </div>

        {/* PREFERÊNCIAS */}
        <div className="cfg-section">
          <div className="cfg-section-title">Preferências de geração</div>
          <div className="cfg-row">
            <div className="cfg-field">
              <label className="cfg-label">Regime tributário padrão</label>
              <select className="cfg-select" value={regime} onChange={e => setRegime(e.target.value)}>
                <option value="MEI">MEI</option>
                <option value="Simples Nacional">Simples Nacional</option>
              </select>
            </div>
            <div className="cfg-field">
              <label className="cfg-label">Margem de lucro padrão (%)</label>
              <input className="cfg-input" type="number" min="0" max="100" value={margem} onChange={e => setMargem(e.target.value)} />
            </div>
          </div>
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:'8px'}}>
            <button className="btn-save" onClick={salvarPerfil} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* NOTIFICAÇÕES */}
        <div className="cfg-section">
          <div className="cfg-section-title">Notificações</div>
          <div className="cfg-toggle">
            <div className="cfg-toggle-info">
              E-mail ao terminar geração
              <div className="cfg-toggle-sub">Receba um e-mail quando o processamento do catálogo terminar</div>
            </div>
            <button className={`toggle-btn ${notifEmail ? 'on' : 'off'}`} onClick={() => setNotifEmail(!notifEmail)} />
          </div>
          <div className="cfg-toggle">
            <div className="cfg-toggle-info">
              Aviso de limite próximo
              <div className="cfg-toggle-sub">Receba um aviso quando usar 80% dos produtos do seu plano</div>
            </div>
            <button className={`toggle-btn ${notifLimite ? 'on' : 'off'}`} onClick={() => setNotifLimite(!notifLimite)} />
          </div>
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:'20px'}}>
            <button className="btn-save" onClick={salvarPerfil} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* PLANO */}
        <div className="cfg-section">
          <div className="cfg-section-title">Meu plano</div>
          <div className="plano-badge">{nomesPlano[plano] || plano}</div>
          <div className="uso-label">
            <span>Produtos usados este mês</span>
            <span>{produtosUsados} / {plano === 'agencia' ? '∞' : limiteProdutos}</span>
          </div>
          <div className="uso-bar">
            <div className={`uso-fill ${pct >= 80 ? 'danger' : ''}`} style={{width: `${pct}%`}} />
          </div>
          {plano === 'free' && (
            <Link href="/upgrade" className="btn-upgrade">Fazer upgrade</Link>
          )}
        </div>
      </div>
    </>
  )
}
