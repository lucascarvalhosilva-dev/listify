'use client'

import { useState } from 'react'
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
  { canal: 'Shopee',        listify: '~60 min', manual: '~5 horas' },
  { canal: 'Mercado Livre', listify: '~90 min', manual: '~6 horas' },
  { canal: 'TikTok Shop',   listify: '~30 min', manual: '~3 horas' },
  { canal: 'Bling',         listify: '~40 min', manual: '~4 horas' },
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

const FAQ_ITEMS = [
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
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#202124] font-sans">

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e8eaed]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl font-bold text-[#1a73e8]">Listify</span>
            <span className="text-xs text-[#5f6368] ml-2 hidden sm:inline">by Anthropic Claude</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-[#5f6368]">
            <a href="#como-funciona" className="hover:text-[#202124] transition-colors">Funcionalidades</a>
            <a href="#precos" className="hover:text-[#202124] transition-colors">Preços</a>
            <Link href="/login" className="hover:text-[#202124] transition-colors">Entrar</Link>
          </nav>
          <Link
            href="/cadastro"
            className="bg-[#1a73e8] text-white text-sm px-5 py-2 rounded-full hover:bg-blue-700 transition-colors font-medium"
          >
            Começar grátis
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="min-h-[85vh] flex flex-col items-center justify-center text-center bg-white px-6 pt-24 pb-20">
        <div className="inline-flex border border-[#e8eaed] text-xs text-[#5f6368] px-4 py-1.5 rounded-full mb-8">
          Powered by Claude AI — Anthropic
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-[#202124] leading-tight max-w-3xl mx-auto mb-6 tracking-tight">
          Cadastre produtos em marketplaces em minutos, não em horas
        </h1>
        <p className="text-lg text-[#5f6368] max-w-2xl mx-auto mb-10 leading-relaxed">
          Você informa o produto, as fotos e o custo. A Listify gera título SEO, descrição, preço calculado e arquivo pronto para upload — automaticamente.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/cadastro"
            className="bg-[#1a73e8] text-white px-8 py-3.5 rounded-full text-base font-medium hover:bg-blue-700 transition-colors"
          >
            Começar grátis
          </Link>
          <a
            href="#como-funciona"
            className="border border-[#1a73e8] text-[#1a73e8] px-8 py-3.5 rounded-full text-base font-medium hover:bg-blue-50 transition-colors"
          >
            Ver como funciona
          </a>
        </div>
      </section>

      {/* ── Canais ──────────────────────────────────────────────── */}
      <section className="bg-[#f8f9fa] py-10 border-y border-[#e8eaed]">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-[#5f6368] mb-4 uppercase tracking-wide">Gera arquivos prontos para:</p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
            {['Mercado Livre', 'Shopee', 'Amazon', 'Magazine Luiza', 'TikTok Shop', 'Bling'].map(c => (
              <span key={c} className="text-base font-medium text-[#202124]">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ───────────────────────────────────────── */}
      <section id="como-funciona" className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[#202124] mb-4 tracking-tight">Como funciona</h2>
          <p className="text-base text-[#5f6368] text-center mb-16">Três passos. Produto publicado.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(step => (
              <div key={step.n} className="bg-[#f8f9fa] rounded-2xl p-8 border border-[#e8eaed]">
                <div className="text-5xl font-bold text-[#1a73e8] mb-4">{step.n}</div>
                <h3 className="text-lg font-semibold text-[#202124] mb-3">{step.title}</h3>
                <p className="text-sm text-[#5f6368] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Por que a Listify ────────────────────────────────────── */}
      <section className="bg-[#f8f9fa] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16 tracking-tight">Por que a Listify</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-7 border border-[#e8eaed]">
                <h3 className="text-base font-semibold text-[#202124] mb-2">{f.title}</h3>
                <p className="text-sm text-[#5f6368] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparativo de tempo ─────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4 tracking-tight">Quanto tempo você economiza</h2>
          <p className="text-sm text-[#5f6368] text-center mb-12">
            Baseado em sessões reais com catálogos de 10–15 produtos
          </p>
          <div className="max-w-2xl mx-auto rounded-2xl overflow-hidden border border-[#e8eaed]">
            <div className="bg-[#f8f9fa] grid grid-cols-3 px-8 py-4">
              <span className="text-sm font-semibold text-[#5f6368] uppercase tracking-wide">Canal</span>
              <span className="text-sm font-semibold text-[#5f6368] uppercase tracking-wide text-center">Com Listify</span>
              <span className="text-sm font-semibold text-[#5f6368] uppercase tracking-wide text-right">Manual</span>
            </div>
            {TIME_ROWS.map(row => (
              <div key={row.canal} className="grid grid-cols-3 px-8 py-5 border-t border-[#e8eaed] items-center">
                <span className="text-base font-medium text-[#202124]">{row.canal}</span>
                <span className="text-base font-semibold text-[#1a73e8] text-center">{row.listify}</span>
                <span className="text-base text-[#5f6368] text-right line-through">{row.manual}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Preços ──────────────────────────────────────────────── */}
      <section id="precos" className="bg-[#f8f9fa] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4 tracking-tight">Planos simples, sem surpresa</h2>
          <p className="text-sm text-[#5f6368] text-center mb-16">Cancele quando quiser. Sem taxa de setup.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl p-8 flex flex-col relative ${
                  plan.popular
                    ? 'border-2 border-[#1a73e8]'
                    : 'border border-[#e8eaed]'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1a73e8] text-white text-xs px-4 py-1 rounded-full whitespace-nowrap font-medium">
                    Mais popular
                  </span>
                )}
                <p className="text-sm font-medium text-[#5f6368] uppercase tracking-wide mb-2">{plan.name}</p>
                <p className="text-4xl font-bold text-[#202124] mb-1">{plan.price}</p>
                <p className="text-sm text-[#5f6368] mb-8">/mês</p>
                <ul className="space-y-3 mb-10 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-[#202124]">
                      <span className="text-[#1a73e8] font-bold shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`w-full py-3 rounded-full text-sm font-medium text-center transition-colors mt-auto ${
                    plan.popular
                      ? 'bg-[#1a73e8] text-white border border-[#1a73e8] hover:bg-blue-700'
                      : 'border border-[#1a73e8] text-[#1a73e8] hover:bg-blue-50'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16 tracking-tight">Perguntas frequentes</h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="border border-[#e8eaed] rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex justify-between items-center px-6 py-5 text-left text-base font-medium text-[#202124] hover:bg-[#f8f9fa] transition-colors cursor-pointer"
                >
                  <span>{item.q}</span>
                  <span className={`text-[#5f6368] text-xl ml-4 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-45' : ''}`}>
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-[#5f6368] leading-relaxed border-t border-[#e8eaed] pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────────── */}
      <section className="bg-[#1a73e8] py-24 text-center">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-white mb-4 max-w-2xl mx-auto leading-tight tracking-tight">
            Comece agora. Seu primeiro catálogo em menos de 10 minutos.
          </h2>
          <p className="text-blue-100 mb-10 text-base">Sem cartão de crédito. Cancele quando quiser.</p>
          <Link
            href="/cadastro"
            className="inline-block bg-white text-[#1a73e8] px-10 py-4 rounded-full text-base font-semibold hover:bg-blue-50 transition-colors"
          >
            Criar conta grátis
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-[#202124] py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-between items-center gap-6">
          <div>
            <p className="text-white font-bold mb-1">Listify</p>
            <p className="text-sm text-[#9aa0a6]">Plataforma de cadastro automatizado para marketplaces</p>
          </div>
          <div className="flex gap-6 text-sm text-[#9aa0a6]">
            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Suporte</a>
          </div>
          <p className="text-sm text-[#9aa0a6] w-full sm:w-auto">
            © 2026 Listify. Powered by Claude AI — Anthropic
          </p>
        </div>
      </footer>

    </div>
  )
}
