"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FolderKanban,
  Users,
  Settings,
  LogOut,
  Sun,
  Building2,
  ListTodo,
  LayoutDashboard,
  FileText,
  Lightbulb,
  CheckSquare,
  BookOpen,
  DollarSign,
} from "lucide-react";

const navigation = [
  { name: "프로젝트 현황", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "프로젝트 관리", href: "/admin/projects", icon: FolderKanban },
  { name: "견적 관리", href: "/admin/quotations", icon: FileText },
  { name: "템플릿 관리", href: "/admin/templates", icon: ListTodo },
  { name: "설정", href: "/admin/settings", icon: Settings },
];

const solutionNavigation = [
  { name: "대시보드", href: "/admin/solution", icon: Lightbulb },
  { name: "전체 할 일", href: "/admin/solution/company-todos", icon: CheckSquare },
  { name: "지식노트", href: "/admin/solution/knowledge", icon: BookOpen },
  { name: "예산 현황", href: "/admin/solution/budget", icon: DollarSign },
];

const superAdminNavigation = [
  { name: "사용자 관리", href: "/admin/users", icon: Users },
  { name: "조직 관리", href: "/super/organizations", icon: Building2 },
  { name: "전체 프로젝트", href: "/super/projects", icon: FolderKanban },
  { name: "템플릿 관리", href: "/super/templates", icon: ListTodo },
];

interface AdminSidebarProps {
  userName?: string | null;
  userRole?: string | null;
}

export function AdminSidebar({ userName, userRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="hidden md:flex md:fixed md:left-0 md:top-0 w-64 h-screen bg-white border-r flex-col overflow-y-auto z-40">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-2">
          <Sun className="h-6 w-6 text-solar-500" />
          <h1 className="text-xl font-bold text-primary">JSSolar</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {isSuperAdmin ? "Super Admin" : "관리자 모드"}
        </p>
      </div>

      {/* Navigation */}
      <nav className="px-4 space-y-1 flex-1">
        {/* Super Admin Menu */}
        {isSuperAdmin && (
          <>
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
              Super Admin
            </p>
            {superAdminNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            <div className="my-3 border-b" />
          </>
        )}

        {/* Regular Admin Menu */}
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        {/* JSSOLAR 메뉴 */}
        <div className="my-3 border-b" />
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
          JSSOLAR
        </p>
        {solutionNavigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/admin/solution" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User info and Logout */}
      <div className="p-4 border-t">
        {userName && (
          <Card className="p-3 mb-3 bg-muted/50">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground">관리자</p>
          </Card>
        )}
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </div>
  );
}
