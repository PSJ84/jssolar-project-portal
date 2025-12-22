// 금융 유형
export type FinancingType = "SELF_FUNDING" | "BANK_LOAN" | "GOVERNMENT_LOAN" | "FACTORING";

// 분석 입력 인터페이스
export interface AnalysisInput {
  capacityKw: number;
  totalInvestment: number;
  financingType: FinancingType;

  // 공통 파라미터
  peakHours: number;           // 일조 시간 (기본: 3.7)
  degradationRate: number;     // 효율 저하율 (기본: 0.008 = 0.8%)
  smpPrice: number;            // SMP 단가 (원/kWh)
  recPrice: number;            // REC 단가 (원/REC)
  recWeight: number;           // REC 가중치 (기본: 1.0)
  maintenanceCost: number;     // 연간 안전관리비
  monitoringCost: number;      // 연간 모니터링비

  // 대출 관련
  selfFundingRate?: number;    // 자부담 비율 (0~1)
  loanAmount?: number;         // 대출 금액
  interestRate?: number;       // 금리 (%)
  loanPeriod?: number;         // 상환 기간 (년)
  gracePeriod?: number;        // 거치 기간 (년)

  // 팩토링
  guaranteeFeeRate?: number;   // 서울보증 보증료 (기본: 0.05 = 5%)
  factoringFeeRate?: number;   // 동부화재 수수료 (기본: 0.08 = 8%)
}

// 연도별 데이터 인터페이스
export interface YearlyData {
  year: number;
  generation: number;        // 발전량 (kWh)
  smpRevenue: number;        // SMP 수익
  recRevenue: number;        // REC 수익
  totalRevenue: number;      // 총 수익
  loanRepayment: number;     // 대출 원금 상환
  interestPayment: number;   // 이자
  maintenanceCost: number;   // 안전관리비
  monitoringCost: number;    // 모니터링비
  totalExpense: number;      // 총 비용
  netProfit: number;         // 순이익
  cumulative: number;        // 누적 수익
}

// 분석 결과 인터페이스
export interface AnalysisResult {
  yearlyData: YearlyData[];
  paybackPeriod: number;     // 투자 회수 기간 (년)
  totalProfit20y: number;    // 20년 총 수익
  roi: number;               // ROI (%)
  initialCost: number;       // 초기 투자금
  totalRevenue20y: number;   // 20년 총 매출
  totalExpense20y: number;   // 20년 총 비용
}

// 금융 유형별 기본값
export function getFinancingDefaults(type: FinancingType, totalInvestment: number) {
  switch (type) {
    case "SELF_FUNDING":
      return {
        selfFundingRate: 1,
        loanAmount: 0,
        interestRate: 0,
        loanPeriod: 0,
        gracePeriod: 0,
      };
    case "BANK_LOAN":
      return {
        selfFundingRate: 0.2,
        loanAmount: totalInvestment * 0.8,
        interestRate: 5.5, // 기본 시중금리
        loanPeriod: 10,
        gracePeriod: 0,
      };
    case "GOVERNMENT_LOAN":
      return {
        selfFundingRate: 0.2,
        loanAmount: totalInvestment * 0.8,
        interestRate: 1.75, // 고정 금리
        loanPeriod: 11, // 거치 1년 + 상환 10년
        gracePeriod: 1,
      };
    case "FACTORING":
      return {
        selfFundingRate: 0,
        loanAmount: totalInvestment,
        interestRate: 5.5, // 시중금리
        loanPeriod: 5,
        gracePeriod: 0,
        guaranteeFeeRate: 0.05,
        factoringFeeRate: 0.08,
      };
  }
}

// 수익분석 계산 함수
export function calculateProfitAnalysis(input: AnalysisInput): AnalysisResult {
  const yearlyData: YearlyData[] = [];
  let cumulative = 0;
  let paybackYear = 0;
  let prevCumulative = 0;

  // 자부담 비율 결정
  const selfFundingRate = input.selfFundingRate ??
    (input.financingType === "SELF_FUNDING" ? 1 :
     input.financingType === "FACTORING" ? 0 : 0.2);

  // 초기 비용 계산
  const selfFunding = input.totalInvestment * selfFundingRate;

  // 팩토링 수수료 (1회성)
  const initialFees = input.financingType === "FACTORING"
    ? input.totalInvestment * ((input.guaranteeFeeRate || 0.05) + (input.factoringFeeRate || 0.08))
    : 0;

  // 초기 투자금
  const initialCost = selfFunding + initialFees;
  cumulative = -initialCost;

  // 대출 관련 변수
  const loanAmount = input.loanAmount || 0;
  const interestRate = (input.interestRate || 0) / 100;
  const loanPeriod = input.loanPeriod || 0;
  const gracePeriod = input.gracePeriod || 0;
  const repaymentPeriod = loanPeriod - gracePeriod;

  for (let year = 1; year <= 20; year++) {
    prevCumulative = cumulative;

    // 발전량 (효율 저하 반영)
    const generation = input.capacityKw * input.peakHours * 365 *
      Math.pow(1 - input.degradationRate, year - 1);

    // 수익 계산
    const smpRevenue = generation * input.smpPrice;
    const recCount = generation / 1000; // 1REC = 1MWh
    const recRevenue = recCount * input.recPrice * input.recWeight;
    const totalRevenue = smpRevenue + recRevenue;

    // 대출 상환 및 이자 계산
    let loanRepayment = 0;
    let interestPayment = 0;

    if (input.financingType !== "SELF_FUNDING" && loanAmount > 0 && loanPeriod > 0) {
      if (year <= loanPeriod) {
        // 거치 기간 중 (이자만 납부)
        if (year <= gracePeriod) {
          interestPayment = loanAmount * interestRate;
        } else {
          // 상환 기간 (원금 + 이자)
          const yearsIntoRepayment = year - gracePeriod;
          const remainingYears = repaymentPeriod - yearsIntoRepayment + 1;
          const remainingPrincipal = loanAmount * remainingYears / repaymentPeriod;
          loanRepayment = loanAmount / repaymentPeriod;
          interestPayment = remainingPrincipal * interestRate;
        }
      }
    }

    // 비용 계산
    const totalExpense = loanRepayment + interestPayment +
      input.maintenanceCost + input.monitoringCost;

    // 순이익
    const netProfit = totalRevenue - totalExpense;
    cumulative += netProfit;

    // 회수 기간 계산 (선형 보간)
    if (paybackYear === 0 && cumulative >= 0 && prevCumulative < 0) {
      // 정확한 회수 시점 계산 (선형 보간)
      const fraction = Math.abs(prevCumulative) / (cumulative - prevCumulative);
      paybackYear = year - 1 + fraction;
    }

    yearlyData.push({
      year,
      generation: Math.round(generation),
      smpRevenue: Math.round(smpRevenue),
      recRevenue: Math.round(recRevenue),
      totalRevenue: Math.round(totalRevenue),
      loanRepayment: Math.round(loanRepayment),
      interestPayment: Math.round(interestPayment),
      maintenanceCost: input.maintenanceCost,
      monitoringCost: input.monitoringCost,
      totalExpense: Math.round(totalExpense),
      netProfit: Math.round(netProfit),
      cumulative: Math.round(cumulative),
    });
  }

  // 총계 계산
  const totalRevenue20y = yearlyData.reduce((sum, y) => sum + y.totalRevenue, 0);
  const totalExpense20y = yearlyData.reduce((sum, y) => sum + y.totalExpense, 0);
  const totalProfit20y = Math.round(cumulative);

  // ROI 계산
  const roi = initialCost > 0
    ? Math.round((totalProfit20y / initialCost) * 100 * 10) / 10
    : 0;

  return {
    yearlyData,
    paybackPeriod: Math.round(paybackYear * 10) / 10,
    totalProfit20y,
    roi,
    initialCost: Math.round(initialCost),
    totalRevenue20y,
    totalExpense20y,
  };
}

// 금융 유형 라벨
export const financingTypeLabels: Record<FinancingType, string> = {
  SELF_FUNDING: "자부담 100%",
  BANK_LOAN: "은행 80% 대출",
  GOVERNMENT_LOAN: "금융지원사업",
  FACTORING: "팩토링",
};

// 금융 유형 설명
export const financingTypeDescriptions: Record<FinancingType, string> = {
  SELF_FUNDING: "초기 투자 전액 자부담, 대출 없음",
  BANK_LOAN: "자부담 20%, 은행 대출 80% (시중금리)",
  GOVERNMENT_LOAN: "자부담 20%, 정부 대출 80% (1.75% 고정, 2등급 모듈 필수)",
  FACTORING: "자부담 0%, 서울보증 5% + 동부화재 7~9% + 은행대출",
};
