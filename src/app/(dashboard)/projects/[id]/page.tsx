import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/prisma";
import { ProjectPhase, ProjectStatus, DocumentCategory } from "@prisma/client";
import {
  MapPin,
  Zap,
  Calendar,
  FileText,
  ExternalLink,
  Clock,
  CheckCircle2,
  ArrowLeft,
  User,
  FolderOpen
} from "lucide-react";

const phaseLabels: Record<ProjectPhase, string> = {
  CONTRACT: "계약",
  PERMIT: "인허가",
  DESIGN: "설계",
  CONSTRUCTION: "시공",
  COMPLETION: "준공",
};

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
            updatedAt: "desc",
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

  // Calculate phase steps
  const phases: ProjectPhase[] = ["CONTRACT", "PERMIT", "DESIGN", "CONSTRUCTION", "COMPLETION"];
  const currentPhaseIndex = phases.indexOf(project.currentPhase);

  // Group documents by category
  const documentsByCategory = project.documents.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<DocumentCategory, typeof project.documents>);

  // Format relative time for activities
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return new Date(date).toLocaleDateString("ko-KR");
  };

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
        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <Badge
            variant={
              project.status === "ACTIVE"
                ? "default"
                : project.status === "COMPLETED"
                ? "secondary"
                : "outline"
            }
          >
            {statusLabels[project.status]}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-2">
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

      {/* Phase Stepper */}
      <Card>
        <CardHeader>
          <CardTitle>프로젝트 단계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Desktop Stepper */}
            <div className="hidden md:flex justify-between items-center">
              {phases.map((phase, index) => (
                <div key={phase} className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    {index > 0 && (
                      <div
                        className={`flex-1 h-1 ${
                          index <= currentPhaseIndex
                            ? "bg-primary"
                            : "bg-muted"
                        }`}
                      />
                    )}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold shrink-0 ${
                        index <= currentPhaseIndex
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index < currentPhaseIndex ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    {index < phases.length - 1 && (
                      <div
                        className={`flex-1 h-1 ${
                          index < currentPhaseIndex
                            ? "bg-primary"
                            : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                  <div className="text-xs mt-2 text-center font-medium">
                    {phaseLabels[phase]}
                  </div>
                </div>
              ))}
            </div>
            {/* Mobile Stepper */}
            <div className="md:hidden space-y-2">
              {phases.map((phase, index) => (
                <div key={phase} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                      index <= currentPhaseIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index < currentPhaseIndex ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      index === currentPhaseIndex
                        ? "font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {phaseLabels[phase]}
                    {index === currentPhaseIndex && " (현재)"}
                  </span>
                </div>
              ))}
            </div>
            {/* Progress Bar */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">전체 진행률</span>
                <span className="font-medium">{project.progressPercent}%</span>
              </div>
              <Progress value={project.progressPercent} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              현재 단계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="text-base">
              {phaseLabels[project.currentPhase]}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              등록된 문서
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{project.documents.length}</span>
              <span className="text-muted-foreground">개</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              참여 인원
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{project.members.length}</span>
              <span className="text-muted-foreground">명</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="documents">
            문서 ({project.documents.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            활동 ({project.activities.length})
          </TabsTrigger>
        </TabsList>

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

          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle>참여 인원</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.user?.name || member.invitedEmail || "알 수 없음"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.user?.email || member.invitedEmail}
                        </p>
                      </div>
                    </div>
                    {member.isOwner && (
                      <Badge variant="secondary">사업주</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
                  {Object.entries(documentsByCategory).map(([category, docs]) => (
                    <div key={category}>
                      <h3 className="font-semibold mb-3">
                        {categoryLabels[category as DocumentCategory]}
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
                                <p className="font-medium">{doc.title}</p>
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

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>활동 기록</CardTitle>
            </CardHeader>
            <CardContent>
              {project.activities.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">활동 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {project.activities.map((activity) => (
                      <div key={activity.id} className="relative pl-10">
                        {/* Timeline dot */}
                        <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{activity.title}</p>
                              {activity.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {activity.description}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatRelativeTime(activity.createdAt)}
                            </span>
                          </div>
                          {activity.user && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {activity.user.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
