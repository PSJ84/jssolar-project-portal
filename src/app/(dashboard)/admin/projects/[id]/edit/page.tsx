import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectForm } from "@/components/project/project-form";
import { Project } from "@/types";

async function getProject(id: string): Promise<Project | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
    const response = await fetch(`${baseUrl}/api/projects/${id}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}

export default async function EditProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/projects");
  }

  const project = await getProject(params.id);

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
