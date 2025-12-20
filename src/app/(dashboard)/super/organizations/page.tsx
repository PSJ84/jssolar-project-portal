"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FolderKanban, Plus, Loader2, Settings } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "BASIC" | "PRO" | "ENTERPRISE";
  _count: {
    users: number;
    projects: number;
  };
  createdAt: string;
}

const PLAN_COLORS: Record<string, "secondary" | "default" | "destructive"> = {
  BASIC: "secondary",
  PRO: "default",
  ENTERPRISE: "destructive",
};

const PLAN_LABELS: Record<string, string> = {
  BASIC: "Basic",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/super/organizations");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrganizations(data);
    } catch (error) {
      console.error(error);
      toast.error("조직 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">조직 관리</h1>
          <p className="text-muted-foreground mt-1">
            모든 조직을 관리합니다.
          </p>
        </div>
        <Link href="/super/organizations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            새 조직
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : organizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">등록된 조직이 없습니다.</p>
            <Link href="/super/organizations/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                첫 조직 만들기
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Card key={org.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {org.slug}
                    </CardDescription>
                  </div>
                  <Badge variant={PLAN_COLORS[org.plan]}>
                    {PLAN_LABELS[org.plan]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{org._count.users}명</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FolderKanban className="h-4 w-4" />
                    <span>{org._count.projects}개</span>
                  </div>
                </div>
                <Link href={`/super/organizations/${org.id}`}>
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    관리
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
