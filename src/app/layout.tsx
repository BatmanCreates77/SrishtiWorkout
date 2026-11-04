import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { IS_TEST } from "@/lib/env";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: IS_TEST ? "TEST · Srishti Workout" : "Srishti Workout",
  description: "Science-based fitness assessment, personalised training and an AI coach.",
  appleWebApp: { capable: true, title: IS_TEST ? "Workout TEST" : "Srishti Workout", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#14110f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {IS_TEST && <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 bg-amber-500" />}
        {children}
      </body>
    </html>
  );
}
