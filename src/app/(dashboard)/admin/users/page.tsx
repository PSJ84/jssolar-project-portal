"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Pencil, Trash2, UserPlus, ShieldAlert } from "lucide-react";
import { CLIENT_TABS, DEFAULT_VISIBLE_TABS, ClientTabKey, parseVisibleTabs } from "@/lib/constants";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface User {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "CLIENT";
  organizationId: string | null;
  organization: Organization | null;
  createdAt: string;
  updatedAt: string;
  image: string | null;
  emailVerified: string | null;
  visibleTabs: Record<ClientTabKey, boolean> | null;
}

type RoleFilter = "all" | "SUPER_ADMIN" | "ADMIN" | "CLIENT";

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [formLoading, setFormLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    name: "",
    password: "",
    role: "CLIENT" as "ADMIN" | "CLIENT",
    organizationId: "",
  });
  const [editForm, setEditForm] = useState({
    username: "",
    name: "",
    role: "CLIENT" as "SUPER_ADMIN" | "ADMIN" | "CLIENT",
    organizationId: "",
    resetPassword: false,
    newPassword: "",
    visibleTabs: { ...DEFAULT_VISIBLE_TABS } as Record<ClientTabKey, boolean>,
  });

  // SUPER_ADMIN 권한 체크
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (status === "loading") return;

    if (!isSuperAdmin) {
      toast.error("권한이 없습니다.");
      router.push("/admin/projects");
      return;
    }

    fetchOrganizations();
    fetchUsers();
  }, [status, isSuperAdmin, router]);

  // Fetch organizations
  const fetchOrganizations = async () => {
    try {
      const response = await fetch("/api/super/organizations");
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const url = orgFilter && orgFilter !== "all"
        ? `/api/users?organizationId=${orgFilter}`
        : "/api/users";
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 403) {
          toast.error("권한이 없습니다.");
          router.push("/admin/projects");
          return;
        }
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("사용자 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [orgFilter]);

  // Filter users by role
  const filteredUsers = users.filter((user) => {
    if (roleFilter === "all") return true;
    return user.role === roleFilter;
  });

  // Role display helper
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN": return "슈퍼관리자";
      case "ADMIN": return "관리자";
      default: return "사업주";
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" => {
    switch (role) {
      case "SUPER_ADMIN": return "destructive";
      case "ADMIN": return "default";
      default: return "secondary";
    }
  };

  // Create user handler
  const handleCreateUser = async () => {
    if (!createForm.username || !createForm.password) {
      toast.error("아이디와 비밀번호는 필수입니다.");
      return;
    }

    if (!createForm.organizationId) {
      toast.error("소속 조직을 선택해주세요.");
      return;
    }

    try {
      setFormLoading(true);
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }

      toast.success("사용자가 생성되었습니다.");
      setCreateDialogOpen(false);
      setCreateForm({ username: "", name: "", password: "", role: "CLIENT", organizationId: "" });
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage === "Username already exists") {
        toast.error("이미 존재하는 아이디입니다.");
      } else if (errorMessage === "Password must be at least 6 characters") {
        toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
      } else {
        toast.error("사용자 생성에 실패했습니다.");
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Edit user handler
  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      setFormLoading(true);
      const updateData: {
        username?: string;
        name?: string;
        role?: string;
        password?: string;
        organizationId?: string;
      } = {
        username: editForm.username,
        name: editForm.name,
        role: editForm.role,
        organizationId: editForm.organizationId,
      };

      if (editForm.resetPassword && editForm.newPassword) {
        updateData.password = editForm.newPassword;
      }

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }

      // 사업주인 경우 탭 설정도 저장
      if (editForm.role === "CLIENT") {
        await fetch(`/api/admin/users/${selectedUser.id}/tabs`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibleTabs: editForm.visibleTabs }),
        });
      }

      toast.success("사용자 정보가 수정되었습니다.");
      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage === "Password must be at least 6 characters") {
        toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
      } else {
        toast.error("사용자 정보 수정에 실패했습니다.");
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Delete user handler
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setFormLoading(true);
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      toast.success("사용자가 삭제되었습니다.");
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage === "Cannot delete your own account") {
        toast.error("본인 계정은 삭제할 수 없습니다.");
      } else if (errorMessage === "Cannot delete SUPER_ADMIN user") {
        toast.error("슈퍼관리자는 삭제할 수 없습니다.");
      } else {
        toast.error("사용자 삭제에 실패했습니다.");
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Open edit dialog
  const openEditDialog = async (user: User) => {
    setSelectedUser(user);

    // 사업주인 경우 탭 설정 로드
    let visibleTabs = { ...DEFAULT_VISIBLE_TABS };
    if (user.role === "CLIENT") {
      try {
        const response = await fetch(`/api/admin/users/${user.id}/tabs`);
        if (response.ok) {
          const data = await response.json();
          visibleTabs = data.visibleTabs;
        }
      } catch (error) {
        console.error("Error fetching user tabs:", error);
      }
    }

    setEditForm({
      username: user.username,
      name: user.name || "",
      role: user.role,
      organizationId: user.organizationId || "",
      resetPassword: false,
      newPassword: "",
      visibleTabs,
    });
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  // 권한 없음 표시
  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <ShieldAlert className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">권한이 없습니다</h2>
        <p className="text-muted-foreground">이 페이지는 슈퍼관리자만 접근할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">사용자 관리</h1>
          <p className="text-muted-foreground mt-1">
            전체 시스템 사용자를 관리합니다.
          </p>
        </div>

        {/* Create User Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              새 사용자 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 사용자 추가</DialogTitle>
              <DialogDescription>
                새로운 사용자 계정을 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-org">소속 조직 *</Label>
                <Select
                  value={createForm.organizationId}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, organizationId: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="조직 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-username">아이디 *</Label>
                <Input
                  id="create-username"
                  placeholder="아이디 입력"
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, username: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-name">이름</Label>
                <Input
                  id="create-name"
                  placeholder="홍길동"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">비밀번호 *</Label>
                <Input
                  id="create-password"
                  type="password"
                  placeholder="최소 6자 이상"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">역할</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value: "ADMIN" | "CLIENT") =>
                    setCreateForm({ ...createForm, role: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT">사업주</SelectItem>
                    <SelectItem value="ADMIN">관리자</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={formLoading}
              >
                취소
              </Button>
              <Button onClick={handleCreateUser} disabled={formLoading}>
                {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                생성
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>사용자 목록</CardTitle>
          <CardDescription>
            총 {filteredUsers.length}명의 사용자
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Organization Filter */}
            <div className="w-full sm:w-48">
              <Select value={orgFilter} onValueChange={setOrgFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="조직 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 조직</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role Filter Tabs */}
            <Tabs
              value={roleFilter}
              onValueChange={(value) => setRoleFilter(value as RoleFilter)}
            >
              <TabsList>
                <TabsTrigger value="all">전체</TabsTrigger>
                <TabsTrigger value="SUPER_ADMIN">슈퍼관리자</TabsTrigger>
                <TabsTrigger value="ADMIN">관리자</TabsTrigger>
                <TabsTrigger value="CLIENT">사업주</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">사용자가 없습니다.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>아이디</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>소속 조직</TableHead>
                    <TableHead>역할</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username}
                      </TableCell>
                      <TableCell>{user.name || "-"}</TableCell>
                      <TableCell>
                        {user.organization?.name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(user)}
                            disabled={session?.user?.id === user.id || user.role === "SUPER_ADMIN"}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 수정</DialogTitle>
            <DialogDescription>
              {selectedUser?.username}의 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-org">소속 조직</Label>
              <Select
                value={editForm.organizationId}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, organizationId: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="조직 선택" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">아이디</Label>
              <Input
                id="edit-username"
                placeholder="아이디"
                value={editForm.username}
                onChange={(e) =>
                  setEditForm({ ...editForm, username: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">이름</Label>
              <Input
                id="edit-name"
                placeholder="홍길동"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">역할</Label>
              <Select
                value={editForm.role}
                onValueChange={(value: "SUPER_ADMIN" | "ADMIN" | "CLIENT") =>
                  setEditForm({ ...editForm, role: value })
                }
                disabled={selectedUser?.role === "SUPER_ADMIN"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">사업주</SelectItem>
                  <SelectItem value="ADMIN">관리자</SelectItem>
                  {selectedUser?.role === "SUPER_ADMIN" && (
                    <SelectItem value="SUPER_ADMIN">슈퍼관리자</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reset-password"
                  checked={editForm.resetPassword}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      resetPassword: e.target.checked,
                      newPassword: e.target.checked ? editForm.newPassword : "",
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="reset-password">비밀번호 초기화</Label>
              </div>
              {editForm.resetPassword && (
                <Input
                  type="password"
                  placeholder="새 비밀번호 (최소 6자)"
                  value={editForm.newPassword}
                  onChange={(e) =>
                    setEditForm({ ...editForm, newPassword: e.target.value })
                  }
                />
              )}
            </div>

            {/* 사업주 탭 설정 */}
            {editForm.role === "CLIENT" && (
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium">표시할 탭 설정</Label>
                <div className="space-y-2">
                  {(Object.keys(CLIENT_TABS) as ClientTabKey[]).map((key) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label htmlFor={`tab-${key}`} className="text-sm font-normal">
                        {CLIENT_TABS[key].label}
                      </Label>
                      <Switch
                        id={`tab-${key}`}
                        checked={editForm.visibleTabs[key]}
                        onCheckedChange={(checked) =>
                          setEditForm({
                            ...editForm,
                            visibleTabs: {
                              ...editForm.visibleTabs,
                              [key]: checked,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={formLoading}
            >
              취소
            </Button>
            <Button onClick={handleEditUser} disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 <span className="font-semibold">{selectedUser?.name || selectedUser?.username}</span>을(를) 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={formLoading}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={formLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
