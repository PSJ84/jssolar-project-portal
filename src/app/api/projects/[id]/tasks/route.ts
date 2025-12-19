import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createDefaultTasks, taskTypeLabels, taskStatusLabels } from "@/lib/project-tasks";

// Helper function to check project access
async function checkProjectAccess(
  projectId: string,
  userId: string,
  role: string
) {
  if (role === UserRole.ADMIN) {
    return true;
  }

  // CLIENT: Check if user is a member of the project
  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
  });

  return !!membership;
}

// GET /api/projects/[id]/tasks - List all tasks for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, role } = session.user;
    const { id: projectId } = await params;

    // Check project access
    const hasAccess = await checkProjectAccess(projectId, userId, role);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: No access to this project" },
        { status: 403 }
      );
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch tasks ordered by displayOrder
    const tasks = await prisma.projectTask.findMany({
      where: { projectId },
      orderBy: { displayOrder: "asc" },
    });

    // Add labels to tasks for frontend convenience
    const tasksWithLabels = tasks.map((task) => ({
      ...task,
      taskTypeLabel: taskTypeLabels[task.taskType],
      statusLabel: taskStatusLabels[task.status],
    }));

    return NextResponse.json(tasksWithLabels);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/tasks - Create default tasks for a project (Internal use / ADMIN only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    const { id: projectId } = await params;

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if tasks already exist for this project
    const existingTasks = await prisma.projectTask.count({
      where: { projectId },
    });

    if (existingTasks > 0) {
      return NextResponse.json(
        { error: "Tasks already exist for this project" },
        { status: 409 }
      );
    }

    // Create default tasks and log activity in a transaction
    const tasks = await prisma.$transaction(async (tx) => {
      const createdTasks = await createDefaultTasks(tx, projectId);

      // Log activity
      await tx.activity.create({
        data: {
          projectId,
          userId: session.user.id,
          type: "tasks_initialized",
          title: "체크리스트 초기화",
          description: `${createdTasks.length}개의 기본 태스크가 생성되었습니다.`,
          metadata: {
            taskCount: createdTasks.length,
          },
        },
      });

      return createdTasks;
    });

    // Add labels to tasks
    const tasksWithLabels = tasks.map((task) => ({
      ...task,
      taskTypeLabel: taskTypeLabels[task.taskType],
      statusLabel: taskStatusLabels[task.status],
    }));

    return NextResponse.json(tasksWithLabels, { status: 201 });
  } catch (error) {
    console.error("Error creating tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
