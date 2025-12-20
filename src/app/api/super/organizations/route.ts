import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { initializeOrganizationFeatures } from "@/lib/features";

// GET /api/super/organizations - 전체 조직 목록
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/super/organizations - 새 조직 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, plan = "BASIC" } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: "슬러그는 영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 409 }
      );
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        plan,
      },
    });

    // Initialize features based on plan
    await initializeOrganizationFeatures(organization.id, plan);

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
