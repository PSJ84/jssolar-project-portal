import { redirect } from "next/navigation";

// /client/projects/[id] -> /projects/[id]?view=client로 리다이렉트
// 어드민이 사업주 화면을 미리보기할 때 사용
export default async function ClientProjectRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}?view=client`);
}
