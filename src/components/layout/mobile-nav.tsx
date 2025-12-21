"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  FolderKanban,
  Users,
  Settings,
  LogOut,
  Sun,
  Menu,
  Building2,
  ListTodo,
  LayoutDashboard,
} from "lucide-react";

const superAdminNavigation = [
  { name: "조직 관리", href: "/super/organizations", icon: Building2 },
  { name: "템플릿 관리", href: "/super/templates", icon: ListTodo },
];

const adminNavigation = [
  { name: "대시보드", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "프로젝트 관리", href: "/admin/projects", icon: FolderKanban },
  { name: "사용자 관리", href: "/admin/users", icon: Users },
  { name: "템플릿 관리", href: "/admin/templates", icon: ListTodo },
  { name: "설정", href: "/admin/settings", icon: Settings },
];

const clientNavigation = [
  { name: "내 프로젝트", href: "/projects", icon: FolderKanban },
];

interface MobileNavProps {
  userName?: string | null;
  userRole?: string | null;
  children: React.ReactNode;
}

export function MobileNav({ userName, userRole, children }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdmin = userRole === "ADMIN" || isSuperAdmin;
  const navigation = isAdmin ? adminNavigation : clientNavigation;
  const roleLabel = isSuperAdmin ? "슈퍼관리자" : isAdmin ? "관리자" : "사업주";

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const handleNavClick = () => {
    setOpen(false);
  };

  return (
    <>
      {/* 모바일 헤더 */}
      <header className="md:hidden h-14 border-b bg-white flex items-center justify-between px-4 sticky top-0 z-40">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-solar-500" />
          <span className="font-bold text-primary">JSSolar</span>
        </div>
        <div className="w-10" /> {/* 균형을 위한 빈 공간 */}
      </header>

      {/* 모바일 사이드바 (Sheet) */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="p-6 pb-4 border-b">
            <div className="flex items-center gap-2">
              <Sun className="h-6 w-6 text-solar-500" />
              <SheetTitle className="text-xl font-bold text-primary">JSSolar</SheetTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isSuperAdmin ? "Super Admin" : isAdmin ? "관리자 모드" : "태양광 프로젝트 포털"}
            </p>
          </SheetHeader>

          {/* 사용자 정보 */}
          {userName && (
            <div className="px-4 py-4">
              <Card className="p-3 bg-muted/50">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </Card>
            </div>
          )}

          {/* 네비게이션 */}
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
                      onClick={handleNavClick}
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

            {/* Regular Navigation */}
            {navigation.map((item) => {
              const isActive = isAdmin
                ? pathname.startsWith(item.href)
                : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleNavClick}
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

          {/* 로그아웃 */}
          <div className="p-4 border-t mt-auto">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 메인 콘텐츠 */}
      {children}
    </>
  );
}
