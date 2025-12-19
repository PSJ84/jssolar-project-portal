import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // ==================== Admin User ====================
  let admin = await prisma.user.findUnique({
    where: { email: 'admin@jssolar.kr' },
  });

  if (admin) {
    console.log('Admin user already exists:', admin.email);
  } else {
    const adminHashedPassword = await bcrypt.hash('admin123', 10);
    admin = await prisma.user.create({
      data: {
        email: 'admin@jssolar.kr',
        password: adminHashedPassword,
        name: 'JS Solar Admin',
        role: 'ADMIN',
        emailVerified: new Date(),
      },
    });
    console.log('Admin user created:', admin.email);
  }

  // ==================== Test Client User ====================
  let testClient = await prisma.user.findUnique({
    where: { email: 'client@test.com' },
  });

  if (testClient) {
    console.log('Test client user already exists:', testClient.email);
  } else {
    const clientHashedPassword = await bcrypt.hash('client123', 10);
    testClient = await prisma.user.create({
      data: {
        email: 'client@test.com',
        password: clientHashedPassword,
        name: '테스트 고객',
        role: 'CLIENT',
        emailVerified: new Date(),
      },
    });
    console.log('Test client user created:', testClient.email);
  }

  // ==================== Sample Project ====================
  let sampleProject = await prisma.project.findFirst({
    where: { name: '김포 태양광 발전소' },
  });

  if (sampleProject) {
    console.log('Sample project already exists:', sampleProject.name);
  } else {
    sampleProject = await prisma.project.create({
      data: {
        name: '김포 태양광 발전소',
        description: '김포시 소재 100kW급 태양광 발전소 시공 프로젝트',
        location: '경기도 김포시',
        capacityKw: 100,
        currentPhase: 'PERMIT',
        progressPercent: 25,
        status: 'ACTIVE',
      },
    });
    console.log('Sample project created:', sampleProject.name);
  }

  // ==================== Project Member (Link Client to Project) ====================
  const existingMembership = await prisma.projectMember.findFirst({
    where: {
      userId: testClient.id,
      projectId: sampleProject.id,
    },
  });

  if (existingMembership) {
    console.log('Project membership already exists for test client');
  } else {
    const membership = await prisma.projectMember.create({
      data: {
        userId: testClient.id,
        projectId: sampleProject.id,
        isOwner: true,
      },
    });
    console.log('Project membership created:', membership.id);
  }

  // ==================== Activity Log ====================
  const existingActivity = await prisma.activity.findFirst({
    where: {
      projectId: sampleProject.id,
      type: 'project_created',
    },
  });

  if (!existingActivity) {
    await prisma.activity.create({
      data: {
        projectId: sampleProject.id,
        userId: admin.id,
        type: 'project_created',
        title: '프로젝트 생성',
        description: '김포 태양광 발전소 프로젝트가 생성되었습니다.',
      },
    });
    console.log('Initial activity log created');
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
