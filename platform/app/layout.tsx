import type { Metadata } from "next";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://example.com"),
  title: "Foundry Cloud",
  description:
    "A self-hostable workspace for building applications and managing your project infrastructure.",
  openGraph: {
    title: "Foundry Cloud",
    description: "A self-hostable workspace for building and operating software.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Foundry Cloud",
    description: "A self-hostable workspace for building and operating software.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
