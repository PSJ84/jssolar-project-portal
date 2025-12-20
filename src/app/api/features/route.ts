import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrganizationFeatures } from '@/lib/features'

// GET /api/features - 현재 사용자 조직의 활성화된 Feature 목록 반환
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자의 organizationId 조회
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    })

    if (!user?.organizationId) {
      return NextResponse.json({ features: [] })
    }

    const features = await getOrganizationFeatures(user.organizationId)

    return NextResponse.json({ features })
  } catch (error) {
    console.error('Error fetching features:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
