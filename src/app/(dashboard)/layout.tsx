import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { ClientSidebar } from "@/components/layout/client-sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="min-h-screen flex">
      {isAdmin ? (
        <AdminSidebar userName={session.user.name} />
      ) : (
        <ClientSidebar userName={session.user.name} />
      )}
      <div className="flex-1 flex flex-col">
        <Header userName={session.user.name} userRole={session.user.role} />
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
