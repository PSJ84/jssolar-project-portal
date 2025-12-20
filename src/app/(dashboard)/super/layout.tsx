import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Check if user is logged in
  if (!session?.user) {
    redirect("/login");
  }

  // Check if user is SUPER_ADMIN
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  return <>{children}</>;
}
