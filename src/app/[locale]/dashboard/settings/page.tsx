import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SettingsContent from "@/components/pages/settings";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  return <SettingsContent />;
}
