"use client";

import { ErrorView } from "@/components/error-view";

// A page inside the app failed: the shell (navigation) stays.
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorView error={error} retry={retry} />;
}
