import { redirect } from "next/navigation";

// 어드민 기본 페이지: 대시보드(통합솔루션)로 리다이렉트
export default function AdminPage() {
  redirect("/admin/solution");
}
