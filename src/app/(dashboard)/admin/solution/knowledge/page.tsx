"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, RefreshCw } from "lucide-react";
import { KnowledgeList } from "@/components/knowledge/KnowledgeList";
import { toast } from "sonner";

interface KnowledgeNote {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPinned: boolean;
  createdBy: { id: string; name: string | null };
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "전체" },
  { value: "CONSTRUCTION", label: "시공노하우" },
  { value: "PERMIT", label: "인허가팁" },
  { value: "MATERIAL", label: "자재정보" },
  { value: "REGULATION", label: "법규" },
  { value: "CONTACT", label: "연락처" },
  { value: "OTHER", label: "기타" },
];

export default function KnowledgePage() {
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("ALL");

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      if (category !== "ALL") {
        params.set("category", category);
      }

      const res = await fetch(`/api/knowledge?${params}`);
      if (!res.ok) throw new Error("Failed to fetch notes");
      const data = await res.json();
      setNotes(data);
    } catch {
      toast.error("지식노트 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, category]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchNotes();
    }, 300);

    return () => clearTimeout(debounce);
  }, [fetchNotes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotes();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">지식노트</h1>
          <p className="text-muted-foreground">
            시공 노하우, 인허가 팁, 자재 정보 등을 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchNotes}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button asChild>
            <Link href="/admin/solution/knowledge/new">
              <Plus className="mr-2 h-4 w-4" />
              새 노트
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>노트 목록</CardTitle>
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
              </form>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              로딩 중...
            </div>
          ) : (
            <KnowledgeList notes={notes} onRefresh={fetchNotes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
