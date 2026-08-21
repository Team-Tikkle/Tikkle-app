import type { AxiosError } from 'axios'
import type { TwoFactorProvider } from '@/types'

// ── 서버 에러 응답 규약 ──
// 실패 응답은 { code, message } 형태이며 식별자는 message가 아닌 code 필드에 담긴다.
// (message는 서버가 FE 개발자용으로 서술한 값이므로 사용자 노출 문구는 여기서 매핑한다.)
type AuthErrorData = { code?: string; message?: string }

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'COMMON-002': '입력한 정보를 다시 확인해 주세요.',
  'SMS-001':    '인증 문자 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  'SMS-002':    '인증번호가 일치하지 않거나 만료되었습니다.',
  'SMS-003':    '인증 시간이 만료되었습니다. 처음부터 다시 진행해 주세요.',
  'SMS-004':    '잠시 후 다시 요청해 주세요.',
  'SMS-005':    '오늘 인증 요청 횟수를 초과했습니다. 24시간 후 다시 시도해 주세요.',
  'SMS-006':    '인증번호를 5회 잘못 입력했습니다. 인증번호를 다시 받아 주세요.',
  'AUTH-007':   '이미 가입된 전화번호입니다.',
  'AUTH-008':   '비밀번호가 일치하지 않습니다.',
  'USER-001':   '가입되지 않은 전화번호입니다.',
}

// 에러에서 서버 code 문자열을 추출한다 (없으면 undefined).
export function authErrorCode(err: unknown): string | undefined {
  return (err as AxiosError<AuthErrorData>).response?.data?.code
}

// 사용자에게 보여줄 한글 문구로 변환한다.
// 알려진 code → 매핑 문구, 그 외 → 서버 message, 둘 다 없으면 fallback.
export function authErrorMessage(err: unknown, fallback = '오류가 발생했습니다. 다시 시도해 주세요.'): string {
  const data = (err as AxiosError<AuthErrorData>).response?.data
  if (data?.code && AUTH_ERROR_MESSAGES[data.code]) return AUTH_ERROR_MESSAGES[data.code]
  return data?.message ?? fallback
}

// ── 비밀번호 정책 (가입·재설정 전용, 로그인 제외) ──
// 영문 + 숫자 + 특수문자를 모두 포함한 8~20자.
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/

export function isValidPassword(pw: string): boolean {
  return PASSWORD_RE.test(pw)
}

export const PASSWORD_POLICY_HINT = '영문·숫자·특수문자를 모두 포함해 8~20자로 입력해 주세요.'

// ── 형식 검증 ──
// 하이픈 없이 01로 시작하는 10~11자리.
const PHONE_RE = /^01[0-9]{8,9}$/

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone)
}

// ── 업비트 2차 인증 수단 ──
// 온보딩·설정 두 화면이 같은 목록을 쓴다.
export const TWO_FACTOR_OPTIONS: { key: TwoFactorProvider; label: string }[] = [
  { key: 'KAKAO', label: '카카오톡' },
  { key: 'NAVER', label: '네이버'   },
  { key: 'HANA',  label: '하나인증서' },
]
