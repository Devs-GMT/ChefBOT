import { ImageResponse } from "next/og";

import { MARK_INK, MARK_PAPER, MARK_RED, markDataUri } from "@/components/ui/chefbot-mark";

export const alt = "ChefBOT — Pick. Cook. Stamp. Three recipes from your fridge, cooked on BOT Chain.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share card for every page: the mark beside the promise, printed on parchment. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 72,
          padding: "0 96px",
          background: MARK_PAPER,
          color: MARK_INK,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
        <img src={markDataUri()} width={340} height={340} alt="" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 120, letterSpacing: -5, lineHeight: 1 }}>ChefBOT</div>
          <div style={{ display: "flex", fontSize: 64, letterSpacing: -2, marginTop: 24, lineHeight: 1.05 }}>
            Pick. Cook.&nbsp;<span style={{ color: MARK_RED }}>Stamp.</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 44,
              fontSize: 26,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: 7, background: MARK_RED }} />
            Cooked on BOT Chain
          </div>
        </div>
      </div>
    ),
    size,
  );
}
