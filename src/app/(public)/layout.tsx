import { Metadata } from "next";

export const metadata: Metadata = {
  title: "JS Solar - 태양광 발전소 수익 시뮬레이션",
  description:
    "태양광 발전소 설치 전 4가지 금융 모델별 20년간 예상 수익을 비교해보세요.",
  keywords: [
    "태양광",
    "발전소",
    "수익분석",
    "시뮬레이션",
    "SMP",
    "REC",
    "금융지원사업",
    "팩토링",
  ],
  openGraph: {
    title: "JS Solar - 태양광 발전소 수익 시뮬레이션",
    description: "4가지 금융 모델별 20년간 예상 수익을 비교해보세요.",
    type: "website",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
