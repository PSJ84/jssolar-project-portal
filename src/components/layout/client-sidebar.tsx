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
  Sun,
} from "lucide-react";

const navigation = [
  { name: "내 프로젝트", href: "/projects", icon: FolderKanban },
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
    <div className="hidden md:flex w-64 bg-white border-r min-h-screen flex-col">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <Sun className="h-6 w-6 text-solar-500" />
          <h1 className="text-xl font-bold text-primary">JSSolar</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">태양광 프로젝트 포털</p>
      </div>

      {/* User info */}
      {userName && (
        <div className="px-4 pb-4">
          <Card className="p-3 bg-muted/50">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground">사업주</p>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <nav className="px-4 space-y-1">
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

      {/* Logout */}
      <div className="px-4 pt-4">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </Button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  );
}
