"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushSubscriptionBanner() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 이미 닫은 배너인지 확인
    const isDismissed = localStorage.getItem("push-banner-dismissed");
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("push-banner-dismissed", "true");
  };

  const handleSubscribe = async () => {
    const result = await subscribe();
    if (result.success) {
      setDismissed(true);
    }
  };

  // 배너를 표시하지 않는 조건
  if (
    dismissed ||
    isLoading ||
    !isSupported ||
    isSubscribed ||
    permission === "denied"
  ) {
    return null;
  }

  return (
    <Alert className="mb-4 bg-green-50 border-green-200">
      <Bell className="h-4 w-4 text-green-600" />
      <AlertDescription className="flex items-center justify-between flex-1 ml-2">
        <span className="text-sm text-green-800">
          푸시 알림을 활성화하면 중요한 업데이트를 실시간으로 받을 수 있습니다.
        </span>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="default"
            size="sm"
            onClick={handleSubscribe}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            알림 받기
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
