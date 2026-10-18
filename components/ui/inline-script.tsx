/**
 * An inline script that runs while the HTML is parsed (before first paint)
 * and is inert on the client. React 19 warns about — and never executes —
 * <script> elements it renders in the browser, so the client copy is
 * `text/plain`; `suppressHydrationWarning` covers the type mismatch.
 * Pattern from node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
