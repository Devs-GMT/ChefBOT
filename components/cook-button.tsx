"use client";

import { useEffect, useState } from "react";
import {
  useConnect,
  useConnection,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { chefbotAbi } from "@/lib/abi/ChefBOT";
import { BOT_EXPLORER_URL } from "@/lib/chain";
import { contractAddress } from "@/lib/contract";
import { useIsCooked, useRefreshOnChain } from "@/lib/queries";
import { validateEmoji, validateTitle } from "@/lib/recipe-key";
import { targetChainId } from "@/lib/wagmi";
import {
  WALLET_ERROR_TEXT,
  classifyWalletError,
} from "@/lib/wallet-errors";
import type { Recipe } from "@/shared/recipe-schema";

type Phase = "idle" | "wallet" | "pending" | "success" | "error";

function preferredConnector<T extends { id: string }>(
  connectors: readonly T[],
): T | undefined {
  return (
    connectors.find((c) => c.id.toLowerCase().includes("meta")) ??
    connectors.find((c) => c.id.toLowerCase().includes("injected")) ??
    connectors[0]
  );
}

export function CookButton({ recipe }: { recipe: Recipe }) {
  const connection = useConnection();
  const { mutateAsync: connectAsync, connectors, isPending: isConnecting } =
    useConnect();
  const { mutateAsync: switchChainAsync, isPending: isSwitching } =
    useSwitchChain();
  const { mutateAsync: writeContractAsync, isPending: isWriting } =
    useWriteContract();
  const refreshOnChain = useRefreshOnChain();

  const contract = contractAddress();
  const { data: alreadyCooked } = useIsCooked(
    connection.address,
    recipe.title,
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: txHash !== undefined },
  });
  const receiptStatus = receipt.data?.status;

  // Receipt outcomes are derived during render (no setState-in-effect);
  // the only side effect allowed here is invalidating on-chain reads.
  useEffect(() => {
    if (phase === "pending" && receiptStatus === "success") {
      refreshOnChain();
    }
  }, [phase, receiptStatus, refreshOnChain]);

  const receiptPhase: Phase | null =
    phase !== "pending"
      ? null
      : receiptStatus === "success"
        ? "success"
        : receiptStatus === "reverted"
          ? "error"
          : receipt.isError
            ? "error"
            : null;
  const viewPhase = receiptPhase ?? phase;
  const viewErrorText =
    receiptPhase === "error"
      ? receiptStatus === "reverted"
        ? "The transaction failed on-chain."
        : "The transaction could not be confirmed."
      : errorText;

  if (!contract) {
    return (
      <p role="status" className="mt-5 text-xs text-brick">
        Cooking stamps go live once the ChefBOT contract is deployed — recipes
        work right now without a wallet.
      </p>
    );
  }

  const target = targetChainId();
  const wrongChain =
    connection.isConnected && connection.chainId !== target;
  const viewPhaseBusy = viewPhase === "pending";
  const busy = isConnecting || isSwitching || isWriting || viewPhaseBusy;

  async function handleClick() {
    setErrorText(null);

    if (!connection.isConnected) {
      const connector = preferredConnector(connectors);
      if (!connector) {
        setPhase("error");
        setErrorText(WALLET_ERROR_TEXT.no_wallet);
        return;
      }
      setPhase("wallet");
      try {
        await connectAsync({ connector });
        setPhase("idle");
      } catch (connectError) {
        setPhase("error");
        setErrorText(WALLET_ERROR_TEXT[classifyWalletError(connectError)]);
      }
      return;
    }

    if (wrongChain) {
      setPhase("wallet");
      try {
        await switchChainAsync({ chainId: target });
        setPhase("idle");
      } catch (switchError) {
        setPhase("error");
        setErrorText(WALLET_ERROR_TEXT[classifyWalletError(switchError)]);
      }
      return;
    }

    if (!contract || alreadyCooked) {
      return;
    }

    try {
      validateTitle(recipe.title);
      validateEmoji(recipe.emoji);
    } catch (validationError) {
      setPhase("error");
      setErrorText(
        validationError instanceof Error &&
          validationError.message === "EMPTY_TITLE"
          ? "This recipe has no title to record."
          : "This recipe title cannot be recorded on-chain.",
      );
      return;
    }

    setPhase("wallet");
    try {
      const hash = await writeContractAsync({
        address: contract,
        abi: chefbotAbi,
        functionName: "cookIt",
        args: [recipe.title, recipe.emoji],
        chainId: target,
      });
      setTxHash(hash);
      setPhase("pending");
    } catch (writeError) {
      setPhase("error");
      setErrorText(WALLET_ERROR_TEXT[classifyWalletError(writeError)]);
    }
  }

  const label = alreadyCooked
    ? "Cooked ✓"
    : viewPhase === "wallet"
      ? connection.isConnected && wrongChain
        ? "Switching…"
        : "Confirm in wallet…"
      : viewPhase === "pending"
        ? "Stamping…"
        : viewPhase === "success"
          ? "Stamped! ✓"
          : wrongChain
            ? "Switch network to cook"
            : "I cooked it 🍳";

  const disabled = Boolean(alreadyCooked) || busy || viewPhase === "success";

  return (
    <div className="mt-5 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled}
        aria-busy={busy}
        className={
          disabled && !alreadyCooked
            ? "inline-flex min-h-12 cursor-not-allowed items-center justify-center rounded-full bg-fog px-6 text-sm font-medium text-brick"
            : "inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-ink/85 disabled:cursor-default disabled:opacity-80"
        }
      >
        {label}
      </button>

      {txHash && (viewPhase === "pending" || viewPhase === "success") && (
        <a
          href={`${BOT_EXPLORER_URL}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-ink underline underline-offset-2"
        >
          View transaction on BOT Scan
        </a>
      )}

      {viewPhase === "error" && viewErrorText && (
        <p role="alert" className="text-xs text-alert">
          {viewErrorText}
          {viewErrorText === WALLET_ERROR_TEXT.no_wallet && (
            <>
              {" — "}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                install MetaMask
              </a>
            </>
          )}
        </p>
      )}

      {alreadyCooked && (
        <p className="text-xs text-brick">
          This recipe is already recorded in your kitchen.
        </p>
      )}
    </div>
  );
}
