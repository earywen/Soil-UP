import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soil'UP — Diagnostic Historique & Foncier (SSP NF X 31-620)",
  description: "Plateforme automatisée d'investigation préliminaire des sites et sols pollués pour ingénieurs en environnement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className="h-full w-full antialiased flex flex-col">{children}</body>
    </html>
  );
}
