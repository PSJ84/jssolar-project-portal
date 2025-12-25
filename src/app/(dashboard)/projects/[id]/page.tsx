import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/prisma";
import { ProjectStatus, DocumentCategory, ChecklistStatus } from "@prisma/client";
import {
  MapPin,
  Zap,
  Calendar,
  FileText,
  ExternalLink,
  ArrowLeft,
  FolderOpen,
  RefreshCw,
  Eye,
} from "lucide-react";
import { TaskListV2 } from "@/components/tasks/TaskListV2";
import { ClientProgressSummary } from "@/components/tasks/ClientProgressSummary";
import { ProjectQuotationList } from "@/components/quotation/ProjectQuotationList";
import { ConstructionChart } from "@/components/construction/ConstructionChart";
import { ProjectHomeTab } from "@/components/dashboard/ProjectHomeTab";
import { parseVisibleTabs, ClientTabKey } from "@/lib/constants";

const statusLabels: Record<ProjectStatus, string> = {
  ACTIVE: "진행중",
  COMPLETED: "완료",
  ARCHIVED: "보관",
};

const categoryLabels: Record<DocumentCategory, string> = {
  CONTRACT: "계약서",
  PERMIT: "인허가 서류",
  DRAWING: "도면",
  SCHEDULE: "공정표",
  SITE_PHOTO: "현장 사진",
  COMPLETION: "준공 서류",
  OTHER: "기타",
};

// Fixed category display order
const CATEGORY_ORDER: DocumentCategory[] = [
  "CONTRACT",
  "PERMIT",
  "DRAWING",
  "SCHEDULE",
  "SITE_PHOTO",
  "COMPLETION",
  "OTHER",
];

async function getProject(
  id: string,
  userId: string,
  userRole: string,
  organizationId?: string | null,
  todoTargetUserId?: string // 할 일 필터링용 타겟 사용자
) {
  try {
    // ADMIN/SUPER_ADMIN은 자신의 조직 프로젝트에 접근 가능
    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
    const isSuperAdmin = userRole === "SUPER_ADMIN";

    // where 조건 구성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereCondition: any = { id };

    if (!isSuperAdmin) {
      if (isAdmin && organizationId) {
        whereCondition.organizationId = organizationId;
      } else if (!isAdmin) {
        whereCondition.members = { some: { userId } };
      }
    }

    // 할 일 필터링 대상 (시뮬레이션 모드면 타겟 사용자, 아니면 현재 사용자)
    const todoAssigneeId = todoTargetUserId || userId;

    const project = await prisma.project.findFirst({
      where: whereCondition,
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
        },
        documents: {
          include: {
            currentVersion: true,
          },
          orderBy: {
            title: "asc",
          },
        },
        activities: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        projectTasks: {
          orderBy: {
            displayOrder: "asc",
          },
        },
        // Phase 2 Task
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
        // 견적서 (초기 로드)
        quotations: {
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
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
        // 사업주 할 일 (홈 탭용)
        todos: {
          where: {
            assigneeId: todoAssigneeId,
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            completedDate: true,
          },
          take: 5,
          orderBy: [
            { completedDate: "asc" },  // 미완료 먼저
            { dueDate: "asc" },
          ],
        },
      },
    });
    return project;
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}

// 회사 정보 조회 (담당자 전화번호용)
async function getCompanyInfo() {
  const configs = await prisma.systemConfig.findMany({
    where: {
      key: { in: ["COMPANY_NAME", "COMPANY_CEO", "COMPANY_PHONE"] },
    },
  });
  const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));
  return {
    companyName: configMap.COMPANY_NAME || "",
    ceoName: configMap.COMPANY_CEO || null,
    phone: configMap.COMPANY_PHONE || null,
  };
}

export default async function ClientProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; as?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Next.js 16: await params
  const { id } = await params;
  const { view, as: viewAsUserId } = await searchParams;

  // 어드민이 사업주 시점으로 보는 경우 처리
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const isSimulationMode = view === "client" && viewAsUserId && isAdmin;

  // 시뮬레이션 모드면 타겟 사용자 ID 사용
  const targetUserId = isSimulationMode ? viewAsUserId : session.user.id;

  const [project, companyInfo, userWithTabs] = await Promise.all([
    getProject(
      id,
      session.user.id,
      session.user.role,
      session.user.organizationId,
      isSimulationMode ? viewAsUserId : undefined
    ),
    getCompanyInfo(),
    // 사업주 탭 설정 조회 (시뮬레이션 모드면 타겟 사용자, 아니면 현재 사용자)
    session.user.role === "CLIENT" || isSimulationMode
      ? prisma.user.findUnique({
          where: { id: targetUserId },
          select: { visibleTabs: true, name: true },
        })
      : null,
  ]);

  if (!project) {
    redirect("/projects");
  }

  // 시뮬레이션 모드: 해당 사용자가 프로젝트 멤버인지 검증
  let simulationUserName: string | null = null;
  if (isSimulationMode) {
    const isMember = project.members.some(m => m.userId === viewAsUserId);
    if (!isMember) {
      redirect("/projects");
    }
    simulationUserName = userWithTabs?.name || "사용자";
  }

  // view=client 쿼리 파라미터가 있으면 사업주 화면으로 강제 (어드민 미리보기용)
  const isClient = session.user.role === "CLIENT" || view === "client";

  // 사업주 탭 설정 파싱 (기본값: 모두 표시)
  const visibleTabs = parseVisibleTabs(userWithTabs?.visibleTabs);

  // Sort documents by title and group by category (with custom category support)
  const sortedDocs = [...project.documents].sort((a, b) =>
    a.title.localeCompare(b.title, "ko")
  );

  // Group by category key (category or custom category for OTHER)
  const documentsByCategory: { key: string; label: string; docs: typeof project.documents }[] = [];
  const categoryMap = new Map<string, typeof project.documents>();

  sortedDocs.forEach((doc) => {
    const key = doc.category === "OTHER" && doc.customCategory
      ? `CUSTOM:${doc.customCategory}`
      : doc.category;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, []);
    }
    categoryMap.get(key)!.push(doc);
  });

  // Add categories in fixed order
  CATEGORY_ORDER.forEach((cat) => {
    if (categoryMap.has(cat)) {
      documentsByCategory.push({
        key: cat,
        label: categoryLabels[cat],
        docs: categoryMap.get(cat)!,
      });
    }
  });

  // Add custom categories at the end
  const customKeys = Array.from(categoryMap.keys())
    .filter((k) => k.startsWith("CUSTOM:"))
    .sort();
  customKeys.forEach((key) => {
    documentsByCategory.push({
      key,
      label: key.replace("CUSTOM:", ""),
      docs: categoryMap.get(key)!,
    });
  });

  // Get last update date from activities or project updatedAt
  const lastUpdateDate = project.activities.length > 0
    ? new Date(project.activities[0].createdAt)
    : new Date(project.updatedAt);

  return (
    <div className="space-y-6">
      {/* 시뮬레이션 모드 배너 */}
      {isSimulationMode && simulationUserName && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <Eye className="h-4 w-4 shrink-0" />
          <span>
            <strong>{simulationUserName}</strong>님 시점으로 보는 중입니다.
            이 화면은 해당 사업주가 보는 것과 동일합니다.
          </span>
        </div>
      )}

      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-2">
        <Link href="/projects">
          <ArrowLeft className="h-4 w-4 mr-2" />
          프로젝트 목록
        </Link>
      </Button>

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl md:text-3xl font-bold">{project.name}</h1>
          <Badge
            variant={
              project.status === "ACTIVE"
                ? "default"
                : project.status === "COMPLETED"
                ? "secondary"
                : "outline"
            }
            className="shrink-0"
          >
            {statusLabels[project.status]}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-sm">
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
          <div className="flex items-center text-muted-foreground">
            <RefreshCw className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">최근 업데이트:</span> {lastUpdateDate.toLocaleDateString("ko-KR")}
          </div>
        </div>
      </div>

      {/* Tabs - 홈이 첫 번째 탭 (사업주), 개요가 첫 번째 탭 (관리자) */}
      <Tabs defaultValue={isClient ? (visibleTabs.home ? "home" : "tasks") : "overview"} className="space-y-4">
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="inline-flex w-max h-auto gap-1">
            {isClient ? (
              // 사업주: visibleTabs 기준으로 탭 표시
              <>
                {visibleTabs.home && (
                  <TabsTrigger value="home" className="flex-shrink-0 flex-none">홈</TabsTrigger>
                )}
                {visibleTabs.permit && (
                  <TabsTrigger value="tasks" className="flex-shrink-0 flex-none">인허가</TabsTrigger>
                )}
                {visibleTabs.construction && (
                  <TabsTrigger value="construction" className="flex-shrink-0 flex-none">시공</TabsTrigger>
                )}
                {visibleTabs.quotation && (
                  <TabsTrigger value="quotations" className="flex-shrink-0 flex-none">견적서</TabsTrigger>
                )}
                {visibleTabs.documents && (
                  <TabsTrigger value="documents" className="flex-shrink-0 flex-none">
                    문서 ({project.documents.length})
                  </TabsTrigger>
                )}
              </>
            ) : (
              // 관리자/미리보기: 모든 탭 표시
              <>
                <TabsTrigger value="overview" className="flex-shrink-0 flex-none">개요</TabsTrigger>
                <TabsTrigger value="tasks" className="flex-shrink-0 flex-none">인허가</TabsTrigger>
                <TabsTrigger value="construction" className="flex-shrink-0 flex-none">시공</TabsTrigger>
                <TabsTrigger value="quotations" className="flex-shrink-0 flex-none">견적서</TabsTrigger>
                <TabsTrigger value="documents" className="flex-shrink-0 flex-none">
                  문서 ({project.documents.length})
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        {/* 진행 단계 탭 */}
        <TabsContent value="tasks" className="space-y-4">
          {/* 진행률 요약 - 진행 단계 탭 안으로 이동 */}
          <ClientProgressSummary
            tasks={project.tasks.map((task) => ({
              id: task.id,
              name: task.name,
              sortOrder: task.sortOrder,
              isActive: task.isActive,
              startDate: task.startDate?.toISOString() ?? null,
              dueDate: task.dueDate?.toISOString() ?? null,
              completedDate: task.completedDate?.toISOString() ?? null,
              isPermitTask: task.isPermitTask,
              submittedDate: task.submittedDate?.toISOString() ?? null,
              processingDays: task.processingDays,
              phase: task.phase,
              children: task.children.map((child) => ({
                id: child.id,
                name: child.name,
                sortOrder: child.sortOrder,
                isActive: child.isActive,
                startDate: child.startDate?.toISOString() ?? null,
                dueDate: child.dueDate?.toISOString() ?? null,
                completedDate: child.completedDate?.toISOString() ?? null,
                phase: child.phase,
                children: [],
              })),
            }))}
            compact
          />
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
            isAdmin={false}
            isClient={true}
            hideProgressSummary={true}
            defaultAllExpanded={true}
          />
        </TabsContent>

        {/* 공정표 탭 */}
        <TabsContent value="construction" className="space-y-4">
          {/* 대공정별 진행률 바 */}
          {project.constructionPhases.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">대공정별 진행률</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.constructionPhases.map((phase) => {
                  // 공정별 평균 진행률 계산
                  const avgProgress = phase.items.length > 0
                    ? Math.round(phase.items.reduce((sum, item) => sum + (item.progress || 0), 0) / phase.items.length)
                    : 0;
                  return (
                    <div key={phase.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{phase.name}</span>
                        <span className="text-muted-foreground">{avgProgress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${avgProgress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
          <ConstructionChart
            phases={project.constructionPhases.map((phase) => ({
              id: phase.id,
              projectId: phase.projectId,
              name: phase.name,
              sortOrder: phase.sortOrder,
              weight: phase.weight,
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

        {/* 견적서 탭 */}
        <TabsContent value="quotations" className="space-y-4">
          <ProjectQuotationList
            projectId={project.id}
            isAdmin={false}
            initialQuotations={project.quotations.map((q) => ({
              id: q.id,
              quotationNumber: q.quotationNumber,
              customerName: q.customerName,
              projectName: q.projectName,
              quotationDate: q.quotationDate.toISOString(),
              totalAmount: q.totalAmount,
              vatIncluded: q.vatIncluded,
              grandTotal: q.grandTotal,
              status: q.status,
            }))}
            initialDetails={project.quotations.map((q) => ({
              id: q.id,
              quotationNumber: q.quotationNumber,
              customerName: q.customerName,
              projectName: q.projectName,
              quotationDate: q.quotationDate.toISOString(),
              subtotal: q.subtotal,
              roundingAmount: q.roundingAmount,
              totalAmount: q.totalAmount,
              vatIncluded: q.vatIncluded,
              grandTotal: q.grandTotal,
              status: q.status,
              specialNotes: q.specialNotes,
              items: q.items.map((item) => ({
                id: item.id,
                name: item.name,
                unit: item.unit,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.amount,
                note: item.note,
              })),
            }))}
          />
        </TabsContent>

        {/* 홈 탭 (사업주용) */}
        <TabsContent value="home" className="space-y-4">
          <ProjectHomeTab
            project={{
              id: project.id,
              name: project.name,
              location: project.location,
              capacityKw: project.capacityKw,
            }}
            tasks={project.tasks.map((task) => ({
              id: task.id,
              name: task.name,
              phase: task.phase,
              completedDate: task.completedDate?.toISOString() ?? null,
              isActive: task.isActive,
              children: task.children.map((child) => ({
                phase: child.phase,
                completedDate: child.completedDate?.toISOString() ?? null,
              })),
            }))}
            constructionPhases={project.constructionPhases.map((phase) => ({
              id: phase.id,
              name: phase.name,
              weight: phase.weight,
              items: phase.items.map((item) => ({
                id: item.id,
                name: item.name,
                startDate: item.startDate?.toISOString() ?? null,
                status: item.status,
                progress: item.progress,
              })),
            }))}
            activities={project.activities.slice(0, 5).map((activity) => ({
              id: activity.id,
              type: activity.type,
              title: activity.title,
              description: activity.description,
              createdAt: activity.createdAt.toISOString(),
              user: activity.user,
            }))}
            todos={project.todos.map((todo) => ({
              id: todo.id,
              title: todo.title,
              dueDate: todo.dueDate?.toISOString() ?? null,
              completedDate: todo.completedDate?.toISOString() ?? null,
            }))}
            companyInfo={companyInfo}
          />
        </TabsContent>

        {/* 개요 탭 (관리자용) */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>프로젝트 설명</CardTitle>
            </CardHeader>
            <CardContent>
              {project.description ? (
                <p className="whitespace-pre-wrap">{project.description}</p>
              ) : (
                <p className="text-muted-foreground">설명이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* 설비 정보 */}
          {(project.moduleManufacturer || project.inverterManufacturer || project.structureType) && (
            <Card>
              <CardHeader>
                <CardTitle>설비 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 모듈 */}
                {(project.moduleManufacturer || project.moduleModel) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">모듈</p>
                    <p className="text-sm">
                      {[
                        project.moduleManufacturer,
                        project.moduleModel,
                        project.moduleCapacity,
                        project.moduleQuantity ? `x ${project.moduleQuantity}장` : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  </div>
                )}

                {/* 인버터 */}
                {(project.inverterManufacturer || project.inverterModel) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">인버터</p>
                    <p className="text-sm">
                      {[
                        project.inverterManufacturer,
                        project.inverterModel,
                        project.inverterCapacity,
                        project.inverterQuantity ? `x ${project.inverterQuantity}대` : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  </div>
                )}

                {/* 구조물 */}
                {(project.structureType || project.structureManufacturer) && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">구조물</p>
                    <p className="text-sm">
                      {project.structureType}
                      {project.structureManufacturer && ` (${project.structureManufacturer})`}
                    </p>
                  </div>
                )}

                {/* 메모 */}
                {project.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">비고</p>
                    <p className="text-sm whitespace-pre-wrap">{project.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>프로젝트 문서</CardTitle>
            </CardHeader>
            <CardContent>
              {project.documents.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">등록된 문서가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {documentsByCategory.map(({ key, label, docs }) => (
                    <div key={key}>
                      <h3 className="font-semibold mb-3">
                        {label}
                      </h3>
                      <div className="space-y-2">
                        {docs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{doc.title}</p>
                                  {doc.currentVersion && (
                                    <span className="text-xs text-muted-foreground">
                                      v{doc.currentVersion.versionNumber}
                                    </span>
                                  )}
                                </div>
                                {doc.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    {doc.description}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(doc.updatedAt).toLocaleDateString("ko-KR")} 업데이트
                                </p>
                              </div>
                            </div>
                            {doc.currentVersion && (
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={doc.currentVersion.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  열기
                                </a>
                              </Button>
                            )}
                          </div>
                        ))}
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
