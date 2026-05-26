const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function pad2(valor: number) {
  return String(valor).padStart(2, '0')
}

function mesmoDia(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatarDataRelativa(date: string): string {
  const data = new Date(date)
  if (Number.isNaN(data.getTime())) return ''

  const agora = new Date()
  const diffMs = Math.max(0, agora.getTime() - data.getTime())
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin}min`

  const diffHoras = Math.floor(diffMin / 60)
  if (diffHoras < 24 && mesmoDia(data, agora)) return `há ${diffHoras}h`

  const ontem = new Date(agora)
  ontem.setDate(agora.getDate() - 1)
  if (mesmoDia(data, ontem)) return 'ontem'

  const diffDias = Math.floor(diffMs / 86400000)
  if (diffDias < 7) return DIAS_SEMANA[data.getDay()]

  const diaMes = `${pad2(data.getDate())}/${pad2(data.getMonth() + 1)}`
  if (data.getFullYear() === agora.getFullYear()) return diaMes

  return `${diaMes}/${String(data.getFullYear()).slice(-2)}`
}

export function formatarDataHoraCurta(date: string): string {
  const data = new Date(date)
  if (Number.isNaN(data.getTime())) return ''

  return `${pad2(data.getDate())}/${pad2(data.getMonth() + 1)} ${pad2(data.getHours())}:${pad2(data.getMinutes())}`
}
