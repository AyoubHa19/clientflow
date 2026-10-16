// A script that runs while the browser reads the HTML, before the first paint.
// On the client its type is "text/plain", so React doesn't run or warn about
// it again; suppressHydrationWarning accepts that difference.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
