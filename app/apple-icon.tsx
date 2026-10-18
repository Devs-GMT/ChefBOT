import { ImageResponse } from "next/og";

import { MARK_PAPER, markDataUri } from "@/components/ui/chefbot-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the ink mark on parchment (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: MARK_PAPER,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
        <img src={markDataUri()} width={150} height={150} alt="" />
      </div>
    ),
    size,
  );
}
