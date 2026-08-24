/**
 * 약관·방침 문서 원본.
 *
 * docs/*.md 를 ?raw 로 번들에 포함해 단일 출처를 유지한다. 앱 화면에 보이는
 * 내용과 배포용 문서가 갈라지지 않도록 하기 위함이며, 문서를 고칠 때는
 * docs/ 쪽만 수정하면 된다.
 */
import privacyRaw from '../../docs/privacy-policy.md?raw'
import termsRaw from '../../docs/terms-of-service.md?raw'

export const LEGAL_DOCS = {
  terms:   { title: '이용약관',        body: termsRaw   },
  privacy: { title: '개인정보처리방침', body: privacyRaw },
} as const

export type LegalDocKey = keyof typeof LEGAL_DOCS

export function isLegalDocKey(v: string): v is LegalDocKey {
  return v in LEGAL_DOCS
}
