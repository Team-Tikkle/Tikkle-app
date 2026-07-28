import type { RuleType } from '@/types';

const ROUND_UP_AMOUNTS: Partial<Record<RuleType, number>> = {
  ROUND_UP_10000: 10000,
  ROUND_UP_20000: 20000,
  ROUND_UP_30000: 30000,
  ROUND_UP_40000: 40000,
  ROUND_UP_50000: 50000,
};
const PERCENT_VALUES: Partial<Record<RuleType, number>> = {
  PERCENT_10: 10,
  PERCENT_15: 15,
  PERCENT_20: 20,
  PERCENT_25: 25,
  PERCENT_30: 30,
};

/** 1만 / 15% 처럼 짧은 값 라벨 (ruleSummary 내부 전용) */
function ruleLabel(rule: RuleType): string {
  const amount = ROUND_UP_AMOUNTS[rule];
  if (amount !== undefined) return `${amount.toLocaleString('ko-KR')}원`;
  const percent = PERCENT_VALUES[rule];
  if (percent !== undefined) return `${percent}%`;
  return rule;
}

/** 1만원 단위 올림 / 15% 적립 처럼 목록 요약 문구 */
export function ruleSummary(rule: RuleType): string {
  return rule.startsWith('ROUND_UP')
    ? `${ruleLabel(rule)} 단위 올림`
    : `${ruleLabel(rule)} 적립`;
}

/** 한국어 숫자 포맷 (1,234,567) */
export function fmtKRW(amount: number): string {
  return amount.toLocaleString('ko-KR');
}

/**
 * 코인 체결 수량 포맷 — 체결값을 반올림 없이 그대로 보여준다.
 * 업비트와 동일하게 소수점 8자리까지 두고 의미 없는 꼬리 0만 제거한다.
 * toFixed를 거치는 이유는 toString()이 작은 수를 지수 표기(1e-7)로 만들기 때문.
 */
export function fmtVolume(v: number): string {
  if (v === 0) return '0';
  return v.toFixed(8).replace(/\.?0+$/, '');
}
