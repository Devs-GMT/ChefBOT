import { AppNav } from "@/components/kitchen/app-nav";
import { WalletButton } from "@/components/kitchen/wallet-button";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { SiteFooter } from "@/components/ui/site-footer";
import { Providers } from "../providers";

/**
 * The kitchen's shared chrome. Wallet providers (wagmi + react-query) wrap
 * only the kitchen routes, so the landing page never downloads the wallet
 * stack. Nav, wallet and cached chain reads persist across /app, /app/list,
 * /app/recipes, /app/leaderboard and /app/kitchen.
 */
export default function KitchenLayout({ children }: LayoutProps<"/app">) {
  return (
    <Providers>
      <div id="top" className="flex flex-1 flex-col">
        <ScrollProgress />
        <AppNav>
          <WalletButton tone="dark" />
        </AppNav>
        {children}
        <SiteFooter />
      </div>
    </Providers>
  );
}
