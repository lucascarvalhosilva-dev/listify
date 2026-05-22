import Link from 'next/link'

const STEPS = [
  {
    n: '01',
    title: 'Informe o produto',
    desc: 'Nome, fotos, estoque, custo e regime tributário. Nada mais.',
  },
  {
    n: '02',
    title: 'A IA faz o resto',
    desc: 'Pesquisa specs, infere dimensões, calcula preços, cria títulos SEO e descrições para cada canal.',
  },
  {
    n: '03',
    title: 'Baixe e publique',
    desc: 'Arquivo pronto para upload. Guia passo a passo embutido. Correção automática de erros.',
  },
]

const FEATURES = [
  {
    title: '5 inputs. A IA infere o resto',
    desc: 'Dimensões, NCM, EAN, categoria e descrições gerados automaticamente a partir do nome do produto.',
  },
  {
    title: 'Todos os canais principais',
    desc: 'ML, Shopee, Amazon, Magalu, TikTok Shop e Bling. Um catálogo, seis formatos prontos.',
  },
  {
    title: 'Templates internos',
    desc: 'Você nunca baixa template de canal nenhum. Recebe só o arquivo preenchido e pronto para upload.',
  },
  {
    title: 'Banco de erros embutido',
    desc: '16+ erros documentados com diagnóstico e autocorreção automática.',
  },
  {
    title: 'Preços calculados por canal',
    desc: 'Fórmula específica por canal e regime tributário. Margem sempre positiva.',
  },
  {
    title: 'SEO automatizado',
    desc: 'Título otimizado por canal com palavra-chave no início. Estrutura certa para cada marketplace.',
  },
]

const TIME_ROWS = [
  { canal: 'Shopee',         listify: '~60 min',  manual: '~5 horas'  },
  { canal: 'Mercado Livre',  listify: '~90 min',  manual: '~6 horas'  },
  { canal: 'TikTok Shop',    listify: '~30 min',  manual: '~3 horas'  },
  { canal: 'Bling',          listify: '~40 min',  manual: '~4 horas'  },
]

const PLANS = [
  {
    name: 'Starter',
    price: 'R$29',
    popular: false,
    features: ['100 produtos/mês', '2 canais simultâneos', '5 catálogos salvos', 'Correção automática de erros'],
    cta: 'Começar agora',
    href: '/cadastro',
  },
  {
    name: 'Profissional',
    price: 'R$59',
    popular: true,
    features: ['500 produtos/mês', '4 canais simultâneos', '30 catálogos salvos', 'Tudo do Starter'],
    cta: 'Começar agora',
    href: '/cadastro',
  },
  {
    name: 'Agência',
    price: 'R$127',
    popular: false,
    features: ['Produtos ilimitados', '6 canais simultâneos', 'Catálogos ilimitados', '3 usuários', 'Tudo do Profissional'],
    cta: 'Falar com a equipe',
    href: '/cadastro',
  },
]

const FAQ = [
  {
    q: 'Preciso saber programar para usar?',
    a: 'Não. A Listify é uma plataforma web. Você usa pelo navegador, sem instalar nada.',
  },
  {
    q: 'Funciona para qualquer tipo de produto?',
    a: 'Sim. O sistema infere especificações a partir do nome do produto. Funciona para qualquer categoria.',
  },
  {
    q: 'O que acontece se o upload der erro?',
    a: 'Você envia o arquivo de resultado para a Listify e recebe uma versão corrigida automaticamente.',
  },
  {
    q: 'Preciso baixar algum template dos marketplaces?',
    a: 'Não. Os templates estão armazenados internamente e são mantidos atualizados. Você recebe só o arquivo preenchido.',
  },
  {
    q: 'Funciona para MEI e Simples Nacional?',
    a: 'Sim. O preço é calculado com a fórmula correta para cada regime tributário.',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#202124] font-sans">

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e8eaed] shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[#1a73e8] font-bold text-lg">Listify</span>
            <span className="text-[#9aa0a6] text-xs hidden sm:inline">by Anthropic Claude</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-[#5f6368]">
            <a href="#funcionalidades" className="hover:text-[#202124] transition-colors">Funcionalidades</a>
            <a href="#precos" className="hover:text-[#202124] transition-colors">Preços</a>
            <Link href="/login" className="hover:text-[#202124] transition-colors">Entrar</Link>
          </nav>
          <Link
            href="/cadastro"
            className="bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Começar grátis
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="bg-white py-24 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-[#e8eaed] rounded-full px-4 py-1.5 text-xs text-[#5f6368] mb-8">
            Powered by Claude AI — Anthropic
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#202124] leading-tight mb-6 tracking-tight">
            Cadastre produtos em marketplaces em minutos, não em horas
          </h1>
          <p className="text-lg text-[#5f6368] leading-relaxed mb-10 max-w-2xl mx-auto">
            Você informa o produto, as fotos e o custo. A Listify gera título SEO, descrição, preço calculado e arquivo pronto para upload — automaticamente.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/cadastro"
              className="bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm"
            >
              Começar grátis
            </Link>
            <a
              href="#como-funciona"
              className="border border-[#1a73e8] text-[#1a73e8] hover:bg-[#e8f0fe] font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm"
            >
              Ver como funciona
            </a>
          </div>
        </div>
      </section>

      {/* ── Canais ──────────────────────────────────────────────────── */}
      <section className="bg-[#f8f9fa] border-y border-[#e8eaed] py-10 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-[#9aa0a6] uppercase tracking-widest mb-3">Gera arquivos prontos para:</p>
          <p className="text-sm sm:text-base text-[#5f6368] font-medium">
            Mercado Livre · Shopee · Amazon · Magazine Luiza · TikTok Shop · Bling
          </p>
        </div>
      </section>

      {/* ── Como funciona ───────────────────────────────────────────── */}
      <section id="como-funciona" className="py-20 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#202124] text-center mb-12 tracking-tight">
            Como funciona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map(step => (
              <div key={step.n} className="border border-[#e8eaed] rounded-2xl p-7 bg-white">
                <div className="text-4xl font-bold text-[#1a73e8] mb-4 leading-none">{step.n}</div>
                <h3 className="text-base font-semibold text-[#202124] mb-2">{step.title}</h3>
                <p className="text-sm text-[#5f6368] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Diferenciais ────────────────────────────────────────────── */}
      <section id="funcionalidades" className="py-20 px-5 bg-[#f8f9fa]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#202124] text-center mb-12 tracking-tight">
            Por que a Listify
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white border border-[#e8eaed] rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-[#202124] mb-2">{f.title}</h3>
                <p className="text-sm text-[#5f6368] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparativo de tempo ────────────────────────────────────── */}
      <section className="py-20 px-5 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#202124] text-center mb-3 tracking-tight">
            Quanto tempo você economiza
          </h2>
          <p className="text-sm text-[#9aa0a6] text-center mb-10">
            Baseado em sessões reais com catálogos de 10–15 produtos
          </p>
          <div className="border border-[#e8eaed] rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 bg-[#f8f9fa] border-b border-[#e8eaed] px-6 py-3">
              <span className="text-xs font-semibold text-[#5f6368] uppercase tracking-wide">Canal</span>
              <span className="text-xs font-semibold text-[#1a73e8] uppercase tracking-wide text-center">Com Listify</span>
              <span className="text-xs font-semibold text-[#5f6368] uppercase tracking-wide text-right">Manual</span>
            </div>
            {TIME_ROWS.map((row, i) => (
              <div
                key={row.canal}
                className={`grid grid-cols-3 px-6 py-4 bg-white${i < TIME_ROWS.length - 1 ? ' border-b border-[#e8eaed]' : ''}`}
              >
                <span className="text-sm font-medium text-[#202124]">{row.canal}</span>
                <span className="text-sm font-semibold text-[#1a73e8] text-center">{row.listify}</span>
                <span className="text-sm text-[#9aa0a6] text-right line-through">{row.manual}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Preços ──────────────────────────────────────────────────── */}
      <section id="precos" className="py-20 px-5 bg-[#f8f9fa]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#202124] text-center mb-12 tracking-tight">
            Planos simples, sem surpresa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl p-7 flex flex-col ${
                  plan.popular
                    ? 'border-2 border-[#1a73e8]'
                    : 'border border-[#e8eaed]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base font-semibold text-[#202124]">{plan.name}</span>
                  {plan.popular && (
                    <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded-full">
                      Mais popular
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold text-[#202124] mb-1">
                  {plan.price}
                  <span className="text-sm font-normal text-[#9aa0a6]">/mês</span>
                </div>
                <div className="border-t border-[#e8eaed] my-5" />
                <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[#5f6368]">
                      <span className="text-[#1a73e8] mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white'
                      : 'border border-[#1a73e8] text-[#1a73e8] hover:bg-[#e8f0fe]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#202124] text-center mb-12 tracking-tight">
            Perguntas frequentes
          </h2>
          <div className="flex flex-col gap-2">
            {FAQ.map(item => (
              <details key={item.q} className="group border border-[#e8eaed] rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium text-[#202124] select-none hover:bg-[#f8f9fa] transition-colors [&::-webkit-details-marker]:hidden list-none">
                  {item.q}
                  <span className="text-[#9aa0a6] text-xl ml-4 shrink-0 leading-none group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-5 pb-4 pt-3 text-sm text-[#5f6368] leading-relaxed border-t border-[#e8eaed]">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────────────── */}
      <section className="bg-[#1a73e8] py-20 px-5 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 leading-snug">
            Comece agora. Seu primeiro catálogo em menos de 10 minutos.
          </h2>
          <Link
            href="/cadastro"
            className="inline-block bg-white text-[#1a73e8] font-semibold px-8 py-3.5 rounded-xl hover:bg-[#f1f3f4] transition-colors text-sm"
          >
            Criar conta grátis
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="bg-[#202124] text-white py-12 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="font-bold text-white mb-1">Listify</div>
            <div className="text-xs text-[#9aa0a6]">Plataforma de cadastro automatizado para marketplaces</div>
          </div>
          <div className="flex flex-wrap gap-5 text-xs text-[#9aa0a6]">
            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Suporte</a>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-white/10 text-xs text-[#9aa0a6]">
          © 2026 Listify. Powered by Claude AI — Anthropic
        </div>
      </footer>

    </div>
  )
}
