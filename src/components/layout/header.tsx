"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, User } from "lucide-react";

interface HeaderProps {
  userName?: string | null;
  userRole?: string | null;
}

export function Header({ userName, userRole }: HeaderProps) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  // Get initials from user name
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const roleLabel = userRole === "ADMIN" ? "관리자" : "사업주";

  return (
    <header className="hidden md:flex h-16 border-b bg-white items-center justify-between px-6">
      <div className="flex items-center gap-2">
        {userRole && (
          <Badge variant={userRole === "ADMIN" ? "default" : "secondary"}>
            {roleLabel}
          </Badge>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar>
              <AvatarFallback>{getInitials(userName)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              {userName && (
                <p className="font-medium">{userName}</p>
              )}
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            프로필
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
