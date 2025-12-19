import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  // Redirect based on user role
  if (session.user.role === "ADMIN") {
    redirect("/admin/projects");
  } else {
    redirect("/projects");
  }
}
