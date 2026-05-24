type Props = {
  nome: string
  tamanho: number
  onRemover?: () => void
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function icone(nome: string): string {
  return nome.toLowerCase().endsWith('.csv') ? '📄' : '📊'
}

export default function ChatFileAttachment({ nome, tamanho, onRemover }: Props) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      background: '#f0f4ff',
      border: '1px solid #c5d8ff',
      borderRadius: 12,
      padding: '8px 14px 8px 12px',
      maxWidth: 300,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{icone(nome)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: '#202124',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {nome}
        </div>
        <div style={{ fontSize: 11, color: '#5f6368', marginTop: 2 }}>
          {formatarTamanho(tamanho)}
        </div>
      </div>
      {onRemover && (
        <button
          onClick={onRemover}
          aria-label="Remover arquivo"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9aa0a6', fontSize: 18, padding: '0 2px', lineHeight: 1, flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
