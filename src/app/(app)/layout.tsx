import { AppShell } from "@/components/shell/app-shell";

// Every page in the (app) group sits inside the shell. The group's name
// isn't part of the URL. From Stage 3 these pages also require sign-in.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
