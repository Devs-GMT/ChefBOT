interface IllustrationProps {
  className?: string;
}

/**
 * Step 02 — "Take three recipes". Three stacked recipe cards with the
 * front card selected (check stamp), plus plate + fork. Hand-drawn
 * line-art in the DESIGN.md ink/wheat palette. Decorative.
 */
export function RecipesIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 480 480"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g data-anim="card-back">
      {/* Back card (rotated left) */}
      <g transform="rotate(-10 200 250)">
        <rect
          x="120"
          y="120"
          width="170"
          height="230"
          rx="16"
          fill="#f3f0d6"
          stroke="#110000"
          strokeWidth="3"
        />
        <line
          x1="144"
          y1="164"
          x2="250"
          y2="164"
          stroke="#110000"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="144"
          y1="192"
          x2="228"
          y2="192"
          stroke="#110000"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="144"
          y1="216"
          x2="240"
          y2="216"
          stroke="#110000"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>

      </g>

      <g data-anim="card-middle">
      {/* Middle card (rotated right) */}
      <g transform="rotate(8 280 250)">
        <rect
          x="200"
          y="120"
          width="170"
          height="230"
          rx="16"
          fill="#fdfbee"
          stroke="#110000"
          strokeWidth="3"
        />
        <line
          x1="224"
          y1="164"
          x2="330"
          y2="164"
          stroke="#110000"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="224"
          y1="192"
          x2="308"
          y2="192"
          stroke="#110000"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>

      </g>

      <g data-anim="card-front">
      {/* Front card, centered and selected */}
      <rect
        x="155"
        y="150"
        width="190"
        height="250"
        rx="16"
        fill="#ffffff"
        stroke="#110000"
        strokeWidth="3"
      />
      {/* Card header bar */}
      <rect
        x="155"
        y="150"
        width="190"
        height="44"
        rx="16"
        fill="#110000"
      />
      <rect x="155" y="178" width="190" height="16" fill="#110000" />
      <line
        x1="175"
        y1="172"
        x2="255"
        y2="172"
        stroke="#fdfbee"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Front card content lines */}
      <line
        x1="179"
        y1="228"
        x2="321"
        y2="228"
        stroke="#110000"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="179"
        y1="256"
        x2="300"
        y2="256"
        stroke="#8d7d7d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="179"
        y1="280"
        x2="312"
        y2="280"
        stroke="#8d7d7d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="179"
        y1="304"
        x2="278"
        y2="304"
        stroke="#8d7d7d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      </g>

      <g data-anim="check">
      {/* Selection check stamp on front card */}
      <circle
        cx="316"
        cy="368"
        r="30"
        fill="#f3f0d6"
        stroke="#110000"
        strokeWidth="3"
      />
      <path
        d="M302 368 l10 10 l18 -20"
        stroke="#110000"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      </g>

      <g data-anim="plate">
      {/* Plate + fork, lower left */}
      <circle
        cx="110"
        cy="392"
        r="52"
        fill="#fdfbee"
        stroke="#110000"
        strokeWidth="3"
      />
      <circle
        cx="110"
        cy="392"
        r="34"
        fill="none"
        stroke="#110000"
        strokeWidth="2.5"
      />
      {/* Fork */}
      <g transform="rotate(24 110 392)">
        <line
          x1="110"
          y1="360"
          x2="110"
          y2="428"
          stroke="#110000"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M100 360 v16 M110 360 v16 M120 360 v16"
          stroke="#110000"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M100 376 q10 12 20 0"
          stroke="#110000"
          strokeWidth="3"
          fill="none"
        />
      </g>
      </g>

    </svg>
  );
}
