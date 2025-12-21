"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Project, ProjectStatus } from "@prisma/client";
import { MoreHorizontal, Eye, Archive, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const statusLabels: Record<ProjectStatus, string> = {
  ACTIVE: "진행중",
  COMPLETED: "완료",
  ARCHIVED: "보관됨",
};

const statusVariants: Record<ProjectStatus, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  ARCHIVED: "outline",
};

interface ProjectWithOrg extends Project {
  organization: {
    id: string;
    name: string;
  } | null;
  _count: {
    members: number;
    documents: number;
  };
}

interface SuperProjectTableProps {
  projects: ProjectWithOrg[];
}

type DeleteMode = "soft" | "hard";

export function SuperProjectTable({ projects }: SuperProjectTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; mode: DeleteMode } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleSoftDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("프로젝트 보관에 실패했습니다.");
      }

      toast.success("프로젝트가 보관되었습니다.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "보관 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleHardDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${id}?hard=true`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "프로젝트 삭제에 실패했습니다.");
      }

      toast.success("프로젝트가 완전히 삭제되었습니다.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
      setConfirmText("");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });

      if (!response.ok) {
        throw new Error("프로젝트 복원에 실패했습니다.");
      }

      toast.success("프로젝트가 복원되었습니다.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "복원 중 오류가 발생했습니다.");
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.mode === "soft") {
      handleSoftDelete(deleteTarget.id);
    } else {
      handleHardDelete(deleteTarget.id);
    }
  };

  const isHardDeleteConfirmValid = deleteTarget?.mode === "hard" && confirmText === "삭제";

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>프로젝트명</TableHead>
              <TableHead>조직</TableHead>
              <TableHead>위치</TableHead>
              <TableHead>용량</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>멤버</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  등록된 프로젝트가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow
                  key={project.id}
                  className={project.status === "ARCHIVED" ? "opacity-60" : ""}
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="hover:underline"
                    >
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {project.organization ? (
                      <Link
                        href={`/super/organizations/${project.organization.id}`}
                        className="hover:underline text-muted-foreground"
                      >
                        {project.organization.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{project.location || "-"}</TableCell>
                  <TableCell>
                    {project.capacityKw
                      ? `${project.capacityKw.toLocaleString()} kW`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[project.status]}>
                      {statusLabels[project.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{project._count.members}명</TableCell>
                  <TableCell>
                    {new Date(project.createdAt).toLocaleDateString("ko-KR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/projects/${project.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            상세 보기
                          </Link>
                        </DropdownMenuItem>

                        {project.status === "ARCHIVED" ? (
                          <>
                            <DropdownMenuItem onClick={() => handleRestore(project.id)}>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              복원하기
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget({
                                id: project.id,
                                name: project.name,
                                mode: "hard"
                              })}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              완전 삭제
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget({
                              id: project.id,
                              name: project.name,
                              mode: "soft"
                            })}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            보관하기
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Soft Delete (Archive) Dialog */}
      <AlertDialog
        open={deleteTarget?.mode === "soft"}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프로젝트 보관</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.name}&quot; 프로젝트를 보관하시겠습니까?
              <br />
              보관된 프로젝트는 일반 사용자에게 표시되지 않으며, 나중에 복원할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "보관 중..." : "보관"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hard Delete Dialog */}
      <AlertDialog
        open={deleteTarget?.mode === "hard"}
        onOpenChange={() => {
          setDeleteTarget(null);
          setConfirmText("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              프로젝트 완전 삭제
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                <strong>&quot;{deleteTarget?.name}&quot;</strong> 프로젝트를 완전히 삭제하시겠습니까?
              </p>
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                <p className="font-semibold">이 작업은 되돌릴 수 없습니다!</p>
                <p className="mt-1">
                  프로젝트와 관련된 모든 데이터(태스크, 체크리스트, 문서, 활동 기록 등)가
                  영구적으로 삭제됩니다.
                </p>
              </div>
              <div className="pt-2">
                <p className="text-sm mb-2">
                  확인하려면 <strong>&quot;삭제&quot;</strong>를 입력하세요:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="삭제"
                  className="max-w-[200px]"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting || !isHardDeleteConfirmValid}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "삭제 중..." : "완전 삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
