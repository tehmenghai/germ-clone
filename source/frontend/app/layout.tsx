import type { Metadata } from "next";
import "@/styles/tokens.css";
import "./globals.css";
import "katex/dist/katex.min.css";

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
            __html: `(function(){try{var h=(new Date().getUTCHours()+8)%24;document.documentElement.setAttribute('data-theme',h>=7&&h<19?'clinical':'matrix');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
