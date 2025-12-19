import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProjectTable } from "@/components/project/project-table";
import { prisma } from "@/lib/prisma";
import { Plus } from "lucide-react";

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
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
    return projects;
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

export default async function AdminProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">프로젝트 관리</h1>
          <p className="text-muted-foreground mt-1">
            모든 프로젝트를 관리할 수 있습니다.
          </p>
        </div>
        <Button asChild>
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
