import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 시스템 기본 태스크 템플릿 데이터
const SYSTEM_TEMPLATES = [
  {
    name: "도급계약",
    sortOrder: 1,
    isPermitTask: false,
    processingDays: null,
    children: [
      { name: "시공사 선정", sortOrder: 1 },
      { name: "계약서 검토", sortOrder: 2 },
      { name: "계약금 지급", sortOrder: 3 },
    ],
  },
  {
    name: "발전사업허가",
    sortOrder: 2,
    isPermitTask: true,
    processingDays: 60,
    children: [
      { name: "입지 검토", sortOrder: 1 },
      { name: "허가 신청서 준비", sortOrder: 2 },
      { name: "신청 및 납부", sortOrder: 3 },
      { name: "허가증 수령", sortOrder: 4 },
    ],
  },
  {
    name: "개발행위허가",
    sortOrder: 3,
    isPermitTask: true,
    processingDays: 14,
    children: [
      { name: "환경/재해 검토", sortOrder: 1 },
      { name: "신청서 제출", sortOrder: 2 },
      { name: "협의 대응", sortOrder: 3 },
      { name: "허가증 수령", sortOrder: 4 },
    ],
  },
  {
    name: "PPA신청",
    sortOrder: 4,
    isPermitTask: false,
    processingDays: null,
    children: [
      { name: "계통 용량 확인", sortOrder: 1 },
      { name: "신청서 제출", sortOrder: 2 },
      { name: "접수증 수령", sortOrder: 3 },
    ],
  },
  {
    name: "공사계획신고",
    sortOrder: 5,
    isPermitTask: true,
    processingDays: 14,
    children: [
      { name: "계획서 작성", sortOrder: 1 },
      { name: "도면 준비", sortOrder: 2 },
      { name: "신고서 제출", sortOrder: 3 },
      { name: "수리 완료", sortOrder: 4 },
    ],
  },
  {
    name: "구조물공사",
    sortOrder: 6,
    isPermitTask: false,
    processingDays: null,
    children: [
      { name: "지반조사", sortOrder: 1 },
      { name: "기초 타설", sortOrder: 2 },
      { name: "구조물 설치", sortOrder: 3 },
      { name: "구조물 검수", sortOrder: 4 },
    ],
  },
  {
    name: "전기공사",
    sortOrder: 7,
    isPermitTask: false,
    processingDays: null,
    children: [
      { name: "모듈 설치", sortOrder: 1 },
      { name: "인버터 설치", sortOrder: 2 },
      { name: "배선 공사", sortOrder: 3 },
      { name: "계통연계", sortOrder: 4 },
      { name: "시운전", sortOrder: 5 },
    ],
  },
  {
    name: "사용전검사",
    sortOrder: 8,
    isPermitTask: true,
    processingDays: 14,
    children: [
      { name: "검사 신청", sortOrder: 1 },
      { name: "현장 검사 대응", sortOrder: 2 },
      { name: "보완 조치", sortOrder: 3 },
      { name: "합격증 수령", sortOrder: 4 },
    ],
  },
  {
    name: "개발행위준공",
    sortOrder: 9,
    isPermitTask: true,
    processingDays: 14,
    children: [
      { name: "준공사진 제출", sortOrder: 1 },
      { name: "준공검사 신청", sortOrder: 2 },
      { name: "현장 검사", sortOrder: 3 },
      { name: "준공필증 수령", sortOrder: 4 },
    ],
  },
  {
    name: "PPA계약",
    sortOrder: 10,
    isPermitTask: false,
    processingDays: null,
    children: [
      { name: "필증 제출", sortOrder: 1 },
      { name: "계약 협의", sortOrder: 2 },
      { name: "계약 체결", sortOrder: 3 },
    ],
  },
  {
    name: "사업개시신고",
    sortOrder: 11,
    isPermitTask: true,
    processingDays: 14,
    children: [
      { name: "신고서 제출", sortOrder: 1 },
      { name: "필증 수령", sortOrder: 2 },
    ],
  },
  {
    name: "설비확인등록",
    sortOrder: 12,
    isPermitTask: false,
    processingDays: null,
    children: [
      { name: "RPS 시스템 신청", sortOrder: 1 },
      { name: "서류 보완", sortOrder: 2 },
      { name: "설비확인서 발급", sortOrder: 3 },
    ],
  },
];

export async function seedSystemTemplates() {
  console.log("Seeding system task templates...");

  // 기존 시스템 템플릿 삭제 (isSystem: true, organizationId: null)
  const deleted = await prisma.taskTemplate.deleteMany({
    where: {
      isSystem: true,
      organizationId: null,
    },
  });
  console.log(`Deleted ${deleted.count} existing system templates`);

  // 새 시스템 템플릿 생성
  for (const template of SYSTEM_TEMPLATES) {
    // 메인 태스크 생성
    const mainTask = await prisma.taskTemplate.create({
      data: {
        name: template.name,
        sortOrder: template.sortOrder,
        isSystem: true,
        organizationId: null,
        parentId: null,
        defaultAlertEnabled: true,
        isPermitTask: template.isPermitTask,
        processingDays: template.processingDays,
      },
    });
    console.log(`Created main task: ${template.name}${template.isPermitTask ? ' (인허가)' : ''}`);

    // 하위 태스크 생성
    for (const child of template.children) {
      await prisma.taskTemplate.create({
        data: {
          name: child.name,
          sortOrder: child.sortOrder,
          isSystem: true,
          organizationId: null,
          parentId: mainTask.id,
          defaultAlertEnabled: true,
        },
      });
    }
    console.log(`  - Created ${template.children.length} subtasks`);
  }

  // 생성된 템플릿 개수 확인
  const totalTemplates = await prisma.taskTemplate.count({
    where: {
      isSystem: true,
      organizationId: null,
    },
  });
  console.log(`\nTotal system templates created: ${totalTemplates}`);

  return totalTemplates;
}

// 직접 실행 시
async function main() {
  try {
    await seedSystemTemplates();
    console.log("\nSystem templates seeded successfully!");
  } catch (error) {
    console.error("Error seeding system templates:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
