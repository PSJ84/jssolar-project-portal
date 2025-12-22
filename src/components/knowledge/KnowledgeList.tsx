"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreHorizontal,
  Pin,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
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

interface KnowledgeListProps {
  notes: KnowledgeNote[];
  onRefresh: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  CONSTRUCTION: "시공노하우",
  PERMIT: "인허가팁",
  MATERIAL: "자재정보",
  REGULATION: "법규",
  CONTACT: "연락처",
  OTHER: "기타",
};

const CATEGORY_COLORS: Record<string, string> = {
  CONSTRUCTION: "bg-green-100 text-green-800",
  PERMIT: "bg-blue-100 text-blue-800",
  MATERIAL: "bg-purple-100 text-purple-800",
  REGULATION: "bg-red-100 text-red-800",
  CONTACT: "bg-yellow-100 text-yellow-800",
  OTHER: "bg-gray-100 text-gray-800",
};

export function KnowledgeList({ notes, onRefresh }: KnowledgeListProps) {
  const router = useRouter();
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const handleTogglePin = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge/${id}/pin`, {
        method: "PATCH",
      });

      if (!res.ok) throw new Error("Failed to toggle pin");

      toast.success("핀 상태가 변경되었습니다.");
      onRefresh();
    } catch {
      toast.error("핀 상태 변경에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!deletingNoteId) return;

    try {
      const res = await fetch(`/api/knowledge/${deletingNoteId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("지식노트가 삭제되었습니다.");
      setDeletingNoteId(null);
      onRefresh();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const getPreview = (content: string, maxLength = 150) => {
    const text = content.replace(/[#*`>\-\[\]()]/g, " ").replace(/\s+/g, " ");
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };

  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">지식노트가 없습니다.</p>
        <Button className="mt-4" asChild>
          <Link href="/admin/solution/knowledge/new">새 노트 작성</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {notes.map((note) => (
          <Card
            key={note.id}
            className="group cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/admin/solution/knowledge/${note.id}`)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {note.isPinned && (
                    <Pin className="h-4 w-4 text-primary fill-primary" />
                  )}
                  <Badge className={CATEGORY_COLORS[note.category]}>
                    {CATEGORY_LABELS[note.category] || note.category}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(note.id);
                      }}
                    >
                      <Pin className="mr-2 h-4 w-4" />
                      {note.isPinned ? "핀 해제" : "상단 고정"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/solution/knowledge/${note.id}?edit=true`);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      수정
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingNoteId(note.id);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardTitle className="text-lg line-clamp-2 mt-2">
                {note.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {getPreview(note.content)}
              </p>
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {note.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                  {note.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{note.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                <span>{note.createdBy.name || "알 수 없음"}</span>
                <span>{format(new Date(note.updatedAt), "PPP", { locale: ko })}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={!!deletingNoteId}
        onOpenChange={() => setDeletingNoteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>지식노트 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 지식노트를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
