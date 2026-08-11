/**
 * 약관·방침 문서 원본.
 *
 * docs/*.md 를 ?raw 로 번들에 포함해 단일 출처를 유지한다. 앱 화면에 보이는
 * 내용과 배포용 문서가 갈라지지 않도록 하기 위함이며, 문서를 고칠 때는
 * docs/ 쪽만 수정하면 된다.
 */
import privacyRaw from '../../docs/privacy-policy.md?raw'
import termsRaw from '../../docs/terms-of-service.md?raw'

// 문서 최상단의 초안 경고 블록만 걷어낸다. 본문 중간의 인용 블록은 그대로 둔다.
// docs/*.md 는 CRLF 라 개행부터 정규화한다 — 안 하면 \n\n 이 안 맞아 조용히 실패한다.
function stripDraftNotice(md: string): string {
  return md.replace(/\r\n/g, '\n').replace(/^> ⚠️ \*\*초안입니다\.\*\*[\s\S]*?\n\n/m, '')
}

export const LEGAL_DOCS = {
  terms:   { title: '이용약관',        body: stripDraftNotice(termsRaw)   },
  privacy: { title: '개인정보처리방침', body: stripDraftNotice(privacyRaw) },
} as const

export type LegalDocKey = keyof typeof LEGAL_DOCS

export function isLegalDocKey(v: string): v is LegalDocKey {
  return v in LEGAL_DOCS
}
