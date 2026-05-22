import styles from './page.module.css'

export default function Home() {
  const features = [
    {
      icon: "⚡",
      title: "5 inputs. A IA infere o resto.",
      desc: "Nome do produto, fotos, estoque, custo e regime tributário. Dimensões, NCM, EAN, categoria e descrições são gerados automaticamente.",
    },
    {
      icon: "🎯",
      title: "SEO otimizado por canal",
      desc: "Título com palavra-chave no início para ML, Shopee, Amazon e Magalu. Cada canal tem sua estrutura ideal aplicada automaticamente.",
    },
    {
      icon: "📊",
      title: "Preço calculado com precisão",
      desc: "Comissões, impostos (MEI ou Simples Nacional) e custo operacional de cada canal. Nunca mais venda no prejuízo sem perceber.",
    },
    {
      icon: "🔄",
      title: "Ciclo de correção automático",
      desc: "Upload com erro? Envie o arquivo de resultado para a Listify. A IA diagnostica, corrige e gera nova versão — sem você precisar entender o erro.",
    },
    {
      icon: "📦",
      title: "Templates internos versionados",
      desc: "Não precisa baixar template de nenhum canal. A Listify mantém os formatos atualizados de ML, Shopee, Amazon, Magalu e TikTok Shop.",
    },
    {
      icon: "🚀",
      title: "Canais independentes",
      desc: "Escolha apenas onde quer vender. Não é obrigatório configurar um canal antes do outro. Seu catálogo é salvo e reaproveitado.",
    },
  ];

  const steps = [
    {
      n: "01",
      title: "Informe seus produtos",
      desc: "Nome, fotos no Google Drive (com nomenclatura SKU_01.jpg), quantidade em estoque, custo unitário e regime tributário.",
    },
    {
      n: "02",
      title: "Escolha o canal",
      desc: "Mercado Livre, Shopee, Amazon, Magalu, TikTok Shop ou Bling. Cada um é um módulo independente — você escolhe só onde quer vender.",
    },
    {
      n: "03",
      title: "A IA gera tudo",
      desc: "Título SEO, descrição técnica, preço calculado, dimensões inferidas, NCM, GTIN e planilha no formato exato do canal.",
    },
    {
      n: "04",
      title: "Baixe e faça upload",
      desc: "Receba o arquivo pronto com guia de upload passo a passo. Se houver erros, envie o resultado e a Listify corrige automaticamente.",
    },
  ];

  const channels = [
    "Mercado Livre", "Shopee", "Amazon", "Magazine Luiza", "TikTok Shop", "Bling"
  ];

  const stats = [
    { value: "5", label: "inputs necessários", sub: "a IA infere o resto" },
    { value: "4h", label: "de trabalho manual", sub: "reduzidas a minutos" },
    { value: "16+", label: "erros documentados", sub: "com correção automática" },
    { value: "6", label: "canais suportados", sub: "e crescendo" },
  ];

  return (
    <main style={{ background: 'var(--navy)', minHeight: '100vh' }}>

      {/* NAV */}
      <nav className={styles.landingNav}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'var(--blue)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
            <span className={styles.fontDisplay} style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)' }}>Listify</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="#funciona" className={styles.btnSecondary} style={{ padding: '10px 20px', fontSize: 14 }}>Como funciona</a>
            <a href="#planos" className={styles.btnPrimary} style={{ padding: '10px 20px', fontSize: 14 }}>Começar grátis</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.gridBg} style={{ paddingTop: 160, paddingBottom: 120, position: 'relative', overflow: 'hidden' }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '10%', left: '15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} className={styles.animatePulseGlow} />
        <div style={{ position: 'absolute', top: '30%', right: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} className={styles.animatePulseGlow} />

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative' }}>
          <div className={styles.animateFadeUp} style={{ marginBottom: 24 }}>
            <span className={styles.badge}>
              <span>✦</span> Powered by Claude AI — Anthropic
            </span>
          </div>

          <h1 className={`${styles.fontDisplay} ${styles.animateFadeUpDelay1}`} style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 24 }}>
            Cadastre produtos em{' '}
            <span style={{ color: 'var(--blue-glow)' }} className={styles.glowText}>marketplaces</span>
            <br />em minutos, não em horas.
          </h1>

          <p className={styles.animateFadeUpDelay2} style={{ fontSize: 18, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 580, margin: '0 auto 40px', fontWeight: 300 }}>
            Informe o produto, as fotos, o estoque e o custo. A Listify gera título otimizado, descrição técnica, preço calculado e planilha pronta para upload — em qualquer marketplace.
          </p>

          <div className={styles.animateFadeUpDelay3} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#planos" className={styles.btnPrimary}>
              Começar agora <span>→</span>
            </a>
            <a href="#funciona" className={styles.btnSecondary}>
              Ver como funciona
            </a>
          </div>

          {/* Channels */}
          <div className={styles.animateFadeUpDelay4} style={{ marginTop: 56, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)', marginRight: 8, lineHeight: '32px' }}>Compatível com</span>
            {channels.map(c => (
              <span key={c} className={styles.channelBadge}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(148,163,184,0.1)', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {stats.map(s => (
            <div key={s.value} className={styles.statCard}>
              <div className={styles.fontDisplay} style={{ fontSize: 48, fontWeight: 800, color: 'var(--blue-glow)', lineHeight: 1, marginBottom: 8 }}>{s.value}</div>
              <div style={{ fontSize: 15, color: 'var(--white)', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className={styles.badge} style={{ marginBottom: 16 }}>Funcionalidades</span>
            <h2 className={styles.fontDisplay} style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Tudo que você precisa,<br />nada que você não precisa.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {features.map(f => (
              <div key={f.title} className={styles.featureCard}>
                <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
                <h3 className={styles.fontDisplay} style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: 'var(--white)' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="funciona" style={{ padding: '100px 24px', background: 'var(--navy-2)', borderTop: '1px solid rgba(148,163,184,0.1)', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className={styles.badge} style={{ marginBottom: 16 }}>Como funciona</span>
            <h2 className={styles.fontDisplay} style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              4 passos.<br />Produto no ar.
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {steps.map((s) => (
              <div key={s.n} className={styles.stepCard}>
                <div className={styles.stepNumber}>{s.n}</div>
                <div>
                  <h3 className={styles.fontDisplay} style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--white)' }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="planos" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className={styles.badge} style={{ marginBottom: 16 }}>Planos</span>
            <h2 className={styles.fontDisplay} style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Simples e transparente.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, maxWidth: 900, margin: '0 auto' }}>

            {/* Starter */}
            <div className={styles.featureCard} style={{ padding: 36 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Starter</div>
              <div className={styles.fontDisplay} style={{ fontSize: 44, fontWeight: 800, marginBottom: 4 }}>R$97<span style={{ fontSize: 18, fontWeight: 400, color: 'var(--muted)' }}>/mês</span></div>
              <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.6 }}>Para quem está começando em 1 marketplace.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                {['50 produtos/mês', '1 canal à escolha', 'Guia de upload incluído', 'Correção automática de erros'].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--muted)' }}>
                    <span style={{ color: 'var(--blue-glow)' }}>✓</span> {item}
                  </div>
                ))}
              </div>
              <a href="#" className={`${styles.btnSecondary} w-full justify-center`} style={{ width: '100%', justifyContent: 'center' }}>Começar</a>
            </div>

            {/* Pro */}
            <div className={styles.gradientBorder} style={{ padding: 36, borderRadius: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}>
                <span className={styles.badge}>Mais popular</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--blue-glow)', fontWeight: 500, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Profissional</div>
              <div className={styles.fontDisplay} style={{ fontSize: 44, fontWeight: 800, marginBottom: 4 }}>R$197<span style={{ fontSize: 18, fontWeight: 400, color: 'var(--muted)' }}>/mês</span></div>
              <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.6 }}>Para lojas expandindo para múltiplos canais.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                {['250 produtos/mês', '3 canais', 'Todos os recursos do Starter', 'Catálogo salvo entre sessões', 'Calculadora de margem por canal'].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--muted)' }}>
                    <span style={{ color: 'var(--blue-glow)' }}>✓</span> {item}
                  </div>
                ))}
              </div>
              <a href="#" className={styles.btnPrimary} style={{ width: '100%', justifyContent: 'center' }}>Começar</a>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 24px', background: 'var(--navy-2)', borderTop: '1px solid rgba(148,163,184,0.1)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ width: 64, height: 64, background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 24px' }}>⚡</div>
          <h2 className={styles.fontDisplay} style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>
            Pronto para publicar<br />seus primeiros produtos?
          </h2>
          <p style={{ fontSize: 17, color: 'var(--muted)', marginBottom: 36, lineHeight: 1.7 }}>
            O que levaria horas de trabalho manual, a Listify resolve em minutos. Comece agora.
          </p>
          <a href="#planos" className={styles.btnPrimary} style={{ fontSize: 16, padding: '16px 36px' }}>
            Começar gratuitamente →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid rgba(148,163,184,0.1)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: 'var(--blue)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
            <span className={styles.fontDisplay} style={{ fontSize: 16, fontWeight: 700 }}>Listify</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>© 2026 Listify. Todos os direitos reservados.</p>
        </div>
      </footer>

    </main>
  );
}
