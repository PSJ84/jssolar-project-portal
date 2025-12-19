"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Plus,
  History,
  Trash2,
  ExternalLink,
  Upload,
  User,
  Calendar,
} from "lucide-react";
import { DocumentCategory } from "@/types";
import { DocumentAddDialog } from "./document-add-dialog";
import { DocumentVersionDialog } from "./document-version-dialog";
import { DocumentHistoryDialog } from "./document-history-dialog";

const categoryLabels: Record<DocumentCategory, string> = {
  CONTRACT: "계약서",
  PERMIT: "인허가",
  DRAWING: "도면",
  SCHEDULE: "공정표",
  SITE_PHOTO: "현장사진",
  COMPLETION: "준공도서",
  OTHER: "기타",
};

const categoryColors: Record<DocumentCategory, string> = {
  CONTRACT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  PERMIT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  DRAWING: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  SCHEDULE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  SITE_PHOTO: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  COMPLETION: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

type TabCategory = "ALL" | DocumentCategory;

const tabs: { value: TabCategory; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "CONTRACT", label: "계약서" },
  { value: "PERMIT", label: "인허가" },
  { value: "DRAWING", label: "도면" },
  { value: "SCHEDULE", label: "공정표" },
  { value: "SITE_PHOTO", label: "현장사진" },
  { value: "COMPLETION", label: "준공도서" },
  { value: "OTHER", label: "기타" },
];

interface DocumentWithVersion {
  id: string;
  projectId: string;
  category: DocumentCategory;
  title: string;
  description: string | null;
  currentVersionId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  currentVersion?: {
    id: string;
    documentId: string;
    versionNumber: number;
    fileUrl: string;
    fileName: string;
    fileSizeBytes: number | null;
    mimeType: string | null;
    note: string | null;
    uploadedById: string;
    createdAt: Date | string;
    uploadedBy?: {
      name: string | null;
    };
  } | null;
}

interface DocumentManagementProps {
  projectId: string;
  documents: DocumentWithVersion[];
}

export function DocumentManagement({
  projectId,
  documents,
}: DocumentManagementProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabCategory>("ALL");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [versionDialog, setVersionDialog] = useState<{
    open: boolean;
    documentId: string;
    documentTitle: string;
  }>({ open: false, documentId: "", documentTitle: "" });
  const [historyDialog, setHistoryDialog] = useState<{
    open: boolean;
    documentId: string;
    documentTitle: string;
    currentVersionId: string | null;
  }>({ open: false, documentId: "", documentTitle: "", currentVersionId: null });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredDocuments =
    activeTab === "ALL"
      ? documents
      : documents.filter((doc) => doc.category === activeTab);

  const handleDelete = async (documentId: string, documentTitle: string) => {
    if (!window.confirm(`"${documentTitle}" 문서를 삭제하시겠습니까?`)) {
      return;
    }

    setDeletingId(documentId);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.message || "문서 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Delete document error:", error);
      alert("문서 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>문서 관리</CardTitle>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            문서 추가
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TabCategory)}
          >
            <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-sm"
                >
                  {tab.label}
                  {tab.value === "ALL" ? (
                    <span className="ml-1 text-xs">({documents.length})</span>
                  ) : (
                    <span className="ml-1 text-xs">
                      (
                      {
                        documents.filter((d) => d.category === tab.value)
                          .length
                      }
                      )
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {activeTab === "ALL"
                      ? "등록된 문서가 없습니다."
                      : `${categoryLabels[activeTab as DocumentCategory]} 카테고리에 등록된 문서가 없습니다.`}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    첫 문서 추가하기
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/50 rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">
                            {doc.title}
                          </span>
                          <Badge
                            variant="secondary"
                            className={categoryColors[doc.category]}
                          >
                            {categoryLabels[doc.category]}
                          </Badge>
                          {doc.currentVersion && (
                            <Badge variant="outline">
                              v{doc.currentVersion.versionNumber}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          {doc.currentVersion && (
                            <>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(doc.currentVersion.createdAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {doc.currentVersion.uploadedBy?.name ||
                                  "알 수 없음"}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {doc.currentVersion?.fileUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={doc.currentVersion.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">열기</span>
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setVersionDialog({
                              open: true,
                              documentId: doc.id,
                              documentTitle: doc.title,
                            })
                          }
                        >
                          <Upload className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">새 버전</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setHistoryDialog({
                              open: true,
                              documentId: doc.id,
                              documentTitle: doc.title,
                              currentVersionId: doc.currentVersionId,
                            })
                          }
                        >
                          <History className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">버전 히스토리</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.id, doc.title)}
                          disabled={deletingId === doc.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Document Dialog */}
      <DocumentAddDialog
        projectId={projectId}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      {/* Add Version Dialog */}
      <DocumentVersionDialog
        documentId={versionDialog.documentId}
        documentTitle={versionDialog.documentTitle}
        open={versionDialog.open}
        onOpenChange={(open) =>
          setVersionDialog((prev) => ({ ...prev, open }))
        }
      />

      {/* Version History Dialog */}
      <DocumentHistoryDialog
        documentId={historyDialog.documentId}
        documentTitle={historyDialog.documentTitle}
        currentVersionId={historyDialog.currentVersionId}
        open={historyDialog.open}
        onOpenChange={(open) =>
          setHistoryDialog((prev) => ({ ...prev, open }))
        }
      />
    </>
  );
}
