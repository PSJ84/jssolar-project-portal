import { PrismaClient, TaskType, TaskStatus, Plan, Feature } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Default task order for new projects
const DEFAULT_TASK_ORDER: TaskType[] = [
  "SITE_SURVEY",
  "BUSINESS_PERMIT",
  "DEVELOPMENT_PERMIT",
  "CONTRACT",
  "STRUCTURE_DRAWING",
  "ELECTRICAL_DRAWING",
  "CONSTRUCTION_PLAN",
  "PPA_APPLICATION",
  "PRE_USE_INSPECTION",
  "DEVELOPMENT_COMPLETION",
  "BUSINESS_START",
  "FACILITY_CONFIRM",
];

async function main() {
  console.log('Starting seed...');

  // ==================== Organization ====================
  let organization = await prisma.organization.findUnique({
    where: { slug: 'js-solar' },
  });

  if (organization) {
    console.log('Organization already exists:', organization.name);
  } else {
    organization = await prisma.organization.create({
      data: {
        name: 'JS Solar',
        slug: 'js-solar',
        plan: Plan.ENTERPRISE,
        sessionMaxDays: 60,
      },
    });
    // Enable all features
    const allFeatures = Object.values(Feature);
    await prisma.organizationFeature.createMany({
      data: allFeatures.map((feature) => ({
        organizationId: organization!.id,
        feature,
        enabled: true,
      })),
    });
    console.log('Organization created:', organization.name);
  }

  // ==================== Admin User ====================
  let admin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (admin) {
    console.log('Admin user already exists:', admin.username);
  } else {
    const adminHashedPassword = await bcrypt.hash('admin123', 10);
    admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@jssolar.kr',
        password: adminHashedPassword,
        name: 'JS Solar Admin',
        role: 'SUPER_ADMIN',
        organizationId: organization.id,
        emailVerified: new Date(),
      },
    });
    console.log('Admin user created:', admin.username);
  }

  // ==================== Test Client User ====================
  let testClient = await prisma.user.findUnique({
    where: { username: 'client' },
  });

  if (testClient) {
    console.log('Test client user already exists:', testClient.username);
  } else {
    const clientHashedPassword = await bcrypt.hash('client123', 10);
    testClient = await prisma.user.create({
      data: {
        username: 'client',
        email: 'client@test.com',
        password: clientHashedPassword,
        name: '테스트 고객',
        role: 'CLIENT',
        organizationId: organization.id,
        emailVerified: new Date(),
      },
    });
    console.log('Test client user created:', testClient.username);
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
        progressPercent: 0, // Will be updated when tasks are created
        status: 'ACTIVE',
        organizationId: organization.id,
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

  // ==================== Sample Documents ====================
  const existingDoc = await prisma.document.findFirst({
    where: { projectId: sampleProject.id },
  });

  if (!existingDoc) {
    // 1. 계약서 문서
    const contractDoc = await prisma.document.create({
      data: {
        projectId: sampleProject.id,
        category: 'CONTRACT',
        title: '태양광 설치 계약서',
        description: '100kW 태양광 발전소 설치 공사 계약서',
      },
    });
    const contractVersion = await prisma.documentVersion.create({
      data: {
        documentId: contractDoc.id,
        versionNumber: 1,
        fileUrl: 'https://drive.google.com/file/d/example-contract',
        fileName: '태양광설치계약서_v1.pdf',
        uploadedById: admin.id,
        note: '최초 계약서 업로드',
      },
    });
    await prisma.document.update({
      where: { id: contractDoc.id },
      data: { currentVersionId: contractVersion.id },
    });
    console.log('Contract document created');

    // 2. 인허가 문서 1
    const permit1Doc = await prisma.document.create({
      data: {
        projectId: sampleProject.id,
        category: 'PERMIT',
        title: '발전사업허가증',
        description: '전기사업법에 따른 발전사업허가증',
      },
    });
    const permit1Version = await prisma.documentVersion.create({
      data: {
        documentId: permit1Doc.id,
        versionNumber: 1,
        fileUrl: 'https://drive.google.com/file/d/example-permit1',
        fileName: '발전사업허가증.pdf',
        uploadedById: admin.id,
      },
    });
    await prisma.document.update({
      where: { id: permit1Doc.id },
      data: { currentVersionId: permit1Version.id },
    });
    console.log('Permit document 1 created');

    // 3. 인허가 문서 2
    const permit2Doc = await prisma.document.create({
      data: {
        projectId: sampleProject.id,
        category: 'PERMIT',
        title: '개발행위허가서',
        description: '국토계획법에 따른 개발행위허가서',
      },
    });
    const permit2Version = await prisma.documentVersion.create({
      data: {
        documentId: permit2Doc.id,
        versionNumber: 1,
        fileUrl: 'https://drive.google.com/file/d/example-permit2',
        fileName: '개발행위허가서.pdf',
        uploadedById: admin.id,
      },
    });
    await prisma.document.update({
      where: { id: permit2Doc.id },
      data: { currentVersionId: permit2Version.id },
    });
    console.log('Permit document 2 created');

    // 4. 도면 문서 (버전 2개)
    const drawingDoc = await prisma.document.create({
      data: {
        projectId: sampleProject.id,
        category: 'DRAWING',
        title: '단선결선도',
        description: '태양광 발전 시스템 단선결선도',
      },
    });
    const drawingVersion1 = await prisma.documentVersion.create({
      data: {
        documentId: drawingDoc.id,
        versionNumber: 1,
        fileUrl: 'https://drive.google.com/file/d/example-drawing-v1',
        fileName: '단선결선도_v1.dwg',
        uploadedById: admin.id,
        note: '초안 도면',
      },
    });
    const drawingVersion2 = await prisma.documentVersion.create({
      data: {
        documentId: drawingDoc.id,
        versionNumber: 2,
        fileUrl: 'https://drive.google.com/file/d/example-drawing-v2',
        fileName: '단선결선도_v2.dwg',
        uploadedById: admin.id,
        note: '인버터 용량 수정',
      },
    });
    await prisma.document.update({
      where: { id: drawingDoc.id },
      data: { currentVersionId: drawingVersion2.id },
    });
    console.log('Drawing document created with 2 versions');

    // Activity logs for documents
    await prisma.activity.createMany({
      data: [
        {
          projectId: sampleProject.id,
          userId: admin.id,
          type: 'document_added',
          title: '문서 추가: 계약서 \'태양광 설치 계약서\'',
        },
        {
          projectId: sampleProject.id,
          userId: admin.id,
          type: 'document_added',
          title: '문서 추가: 인허가 \'발전사업허가증\'',
        },
        {
          projectId: sampleProject.id,
          userId: admin.id,
          type: 'document_added',
          title: '문서 추가: 인허가 \'개발행위허가서\'',
        },
        {
          projectId: sampleProject.id,
          userId: admin.id,
          type: 'document_added',
          title: '문서 추가: 도면 \'단선결선도\'',
        },
        {
          projectId: sampleProject.id,
          userId: admin.id,
          type: 'document_updated',
          title: '문서 업데이트: \'단선결선도\' v2',
          description: '인버터 용량 수정',
        },
      ],
    });
    console.log('Document activity logs created');
  } else {
    console.log('Sample documents already exist');
  }

  // ==================== Sample Tasks ====================
  const existingTasks = await prisma.projectTask.findFirst({
    where: { projectId: sampleProject.id },
  });

  if (!existingTasks) {
    // Create tasks with varied statuses for testing
    const taskStatuses: Record<TaskType, { status: TaskStatus; completedAt?: Date }> = {
      SITE_SURVEY: { status: 'COMPLETED', completedAt: new Date('2024-01-15') },
      BUSINESS_PERMIT: { status: 'COMPLETED', completedAt: new Date('2024-02-20') },
      DEVELOPMENT_PERMIT: { status: 'COMPLETED', completedAt: new Date('2024-03-10') },
      CONTRACT: { status: 'COMPLETED', completedAt: new Date('2024-03-25') },
      STRUCTURE_DRAWING: { status: 'IN_PROGRESS' },
      ELECTRICAL_DRAWING: { status: 'IN_PROGRESS' },
      CONSTRUCTION_PLAN: { status: 'SUBMITTED' },
      CONSTRUCTION: { status: 'NOT_STARTED' },
      PPA_APPLICATION: { status: 'NOT_STARTED' },
      PRE_USE_INSPECTION: { status: 'NOT_STARTED' },
      DEVELOPMENT_COMPLETION: { status: 'NOT_STARTED' },
      BUSINESS_START: { status: 'NOT_STARTED' },
      FACILITY_CONFIRM: { status: 'NOT_STARTED' },
      CUSTOM: { status: 'NOT_STARTED' },
    };

    const tasksData = DEFAULT_TASK_ORDER.map((taskType, index) => ({
      projectId: sampleProject.id,
      taskType,
      status: taskStatuses[taskType].status,
      displayOrder: index,
      completedAt: taskStatuses[taskType].completedAt || null,
      note: taskType === 'STRUCTURE_DRAWING' ? '구조검토 진행 중 - 2주 내 완료 예정' : null,
    }));

    await prisma.projectTask.createMany({
      data: tasksData,
    });

    // Update project progress based on completed tasks (4 out of 12 = 33%)
    const completedCount = Object.values(taskStatuses).filter(
      (t) => t.status === 'COMPLETED'
    ).length;
    const progressPercent = Math.round((completedCount / DEFAULT_TASK_ORDER.length) * 100);

    await prisma.project.update({
      where: { id: sampleProject.id },
      data: { progressPercent },
    });

    // Add activity logs for task completions
    await prisma.activity.createMany({
      data: [
        {
          projectId: sampleProject.id,
          userId: admin.id,
          type: 'task_status_changed',
          title: "현장실측/조사 상태를 '완료'(으)로 변경",
          createdAt: new Date('2024-01-15'),
        },
        {
          projectId: sampleProject.id,
          userId: admin.id,
          type: 'task_status_changed',
          title: "발전사업허가 상태를 '완료'(으)로 변경",
          createdAt: new Date('2024-02-20'),
        },
        {
          projectId: sampleProject.id,
          userId: admin.id,
          type: 'task_status_changed',
          title: "개발행위허가 상태를 '완료'(으)로 변경",
          createdAt: new Date('2024-03-10'),
        },
        {
          projectId: sampleProject.id,
          userId: admin.id,
          type: 'task_status_changed',
          title: "도급계약 상태를 '완료'(으)로 변경",
          createdAt: new Date('2024-03-25'),
        },
      ],
    });

    console.log('Sample tasks created with progress:', progressPercent + '%');
  } else {
    console.log('Sample tasks already exist');
  }

  // ==================== Task Templates ====================
  const existingTemplate = await prisma.taskTemplate.findFirst({
    where: { isSystem: true, parentId: null },
  });

  if (!existingTemplate) {
    // 시스템 기본 템플릿 생성
    const templates = [
      { name: '도급계약', sortOrder: 0, isPermitTask: false, processingDays: null },
      { name: '발전사업허가', sortOrder: 1, isPermitTask: true, processingDays: 14 },
      { name: '개발행위허가', sortOrder: 2, isPermitTask: true, processingDays: 14 },
      { name: 'PPA신청', sortOrder: 3, isPermitTask: true, processingDays: 7 },
      { name: '공사계획신고', sortOrder: 4, isPermitTask: true, processingDays: 14 },
      { name: '구조물공사', sortOrder: 5, isPermitTask: false, processingDays: null },
      { name: '전기공사', sortOrder: 6, isPermitTask: false, processingDays: null },
      { name: '사용전검사', sortOrder: 7, isPermitTask: true, processingDays: 7 },
      { name: '개발행위준공', sortOrder: 8, isPermitTask: true, processingDays: 7 },
      { name: 'PPA계약', sortOrder: 9, isPermitTask: false, processingDays: null },
      { name: '사업개시신고', sortOrder: 10, isPermitTask: true, processingDays: 7 },
      { name: '설비확인등록', sortOrder: 11, isPermitTask: true, processingDays: 14 },
    ];

    for (const template of templates) {
      const mainTask = await prisma.taskTemplate.create({
        data: {
          name: template.name,
          sortOrder: template.sortOrder,
          isSystem: true,
          isPermitTask: template.isPermitTask,
          processingDays: template.processingDays,
        },
      });

      // 인허가 단계면 기본 하위 태스크 추가
      if (template.isPermitTask) {
        await prisma.taskTemplate.createMany({
          data: [
            { name: '서류 준비', sortOrder: 0, parentId: mainTask.id, isSystem: true },
            { name: '신청/접수', sortOrder: 1, parentId: mainTask.id, isSystem: true },
            { name: '보완 대응', sortOrder: 2, parentId: mainTask.id, isSystem: true },
          ],
        });
      }
    }
    console.log('Task templates created');
  } else {
    console.log('Task templates already exist');
  }

  // ==================== SystemConfig (견적/수익분석 설정) ====================
  const systemConfigDefaults = [
    { key: 'SMP_PRICE', value: '120', description: 'SMP 단가 (원/kWh)' },
    { key: 'REC_PRICE', value: '40000', description: 'REC 단가 (원/REC)' },
    { key: 'REC_WEIGHT', value: '1.0', description: 'REC 가중치' },
    { key: 'PEAK_HOURS', value: '3.7', description: '피크시간 (시간/일)' },
    { key: 'DEGRADATION_RATE', value: '0.008', description: '연간 효율저하율' },
    { key: 'MAINTENANCE_COST', value: '500000', description: '안전관리비 (원/년)' },
    { key: 'MONITORING_COST', value: '300000', description: '모니터링비 (원/년)' },
    { key: 'QUOTATION_VALID_DAYS', value: '30', description: '견적서 유효기간 (일)' },
  ];

  for (const config of systemConfigDefaults) {
    const existing = await prisma.systemConfig.findUnique({
      where: { key: config.key },
    });
    if (!existing) {
      await prisma.systemConfig.create({ data: config });
      console.log(`SystemConfig created: ${config.key} = ${config.value}`);
    }
  }

  // ==================== Update existing Tasks with permit flags ====================
  const permitTaskNames = [
    '발전사업허가', '개발행위허가', 'PPA신청', '공사계획신고',
    '사용전검사', '개발행위준공', '사업개시신고', '설비확인등록'
  ];

  const processingDaysMap: Record<string, number> = {
    '발전사업허가': 14,
    '개발행위허가': 14,
    'PPA신청': 7,
    '공사계획신고': 14,
    '사용전검사': 7,
    '개발행위준공': 7,
    '사업개시신고': 7,
    '설비확인등록': 14,
  };

  // 기존 태스크 업데이트
  for (const name of permitTaskNames) {
    const result = await prisma.task.updateMany({
      where: { name, isPermitTask: false },
      data: {
        isPermitTask: true,
        processingDays: processingDaysMap[name] || 14,
      },
    });
    if (result.count > 0) {
      console.log(`Updated ${result.count} tasks with name "${name}" to permit task`);
    }
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
