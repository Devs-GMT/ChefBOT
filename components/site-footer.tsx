import { shortenAddress } from "@/lib/address";
import { BOT_EXPLORER_URL } from "@/lib/chain";
import { contractAddress, explorerAddressUrl } from "@/lib/contract";

export function SiteFooter() {
  const contract = contractAddress();
  return (
    <footer className="border-t border-fog">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-mono text-xs tracking-[0.06em] text-ink uppercase">
          Cooked on BOT Chain.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-brick">
          <a
            href="https://botchain.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-ink"
          >
            botchain.ai
          </a>
          {contract ? (
            <a
              href={explorerAddressUrl(contract)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono transition-colors hover:text-ink"
            >
              {shortenAddress(contract)}
            </a>
          ) : (
            <a
              href={BOT_EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-ink"
            >
              Explorer
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
