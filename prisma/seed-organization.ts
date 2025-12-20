import { PrismaClient, Plan, Feature, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting organization migration...')

  // 1. Create JS Solar organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'js-solar' },
    update: {},
    create: {
      name: 'JS Solar',
      slug: 'js-solar',
      plan: Plan.ENTERPRISE,
      sessionMaxDays: 60,
    },
  })
  console.log(`Created organization: ${organization.name} (${organization.id})`)

  // 2. Enable all features for JS Solar
  const allFeatures = Object.values(Feature)
  for (const feature of allFeatures) {
    await prisma.organizationFeature.upsert({
      where: {
        organizationId_feature: {
          organizationId: organization.id,
          feature: feature,
        },
      },
      update: { enabled: true },
      create: {
        organizationId: organization.id,
        feature: feature,
        enabled: true,
      },
    })
  }
  console.log(`Enabled ${allFeatures.length} features for ${organization.name}`)

  // 3. Update all existing users to belong to JS Solar
  const userUpdateResult = await prisma.user.updateMany({
    where: { organizationId: null },
    data: { organizationId: organization.id },
  })
  console.log(`Updated ${userUpdateResult.count} users to belong to ${organization.name}`)

  // 4. Update all existing projects without organization to belong to JS Solar
  // Note: organizationId is now required, this handles legacy data migration
  const projectsWithoutOrg = await prisma.project.findMany({
    where: {
      NOT: {
        organizationId: organization.id,
      },
    },
  })
  if (projectsWithoutOrg.length > 0) {
    const projectUpdateResult = await prisma.project.updateMany({
      where: {
        id: { in: projectsWithoutOrg.map((p) => p.id) },
      },
      data: { organizationId: organization.id },
    })
    console.log(`Updated ${projectUpdateResult.count} projects to belong to ${organization.name}`)
  } else {
    console.log(`All projects already belong to an organization`)
  }

  // 5. Promote ADMIN users to SUPER_ADMIN
  const adminUpdateResult = await prisma.user.updateMany({
    where: { role: UserRole.ADMIN },
    data: { role: UserRole.SUPER_ADMIN },
  })
  console.log(`Promoted ${adminUpdateResult.count} ADMIN users to SUPER_ADMIN`)

  // Summary
  const users = await prisma.user.findMany({
    select: { username: true, name: true, role: true, organizationId: true },
  })
  console.log('\n--- User Summary ---')
  users.forEach((user) => {
    console.log(`  ${user.username} (${user.name}): ${user.role}`)
  })

  const projects = await prisma.project.findMany({
    select: { name: true, organizationId: true },
  })
  console.log('\n--- Project Summary ---')
  projects.forEach((project) => {
    console.log(`  ${project.name}: org=${project.organizationId}`)
  })

  console.log('\nOrganization migration completed successfully!')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
