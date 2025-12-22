import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProjectTable } from "@/components/project/project-table";
import { prisma } from "@/lib/prisma";
import { Plus } from "lucide-react";

// 진행률 계산 함수 (하위 태스크 기준, 활성화된 것만)
function calculateProgress(tasks: { isActive: boolean; children: { isActive: boolean; completedDate: Date | null }[] }[]): number {
  const activeTasks = tasks.filter(t => t.isActive);
  const allChildTasks = activeTasks.flatMap(t => t.children.filter(c => c.isActive));

  if (allChildTasks.length === 0) return 0;

  const completedTasks = allChildTasks.filter(c => c.completedDate !== null).length;
  return Math.round((completedTasks / allChildTasks.length) * 100);
}

async function getProjects() {
  try {
    const projects = await prisma.project.findMany({
      where: {
        status: {
          not: "ARCHIVED",
        },
      },
      include: {
        _count: {
          select: {
            members: true,
            documents: true,
          },
        },
        // 진행률 계산을 위한 태스크 조회
        tasks: {
          where: { parentId: null },
          select: {
            isActive: true,
            children: {
              select: {
                isActive: true,
                completedDate: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // 진행률 계산하여 반환
    return projects.map(project => ({
      ...project,
      calculatedProgress: calculateProgress(project.tasks),
    }));
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

export default async function AdminProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">프로젝트 관리</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            모든 프로젝트를 관리할 수 있습니다.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            새 프로젝트
          </Link>
        </Button>
      </div>

      <ProjectTable projects={projects} />
    </div>
  );
}
