import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProjectCard } from "@/components/project/project-card";
import { prisma } from "@/lib/prisma";

async function getMyProjects(userId: string) {
  try {
    const projects = await prisma.project.findMany({
      where: {
        status: {
          not: "ARCHIVED",
        },
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
        _count: {
          select: {
            documents: true,
            activities: true,
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

export default async function ClientProjectsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const projects = await getMyProjects(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">내 프로젝트</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          참여 중인 프로젝트의 진행 상황을 확인할 수 있습니다.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">참여 중인 프로젝트가 없습니다.</p>
          <p className="text-sm text-muted-foreground mt-2">
            관리자가 프로젝트에 초대하면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              href={`/projects/${project.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
