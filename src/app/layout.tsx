import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { InlineScript } from "@/components/theme/inline-script";
import { ThemeSync } from "@/components/theme/theme-sync";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "ClientFlow", template: "%s · ClientFlow" },
  description:
    "Clients, leads, projects and tasks in one calm workspace, for freelancers and small agencies.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1219" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script changes the class before React loads, hence
    // suppressHydrationWarning on <html> only.
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <ThemeSync />
      </body>
    </html>
  );
}
