import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, DocumentCategory } from "@prisma/client";

// Category labels for Activity
const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  CONTRACT: "계약서",
  PERMIT: "인허가",
  DRAWING: "도면",
  SCHEDULE: "공정표",
  SITE_PHOTO: "현장사진",
  COMPLETION: "준공도서",
  OTHER: "기타",
};

// Helper function to check project access
async function checkProjectAccess(
  projectId: string,
  userId: string,
  role: UserRole
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

// GET /api/documents/[id] - Get document with all versions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;
    const { id: userId, role } = session.user;

    // Fetch document with all versions
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        currentVersion: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        versions: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            versionNumber: "desc",
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Check project access
    const hasAccess = await checkProjectAccess(
      document.projectId,
      userId,
      role as UserRole
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: No access to this document" },
        { status: 403 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/documents/[id] - Update document metadata (ADMIN only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ADMIN only
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    const { id: documentId } = await params;
    const body = await request.json();
    const { title, description, category } = body;

    // Validate category if provided
    if (category && !Object.values(DocumentCategory).includes(category)) {
      return NextResponse.json(
        { error: "Invalid document category" },
        { status: 400 }
      );
    }

    // Find existing document
    const existingDocument = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        projectId: true,
      },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Track changes for activity log
    const changes: string[] = [];
    const metadata: Record<string, unknown> = {};

    if (title && title !== existingDocument.title) {
      changes.push(`제목: "${existingDocument.title}" → "${title}"`);
      metadata.oldTitle = existingDocument.title;
      metadata.newTitle = title;
    }
    if (category && category !== existingDocument.category) {
      const oldLabel = CATEGORY_LABELS[existingDocument.category];
      const newLabel = CATEGORY_LABELS[category as DocumentCategory];
      changes.push(`분류: ${oldLabel} → ${newLabel}`);
      metadata.oldCategory = existingDocument.category;
      metadata.newCategory = category;
    }
    if (description !== undefined && description !== existingDocument.description) {
      changes.push("설명이 변경되었습니다.");
      metadata.descriptionChanged = true;
    }

    // Update document
    const document = await prisma.$transaction(async (tx) => {
      const updatedDocument = await tx.document.update({
        where: { id: documentId },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description: description || null }),
          ...(category && { category }),
        },
        include: {
          currentVersion: {
            include: {
              uploadedBy: {
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
              versions: true,
            },
          },
        },
      });

      // Create activity log if there are changes
      if (changes.length > 0) {
        await tx.activity.create({
          data: {
            projectId: existingDocument.projectId,
            userId: session.user.id,
            type: "document_updated",
            title: `문서 수정: '${updatedDocument.title}'`,
            description: changes.join("\n"),
            metadata: {
              documentId,
              ...metadata,
            },
          },
        });
      }

      return updatedDocument;
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete document (ADMIN only, cascade deletes versions)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ADMIN only
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: ADMIN role required" },
        { status: 403 }
      );
    }

    const { id: documentId } = await params;

    // Find existing document
    const existingDocument = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        category: true,
        projectId: true,
        _count: {
          select: {
            versions: true,
          },
        },
      },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete document and create activity log in transaction
    await prisma.$transaction(async (tx) => {
      // First, we need to clear the currentVersionId to avoid foreign key constraint
      await tx.document.update({
        where: { id: documentId },
        data: { currentVersionId: null },
      });

      // Delete document (versions will be cascade deleted)
      await tx.document.delete({
        where: { id: documentId },
      });

      // Create activity log
      const categoryLabel = CATEGORY_LABELS[existingDocument.category];
      await tx.activity.create({
        data: {
          projectId: existingDocument.projectId,
          userId: session.user.id,
          type: "document_deleted",
          title: `문서 삭제: '${existingDocument.title}'`,
          description: `${categoryLabel} 문서 "${existingDocument.title}"이(가) 삭제되었습니다. (${existingDocument._count.versions}개 버전 포함)`,
          metadata: {
            documentId,
            title: existingDocument.title,
            category: existingDocument.category,
            versionsDeleted: existingDocument._count.versions,
          },
        },
      });
    });

    return NextResponse.json({
      message: "Document deleted successfully",
      documentId,
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
