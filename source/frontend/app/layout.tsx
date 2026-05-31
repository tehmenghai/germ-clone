import type { Metadata } from "next";
import "@/styles/tokens.css";
import "./globals.css";
import { ThemeInit } from "@/components/shell/ThemeInit";

export const metadata: Metadata = {
  title: "germ//clone",
  description: "AI ML Tutor — Module 3",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="matrix" suppressHydrationWarning>
      <head />
      <body>
        <ThemeInit />
        {children}
      </body>
    </html>
  );
}
