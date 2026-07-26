import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { Package, ShoppingCart, BarChart3, LucideIcon } from "lucide-react";
import { createLoginFormConfig } from "./configs";

export interface FeatureItem {
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
}

export type LoginFormData = {
  email: string;
  password: string;
};

export const loginFeatures: FeatureItem[] = [
  {
    icon: Package,
    titleKey: "features.inventory.title",
    descriptionKey: "features.inventory.description",
  },
  {
    icon: ShoppingCart,
    titleKey: "features.sales.title",
    descriptionKey: "features.sales.description",
  },
  {
    icon: BarChart3,
    titleKey: "features.reports.title",
    descriptionKey: "features.reports.description",
  },
];

export const brandingConfig = {
  iconSize: {
    large: "w-7 h-7",
    medium: "w-5 h-5",
  },
  containerSize: {
    large: "w-12 h-12",
    medium: "w-10 h-10",
  },
};

export const useLoginForm = () => {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("auth.login");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("error"));
      } else {
        router.push(`/${locale}`);
        router.refresh();
      }
    } catch {
      setError(t("serverError"));
    } finally {
      setIsLoading(false);
    }
  };

  const formConfig = {
    fields: createLoginFormConfig(t),
    submitLabel: t("submit"),
    loadingLabel: t("loading"),
  };

  return {
    control,
    handleSubmit,
    onSubmit,
    errors,
    error,
    isLoading,
    formConfig,
  };
};
