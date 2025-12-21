import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  CheckCircle2,
  Clock,
  ListTodo
} from "lucide-react";
import { TaskListV2 } from "@/components/tasks/TaskListV2";

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

async function getProject(id: string, userId: string) {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        members: {
          some: {
            userId: userId,
          },
        },
      },
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
      },
    });
    return project;
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}

export default async function ClientProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Next.js 16: await params
  const { id } = await params;
  const project = await getProject(id, session.user.id);

  if (!project) {
    redirect("/projects");
  }

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

      {/* 요약 바 - 컴팩트한 한 줄 */}
      {(() => {
        // 태스크 통계 계산
        const activeTasks = project.tasks.filter(t => t.isActive);
        const allChildTasks = activeTasks.flatMap(t => t.children.filter(c => c.isActive));
        const totalTasks = allChildTasks.length;
        const completedTasks = allChildTasks.filter(c => c.completedDate !== null).length;
        const inProgressTasks = allChildTasks.filter(c => !c.completedDate && c.startDate !== null).length;
        const waitingTasks = allChildTasks.filter(c => !c.completedDate && !c.startDate).length;
        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
            </div>
          </div>
        );
      })()}

      {/* Tabs - 진행 단계가 첫 번째 탭 (기본 선택) */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">진행 단계</TabsTrigger>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="documents">
            문서 ({project.documents.length})
          </TabsTrigger>
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
            isAdmin={false}
            isClient={true}
          />
        </TabsContent>

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
