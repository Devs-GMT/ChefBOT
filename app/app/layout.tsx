import { Providers } from "../providers";

/**
 * Wallet providers (wagmi + react-query) wrap only the kitchen route, so the
 * landing page never downloads the wallet stack.
 */
export default function KitchenLayout({ children }: LayoutProps<"/app">) {
  return <Providers>{children}</Providers>;
}
