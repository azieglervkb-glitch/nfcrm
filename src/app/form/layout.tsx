import { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.nf-mentoring.de";

export const metadata: Metadata = {
  title: "NF Mentoring",
  description: "Willkommen beim NF Mentoring - Dein Weg zum Erfolg in der Finanzberatung.",

  openGraph: {
    type: "website",
    locale: "de_DE",
    url: siteUrl,
    siteName: "NF Mentoring",
    title: "NF Mentoring",
    description: "Willkommen beim NF Mentoring - Dein Weg zum Erfolg in der Finanzberatung.",
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
    description: "Willkommen beim NF Mentoring",
    images: [`${siteUrl}/nf-logo.png`],
  },
};

export default function FormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
