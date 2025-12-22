import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KnowledgeForm } from "@/components/knowledge/KnowledgeForm";

export default function NewKnowledgePage() {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>새 지식노트 작성</CardTitle>
        </CardHeader>
        <CardContent>
          <KnowledgeForm />
        </CardContent>
      </Card>
    </div>
  );
}
