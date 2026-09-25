import type { TFunction } from "i18next";
import { z } from "zod";

// The shared sign-in page: one field for a staff username or a мизоҷ email (lib/signIn.ts).
export const createSignInSchema = (t: TFunction) =>
  z.object({
    identifier: z.string().trim().min(1, t("identifierRequired", { ns: "validation" })),
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

export type SignInForm = z.infer<ReturnType<typeof createSignInSchema>>;
/** Body of the staff POST /api/auth/login. */
export type LoginForm = { username: string; password: string };
export type ChangePasswordForm = z.infer<ReturnType<typeof createChangePasswordSchema>>;
