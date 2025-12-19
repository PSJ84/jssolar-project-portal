"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">새 프로젝트</h1>

      <Card>
        <CardHeader>
          <CardTitle>프로젝트 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">프로젝트 이름</Label>
              <Input id="name" placeholder="프로젝트 이름을 입력하세요" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">설비 용량 (kW)</Label>
              <Input id="capacity" type="number" placeholder="예: 100" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">설치 주소</Label>
              <Input id="address" placeholder="주소를 입력하세요" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <textarea
                id="description"
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="프로젝트 설명을 입력하세요"
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit">저장</Button>
              <Button type="button" variant="outline">취소</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
