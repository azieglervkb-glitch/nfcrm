import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardLayout
      user={{
        vorname: session.user.vorname,
        nachname: session.user.nachname,
        email: session.user.email || undefined,
        role: session.user.role,
        avatarUrl: session.user.avatarUrl,
        permissions: session.user.permissions,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
