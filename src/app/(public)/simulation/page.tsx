"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SimulationForm } from "@/components/simulation/SimulationForm";
import { Sun, ArrowRight, Phone, Mail, MapPin } from "lucide-react";

export default function SimulationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      {/* 헤더 */}
      <header className="py-4 px-4 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Sun className="h-8 w-8 text-yellow-500" />
            <span className="text-xl font-bold text-primary">JS Solar</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="hidden md:inline-flex">
              <Link href="/login">로그인</Link>
            </Button>
            <Button asChild>
              <Link href="/login">
                고객 포털
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="py-12 md:py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Sun className="h-4 w-4" />
            무료 수익 시뮬레이션
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
            태양광 발전소 <span className="text-primary">수익 시뮬레이션</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
            설치 용량과 투자 금액을 입력하면
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            <strong className="text-foreground">
              4가지 금융 모델별 20년간 예상 수익
            </strong>
            을 비교할 수 있습니다.
          </p>
        </div>
      </section>

      {/* 시뮬레이션 폼 */}
      <main className="max-w-6xl mx-auto px-4 pb-16">
        <SimulationForm />
      </main>

      {/* CTA 섹션 */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            더 정확한 분석이 필요하신가요?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            JS Solar와 계약하시면 현장 실사 기반의 맞춤형 견적서와 상세
            수익분석을 받아보실 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="font-semibold"
              asChild
            >
              <Link href="tel:070-0000-0000">
                <Phone className="h-4 w-4 mr-2" />
                전화 상담
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white hover:text-primary font-semibold"
              asChild
            >
              <Link href="mailto:contact@jssolar.co.kr">
                <Mail className="h-4 w-4 mr-2" />
                이메일 문의
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 장점 섹션 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-2xl font-bold text-center mb-12">
            JS Solar를 선택해야 하는 이유
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sun className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-lg mb-2">전문 시공 경험</h4>
              <p className="text-muted-foreground">
                500MW 이상의 시공 경험으로 안정적인 발전소 구축을 보장합니다.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h4 className="font-semibold text-lg mb-2">금융 지원</h4>
              <p className="text-muted-foreground">
                금융지원사업, 팩토링 등 다양한 금융 솔루션을 제공합니다.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="h-8 w-8 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h4 className="font-semibold text-lg mb-2">실시간 모니터링</h4>
              <p className="text-muted-foreground">
                고객 포털을 통해 발전량과 수익을 실시간으로 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sun className="h-6 w-6 text-yellow-500" />
                <span className="text-lg font-bold text-white">JS Solar</span>
              </div>
              <p className="text-sm opacity-75">
                태양광 발전소 전문 시공 및 관리
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-4">연락처</h5>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  070-0000-0000
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  contact@jssolar.co.kr
                </p>
              </div>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-4">주소</h5>
              <p className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                서울특별시 강남구 테헤란로 123
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm opacity-75">
            <p>&copy; 2024 JS Solar. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
