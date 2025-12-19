import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle>계정 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">설정 기능이 곧 추가됩니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
