"use client";

import { Geist } from "next/font/google";
import { InlineScript } from "@/components/theme/inline-script";
import { ErrorView } from "@/components/error-view";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

// The root layout itself failed. This replaces the whole document, so it
// brings its own <html>, styles, font and theme.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body>
        <main className="flex min-h-dvh items-center justify-center">
          <ErrorView error={error} retry={retry} />
        </main>
      </body>
    </html>
  );
}
