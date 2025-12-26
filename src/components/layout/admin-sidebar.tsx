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
  FileText,
  CheckSquare,
  BookOpen,
  DollarSign,
  Home,
} from "lucide-react";

// JSSOLAR 메인 메뉴 (모든 관리자)
const mainNavigation = [
  { name: "홈", href: "/admin/dashboard", icon: Home },
  { name: "프로젝트", href: "/admin/projects", icon: FolderKanban },
  { name: "견적서", href: "/admin/quotations", icon: FileText },
  { name: "전체 할 일", href: "/admin/solution/company-todos", icon: CheckSquare },
  { name: "지식노트", href: "/admin/solution/knowledge", icon: BookOpen },
  { name: "예산", href: "/admin/solution/budget", icon: DollarSign },
  { name: "설정", href: "/admin/settings", icon: Settings },
];

// SUPER ADMIN 전용 메뉴
const superAdminNavigation = [
  { name: "조직 관리", href: "/super/organizations", icon: Building2 },
  { name: "전체 프로젝트", href: "/super/projects", icon: FolderKanban },
  { name: "사용자 관리", href: "/admin/users", icon: Users },
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

  // 메뉴 활성화 체크 함수
  const isMenuActive = (href: string) => {
    if (href === "/admin/dashboard") {
      // 홈은 정확히 일치하거나 /admin/solution 일 때만 (기존 대시보드 호환)
      return pathname === href || pathname === "/admin/solution";
    }
    if (href === "/admin/projects") {
      // 프로젝트는 /admin/projects로 시작하지만 /admin/projects/new도 포함
      return pathname.startsWith(href);
    }
    return pathname.startsWith(href);
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
        {/* JSSOLAR 메인 메뉴 */}
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
          JSSOLAR
        </p>
        {mainNavigation.map((item) => {
          const isActive = isMenuActive(item.href);
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

        {/* Super Admin Menu */}
        {isSuperAdmin && (
          <>
            <div className="my-3 border-b" />
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
          </>
        )}
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
