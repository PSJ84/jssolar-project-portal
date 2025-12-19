"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Trash2, Crown, User } from "lucide-react";

interface Member {
  id: string;
  userId: string | null;
  isOwner: boolean;
  invitedEmail: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface AvailableUser {
  id: string;
  name: string | null;
  email: string;
}

interface MemberManagementProps {
  projectId: string;
  members: Member[];
  availableUsers: AvailableUser[];
}

export function MemberManagement({
  projectId,
  members,
  availableUsers,
}: MemberManagementProps) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAddMember = async () => {
    if (!selectedUserId) return;

    setIsAdding(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });

      if (response.ok) {
        setSelectedUserId("");
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.message || "멤버 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("Add member error:", error);
      alert("멤버 추가 중 오류가 발생했습니다.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("정말 이 멤버를 삭제하시겠습니까?")) return;

    setRemovingId(memberId);
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.message || "멤버 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Remove member error:", error);
      alert("멤버 삭제 중 오류가 발생했습니다.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleSetOwner = async (memberId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOwner: true }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.message || "소유자 설정에 실패했습니다.");
      }
    } catch (error) {
      console.error("Set owner error:", error);
      alert("소유자 설정 중 오류가 발생했습니다.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>멤버 관리</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Member Section */}
        <div className="flex gap-3">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="멤버 추가할 사용자 선택" />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.length === 0 ? (
                <SelectItem value="none" disabled>
                  추가 가능한 사용자가 없습니다
                </SelectItem>
              ) : (
                availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email} ({user.email})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddMember}
            disabled={!selectedUserId || isAdding}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {isAdding ? "추가 중..." : "추가"}
          </Button>
        </div>

        {/* Members List */}
        <div className="space-y-3">
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              등록된 멤버가 없습니다.
            </p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                    {member.isOwner ? (
                      <Crown className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {member.user?.name || member.invitedEmail || "알 수 없음"}
                      </p>
                      {member.isOwner && (
                        <Badge variant="secondary" className="text-xs">
                          소유자
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {member.user?.email || member.invitedEmail}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!member.isOwner && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetOwner(member.id)}
                        title="소유자로 설정"
                      >
                        <Crown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingId === member.id}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
