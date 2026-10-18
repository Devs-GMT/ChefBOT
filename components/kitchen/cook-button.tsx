"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  useConnect,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { WalletWaitHint } from "@/components/kitchen/wallet-wait-hint";
import { useWalletConnection } from "@/lib/use-wallet-connection";
import { chefbotAbi } from "@/lib/abi/ChefBOT";
import { explorerTxUrl } from "@/lib/chain";
import { contractAddress } from "@/lib/contract";
import { cookNumberFromLogs, shareOnXUrl } from "@/lib/cooked-event";
import { archiveDish } from "@/lib/dish-archive";
import { useIsCooked, useRefreshOnChain } from "@/lib/queries";
import { validateEmoji, validateTitle } from "@/lib/recipe-key";
import { targetChainId } from "@/lib/wagmi";
import {
  connectFirstAvailable,
  connectedChainId,
  orderedConnectors,
} from "@/lib/wallet-connect";
import {
  WALLET_ERROR_TEXT,
  classifyWalletError,
} from "@/lib/wallet-errors";
import type { Recipe } from "@/shared/recipe-schema";

type Phase = "idle" | "wallet" | "pending" | "success" | "error";

export function CookButton({
  recipe,
  archive = true,
}: {
  recipe: Recipe;
  /** Post the full recipe to the shared archive after a stamp (off for private recipes). */
  archive?: boolean;
}) {
  const connection = useWalletConnection();
  const {
    mutateAsync: connectAsync,
    connectors,
    isPending: isConnecting,
    reset: resetConnect,
  } = useConnect();
  const {
    mutateAsync: switchChainAsync,
    isPending: isSwitching,
    reset: resetSwitch,
  } = useSwitchChain();
  const {
    mutateAsync: writeContractAsync,
    isPending: isWriting,
    reset: resetWrite,
  } = useWriteContract();
  const refreshOnChain = useRefreshOnChain();

  const contract = contractAddress();
  const { data: alreadyCooked } = useIsCooked(
    connection.address,
    recipe.title,
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const target = targetChainId();

  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    // Watch the receipt on the chain the transaction was sent to, even if the
    // wallet switches networks while it confirms.
    chainId: target,
    query: { enabled: txHash !== undefined },
  });
  const receiptStatus = receipt.data?.status;
  const archivedTx = useRef<string | null>(null);

  // Receipt outcomes are derived during render (no setState-in-effect);
  // the only side effect allowed here is invalidating on-chain reads.
  useEffect(() => {
    if (phase === "pending" && receiptStatus === "success") {
      refreshOnChain();
      // Best effort, once per transaction: lets others open the dish's steps.
      if (archive && txHash && archivedTx.current !== txHash) {
        archivedTx.current = txHash;
        void archiveDish(txHash, recipe);
      }
    }
  }, [phase, receiptStatus, refreshOnChain, archive, txHash, recipe]);

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
      <p role="status" className="text-xs text-brick">
        Cooking stamps go live once the ChefBOT contract is deployed — recipes
        work right now without a wallet.
      </p>
    );
  }

  const wrongChain =
    connection.isConnected && connection.chainId !== target;
  // "wallet" = a prompt is open in MetaMask; a second click would only queue
  // a duplicate request (MetaMask answers -32002 "already pending").
  const viewPhaseBusy = viewPhase === "pending" || viewPhase === "wallet";
  const busy = isConnecting || isSwitching || isWriting || viewPhaseBusy;

  async function handleClick() {
    setErrorText(null);

    if (!connection.isConnected) {
      if (orderedConnectors(connectors).length === 0) {
        setPhase("error");
        setErrorText(WALLET_ERROR_TEXT.no_wallet);
        return;
      }
      setPhase("wallet");
      try {
        const connectedOn = connectedChainId(
          await connectFirstAvailable(connectors, connectAsync),
        );
        if (connectedOn !== undefined && connectedOn !== target) {
          // Land on BOT Chain straight away (adds the network if needed).
          await switchChainAsync({ chainId: target }).catch(() => undefined);
        }
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

  const stamped = viewPhase === "success";
  const cookNumber =
    stamped && receipt.data?.logs
      ? cookNumberFromLogs(receipt.data.logs, contract)
      : null;

  const label = stamped
    ? "Stamped ✓"
    : alreadyCooked
      ? "Cooked ✓"
      : viewPhase === "wallet"
        ? connection.isConnected && wrongChain
          ? "Switching…"
          : "Confirm in wallet…"
        : viewPhase === "pending"
          ? "Stamping on BOT Chain…"
          : wrongChain
            ? "Switch network to cook"
            : "I cooked it 🍳";

  const disabled = Boolean(alreadyCooked) || busy || stamped;
  const done = Boolean(alreadyCooked) || stamped;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled}
        aria-busy={busy}
        className={
          done
            ? "inline-flex min-h-12 cursor-default items-center justify-center gap-2 rounded-full border-[1.5px] border-ink px-6 text-[15px] font-medium text-ink"
            : busy
              ? "inline-flex min-h-12 cursor-wait items-center justify-center gap-2 rounded-full bg-ink/80 px-6 text-[15px] font-medium text-white"
              : "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-medium text-white transition-[background-color,transform] hover:bg-ink/85 active:scale-[0.98]"
        }
      >
        {busy && (
          <span
            aria-hidden="true"
            className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
        )}
        {label}
      </button>

      <WalletWaitHint
        active={viewPhase === "wallet"}
        onCancel={() => {
          // The wallet prompt cannot be recalled, but the card must not stay
          // stuck on "Confirm in wallet…". A late approval still lands: the
          // pending write resolves and the receipt is tracked as usual.
          resetConnect?.();
          resetSwitch?.();
          resetWrite?.();
          setPhase("idle");
        }}
      />

      {!connection.isConnected && !stamped && viewPhase !== "error" && (
        <p className="text-xs text-brick">
          Connect MetaMask to stamp this dish on BOT Chain.
        </p>
      )}

      {txHash && viewPhase === "pending" && (
        <a
          href={explorerTxUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-ink underline underline-offset-2"
        >
          View transaction on BOT Scan
        </a>
      )}

      {stamped && txHash && (
        <div
          role="status"
          className="stamp-pop rounded-2xl border-[1.5px] border-dashed border-alert/60 bg-wheat/60 p-4"
        >
          <p className="font-mono text-[11px] tracking-[0.06em] text-alert uppercase">
            Receipt · BOT Chain
          </p>
          <p className="mt-1 text-[19px] leading-[1.15] font-bold tracking-[-0.019em] text-ink">
            Stamped!
            {cookNumber !== null && (
              <>
                {" "}
                You&apos;re cook{" "}
                <span className="text-alert">#{cookNumber}</span> of this dish
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href={explorerTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-ink underline underline-offset-2"
            >
              View transaction on BOT Scan
            </a>
            <a
              href={shareOnXUrl({
                title: recipe.title,
                emoji: recipe.emoji,
                cookNumber,
                appUrl:
                  typeof window === "undefined"
                    ? undefined
                    : `${window.location.origin}/app`,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center rounded-full bg-ink px-4 text-xs font-medium text-white transition-colors hover:bg-ink/85"
            >
              Share on X ↗
            </a>
            <Link
              href="/app/kitchen"
              className="text-xs font-medium text-alert underline underline-offset-2"
            >
              See it in My Kitchen →
            </Link>
          </div>
        </div>
      )}

      {viewPhase === "error" && viewErrorText && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-alert/8 px-3 py-2 text-xs text-alert"
        >
          <span>
            {viewErrorText}
            {viewErrorText === WALLET_ERROR_TEXT.no_wallet && (
              <>
                {" — "}
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2"
                >
                  install MetaMask
                </a>
              </>
            )}
          </span>
          {viewErrorText !== WALLET_ERROR_TEXT.no_wallet && (
            <button
              type="button"
              onClick={() => void handleClick()}
              className="min-h-8 rounded-full border border-alert px-3 font-medium transition-colors hover:bg-alert hover:text-white"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {alreadyCooked && !stamped && (
        <p className="text-xs text-brick">
          This recipe is already recorded in your kitchen.
        </p>
      )}
    </div>
  );
}
