'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ExternalLink, FolderOpen, Image, Info, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '../components/Navbar'

const ARQUIVOS_EXEMPLO = ['80171_01.jpg', '80171_02.jpg', '80171_03.jpg']

const REQUISITOS = [
  { canal: 'Shopee', minimo: '500x500px', observacao: 'quadrada, fundo limpo' },
  { canal: 'Mercado Livre', minimo: '500x500px', observacao: 'sem textos na imagem' },
  { canal: 'Amazon', minimo: '1000x1000px', observacao: 'ideal para zoom' },
  { canal: 'TikTok Shop', minimo: '300x300px', observacao: 'imagem clara do produto' },
]

export default function GuiaFotosPage() {
  const router = useRouter()
  const [loggedIn, setLoggedIn] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user)
      setChecked(true)
    })
  }, [])

  return (
    <>
      {loggedIn && <Navbar />}
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f5f8fc; color: #182233; }
        .photos-page {
          min-height: ${loggedIn ? 'calc(100vh - 64px)' : '100vh'};
          background:
            radial-gradient(circle at 15% -10%, rgba(26,115,232,0.12), transparent 28%),
            radial-gradient(circle at 88% 0%, rgba(15,159,117,0.10), transparent 25%),
            linear-gradient(180deg, #f8fbff 0%, #f3f7fc 100%);
          padding: 34px 24px 64px;
        }
        .photos-wrap { max-width: 980px; margin: 0 auto; }
        .photos-back { display: inline-flex; align-items: center; gap: 7px; color: #5f6f85; text-decoration: none; font-size: 13px; font-weight: 700; margin-bottom: 22px; }
        .photos-back:hover { color: #155bd5; }
        .photos-hero { display: grid; grid-template-columns: minmax(0, 1.05fr) 360px; gap: 24px; align-items: stretch; margin-bottom: 24px; }
        .photos-intro, .photos-preview, .photos-card {
          background: rgba(255,255,255,0.94);
          border: 1px solid #dfe7f1;
          border-radius: 20px;
          box-shadow: 0 16px 44px rgba(15,23,42,0.07);
        }
        .photos-intro { padding: 30px; }
        .photos-eyebrow { display: inline-flex; align-items: center; gap: 7px; color: #155bd5; background: #eaf2ff; border: 1px solid rgba(26,115,232,0.18); border-radius: 999px; padding: 7px 11px; font-size: 12px; font-weight: 800; margin-bottom: 18px; }
        .photos-title { font-size: 34px; line-height: 1.12; margin: 0 0 12px; color: #182233; letter-spacing: 0; }
        .photos-subtitle { font-size: 15px; line-height: 1.65; color: #586174; margin: 0; max-width: 600px; }
        .photos-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 24px; }
        .photos-metric { border: 1px solid #e6edf6; border-radius: 14px; padding: 12px; background: #fbfdff; }
        .photos-metric strong { display: block; font-size: 17px; color: #182233; margin-bottom: 3px; }
        .photos-metric span { color: #697386; font-size: 12px; line-height: 1.35; }
        .photos-preview { padding: 22px; display: flex; flex-direction: column; justify-content: space-between; }
        .preview-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; margin-bottom: 14px; }
        .preview-folder { border: 1px solid #e6edf6; background: #fbfdff; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 9px; }
        .preview-file { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: #263241; font-size: 13px; }
        .preview-file code { font-family: ui-monospace, SFMono-Regular, monospace; background: #f1f4f8; border-radius: 8px; padding: 4px 7px; color: #182233; }
        .preview-badge { color: #0f7b58; background: #e6f4ea; border-radius: 999px; font-size: 11px; font-weight: 800; padding: 4px 7px; }
        .preview-note { display: flex; gap: 9px; color: #5f6f85; font-size: 12px; line-height: 1.45; margin-top: 14px; }
        .photos-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
        .photos-card { padding: 22px; }
        .card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
        .card-icon { width: 34px; height: 34px; border-radius: 11px; background: #eaf2ff; color: #155bd5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .card-title { font-size: 16px; font-weight: 800; color: #182233; margin: 0; }
        .card-copy { font-size: 14px; color: #586174; line-height: 1.62; margin: 0 0 14px; }
        .code-chip { font-family: ui-monospace, SFMono-Regular, monospace; background: #f1f4f8; border: 1px solid #e6edf6; border-radius: 8px; padding: 2px 6px; color: #182233; font-size: 13px; white-space: nowrap; }
        .steps { display: flex; flex-direction: column; gap: 11px; }
        .step { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 10px; align-items: start; color: #586174; font-size: 14px; line-height: 1.5; }
        .step-num { width: 26px; height: 26px; border-radius: 50%; background: #eaf2ff; color: #155bd5; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; }
        .warning { border: 1px solid #f4d58d; background: #fff8e8; border-radius: 14px; padding: 13px 14px; display: flex; gap: 10px; color: #7a4d00; font-size: 14px; line-height: 1.55; }
        .req-table { border: 1px solid #e6edf6; border-radius: 14px; overflow: hidden; }
        .req-row { display: grid; grid-template-columns: 1fr 110px 1.2fr; gap: 12px; align-items: center; padding: 11px 13px; font-size: 13px; color: #586174; border-top: 1px solid #e6edf6; }
        .req-row:first-child { border-top: none; background: #f7fafc; color: #697386; font-size: 11px; font-weight: 900; text-transform: uppercase; }
        .req-row strong { color: #182233; }
        .photos-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 22px; }
        .btn-primary, .btn-secondary { min-height: 44px; border-radius: 999px; padding: 0 18px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; font-size: 14px; font-weight: 800; text-decoration: none; cursor: pointer; }
        .btn-primary { border: 1px solid #1a73e8; background: #1a73e8; color: #fff; box-shadow: 0 10px 24px rgba(26,115,232,0.20); }
        .btn-primary:hover { background: #155bd5; }
        .btn-secondary { border: 1px solid #c9d9f3; background: rgba(255,255,255,0.78); color: #155bd5; }
        .btn-secondary:hover { background: #fff; }
        @media (max-width: 860px) {
          .photos-hero { grid-template-columns: 1fr; }
          .photos-grid { grid-template-columns: 1fr; }
          .photos-metrics { grid-template-columns: 1fr; }
          .photos-title { font-size: 28px; }
          .photos-actions { flex-direction: column; }
          .btn-primary, .btn-secondary { width: 100%; }
        }
        @media (max-width: 520px) {
          .photos-page { padding: 24px 14px 42px; }
          .photos-intro, .photos-preview, .photos-card { border-radius: 16px; padding: 18px; }
          .req-row { grid-template-columns: 1fr; gap: 4px; }
        }
      `}</style>

      <main className="photos-page">
        <div className="photos-wrap">
          <Link href={loggedIn ? '/' : '/sobre'} className="photos-back">Voltar</Link>

          <section className="photos-hero">
            <div className="photos-intro">
              <div className="photos-eyebrow"><Image size={14} /> Guia rápido de fotos</div>
              <h1 className="photos-title">Prepare a pasta uma vez. O Guiamos usa as fotos no cadastro inteiro.</h1>
              <p className="photos-subtitle">
                As imagens precisam estar com nomes previsíveis e em uma pasta compartilhada do Google Drive.
                Seguindo estes passos, o chat reconhece o link e gera os arquivos sem pedir retrabalho.
              </p>
              <div className="photos-metrics">
                <div className="photos-metric"><strong>SKU_01</strong><span>foto principal de cada produto</span></div>
                <div className="photos-metric"><strong>Drive</strong><span>pasta pública como visualizador</span></div>
                <div className="photos-metric"><strong>500px+</strong><span>mínimo seguro para a maioria dos canais</span></div>
              </div>
            </div>

            <div className="photos-preview">
              <div>
                <div className="preview-title"><FolderOpen size={17} color="#155bd5" /> Pasta do Google Drive</div>
                <div className="preview-folder">
                  {ARQUIVOS_EXEMPLO.map((arquivo, index) => (
                    <div className="preview-file" key={arquivo}>
                      <code>{arquivo}</code>
                      {index === 0 && <span className="preview-badge">capa</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="preview-note">
                <Info size={16} />
                <span>Use o mesmo SKU da planilha. A numeração depois do underline define a ordem das fotos.</span>
              </div>
            </div>
          </section>

          <section className="photos-grid">
            <div className="photos-card">
              <div className="card-head">
                <div className="card-icon"><Image size={18} /></div>
                <h2 className="card-title">Nome dos arquivos</h2>
              </div>
              <p className="card-copy">
                Cada produto deve ter fotos nomeadas com o SKU, underline e número sequencial:
                {' '}<span className="code-chip">SKU_01.jpg</span>, <span className="code-chip">SKU_02.jpg</span>.
              </p>
              <div className="steps">
                <div className="step"><span className="step-num">1</span><span>A primeira foto sempre termina em <span className="code-chip">_01</span>.</span></div>
                <div className="step"><span className="step-num">2</span><span>Fotos extras seguem <span className="code-chip">_02</span>, <span className="code-chip">_03</span> e assim por diante.</span></div>
                <div className="step"><span className="step-num">3</span><span>Evite espaços, acentos e nomes diferentes do SKU da planilha.</span></div>
              </div>
            </div>

            <div className="photos-card">
              <div className="card-head">
                <div className="card-icon"><Share2 size={18} /></div>
                <h2 className="card-title">Compartilhamento do Drive</h2>
              </div>
              <div className="steps">
                <div className="step"><span className="step-num">1</span><span>Crie uma pasta para as fotos, sem subpastas.</span></div>
                <div className="step"><span className="step-num">2</span><span>Clique com botão direito e escolha Compartilhar.</span></div>
                <div className="step"><span className="step-num">3</span><span>Defina como Qualquer pessoa com o link e permissão Visualizador.</span></div>
              </div>
            </div>

            <div className="photos-card">
              <div className="card-head">
                <div className="card-icon"><ExternalLink size={18} /></div>
                <h2 className="card-title">Teste antes de enviar</h2>
              </div>
              <div className="warning">
                <Info size={18} />
                <span>Abra o link em uma aba anônima. Se o Google pedir login, o compartilhamento ainda não está público para leitura.</span>
              </div>
            </div>

            <div className="photos-card">
              <div className="card-head">
                <div className="card-icon"><CheckCircle2 size={18} /></div>
                <h2 className="card-title">Resolução mínima</h2>
              </div>
              <div className="req-table">
                <div className="req-row"><span>Canal</span><span>Mínimo</span><span>Observação</span></div>
                {REQUISITOS.map(row => (
                  <div className="req-row" key={row.canal}>
                    <strong>{row.canal}</strong>
                    <span>{row.minimo}</span>
                    <span>{row.observacao}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="photos-actions">
            <Link href={loggedIn ? '/' : '/cadastro'} className="btn-secondary">Voltar ao chat</Link>
            <button
              type="button"
              className="btn-primary"
              onClick={() => checked && router.push(loggedIn ? '/' : '/cadastro')}
              disabled={!checked}
            >
              Estou pronto
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
