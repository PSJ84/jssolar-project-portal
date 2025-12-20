import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Check if user is logged in
  if (!session?.user) {
    redirect("/login");
  }

  // Check if user is ADMIN or SUPER_ADMIN
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    redirect("/projects");
  }

  // Just return children - sidebar is already rendered in (dashboard)/layout.tsx
  return <>{children}</>;
}
