const BASE = 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color'
const GENERIC = '/coins/generic.svg'

// 자주 보유되는 상위 코인만 번들에 내장해 첫 로드 시 네트워크 지연(팝콘 효과) 없이
// 즉시 표시한다. 나머지 코인은 기존처럼 CDN에서 불러온다 — 전체 코인을 번들링하면
// 앱 용량이 불필요하게 커지므로, 자주 보이는 코인만 골라 절충했다.
const LOCAL_ICONS = new Set([
  'btc', 'eth', 'xrp', 'sol', 'ada', 'doge', 'avax', 'dot', 'link', 'atom',
])

export function coinIconUrl(ticker: string): string {
  const symbol = ticker.replace('KRW-', '').toLowerCase()
  if (LOCAL_ICONS.has(symbol)) return `/coins/${symbol}.svg`
  return `${BASE}/${symbol}.svg`
}

export function coinIconFallback(e: Event): void {
  const img = e.target as HTMLImageElement
  // img.src는 항상 절대경로로 읽히므로 상대경로 GENERIC과는 endsWith로 비교한다.
  if (!img.src.endsWith(GENERIC)) img.src = GENERIC
}
