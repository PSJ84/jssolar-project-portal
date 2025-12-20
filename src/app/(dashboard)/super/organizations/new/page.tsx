"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewOrganizationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    plan: "BASIC" as "BASIC" | "PRO" | "ENTERPRISE",
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (value: string) => {
    setForm({
      ...form,
      name: value,
      slug: generateSlug(value),
    });
  };

  const isSlugValid = (slug: string) => {
    return /^[a-z0-9-]+$/.test(slug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name) {
      toast.error("조직명을 입력해주세요.");
      return;
    }

    if (!form.slug) {
      toast.error("슬러그를 입력해주세요.");
      return;
    }

    if (!isSlugValid(form.slug)) {
      toast.error("슬러그는 영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/super/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create organization");
      }

      const org = await res.json();
      toast.success("조직이 생성되었습니다.");
      router.push(`/super/organizations/${org.id}`);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "조직 생성에 실패했습니다.";
      if (message.includes("slug")) {
        toast.error("이미 사용 중인 슬러그입니다.");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/super/organizations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">새 조직 생성</h1>
          <p className="text-muted-foreground mt-1">
            새로운 조직을 생성합니다.
          </p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>조직 정보</CardTitle>
          <CardDescription>
            조직의 기본 정보를 입력하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">조직명 *</Label>
              <Input
                id="name"
                placeholder="예: JS Solar"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">슬러그 *</Label>
              <Input
                id="slug"
                placeholder="예: my-company"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                className={`font-mono ${form.name && !form.slug ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              <p className={`text-xs ${form.name && !form.slug ? "text-red-500" : "text-muted-foreground"}`}>
                {form.name && !form.slug
                  ? "슬러그를 직접 입력해주세요"
                  : "영문 소문자, 숫자, 하이픈(-)만 사용 가능"}
              </p>
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
                  <SelectItem value="BASIC">Basic - 대시보드 미리보기</SelectItem>
                  <SelectItem value="PRO">Pro - 주요 기능 포함</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise - 모든 기능</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Link href="/super/organizations">
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                생성
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
