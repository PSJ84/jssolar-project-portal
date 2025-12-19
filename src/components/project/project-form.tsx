"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const projectFormSchema = z.object({
  name: z.string().min(1, "프로젝트 이름은 필수입니다."),
  description: z.string().optional(),
  location: z.string().optional(),
  capacityKw: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  defaultValues?: {
    name?: string;
    description?: string;
    location?: string;
    capacityKw?: number | string;
  };
  projectId?: string;
}

export function ProjectForm({ defaultValues, projectId }: ProjectFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      location: defaultValues?.location || "",
      capacityKw: defaultValues?.capacityKw ? String(defaultValues.capacityKw) : "",
    },
  });

  async function onSubmit(data: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      const url = projectId ? `/api/projects/${projectId}` : "/api/projects";
      const method = projectId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          location: data.location || null,
          capacityKw: data.capacityKw ? Number(data.capacityKw) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "프로젝트 저장에 실패했습니다.");
      }

      const result = await response.json();
      toast.success(projectId ? "프로젝트가 수정되었습니다." : "프로젝트가 생성되었습니다.");
      router.push(`/admin/projects/${result.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>프로젝트 이름 *</FormLabel>
              <FormControl>
                <Input placeholder="태양광 발전소 이름" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                프로젝트에 대한 간단한 설명을 입력하세요.
              </FormDescription>
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
                <Input
                  type="number"
                  placeholder="100"
                  step="0.01"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                태양광 발전소의 설비 용량을 입력하세요.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "저장 중..." : projectId ? "수정" : "생성"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            취소
          </Button>
        </div>
      </form>
    </Form>
  );
}
