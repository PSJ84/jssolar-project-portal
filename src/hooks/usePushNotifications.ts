"use client";

import { useState, useEffect, useCallback } from 'react';

interface PushStatus {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>({
    isSupported: false,
    permission: 'unsupported',
    isSubscribed: false,
    isLoading: true,
  });

  // 초기 상태 체크
  useEffect(() => {
    const checkStatus = async () => {
      // 브라우저 지원 여부 확인
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

      if (!isSupported) {
        setStatus({
          isSupported: false,
          permission: 'unsupported',
          isSubscribed: false,
          isLoading: false,
        });
        return;
      }

      // 권한 상태 확인
      const permission = Notification.permission;

      // 서버에서 구독 상태 확인
      try {
        const response = await fetch('/api/push/status');
        const data = await response.json();

        setStatus({
          isSupported: true,
          permission,
          isSubscribed: data.isSubscribed && permission === 'granted',
          isLoading: false,
        });
      } catch (error) {
        console.error('[Push] Error checking status:', error);
        setStatus({
          isSupported: true,
          permission,
          isSubscribed: false,
          isLoading: false,
        });
      }
    };

    checkStatus();
  }, []);

  // 서비스 워커 등록
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return registration;
  }, []);

  // VAPID 공개키 가져오기
  const getVapidKey = useCallback(async () => {
    const response = await fetch('/api/push/vapid-key');
    const data = await response.json();
    return data.publicKey;
  }, []);

  // URL-safe base64 to Uint8Array 변환
  const urlBase64ToUint8Array = useCallback((base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }, []);

  // 푸시 알림 구독
  const subscribe = useCallback(async () => {
    try {
      setStatus((prev) => ({ ...prev, isLoading: true }));

      // 권한 요청
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus((prev) => ({
          ...prev,
          permission,
          isSubscribed: false,
          isLoading: false
        }));
        return { success: false, error: 'Permission denied' };
      }

      // 서비스 워커 등록
      const registration = await registerServiceWorker();

      // VAPID 키 가져오기
      const vapidKey = await getVapidKey();

      // 기존 구독 확인
      let subscription = await registration.pushManager.getSubscription();

      // 구독이 없으면 새로 생성
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      // 서버에 구독 정보 전송
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe on server');
      }

      setStatus((prev) => ({
        ...prev,
        permission: 'granted',
        isSubscribed: true,
        isLoading: false,
      }));

      return { success: true };
    } catch (error) {
      console.error('[Push] Subscribe error:', error);
      setStatus((prev) => ({ ...prev, isLoading: false }));
      return { success: false, error: String(error) };
    }
  }, [registerServiceWorker, getVapidKey, urlBase64ToUint8Array]);

  // 푸시 알림 구독 해제
  const unsubscribe = useCallback(async () => {
    try {
      setStatus((prev) => ({ ...prev, isLoading: true }));

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // 서버에서 구독 제거
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        // 브라우저에서 구독 해제
        await subscription.unsubscribe();
      }

      setStatus((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      return { success: true };
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
      setStatus((prev) => ({ ...prev, isLoading: false }));
      return { success: false, error: String(error) };
    }
  }, []);

  return {
    ...status,
    subscribe,
    unsubscribe,
  };
}
