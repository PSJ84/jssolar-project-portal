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
import { Loader2, Pencil, Key, User, Mail, Shield, Bell, AlertCircle, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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

interface NotificationSettings {
  pushEnabled: boolean;
  todoNotify: boolean;
  projectNotify: boolean;
  constructionNotify: boolean;
  deadlineNotify: boolean;
  weeklySummary: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
}

export default function SettingsPage() {
  const { update: updateSession } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Push notifications hook
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading: pushLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    todoNotify: true,
    projectNotify: true,
    constructionNotify: true,
    deadlineNotify: true,
    weeklySummary: true,
    quietHoursEnabled: false,
    quietHoursStart: 22,
    quietHoursEnd: 8,
  });
  const [notificationSettingsLoading, setNotificationSettingsLoading] = useState(false);

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

  // Fetch notification settings
  const fetchNotificationSettings = async () => {
    try {
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
          quietHoursEnabled: data.quietHoursStart !== null && data.quietHoursEnd !== null,
          quietHoursStart: data.quietHoursStart ?? 22,
          quietHoursEnd: data.quietHoursEnd ?? 8,
        });
      }
    } catch (error) {
      console.error("Error fetching notification settings:", error);
    }
  };

  // Save notification settings
  const saveNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    try {
      setNotificationSettingsLoading(true);
      const payload = {
        ...notificationSettings,
        ...settings,
        quietHoursStart: settings.quietHoursEnabled ?? notificationSettings.quietHoursEnabled
          ? (settings.quietHoursStart ?? notificationSettings.quietHoursStart)
          : null,
        quietHoursEnd: settings.quietHoursEnabled ?? notificationSettings.quietHoursEnabled
          ? (settings.quietHoursEnd ?? notificationSettings.quietHoursEnd)
          : null,
      };

      const response = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setNotificationSettings((prev) => ({ ...prev, ...settings }));
        toast.success("알림 설정이 저장되었습니다.");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast.error("알림 설정 저장에 실패했습니다.");
    } finally {
      setNotificationSettingsLoading(false);
    }
  };

  // Handle push subscription
  const handlePushToggle = async () => {
    if (isSubscribed) {
      const result = await unsubscribe();
      if (result.success) {
        toast.success("푸시 알림이 해제되었습니다.");
      } else {
        toast.error("푸시 알림 해제에 실패했습니다.");
      }
    } else {
      const result = await subscribe();
      if (result.success) {
        toast.success("푸시 알림이 활성화되었습니다.");
      } else if (permission === "denied") {
        toast.error("브라우저 설정에서 알림을 허용해주세요.");
      } else {
        toast.error("푸시 알림 활성화에 실패했습니다.");
      }
    }
  };

  useEffect(() => {
    fetchProfile();
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

      {/* Notification Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 설정
          </CardTitle>
          <CardDescription>
            푸시 알림 및 알림 유형을 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push Notification Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">푸시 알림</Label>
                <p className="text-sm text-muted-foreground">
                  브라우저 푸시 알림을 받습니다.
                </p>
              </div>
              {isSupported ? (
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={handlePushToggle}
                  disabled={pushLoading || permission === "denied"}
                />
              ) : (
                <Badge variant="secondary">미지원</Badge>
              )}
            </div>

            {/* Status Messages */}
            {!isSupported && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>이 브라우저는 푸시 알림을 지원하지 않습니다.</span>
              </div>
            )}

            {isSupported && permission === "denied" && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>브라우저 설정에서 알림을 허용해주세요.</span>
              </div>
            )}

            {isSupported && isSubscribed && (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg text-sm">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>푸시 알림이 활성화되었습니다.</span>
              </div>
            )}

            {isSupported && !isSubscribed && permission !== "denied" && (
              <Button
                onClick={handlePushToggle}
                disabled={pushLoading}
                className="w-full sm:w-auto"
              >
                {pushLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                알림 허용하기
              </Button>
            )}
          </div>

          <Separator />

          {/* Notification Types */}
          <div className="space-y-4">
            <Label className="text-base">알림 유형</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="todoNotify"
                  checked={notificationSettings.todoNotify}
                  onCheckedChange={(checked) => {
                    const newValue = checked === true;
                    setNotificationSettings((prev) => ({ ...prev, todoNotify: newValue }));
                    saveNotificationSettings({ todoNotify: newValue });
                  }}
                  disabled={notificationSettingsLoading}
                />
                <Label htmlFor="todoNotify" className="font-normal cursor-pointer">
                  할 일 알림
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="projectNotify"
                  checked={notificationSettings.projectNotify}
                  onCheckedChange={(checked) => {
                    const newValue = checked === true;
                    setNotificationSettings((prev) => ({ ...prev, projectNotify: newValue }));
                    saveNotificationSettings({ projectNotify: newValue });
                  }}
                  disabled={notificationSettingsLoading}
                />
                <Label htmlFor="projectNotify" className="font-normal cursor-pointer">
                  프로젝트 상태 변경
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="constructionNotify"
                  checked={notificationSettings.constructionNotify}
                  onCheckedChange={(checked) => {
                    const newValue = checked === true;
                    setNotificationSettings((prev) => ({ ...prev, constructionNotify: newValue }));
                    saveNotificationSettings({ constructionNotify: newValue });
                  }}
                  disabled={notificationSettingsLoading}
                />
                <Label htmlFor="constructionNotify" className="font-normal cursor-pointer">
                  시공 진행 알림
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="deadlineNotify"
                  checked={notificationSettings.deadlineNotify}
                  onCheckedChange={(checked) => {
                    const newValue = checked === true;
                    setNotificationSettings((prev) => ({ ...prev, deadlineNotify: newValue }));
                    saveNotificationSettings({ deadlineNotify: newValue });
                  }}
                  disabled={notificationSettingsLoading}
                />
                <Label htmlFor="deadlineNotify" className="font-normal cursor-pointer">
                  기한 임박 알림
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="weeklySummary"
                  checked={notificationSettings.weeklySummary}
                  onCheckedChange={(checked) => {
                    const newValue = checked === true;
                    setNotificationSettings((prev) => ({ ...prev, weeklySummary: newValue }));
                    saveNotificationSettings({ weeklySummary: newValue });
                  }}
                  disabled={notificationSettingsLoading}
                />
                <Label htmlFor="weeklySummary" className="font-normal cursor-pointer">
                  주간 요약
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">방해금지 시간</Label>
                <p className="text-sm text-muted-foreground">
                  설정한 시간에는 알림을 보내지 않습니다.
                </p>
              </div>
              <Switch
                checked={notificationSettings.quietHoursEnabled}
                onCheckedChange={(checked) => {
                  setNotificationSettings((prev) => ({ ...prev, quietHoursEnabled: checked }));
                  saveNotificationSettings({ quietHoursEnabled: checked });
                }}
                disabled={notificationSettingsLoading}
              />
            </div>

            {notificationSettings.quietHoursEnabled && (
              <div className="flex items-center gap-4 pl-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="quietStart" className="text-sm whitespace-nowrap">
                    시작
                  </Label>
                  <select
                    id="quietStart"
                    value={notificationSettings.quietHoursStart ?? 22}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value);
                      setNotificationSettings((prev) => ({ ...prev, quietHoursStart: newValue }));
                      saveNotificationSettings({ quietHoursStart: newValue });
                    }}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    disabled={notificationSettingsLoading}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="quietEnd" className="text-sm whitespace-nowrap">
                    종료
                  </Label>
                  <select
                    id="quietEnd"
                    value={notificationSettings.quietHoursEnd ?? 8}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value);
                      setNotificationSettings((prev) => ({ ...prev, quietHoursEnd: newValue }));
                      saveNotificationSettings({ quietHoursEnd: newValue });
                    }}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    disabled={notificationSettingsLoading}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
