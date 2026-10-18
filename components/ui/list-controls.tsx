"use client";

/** Search field for long lists (shown only once a list is long enough). */
export function ListSearch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-brick">
        ⌕
      </span>
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        className="min-h-11 w-full rounded-full border border-fog bg-paper pr-4 pl-10 text-sm text-ink outline-none transition-colors focus:border-ink/50 sm:max-w-xs"
      />
    </label>
  );
}

/** "Show more" pill with how many are left. */
export function ShowMore({ left, onClick }: { left: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto mt-5 flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-ink px-5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-white"
    >
      Show more
      <span className="font-mono text-[11px] text-brick tabular-nums">{left} left</span>
    </button>
  );
}
