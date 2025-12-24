"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Zap,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { calculateDashboardProgress, DashboardProgress } from "@/lib/progress-utils";
import { differenceInDays, format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";

interface Task {
  id: string;
  name: string;
  phase: "PERMIT" | "CONSTRUCTION" | "COMPLETION" | "OTHER" | null;
  completedDate: string | null;
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
  items: ConstructionItem[];
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
  user: { name: string | null } | null;
}

interface Todo {
  id: string;
  title: string;
  dueDate: string | null;
}

interface Project {
  id: string;
  name: string;
  location: string | null;
  capacityKw: number | null;
  status: string;
  tasks: Task[];
  constructionPhases: ConstructionPhase[];
  activities: Activity[];
  todos: Todo[];
}

interface CompanyInfo {
  companyName: string;
  ceoName: string | null;
  phone: string | null;
}

interface ClientDashboardProps {
  projects: Project[];
  companyInfo: CompanyInfo | null;
  userId: string;
}

export function ClientDashboard({
  projects,
  companyInfo,
  userId,
}: ClientDashboardProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id || ""
  );

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || projects[0],
    [projects, selectedProjectId]
  );

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="p-8 text-center">
          <p className="text-lg text-muted-foreground">
            참여 중인 프로젝트가 없습니다.
          </p>
        </Card>
      </div>
    );
  }

  // 진행률 계산
  const allTasks = selectedProject.tasks.flatMap((task) => [
    { phase: task.phase || "PERMIT", completedDate: task.completedDate ? new Date(task.completedDate) : null },
    ...task.children.map((child) => ({
      phase: child.phase || "PERMIT",
      completedDate: child.completedDate ? new Date(child.completedDate) : null,
    })),
  ]) as { phase: "PERMIT" | "CONSTRUCTION" | "COMPLETION" | "OTHER"; completedDate: Date | null }[];

  const allConstructionItems = selectedProject.constructionPhases.flatMap(
    (phase) =>
      phase.items.map((item) => ({
        status: item.status,
        progress: item.progress,
      }))
  );

  const progressInfo = calculateDashboardProgress(allTasks, allConstructionItems);

  // 다가오는 일정 (오늘 이후 시작일 기준)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingSchedules = selectedProject.constructionPhases
    .flatMap((phase) =>
      phase.items
        .filter((item) => item.startDate && new Date(item.startDate) >= today)
        .map((item) => ({
          ...item,
          phaseName: phase.name,
        }))
    )
    .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-4 pb-8">
      {/* 프로젝트 선택 (여러 개일 때만) */}
      {projects.length > 1 && (
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-full h-12 text-base">
            <SelectValue placeholder="프로젝트 선택" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* A: 프로젝트 상태 카드 */}
      <ProjectStatusCard
        project={selectedProject}
        progress={progressInfo}
      />

      {/* B: 사업주 할 일 */}
      <TodosCard todos={selectedProject.todos} projectId={selectedProject.id} />

      {/* C: 다가오는 일정 */}
      <UpcomingScheduleCard schedules={upcomingSchedules} projectId={selectedProject.id} />

      {/* D: 최근 소식 */}
      <RecentActivitiesCard
        activities={selectedProject.activities}
        projectId={selectedProject.id}
      />

      {/* E: 담당자 연락 */}
      <ContactCard companyInfo={companyInfo} />
    </div>
  );
}

// A: 프로젝트 상태 카드
function ProjectStatusCard({
  project,
  progress,
}: {
  project: Project;
  progress: DashboardProgress;
}) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* 프로젝트명 */}
        <div>
          <h2 className="text-xl font-bold">{project.name}</h2>
          <div className="flex items-center gap-3 mt-1 text-muted-foreground">
            {project.capacityKw && (
              <span className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                {project.capacityKw.toLocaleString()} kW
              </span>
            )}
            {project.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {project.location}
              </span>
            )}
          </div>
        </div>

        {/* 진행률 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">전체 진행률</span>
            <span className="text-lg font-bold">{progress.totalProgress}%</span>
          </div>
          <Progress value={progress.totalProgress} className="h-3" />
        </div>

        {/* 단계 표시 */}
        <div className="flex items-center justify-between text-sm">
          <PhaseIndicator
            label="인허가"
            isCompleted={progress.permit.percent >= 100}
            isCurrent={progress.currentPhase === "PERMIT"}
          />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <PhaseIndicator
            label="시공"
            isCompleted={progress.construction.percent >= 100}
            isCurrent={progress.currentPhase === "CONSTRUCTION"}
          />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <PhaseIndicator
            label="준공"
            isCompleted={progress.completion.percent >= 100}
            isCurrent={progress.currentPhase === "COMPLETION"}
          />
        </div>

        {/* 상태 배지 */}
        <div className="flex justify-end">
          {progress.isDelayed ? (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              <AlertTriangle className="h-4 w-4 mr-1" />
              지연
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-sm px-3 py-1 bg-green-100 text-green-700">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              정상
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 단계 표시 컴포넌트
function PhaseIndicator({
  label,
  isCompleted,
  isCurrent,
}: {
  label: string;
  isCompleted: boolean;
  isCurrent: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1 px-3 py-1 rounded-full ${
        isCurrent
          ? "bg-primary text-primary-foreground"
          : isCompleted
          ? "bg-green-100 text-green-700"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {isCompleted && <CheckCircle2 className="h-3 w-3" />}
      <span className="font-medium">{label}</span>
    </div>
  );
}

// B: 사업주 할 일 카드
function TodosCard({ todos, projectId }: { todos: Todo[]; projectId: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          사업주 할 일
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todos.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <p className="text-lg font-medium text-green-700">
              지금은 할 일이 없습니다!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <span className="font-medium">{todo.title}</span>
                {todo.dueDate && (
                  <span className="text-sm text-muted-foreground">
                    {formatDueDate(todo.dueDate)}
                  </span>
                )}
              </div>
            ))}
            <Button variant="ghost" className="w-full" asChild>
              <Link href={`/projects/${projectId}?tab=tasks`}>
                전체 보기
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// C: 다가오는 일정 카드
function UpcomingScheduleCard({
  schedules,
  projectId,
}: {
  schedules: (ConstructionItem & { phaseName: string })[];
  projectId: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          다가오는 일정
        </CardTitle>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">
            예정된 일정이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-medium">{schedule.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {schedule.phaseName}
                  </p>
                </div>
                <Badge variant="outline" className="text-sm">
                  {formatDDay(schedule.startDate!)}
                </Badge>
              </div>
            ))}
            <Button variant="ghost" className="w-full" asChild>
              <Link href={`/projects/${projectId}?tab=construction`}>
                공정표 보기
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// D: 최근 소식 카드
function RecentActivitiesCard({
  activities,
  projectId,
}: {
  activities: Activity[];
  projectId: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-5 w-5" />
          최근 소식
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">
            최근 소식이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-medium">{activity.title}</p>
                  {activity.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {activity.description}
                    </p>
                  )}
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap ml-2">
                  {formatRelativeDate(activity.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// E: 담당자 연락 카드
function ContactCard({ companyInfo }: { companyInfo: CompanyInfo | null }) {
  if (!companyInfo?.phone) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="h-5 w-5" />
          담당자 연락
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{companyInfo.companyName}</p>
            {companyInfo.ceoName && (
              <p className="text-sm text-muted-foreground">
                {companyInfo.ceoName} 대표
              </p>
            )}
          </div>
          <Button size="lg" className="h-12 px-6" asChild>
            <a href={`tel:${companyInfo.phone}`}>
              <Phone className="h-5 w-5 mr-2" />
              전화하기
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// 유틸리티 함수들
function formatDDay(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diff = differenceInDays(date, today);

  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === 2) return "모레";
  if (diff <= 7) return `${diff}일 후`;
  return format(date, "M/d", { locale: ko });
}

function formatDueDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diff = differenceInDays(date, today);

  if (diff < 0) return `${Math.abs(diff)}일 지남`;
  if (diff === 0) return "오늘까지";
  if (diff === 1) return "내일까지";
  return `${diff}일 남음`;
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const diffMs = today.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays <= 7) return `${diffDays}일 전`;
  return format(date, "M/d", { locale: ko });
}
