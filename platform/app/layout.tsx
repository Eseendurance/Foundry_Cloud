import type { Metadata } from "next";

import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/400-italic.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://example.com"),
  title: "Groundwork — build real software, one honest piece at a time",
  description:
    "Groundwork is a developer platform being built in the open. Every feature you see is either live today or clearly marked as in progress — nothing fake, nothing staged.",
  openGraph: {
    title: "Groundwork — build real software, one honest piece at a time",
    description:
      "A developer platform built in the open. See exactly what's live and what isn't.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Groundwork",
    description:
      "A developer platform built in the open. See exactly what's live and what isn't.",
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
