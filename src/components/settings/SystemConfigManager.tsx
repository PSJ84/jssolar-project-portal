"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, RefreshCw } from "lucide-react";

interface ConfigItem {
  id: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

type ConfigMap = Record<string, ConfigItem>;

// 설정 키 정의
const CONFIG_FIELDS = [
  {
    key: "SMP_PRICE",
    label: "SMP 단가",
    unit: "원/kWh",
    type: "number" as const,
    step: 1,
  },
  {
    key: "REC_PRICE",
    label: "REC 단가",
    unit: "원/REC",
    type: "number" as const,
    step: 1,
  },
  {
    key: "REC_WEIGHT",
    label: "REC 가중치",
    unit: "",
    type: "number" as const,
    step: 0.1,
  },
  {
    key: "PEAK_HOURS",
    label: "피크시간",
    unit: "시간/일",
    type: "number" as const,
    step: 0.1,
  },
  {
    key: "DEGRADATION_RATE",
    label: "효율저하율",
    unit: "%/년",
    type: "number" as const,
    step: 0.001,
    displayMultiplier: 100, // 저장은 0.008, 표시는 0.8%
  },
  {
    key: "MAINTENANCE_COST",
    label: "안전관리비",
    unit: "원/년",
    type: "number" as const,
    step: 10000,
  },
  {
    key: "MONITORING_COST",
    label: "모니터링비",
    unit: "원/년",
    type: "number" as const,
    step: 10000,
  },
  {
    key: "QUOTATION_VALID_DAYS",
    label: "견적 유효기간",
    unit: "일",
    type: "number" as const,
    step: 1,
  },
];

export function SystemConfigManager() {
  const [config, setConfig] = useState<ConfigMap>({});
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch config
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/system-config");
      if (!response.ok) throw new Error("Failed to fetch config");
      const data: ConfigMap = await response.json();
      setConfig(data);

      // 폼 초기화
      const initialForm: Record<string, string> = {};
      CONFIG_FIELDS.forEach((field) => {
        let value = data[field.key]?.value || "";
        // 효율저하율은 퍼센트로 표시
        if (field.displayMultiplier && value) {
          value = (parseFloat(value) * field.displayMultiplier).toString();
        }
        initialForm[field.key] = value;
      });
      setForm(initialForm);
      setHasChanges(false);
    } catch (error) {
      console.error("Error fetching config:", error);
      toast.error("설정을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Handle form change
  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Reset to original values
  const handleReset = () => {
    const initialForm: Record<string, string> = {};
    CONFIG_FIELDS.forEach((field) => {
      let value = config[field.key]?.value || "";
      if (field.displayMultiplier && value) {
        value = (parseFloat(value) * field.displayMultiplier).toString();
      }
      initialForm[field.key] = value;
    });
    setForm(initialForm);
    setHasChanges(false);
  };

  // Save config
  const handleSave = async () => {
    try {
      setSaving(true);

      // 저장할 데이터 준비
      const data: Record<string, string> = {};
      CONFIG_FIELDS.forEach((field) => {
        let value = form[field.key];
        // 효율저하율은 원래 값으로 변환
        if (field.displayMultiplier && value) {
          value = (parseFloat(value) / field.displayMultiplier).toString();
        }
        data[field.key] = value;
      });

      const response = await fetch("/api/admin/system-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to save config");

      const updatedConfig: ConfigMap = await response.json();
      setConfig(updatedConfig);
      setHasChanges(false);
      toast.success("설정이 저장되었습니다.");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>수익분석 설정</CardTitle>
          <CardDescription>
            수익분석 계산에 사용되는 기본값을 설정합니다.
            6개월마다 시장 상황에 맞게 업데이트하는 것을 권장합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CONFIG_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>
                  {field.label}
                  {field.unit && (
                    <span className="text-muted-foreground ml-1">
                      ({field.unit})
                    </span>
                  )}
                </Label>
                <Input
                  id={field.key}
                  type={field.type}
                  step={field.step}
                  value={form[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={config[field.key]?.description || field.label}
                />
                {config[field.key]?.updatedAt && (
                  <p className="text-xs text-muted-foreground">
                    마지막 수정:{" "}
                    {new Date(config[field.key].updatedAt).toLocaleDateString("ko-KR")}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || saving}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              되돌리기
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              저장
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>참고사항</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>SMP 단가:</strong> 계통한계가격(System Marginal Price). 전력거래소에서 발표하는 실시간 전력 가격입니다.
            </p>
            <p>
              <strong>REC 단가:</strong> 신재생에너지 공급인증서(Renewable Energy Certificate) 가격. 전력거래소 REC 거래시장 가격을 참고하세요.
            </p>
            <p>
              <strong>REC 가중치:</strong> 태양광 설치 유형에 따른 가중치입니다. 일반 태양광은 1.0, 건물부착형 1.5 등입니다.
            </p>
            <p>
              <strong>피크시간:</strong> 일일 평균 발전시간입니다. 지역별로 3.6~3.8시간 정도입니다.
            </p>
            <p>
              <strong>효율저하율:</strong> 태양광 모듈의 연간 효율 감소율입니다. 일반적으로 0.5~0.8% 정도입니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
