"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Edit, X, Save, Loader2 } from "lucide-react";

const projectFormSchema = z.object({
  name: z.string().min(1, "프로젝트 이름은 필수입니다."),
  description: z.string().optional(),
  location: z.string().optional(),
  capacityKw: z.string().optional(),
  // 모듈 정보
  moduleManufacturer: z.string().optional(),
  moduleModel: z.string().optional(),
  moduleCapacity: z.string().optional(),
  moduleQuantity: z.string().optional(),
  // 인버터 정보
  inverterManufacturer: z.string().optional(),
  inverterModel: z.string().optional(),
  inverterCapacity: z.string().optional(),
  inverterQuantity: z.string().optional(),
  // 구조물 정보
  structureType: z.string().optional(),
  structureManufacturer: z.string().optional(),
  // 메모
  notes: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectOverviewEditProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    location: string | null;
    capacityKw: number | null;
    moduleManufacturer: string | null;
    moduleModel: string | null;
    moduleCapacity: string | null;
    moduleQuantity: number | null;
    inverterManufacturer: string | null;
    inverterModel: string | null;
    inverterCapacity: string | null;
    inverterQuantity: number | null;
    structureType: string | null;
    structureManufacturer: string | null;
    notes: string | null;
  };
}

export function ProjectOverviewEdit({ project }: ProjectOverviewEditProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project.name || "",
      description: project.description || "",
      location: project.location || "",
      capacityKw: project.capacityKw ? String(project.capacityKw) : "",
      moduleManufacturer: project.moduleManufacturer || "",
      moduleModel: project.moduleModel || "",
      moduleCapacity: project.moduleCapacity || "",
      moduleQuantity: project.moduleQuantity ? String(project.moduleQuantity) : "",
      inverterManufacturer: project.inverterManufacturer || "",
      inverterModel: project.inverterModel || "",
      inverterCapacity: project.inverterCapacity || "",
      inverterQuantity: project.inverterQuantity ? String(project.inverterQuantity) : "",
      structureType: project.structureType || "",
      structureManufacturer: project.structureManufacturer || "",
      notes: project.notes || "",
    },
  });

  async function onSubmit(data: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          location: data.location || null,
          capacityKw: data.capacityKw ? Number(data.capacityKw) : null,
          moduleManufacturer: data.moduleManufacturer || null,
          moduleModel: data.moduleModel || null,
          moduleCapacity: data.moduleCapacity || null,
          moduleQuantity: data.moduleQuantity ? Number(data.moduleQuantity) : null,
          inverterManufacturer: data.inverterManufacturer || null,
          inverterModel: data.inverterModel || null,
          inverterCapacity: data.inverterCapacity || null,
          inverterQuantity: data.inverterQuantity ? Number(data.inverterQuantity) : null,
          structureType: data.structureType || null,
          structureManufacturer: data.structureManufacturer || null,
          notes: data.notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "프로젝트 저장에 실패했습니다.");
      }

      toast.success("프로젝트 정보가 수정되었습니다.");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    form.reset();
    setIsEditing(false);
  }

  // 읽기 모드
  if (!isEditing) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>프로젝트 정보</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">프로젝트명</p>
                <p className="text-sm">{project.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">위치</p>
                <p className="text-sm">{project.location || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">용량</p>
                <p className="text-sm">
                  {project.capacityKw ? `${project.capacityKw.toLocaleString()} kW` : "-"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">설명</p>
              <p className="text-sm whitespace-pre-wrap">{project.description || "-"}</p>
            </div>
          </CardContent>
        </Card>

        {/* 설비 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>설비 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 모듈 정보 */}
            <div>
              <h4 className="text-sm font-semibold mb-2">모듈</h4>
              {project.moduleManufacturer || project.moduleModel ? (
                <p className="text-sm">
                  {[
                    project.moduleManufacturer,
                    project.moduleModel,
                    project.moduleCapacity,
                    project.moduleQuantity ? `x ${project.moduleQuantity}장` : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">등록된 정보가 없습니다.</p>
              )}
            </div>

            {/* 인버터 정보 */}
            <div>
              <h4 className="text-sm font-semibold mb-2">인버터</h4>
              {project.inverterManufacturer || project.inverterModel ? (
                <p className="text-sm">
                  {[
                    project.inverterManufacturer,
                    project.inverterModel,
                    project.inverterCapacity,
                    project.inverterQuantity ? `x ${project.inverterQuantity}대` : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">등록된 정보가 없습니다.</p>
              )}
            </div>

            {/* 구조물 정보 */}
            <div>
              <h4 className="text-sm font-semibold mb-2">구조물</h4>
              {project.structureType || project.structureManufacturer ? (
                <p className="text-sm">
                  {project.structureType}
                  {project.structureManufacturer && ` (${project.structureManufacturer})`}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">등록된 정보가 없습니다.</p>
              )}
            </div>

            {/* 메모 */}
            {project.notes && (
              <div>
                <h4 className="text-sm font-semibold mb-2">메모</h4>
                <p className="text-sm whitespace-pre-wrap">{project.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // 편집 모드
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>프로젝트 정보 수정</CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                저장
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>프로젝트명 *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>위치</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 서울시 강남구" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacityKw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>용량 (kW)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="프로젝트 설명"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 설비 정보 편집 */}
        <Card>
          <CardHeader>
            <CardTitle>설비 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 모듈 정보 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">모듈</h4>
              <div className="grid gap-4 md:grid-cols-4">
                <FormField
                  control={form.control}
                  name="moduleManufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제조사</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 한화큐셀" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="moduleModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>모델명</FormLabel>
                      <FormControl>
                        <Input placeholder="예: Q.PEAK DUO" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="moduleCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>용량</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 550W" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="moduleQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>수량</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="예: 180" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 인버터 정보 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">인버터</h4>
              <div className="grid gap-4 md:grid-cols-4">
                <FormField
                  control={form.control}
                  name="inverterManufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제조사</FormLabel>
                      <FormControl>
                        <Input placeholder="예: SMA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="inverterModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>모델명</FormLabel>
                      <FormControl>
                        <Input placeholder="예: STP50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="inverterCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>용량</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 50kW" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="inverterQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>수량</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="예: 2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 구조물 정보 */}
            <div>
              <h4 className="text-sm font-semibold mb-3">구조물</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="structureType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>종류</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 고정식, 추적식" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="structureManufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제조사</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 넥스트솔라" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 메모 */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메모</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="기타 메모 사항"
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
