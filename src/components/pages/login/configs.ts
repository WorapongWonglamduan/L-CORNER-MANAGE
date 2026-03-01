import { User, Lock } from "lucide-react";
import { FieldConfig } from "@/components/ui/FormBuilder";

// Login Form Config
export interface LoginFormData {
  username: string;
  password: string;
}

export const createLoginFormConfig = (
  t: (key: string) => string,
): FieldConfig<LoginFormData>[] => [
  {
    name: "username",
    type: "text",
    label: t("username"),
    placeholder: "admin",
    icon: User,
    autoComplete: "username",
    rules: {
      required: t("validation.usernameRequired"),
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
