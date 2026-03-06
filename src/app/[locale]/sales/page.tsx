import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SalesContent from "@/components/pages/sales";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sales");
  return {
    title: t("title"),
  };
}

export default function SalesPage() {
  return <SalesContent />;
}
