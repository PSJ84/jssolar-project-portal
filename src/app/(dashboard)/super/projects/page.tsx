import { prisma } from "@/lib/prisma";
import { SuperProjectTable } from "@/components/project/super-project-table";

// 진행률 계산 함수 (하위 태스크 기준, 활성화된 것만)
function calculateProgress(tasks: { isActive: boolean; children: { isActive: boolean; completedDate: Date | null }[] }[]): number {
  const activeTasks = tasks.filter(t => t.isActive);
  const allChildTasks = activeTasks.flatMap(t => t.children.filter(c => c.isActive));

  if (allChildTasks.length === 0) return 0;

  const completedTasks = allChildTasks.filter(c => c.completedDate !== null).length;
  return Math.round((completedTasks / allChildTasks.length) * 100);
}

async function getAllProjects() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
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
      orderBy: [
        { status: "asc" }, // ACTIVE first, then COMPLETED, then ARCHIVED
        { updatedAt: "desc" },
      ],
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

export default async function SuperProjectsPage() {
  const projects = await getAllProjects();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">전체 프로젝트 관리</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          모든 조직의 프로젝트를 관리할 수 있습니다. ARCHIVED 프로젝트도 표시됩니다.
        </p>
      </div>

      <SuperProjectTable projects={projects} />
    </div>
  );
}
