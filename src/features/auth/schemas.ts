import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const registrationSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name.").max(255),
  email: z.email("Enter a valid email address."),
  password: z.string().min(12, "Use at least 12 characters.").max(128),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegistrationValues = z.infer<typeof registrationSchema>;
