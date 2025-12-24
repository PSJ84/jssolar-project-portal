import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// 한글 폰트 등록 (Google Fonts static CDN - TTF 형식)
Font.register({
  family: "NotoSansKR",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuozHrTq8H4hfeE.ttf",
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
    marginBottom: 20,
    borderBottom: "2px solid #2563eb",
    paddingBottom: 15,
  },
  logoSection: {
    flexDirection: "column",
  },
  companyName: {
    fontSize: 20,
    fontWeight: 700,
    color: "#2563eb",
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
    fontSize: 24,
    fontWeight: 700,
    textAlign: "center",
    marginVertical: 20,
    letterSpacing: 8,
  },
  projectName: {
    fontSize: 12,
    fontWeight: 500,
    textAlign: "center",
    marginBottom: 15,
    color: "#374151",
  },
  infoSection: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 10,
  },
  infoBox: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 8,
    color: "#1e40af",
    borderBottom: "1px solid #ddd",
    paddingBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  infoLabel: {
    width: 70,
    color: "#666",
  },
  infoValue: {
    flex: 1,
    fontWeight: 500,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e40af",
    color: "#fff",
    padding: 8,
    fontWeight: 700,
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e5e7eb",
    padding: 6,
    fontSize: 8,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottom: "1px solid #e5e7eb",
    padding: 6,
    fontSize: 8,
    backgroundColor: "#f9fafb",
  },
  col1: { width: "6%", textAlign: "center" },
  col2: { width: "34%" },
  col3: { width: "8%", textAlign: "center" },
  col4: { width: "10%", textAlign: "right" },
  col5: { width: "14%", textAlign: "right" },
  col6: { width: "14%", textAlign: "right" },
  col7: { width: "14%" },
  totalSection: {
    marginTop: 20,
    borderTop: "2px solid #1e40af",
    paddingTop: 15,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 6,
    paddingHorizontal: 10,
  },
  totalLabel: {
    width: 100,
    textAlign: "right",
    marginRight: 20,
    fontSize: 10,
  },
  totalValue: {
    width: 120,
    textAlign: "right",
    fontSize: 10,
    fontWeight: 700,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTop: "1px solid #ddd",
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 700,
    marginRight: 20,
    color: "#1e40af",
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1e40af",
  },
  notesSection: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 6,
    color: "#374151",
  },
  notesText: {
    fontSize: 8,
    color: "#4b5563",
    lineHeight: 1.5,
  },
  validitySection: {
    marginTop: 25,
    padding: 10,
    backgroundColor: "#fef3c7",
    borderRadius: 4,
  },
  validityText: {
    fontSize: 9,
    color: "#92400e",
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
  stampArea: {
    position: "absolute",
    right: 60,
    bottom: 100,
    width: 80,
    height: 80,
    borderRadius: 40,
    border: "2px solid #dc2626",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.7,
  },
  stampText: {
    fontSize: 12,
    fontWeight: 700,
    color: "#dc2626",
    textAlign: "center",
  },
});

export interface QuotationPdfData {
  quotationNumber: string;
  customerName: string;
  customerAddress?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  address?: string | null;
  projectName?: string | null;
  items: Array<{
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    note?: string | null;
  }>;
  subtotal: number;
  roundingAmount: number;
  totalAmount: number;
  vatAmount: number;
  grandTotal: number;
  vatIncluded: boolean;
  specialNotes?: string | null;
  validUntil: Date | string | null;
  quotationDate: Date | string;
}

export interface CompanyInfo {
  name: string;
  ceo: string;
  address: string;
  phone: string;
  email: string;
  businessNumber: string;
}

interface QuotationPdfProps {
  quotation: QuotationPdfData;
  company: CompanyInfo;
}

export function QuotationPdf({ quotation, company }: QuotationPdfProps) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("ko-KR");
  };

  return (
    <Document>
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
            <Text>작성일: {formatDate(quotation.quotationDate)}</Text>
          </View>
        </View>

        {/* 제목 */}
        <Text style={styles.title}>견 적 서</Text>

        {/* 건명 */}
        {quotation.projectName && (
          <Text style={styles.projectName}>건명: {quotation.projectName}</Text>
        )}

        {/* 정보 섹션 */}
        <View style={styles.infoSection}>
          {/* 공급받는자 */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>공급받는자</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>상호</Text>
              <Text style={styles.infoValue}>{quotation.customerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>주소</Text>
              <Text style={styles.infoValue}>
                {quotation.customerAddress || quotation.address || "-"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>연락처</Text>
              <Text style={styles.infoValue}>
                {quotation.customerPhone || "-"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>이메일</Text>
              <Text style={styles.infoValue}>
                {quotation.customerEmail || "-"}
              </Text>
            </View>
          </View>

          {/* 공급자 */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>공급자</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>상호</Text>
              <Text style={styles.infoValue}>{company.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>대표자</Text>
              <Text style={styles.infoValue}>{company.ceo}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>사업자번호</Text>
              <Text style={styles.infoValue}>{company.businessNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>주소</Text>
              <Text style={styles.infoValue}>{company.address}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>연락처</Text>
              <Text style={styles.infoValue}>{company.phone}</Text>
            </View>
          </View>
        </View>

        {/* 견적 테이블 */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>NO</Text>
            <Text style={styles.col2}>품명 및 규격</Text>
            <Text style={styles.col3}>단위</Text>
            <Text style={styles.col4}>수량</Text>
            <Text style={styles.col5}>단가</Text>
            <Text style={styles.col6}>금액</Text>
            <Text style={styles.col7}>비고</Text>
          </View>
          {quotation.items.map((item, index) => (
            <View
              key={index}
              style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            >
              <Text style={styles.col1}>{index + 1}</Text>
              <Text style={styles.col2}>{item.name}</Text>
              <Text style={styles.col3}>{item.unit}</Text>
              <Text style={styles.col4}>{item.quantity.toLocaleString()}</Text>
              <Text style={styles.col5}>{formatNumber(item.unitPrice)}</Text>
              <Text style={styles.col6}>{formatNumber(item.amount)}</Text>
              <Text style={styles.col7}>{item.note || ""}</Text>
            </View>
          ))}
        </View>

        {/* 합계 */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>소계</Text>
            <Text style={styles.totalValue}>
              {formatNumber(quotation.subtotal)}원
            </Text>
          </View>
          {quotation.roundingAmount !== 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>잔액정리</Text>
              <Text style={styles.totalValue}>
                {formatNumber(quotation.roundingAmount)}원
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>공급가액</Text>
            <Text style={styles.totalValue}>
              {formatNumber(quotation.totalAmount)}원
            </Text>
          </View>
          {!quotation.vatIncluded && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>부가세 (10%)</Text>
              <Text style={styles.totalValue}>
                {formatNumber(quotation.vatAmount)}원
              </Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>합계금액</Text>
            <Text style={styles.grandTotalValue}>
              {formatNumber(quotation.grandTotal)}원
            </Text>
          </View>
        </View>

        {/* 특기사항 */}
        {quotation.specialNotes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>특기사항</Text>
            <Text style={styles.notesText}>{quotation.specialNotes}</Text>
          </View>
        )}

        {/* 유효기간 */}
        <View style={styles.validitySection}>
          {quotation.validUntil && (
            <Text style={styles.validityText}>
              ※ 본 견적서의 유효기간: {formatDate(quotation.validUntil)}까지
            </Text>
          )}
          <Text style={styles.validityText}>
            ※ 상기 금액은 부가세 {quotation.vatIncluded ? "포함" : "별도"} 금액이며, 현장 상황에 따라 변동될 수 있습니다.
          </Text>
        </View>

        {/* 직인 */}
        <View style={styles.stampArea}>
          <Text style={styles.stampText}>{company.name}</Text>
          <Text style={[styles.stampText, { fontSize: 8 }]}>직인</Text>
        </View>

        {/* 푸터 */}
        <Text style={styles.footer}>
          {company.name} | {company.address} | TEL: {company.phone} | EMAIL:{" "}
          {company.email}
        </Text>
      </Page>
    </Document>
  );
}
