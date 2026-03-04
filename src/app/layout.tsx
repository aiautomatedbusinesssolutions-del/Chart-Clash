import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chart Clash | Simple Lessons for Serious Stock Market Skills",
  description:
    "Learn to read stock market indicators through a fun, gamified experience. Master confluence and filtering across 3 progressive levels.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-slate-950 text-slate-100`}>
        <Analytics />
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
