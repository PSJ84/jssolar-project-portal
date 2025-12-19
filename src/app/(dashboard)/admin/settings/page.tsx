import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">관리자 설정</h1>
        <p className="text-muted-foreground mt-1">
          시스템 설정 및 관리자 옵션을 관리합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>시스템 설정</CardTitle>
          <CardDescription>
            관리자 설정 기능은 추후 구현 예정입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            시스템 관리, 권한 설정 등이 이곳에 추가될 예정입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
