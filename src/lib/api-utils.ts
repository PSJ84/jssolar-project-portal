import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * API 에러 응답 헬퍼 함수
 */
export function errorResponse(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * API 성공 응답 헬퍼 함수
 */
export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * 프로젝트 접근 권한 확인
 * @param projectId 프로젝트 ID
 * @param userId 사용자 ID
 * @param role 사용자 역할
 * @returns 접근 가능 여부
 */
export async function checkProjectAccess(
  projectId: string,
  userId: string,
  role: UserRole
): Promise<boolean> {
  // ADMIN은 모든 프로젝트에 접근 가능
  if (role === UserRole.ADMIN) {
    return true;
  }

  // CLIENT는 본인이 멤버인 프로젝트만 접근 가능
  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
  });

  return !!membership;
}

/**
 * 프로젝트 존재 확인
 * @param projectId 프로젝트 ID
 * @returns 프로젝트 존재 여부
 */
export async function projectExists(projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  return !!project;
}

/**
 * 이메일 형식 검증
 * @param email 이메일 주소
 * @returns 유효한 이메일 여부
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 숫자로 변환 (실패시 null 반환)
 * @param value 변환할 값
 * @returns 숫자 또는 null
 */
export function toNumberOrNull(value: any): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

/**
 * Activity 타입 정의
 */
export const ActivityTypes = {
  PROJECT_CREATED: "project_created",
  PROJECT_UPDATED: "project_updated",
  PROJECT_ARCHIVED: "project_archived",
  MEMBER_ADDED: "member_added",
  MEMBER_REMOVED: "member_removed",
  DOCUMENT_UPLOADED: "document_uploaded",
  DOCUMENT_DELETED: "document_deleted",
  PHASE_CHANGED: "phase_changed",
} as const;

export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];
