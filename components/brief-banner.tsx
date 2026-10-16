/**
 * Official-identifier strip in the spirit of DESIGN.md's government banner:
 * a full-width mono micro-label above the site chrome. Site-wide (root layout).
 */
export function BriefBanner() {
  return (
    <div className="border-b border-fog bg-parchment">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <p className="font-mono text-[12px] leading-[1.4] tracking-[0.06em] text-ink uppercase">
          ChefBOT Kitchen Brief
          <span className="text-brick"> — a public cooking record</span>
        </p>
        <p className="hidden font-mono text-[12px] leading-[1.4] tracking-[0.06em] text-brick uppercase sm:block">
          Real Food. Real Fast.
        </p>
      </div>
    </div>
  );
}
