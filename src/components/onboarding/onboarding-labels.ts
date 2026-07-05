import type {
  RiskTolerance,
  TrendSensitivity,
  DiversificationType,
  MemeAcceptance,
} from '@/types';

export const RISK_LABELS: Record<RiskTolerance, { title: string; desc: string }> = {
  SELL_IMMEDIATELY: { title: '즉시 매도', desc: '더 큰 손실을 막기 위해 바로 처분합니다.' },
  HOLD: { title: '그대로 보유', desc: '일시적인 하락이라 판단하고 시장을 관망합니다.' },
  BUY_MORE: { title: '추가 매수', desc: '저가 매수의 기회로 삼아 보유량을 늘립니다.' },
};

export const TREND_LABELS: Record<TrendSensitivity, { title: string; desc: string }> = {
  FUNDAMENTAL_ONLY: {
    title: '대형 우량주 위주',
    desc: '비트코인, 이더리움 등 검증되고 안정적인 코인을 선호합니다.',
  },
  PARTIAL_TREND: {
    title: '우량주 + 트렌드',
    desc: '대형 코인을 기본으로 두고, 유행하는 코인을 일부 섞어 투자합니다.',
  },
  FULL_TREND: {
    title: '트렌드 적극 추종',
    desc: '현재 시장에서 가장 인기 있고 화제가 되는 코인 위주로 투자합니다.',
  },
};

export const MEME_LABELS: Record<MemeAcceptance, { title: string; desc: string }> = {
  NONE: { title: '투자 안 함', desc: '변동성이 너무 커서 포트폴리오에 포함하지 않습니다.' },
  SMALL: { title: '소액 체험', desc: '전체 투자금에 영향이 없는 소액 범위 내에서만 투자합니다.' },
  ACTIVE: { title: '적극 수용', desc: '높은 단기 수익률을 위해 비중 있게 투자할 의향이 있습니다.' },
};

export const DIVERS_LABELS: Record<DiversificationType, { title: string; desc: string }> = {
  CONCENTRATED: { title: '집중 투자', desc: '확신이 있는 1~2개의 코인에 비중을 크게 둡니다.' },
  BALANCED: {
    title: '균형 분산',
    desc: '관리가 용이한 3~5개의 코인으로 적절히 나누어 투자합니다.',
  },
  DIVERSIFIED: {
    title: '넓은 분산',
    desc: '변동성 대비를 위해 최대한 다양한 코인에 폭넓게 나누어 담습니다.',
  },
};
