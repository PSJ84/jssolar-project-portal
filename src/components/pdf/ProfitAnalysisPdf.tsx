import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// 한글 폰트 등록 (URL 기반 - 서버사이드에서 사용)
const fontBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

Font.register({
  family: "NotoSansKR",
  fonts: [
    {
      src: `${fontBaseUrl}/fonts/NotoSansKR-Regular.ttf`,
      fontWeight: 400,
    },
    {
      src: `${fontBaseUrl}/fonts/NotoSansKR-Bold.ttf`,
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "NotoSansKR",
    fontSize: 9,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
    borderBottom: "2px solid #16a34a",
    paddingBottom: 15,
  },
  logoSection: {
    flexDirection: "column",
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    color: "#16a34a",
  },
  companySubtext: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
  },
  headerRight: {
    textAlign: "right",
    fontSize: 8,
    color: "#666",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: "center",
    marginVertical: 15,
    color: "#166534",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 15,
    marginTop: 10,
    color: "#166534",
    borderBottom: "1px solid #16a34a",
    paddingBottom: 5,
  },
  infoSection: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 10,
  },
  infoBox: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 4,
    borderLeft: "3px solid #16a34a",
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 8,
    color: "#166534",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  infoLabel: {
    width: 80,
    color: "#666",
    fontSize: 9,
  },
  infoValue: {
    flex: 1,
    fontWeight: 500,
    fontSize: 9,
  },
  summarySection: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  metricBox: {
    flex: 1,
    padding: 15,
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    alignItems: "center",
    borderTop: "3px solid #16a34a",
  },
  metricLabel: {
    fontSize: 9,
    color: "#666",
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "#166534",
  },
  metricUnit: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
  },
  assumptionsBox: {
    padding: 12,
    backgroundColor: "#fef3c7",
    borderRadius: 4,
    marginBottom: 20,
  },
  assumptionsTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 8,
    color: "#92400e",
  },
  assumptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  assumptionItem: {
    width: "50%",
    flexDirection: "row",
    marginBottom: 3,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#166534",
    color: "#fff",
    padding: 6,
    fontWeight: 700,
    fontSize: 7,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e5e7eb",
    padding: 5,
    fontSize: 7,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottom: "1px solid #e5e7eb",
    padding: 5,
    fontSize: 7,
    backgroundColor: "#f9fafb",
  },
  tableRowHighlight: {
    flexDirection: "row",
    borderBottom: "1px solid #e5e7eb",
    padding: 5,
    fontSize: 7,
    backgroundColor: "#dcfce7",
  },
  colYear: { width: "8%", textAlign: "center" },
  colGen: { width: "14%", textAlign: "right" },
  colSmp: { width: "13%", textAlign: "right" },
  colRec: { width: "13%", textAlign: "right" },
  colRev: { width: "13%", textAlign: "right" },
  colExp: { width: "13%", textAlign: "right" },
  colNet: { width: "13%", textAlign: "right" },
  colCum: { width: "13%", textAlign: "right" },
  disclaimer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    fontSize: 8,
    color: "#64748b",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 7,
    color: "#9ca3af",
    borderTop: "1px solid #e5e7eb",
    paddingTop: 10,
  },
  positiveValue: {
    color: "#16a34a",
  },
  negativeValue: {
    color: "#dc2626",
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 40,
    fontSize: 8,
    color: "#9ca3af",
  },
});

// 금융 모델 라벨
const financingTypeLabels: Record<string, string> = {
  SELF_FUNDING: "자부담 100%",
  BANK_LOAN: "은행 80% 대출",
  GOVERNMENT_LOAN: "금융지원사업",
  FACTORING: "팩토링",
};

export interface YearlyDataItem {
  year: number;
  generation: number;
  smpRevenue: number;
  recRevenue: number;
  totalRevenue: number;
  loanRepayment: number;
  interestPayment: number;
  maintenanceCost: number;
  monitoringCost: number;
  totalExpense: number;
  netProfit: number;
  cumulative: number;
}

export interface ProfitAnalysisPdfData {
  id: string;
  financingType: string;
  totalInvestment: number;
  selfFundingRate: number;
  loanAmount: number;
  interestRate: number;
  loanPeriod: number;
  gracePeriod: number;
  guaranteeFeeRate?: number | null;
  factoringFeeRate?: number | null;
  peakHours: number;
  degradationRate: number;
  smpPrice: number;
  recPrice: number;
  recWeight: number;
  maintenanceCost: number;
  monitoringCost: number;
  yearlyData: YearlyDataItem[];
  paybackPeriod: number;
  totalProfit20y: number;
  roi: number;
  createdAt: Date | string;
}

export interface QuotationBasicInfo {
  quotationNumber: string;
  customerName: string;
  capacityKw: number;
  grandTotal: number;
}

export interface CompanyInfo {
  name: string;
  ceo: string;
  address: string;
  phone: string;
  email: string;
  businessNumber: string;
}

interface ProfitAnalysisPdfProps {
  quotation: QuotationBasicInfo;
  analysis: ProfitAnalysisPdfData;
  company: CompanyInfo;
}

export function ProfitAnalysisPdf({
  quotation,
  analysis,
  company,
}: ProfitAnalysisPdfProps) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const formatNumber = (num: number) => {
    return Math.round(num).toLocaleString("ko-KR");
  };

  const yearlyData = analysis.yearlyData as YearlyDataItem[];

  return (
    <Document>
      {/* 1페이지: 요약 */}
      <Page size="A4" style={styles.page}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companySubtext}>
              태양광 발전소 전문 시공 및 관리
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text>견적번호: {quotation.quotationNumber}</Text>
            <Text>분석일: {formatDate(analysis.createdAt)}</Text>
          </View>
        </View>

        {/* 제목 */}
        <Text style={styles.title}>수익분석 보고서</Text>

        {/* 기본 정보 */}
        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>프로젝트 정보</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>고객명</Text>
              <Text style={styles.infoValue}>{quotation.customerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>설치용량</Text>
              <Text style={styles.infoValue}>{quotation.capacityKw} kW</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>총 투자금</Text>
              <Text style={styles.infoValue}>
                {formatNumber(quotation.grandTotal)}원
              </Text>
            </View>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>금융 모델</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>금융유형</Text>
              <Text style={styles.infoValue}>
                {financingTypeLabels[analysis.financingType] ||
                  analysis.financingType}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>자부담</Text>
              <Text style={styles.infoValue}>
                {Math.round(analysis.selfFundingRate * 100)}% (
                {formatNumber(analysis.totalInvestment * analysis.selfFundingRate)}원)
              </Text>
            </View>
            {analysis.loanAmount > 0 && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>대출금</Text>
                  <Text style={styles.infoValue}>
                    {formatNumber(analysis.loanAmount)}원
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>금리/기간</Text>
                  <Text style={styles.infoValue}>
                    {analysis.interestRate}% / {analysis.loanPeriod}년
                    {analysis.gracePeriod > 0 &&
                      ` (거치 ${analysis.gracePeriod}년)`}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 요약 지표 */}
        <View style={styles.summarySection}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>초기 투자금</Text>
            <Text style={styles.metricValue}>
              {formatNumber(
                analysis.totalInvestment * analysis.selfFundingRate +
                  (analysis.financingType === "FACTORING"
                    ? analysis.totalInvestment *
                      ((analysis.guaranteeFeeRate || 0) +
                        (analysis.factoringFeeRate || 0))
                    : 0)
              )}
            </Text>
            <Text style={styles.metricUnit}>원</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>투자 회수 기간</Text>
            <Text style={styles.metricValue}>
              {analysis.paybackPeriod > 0
                ? analysis.paybackPeriod.toFixed(1)
                : "-"}
            </Text>
            <Text style={styles.metricUnit}>년</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>20년 총 수익</Text>
            <Text
              style={[
                styles.metricValue,
                analysis.totalProfit20y >= 0
                  ? styles.positiveValue
                  : styles.negativeValue,
              ]}
            >
              {formatNumber(analysis.totalProfit20y)}
            </Text>
            <Text style={styles.metricUnit}>원</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>투자수익률 (ROI)</Text>
            <Text style={styles.metricValue}>{analysis.roi.toFixed(1)}</Text>
            <Text style={styles.metricUnit}>%</Text>
          </View>
        </View>

        {/* 가정 조건 */}
        <View style={styles.assumptionsBox}>
          <Text style={styles.assumptionsTitle}>분석 조건</Text>
          <View style={styles.assumptionsGrid}>
            <View style={styles.assumptionItem}>
              <Text style={styles.infoLabel}>SMP 단가</Text>
              <Text style={styles.infoValue}>{analysis.smpPrice}원/kWh</Text>
            </View>
            <View style={styles.assumptionItem}>
              <Text style={styles.infoLabel}>REC 단가</Text>
              <Text style={styles.infoValue}>
                {formatNumber(analysis.recPrice)}원/REC
              </Text>
            </View>
            <View style={styles.assumptionItem}>
              <Text style={styles.infoLabel}>피크시간</Text>
              <Text style={styles.infoValue}>{analysis.peakHours}시간/일</Text>
            </View>
            <View style={styles.assumptionItem}>
              <Text style={styles.infoLabel}>효율저하율</Text>
              <Text style={styles.infoValue}>
                {(analysis.degradationRate * 100).toFixed(1)}%/년
              </Text>
            </View>
            <View style={styles.assumptionItem}>
              <Text style={styles.infoLabel}>REC 가중치</Text>
              <Text style={styles.infoValue}>{analysis.recWeight}</Text>
            </View>
            <View style={styles.assumptionItem}>
              <Text style={styles.infoLabel}>연간 관리비</Text>
              <Text style={styles.infoValue}>
                {formatNumber(analysis.maintenanceCost + analysis.monitoringCost)}
                원
              </Text>
            </View>
          </View>
        </View>

        {/* 연도별 요약 (처음 10년) */}
        <Text style={styles.subtitle}>연도별 수익 (1~10년)</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colYear}>년차</Text>
            <Text style={styles.colGen}>발전량(kWh)</Text>
            <Text style={styles.colSmp}>SMP수익</Text>
            <Text style={styles.colRec}>REC수익</Text>
            <Text style={styles.colRev}>총수익</Text>
            <Text style={styles.colExp}>총비용</Text>
            <Text style={styles.colNet}>순이익</Text>
            <Text style={styles.colCum}>누적</Text>
          </View>
          {yearlyData.slice(0, 10).map((year, idx) => {
            const isPaybackYear =
              year.cumulative >= 0 &&
              (idx === 0 || yearlyData[idx - 1].cumulative < 0);
            return (
              <View
                key={idx}
                style={
                  isPaybackYear
                    ? styles.tableRowHighlight
                    : idx % 2 === 0
                      ? styles.tableRow
                      : styles.tableRowAlt
                }
              >
                <Text style={styles.colYear}>{year.year}</Text>
                <Text style={styles.colGen}>{formatNumber(year.generation)}</Text>
                <Text style={styles.colSmp}>{formatNumber(year.smpRevenue)}</Text>
                <Text style={styles.colRec}>{formatNumber(year.recRevenue)}</Text>
                <Text style={styles.colRev}>
                  {formatNumber(year.totalRevenue)}
                </Text>
                <Text style={styles.colExp}>
                  {formatNumber(year.totalExpense)}
                </Text>
                <Text
                  style={[
                    styles.colNet,
                    year.netProfit >= 0
                      ? styles.positiveValue
                      : styles.negativeValue,
                  ]}
                >
                  {formatNumber(year.netProfit)}
                </Text>
                <Text
                  style={[
                    styles.colCum,
                    year.cumulative >= 0
                      ? styles.positiveValue
                      : styles.negativeValue,
                  ]}
                >
                  {formatNumber(year.cumulative)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 푸터 */}
        <Text style={styles.footer}>
          {company.name} | {company.address} | TEL: {company.phone}
        </Text>
        <Text style={styles.pageNumber}>1 / 2</Text>
      </Page>

      {/* 2페이지: 11~20년 + 면책조항 */}
      <Page size="A4" style={styles.page}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companySubtext}>수익분석 보고서</Text>
          </View>
          <View style={styles.headerRight}>
            <Text>견적번호: {quotation.quotationNumber}</Text>
            <Text>고객: {quotation.customerName}</Text>
          </View>
        </View>

        {/* 연도별 상세 (11~20년) */}
        <Text style={styles.subtitle}>연도별 수익 (11~20년)</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colYear}>년차</Text>
            <Text style={styles.colGen}>발전량(kWh)</Text>
            <Text style={styles.colSmp}>SMP수익</Text>
            <Text style={styles.colRec}>REC수익</Text>
            <Text style={styles.colRev}>총수익</Text>
            <Text style={styles.colExp}>총비용</Text>
            <Text style={styles.colNet}>순이익</Text>
            <Text style={styles.colCum}>누적</Text>
          </View>
          {yearlyData.slice(10, 20).map((year, idx) => (
            <View
              key={idx}
              style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            >
              <Text style={styles.colYear}>{year.year}</Text>
              <Text style={styles.colGen}>{formatNumber(year.generation)}</Text>
              <Text style={styles.colSmp}>{formatNumber(year.smpRevenue)}</Text>
              <Text style={styles.colRec}>{formatNumber(year.recRevenue)}</Text>
              <Text style={styles.colRev}>{formatNumber(year.totalRevenue)}</Text>
              <Text style={styles.colExp}>{formatNumber(year.totalExpense)}</Text>
              <Text
                style={[
                  styles.colNet,
                  year.netProfit >= 0
                    ? styles.positiveValue
                    : styles.negativeValue,
                ]}
              >
                {formatNumber(year.netProfit)}
              </Text>
              <Text
                style={[
                  styles.colCum,
                  year.cumulative >= 0
                    ? styles.positiveValue
                    : styles.negativeValue,
                ]}
              >
                {formatNumber(year.cumulative)}
              </Text>
            </View>
          ))}
        </View>

        {/* 20년 총계 */}
        <View
          style={{
            marginTop: 15,
            padding: 12,
            backgroundColor: "#dcfce7",
            borderRadius: 4,
          }}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ fontWeight: 700, color: "#166534" }}>
              20년 총 발전량
            </Text>
            <Text style={{ fontWeight: 700 }}>
              {formatNumber(
                yearlyData.reduce((sum, y) => sum + y.generation, 0)
              )}{" "}
              kWh
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 5,
            }}
          >
            <Text style={{ fontWeight: 700, color: "#166534" }}>
              20년 총 수익
            </Text>
            <Text style={{ fontWeight: 700 }}>
              {formatNumber(
                yearlyData.reduce((sum, y) => sum + y.totalRevenue, 0)
              )}{" "}
              원
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 5,
            }}
          >
            <Text style={{ fontWeight: 700, color: "#166534" }}>
              20년 순수익
            </Text>
            <Text
              style={[
                { fontWeight: 700, fontSize: 12 },
                analysis.totalProfit20y >= 0
                  ? styles.positiveValue
                  : styles.negativeValue,
              ]}
            >
              {formatNumber(analysis.totalProfit20y)} 원
            </Text>
          </View>
        </View>

        {/* 면책조항 */}
        <View style={styles.disclaimer}>
          <Text style={{ fontWeight: 700, marginBottom: 5 }}>안내사항</Text>
          <Text>
            1. 본 분석은 예상치이며, 실제 수익은 기상 조건, 전력 시장 상황,
            정부 정책 변화 등에 따라 달라질 수 있습니다.
          </Text>
          <Text style={{ marginTop: 3 }}>
            2. SMP(계통한계가격)와 REC(신재생에너지공급인증서) 가격은 시장
            상황에 따라 변동됩니다.
          </Text>
          <Text style={{ marginTop: 3 }}>
            3. 발전량은 설치 지역의 일조량, 모듈 설치 각도, 음영 등에 따라 달라질
            수 있습니다.
          </Text>
          <Text style={{ marginTop: 3 }}>
            4. 효율 저하율은 모듈 제조사 보증 기준이며, 실제 저하율은 다를 수
            있습니다.
          </Text>
          <Text style={{ marginTop: 3 }}>
            5. 본 분석 결과는 투자 결정의 참고자료이며, 투자에 대한 최종 결정은
            고객님의 판단에 따릅니다.
          </Text>
        </View>

        {/* 푸터 */}
        <Text style={styles.footer}>
          {company.name} | {company.address} | TEL: {company.phone} | EMAIL:{" "}
          {company.email}
        </Text>
        <Text style={styles.pageNumber}>2 / 2</Text>
      </Page>
    </Document>
  );
}
