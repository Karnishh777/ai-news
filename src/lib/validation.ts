import { z } from "zod";

// Email regex kept explicit to stay stable across zod major versions.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Email is required")
  .max(254)
  .regex(EMAIL, "Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Tell us your name").max(80),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const categoryEnum = z.enum([
  "technology", "ai", "science", "business", "finance", "startups",
  "cricket", "football", "sports", "movies", "gaming", "politics",
  "education", "health", "space", "world", "local", "environment",
  "stock-market", "entrepreneurship",
]);

export const onboardingSchema = z.object({
  interests: z.array(categoryEnum).min(3, "Pick at least 3 interests").max(20),
  language: z.enum(["en", "ta", "hi", "te", "ml", "kn"]),
  newsLength: z.enum(["headlines", "short", "detailed"]),
  notification: z.enum(["breaking", "digest", "both"]),
  location: z.string().trim().max(120).optional(),
});

export const settingsSchema = onboardingSchema.extend({
  fullName: z.string().trim().min(2, "Tell us your name").max(80),
});

export const interactionSchema = z.object({
  type: z.enum(["click", "like", "share", "save", "view", "read_time", "category_open"]),
  articleId: z.string().optional(),
  category: categoryEnum.optional(),
  value: z.number().optional(),
});

export const bookmarkSchema = z.object({
  articleId: z.string().min(1),
  action: z.enum(["add", "remove"]).default("add"),
});

/** Flatten a ZodError into { field: [messages] } for API responses. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
