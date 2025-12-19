import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectForm } from "@/components/project/project-form";

async function getProject(id: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        capacityKw: true,
      },
    });
    return project;
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/projects");
  }

  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>프로젝트 수정</CardTitle>
          <CardDescription>
            {project.name} 프로젝트 정보를 수정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm
            projectId={project.id}
            defaultValues={{
              name: project.name,
              description: project.description || "",
              location: project.location || "",
              capacityKw: project.capacityKw || "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
