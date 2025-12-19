import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().min(1, "프로젝트 이름은 필수입니다"),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"]).default("PLANNING"),
  capacity: z.number().positive("용량은 양수여야 합니다").optional(),
  address: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;
