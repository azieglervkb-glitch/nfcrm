import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "NF CRM - NF Mentoring",
  description: "CRM-Plattform für das NF Mentoring - Verwalte Mitglieder, tracke KPIs und automatisiere Prozesse.",
  icons: {
    icon: "/favicon.ico",
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
