import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// GET /api/super/organizations/[id] - 조직 상세
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        features: {
          select: {
            feature: true,
            enabled: true,
          },
        },
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/super/organizations/[id] - 조직 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, slug, plan, sessionMaxDays } = body;

    // Check if organization exists
    const existing = await prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // If slug is being changed, check for duplicates
    if (slug && slug !== existing.slug) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(slug)) {
        return NextResponse.json(
          { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
          { status: 400 }
        );
      }

      const slugExists = await prisma.organization.findUnique({
        where: { slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: "Slug already exists" },
          { status: 409 }
        );
      }
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(plan && { plan }),
        ...(sessionMaxDays !== undefined && { sessionMaxDays }),
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/super/organizations/[id] - 조직 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if organization exists
    const existing = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Prevent deletion if there are users or projects
    if (existing._count.users > 0 || existing._count.projects > 0) {
      return NextResponse.json(
        { error: "Cannot delete organization with users or projects" },
        { status: 400 }
      );
    }

    await prisma.organization.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
