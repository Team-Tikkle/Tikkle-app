import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface MarketTicker {
  code:             string   // "KRW-BTC"
  currency:         string   // "BTC"
  name:             string
  tradePrice:       number   // 현재가
  signedChangeRate: number   // 전일 대비 등락률 (부호 포함)
  signedChangePrice: number  // 전일 대비 등락 금액 (부호 포함)
  accTradePrice24h: number   // 24시간 누적 거래대금
}

const CURRENCY_NAMES: Record<string, string> = {
  BTC:  '비트코인',
  ETH:  '이더리움',
  XRP:  '리플',
  SOL:  '솔라나',
  ADA:  '에이다',
  DOGE: '도지코인',
  AVAX: '아발란체',
  DOT:  '폴카닷',
  LINK: '체인링크',
  ATOM: '코스모스',
}

const UPBIT_WS      = 'wss://api.upbit.com/websocket/v1'
const PING_INTERVAL = 60_000

export const useUpbitMarketStore = defineStore('upbitMarket', () => {
  const tickers  = ref<Map<string, MarketTicker>>(new Map())
  const isConnected = ref(false)
  const error    = ref<string | null>(null)

  let ws: WebSocket | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null

  // 구독할 페어 코드 목록(보유 코인 등)을 받아 실시간 시세를 구독한다.
  function connect(codes: string[]) {
    if (codes.length === 0) return
    _cleanup()

    ws = new WebSocket(UPBIT_WS)

    ws.onopen = () => {
      isConnected.value = true
      error.value = null

      ws!.send(JSON.stringify([
        { ticket: crypto.randomUUID() },
        { type: 'ticker', codes },
        { format: 'DEFAULT' },
      ]))

      pingTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) ws.send('PING')
      }, PING_INTERVAL)
    }

    ws.onmessage = async (event) => {
      try {
        const text = event.data instanceof Blob
          ? await event.data.text()
          : (event.data as string)

        if (text.includes('"status"')) return  // heartbeat {"status":"UP"}

        const msg = JSON.parse(text)
        if (msg.type !== 'ticker') return

        const currency = (msg.code as string).replace('KRW-', '')
        tickers.value.set(msg.code, {
          code:              msg.code,
          currency,
          name:              CURRENCY_NAMES[currency] ?? currency,
          tradePrice:        msg.trade_price,
          signedChangeRate:  msg.signed_change_rate,
          signedChangePrice: msg.signed_change_price,
          accTradePrice24h:  msg.acc_trade_price_24h,
        })
      } catch {
        // 파싱 실패 무시
      }
    }

    ws.onerror = () => {
      error.value = '업비트 시세 연결 오류'
      isConnected.value = false
    }

    ws.onclose = () => {
      isConnected.value = false
      _clearPing()
    }
  }

  function _clearPing() {
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null }
  }

  function _cleanup() {
    _clearPing()
    if (ws) { ws.close(); ws = null }
    isConnected.value = false
  }

  function disconnect() {
    _cleanup()
  }

  return { tickers, isConnected, error, connect, disconnect }
})
