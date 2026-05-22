'use client'
import { useState } from 'react'
import Link from 'next/link'
import Logo from './components/Logo'

export default function Home() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null)

  const faqs = [
    { q: 'Preciso saber programar para usar?', r: 'Não. A Listify é uma plataforma web. Você usa pelo navegador, sem instalar nada.' },
    { q: 'Funciona para qualquer tipo de produto?', r: 'Sim. O sistema infere specs pelo nome do produto. Funciona para qualquer categoria.' },
    { q: 'O que acontece se o upload der erro?', r: 'Você envia o arquivo de resultado para a Listify e recebe uma versão corrigida automaticamente.' },
    { q: 'Preciso baixar algum template dos marketplaces?', r: 'Não. Os templates estão armazenados internamente. Você recebe só o arquivo preenchido.' },
    { q: 'Funciona para MEI e Simples Nacional?', r: 'Sim. O preço é calculado com a fórmula correta para cada regime tributário.' },
  ]

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f8f9fa; color: #202124; }
        .nav { background: #fff; border-bottom: 1px solid #e8eaed; padding: 0 40px; height: 64px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
        .nav-logo { font-size: 20px; font-weight: 700; color: #1a73e8; text-decoration: none; display: flex; align-items: baseline; gap: 8px; }
        .nav-logo span { font-size: 11px; font-weight: 400; color: #5f6368; }
        .nav-links { display: flex; gap: 32px; list-style: none; }
        .nav-links a { font-size: 14px; color: #5f6368; text-decoration: none; }
        .nav-links a:hover { color: #202124; }
        .nav-cta { background: #1a73e8; color: #fff; font-size: 14px; font-weight: 500; padding: 9px 22px; border-radius: 24px; text-decoration: none; }
        .nav-cta:hover { background: #1557b0; }
        .hero { background: #fff; padding: 96px 40px 80px; text-align: center; }
        .hero-badge { display: inline-block; border: 1px solid #e8eaed; font-size: 12px; color: #5f6368; padding: 6px 16px; border-radius: 24px; margin-bottom: 28px; }
        .hero h1 { font-size: 52px; font-weight: 700; color: #202124; line-height: 1.12; max-width: 680px; margin: 0 auto 20px; }
        .hero h1 em { color: #1a73e8; font-style: normal; }
        .hero p { font-size: 18px; color: #5f6368; max-width: 540px; margin: 0 auto 36px; line-height: 1.65; }
        .hero-btns { display: flex; gap: 14px; justify-content: center; }
        .btn-primary { background: #1a73e8; color: #fff; padding: 14px 32px; border-radius: 28px; font-size: 15px; font-weight: 500; text-decoration: none; }
        .btn-primary:hover { background: #1557b0; }
        .btn-outline { border: 1.5px solid #1a73e8; color: #1a73e8; padding: 14px 32px; border-radius: 28px; font-size: 15px; font-weight: 500; text-decoration: none; }
        .btn-outline:hover { background: #f0f4ff; }
        .channels { background: #f8f9fa; border-top: 1px solid #e8eaed; border-bottom: 1px solid #e8eaed; padding: 24px 40px; text-align: center; }
        .channels-label { font-size: 11px; color: #5f6368; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 12px; }
        .channels-list { display: flex; justify-content: center; gap: 32px; flex-wrap: wrap; }
        .channels-list span { font-size: 15px; font-weight: 500; color: #202124; }
        .section { padding: 80px 40px; }
        .section-white { background: #fff; }
        .section-gray { background: #f8f9fa; }
        .section-title { font-size: 32px; font-weight: 700; color: #202124; text-align: center; margin-bottom: 10px; }
        .section-sub { font-size: 15px; color: #5f6368; text-align: center; margin-bottom: 48px; }
        .container { max-width: 960px; margin: 0 auto; }
        .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .card { background: #fff; border: 1px solid #e8eaed; border-radius: 20px; padding: 32px; }
        .card-num { font-size: 52px; font-weight: 700; color: #1a73e8; line-height: 1; margin-bottom: 16px; }
        .card-title { font-size: 16px; font-weight: 600; color: #202124; margin-bottom: 10px; }
        .card-desc { font-size: 14px; color: #5f6368; line-height: 1.65; }
        .grid6 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .card-sm { background: #fff; border: 1px solid #e8eaed; border-radius: 16px; padding: 24px; }
        .card-sm .card-title { font-size: 14px; margin-bottom: 8px; }
        .card-sm .card-desc { font-size: 13px; }
        .table-wrap { max-width: 580px; margin: 0 auto; border: 1px solid #e8eaed; border-radius: 20px; overflow: hidden; }
        .table-head { background: #f8f9fa; display: grid; grid-template-columns: 1.5fr 1fr 1fr; padding: 14px 28px; font-size: 11px; font-weight: 600; color: #5f6368; text-transform: uppercase; letter-spacing: .06em; }
        .table-row { display: grid; grid-template-columns: 1.5fr 1fr 1fr; padding: 16px 28px; border-top: 1px solid #e8eaed; align-items: center; }
        .t-canal { font-size: 15px; font-weight: 500; color: #202124; }
        .t-listify { font-size: 15px; font-weight: 600; color: #1a73e8; }
        .t-manual { font-size: 15px; color: #9aa0a6; text-decoration: line-through; }
        .pricing-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .plan { background: #fff; border: 1px solid #e8eaed; border-radius: 24px; padding: 32px; display: flex; flex-direction: column; }
        .plan.featured { border: 2px solid #1a73e8; position: relative; }
        .plan-badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: #1a73e8; color: #fff; font-size: 11px; font-weight: 500; padding: 5px 16px; border-radius: 12px; white-space: nowrap; }
        .plan-name { font-size: 11px; font-weight: 600; color: #5f6368; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
        .plan-price { font-size: 40px; font-weight: 700; color: #202124; line-height: 1; }
        .plan-period { font-size: 14px; color: #5f6368; margin-top: 4px; margin-bottom: 24px; }
        .plan-features { list-style: none; flex: 1; display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; }
        .plan-features li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #202124; }
        .plan-features li::before { content: '✓'; color: #1a73e8; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
        .btn-plan { width: 100%; padding: 12px; border-radius: 24px; font-size: 14px; font-weight: 500; cursor: pointer; border: 1.5px solid #1a73e8; color: #1a73e8; background: transparent; transition: background .15s; }
        .btn-plan:hover { background: #f0f4ff; }
        .btn-plan.featured-btn { background: #1a73e8; color: #fff; }
        .btn-plan.featured-btn:hover { background: #1557b0; }
        .faq-list { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
        .faq-item { border: 1px solid #e8eaed; border-radius: 14px; overflow: hidden; }
        .faq-q { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; text-align: left; font-size: 15px; font-weight: 500; color: #202124; background: transparent; border: none; cursor: pointer; }
        .faq-q:hover { background: #f8f9fa; }
        .faq-icon { font-size: 22px; color: #5f6368; line-height: 1; flex-shrink: 0; }
        .faq-a { padding: 14px 22px 18px; font-size: 14px; color: #5f6368; line-height: 1.65; border-top: 1px solid #e8eaed; }
        .cta-section { background: #1a73e8; padding: 80px 40px; text-align: center; }
        .cta-section h2 { font-size: 40px; font-weight: 700; color: #fff; max-width: 540px; margin: 0 auto 32px; line-height: 1.2; }
        .cta-note { font-size: 13px; color: rgba(255,255,255,.7); margin-top: 16px; }
        .btn-white { background: #fff; color: #1a73e8; padding: 15px 36px; border-radius: 28px; font-size: 15px; font-weight: 600; text-decoration: none; display: inline-block; }
        .btn-white:hover { background: #e8f0fe; }
        .footer { background: #202124; padding: 48px 40px; }
        .footer-inner { max-width: 960px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
        .footer-logo { font-size: 17px; font-weight: 700; color: #fff; }
        .footer-tagline { font-size: 12px; color: #9aa0a6; margin-top: 4px; }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 13px; color: #9aa0a6; text-decoration: none; }
        .footer-links a:hover { color: #fff; }
        .footer-copy { font-size: 12px; color: #9aa0a6; }
        @media (max-width: 768px) {
          .hero h1 { font-size: 34px; }
          .hero-btns { flex-direction: column; align-items: center; }
          .grid3 { grid-template-columns: 1fr; }
          .grid6 { grid-template-columns: 1fr 1fr; }
          .pricing-grid { grid-template-columns: 1fr; }
          .nav-links { display: none; }
          .footer-inner { flex-direction: column; text-align: center; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <Link href="/" className="nav-logo"><Logo /> <span>by Anthropic Claude</span></Link>
        <ul className="nav-links">
          <li><a href="#funcionalidades">Funcionalidades</a></li>
          <li><a href="#precos">Preços</a></li>
          <li><Link href="/login">Entrar</Link></li>
        </ul>
        <Link href="/cadastro" className="nav-cta">Começar agora</Link>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">Powered by Claude AI — Anthropic</div>
        <h1>Cadastre produtos em marketplaces em <em>minutos</em>, não em horas</h1>
        <p>Você informa o produto, as fotos e o custo. A Guiamos gera título SEO, descrição, preço calculado e arquivo pronto para upload — automaticamente.</p>
        <div className="hero-btns">
          <Link href="/cadastro" className="btn-primary">Começar agora</Link>
          <a href="#como-funciona" className="btn-outline">Ver como funciona</a>
        </div>
      </section>

      {/* CANAIS */}
      <div className="channels">
        <div className="channels-label">Gera arquivos prontos para:</div>
        <div className="channels-list">
          <span>Mercado Livre</span><span>Shopee</span><span>Amazon</span><span>Magazine Luiza</span><span>TikTok Shop</span><span>Bling</span>
        </div>
      </div>

      {/* COMO FUNCIONA */}
      <section className="section section-white" id="como-funciona">
        <div className="container">
          <div className="section-title">Como funciona</div>
          <div className="section-sub">Três passos. Produto publicado.</div>
          <div className="grid3">
            <div className="card"><div className="card-num">01</div><div className="card-title">Você só informa o básico</div><div className="card-desc">Nome do produto, fotos, custo e regime tributário. Em menos de 2 minutos. Sem planilha, sem manual, sem dor de cabeça.</div></div>
            <div className="card"><div className="card-num">02</div><div className="card-title">A IA pesquisa, calcula e escreve tudo</div><div className="card-desc">Título SEO otimizado, descrição persuasiva, preço calculado com margem garantida, dimensões, NCM e EAN — gerados automaticamente seguindo as boas práticas de cada plataforma. Zero erro humano.</div></div>
            <div className="card"><div className="card-num">03</div><div className="card-title">Anúncios de alta qualidade, prontos para publicar</div><div className="card-desc">Cada anúncio segue exatamente os requisitos do canal: formato correto, campos completos, sem rejeição. Do zero ao anúncio publicado em minutos — com qualidade de quem faz isso há anos.</div></div>
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="section section-gray" id="funcionalidades">
        <div className="container">
          <div className="section-title">Por que a Listify</div>
          <div className="section-sub" style={{marginBottom: '32px'}}></div>
          <div className="grid6">
            <div className="card-sm"><div className="card-title">5 inputs. A IA infere o resto</div><div className="card-desc">Dimensões, NCM, EAN, categoria e descrições gerados automaticamente.</div></div>
            <div className="card-sm"><div className="card-title">Todos os canais principais</div><div className="card-desc">ML, Shopee, Amazon, Magalu, TikTok Shop e Bling em um catálogo.</div></div>
            <div className="card-sm"><div className="card-title">Templates internos</div><div className="card-desc">Você nunca baixa template. Recebe só o arquivo preenchido e pronto.</div></div>
            <div className="card-sm"><div className="card-title">Banco de erros embutido</div><div className="card-desc">16+ erros documentados com diagnóstico e autocorreção automática.</div></div>
            <div className="card-sm"><div className="card-title">Preços calculados por canal</div><div className="card-desc">Fórmula por canal e regime tributário. Margem sempre positiva.</div></div>
            <div className="card-sm"><div className="card-title">SEO automatizado</div><div className="card-desc">Título otimizado por canal com palavra-chave no início.</div></div>
          </div>
        </div>
      </section>

      {/* TEMPO */}
      <section className="section section-white">
        <div className="container">
          <div className="section-title">Quanto tempo você economiza</div>
          <div className="section-sub">Horas de trabalho manual reduzidas a minutos com IA</div>
          <div className="table-wrap">
            <div className="table-head"><span>Canal</span><span>Com Listify</span><span>Manual</span></div>
            <div className="table-row"><span className="t-canal">Shopee</span><span className="t-listify">~7 min</span><span className="t-manual">~8 horas</span></div>
            <div className="table-row"><span className="t-canal">Mercado Livre</span><span className="t-listify">~7 min</span><span className="t-manual">~10 horas</span></div>
            <div className="table-row"><span className="t-canal">TikTok Shop</span><span className="t-listify">~6 min</span><span className="t-manual">~6 horas</span></div>
            <div className="table-row"><span className="t-canal">Bling</span><span className="t-listify">~7 min</span><span className="t-manual">~8 horas</span></div>
          </div>
          <p style={{fontSize: '12px', color: '#9aa0a6', textAlign: 'center', marginTop: '16px'}}>
            * Tempos podem variar de acordo com a quantidade de produtos. Exemplo baseado em 100 produtos.
          </p>
        </div>
      </section>

      {/* PREÇOS */}
      <section className="section section-gray" id="precos">
        <div className="container">
          <div className="section-title">Planos simples, sem surpresa</div>
          <div className="section-sub" style={{marginBottom: '48px'}}></div>
          <div className="pricing-grid">
            <div className="plan">
              <div className="plan-name">Free</div>
              <div className="plan-price">R$0</div>
              <div className="plan-period">para sempre</div>
              <ul className="plan-features">
                <li>5 produtos/mês</li>
                <li>2 canais (Shopee e ML)</li>
                <li>1 catálogo salvo</li>
              </ul>
              <Link href="/cadastro"><button className="btn-plan">Criar conta grátis</button></Link>
            </div>
            <div className="plan">
              <div className="plan-name">Starter</div>
              <div className="plan-price">R$29</div>
              <div className="plan-period">/mês</div>
              <ul className="plan-features">
                <li>100 produtos/mês</li>
                <li>2 canais simultâneos</li>
                <li>5 catálogos salvos</li>
                <li>HelpChat com IA</li>
                <li>Correção automática de erros</li>
              </ul>
              <Link href="/cadastro"><button className="btn-plan">Começar agora</button></Link>
            </div>
            <div className="plan featured">
              <div className="plan-badge">Mais popular</div>
              <div className="plan-name">Profissional</div>
              <div className="plan-price">R$59</div>
              <div className="plan-period">/mês</div>
              <ul className="plan-features">
                <li>500 produtos/mês</li>
                <li>4 canais simultâneos</li>
                <li>30 catálogos salvos</li>
                <li>HelpChat com IA</li>
                <li>Correção automática de erros</li>
              </ul>
              <Link href="/cadastro"><button className="btn-plan featured-btn">Começar agora</button></Link>
            </div>
            <div className="plan">
              <div className="plan-name">Agência</div>
              <div className="plan-price">R$127</div>
              <div className="plan-period">/mês</div>
              <ul className="plan-features">
                <li>Produtos ilimitados</li>
                <li>6 canais simultâneos</li>
                <li>Catálogos ilimitados</li>
                <li>3 usuários</li>
                <li>HelpChat com IA</li>
                <li>Tudo do Profissional</li>
              </ul>
              <button className="btn-plan">Falar com a equipe</button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section section-white">
        <div className="container">
          <div className="section-title">Perguntas frequentes</div>
          <div className="section-sub" style={{marginBottom: '40px'}}></div>
          <div className="faq-list">
            {faqs.map((f, i) => (
              <div key={i} className="faq-item">
                <button className="faq-q" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                  <span>{f.q}</span>
                  <span className="faq-icon">{faqOpen === i ? '−' : '+'}</span>
                </button>
                {faqOpen === i && <div className="faq-a">{f.r}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Comece agora. Seu primeiro catálogo em menos de 10 minutos.</h2>
        <Link href="/cadastro" className="btn-white">Criar conta grátis</Link>
        <div className="cta-note">Sem cartão de crédito. Cancele quando quiser.</div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="footer-logo"><Logo size="md" /></div>
            <div className="footer-tagline">Plataforma de cadastro automatizado para marketplaces</div>
          </div>
          <div className="footer-links">
            <a href="#">Termos de Uso</a>
            <a href="#">Privacidade</a>
            <a href="#">Suporte</a>
          </div>
          <div className="footer-copy">© 2026 Guiamos. Powered by Claude AI — Anthropic</div>
        </div>
      </footer>
    </>
  )
}
