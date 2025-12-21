import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 하위 태스크 타입 정의
interface ChildTemplate {
  name: string;
  sortOrder: number;
  checklists?: string[];
}

interface MainTemplate {
  name: string;
  sortOrder: number;
  isPermitTask: boolean;
  processingDays: number | null;
  children: ChildTemplate[];
}

// 시스템 기본 태스크 템플릿 데이터
const SYSTEM_TEMPLATES: MainTemplate[] = [
  {
    name: "도급계약",
    sortOrder: 1,
    isPermitTask: false,
    processingDays: null,
    children: [
      { name: "시공사 선정", sortOrder: 1, checklists: ["견적서 수령", "시공 이력 확인", "업체 비교표 작성"] },
      { name: "계약서 검토", sortOrder: 2, checklists: ["계약 조건 검토", "공사범위 확인", "하자보증 조건 확인"] },
      { name: "계약금 지급", sortOrder: 3, checklists: ["계약금 송금", "영수증 수령"] },
    ],
  },
  {
    name: "발전사업허가",
    sortOrder: 2,
    isPermitTask: true,
    processingDays: 60,
    children: [
      { name: "입지 검토", sortOrder: 1, checklists: ["토지이용계획확인원", "지적도", "농지/산지 확인"] },
      {
        name: "서류 준비",
        sortOrder: 2,
        checklists: [
          "개인인감증명서",
          "주민등록등본",
          "가족관계증명서",
          "신원조사동의서",
          "토지등기부등본",
          "건물등기부등본",
          "지적도",
          "토지이용계획확인원",
        ],
      },
      { name: "신청 및 납부", sortOrder: 3, checklists: ["허가 신청서 제출", "수수료 납부", "접수증 수령"] },
      { name: "허가증 수령", sortOrder: 4, checklists: ["허가증 수령", "허가 조건 확인"] },
    ],
  },
  {
    name: "개발행위허가",
    sortOrder: 3,
    isPermitTask: true,
    processingDays: 14,
    children: [
      { name: "환경/재해 검토", sortOrder: 1, checklists: ["환경영향평가", "재해영향평가", "경관심의"] },
      { name: "신청서 제출", sortOrder: 2, checklists: ["개발행위허가 신청서", "사업계획서", "설계도서"] },
      { name: "협의 대응", sortOrder: 3, checklists: ["관계부서 협의", "보완자료 제출"] },
      { name: "허가증 수령", sortOrder: 4, checklists: ["허가증 수령", "허가 조건 이행계획 수립"] },
    ],
  },
  {
    name: "PPA신청",
    sortOrder: 4,
    isPermitTask: false,
    processingDays: null,
    children: [
      { name: "계통 용량 확인", sortOrder: 1, checklists: ["한전 계통여유용량 조회", "변전소 현황 확인"] },
      { name: "신청서 제출", sortOrder: 2, checklists: ["PPA 신청서 작성", "구비서류 첨부", "온라인 접수"] },
      { name: "접수증 수령", sortOrder: 3, checklists: ["접수번호 확인", "예상 소요기간 확인"] },
    ],
  },
  {
    name: "공사계획신고",
    sortOrder: 5,
    isPermitTask: true,
    processingDays: 14,
    children: [
      { name: "계획서 작성", sortOrder: 1, checklists: ["공사계획 신고서", "공사일정표", "안전관리계획"] },
      { name: "도면 준비", sortOrder: 2, checklists: ["단선결선도", "배치도", "구조물 설계도"] },
      { name: "신고서 제출", sortOrder: 3, checklists: ["한국전기안전공사 접수", "수수료 납부"] },
      { name: "수리 완료", sortOrder: 4, checklists: ["수리통보서 수령", "착공 가능일 확인"] },
    ],
  },
  {
    name: "구조물공사",
    sortOrder: 6,
    isPermitTask: false,
    processingDays: null,
    children: [
      { name: "지반조사", sortOrder: 1, checklists: ["지반조사 보고서", "기초설계 검토"] },
      { name: "기초 타설", sortOrder: 2, checklists: ["터파기 완료", "철근 배근", "콘크리트 타설", "양생 확인"] },
      { name: "구조물 설치", sortOrder: 3, checklists: ["지주대 설치", "가대 설치", "볼트 체결 확인"] },
      { name: "구조물 검수", sortOrder: 4, checklists: ["수평/수직 확인", "내풍압 테스트", "검수 사진 촬영"] },
    ],
  },
  {
    name: "전기공사",
    sortOrder: 7,
    isPermitTask: false,
    processingDays: null,
    children: [
      { name: "모듈 설치", sortOrder: 1, checklists: ["모듈 배치", "클램프 고정", "접지 연결"] },
      { name: "인버터 설치", sortOrder: 2, checklists: ["인버터 거치", "DC 배선 연결", "AC 배선 연결"] },
      { name: "배선 공사", sortOrder: 3, checklists: ["케이블 트레이 설치", "배선 포설", "결선 점검"] },
      { name: "계통연계", sortOrder: 4, checklists: ["한전 입회", "전력량계 설치", "연계점 확인"] },
      { name: "시운전", sortOrder: 5, checklists: ["인버터 가동", "출력 테스트", "이상유무 확인"] },
    ],
  },
  {
    name: "사용전검사",
    sortOrder: 8,
    isPermitTask: true,
    processingDays: 14,
    children: [
      { name: "검사 신청", sortOrder: 1, checklists: ["사용전검사 신청서", "시공 완료 사진", "시험성적서"] },
      { name: "현장 검사 대응", sortOrder: 2, checklists: ["검사관 입회", "현장 점검 대응", "서류 비치"] },
      { name: "보완 조치", sortOrder: 3, checklists: ["지적사항 보완", "보완사진 제출"] },
      { name: "합격증 수령", sortOrder: 4, checklists: ["합격증 수령", "사본 보관"] },
    ],
  },
  {
    name: "개발행위준공",
    sortOrder: 9,
    isPermitTask: true,
    processingDays: 14,
    children: [
      { name: "준공사진 제출", sortOrder: 1, checklists: ["공사 전/후 사진", "현황 사진"] },
      { name: "준공검사 신청", sortOrder: 2, checklists: ["준공검사 신청서", "준공도면"] },
      { name: "현장 검사", sortOrder: 3, checklists: ["현장 검사 대응", "지적사항 조치"] },
      { name: "준공필증 수령", sortOrder: 4, checklists: ["준공필증 수령", "원본 보관"] },
    ],
  },
  {
    name: "PPA계약",
    sortOrder: 10,
    isPermitTask: false,
    processingDays: null,
    children: [
      { name: "필증 제출", sortOrder: 1, checklists: ["사용전검사 합격증", "설비확인서", "사업자등록증"] },
      { name: "계약 협의", sortOrder: 2, checklists: ["SMP+REC 조건 확인", "계약 기간 협의"] },
      { name: "계약 체결", sortOrder: 3, checklists: ["계약서 서명", "계약서 사본 수령"] },
    ],
  },
  {
    name: "사업개시신고",
    sortOrder: 11,
    isPermitTask: true,
    processingDays: 14,
    children: [
      { name: "신고서 제출", sortOrder: 1, checklists: ["사업개시 신고서", "설비현황서", "첨부서류"] },
      { name: "필증 수령", sortOrder: 2, checklists: ["사업개시 확인서 수령"] },
    ],
  },
  {
    name: "설비확인등록",
    sortOrder: 12,
    isPermitTask: false,
    processingDays: null,
    children: [
      { name: "RPS 시스템 신청", sortOrder: 1, checklists: ["신재생에너지센터 접속", "설비등록 신청서 제출"] },
      { name: "서류 보완", sortOrder: 2, checklists: ["보완요청 대응", "추가서류 제출"] },
      { name: "설비확인서 발급", sortOrder: 3, checklists: ["설비확인서 수령", "REC 발급 시작"] },
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
    let checklistCount = 0;
    for (const child of template.children) {
      const childTask = await prisma.taskTemplate.create({
        data: {
          name: child.name,
          sortOrder: child.sortOrder,
          isSystem: true,
          organizationId: null,
          parentId: mainTask.id,
          defaultAlertEnabled: true,
        },
      });

      // 체크리스트 템플릿 생성
      if (child.checklists && child.checklists.length > 0) {
        for (let i = 0; i < child.checklists.length; i++) {
          await prisma.checklistTemplate.create({
            data: {
              taskTemplateId: childTask.id,
              name: child.checklists[i],
              sortOrder: i + 1,
            },
          });
        }
        checklistCount += child.checklists.length;
      }
    }
    console.log(`  - Created ${template.children.length} subtasks, ${checklistCount} checklists`);
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
