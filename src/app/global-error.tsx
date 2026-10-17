"use client";

import { Manrope } from "next/font/google";
import { BrandDefs } from "@/components/brand/logo";
import { InlineScript } from "@/components/theme/inline-script";
import { ErrorView } from "@/components/error-view";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });

// The root layout itself failed. This replaces the whole document, so it
// brings its own <html>, styles, font and theme.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body>
        <BrandDefs />
        <main className="flex min-h-dvh items-center justify-center">
          <ErrorView error={error} retry={retry} />
        </main>
      </body>
    </html>
  );
}
