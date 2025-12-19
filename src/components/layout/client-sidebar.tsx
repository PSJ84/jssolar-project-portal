"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FolderKanban,
  LogOut,
  Settings,
  Sun,
} from "lucide-react";

const navigation = [
  { name: "내 프로젝트", href: "/projects", icon: FolderKanban },
  { name: "설정", href: "/settings", icon: Settings },
];

interface ClientSidebarProps {
  userName?: string | null;
}

export function ClientSidebar({ userName }: ClientSidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="w-64 bg-white border-r min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-2">
          <Sun className="h-6 w-6 text-solar-500" />
          <h1 className="text-xl font-bold text-primary">JSSolar</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">태양광 프로젝트 포털</p>
      </div>

      {/* Navigation */}
      <nav className="px-4 space-y-1 flex-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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
            <p className="text-xs text-muted-foreground">사업주</p>
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
