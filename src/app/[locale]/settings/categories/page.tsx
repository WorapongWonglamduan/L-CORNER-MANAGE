import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import CategoriesContent from "@/components/pages/settings/categories";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "settings.categories",
  });

  return {
    title: t("title"),
  };
}

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  return <CategoriesContent />;
}
