import { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://member.nf-mentoring.de";

export const metadata: Metadata = {
  title: "NF Mentoring - Member Portal",
  description: "Dein persönlicher Bereich im NF Mentoring - Verfolge deine Fortschritte und erreiche deine Ziele.",

  openGraph: {
    type: "website",
    locale: "de_DE",
    url: siteUrl,
    siteName: "NF Mentoring",
    title: "NF Mentoring - Member Portal",
    description: "Dein persönlicher Bereich im NF Mentoring - Verfolge deine Fortschritte und erreiche deine Ziele.",
    images: [
      {
        url: `${siteUrl}/nf-logo.png`,
        width: 512,
        height: 512,
        alt: "NF Mentoring Logo",
      },
    ],
  },

  twitter: {
    card: "summary",
    title: "NF Mentoring",
    description: "Member Portal - NF Mentoring",
    images: [`${siteUrl}/nf-logo.png`],
  },
};

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
