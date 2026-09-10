import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShePlates — Agentic Hyperlocal Commerce",
  description: "Scheduled local essentials, vendor verification, quotation commerce and role-controlled She Agent workflows.",
  manifest: "/manifest.webmanifest",
  other: { "codex-preview": "development" },
  icons: {
    icon: "/sheplates-logo.png",
    shortcut: "/sheplates-logo.png",
    apple: "/sheplates-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
