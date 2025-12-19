import { Project, ProjectMember, Activity, User, ProjectPhase, ProjectStatus, DocumentCategory } from "@prisma/client";

/**
 * API 에러 응답 타입
 */
export interface ApiErrorResponse {
  error: string;
}

/**
 * 프로젝트 목록 응답 (with counts)
 */
export interface ProjectListItem extends Project {
  _count: {
    members: number;
    documents: number;
  };
}

/**
 * 프로젝트 상세 응답
 */
export interface ProjectDetail extends Project {
  members: (ProjectMember & {
    user: Pick<User, "id" | "name" | "email" | "image"> | null;
  })[];
  activities: (Activity & {
    user: Pick<User, "id" | "name" | "email"> | null;
  })[];
  _count: {
    documents: number;
  };
}

/**
 * 프로젝트 멤버 응답
 */
export interface ProjectMemberWithUser extends ProjectMember {
  user: Pick<User, "id" | "name" | "email" | "image" | "role"> | null;
}

/**
 * 프로젝트 생성 요청
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
  location?: string;
  capacityKw?: number;
}

/**
 * 프로젝트 수정 요청
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  location?: string;
  capacityKw?: number;
  currentPhase?: ProjectPhase;
  progressPercent?: number;
  status?: ProjectStatus;
}

/**
 * 멤버 추가 요청
 */
export interface AddMemberRequest {
  email: string;
  isOwner?: boolean;
}

/**
 * 프로젝트 삭제 응답
 */
export interface DeleteProjectResponse {
  message: string;
  projectId?: string;
  project?: Project;
}

/**
 * 멤버 삭제 응답
 */
export interface RemoveMemberResponse {
  message: string;
  memberId: string;
}
