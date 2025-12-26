import { redirect } from "next/navigation";

// 기존 /admin/solution 접근 시 /admin/dashboard로 리다이렉트
export default function SolutionPage() {
  redirect("/admin/dashboard");
}
