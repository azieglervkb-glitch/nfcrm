import { SectionHeader } from "@/components/common";
import { SettingsForm } from "./settings-form";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();

  // Only admins can access settings
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Systemeinstellungen"
        description="Konfigurieren Sie Automationen, Benachrichtigungen und Schwellwerte"
      />

      <SettingsForm />
    </div>
  );
}
