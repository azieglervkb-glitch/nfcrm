import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.nf-mentoring.de";

export const metadata: Metadata = {
  title: "NF CRM - NF Mentoring",
  description: "CRM-Plattform für das NF Mentoring - Verwalte Mitglieder, tracke KPIs und automatisiere Prozesse.",

  // Favicon & Icons
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },

  // Open Graph (WhatsApp, Facebook, Slack, etc.)
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: siteUrl,
    siteName: "NF CRM",
    title: "NF CRM - NF Mentoring",
    description: "CRM-Plattform für das NF Mentoring - Verwalte Mitglieder, tracke KPIs und automatisiere Prozesse.",
    images: [
      {
        url: `${siteUrl}/favicon.png`,
        width: 512,
        height: 512,
        alt: "NF Mentoring Logo",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary",
    title: "NF CRM - NF Mentoring",
    description: "CRM-Plattform für das NF Mentoring",
    images: [`${siteUrl}/favicon.png`],
  },

  // PWA / Mobile
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NF CRM",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
