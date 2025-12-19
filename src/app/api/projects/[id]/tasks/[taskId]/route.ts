import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, TaskStatus } from "@prisma/client";
import {
  taskTypeLabels,
  taskStatusLabels,
  calculateProgress,
} from "@/lib/project-tasks";

// PATCH /api/projects/[id]/tasks/[taskId] - Update task status/note (ADMIN only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
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

    const { id: projectId, taskId } = await params;
    const body = await request.json();
    const { status, note } = body;

    // Validate status if provided
    if (status && !Object.values(TaskStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
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

    // Check if task exists and belongs to the project
    const existingTask = await prisma.projectTask.findFirst({
      where: {
        id: taskId,
        projectId,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: {
      status?: TaskStatus;
      note?: string | null;
      completedAt?: Date | null;
    } = {};

    if (note !== undefined) {
      updateData.note = note;
    }

    // Handle status change
    let statusChanged = false;
    let oldStatus: TaskStatus | null = null;
    let newStatus: TaskStatus | null = null;

    if (status && status !== existingTask.status) {
      statusChanged = true;
      oldStatus = existingTask.status;
      newStatus = status as TaskStatus;
      updateData.status = newStatus;

      // Handle completedAt based on status change
      if (newStatus === TaskStatus.COMPLETED) {
        updateData.completedAt = new Date();
      } else if (oldStatus === TaskStatus.COMPLETED) {
        updateData.completedAt = null;
      }
    }

    // Update task and recalculate progress in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the task
      const updatedTask = await tx.projectTask.update({
        where: { id: taskId },
        data: updateData,
      });

      // If status changed, create activity log and recalculate progress
      if (statusChanged && oldStatus && newStatus) {
        const taskLabel = taskTypeLabels[existingTask.taskType];
        const statusLabel = taskStatusLabels[newStatus];

        // Create activity log
        await tx.activity.create({
          data: {
            projectId,
            userId: session.user.id,
            type: "task_status_changed",
            title: `${taskLabel} 상태를 '${statusLabel}'(으)로 변경`,
            description: `${taskTypeLabels[existingTask.taskType]}: ${taskStatusLabels[oldStatus]} -> ${taskStatusLabels[newStatus]}`,
            metadata: {
              taskId,
              taskType: existingTask.taskType,
              oldStatus,
              newStatus,
            },
          },
        });

        // Recalculate project progress
        const allTasks = await tx.projectTask.findMany({
          where: { projectId },
          select: { status: true },
        });

        const newProgress = calculateProgress(allTasks);

        // Update project progress
        await tx.project.update({
          where: { id: projectId },
          data: { progressPercent: newProgress },
        });

        return {
          task: updatedTask,
          progressPercent: newProgress,
        };
      }

      // Get current progress if no status change
      const currentProject = await tx.project.findUnique({
        where: { id: projectId },
        select: { progressPercent: true },
      });

      return {
        task: updatedTask,
        progressPercent: currentProject?.progressPercent ?? 0,
      };
    });

    // Add labels to response
    const taskWithLabels = {
      ...result.task,
      taskTypeLabel: taskTypeLabels[result.task.taskType],
      statusLabel: taskStatusLabels[result.task.status],
      projectProgressPercent: result.progressPercent,
    };

    return NextResponse.json(taskWithLabels);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/projects/[id]/tasks/[taskId] - Get single task details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, role } = session.user;
    const { id: projectId, taskId } = await params;

    // Check project access
    if (role !== UserRole.ADMIN) {
      const membership = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Forbidden: No access to this project" },
          { status: 403 }
        );
      }
    }

    // Fetch the task
    const task = await prisma.projectTask.findFirst({
      where: {
        id: taskId,
        projectId,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Add labels
    const taskWithLabels = {
      ...task,
      taskTypeLabel: taskTypeLabels[task.taskType],
      statusLabel: taskStatusLabels[task.status],
    };

    return NextResponse.json(taskWithLabels);
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
