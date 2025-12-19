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

// GET /api/projects/[id]/documents - List all documents for a project
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
    const hasAccess = await checkProjectAccess(
      projectId,
      userId,
      role as UserRole
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: No access to this project" },
        { status: 403 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get optional category filter from query params
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get("category") as DocumentCategory | null;

    // Fetch documents with current version
    const documents = await prisma.document.findMany({
      where: {
        projectId,
        ...(categoryFilter && { category: categoryFilter }),
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
      orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/documents - Create new document with first version (ADMIN only)
export async function POST(
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

    const { id: projectId } = await params;
    const body = await request.json();
    const { title, category, description, fileUrl, fileName, fileSizeBytes, mimeType, note } =
      body;

    // Validate required fields
    if (!title || !category || !fileUrl || !fileName) {
      return NextResponse.json(
        { error: "Missing required fields: title, category, fileUrl, fileName" },
        { status: 400 }
      );
    }

    // Validate category
    if (!Object.values(DocumentCategory).includes(category)) {
      return NextResponse.json(
        { error: "Invalid document category" },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create document with first version in a transaction
    const document = await prisma.$transaction(async (tx) => {
      // Create document first (without currentVersionId)
      const newDocument = await tx.document.create({
        data: {
          projectId,
          title,
          category,
          description: description || null,
        },
      });

      // Create first version
      const version = await tx.documentVersion.create({
        data: {
          documentId: newDocument.id,
          versionNumber: 1,
          fileUrl,
          fileName,
          fileSizeBytes: fileSizeBytes || null,
          mimeType: mimeType || null,
          note: note || null,
          uploadedById: session.user.id,
        },
      });

      // Update document with currentVersionId
      const updatedDocument = await tx.document.update({
        where: { id: newDocument.id },
        data: { currentVersionId: version.id },
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

      // Create activity log
      const categoryLabel = CATEGORY_LABELS[category as DocumentCategory];
      await tx.activity.create({
        data: {
          projectId,
          userId: session.user.id,
          type: "document_created",
          title: `문서 추가: ${categoryLabel} '${title}'`,
          description: description || null,
          metadata: {
            documentId: newDocument.id,
            category,
            fileName,
            versionNumber: 1,
          },
        },
      });

      return updatedDocument;
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
