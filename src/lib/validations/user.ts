import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
