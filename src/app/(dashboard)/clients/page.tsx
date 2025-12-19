import { Button } from "@/components/ui/button";

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">고객 관리</h1>
        <Button>새 고객</Button>
      </div>

      <div className="text-center py-12 text-muted-foreground">
        등록된 고객이 없습니다.
      </div>
    </div>
  );
}
