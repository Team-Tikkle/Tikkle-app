import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  NewsArticle,
  InsightArticle,
  InvestmentTerm,
  RecommendedVideo,
} from '@/types'

// Backend wraps every payload in the standard envelope: { code, message, data }
interface Envelope<T> {
  code: string
  message: string
  data: T
}

// ── Market-topic normalization ──
// The backend serializes fields in camelCase (publishedAt, thumbnailUrl,
// sourceUrl) while the frontend NewsArticle type uses snake_case from the
// original mock shape. Raw items are normalized here so the rest of the app
// only ever sees one shape. Both conventions are accepted defensively.
interface RawMarketTopic {
  id: number | string
  title?: string
  summary?: string
  press?: string
  // External article URL — the backend names this field "link"
  link?: string
  publishedAt?: string
  published_at?: string
  thumbnailUrl?: string | null
  thumbnail_url?: string | null
}

// Scraped news text often carries HTML entities (&nbsp;, &quot;, &#39;…)
// and markup tags (<b>…</b>). Decode entities and strip tags for display.
function cleanNewsText(s?: string): string {
  if (!s) return ''
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeMarketTopic(raw: RawMarketTopic): NewsArticle {
  return {
    id: String(raw.id),
    title: cleanNewsText(raw.title),
    summary: cleanNewsText(raw.summary),
    press: cleanNewsText(raw.press),
    published_at: raw.publishedAt ?? raw.published_at ?? '',
    thumbnail_url: raw.thumbnailUrl ?? raw.thumbnail_url ?? '',
    source_url: raw.link ?? '',
  }
}

// ── Other insight endpoints — raw backend shapes (camelCase, numeric ids) ──

interface RawTerm {
  id: number | string
  term: string
  description: string
}

interface RawArticle {
  id: number | string
  title: string
  thumbnailUrl?: string | null
  publishedAt?: string
  body?: string // only present on the detail endpoint
}

interface RawVideo {
  id: number | string
  title: string
  videoUrl?: string
  thumbnailUrl?: string | null
  channelName?: string
}

function normalizeArticle(raw: RawArticle): InsightArticle {
  return {
    id: String(raw.id),
    title: raw.title ?? '',
    thumbnail_url: raw.thumbnailUrl ?? '',
    published_at: raw.publishedAt ?? '',
    body: raw.body,
  }
}

function normalizeVideo(raw: RawVideo): RecommendedVideo {
  return {
    id: String(raw.id),
    title: raw.title ?? '',
    video_url: raw.videoUrl ?? '',
    thumbnail_url: raw.thumbnailUrl ?? '',
    channel_name: raw.channelName ?? '',
  }
}

export const useInsightStore = defineStore('insight', () => {
  // ── State ──
  const marketTopics = ref<NewsArticle[]>([])
  const terms        = ref<InvestmentTerm[]>([])
  const articles     = ref<InsightArticle[]>([])   // list (body excluded)
  const videos       = ref<RecommendedVideo[]>([])

  // ── Today's market topics (GET /api/insights/market-topics) ──
  async function fetchMarketTopics(): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.get<Envelope<RawMarketTopic[]>>(
      '/api/insights/market-topics',
    )
    marketTopics.value = envelope.data.map(normalizeMarketTopic)
  }

  // ── Investment glossary (GET /api/insights/terms) ──
  async function fetchTerms(): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.get<Envelope<RawTerm[]>>(
      '/api/insights/terms',
    )
    terms.value = envelope.data.map((t) => ({
      id: String(t.id),
      term: t.term,
      description: t.description,
    }))
  }

  // ── Beginner article list, body excluded (GET /api/insights/articles) ──
  async function fetchArticles(): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.get<Envelope<RawArticle[]>>(
      '/api/insights/articles',
    )
    articles.value = envelope.data.map(normalizeArticle)
  }

  // ── Beginner article detail with full body (GET /api/insights/articles/{id}) ──
  async function fetchArticle(id: string): Promise<InsightArticle> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.get<Envelope<RawArticle>>(
      `/api/insights/articles/${id}`,
    )
    return normalizeArticle(envelope.data)
  }

  // ── Curated recommended videos (GET /api/insights/videos) ──
  async function fetchVideos(): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.get<Envelope<RawVideo[]>>(
      '/api/insights/videos',
    )
    videos.value = envelope.data.map(normalizeVideo)
  }

  return {
    // state
    marketTopics,
    terms,
    articles,
    videos,
    // actions
    fetchMarketTopics,
    fetchTerms,
    fetchArticles,
    fetchArticle,
    fetchVideos,
  }
})
