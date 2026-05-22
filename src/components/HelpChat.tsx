'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME: Message = {
  role: 'assistant',
  content: 'Olá! Sou o assistente da Listify. Pode me perguntar sobre erros de upload, como configurar cada canal, fórmulas de preço, requisitos de foto ou qualquer dúvida sobre a plataforma.',
}

export default function HelpChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen) textareaRef.current?.focus()
  }, [isOpen])

  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'
  }

  async function send() {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setIsLoading(true)

    try {
      const res = await fetch('/api/help-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json() as { reply?: string; error?: string }
      const reply = data.reply ?? 'Ocorreu um erro. Tente novamente.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Não foi possível conectar. Tente novamente.' }])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <style>{`
        @keyframes lf-dot { 0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
        .lf-dot { width: 7px; height: 7px; border-radius: 50%; background: #9AA0A6; display: inline-block; animation: lf-dot 1.2s infinite; }
        .lf-dot:nth-child(2) { animation-delay: 0.2s; }
        .lf-dot:nth-child(3) { animation-delay: 0.4s; }
        .lf-chat-panel { transition: transform 0.28s cubic-bezier(0.4,0,0.2,1); }
        @media (max-width: 480px) { .lf-chat-panel { width: 100vw !important; } }
      `}</style>

      {/* Floating button */}
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px',
          background: '#1a73e8',
          border: 'none',
          borderRadius: 999,
          color: '#fff',
          fontSize: 14, fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(26,115,232,0.35)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#1557b0')}
        onMouseLeave={e => (e.currentTarget.style.background = '#1a73e8')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Ajuda
      </button>

      {/* Sliding panel */}
      <div
        className="lf-chat-panel"
        style={{
          position: 'fixed', top: 56, right: 0, bottom: 0,
          width: 420,
          background: '#fff',
          borderLeft: '1px solid #E8EAED',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
          zIndex: 40,
          display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', borderBottom: '1px solid #E8EAED', flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#202124' }}>Assistente Listify</span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#5F6368', fontSize: 18, lineHeight: 1,
              padding: '4px 6px', borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: msg.role === 'user' ? '80%' : '85%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: msg.role === 'user' ? '#1a73e8' : '#F1F3F4',
                color: msg.role === 'user' ? '#fff' : '#202124',
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px 12px 12px 2px',
                background: '#F1F3F4',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span className="lf-dot" />
                <span className="lf-dot" />
                <span className="lf-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid #E8EAED', padding: '12px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua dúvida..."
              rows={1}
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid #E8EAED',
                borderRadius: 10,
                padding: '9px 12px',
                fontSize: 14,
                color: '#202124',
                background: '#fff',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                maxHeight: 96,
                overflowY: 'auto',
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || isLoading}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                border: 'none',
                background: '#1a73e8',
                color: '#fff',
                fontSize: 14, fontWeight: 500,
                cursor: !input.trim() || isLoading ? 'default' : 'pointer',
                opacity: !input.trim() || isLoading ? 0.5 : 1,
                flexShrink: 0,
                transition: 'opacity 0.15s',
              }}
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
