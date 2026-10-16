import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { WagmiProvider, createConfig, http, mock } from "wagmi";

import { BOT_CHAIN } from "@/lib/chain";

/** Headless config for component tests — mock connector, no network calls. */
const testWagmiConfig = createConfig({
  chains: [BOT_CHAIN],
  connectors: [
    mock({
      accounts: ["0x1111111111111111111111111111111111111111"],
      features: { defaultConnected: false },
    }),
  ],
  transports: {
    [BOT_CHAIN.id]: http(),
  },
});

/** Renders UI inside fresh QueryClient + Wagmi providers. */
export function renderWithProviders(ui: ReactElement): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <WagmiProvider config={testWagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}
