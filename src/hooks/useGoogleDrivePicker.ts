"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Google Picker API types
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: { apiKey: string; discoveryDocs?: string[] }) => Promise<void>;
        getToken: () => { access_token: string } | null;
        setToken: (token: { access_token: string }) => void;
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string; error?: string }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
      picker: {
        PickerBuilder: new () => GooglePickerBuilder;
        ViewId: {
          DOCS: string;
          FOLDERS: string;
        };
        Action: {
          PICKED: string;
          CANCEL: string;
        };
        Feature: {
          MULTISELECT_ENABLED: string;
          NAV_HIDDEN: string;
        };
        DocsView: new () => GoogleDocsView;
      };
    };
  }
}

interface GooglePickerBuilder {
  addView: (view: GoogleDocsView | string) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setCallback: (callback: (data: GooglePickerResponse) => void) => GooglePickerBuilder;
  enableFeature: (feature: string) => GooglePickerBuilder;
  setTitle: (title: string) => GooglePickerBuilder;
  setLocale: (locale: string) => GooglePickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
}

interface GoogleDocsView {
  setIncludeFolders: (include: boolean) => GoogleDocsView;
  setSelectFolderEnabled: (enabled: boolean) => GoogleDocsView;
  setMimeTypes: (mimeTypes: string) => GoogleDocsView;
}

interface GooglePickerResponse {
  action: string;
  docs?: GooglePickerDoc[];
}

export interface GooglePickerDoc {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  iconUrl?: string;
  lastEditedUtc?: number;
}

interface UseGoogleDrivePickerOptions {
  onSelect?: (docs: GooglePickerDoc[]) => void;
  multiSelect?: boolean;
}

interface UseGoogleDrivePickerReturn {
  openPicker: () => void;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
}

const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

export function useGoogleDrivePicker(
  options: UseGoogleDrivePickerOptions = {}
): UseGoogleDrivePickerReturn {
  const { onSelect, multiSelect = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenClientRef = useRef<{ requestAccessToken: () => void } | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const pickerInited = useRef(false);
  const gisInited = useRef(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

  // Load Google API scripts
  useEffect(() => {
    if (!clientId || !apiKey) {
      setError("Google API 설정이 되어있지 않습니다.");
      return;
    }

    // Load gapi (Google API client library)
    const loadGapi = () => {
      return new Promise<void>((resolve) => {
        if (window.gapi) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/api.js";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    };

    // Load GIS (Google Identity Services)
    const loadGis = () => {
      return new Promise<void>((resolve) => {
        if (window.google?.accounts?.oauth2) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    };

    const initializePicker = async () => {
      try {
        await Promise.all([loadGapi(), loadGis()]);

        // Initialize gapi picker
        await new Promise<void>((resolve) => {
          window.gapi.load("picker", () => {
            pickerInited.current = true;
            resolve();
          });
        });

        // Initialize token client
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (response) => {
            if (response.error) {
              setError("Google 로그인 실패");
              setIsLoading(false);
              return;
            }
            accessTokenRef.current = response.access_token;
            createPicker(response.access_token);
          },
        });

        gisInited.current = true;
        setIsReady(true);
      } catch (err) {
        console.error("Google Picker 초기화 실패:", err);
        setError("Google Picker 초기화 실패");
      }
    };

    initializePicker();
  }, [clientId, apiKey]);

  const createPicker = useCallback(
    (accessToken: string) => {
      if (!pickerInited.current || !window.google?.picker) {
        setError("Picker가 로드되지 않았습니다.");
        setIsLoading(false);
        return;
      }

      const view = new window.google.picker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true);

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey!)
        .setCallback((data: GooglePickerResponse) => {
          if (data.action === window.google.picker.Action.PICKED && data.docs) {
            // Convert to shareable link format
            const selectedDocs = data.docs.map((doc) => ({
              ...doc,
              url: `https://drive.google.com/file/d/${doc.id}/view`,
            }));
            onSelect?.(selectedDocs);
          }
          setIsLoading(false);
        })
        .setTitle("Google Drive에서 파일 선택")
        .setLocale("ko");

      if (multiSelect) {
        picker.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
      }

      picker.build().setVisible(true);
    },
    [apiKey, multiSelect, onSelect]
  );

  const openPicker = useCallback(() => {
    if (!isReady) {
      setError("Picker가 준비되지 않았습니다.");
      return;
    }

    setIsLoading(true);
    setError(null);

    // If we already have a token, use it
    if (accessTokenRef.current) {
      createPicker(accessTokenRef.current);
    } else {
      // Request a new token
      tokenClientRef.current?.requestAccessToken();
    }
  }, [isReady, createPicker]);

  return {
    openPicker,
    isLoading,
    isReady,
    error,
  };
}
