import type { Metadata } from "next";
import "@/styles/tokens.css";
import "./globals.css";
import "katex/dist/katex.min.css";
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
      <head>
        {/* Inline script runs synchronously before first paint — prevents theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('gc-theme');var t=(s==='matrix'||s==='clinical')?s:((new Date().getUTCHours()+8)%24>=7&&(new Date().getUTCHours()+8)%24<19?'clinical':'matrix');document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
      </head>
      <body>
        <ThemeInit />
        {children}
      </body>
    </html>
  );
}
