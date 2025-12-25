// 사업주 탭 설정
export const CLIENT_TABS = {
  home: { key: "home", label: "홈", value: "home" },
  permit: { key: "permit", label: "인허가", value: "tasks" },
  construction: { key: "construction", label: "시공", value: "construction" },
  quotation: { key: "quotation", label: "견적서", value: "quotations" },
  documents: { key: "documents", label: "문서", value: "documents" },
} as const;

export type ClientTabKey = keyof typeof CLIENT_TABS;

// 기본 탭 설정 (모두 표시)
export const DEFAULT_VISIBLE_TABS: Record<ClientTabKey, boolean> = {
  home: true,
  permit: true,
  construction: true,
  quotation: true,
  documents: true,
};

// visibleTabs JSON을 안전하게 파싱
export function parseVisibleTabs(
  visibleTabs: unknown
): Record<ClientTabKey, boolean> {
  if (!visibleTabs || typeof visibleTabs !== "object") {
    return { ...DEFAULT_VISIBLE_TABS };
  }

  const tabs = visibleTabs as Record<string, unknown>;
  return {
    home: typeof tabs.home === "boolean" ? tabs.home : true,
    permit: typeof tabs.permit === "boolean" ? tabs.permit : true,
    construction:
      typeof tabs.construction === "boolean" ? tabs.construction : true,
    quotation: typeof tabs.quotation === "boolean" ? tabs.quotation : true,
    documents: typeof tabs.documents === "boolean" ? tabs.documents : true,
  };
}
