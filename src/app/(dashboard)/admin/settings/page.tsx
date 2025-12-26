"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Pencil, Key, User, Mail, Shield, Calculator, ChevronRight, Building, Bell } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "CLIENT";
  image: string | null;
  emailVerified: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminSettingsPage() {
  const { update: updateSession } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile edit state
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({
    match: false,
    length: false,
  });

  // Company info state
  const [companyForm, setCompanyForm] = useState({
    name: "",
    ceo: "",
    businessNumber: "",
    address: "",
    phone: "",
    email: "",
  });
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    pushEnabled: true,
    todoNotify: true,
    projectNotify: true,
    constructionNotify: true,
    deadlineNotify: true,
    weeklySummary: true,
    quietHoursStart: null as number | null,
    quietHoursEnd: null as number | null,
  });
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const push = usePushNotifications();

  // Fetch profile
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users/me");
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      const data = await response.json();
      setProfile(data);
      setProfileForm({
        name: data.name || "",
        email: data.email || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("프로필을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch company info
  const fetchCompanyInfo = async () => {
    try {
      setCompanyLoading(true);
      const response = await fetch("/api/admin/company-info");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setCompanyForm({
        name: data.COMPANY_NAME || "",
        ceo: data.COMPANY_CEO || "",
        businessNumber: data.COMPANY_BUSINESS_NUMBER || "",
        address: data.COMPANY_ADDRESS || "",
        phone: data.COMPANY_PHONE || "",
        email: data.COMPANY_EMAIL || "",
      });
    } catch (error) {
      console.error("Error fetching company info:", error);
    } finally {
      setCompanyLoading(false);
    }
  };

  // Save company info
  const handleSaveCompanyInfo = async () => {
    try {
      setCompanySaving(true);
      const response = await fetch("/api/admin/company-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm),
      });

      if (!response.ok) throw new Error("Failed to save");
      toast.success("공급자 정보가 저장되었습니다.");
    } catch (error) {
      console.error("Error saving company info:", error);
      toast.error("공급자 정보 저장에 실패했습니다.");
    } finally {
      setCompanySaving(false);
    }
  };

  // Fetch notification settings
  const fetchNotificationSettings = async () => {
    try {
      setNotificationLoading(true);
      const response = await fetch("/api/notifications/settings");
      if (response.ok) {
        const data = await response.json();
        setNotificationSettings({
          pushEnabled: data.pushEnabled ?? true,
          todoNotify: data.todoNotify ?? true,
          projectNotify: data.projectNotify ?? true,
          constructionNotify: data.constructionNotify ?? true,
          deadlineNotify: data.deadlineNotify ?? true,
          weeklySummary: data.weeklySummary ?? true,
          quietHoursStart: data.quietHoursStart,
          quietHoursEnd: data.quietHoursEnd,
        });
      }
    } catch (error) {
      console.error("Error fetching notification settings:", error);
    } finally {
      setNotificationLoading(false);
    }
  };

  // Update notification setting
  const updateNotificationSetting = async (key: string, value: boolean | number | null) => {
    try {
      setNotificationSaving(true);
      const response = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (response.ok) {
        setNotificationSettings((prev) => ({ ...prev, [key]: value }));
        toast.success("알림 설정이 저장되었습니다.");
      }
    } catch (error) {
      console.error("Error updating notification settings:", error);
      toast.error("알림 설정 저장에 실패했습니다.");
    } finally {
      setNotificationSaving(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchCompanyInfo();
    fetchNotificationSettings();
  }, []);

  // Validate password
  useEffect(() => {
    setPasswordErrors({
      match:
        passwordForm.newPassword !== passwordForm.confirmPassword &&
        passwordForm.confirmPassword.length > 0,
      length:
        passwordForm.newPassword.length > 0 &&
        passwordForm.newPassword.length < 6,
    });
  }, [passwordForm.newPassword, passwordForm.confirmPassword]);

  // Update profile handler
  const handleUpdateProfile = async () => {
    try {
      setProfileLoading(true);
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);

      // Update session to reflect name change
      await updateSession({
        name: updatedProfile.name,
      });

      toast.success("프로필이 수정되었습니다.");
      setEditProfileDialogOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage === "Email already exists") {
        toast.error("이미 사용 중인 이메일입니다.");
      } else if (errorMessage === "Invalid email format") {
        toast.error("올바른 이메일 형식이 아닙니다.");
      } else {
        toast.error("프로필 수정에 실패했습니다.");
      }
    } finally {
      setProfileLoading(false);
    }
  };

  // Change password handler
  const handleChangePassword = async () => {
    // Validation
    if (!passwordForm.currentPassword) {
      toast.error("현재 비밀번호를 입력해주세요.");
      return;
    }

    if (!passwordForm.newPassword) {
      toast.error("새 비밀번호를 입력해주세요.");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("새 비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change password");
      }

      toast.success("비밀번호가 변경되었습니다.");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage === "Current password is incorrect") {
        toast.error("현재 비밀번호가 올바르지 않습니다.");
      } else if (
        errorMessage === "New password must be different from current password"
      ) {
        toast.error("새 비밀번호는 현재 비밀번호와 달라야 합니다.");
      } else if (errorMessage === "Password is not set for this account") {
        toast.error("이 계정은 비밀번호가 설정되어 있지 않습니다.");
      } else {
        toast.error("비밀번호 변경에 실패했습니다.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // Role display helper
  const getRoleLabel = (role: string) => {
    return role === "ADMIN" ? "관리자" : "사업주";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">설정</h1>
        <p className="text-muted-foreground mt-1">
          계정 설정 및 보안을 관리합니다.
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                내 프로필
              </CardTitle>
              <CardDescription>계정 기본 정보를 확인하고 수정합니다.</CardDescription>
            </div>
            <Dialog
              open={editProfileDialogOpen}
              onOpenChange={setEditProfileDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" />
                  수정
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>프로필 수정</DialogTitle>
                  <DialogDescription>
                    계정 정보를 수정합니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">이름</Label>
                    <Input
                      id="profile-name"
                      placeholder="홍길동"
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">이메일</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      placeholder="user@example.com"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, email: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setEditProfileDialogOpen(false)}
                    disabled={profileLoading}
                  >
                    취소
                  </Button>
                  <Button onClick={handleUpdateProfile} disabled={profileLoading}>
                    {profileLoading && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    저장
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  이름
                </p>
                <p className="font-medium">{profile?.name || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  이메일
                </p>
                <p className="font-medium">{profile?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  역할
                </p>
                <Badge variant={profile?.role === "ADMIN" ? "default" : "secondary"}>
                  {profile ? getRoleLabel(profile.role) : "-"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">가입일</p>
                <p className="font-medium">
                  {profile
                    ? new Date(profile.createdAt).toLocaleDateString("ko-KR")
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            비밀번호 변경
          </CardTitle>
          <CardDescription>
            계정 보안을 위해 비밀번호를 정기적으로 변경해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current-password">현재 비밀번호</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="현재 비밀번호 입력"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value,
                  })
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="new-password">새 비밀번호</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="최소 6자 이상"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
              />
              {passwordErrors.length && (
                <p className="text-sm text-destructive">
                  비밀번호는 최소 6자 이상이어야 합니다.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="새 비밀번호 다시 입력"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
              />
              {passwordErrors.match && (
                <p className="text-sm text-destructive">
                  비밀번호가 일치하지 않습니다.
                </p>
              )}
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={
                passwordLoading ||
                passwordErrors.match ||
                passwordErrors.length ||
                !passwordForm.currentPassword ||
                !passwordForm.newPassword ||
                !passwordForm.confirmPassword
              }
              className="mt-4"
            >
              {passwordLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              비밀번호 변경
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Company Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            공급자 정보
          </CardTitle>
          <CardDescription>
            견적서 PDF에 표시되는 공급자(회사) 정보를 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">상호</Label>
                  <Input
                    id="company-name"
                    placeholder="JS Solar"
                    value={companyForm.name}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-ceo">대표자</Label>
                  <Input
                    id="company-ceo"
                    placeholder="홍길동"
                    value={companyForm.ceo}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, ceo: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-bn">사업자번호</Label>
                  <Input
                    id="company-bn"
                    placeholder="123-45-67890"
                    value={companyForm.businessNumber}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, businessNumber: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone">연락처</Label>
                  <Input
                    id="company-phone"
                    placeholder="054-123-4567"
                    value={companyForm.phone}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="company-email">이메일</Label>
                  <Input
                    id="company-email"
                    type="email"
                    placeholder="info@example.com"
                    value={companyForm.email}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="company-address">주소</Label>
                  <Input
                    id="company-address"
                    placeholder="경상북도 영덕군..."
                    value={companyForm.address}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, address: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveCompanyInfo}
                disabled={companySaving}
                className="mt-4"
              >
                {companySaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                저장
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Table Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                단가표 관리
              </CardTitle>
              <CardDescription>
                견적서 작성에 사용되는 단가와 시스템 설정을 관리합니다.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/settings/price-table">
                관리
                <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>모듈, 인버터, 구조물, 인건비 등의 단가를 카테고리별로 관리할 수 있습니다.</p>
            <p className="mt-1">SMP, REC 단가, 피크시간 등 수익분석에 사용되는 시스템 설정도 함께 관리합니다.</p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            푸시 알림 설정
          </CardTitle>
          <CardDescription>
            중요한 업데이트를 실시간으로 받을 수 있도록 알림을 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notificationLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Push Subscription Status */}
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">푸시 알림 구독</p>
                    <p className="text-sm text-muted-foreground">
                      {push.isLoading
                        ? "확인 중..."
                        : !push.isSupported
                        ? "이 브라우저에서는 푸시 알림을 지원하지 않습니다."
                        : push.isSubscribed
                        ? "푸시 알림이 활성화되어 있습니다."
                        : push.permission === "denied"
                        ? "브라우저에서 알림 권한이 차단되었습니다."
                        : "푸시 알림을 활성화하세요."}
                    </p>
                  </div>
                  {push.isSupported && (
                    <Button
                      variant={push.isSubscribed ? "outline" : "default"}
                      size="sm"
                      disabled={push.isLoading || push.permission === "denied"}
                      onClick={() => push.isSubscribed ? push.unsubscribe() : push.subscribe()}
                    >
                      {push.isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : push.isSubscribed ? (
                        "구독 해제"
                      ) : (
                        "알림 받기"
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Notification Types */}
              <div className="space-y-4">
                <p className="text-sm font-medium">알림 유형</p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">전체 알림</p>
                    <p className="text-sm text-muted-foreground">모든 푸시 알림 활성화/비활성화</p>
                  </div>
                  <Switch
                    checked={notificationSettings.pushEnabled}
                    onCheckedChange={(checked) => updateNotificationSetting("pushEnabled", checked)}
                    disabled={notificationSaving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">할일 알림</p>
                    <p className="text-sm text-muted-foreground">새 할일 배정, 완료 알림</p>
                  </div>
                  <Switch
                    checked={notificationSettings.todoNotify}
                    onCheckedChange={(checked) => updateNotificationSetting("todoNotify", checked)}
                    disabled={notificationSaving || !notificationSettings.pushEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">프로젝트 알림</p>
                    <p className="text-sm text-muted-foreground">프로젝트 상태 변경, 멤버 초대 알림</p>
                  </div>
                  <Switch
                    checked={notificationSettings.projectNotify}
                    onCheckedChange={(checked) => updateNotificationSetting("projectNotify", checked)}
                    disabled={notificationSaving || !notificationSettings.pushEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">시공 알림</p>
                    <p className="text-sm text-muted-foreground">공정 시작/완료 알림</p>
                  </div>
                  <Switch
                    checked={notificationSettings.constructionNotify}
                    onCheckedChange={(checked) => updateNotificationSetting("constructionNotify", checked)}
                    disabled={notificationSaving || !notificationSettings.pushEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">마감 알림</p>
                    <p className="text-sm text-muted-foreground">기한 임박, 초과 알림</p>
                  </div>
                  <Switch
                    checked={notificationSettings.deadlineNotify}
                    onCheckedChange={(checked) => updateNotificationSetting("deadlineNotify", checked)}
                    disabled={notificationSaving || !notificationSettings.pushEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">주간 요약</p>
                    <p className="text-sm text-muted-foreground">매주 월요일 주간 요약 알림</p>
                  </div>
                  <Switch
                    checked={notificationSettings.weeklySummary}
                    onCheckedChange={(checked) => updateNotificationSetting("weeklySummary", checked)}
                    disabled={notificationSaving || !notificationSettings.pushEnabled}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
