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
