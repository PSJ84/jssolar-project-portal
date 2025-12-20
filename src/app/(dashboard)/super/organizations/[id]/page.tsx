"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, Save, Users, FolderKanban } from "lucide-react";
import { Feature } from "@prisma/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "BASIC" | "PRO" | "ENTERPRISE";
  sessionMaxDays: number;
  createdAt: string;
  updatedAt: string;
  features: { feature: Feature; enabled: boolean }[];
  users: { id: string; username: string; name: string | null; role: string }[];
  projects: { id: string; name: string; status: string }[];
}

const FEATURE_LABELS: Record<Feature, string> = {
  DASHBOARD: "대시보드",
  GANTT_CHART: "간트 차트",
  TASK_DETAIL: "작업 상세",
  AI_WEEKLY_REPORT: "AI 주간 리포트",
  PWA_PUSH: "PWA 푸시 알림",
  VENDOR_MANAGEMENT: "업체 관리",
  BUDGET: "예산 관리",
  TELEGRAM_ALERT: "텔레그램 알림",
};

const PLAN_LABELS: Record<string, string> = {
  BASIC: "Basic",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    plan: "BASIC" as "BASIC" | "PRO" | "ENTERPRISE",
    sessionMaxDays: 60,
  });
  const [features, setFeatures] = useState<Record<Feature, boolean>>({} as Record<Feature, boolean>);

  useEffect(() => {
    fetchOrganization();
  }, [id]);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/super/organizations/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: Organization = await res.json();
      setOrganization(data);
      setForm({
        name: data.name,
        slug: data.slug,
        plan: data.plan,
        sessionMaxDays: data.sessionMaxDays,
      });
      const featureMap: Record<Feature, boolean> = {} as Record<Feature, boolean>;
      Object.values(Feature).forEach((f) => {
        const found = data.features.find((of) => of.feature === f);
        featureMap[f] = found?.enabled ?? false;
      });
      setFeatures(featureMap);
    } catch (error) {
      console.error(error);
      toast.error("조직 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/super/organizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update");
      }
      toast.success("조직 정보가 저장되었습니다.");
      fetchOrganization();
    } catch (error) {
      console.error(error);
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleFeatureToggle = async (feature: Feature, enabled: boolean) => {
    try {
      setFeatures({ ...features, [feature]: enabled });
      const res = await fetch(`/api/super/organizations/${id}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, enabled }),
      });
      if (!res.ok) throw new Error("Failed to update feature");
      toast.success(`${FEATURE_LABELS[feature]} ${enabled ? "활성화" : "비활성화"}됨`);
    } catch (error) {
      console.error(error);
      setFeatures({ ...features, [feature]: !enabled });
      toast.error("기능 변경에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">조직을 찾을 수 없습니다.</p>
        <Link href="/super/organizations">
          <Button variant="link">목록으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/super/organizations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{organization.name}</h1>
          <p className="text-muted-foreground mt-1 font-mono">{organization.slug}</p>
        </div>
        <Badge variant="outline" className="ml-auto">
          {PLAN_LABELS[organization.plan]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>조직의 기본 정보를 수정합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">조직명</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">슬러그</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">플랜</Label>
              <Select
                value={form.plan}
                onValueChange={(value: "BASIC" | "PRO" | "ENTERPRISE") =>
                  setForm({ ...form, plan: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASIC">Basic</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionMaxDays">세션 유효 기간 (일)</Label>
              <Input
                id="sessionMaxDays"
                type="number"
                value={form.sessionMaxDays}
                onChange={(e) =>
                  setForm({ ...form, sessionMaxDays: parseInt(e.target.value) || 60 })
                }
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              저장
            </Button>
          </CardContent>
        </Card>

        {/* 기능 토글 */}
        <Card>
          <CardHeader>
            <CardTitle>기능 설정</CardTitle>
            <CardDescription>이 조직에서 사용할 기능을 설정합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.values(Feature).map((feature) => (
                <div
                  key={feature}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{FEATURE_LABELS[feature]}</p>
                    <p className="text-xs text-muted-foreground">{feature}</p>
                  </div>
                  <Switch
                    checked={features[feature] ?? false}
                    onCheckedChange={(checked) => handleFeatureToggle(feature, checked)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 소속 사용자 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            소속 사용자
          </CardTitle>
          <CardDescription>
            {organization.users.length}명의 사용자가 이 조직에 소속되어 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organization.users.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              소속된 사용자가 없습니다.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>아이디</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>역할</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organization.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono">{user.username}</TableCell>
                      <TableCell>{user.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "SUPER_ADMIN" ? "destructive" : user.role === "ADMIN" ? "default" : "secondary"}>
                          {user.role === "SUPER_ADMIN" ? "슈퍼관리자" : user.role === "ADMIN" ? "관리자" : "사업주"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 소속 프로젝트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            소속 프로젝트
          </CardTitle>
          <CardDescription>
            {organization.projects.length}개의 프로젝트가 이 조직에 소속되어 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organization.projects.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              소속된 프로젝트가 없습니다.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>프로젝트명</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organization.projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>
                        <Badge variant={project.status === "ACTIVE" ? "default" : "secondary"}>
                          {project.status === "ACTIVE" ? "진행중" : project.status === "COMPLETED" ? "완료" : "보관"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
