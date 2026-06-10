import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  NewsArticle,
  EducationContent,
  InvestmentTerm,
  RecommendedVideo,
} from '@/types'

// Backend wraps every payload in the standard envelope: { code, message, data }
interface Envelope<T> {
  code: string
  message: string
  data: T
}

export const useInsightStore = defineStore('insight', () => {
  // ── State ──
  const marketTopics = ref<NewsArticle[]>([])
  const terms        = ref<InvestmentTerm[]>([])
  const articles     = ref<EducationContent[]>([])   // list (body excluded)
  const videos       = ref<RecommendedVideo[]>([])

  // ── Today's market topics (GET /api/insights/market-topics) ──
  async function fetchMarketTopics(): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.get<Envelope<NewsArticle[]>>(
      '/api/insights/market-topics',
    )
    marketTopics.value = envelope.data
  }

  // ── Investment glossary (GET /api/insights/terms) ──
  async function fetchTerms(): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.get<Envelope<InvestmentTerm[]>>(
      '/api/insights/terms',
    )
    terms.value = envelope.data
  }

  // ── Beginner article list, body excluded (GET /api/insights/articles) ──
  async function fetchArticles(): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.get<Envelope<EducationContent[]>>(
      '/api/insights/articles',
    )
    articles.value = envelope.data
  }

  // ── Beginner article detail with full body (GET /api/insights/articles/{id}) ──
  async function fetchArticle(id: string): Promise<EducationContent> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.get<Envelope<EducationContent>>(
      `/api/insights/articles/${id}`,
    )
    return envelope.data
  }

  // ── Curated recommended videos (GET /api/insights/videos) ──
  async function fetchVideos(): Promise<void> {
    const { default: api } = await import('@/utils/api')
    const { data: envelope } = await api.get<Envelope<RecommendedVideo[]>>(
      '/api/insights/videos',
    )
    videos.value = envelope.data
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
