import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectStatus } from "@prisma/client";
import { MapPin, Zap, Calendar, ArrowLeft, Users, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MemberManagement } from "@/components/project/member-management";
import { DocumentManagement } from "@/components/project/document-management";
import { TaskManagement } from "@/components/project/task-management";
import { ProjectOverviewEdit } from "@/components/project/project-overview-edit";

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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
      tasks: {
        orderBy: { displayOrder: "asc" },
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
        <h1 className="text-xl md:text-3xl font-bold">{project.name}</h1>
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

      {/* Task Management - Checklist */}
      <TaskManagement
        projectId={project.id}
        tasks={project.tasks.map((task) => ({
          id: task.id,
          taskType: task.taskType,
          customName: task.customName,
          status: task.status,
          displayOrder: task.displayOrder,
          note: task.note,
          completedAt: task.completedAt?.toISOString() ?? null,
        }))}
      />

      {/* Status Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              진행률
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.progressPercent}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              상태
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              멤버
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{project.members.length}</span>
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
          <TabsTrigger value="members">
            멤버 ({project.members.length})
          </TabsTrigger>
          <TabsTrigger value="activity">활동</TabsTrigger>
        </TabsList>

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
