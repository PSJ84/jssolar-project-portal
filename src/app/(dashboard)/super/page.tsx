"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, FolderKanban, ArrowRight, Loader2 } from "lucide-react";

interface Stats {
  organizations: number;
  users: number;
  projects: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/super/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Super Admin</h1>
        <p className="text-muted-foreground mt-1">
          전체 시스템 관리 대시보드
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">전체 조직</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.organizations ?? 0}</div>
              <Link href="/super/organizations">
                <Button variant="link" className="p-0 h-auto text-sm">
                  조직 관리 <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">전체 사용자</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.users ?? 0}</div>
              <p className="text-xs text-muted-foreground">모든 조직의 사용자</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">전체 프로젝트</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.projects ?? 0}</div>
              <p className="text-xs text-muted-foreground">모든 조직의 프로젝트</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>빠른 액션</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Link href="/super/organizations/new">
            <Button>
              <Building2 className="h-4 w-4 mr-2" />
              새 조직 생성
            </Button>
          </Link>
          <Link href="/super/organizations">
            <Button variant="outline">
              조직 목록 보기
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
