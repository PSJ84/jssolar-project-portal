import { prisma } from "@/lib/prisma";
import { SuperProjectTable } from "@/components/project/super-project-table";

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
      },
      orderBy: [
        { status: "asc" }, // ACTIVE first, then COMPLETED, then ARCHIVED
        { updatedAt: "desc" },
      ],
    });
    return projects;
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
