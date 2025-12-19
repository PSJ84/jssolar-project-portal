import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">사용자 관리</h1>
        <p className="text-muted-foreground mt-1">
          시스템 사용자를 관리합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>사용자 목록</CardTitle>
          <CardDescription>
            사용자 관리 기능은 추후 구현 예정입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            사용자 목록, 권한 관리 등이 이곳에 추가될 예정입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
