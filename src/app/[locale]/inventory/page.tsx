import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import InventoryContent from "@/components/pages/inventory";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inventory");
  return {
    title: t("title"),
  };
}

export default function InventoryPage() {
  return <InventoryContent />;
}
