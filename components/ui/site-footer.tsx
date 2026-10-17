import Image from "next/image";

import { ScrollLetters } from "@/components/ui/scroll-letters";
import { shortenAddress } from "@/lib/address";
// Wallet-free config only: the footer ships on the landing page too, which
// must not pull viem/wagmi into its bundle.
import {
  contractAddress,
  explorerAddressUrl,
  explorerUrlFor,
  targetChainId,
} from "@/lib/chain-config";

const BOT_CHAIN_URL = "https://botchain.ai";

/**
 * PRD §8 closing footer: giant letter-revealed manifesto, a wide dark media
 * card whose whole surface links to botchain.ai (BOT Chain logo centred,
 * amber glow that brightens on hover), a "View on explorer ↗" pill over the
 * card's lower centre pointing at the mainnet contract, a red caption and a
 * mono bottom bar. The pill is a sibling of the card link — never nested.
 */
export function SiteFooter() {
  const contract = contractAddress();
  const chainId = targetChainId();
  const explorerHref = contract ? explorerAddressUrl(contract) : explorerUrlFor();

  return (
    <footer className="mt-12 overflow-hidden border-t border-fog pt-16 sm:pt-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <ScrollLetters
          text="Cooked on BOT Chain."
          className="text-[clamp(3rem,11.6vw,150px)] leading-[0.86] font-bold tracking-[-0.045em] text-ink"
        />

        <div className="group relative mt-10 sm:mt-14">
          <a
            href={BOT_CHAIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit BOT Chain at botchain.ai (opens in a new tab)"
            className="band-dark relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[28px] bg-[#120a06] sm:aspect-[21/9]"
          >
            <span
              aria-hidden="true"
              className="footer-glow pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-500 group-hover:opacity-100"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(245,239,227,0.07)_1px,transparent_1px)] [background-size:22px_22px]"
            />
            <Image
              src="/brand/botchain-wordmark.png"
              alt="BOT Chain"
              width={409}
              height={80}
              className="relative w-[62%] max-w-[520px] transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </a>

          <a
            href={explorerHref}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-5 left-1/2 flex min-h-12 -translate-x-1/2 items-center gap-3 rounded-full bg-ink/90 py-1.5 pr-5 pl-1.5 text-[15px] font-medium whitespace-nowrap text-parchment shadow-card ring-1 ring-parchment/10 backdrop-blur transition-colors hover:bg-ink sm:bottom-8"
          >
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-full bg-white text-ink"
            >
              <svg viewBox="0 0 16 16" className="ml-0.5 size-3.5" fill="currentColor">
                <path d="M4 2.5v11l9-5.5z" />
              </svg>
            </span>
            View on explorer ↗
          </a>
        </div>

        <p className="mt-6 text-center text-base leading-[1.4] tracking-[-0.02em] text-ink sm:text-[19px]">
          <span className="font-medium text-alert">
            Every dish here is stamped on BOT Chain · chain ID {chainId}
          </span>
        </p>
      </div>

      <div className="mt-16 border-t border-fog">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 font-mono text-[12px] leading-[1.4] tracking-[0.06em] text-brick uppercase sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© ChefBOT 2026 · recipes are AI suggestions, cook safely</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {contract && (
              <a
                href={explorerAddressUrl(contract)}
                target="_blank"
                rel="noopener noreferrer"
                className="normal-case transition-colors hover:text-ink"
              >
                {shortenAddress(contract)}
              </a>
            )}
            <a href="/app" className="transition-colors hover:text-ink">
              Open the kitchen
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
