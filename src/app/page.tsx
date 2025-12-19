import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sun,
  FileCheck,
  HardHat,
  Wrench,
  Eye,
  Users,
  Clock,
  HeadphonesIcon,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Menu,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Sun className="h-8 w-8 text-solar-500" />
              <span className="text-xl font-bold text-gray-900">JSSolar</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#services" className="text-gray-600 hover:text-gray-900 transition-colors">
                서비스
              </a>
              <a href="#why-us" className="text-gray-600 hover:text-gray-900 transition-colors">
                회사소개
              </a>
              <a href="#portal" className="text-gray-600 hover:text-gray-900 transition-colors">
                고객 포털
              </a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">
                연락처
              </a>
            </nav>

            {/* CTA Button */}
            <div className="flex items-center gap-4">
              <Button asChild className="bg-solar-500 hover:bg-solar-600 text-white">
                <Link href="/login">고객 포털</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-solar-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Sun className="h-16 w-16 text-solar-500" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            신뢰할 수 있는 태양광 파트너
            <br />
            <span className="text-solar-500">JS Solar</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            전문적인 태양광 발전소 설계 및 시공으로
            <br className="hidden sm:block" />
            지속 가능한 에너지의 미래를 만들어갑니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-solar-500 hover:bg-solar-600 text-white px-8">
              <Link href="/login">
                고객 포털 로그인
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8">
              <a href="#contact">상담 문의</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">서비스</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              태양광 발전소의 기획부터 시공, 유지보수까지 원스톱 서비스를 제공합니다.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-solar-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sun className="h-7 w-7 text-solar-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">태양광 발전소 설계</h3>
                <p className="text-gray-600 text-sm">
                  현장 조건에 최적화된 효율적인 발전소 설계
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-solar-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="h-7 w-7 text-solar-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">인허가 대행</h3>
                <p className="text-gray-600 text-sm">
                  발전사업허가, 개발행위허가 등 모든 인허가 절차 대행
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-solar-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HardHat className="h-7 w-7 text-solar-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">시공 및 감리</h3>
                <p className="text-gray-600 text-sm">
                  전문 인력에 의한 안전하고 품질 높은 시공
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-solar-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wrench className="h-7 w-7 text-solar-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">유지보수</h3>
                <p className="text-gray-600 text-sm">
                  정기 점검 및 신속한 A/S로 안정적인 발전량 유지
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section id="why-us" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              왜 JS Solar인가?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              고객 만족을 최우선으로 생각하는 JS Solar만의 차별화된 서비스
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-solar-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">투명한 진행 과정</h3>
              <p className="text-gray-600 text-sm">
                고객 포털을 통해 실시간으로 프로젝트 진행 상황을 확인할 수 있습니다.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-solar-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">전문 인력</h3>
              <p className="text-gray-600 text-sm">
                풍부한 경험과 전문 자격을 갖춘 엔지니어가 함께합니다.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-solar-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">신속한 인허가</h3>
              <p className="text-gray-600 text-sm">
                체계적인 프로세스로 인허가 기간을 단축합니다.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-solar-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <HeadphonesIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">사후 관리</h3>
              <p className="text-gray-600 text-sm">
                준공 후에도 지속적인 관리와 지원을 약속합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Portal Section */}
      <section id="portal" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                고객 포털 서비스
              </h2>
              <p className="text-gray-600 mb-8">
                JS Solar 고객 포털에서 내 프로젝트의 모든 것을 확인하세요.
                언제 어디서나 실시간으로 진행 상황을 파악할 수 있습니다.
              </p>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-solar-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ChevronRight className="h-4 w-4 text-solar-600" />
                  </div>
                  <div>
                    <p className="font-medium">실시간 진행 현황</p>
                    <p className="text-sm text-gray-600">각 단계별 진행 상태를 한눈에 확인</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-solar-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ChevronRight className="h-4 w-4 text-solar-600" />
                  </div>
                  <div>
                    <p className="font-medium">문서 열람</p>
                    <p className="text-sm text-gray-600">계약서, 인허가 서류, 도면 등 모든 문서 확인</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-solar-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ChevronRight className="h-4 w-4 text-solar-600" />
                  </div>
                  <div>
                    <p className="font-medium">알림 서비스</p>
                    <p className="text-sm text-gray-600">중요 일정 및 상태 변경 시 즉시 알림</p>
                  </div>
                </li>
              </ul>

              <Button asChild className="bg-solar-500 hover:bg-solar-600 text-white">
                <Link href="/login">
                  포털 로그인
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="bg-gray-100 rounded-2xl p-8 lg:p-12">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Sun className="h-8 w-8 text-solar-500" />
                  <span className="font-bold text-lg">JSSolar 고객 포털</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">프로젝트 진행률</span>
                      <span className="text-solar-500 font-bold">75%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-solar-500 h-2 rounded-full" style={{ width: "75%" }}></div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">현재 단계</p>
                    <p className="font-medium">시공 진행중</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">등록 문서</p>
                    <p className="font-medium">12개</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">연락처</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              태양광 발전소 설치에 관한 문의사항이 있으시면 언제든 연락주세요.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-solar-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">전화</h3>
                <p className="text-gray-400">추후 입력 예정</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-solar-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">이메일</h3>
                <p className="text-gray-400">추후 입력 예정</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-solar-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">주소</h3>
                <p className="text-gray-400">추후 입력 예정</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sun className="h-6 w-6 text-solar-500" />
              <span className="font-bold">JSSolar</span>
            </div>
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} JS Solar. All rights reserved.
            </p>
            <Link
              href="/login"
              className="text-solar-400 hover:text-solar-300 text-sm transition-colors"
            >
              고객 포털 로그인
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
