import { NextRequest, NextResponse } from "next/server";
import {
  AnalysisInput,
  AnalysisResult,
  calculateProfitAnalysis,
} from "@/lib/profit-analysis";

interface SimulationRequest {
  capacityKw: number;
  totalInvestment: number;
  smpPrice?: number;
  recPrice?: number;
  recWeight?: number;
  peakHours?: number;
  degradationRate?: number;
  maintenanceCost?: number;
  monitoringCost?: number;
  bankInterestRate?: number;
  factoringFeeRate?: number;
}

interface SimulationResponse {
  selfFunding: AnalysisResult;
  bankLoan: AnalysisResult;
  governmentLoan: AnalysisResult;
  factoring: AnalysisResult;
}

// POST: 시뮬레이션 계산 (공개 API, 로그인 불필요)
export async function POST(request: NextRequest) {
  try {
    const body: SimulationRequest = await request.json();
    const {
      capacityKw,
      totalInvestment,
      smpPrice = 120,
      recPrice = 40000,
      recWeight = 1.0,
      peakHours = 3.7,
      degradationRate = 0.008,
      maintenanceCost = 500000,
      monitoringCost = 300000,
      bankInterestRate = 5.5,
      factoringFeeRate = 0.08,
    } = body;

    // 필수 필드 검증
    if (!capacityKw || capacityKw <= 0) {
      return NextResponse.json(
        { error: "설치 용량을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!totalInvestment || totalInvestment <= 0) {
      return NextResponse.json(
        { error: "투자 금액을 입력해주세요." },
        { status: 400 }
      );
    }

    // 공통 파라미터
    const commonParams = {
      capacityKw,
      totalInvestment,
      peakHours,
      degradationRate,
      smpPrice,
      recPrice,
      recWeight,
      maintenanceCost,
      monitoringCost,
    };

    // 4가지 모델 동시 계산
    const results: SimulationResponse = {
      // 1. 자부담 100%
      selfFunding: calculateProfitAnalysis({
        ...commonParams,
        financingType: "SELF_FUNDING",
        selfFundingRate: 1,
        loanAmount: 0,
        interestRate: 0,
        loanPeriod: 0,
        gracePeriod: 0,
      } as AnalysisInput),

      // 2. 은행 80% 대출
      bankLoan: calculateProfitAnalysis({
        ...commonParams,
        financingType: "BANK_LOAN",
        selfFundingRate: 0.2,
        loanAmount: totalInvestment * 0.8,
        interestRate: bankInterestRate,
        loanPeriod: 10,
        gracePeriod: 0,
      } as AnalysisInput),

      // 3. 금융지원사업 (1.75% 고정, 거치 1년 + 상환 10년)
      governmentLoan: calculateProfitAnalysis({
        ...commonParams,
        financingType: "GOVERNMENT_LOAN",
        selfFundingRate: 0.2,
        loanAmount: totalInvestment * 0.8,
        interestRate: 1.75,
        loanPeriod: 11,
        gracePeriod: 1,
      } as AnalysisInput),

      // 4. 팩토링 (서울보증 5% + 동부화재 7~9% + 은행대출)
      factoring: calculateProfitAnalysis({
        ...commonParams,
        financingType: "FACTORING",
        selfFundingRate: 0,
        loanAmount: totalInvestment,
        interestRate: bankInterestRate,
        loanPeriod: 5,
        gracePeriod: 0,
        guaranteeFeeRate: 0.05,
        factoringFeeRate,
      } as AnalysisInput),
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error calculating simulation:", error);
    return NextResponse.json(
      { error: "시뮬레이션 계산에 실패했습니다." },
      { status: 500 }
    );
  }
}
