const MAPA_CANAL: Record<string, string> = {
  mercado_livre: 'ml',
}

export function normalizarCanalParaEngine(canalChat: string): string {
  return MAPA_CANAL[canalChat] ?? canalChat
}

export function normalizarCanaisChatParaEngine(canaisChat: string[]): string[] {
  return canaisChat.map(normalizarCanalParaEngine)
}
