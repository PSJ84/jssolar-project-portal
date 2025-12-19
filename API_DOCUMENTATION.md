# 프로젝트 CRUD API 문서

## 개요

태양광 프로젝트 포털의 프로젝트 관리 REST API입니다. 모든 API는 인증이 필요하며, ADMIN 역할만 생성/수정/삭제가 가능합니다.

## 인증

- NextAuth v5를 사용한 세션 기반 인증
- 각 요청마다 세션 검증
- ADMIN과 CLIENT 역할 구분

## API 엔드포인트

### 1. 프로젝트 목록 조회

**GET** `/api/projects`

프로젝트 목록을 조회합니다.

**권한**
- ADMIN: 모든 프로젝트 조회
- CLIENT: 본인이 멤버로 등록된 프로젝트만 조회

**응답 예시**
```json
[
  {
    "id": "clxxx123456789",
    "name": "서울 태양광 발전소 A",
    "description": "서울시 강남구 태양광 발전소",
    "location": "서울시 강남구",
    "capacityKw": 100.5,
    "currentPhase": "CONSTRUCTION",
    "progressPercent": 45,
    "status": "ACTIVE",
    "createdAt": "2025-01-15T00:00:00.000Z",
    "updatedAt": "2025-01-15T00:00:00.000Z",
    "_count": {
      "members": 3,
      "documents": 12
    }
  }
]
```

**상태 코드**
- 200: 성공
- 401: 인증 필요
- 500: 서버 오류

---

### 2. 프로젝트 생성

**POST** `/api/projects`

새 프로젝트를 생성합니다.

**권한**: ADMIN만 가능

**요청 Body**
```json
{
  "name": "부산 태양광 발전소 B",
  "description": "부산시 해운대구 태양광 발전소",
  "location": "부산시 해운대구",
  "capacityKw": 200.75
}
```

**필수 필드**
- `name`: 프로젝트 이름 (string)

**선택 필드**
- `description`: 프로젝트 설명 (string)
- `location`: 위치 (string)
- `capacityKw`: 발전 용량 (number, kW 단위)

**응답 예시**
```json
{
  "id": "clxxx987654321",
  "name": "부산 태양광 발전소 B",
  "description": "부산시 해운대구 태양광 발전소",
  "location": "부산시 해운대구",
  "capacityKw": 200.75,
  "currentPhase": "CONTRACT",
  "progressPercent": 0,
  "status": "ACTIVE",
  "createdAt": "2025-01-19T00:00:00.000Z",
  "updatedAt": "2025-01-19T00:00:00.000Z",
  "_count": {
    "members": 0,
    "documents": 0
  }
}
```

**상태 코드**
- 201: 생성 성공
- 400: 잘못된 요청 (name 누락)
- 401: 인증 필요
- 403: 권한 없음 (ADMIN 아님)
- 500: 서버 오류

**Activity 로그**
- 프로젝트 생성 시 자동으로 Activity 로그가 생성됩니다.

---

### 3. 프로젝트 상세 조회

**GET** `/api/projects/[id]`

특정 프로젝트의 상세 정보를 조회합니다.

**권한**
- ADMIN: 모든 프로젝트 접근 가능
- CLIENT: 본인이 멤버인 프로젝트만 접근 가능

**응답 예시**
```json
{
  "id": "clxxx123456789",
  "name": "서울 태양광 발전소 A",
  "description": "서울시 강남구 태양광 발전소",
  "location": "서울시 강남구",
  "capacityKw": 100.5,
  "currentPhase": "CONSTRUCTION",
  "progressPercent": 45,
  "status": "ACTIVE",
  "createdAt": "2025-01-15T00:00:00.000Z",
  "updatedAt": "2025-01-15T00:00:00.000Z",
  "members": [
    {
      "id": "mem123",
      "userId": "user123",
      "projectId": "clxxx123456789",
      "invitedEmail": null,
      "isOwner": true,
      "createdAt": "2025-01-15T00:00:00.000Z",
      "user": {
        "id": "user123",
        "name": "김사업주",
        "email": "owner@example.com",
        "image": null
      }
    }
  ],
  "activities": [
    {
      "id": "act123",
      "projectId": "clxxx123456789",
      "userId": "admin123",
      "type": "phase_changed",
      "title": "단계 변경",
      "description": "단계: DESIGN → CONSTRUCTION",
      "metadata": {
        "oldPhase": "DESIGN",
        "newPhase": "CONSTRUCTION"
      },
      "createdAt": "2025-01-18T00:00:00.000Z",
      "user": {
        "id": "admin123",
        "name": "관리자",
        "email": "admin@jssolar.com"
      }
    }
  ],
  "_count": {
    "documents": 12
  }
}
```

**상태 코드**
- 200: 성공
- 401: 인증 필요
- 403: 권한 없음 (해당 프로젝트 접근 불가)
- 404: 프로젝트 없음
- 500: 서버 오류

---

### 4. 프로젝트 수정

**PATCH** `/api/projects/[id]`

프로젝트 정보를 수정합니다.

**권한**: ADMIN만 가능

**요청 Body**
```json
{
  "name": "서울 태양광 발전소 A (수정)",
  "description": "업데이트된 설명",
  "location": "서울시 강남구 역삼동",
  "capacityKw": 105.0,
  "currentPhase": "COMPLETION",
  "progressPercent": 100,
  "status": "COMPLETED"
}
```

**모든 필드 선택 사항**
- `name`: 프로젝트 이름
- `description`: 설명
- `location`: 위치
- `capacityKw`: 발전 용량
- `currentPhase`: 현재 단계 (CONTRACT, PERMIT, DESIGN, CONSTRUCTION, COMPLETION)
- `progressPercent`: 진행률 (0-100)
- `status`: 상태 (ACTIVE, COMPLETED, ARCHIVED)

**응답 예시**
```json
{
  "id": "clxxx123456789",
  "name": "서울 태양광 발전소 A (수정)",
  "description": "업데이트된 설명",
  "location": "서울시 강남구 역삼동",
  "capacityKw": 105.0,
  "currentPhase": "COMPLETION",
  "progressPercent": 100,
  "status": "COMPLETED",
  "createdAt": "2025-01-15T00:00:00.000Z",
  "updatedAt": "2025-01-19T00:00:00.000Z",
  "_count": {
    "members": 3,
    "documents": 12
  }
}
```

**상태 코드**
- 200: 수정 성공
- 401: 인증 필요
- 403: 권한 없음 (ADMIN 아님)
- 404: 프로젝트 없음
- 500: 서버 오류

**Activity 로그**
- 변경 사항이 있을 때마다 자동으로 Activity 로그가 생성됩니다.
- 변경된 필드만 로그에 기록됩니다.

---

### 5. 프로젝트 삭제

**DELETE** `/api/projects/[id]?hard=false`

프로젝트를 삭제합니다.

**권한**: ADMIN만 가능

**Query Parameters**
- `hard`: (선택) `true`이면 하드 삭제, 그 외는 소프트 삭제 (기본값: false)

**소프트 삭제 (기본)**
- 프로젝트 상태를 `ARCHIVED`로 변경
- 데이터는 보존되며 목록에서만 숨김

**하드 삭제 (`?hard=true`)**
- 프로젝트와 관련된 모든 데이터를 실제로 삭제
- 복구 불가능

**응답 예시 (소프트 삭제)**
```json
{
  "message": "Project archived",
  "project": {
    "id": "clxxx123456789",
    "status": "ARCHIVED",
    ...
  }
}
```

**응답 예시 (하드 삭제)**
```json
{
  "message": "Project permanently deleted",
  "projectId": "clxxx123456789"
}
```

**상태 코드**
- 200: 삭제 성공
- 401: 인증 필요
- 403: 권한 없음 (ADMIN 아님)
- 404: 프로젝트 없음
- 500: 서버 오류

---

### 6. 프로젝트 멤버 목록 조회

**GET** `/api/projects/[id]/members`

프로젝트의 멤버 목록을 조회합니다.

**권한**
- ADMIN: 모든 프로젝트의 멤버 조회 가능
- CLIENT: 본인이 멤버인 프로젝트만 조회 가능

**응답 예시**
```json
[
  {
    "id": "mem123",
    "userId": "user123",
    "projectId": "clxxx123456789",
    "invitedEmail": null,
    "isOwner": true,
    "createdAt": "2025-01-15T00:00:00.000Z",
    "updatedAt": "2025-01-15T00:00:00.000Z",
    "user": {
      "id": "user123",
      "name": "김사업주",
      "email": "owner@example.com",
      "image": null,
      "role": "CLIENT"
    }
  },
  {
    "id": "mem456",
    "userId": null,
    "projectId": "clxxx123456789",
    "invitedEmail": "invited@example.com",
    "isOwner": false,
    "createdAt": "2025-01-16T00:00:00.000Z",
    "updatedAt": "2025-01-16T00:00:00.000Z",
    "user": null
  }
]
```

**상태 코드**
- 200: 성공
- 401: 인증 필요
- 403: 권한 없음
- 500: 서버 오류

---

### 7. 프로젝트 멤버 초대

**POST** `/api/projects/[id]/members`

프로젝트에 멤버를 추가합니다.

**권한**: ADMIN만 가능

**요청 Body**
```json
{
  "email": "newmember@example.com",
  "isOwner": false
}
```

**필수 필드**
- `email`: 초대할 사용자의 이메일 (string)

**선택 필드**
- `isOwner`: 사업주 여부 (boolean, 기본값: false)

**동작 방식**
1. 해당 이메일로 가입된 User가 있으면 → `userId` 연결
2. 없으면 → `invitedEmail`로 저장 (나중에 가입 시 자동 연결)

**응답 예시**
```json
{
  "id": "mem789",
  "userId": "user789",
  "projectId": "clxxx123456789",
  "invitedEmail": null,
  "isOwner": false,
  "createdAt": "2025-01-19T00:00:00.000Z",
  "updatedAt": "2025-01-19T00:00:00.000Z",
  "user": {
    "id": "user789",
    "name": "이클라이언트",
    "email": "newmember@example.com",
    "image": null,
    "role": "CLIENT"
  }
}
```

**상태 코드**
- 201: 멤버 추가 성공
- 400: 잘못된 요청 (이메일 누락 또는 형식 오류)
- 401: 인증 필요
- 403: 권한 없음 (ADMIN 아님)
- 404: 프로젝트 없음
- 409: 이미 멤버임
- 500: 서버 오류

**Activity 로그**
- 멤버 추가 시 자동으로 Activity 로그가 생성됩니다.

---

### 8. 프로젝트 멤버 제거

**DELETE** `/api/projects/[id]/members?memberId=mem123`

프로젝트에서 멤버를 제거합니다.

**권한**: ADMIN만 가능

**Query Parameters**
- `memberId`: (필수) 제거할 멤버의 ID

**응답 예시**
```json
{
  "message": "Member removed successfully",
  "memberId": "mem123"
}
```

**상태 코드**
- 200: 제거 성공
- 400: 잘못된 요청 (memberId 누락 또는 프로젝트 불일치)
- 401: 인증 필요
- 403: 권한 없음 (ADMIN 아님)
- 404: 멤버 없음
- 500: 서버 오류

**Activity 로그**
- 멤버 제거 시 자동으로 Activity 로그가 생성됩니다.

---

## Enums

### ProjectPhase
```typescript
enum ProjectPhase {
  CONTRACT      // 계약
  PERMIT        // 인허가
  DESIGN        // 설계
  CONSTRUCTION  // 시공
  COMPLETION    // 준공
}
```

### ProjectStatus
```typescript
enum ProjectStatus {
  ACTIVE      // 진행 중
  COMPLETED   // 완료
  ARCHIVED    // 아카이브됨
}
```

### UserRole
```typescript
enum UserRole {
  ADMIN   // 관리자 - 전체 권한
  CLIENT  // 클라이언트 - 읽기 전용
}
```

---

## Activity 타입

프로젝트의 모든 변경 사항은 Activity 로그로 기록됩니다.

**Activity Types**
- `project_created`: 프로젝트 생성
- `project_updated`: 프로젝트 정보 변경
- `project_archived`: 프로젝트 아카이브
- `member_added`: 멤버 추가
- `member_removed`: 멤버 제거
- `phase_changed`: 단계 변경
- `document_uploaded`: 문서 업로드 (향후 구현)
- `document_deleted`: 문서 삭제 (향후 구현)

---

## 에러 처리

모든 API는 다음과 같은 형식의 에러를 반환합니다:

```json
{
  "error": "에러 메시지"
}
```

**공통 에러 코드**
- 401: 인증되지 않음 (로그인 필요)
- 403: 권한 없음 (역할 부족)
- 404: 리소스를 찾을 수 없음
- 500: 서버 내부 오류

---

## 사용 예시

### 프로젝트 생성 및 멤버 초대 플로우

```javascript
// 1. 프로젝트 생성 (ADMIN)
const createProject = await fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: '제주 태양광 발전소',
    location: '제주시',
    capacityKw: 150
  })
});
const project = await createProject.json();

// 2. 멤버 초대 (ADMIN)
const addMember = await fetch(`/api/projects/${project.id}/members`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'client@example.com',
    isOwner: true
  })
});

// 3. 프로젝트 진행 상황 업데이트 (ADMIN)
const updateProject = await fetch(`/api/projects/${project.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentPhase: 'CONSTRUCTION',
    progressPercent: 50
  })
});

// 4. 클라이언트가 자신의 프로젝트 조회 (CLIENT)
const myProjects = await fetch('/api/projects');
const projects = await myProjects.json();
```

---

## 파일 구조

```
src/
├── app/
│   └── api/
│       └── projects/
│           ├── route.ts                    # GET (목록), POST (생성)
│           └── [id]/
│               ├── route.ts                # GET (상세), PATCH (수정), DELETE (삭제)
│               └── members/
│                   └── route.ts            # GET, POST, DELETE (멤버 관리)
├── lib/
│   ├── auth.ts                            # NextAuth 설정
│   ├── prisma.ts                          # Prisma 클라이언트
│   └── api-utils.ts                       # API 유틸리티 함수
└── types/
    ├── api.ts                             # API 타입 정의
    └── next-auth.d.ts                     # NextAuth 타입 확장
```

---

## 테스트

Prisma Studio를 사용하여 데이터를 확인할 수 있습니다:

```bash
npx prisma studio
```

또는 REST 클라이언트(Postman, Thunder Client 등)를 사용하여 API를 테스트하세요.

---

## 다음 단계

- [ ] 문서 CRUD API 구현
- [ ] 파일 업로드 기능 구현
- [ ] 알림 시스템 구현
- [ ] API Rate Limiting 추가
- [ ] API 테스트 코드 작성
