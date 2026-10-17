interface IllustrationProps {
  className?: string;
}

/**
 * Step 01 — "Open the pantry". An open pantry cabinet stocked with
 * recognizable ingredients: tomato, can, leafy greens, eggs, onion,
 * baguette. Hand-drawn line-art in the DESIGN.md ink/wheat palette.
 * Decorative — hidden from assistive technology.
 */
export function PantryIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 480 480"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Cabinet carcass */}
      <rect
        data-anim="draw"
        x="110"
        y="60"
        width="300"
        height="360"
        rx="20"
        fill="#f3f0d6"
        stroke="#110000"
        strokeWidth="3"
      />
      <g data-anim="door">
      {/* Open door, swung left */}
      <path
        d="M110 84 L52 112 V368 L110 396 Z"
        fill="#fdfbee"
        stroke="#110000"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="68"
        y="150"
        width="26"
        height="180"
        rx="8"
        fill="#f3f0d6"
        stroke="#110000"
        strokeWidth="2.5"
      />
      {/* Door handle */}
      <line
        x1="100"
        y1="220"
        x2="100"
        y2="260"
        stroke="#110000"
        strokeWidth="4"
        strokeLinecap="round"
      />
      </g>
      {/* Middle shelf */}
      <line
        data-anim="draw"
        x1="110"
        y1="238"
        x2="410"
        y2="238"
        stroke="#110000"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* ---- Top shelf ---- */}

      <g data-anim="item">
      {/* Tomato */}
      <circle
        cx="168"
        cy="188"
        r="36"
        fill="#fdfbee"
        stroke="#110000"
        strokeWidth="3"
      />
      <path
        d="M168 152 l-12 -14 M168 152 l12 -14 M168 152 v-12"
        stroke="#110000"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M148 168 q20 -14 40 0"
        stroke="#110000"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      </g>

      <g data-anim="item">
      {/* Canned good */}
      <rect
        x="228"
        y="158"
        width="64"
        height="80"
        rx="8"
        fill="#fdfbee"
        stroke="#110000"
        strokeWidth="3"
      />
      <line
        x1="228"
        y1="180"
        x2="292"
        y2="180"
        stroke="#110000"
        strokeWidth="2.5"
      />
      <line
        x1="228"
        y1="216"
        x2="292"
        y2="216"
        stroke="#110000"
        strokeWidth="2.5"
      />
      <path
        d="M246 168 q12 -8 28 0"
        stroke="#110000"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      </g>

      <g data-anim="item">
      {/* Leafy greens bunch */}
      <path
        d="M352 238 q-4 -52 20 -78 q10 30 4 78"
        fill="#f3f0d6"
        stroke="#110000"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M352 238 q22 -40 48 -52 q-6 34 -28 52"
        fill="#fdfbee"
        stroke="#110000"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M372 238 q-2 -34 -14 -56 M378 238 q10 -30 26 -44"
        stroke="#110000"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      </g>

      {/* ---- Bottom shelf ---- */}

      <g data-anim="item">
      {/* Egg carton pair */}
      <ellipse
        cx="156"
        cy="352"
        rx="22"
        ry="28"
        fill="#fdfbee"
        stroke="#110000"
        strokeWidth="3"
      />
      <ellipse
        cx="204"
        cy="358"
        rx="20"
        ry="26"
        fill="#f3f0d6"
        stroke="#110000"
        strokeWidth="3"
      />
      <path
        d="M148 336 q8 -6 16 0 M196 342 q8 -6 16 0"
        stroke="#110000"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      </g>

      <g data-anim="item">
      {/* Onion */}
      <path
        d="M286 384 q-40 0 -40 -38 q0 -24 22 -38 q-6 -16 18 -26 q24 10 18 26 q22 14 22 38 q0 38 -40 38 z"
        fill="#fdfbee"
        stroke="#110000"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M286 282 v-22 M286 260 l-10 -16 M286 260 l10 -16"
        stroke="#110000"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M262 350 q24 10 48 0 M266 366 q20 8 40 0"
        stroke="#110000"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      </g>

      <g data-anim="item">
      {/* Baguette */}
      <g transform="rotate(-18 360 356)">
        <rect
          x="308"
          y="336"
          width="118"
          height="42"
          rx="21"
          fill="#f3f0d6"
          stroke="#110000"
          strokeWidth="3"
        />
        <path
          d="M332 344 l-10 26 M358 344 l-10 26 M384 344 l-10 26 M410 344 l-10 26"
          stroke="#110000"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
      </g>

    </svg>
  );
}
