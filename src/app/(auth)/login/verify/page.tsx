import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

export default function VerifyRequestPage() {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">이메일을 확인하세요</CardTitle>
        <CardDescription>
          로그인 링크가 이메일로 전송되었습니다
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground space-y-2">
        <p>입력하신 이메일 주소로 로그인 링크를 보내드렸습니다.</p>
        <p>이메일의 링크를 클릭하여 로그인을 완료하세요.</p>
        <p className="mt-4 text-xs">
          이메일이 보이지 않으면 스팸 폴더를 확인해주세요.
        </p>
      </CardContent>
    </Card>
  );
}
