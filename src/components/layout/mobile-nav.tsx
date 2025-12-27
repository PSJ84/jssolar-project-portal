"use client";

import { useState, useEffect } from "react";
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
  FileText,
  CheckSquare,
  BookOpen,
  DollarSign,
  Monitor,
  Smartphone,
  Home,
} from "lucide-react";

// JSSOLAR 메인 메뉴 (모든 관리자) - admin-sidebar.tsx와 동일
const mainNavigation = [
  { name: "홈", href: "/admin/dashboard", icon: Home },
  { name: "프로젝트", href: "/admin/projects", icon: FolderKanban },
  { name: "견적서", href: "/admin/quotations", icon: FileText },
  { name: "전체 할 일", href: "/admin/solution/company-todos", icon: CheckSquare },
  { name: "지식노트", href: "/admin/solution/knowledge", icon: BookOpen },
  { name: "예산", href: "/admin/solution/budget", icon: DollarSign },
  { name: "설정", href: "/admin/settings", icon: Settings },
];

// SUPER ADMIN 전용 메뉴 - admin-sidebar.tsx와 동일
const superAdminNavigation = [
  { name: "조직 관리", href: "/super/organizations", icon: Building2 },
  { name: "전체 프로젝트", href: "/super/projects", icon: FolderKanban },
  { name: "사용자 관리", href: "/admin/users", icon: Users },
  { name: "템플릿 관리", href: "/super/templates", icon: ListTodo },
];

const clientNavigation = [
  { name: "내 프로젝트", href: "/projects", icon: FolderKanban },
  { name: "설정", href: "/settings", icon: Settings },
];

interface MobileNavProps {
  userName?: string | null;
  userRole?: string | null;
  children: React.ReactNode;
}

export function MobileNav({ userName, userRole, children }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const pathname = usePathname();
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdmin = userRole === "ADMIN" || isSuperAdmin;
  const roleLabel = isSuperAdmin ? "슈퍼관리자" : isAdmin ? "관리자" : "사업주";

  // 메뉴 활성화 체크 함수 (admin-sidebar.tsx와 동일)
  const isMenuActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href || pathname === "/admin/solution";
    }
    return pathname.startsWith(href);
  };

  // 페이지 로드 시 localStorage에서 설정 불러오기
  useEffect(() => {
    const savedMode = localStorage.getItem("desktop-mode");
    if (savedMode === "true") {
      setIsDesktopMode(true);
      setViewport(true);
    }
  }, []);

  // viewport meta 태그 변경
  const setViewport = (desktop: boolean) => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      if (desktop) {
        viewport.setAttribute("content", "width=1200");
      } else {
        viewport.setAttribute("content", "width=device-width, initial-scale=1");
      }
    }
  };

  // PC/모바일 모드 토글
  const toggleDesktopMode = () => {
    const newMode = !isDesktopMode;
    setIsDesktopMode(newMode);
    setViewport(newMode);
    localStorage.setItem("desktop-mode", String(newMode));
    setOpen(false);
  };

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
        <SheetContent side="left" className="w-64 p-0 flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Sun className="h-6 w-6 text-solar-500" />
              <SheetTitle className="text-xl font-bold text-primary">JSSolar</SheetTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isSuperAdmin ? "Super Admin" : isAdmin ? "관리자 모드" : "태양광 프로젝트 포털"}
            </p>
          </SheetHeader>

          {/* 스크롤 가능 영역 */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
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
            <nav className="px-4 pb-4 space-y-1">
              {isAdmin ? (
                <>
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
                    </>
                  )}
                </>
              ) : (
                /* 사업주 메뉴 */
                clientNavigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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
                })
              )}
            </nav>
          </div>

          {/* PC/모바일 토글 & 로그아웃 */}
          <div className="p-4 border-t shrink-0 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={toggleDesktopMode}
            >
              {isDesktopMode ? (
                <>
                  <Smartphone className="h-4 w-4" />
                  모바일 화면으로 보기
                </>
              ) : (
                <>
                  <Monitor className="h-4 w-4" />
                  PC 화면으로 보기
                </>
              )}
            </Button>
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

      {/* PC 모드일 때 플로팅 버튼 (모바일로 돌아가기) */}
      {isDesktopMode && (
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 shadow-lg bg-white border-2 gap-2"
          onClick={toggleDesktopMode}
        >
          <Smartphone className="h-4 w-4" />
          모바일로 보기
        </Button>
      )}
    </>
  );
}
