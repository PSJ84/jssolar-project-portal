import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ProjectStatus, ChecklistStatus } from "@prisma/client";
import { MapPin, Zap, Calendar, ArrowLeft, Users, Clock, CheckCircle2, AlertTriangle, ListTodo, ClipboardList, DollarSign, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MemberManagement } from "@/components/project/member-management";
import { DocumentManagement } from "@/components/project/document-management";
import { ProjectOverviewEdit } from "@/components/project/project-overview-edit";
import { TaskListV2 } from "@/components/tasks/TaskListV2";
import { TodoList } from "@/components/todos/TodoList";
import { ProjectBudgetSection } from "@/components/budget/ProjectBudgetSection";
import { ProjectQuotationList } from "@/components/quotation/ProjectQuotationList";
import { calculateWeightedProgress } from "@/lib/progress-utils";
import { ConstructionScheduleEditor } from "@/components/construction/ConstructionScheduleEditor";
import { ConstructionChart } from "@/components/construction/ConstructionChart";

const statusLabels: Record<ProjectStatus, string> = {
  ACTIVE: "진행중",
  COMPLETED: "완료",
  ARCHIVED: "보관",
};


function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR");
}

export default async function AdminProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: initialTab } = await searchParams;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      documents: {
        include: {
          currentVersion: {
            include: {
              uploadedBy: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { title: "asc" },
      },
      activities: {
        include: {
          user: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      projectTasks: {
        orderBy: { displayOrder: "asc" },
      },
      // Phase 2 Task (가중치 진행률 계산용 phase 포함)
      tasks: {
        where: { parentId: null },
        include: {
          children: {
            orderBy: { sortOrder: "asc" },
            include: {
              checklists: {
                select: { status: true },
              },
            },
          },
          checklists: {
            select: { status: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      // Todos - 미리 로드하여 탭 전환 시 로딩 최적화
      todos: {
        include: {
          assignee: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          completedBy: { select: { id: true, name: true } },
        },
        orderBy: [
          { completedDate: "asc" },
          { dueDate: "asc" },
        ],
      },
      // 공정표
      constructionPhases: {
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Get all CLIENT users for member selection
  const availableUsers = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      NOT: {
        id: {
          in: project.members.map(m => m.userId).filter((id): id is string => id !== null),
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: "asc" },
  });

  // ADMIN/SUPER_ADMIN 사용자 조회 (할 일 담당자용)
  const adminUsers = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
      organizationId: project.organizationId,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-2">
        <Link href="/admin/projects">
          <ArrowLeft className="h-4 w-4 mr-2" />
          프로젝트 목록
        </Link>
      </Button>

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl md:text-3xl font-bold">{project.name}</h1>
          <Button variant="outline" size="sm" asChild>
            <a href={`/projects/${project.id}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              사업주 화면
            </a>
          </Button>
        </div>
        <div className="flex items-center gap-2 md:gap-4 mt-2 flex-wrap text-sm">
          {project.location && (
            <div className="flex items-center text-muted-foreground">
              <MapPin className="h-4 w-4 mr-1" />
              {project.location}
            </div>
          )}
          {project.capacityKw && (
            <div className="flex items-center text-muted-foreground">
              <Zap className="h-4 w-4 mr-1" />
              {project.capacityKw.toLocaleString()} kW
            </div>
          )}
          <div className="flex items-center text-muted-foreground">
            <Calendar className="h-4 w-4 mr-1" />
            {new Date(project.createdAt).toLocaleDateString("ko-KR")}
          </div>
        </div>
      </div>

      {/* 요약 바 - 컴팩트한 한 줄 */}
      {(() => {
        // 태스크 통계 계산
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeTasks = project.tasks.filter(t => t.isActive);
        const allChildTasks = activeTasks.flatMap(t => t.children.filter(c => c.isActive));
        const totalTasks = allChildTasks.length;
        const completedTasks = allChildTasks.filter(c => c.completedDate !== null).length;

        // 진행중: startDate가 오늘 이하이고 미완료
        const inProgressTasks = allChildTasks.filter(c => {
          if (c.completedDate) return false;
          if (!c.startDate) return false;
          const start = new Date(c.startDate);
          start.setHours(0, 0, 0, 0);
          return start <= today;
        }).length;

        // 대기: startDate 없거나 미래
        const waitingTasks = allChildTasks.filter(c => {
          if (c.completedDate) return false;
          if (!c.startDate) return true;
          const start = new Date(c.startDate);
          start.setHours(0, 0, 0, 0);
          return start > today;
        }).length;
        const overdueTasks = allChildTasks.filter(c => {
          if (c.completedDate) return false;
          if (!c.dueDate) return false;
          const due = new Date(c.dueDate);
          due.setHours(0, 0, 0, 0);
          return due < today;
        }).length;

        // 가중치 기반 진행률 계산
        const progressPercent = totalTasks > 0
          ? calculateWeightedProgress(allChildTasks.map(c => ({ phase: c.phase, completedDate: c.completedDate })))
          : 0;

        return (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border">
            {/* 진행률 */}
            <div className="flex items-center gap-2 min-w-[120px]">
              <Progress value={progressPercent} className="h-2 w-16" />
              <span className="text-sm font-medium">{progressPercent}%</span>
              <span className="text-xs text-muted-foreground">({completedTasks}/{totalTasks})</span>
            </div>

            <span className="text-muted-foreground">·</span>

            {/* 상태별 카운트 */}
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                완료 {completedTasks}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-yellow-500" />
                진행 {inProgressTasks}
              </span>
              <span className="flex items-center gap-1">
                <ListTodo className="h-3.5 w-3.5 text-gray-400" />
                대기 {waitingTasks}
              </span>
              {overdueTasks > 0 && (
                <span className="flex items-center gap-1 text-destructive font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  지연 {overdueTasks}
                </span>
              )}
            </div>

            <span className="text-muted-foreground">·</span>

            {/* 상태 배지 */}
            <Badge
              variant={
                project.status === "ACTIVE"
                  ? "default"
                  : project.status === "COMPLETED"
                  ? "secondary"
                  : "outline"
              }
              className="text-xs"
            >
              {statusLabels[project.status]}
            </Badge>

            {/* 멤버 */}
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {project.members.length}명
            </span>
          </div>
        );
      })()}

      {/* Tabs - URL의 tab 파라미터 또는 진행 단계가 기본 선택 */}
      <Tabs defaultValue={initialTab || "tasks"} className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto scrollbar-hide h-auto gap-1">
          <TabsTrigger value="tasks" className="flex-shrink-0">진행 단계</TabsTrigger>
          <TabsTrigger value="construction" className="flex-shrink-0">공정표</TabsTrigger>
          <TabsTrigger value="todos" className="flex-shrink-0">할 일</TabsTrigger>
          <TabsTrigger value="quotations" className="flex-shrink-0">견적서</TabsTrigger>
          <TabsTrigger value="budget" className="flex-shrink-0">예산</TabsTrigger>
          <TabsTrigger value="overview" className="flex-shrink-0">개요</TabsTrigger>
          <TabsTrigger value="documents" className="flex-shrink-0">
            문서 ({project.documents.length})
          </TabsTrigger>
          <TabsTrigger value="members" className="flex-shrink-0">
            멤버 ({project.members.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-shrink-0">활동</TabsTrigger>
        </TabsList>

        {/* 진행 단계 탭 */}
        <TabsContent value="tasks" className="space-y-4">
          <TaskListV2
            projectId={project.id}
            tasks={project.tasks.map((task) => {
              const getChecklistCount = (checklists: { status: ChecklistStatus }[]) => ({
                total: checklists.length,
                checked: checklists.filter((c) => c.status === ChecklistStatus.COMPLETED).length,
              });
              return {
                id: task.id,
                name: task.name,
                sortOrder: task.sortOrder,
                isActive: task.isActive,
                startDate: task.startDate?.toISOString() ?? null,
                dueDate: task.dueDate?.toISOString() ?? null,
                completedDate: task.completedDate?.toISOString() ?? null,
                version: task.version,
                originTemplateTaskId: task.originTemplateTaskId,
                checklistCount: getChecklistCount(task.checklists),
                isPermitTask: task.isPermitTask,
                processingDays: task.processingDays,
                submittedDate: task.submittedDate?.toISOString() ?? null,
                children: task.children.map((child) => ({
                  id: child.id,
                  name: child.name,
                  sortOrder: child.sortOrder,
                  isActive: child.isActive,
                  startDate: child.startDate?.toISOString() ?? null,
                  dueDate: child.dueDate?.toISOString() ?? null,
                  completedDate: child.completedDate?.toISOString() ?? null,
                  version: child.version,
                  originTemplateTaskId: child.originTemplateTaskId,
                  checklistCount: getChecklistCount(child.checklists),
                  children: [],
                })),
              };
            })}
            isAdmin={true}
          />
        </TabsContent>

        {/* 공정표 탭 */}
        <TabsContent value="construction" className="space-y-6">
          <ConstructionScheduleEditor
            projectId={project.id}
            initialPhases={project.constructionPhases.map((phase) => ({
              id: phase.id,
              projectId: phase.projectId,
              name: phase.name,
              sortOrder: phase.sortOrder,
              items: phase.items.map((item) => ({
                id: item.id,
                phaseId: item.phaseId,
                name: item.name,
                startDate: item.startDate?.toISOString() ?? null,
                endDate: item.endDate?.toISOString() ?? null,
                actualStart: item.actualStart?.toISOString() ?? null,
                actualEnd: item.actualEnd?.toISOString() ?? null,
                progress: item.progress,
                status: item.status,
                memo: item.memo,
                sortOrder: item.sortOrder,
              })),
            }))}
          />
          <ConstructionChart
            phases={project.constructionPhases.map((phase) => ({
              id: phase.id,
              projectId: phase.projectId,
              name: phase.name,
              sortOrder: phase.sortOrder,
              items: phase.items.map((item) => ({
                id: item.id,
                phaseId: item.phaseId,
                name: item.name,
                startDate: item.startDate?.toISOString() ?? null,
                endDate: item.endDate?.toISOString() ?? null,
                actualStart: item.actualStart?.toISOString() ?? null,
                actualEnd: item.actualEnd?.toISOString() ?? null,
                progress: item.progress,
                status: item.status,
                memo: item.memo,
                sortOrder: item.sortOrder,
              })),
            }))}
          />
        </TabsContent>

        {/* 할 일 탭 */}
        <TabsContent value="todos" className="space-y-4">
          <TodoList
            projectId={project.id}
            isAdmin={true}
            members={adminUsers}
            initialTodos={project.todos.map((todo) => ({
              id: todo.id,
              title: todo.title,
              description: todo.description,
              dueDate: todo.dueDate?.toISOString() ?? null,
              priority: todo.priority,
              assignee: todo.assignee,
              createdBy: todo.createdBy,
              completedBy: todo.completedBy,
              completedDate: todo.completedDate?.toISOString() ?? null,
              createdAt: todo.createdAt.toISOString(),
              updatedAt: todo.updatedAt.toISOString(),
            }))}
          />
        </TabsContent>

        {/* 견적서 탭 */}
        <TabsContent value="quotations" className="space-y-4">
          <ProjectQuotationList projectId={project.id} isAdmin={true} />
        </TabsContent>

        {/* 예산 탭 */}
        <TabsContent value="budget" className="space-y-4">
          <ProjectBudgetSection projectId={project.id} />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <ProjectOverviewEdit
            project={{
              id: project.id,
              name: project.name,
              description: project.description,
              location: project.location,
              capacityKw: project.capacityKw,
              moduleManufacturer: project.moduleManufacturer,
              moduleModel: project.moduleModel,
              moduleCapacity: project.moduleCapacity,
              moduleQuantity: project.moduleQuantity,
              inverterManufacturer: project.inverterManufacturer,
              inverterModel: project.inverterModel,
              inverterCapacity: project.inverterCapacity,
              inverterQuantity: project.inverterQuantity,
              structureType: project.structureType,
              structureManufacturer: project.structureManufacturer,
              notes: project.notes,
            }}
          />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentManagement
            projectId={project.id}
            documents={project.documents}
          />
        </TabsContent>

        <TabsContent value="members">
          <MemberManagement
            projectId={project.id}
            members={project.members}
            availableUsers={availableUsers}
          />
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>활동 기록</CardTitle>
            </CardHeader>
            <CardContent>
              {project.activities.length === 0 ? (
                <p className="text-muted-foreground">활동 기록이 없습니다.</p>
              ) : (
                <div className="space-y-4">
                  {project.activities.map((activity) => (
                    <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {activity.user?.name || "시스템"} - {formatRelativeTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
