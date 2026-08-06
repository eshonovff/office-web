import type { TFunction } from "i18next";
import { z } from "zod";

export const createLoginSchema = (t: TFunction) =>
  z.object({
    username: z.string().min(1, t("usernameRequired", { ns: "validation" })),
    password: z.string().min(1, t("passwordRequired", { ns: "validation" })),
  });

export const createChangePasswordSchema = (t: TFunction) =>
  z
    .object({
      currentPassword: z.string().min(1, t("oldPassRequired", { ns: "validation" })),
      newPassword: z.string().min(8, t("passwordMinLength", { ns: "validation" })),
      confirmPassword: z.string().min(8, t("passwordMinLength", { ns: "validation" })),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("passwordsMustMatch", { ns: "validation" }),
      path: ["confirmPassword"],
    });

export type LoginForm = z.infer<ReturnType<typeof createLoginSchema>>;
export type ChangePasswordForm = z.infer<ReturnType<typeof createChangePasswordSchema>>;
