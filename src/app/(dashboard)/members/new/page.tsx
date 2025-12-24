import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MemberForm } from "@/components/members/member-form";

export default async function NewMemberPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Only admins can create members
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    redirect("/members");
  }

  return <MemberForm />;
}
