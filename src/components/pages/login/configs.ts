import { Mail, Lock } from "lucide-react";
import type { FieldConfig } from "@/components/dynamic-form/types";

// Login Form Config
export interface LoginFormData {
  email: string;
  password: string;
}

export const createLoginFormConfig = (
  t: (key: string) => string,
): FieldConfig<LoginFormData>[] => [
  {
    name: "email",
    type: "email",
    label: t("email"),
    placeholder: "admin@lcorner.local",
    icon: Mail,
    autoComplete: "email",
    rules: {
      required: t("validation.emailRequired"),
    },
  },
  {
    name: "password",
    type: "password",
    label: t("password"),
    placeholder: "••••••",
    icon: Lock,
    autoComplete: "current-password",
    rules: {
      required: t("validation.passwordRequired"),
      minLength: {
        value: 6,
        message: t("validation.passwordMin"),
      },
    },
  },
];
