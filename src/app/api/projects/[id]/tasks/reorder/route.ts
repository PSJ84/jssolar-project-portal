import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { taskTypeLabels, taskStatusLabels } from "@/lib/project-tasks";

// PUT /api/projects/[id]/tasks/reorder - Reorder tasks (ADMIN only)
export async function PUT(
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
    const body = await request.json();
    const { taskIds } = body;

    // Validate taskIds
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: "taskIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Check for duplicate IDs
    const uniqueIds = new Set(taskIds);
    if (uniqueIds.size !== taskIds.length) {
      return NextResponse.json(
        { error: "taskIds contains duplicate values" },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify all task IDs belong to this project
    const existingTasks = await prisma.projectTask.findMany({
      where: { projectId },
      select: { id: true },
    });

    const existingTaskIds = new Set(existingTasks.map((t) => t.id));

    // Check if all provided IDs exist in the project
    for (const taskId of taskIds) {
      if (!existingTaskIds.has(taskId)) {
        return NextResponse.json(
          { error: `Task ${taskId} not found in this project` },
          { status: 400 }
        );
      }
    }

    // Check if all existing tasks are included
    if (taskIds.length !== existingTasks.length) {
      return NextResponse.json(
        {
          error: `Expected ${existingTasks.length} task IDs, but received ${taskIds.length}`,
        },
        { status: 400 }
      );
    }

    // Update display order for each task in a transaction
    const updatedTasks = await prisma.$transaction(async (tx) => {
      // Update each task's displayOrder sequentially to avoid transaction timeout
      for (let index = 0; index < taskIds.length; index++) {
        await tx.projectTask.update({
          where: { id: taskIds[index] },
          data: { displayOrder: index },
        });
      }

      // Fetch all tasks with new order
      const tasks = await tx.projectTask.findMany({
        where: { projectId },
        orderBy: { displayOrder: "asc" },
      });

      // Log activity
      await tx.activity.create({
        data: {
          projectId,
          userId: session.user.id,
          type: "tasks_reordered",
          title: "체크리스트 순서 변경",
          description: "태스크 순서가 변경되었습니다.",
          metadata: {
            newOrder: taskIds,
          },
        },
      });

      return tasks;
    });

    // Add labels to tasks
    const tasksWithLabels = updatedTasks.map((task) => ({
      ...task,
      taskTypeLabel: taskTypeLabels[task.taskType],
      statusLabel: taskStatusLabels[task.status],
    }));

    return NextResponse.json(tasksWithLabels);
  } catch (error) {
    console.error("Error reordering tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
