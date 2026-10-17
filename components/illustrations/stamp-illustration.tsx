interface IllustrationProps {
  className?: string;
}

/**
 * Step 03 — "Stamp the receipt". A torn-edge receipt with a rotated
 * circular "STAMPED" seal, plus a small chain-link motif for BOT Chain.
 * Hand-drawn line-art in the DESIGN.md ink/wheat palette. Decorative.
 */
export function StampIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 480 480"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Receipt body with torn bottom edge */}
      <path
        data-anim="receipt"
        d="M150 70
           h180
           v300
           l-18 16 -18 -16 -18 16 -18 -16 -18 16 -18 -16 -18 16 -18 -16 -18 16 -18 -16 z"
        fill="#ffffff"
        stroke="#110000"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Receipt header */}
      <line
        data-anim="receipt-line"
        x1="174"
        y1="110"
        x2="306"
        y2="110"
        stroke="#110000"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        data-anim="receipt-line"
        x1="174"
        y1="134"
        x2="260"
        y2="134"
        stroke="#8d7d7d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Dashed rule */}
      <line
        x1="174"
        y1="158"
        x2="306"
        y2="158"
        stroke="#bebcb3"
        strokeWidth="2.5"
        strokeDasharray="6 7"
      />
      {/* Line items */}
      <line
        data-anim="receipt-line"
        x1="174"
        y1="188"
        x2="282"
        y2="188"
        stroke="#110000"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        data-anim="receipt-line"
        x1="174"
        y1="216"
        x2="266"
        y2="216"
        stroke="#8d7d7d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        data-anim="receipt-line"
        x1="174"
        y1="244"
        x2="290"
        y2="244"
        stroke="#8d7d7d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        data-anim="receipt-line"
        x1="174"
        y1="272"
        x2="252"
        y2="272"
        stroke="#8d7d7d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Dashed rule */}
      <line
        x1="174"
        y1="300"
        x2="306"
        y2="300"
        stroke="#bebcb3"
        strokeWidth="2.5"
        strokeDasharray="6 7"
      />
      {/* Total */}
      <line
        data-anim="receipt-line"
        x1="174"
        y1="330"
        x2="240"
        y2="330"
        stroke="#110000"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <line
        data-anim="receipt-line"
        x1="262"
        y1="330"
        x2="306"
        y2="330"
        stroke="#110000"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      <g data-anim="seal">
      {/* Rotated STAMPED seal */}
      <g transform="rotate(-14 340 250)">
        <circle
          cx="340"
          cy="250"
          r="74"
          fill="#f3f0d6"
          stroke="#110000"
          strokeWidth="4"
        />
        <circle
          cx="340"
          cy="250"
          r="60"
          fill="none"
          stroke="#110000"
          strokeWidth="2.5"
        />
        {/* Star burst ticks around the seal */}
        <path
          data-anim="burst"
          d="M340 166 v-12 M340 334 v12 M256 250 h-12 M424 250 h12
             M281 191 l-9 -9 M399 309 l9 9 M281 309 l-9 9 M399 191 l9 -9"
          stroke="#110000"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <text
          x="340"
          y="244"
          textAnchor="middle"
          fill="#110000"
          fontFamily="ui-monospace, monospace"
          fontSize="26"
          fontWeight="700"
          letterSpacing="3"
        >
          STAMPED
        </text>
        <text
          x="340"
          y="278"
          textAnchor="middle"
          fill="#8d7d7d"
          fontFamily="ui-monospace, monospace"
          fontSize="15"
          letterSpacing="2"
        >
          BOT CHAIN
        </text>
      </g>

      </g>

      {/* Chain-link motif, lower left */}
      <g data-anim="chain" stroke="#110000" strokeWidth="3.5" fill="#fdfbee">
        <rect
          x="74"
          y="352"
          width="52"
          height="34"
          rx="17"
          transform="rotate(-24 100 369)"
        />
        <rect
          x="104"
          y="374"
          width="52"
          height="34"
          rx="17"
          transform="rotate(-24 130 391)"
        />
        <rect
          x="134"
          y="396"
          width="52"
          height="34"
          rx="17"
          transform="rotate(-24 160 413)"
        />
      </g>
    </svg>
  );
}
