import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

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

// GET /api/documents/[id]/versions - List all versions of a document
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

    // Find document to get projectId for access check
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        projectId: true,
        title: true,
        currentVersionId: true,
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

    // Fetch all versions
    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
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
    });

    // Add isCurrent flag to each version
    const versionsWithCurrent = versions.map((version) => ({
      ...version,
      isCurrent: version.id === document.currentVersionId,
    }));

    return NextResponse.json({
      documentId: document.id,
      documentTitle: document.title,
      versions: versionsWithCurrent,
    });
  } catch (error) {
    console.error("Error fetching document versions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/documents/[id]/versions - Add new version (ADMIN only)
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

    const { id: documentId } = await params;
    const body = await request.json();
    const { fileUrl, fileName, fileSizeBytes, mimeType, note } = body;

    // Validate required fields
    if (!fileUrl || !fileName) {
      return NextResponse.json(
        { error: "Missing required fields: fileUrl, fileName" },
        { status: 400 }
      );
    }

    // Find document with latest version
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        versions: {
          orderBy: {
            versionNumber: "desc",
          },
          take: 1,
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Calculate next version number
    const latestVersion = document.versions[0];
    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Create new version and update document in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create new version
      const newVersion = await tx.documentVersion.create({
        data: {
          documentId,
          versionNumber: nextVersionNumber,
          fileUrl,
          fileName,
          fileSizeBytes: fileSizeBytes || null,
          mimeType: mimeType || null,
          note: note || null,
          uploadedById: session.user.id,
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update document's currentVersionId
      await tx.document.update({
        where: { id: documentId },
        data: { currentVersionId: newVersion.id },
      });

      // Create activity log
      await tx.activity.create({
        data: {
          projectId: document.projectId,
          userId: session.user.id,
          type: "document_version_added",
          title: `문서 업데이트: '${document.title}' v${nextVersionNumber}`,
          description: note || null,
          metadata: {
            documentId,
            versionId: newVersion.id,
            versionNumber: nextVersionNumber,
            fileName,
          },
        },
      });

      return newVersion;
    });

    return NextResponse.json(
      {
        ...result,
        isCurrent: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating document version:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
