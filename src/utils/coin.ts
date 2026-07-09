const BASE = 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color'
const GENERIC = `${BASE}/generic.svg`

export function coinIconUrl(ticker: string): string {
  const symbol = ticker.replace('KRW-', '').toLowerCase()
  return `${BASE}/${symbol}.svg`
}

export function coinIconFallback(e: Event): void {
  const img = e.target as HTMLImageElement
  if (img.src !== GENERIC) img.src = GENERIC
}
