import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// 사용자 생성 스키마
export const createUserSchema = z.object({
  name: z.string().min(1, "이름을 입력하세요"),
  email: z.string().email("유효한 이메일을 입력하세요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
  role: z.enum(["ADMIN", "CLIENT"]),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

// 사용자 수정 스키마
export const updateUserSchema = z.object({
  name: z.string().min(1, "이름을 입력하세요").optional(),
  role: z.enum(["ADMIN", "CLIENT"]).optional(),
  resetPassword: z.boolean().optional(),
  newPassword: z.string().min(6, "비밀번호는 6자 이상이어야 합니다").optional(),
});

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;

// 내 프로필 수정 스키마
export const updateProfileSchema = z.object({
  name: z.string().min(1, "이름을 입력하세요"),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

// 비밀번호 변경 스키마
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력하세요"),
  newPassword: z.string().min(6, "새 비밀번호는 6자 이상이어야 합니다"),
  confirmPassword: z.string().min(1, "비밀번호 확인을 입력하세요"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "새 비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
