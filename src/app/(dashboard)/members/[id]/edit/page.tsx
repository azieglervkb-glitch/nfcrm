import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { MemberForm } from "@/components/members/member-form";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: { id },
  });

  if (!member) {
    notFound();
  }

  // Convert dates and serialize for client
  const memberData = {
    ...member,
    onboardingDate: member.onboardingDate?.toISOString() || null,
    welcomeCallDate: member.welcomeCallDate?.toISOString() || null,
    kpiTrackingStartDate: member.kpiTrackingStartDate?.toISOString() || null,
  };

  return <MemberForm memberId={id} initialData={memberData} />;
}
