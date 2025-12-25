// 한전불입금 계산 로직 및 상수

export type VoltageType = "저압" | "고압" | "특별고압";
export type SupplyType = "공중" | "지중";
export type PaymentType = "LUMP_SUM" | "INSTALLMENT";

// 한전 단가표
export const KEPCO_RATES = {
  기본시설부담금: {
    저압: {
      공중: { base: 306000, extra: 121000 }, // 5kW까지 / 초과 kW당
      지중: { base: 588000, extra: 141000 },
    },
    고압: {
      공중: 24000, // kW당
      지중: 50000,
    },
    특별고압: {
      공중: 24000,
      지중: 50000,
    },
  },
  분할납부: {
    선납비율: 0.3, // 30%
    분할개월: 12,
    이자율: 0.0321, // 연 3.21%
  },
} as const;

// 기본시설부담금 계산
export function calcBasicCharge(
  capacityKw: number,
  voltage: VoltageType,
  supply: SupplyType
): number {
  if (voltage === "저압") {
    const rates = KEPCO_RATES.기본시설부담금.저압[supply];
    if (capacityKw <= 5) {
      return rates.base;
    } else {
      return rates.base + Math.ceil(capacityKw - 5) * rates.extra;
    }
  } else {
    // 고압/특별고압
    const rate = KEPCO_RATES.기본시설부담금[voltage][supply];
    return Math.ceil(capacityKw) * rate;
  }
}

// 기본시설부담금 상세 (저압의 경우)
export function calcBasicChargeDetail(
  capacityKw: number,
  voltage: VoltageType,
  supply: SupplyType
): { description: string; amount: number }[] {
  const details: { description: string; amount: number }[] = [];

  if (voltage === "저압") {
    const rates = KEPCO_RATES.기본시설부담금.저압[supply];
    details.push({
      description: `5kW까지 기본`,
      amount: rates.base,
    });
    if (capacityKw > 5) {
      const extraKw = Math.ceil(capacityKw - 5);
      details.push({
        description: `5kW 초과 ${extraKw}kW × ${rates.extra.toLocaleString()}원`,
        amount: extraKw * rates.extra,
      });
    }
  } else {
    const rate = KEPCO_RATES.기본시설부담금[voltage][supply];
    const kw = Math.ceil(capacityKw);
    details.push({
      description: `${kw}kW × ${rate.toLocaleString()}원`,
      amount: kw * rate,
    });
  }

  return details;
}

// 분할납부 스케줄 항목
export interface InstallmentScheduleItem {
  month: number;
  principal: number;
  interest: number;
  total: number;
  remainingBalance: number;
}

// 분할납부 계산 결과
export interface InstallmentResult {
  downPayment: number; // 선납금 (30%)
  remaining: number; // 잔여금
  monthlyPrincipal: number; // 월 원금
  schedule: InstallmentScheduleItem[];
  totalInterest: number; // 총 이자
  totalWithInterest: number; // 이자 포함 총액
}

// 분할납부 계산
export function calcInstallment(totalCharge: number): InstallmentResult {
  const { 선납비율, 분할개월, 이자율 } = KEPCO_RATES.분할납부;

  const downPayment = Math.round(totalCharge * 선납비율);
  const remaining = totalCharge - downPayment;
  const monthlyPrincipal = Math.round(remaining / 분할개월);

  const schedule: InstallmentScheduleItem[] = [];
  let remainingBalance = remaining;

  for (let i = 1; i <= 분할개월; i++) {
    // 마지막 달은 잔여 원금 전체
    const principal = i === 분할개월 ? remainingBalance : monthlyPrincipal;
    const interest = Math.round((remainingBalance * 이자율) / 12);

    schedule.push({
      month: i,
      principal,
      interest,
      total: principal + interest,
      remainingBalance: remainingBalance - principal,
    });

    remainingBalance -= principal;
  }

  const totalInterest = schedule.reduce((sum, s) => sum + s.interest, 0);

  return {
    downPayment,
    remaining,
    monthlyPrincipal,
    schedule,
    totalInterest,
    totalWithInterest: totalCharge + totalInterest,
  };
}

// 한전불입금 전체 계산
export interface KepcoChargeResult {
  capacityKw: number;
  voltageType: VoltageType;
  supplyType: SupplyType;
  basicCharge: number;
  basicChargeDetails: { description: string; amount: number }[];
  distanceCharge: number;
  totalCharge: number;
  paymentType: PaymentType;
  installment?: InstallmentResult;
}

export function calculateKepcoCharge(
  capacityKw: number,
  voltageType: VoltageType,
  supplyType: SupplyType,
  distanceCharge: number = 0,
  paymentType: PaymentType = "LUMP_SUM"
): KepcoChargeResult {
  const basicCharge = calcBasicCharge(capacityKw, voltageType, supplyType);
  const basicChargeDetails = calcBasicChargeDetail(
    capacityKw,
    voltageType,
    supplyType
  );
  const totalCharge = basicCharge + distanceCharge;

  const result: KepcoChargeResult = {
    capacityKw,
    voltageType,
    supplyType,
    basicCharge,
    basicChargeDetails,
    distanceCharge,
    totalCharge,
    paymentType,
  };

  if (paymentType === "INSTALLMENT") {
    result.installment = calcInstallment(totalCharge);
  }

  return result;
}

// 전압 구분 옵션
export const VOLTAGE_OPTIONS: { value: VoltageType; label: string }[] = [
  { value: "저압", label: "저압" },
  { value: "고압", label: "고압" },
  { value: "특별고압", label: "특별고압" },
];

// 공급방식 옵션
export const SUPPLY_OPTIONS: { value: SupplyType; label: string }[] = [
  { value: "공중", label: "공중" },
  { value: "지중", label: "지중" },
];

// 납부방식 옵션
export const PAYMENT_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: "LUMP_SUM", label: "일시불" },
  { value: "INSTALLMENT", label: "분할납부 (12개월, 이자 3.21%)" },
];
