"use client";

import { Button } from "@/components/ui/button";
import {
  Zap,
  Phone,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Task {
  id: string;
  name: string;
  phase: "PERMIT" | "CONSTRUCTION" | "COMPLETION" | "OTHER" | null;
  completedDate: string | null;
  isActive: boolean;
  children: {
    phase: "PERMIT" | "CONSTRUCTION" | "COMPLETION" | "OTHER" | null;
    completedDate: string | null;
  }[];
}

interface ConstructionItem {
  id: string;
  name: string;
  startDate: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
  progress: number;
}

interface ConstructionPhase {
  id: string;
  name: string;
  weight: number;  // 가중치 (%, 0~100)
  items: ConstructionItem[];
}

interface Todo {
  id: string;
  title: string;
  dueDate: string | null;
  completedDate: string | null;
}

function getTodoStatus(todo: Todo): { label: string; className: string } {
  if (todo.completedDate) {
    return { label: "완료", className: "bg-green-100 text-green-700" };
  }
  if (todo.dueDate && new Date(todo.dueDate) < new Date()) {
    return { label: "지연", className: "bg-red-100 text-red-700" };
  }
  return { label: "대기", className: "bg-zinc-100 text-zinc-600" };
}

interface Project {
  id: string;
  name: string;
  location: string | null;
  capacityKw: number | null;
}

interface CompanyInfo {
  companyName: string;
  ceoName: string | null;
  phone: string | null;
}

interface ProjectHomeTabProps {
  project: Project;
  tasks: Task[];
  constructionPhases: ConstructionPhase[];
  activities: unknown[];
  todos: Todo[];
  companyInfo: CompanyInfo | null;
}

export function ProjectHomeTab({
  project,
  tasks,
  constructionPhases,
  todos,
  companyInfo,
}: ProjectHomeTabProps) {
  // 인허가 진행률 계산: 대단계(parentId === null)만 계산, 숨김 항목 제외
  // tasks 배열이 대단계이고 children이 하위 태스크
  const visibleTasks = tasks.filter((t) => t.isActive !== false);
  const completedMainTasks = visibleTasks.filter((t) => t.completedDate !== null).length;
  const totalMainTasks = visibleTasks.length;
  const permitProgress = totalMainTasks > 0 ? Math.round((completedMainTasks / totalMainTasks) * 100) : 0;

  // 시공 진행률 계산: 가중치 × 세부공정 진행률 평균
  const calculateConstructionProgress = () => {
    let totalProgress = 0;
    let totalWeight = 0;

    constructionPhases.forEach(phase => {
      const weight = phase.weight || 0;
      if (weight === 0) return;

      // 세부공정 진행률 평균 (status가 아닌 progress 필드 사용)
      const items = phase.items || [];
      const avgProgress = items.length > 0
        ? items.reduce((sum, item) => sum + (item.progress || 0), 0) / items.length
        : 0;

      totalProgress += avgProgress * (weight / 100);
      totalWeight += weight;
    });

    // 가중치 합계가 100이 아닐 경우 비례 계산
    if (totalWeight > 0 && totalWeight !== 100) {
      totalProgress = totalProgress * (100 / totalWeight);
    }

    return Math.round(totalProgress);
  };

  const constructionProgress = calculateConstructionProgress();

  // 전체 진행률: (인허가 × 0.5) + (시공 × 0.5)
  const totalProgress = Math.round((permitProgress * 0.5) + (constructionProgress * 0.5));

  // 다가오는 일정 (오늘 이후 시작일 기준) - 1개만
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextSchedule = constructionPhases
    .flatMap((phase) =>
      phase.items
        .filter((item) => item.startDate && new Date(item.startDate) >= today)
        .map((item) => ({
          ...item,
          phaseName: phase.name,
        }))
    )
    .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())[0];

  return (
    <div className="min-h-screen bg-zinc-50/50 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* 상태 Hero Card */}
          <div className="col-span-1 md:col-span-2 md:row-span-2 rounded-3xl bg-white p-6 md:p-8 border border-zinc-100 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center gap-2 mb-6">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium text-zinc-500">프로젝트 현황</span>
            </div>

            {/* 원형 프로그레스 영역 */}
            <div className="flex-1 flex items-center justify-center gap-8 md:gap-12">
              {/* 인허가 링 */}
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 md:w-28 md:h-28">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="50%" cy="50%" r="45%"
                      fill="none"
                      stroke="#f4f4f5"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50%" cy="50%" r="45%"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      strokeDasharray={`${permitProgress * 2.83} 283`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl md:text-2xl font-bold text-zinc-900">{permitProgress}%</span>
                  </div>
                </div>
                <span className="text-sm text-zinc-500 mt-2">인허가</span>
                <span className="text-xs text-zinc-400">{completedMainTasks}/{totalMainTasks}</span>
              </div>

              {/* 시공 링 */}
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 md:w-28 md:h-28">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="50%" cy="50%" r="45%"
                      fill="none"
                      stroke="#f4f4f5"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50%" cy="50%" r="45%"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="8"
                      strokeDasharray={`${constructionProgress * 2.83} 283`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl md:text-2xl font-bold text-zinc-900">{constructionProgress}%</span>
                  </div>
                </div>
                <span className="text-sm text-zinc-500 mt-2">시공</span>
              </div>
            </div>

            {/* 전체 진행률 - 하단 바 */}
            <div className="pt-4 border-t border-zinc-100 mt-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-900">전체 진행률</span>
                <span className="text-2xl font-bold text-zinc-900">{totalProgress}%</span>
              </div>
              <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 rounded-full transition-all duration-500"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* 할 일 카드 - Bold Minimalist */}
          {todos.length > 0 ? (
            <div className="col-span-1 rounded-3xl bg-white p-6 border-2 border-zinc-900 flex flex-col min-h-[160px] hover:shadow-lg transition-shadow">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-zinc-900" />
                  <span className="text-sm font-bold text-zinc-900">사업주 할 일</span>
                </div>
                <span className="text-xs bg-zinc-900 text-white px-2 py-0.5 rounded-full">
                  {todos.filter(t => !t.completedDate).length}개
                </span>
              </div>

              {/* 할 일 목록 (최대 5개) */}
              <div className="flex flex-col gap-2 flex-1">
                {todos.slice(0, 5).map((todo) => {
                  const status = getTodoStatus(todo);
                  return (
                    <div
                      key={todo.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-100"
                    >
                      <span className="text-sm font-medium text-zinc-900 truncate flex-1">
                        {todo.title}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {todo.dueDate && (
                          <span className="text-xs text-zinc-400">
                            {format(new Date(todo.dueDate), "M/d")}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 5개 초과 시 안내 */}
              {todos.length > 5 && (
                <p className="text-xs text-zinc-400 mt-2">외 {todos.length - 5}개</p>
              )}
            </div>
          ) : (
            <div className="col-span-1 rounded-3xl bg-white p-6 border-2 border-emerald-500 flex flex-col justify-center items-center min-h-[160px]">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              <h3 className="text-xl font-bold text-emerald-600">할 일이 없습니다</h3>
            </div>
          )}

          {/* 다음 일정 카드 */}
          <div className="col-span-1 rounded-3xl bg-white p-6 border border-zinc-100 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-center gap-2 text-zinc-500">
              <Calendar className="h-5 w-5" />
              <span className="text-sm font-medium">다음 일정</span>
            </div>
            {nextSchedule ? (
              <div className="mt-4">
                <p className="text-2xl font-bold text-zinc-900 mb-2">
                  {formatScheduleDate(new Date(nextSchedule.startDate!))}
                </p>
                <p className="text-zinc-500">{nextSchedule.name}</p>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-zinc-400">예정된 일정이 없습니다</p>
              </div>
            )}
          </div>

          {/* 담당자 카드 - 정사각형 */}
          {companyInfo?.phone && (
            <div className="col-span-1 rounded-3xl bg-zinc-50 p-6 border border-zinc-100 flex flex-col justify-between min-h-[160px]">
              {/* 상단: 아바타 + 이름 */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-zinc-500" />
                </div>
                <div>
                  <div className="font-bold text-zinc-900">
                    {companyInfo.ceoName || companyInfo.companyName}
                  </div>
                  <div className="text-xs text-zinc-500">담당자</div>
                </div>
              </div>

              {/* 하단: 전화 버튼 */}
              <Button
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl mt-4"
                asChild
              >
                <a href={`tel:${companyInfo.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  전화하기
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 날짜 포맷 함수 - "내일 (12월 26일 목요일)" 형식
function formatScheduleDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const dateStr = format(date, 'M월 d일 EEEE', { locale: ko });

  if (diffDays === 0) return `오늘 (${dateStr})`;
  if (diffDays === 1) return `내일 (${dateStr})`;
  if (diffDays === -1) return `어제 (${dateStr})`;
  if (diffDays > 0) return `D-${diffDays} (${dateStr})`;
  return dateStr;
}
