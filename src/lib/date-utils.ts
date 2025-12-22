/**
 * D-day 계산 유틸리티
 */

export interface DdayResult {
  label: string;
  variant: "destructive" | "default" | "secondary" | "outline";
  days: number; // 남은 일수 (음수면 지남)
}

/**
 * 마감일 기준 D-day 계산
 * @param dueDate 마감일
 * @returns D-day 정보 또는 null (마감일이 없는 경우)
 */
export function getDday(dueDate: Date | string | null): DdayResult | null {
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    // 지남
    return { label: `D+${Math.abs(diff)}`, variant: "destructive", days: diff };
  }
  if (diff === 0) {
    // 오늘
    return { label: "D-Day", variant: "destructive", days: 0 };
  }
  if (diff <= 3) {
    // 3일 이내
    return { label: `D-${diff}`, variant: "default", days: diff };
  }
  if (diff <= 7) {
    // 7일 이내
    return { label: `D-${diff}`, variant: "outline", days: diff };
  }
  // 7일 초과
  return { label: `D-${diff}`, variant: "secondary", days: diff };
}

/**
 * 날짜가 지났는지 확인
 */
export function isOverdue(dueDate: Date | string | null, completedDate?: Date | string | null): boolean {
  if (!dueDate || completedDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return due < today;
}
