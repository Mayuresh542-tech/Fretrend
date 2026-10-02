import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veelox — AI Video Studio",
  description: "Turn your ideas into engaging videos with AI. Trend → Idea → Script → Voice → Assets → Edit → Captions → Export.",
};

import { Suspense } from "react";
import ReferralTracker from "./components/ReferralTracker";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#FAFAFA] text-[#0F172A]">
        <Suspense fallback={null}>
          <ReferralTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
