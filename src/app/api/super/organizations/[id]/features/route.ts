import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, Feature } from "@prisma/client";

// PATCH /api/super/organizations/[id]/features - 기능 토글
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
    const { feature, enabled } = body as { feature: Feature; enabled: boolean };

    if (!feature || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Feature and enabled are required" },
        { status: 400 }
      );
    }

    // Validate feature value
    if (!Object.values(Feature).includes(feature)) {
      return NextResponse.json(
        { error: "Invalid feature" },
        { status: 400 }
      );
    }

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Upsert feature
    const orgFeature = await prisma.organizationFeature.upsert({
      where: {
        organizationId_feature: {
          organizationId: id,
          feature,
        },
      },
      update: { enabled },
      create: {
        organizationId: id,
        feature,
        enabled,
      },
    });

    return NextResponse.json(orgFeature);
  } catch (error) {
    console.error("Error updating feature:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
