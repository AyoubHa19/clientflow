import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { BrandDefs } from "@/components/brand/logo";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { InlineScript } from "@/components/theme/inline-script";
import { ThemeSync } from "@/components/theme/theme-sync";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "ClientFlow", template: "%s · ClientFlow" },
  description:
    "Clients, leads, projects and tasks in one calm workspace, for freelancers and small agencies.",
  // Installed on an iPhone's home screen, it opens without Safari's bars.
  appleWebApp: { capable: true, title: "ClientFlow", statusBarStyle: "default" },
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
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body>
        <BrandDefs />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <ThemeSync />
        <ServiceWorker />
      </body>
    </html>
  );
}
