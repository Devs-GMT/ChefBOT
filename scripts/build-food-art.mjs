#!/usr/bin/env node
/**
 * Generates the painted food illustrations in public/food-art/*.svg.
 *
 *   node scripts/build-food-art.mjs
 *
 * One shared look: flat, warm fills with soft gradients, a paint-grain
 * texture (fractal noise multiplied in) and a slight edge wobble so shapes
 * read as hand-painted cut-outs, plus a soft contact shadow. Every file is
 * self-contained (filters inline) so it renders the same as a plain <img>.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../public/food-art/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const DEFS = (seed) => `
<filter id="paint" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="${seed}" result="wobble"/>
<feDisplacementMap in="SourceGraphic" in2="wobble" scale="5" xChannelSelector="R" yChannelSelector="G" result="shape"/>
<feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="${seed + 11}" result="grain"/>
<feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.3 0 0 0 0 0.16 0 0 0 0 0.08 1.3 0 0 0 -0.66" result="speck"/>
<feComposite in="speck" in2="shape" operator="in" result="speckIn"/>
<feBlend in="speckIn" in2="shape" mode="multiply"/>
</filter>
<filter id="shade" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="9"/></filter>`;

/** Wrap a drawing: viewBox, defs, contact shadow, painted group. */
function svg({ w = 400, h = 400, seed = 3, shadow, body, defs = "" }) {
  const shade = shadow
    ? `<ellipse cx="${shadow[0]}" cy="${shadow[1]}" rx="${shadow[2]}" ry="${shadow[3]}" fill="#3a2414" opacity="0.22" filter="url(#shade)"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${DEFS(seed)}${defs}</defs>${shade}<g filter="url(#paint)">${body}</g></svg>`;
}

const lg = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join("")}</linearGradient>`;
const rg = (id, stops, cx = 0.38, cy = 0.32, r = 0.75) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join("")}</radialGradient>`;

const ART = {
  // ---------- Protein & Fats ----------
  eggs: svg({
    seed: 4,
    shadow: [205, 352, 150, 18],
    defs: rg("egg", [[0, "#fffaf0"], [0.6, "#f3e3c6"], [1, "#d9b98d"]]) + rg("egg2", [[0, "#f8e3c4"], [0.6, "#e2b98a"], [1, "#b98656"]]),
    body: `<path d="M140 90c58 0 96 92 96 162 0 64-42 98-96 98s-96-34-96-98c0-70 38-162 96-162z" fill="url(#egg2)"/>
<path d="M270 120c52 0 86 82 86 144 0 57-38 88-86 88s-86-31-86-88c0-62 34-144 86-144z" fill="url(#egg)"/>
<ellipse cx="112" cy="170" rx="16" ry="30" fill="#fff6e6" opacity="0.55" transform="rotate(-14 112 170)"/>
<ellipse cx="246" cy="196" rx="14" ry="26" fill="#ffffff" opacity="0.7" transform="rotate(-14 246 196)"/>`,
  }),
  drumstick: svg({
    seed: 6,
    shadow: [200, 345, 160, 20],
    defs: rg("meat", [[0, "#e59a52"], [0.55, "#b8632a"], [1, "#7a3a16"]], 0.4, 0.35, 0.8) + lg("bone", [[0, "#fbf3e3"], [1, "#d8c7a6"]]),
    body: `<path d="M70 210c-18-78 46-150 128-148 84 2 128 70 112 132-10 40-48 62-88 70l-40 8c-48 10-100-10-112-62z" fill="url(#meat)"/>
<path d="M120 120c30-26 82-34 120-14" stroke="#f0b072" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.6"/>
<path d="M150 160c40-12 80-4 104 18" stroke="#8d4419" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.45"/>
<path d="M222 268l84 58" stroke="url(#bone)" stroke-width="30" stroke-linecap="round"/>
<circle cx="300" cy="340" r="22" fill="url(#bone)"/><circle cx="322" cy="310" r="22" fill="url(#bone)"/>`,
  }),
  cheese: svg({
    seed: 8,
    shadow: [200, 330, 165, 20],
    defs: lg("cheeseTop", [[0, "#ffe27a"], [1, "#f5c53c"]]) + lg("cheeseSide", [[0, "#f7c94a"], [1, "#dc9e1f"]]),
    body: `<path d="M48 210L300 92l58 66-6 0z" fill="url(#cheeseTop)"/>
<path d="M48 210l304-52v120L48 320z" fill="url(#cheeseSide)"/>
<path d="M48 210l304-52" stroke="#fff1b8" stroke-width="5" opacity="0.8"/>
<ellipse cx="120" cy="262" rx="22" ry="17" fill="#c98a12"/><ellipse cx="208" cy="236" rx="14" ry="11" fill="#c98a12"/>
<ellipse cx="280" cy="270" rx="26" ry="20" fill="#c98a12"/><ellipse cx="186" cy="292" rx="10" ry="8" fill="#c98a12"/>
<ellipse cx="236" cy="150" rx="16" ry="7" fill="#e9b532"/><ellipse cx="160" cy="176" rx="11" ry="5" fill="#e9b532"/>`,
  }),
  milk: svg({
    w: 300,
    h: 460,
    seed: 9,
    shadow: [150, 432, 112, 16],
    defs: lg("milkRed", [[0, "#ef3b2a"], [1, "#c9221a"]], 0, 0, 1, 0) + lg("milkSide", [[0, "#f6efd9"], [1, "#d9cfb2"]], 0, 0, 1, 0),
    body: `<path d="M60 120l90-58 90 58z" fill="#efe6cc"/><path d="M150 62l90 58v-18l-90-56z" fill="#d6caa8"/>
<rect x="132" y="30" width="36" height="22" rx="8" fill="#f5f0e4"/>
<path d="M60 120h180v300H60z" fill="url(#milkRed)"/>
<path d="M60 120h70v300H60z" fill="url(#milkSide)" opacity="0.95"/>
<path d="M240 120v300" stroke="#a51a14" stroke-width="4"/>
<text x="196" y="390" transform="rotate(-90 196 390)" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="58" fill="#fff4dc" letter-spacing="1">MILK</text>
<text x="92" y="300" transform="rotate(-90 92 300)" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="17" fill="#b5a782" letter-spacing="3">CHEFBOT</text>`,
  }),
  salmon: svg({
    w: 440,
    h: 300,
    seed: 12,
    shadow: [220, 262, 180, 16],
    defs: lg("salmonFlesh", [[0, "#ffa36c"], [1, "#ee6f3c"]]),
    body: `<path d="M40 150c40-70 140-96 250-84 70 8 112 34 112 66 0 40-56 84-160 94-110 10-232-6-202-76z" fill="url(#salmonFlesh)"/>
<path d="M40 150c30 58 160 78 362-18" stroke="#7d8890" stroke-width="16" fill="none" stroke-linecap="round" opacity="0.9"/>
<path d="M120 96c-10 40 0 90 24 120M190 82c-12 46-4 100 22 140M260 78c-10 46 0 96 26 134M326 90c-8 36 2 74 22 102" stroke="#ffd8bd" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.85"/>`,
  }),
  tofu: svg({
    seed: 14,
    shadow: [200, 336, 150, 18],
    body: `<path d="M90 140l120-48 120 48-120 48z" fill="#fffbef"/>
<path d="M90 140v150l120 48V188z" fill="#efe7d0"/><path d="M330 140v150l-120 48V188z" fill="#ddd2b4"/>
<circle cx="150" cy="240" r="4" fill="#cfc29f"/><circle cx="170" cy="270" r="3" fill="#cfc29f"/><circle cx="260" cy="250" r="4" fill="#bfb290"/>`,
  }),
  shrimp: svg({
    seed: 15,
    shadow: [200, 330, 140, 16],
    defs: lg("shrimp", [[0, "#ffb08a"], [1, "#f06a3e"]]),
    body: `<path d="M110 250c-40-90 30-176 130-168 74 6 112 64 98 116-12 44-58 66-100 56" stroke="url(#shrimp)" stroke-width="74" fill="none" stroke-linecap="round"/>
<path d="M168 112c6 22 4 44-6 62M232 96c4 26 0 52-12 72M290 120c-2 26-12 46-28 60M318 176c-14 16-32 26-52 30" stroke="#ffd9c6" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.8"/>
<path d="M226 276l-28 56 52-10 30 40 8-62z" fill="#ef6a3c"/><circle cx="102" cy="226" r="7" fill="#3a2414"/>`,
  }),

  // ---------- Vegetables & Fruits ----------
  broccoli: svg({
    w: 420,
    h: 440,
    seed: 21,
    shadow: [210, 410, 150, 18],
    defs: lg("stalk", [[0, "#b7d98a"], [1, "#7fae4c"]]) + rg("floret", [[0, "#4f9a3a"], [1, "#1f5a22"]]),
    body: `<path d="M178 400c4-60 0-112-30-164l66-20 56 22c-30 52-34 104-30 162z" fill="url(#stalk)"/>
<path d="M190 300l-50-60M236 300l48-56" stroke="#9cc56c" stroke-width="16" stroke-linecap="round"/>
${[[120, 160, 70], [200, 120, 78], [290, 158, 72], [160, 220, 60], [262, 222, 62], [210, 190, 70]]
  .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#floret)"/>`)
  .join("")}
${Array.from({ length: 34 }, (_, i) => {
  const a = i * 2.39;
  const d = 30 + (i * 17) % 110;
  return `<circle cx="${(205 + Math.cos(a) * d).toFixed(0)}" cy="${(175 + Math.sin(a) * d * 0.7).toFixed(0)}" r="${6 + (i % 4)}" fill="${i % 3 ? "#2c6e2a" : "#6fb04f"}" opacity="0.8"/>`;
}).join("")}`,
  }),
  tomato: svg({
    seed: 23,
    shadow: [200, 350, 145, 18],
    defs: rg("tomato", [[0, "#ff7a5a"], [0.55, "#e8321f"], [1, "#a81d12"]]),
    body: `<path d="M200 100c96 0 150 64 146 136-4 74-70 118-146 118S58 310 54 236c-4-72 50-136 146-136z" fill="url(#tomato)"/>
<path d="M140 118c-30 18-52 50-56 92" stroke="#ff9b80" stroke-width="12" fill="none" stroke-linecap="round" opacity="0.7"/>
<path d="M200 118l-34-28 24 6-6-34 22 30 18-32-2 36 30-16-24 34 40 2-44 14z" fill="#3f8a2e"/>
<path d="M200 96v-34" stroke="#356f25" stroke-width="9" stroke-linecap="round"/>`,
  }),
  banana: svg({
    w: 460,
    h: 360,
    seed: 25,
    shadow: [230, 320, 190, 18],
    defs: lg("ban", [[0, "#ffe35c"], [1, "#f2b91c"]]),
    body: `${[[0, 0], [26, 34], [52, 66]]
      .map(
        ([dx, dy]) =>
          `<path d="M${60 + dx} ${110 + dy}c30 120 160 170 330 120-6-14-20-22-36-22-120 22-220-14-268-112z" fill="url(#ban)" stroke="#d99a12" stroke-width="3"/>`,
      )
      .join("")}
<path d="M52 104l26-14 16 30z" fill="#5d4219"/><path d="M386 228l26 8-10 24z" fill="#3b2a12"/>
<path d="M120 200c60 50 140 62 220 44" stroke="#fff3a6" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.7"/>`,
  }),
  peas: svg({
    w: 340,
    h: 440,
    seed: 27,
    shadow: [170, 414, 120, 14],
    defs: lg("bag", [[0, "#fbf7e8"], [1, "#e3dcc2"]], 0, 0, 1, 0),
    body: `<path d="M50 70c80-14 160-14 240 0l-10 330c-74 12-146 12-220 0z" fill="url(#bag)"/>
<path d="M50 70c80-14 160-14 240 0v26c-80-12-160-12-240 0z" fill="#cfc7ad"/>
<path d="M54 96h40v304H64zM246 96h40l-6 304h-34z" fill="#2f9a3e"/>
<text x="170" y="196" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="24" fill="#2f9a3e">FROZEN</text>
<text x="170" y="250" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="42" fill="#23812f">PEAS</text>
<path d="M104 330c40-46 100-56 140-30-30 30-90 50-140 30z" fill="#4fb050"/>
${[118, 146, 174, 202].map((x, i) => `<circle cx="${x}" cy="${322 - i * 5}" r="13" fill="#7ccf5c"/>`).join("")}`,
  }),
  apple: svg({
    seed: 29,
    shadow: [200, 354, 140, 18],
    defs: rg("apple", [[0, "#ff6a55"], [0.6, "#d8261c"], [1, "#8f1611"]]),
    body: `<path d="M200 128c40-30 120-26 140 46 20 74-14 152-74 170-26 8-46-6-66-6s-40 14-66 6c-60-18-94-96-74-170 20-72 100-76 140-46z" fill="url(#apple)"/>
<path d="M118 160c-22 28-26 70-10 106" stroke="#ff9d8d" stroke-width="12" fill="none" stroke-linecap="round" opacity="0.6"/>
<path d="M202 128c0-30 6-52 20-70" stroke="#5a3a1c" stroke-width="10" stroke-linecap="round" fill="none"/>
<path d="M222 80c34-26 74-22 92-6-30 22-62 22-92 6z" fill="#4c9a35"/>`,
  }),
  carrot: svg({
    w: 300,
    h: 460,
    seed: 31,
    shadow: [150, 430, 70, 12],
    defs: lg("carrot", [[0, "#ffa13d"], [1, "#e86a14"]], 0, 0, 1, 0),
    body: `<path d="M98 120c30-10 74-10 104 0-6 130-28 230-52 300-24-70-46-170-52-300z" fill="url(#carrot)"/>
<path d="M112 180h30M150 230h34M118 280h26M146 330h22" stroke="#c9520e" stroke-width="5" stroke-linecap="round"/>
<path d="M150 120c-20-40-50-70-80-80M150 118c0-46 6-80 20-104M152 120c22-36 54-58 86-62" stroke="#4b9b35" stroke-width="14" fill="none" stroke-linecap="round"/>`,
  }),

  // ---------- Grains ----------
  bread: svg({
    w: 460,
    h: 360,
    seed: 41,
    shadow: [230, 316, 190, 18],
    defs: rg("crust", [[0, "#f2a95a"], [0.6, "#cf7a2c"], [1, "#94501a"]], 0.4, 0.3, 0.9),
    body: `<path d="M40 210c0-90 80-140 190-140s190 50 190 140c0 50-10 78-20 90H60c-10-12-20-40-20-90z" fill="url(#crust)"/>
<path d="M120 112c18 30 24 58 18 92M206 92c18 34 22 66 14 104M296 104c16 30 20 60 12 94" stroke="#f7c98a" stroke-width="12" stroke-linecap="round" fill="none"/>
<path d="M362 300c22-14 34-40 34-72 0-30-12-54-30-66-8 24-12 74-4 138z" fill="#f6dfb0"/>
<path d="M372 290c14-16 18-40 14-64" stroke="#e7c58a" stroke-width="5" stroke-linecap="round" fill="none"/>`,
  }),
  rice: svg({
    w: 420,
    h: 360,
    seed: 43,
    shadow: [210, 330, 160, 16],
    defs: lg("bowl", [[0, "#b8542a"], [1, "#6e2a12"]]),
    body: `<path d="M70 168c40-70 240-70 280 0z" fill="#fdfbf2"/>
${Array.from({ length: 40 }, (_, i) => `<ellipse cx="${90 + ((i * 53) % 240)}" cy="${120 + ((i * 29) % 46)}" rx="7" ry="3" fill="#e9e4d2" transform="rotate(${(i * 37) % 180} ${90 + ((i * 53) % 240)} ${120 + ((i * 29) % 46)})"/>`).join("")}
<path d="M48 168h324c-6 92-74 150-162 150S54 260 48 168z" fill="url(#bowl)"/>
<path d="M48 168h324" stroke="#d9773f" stroke-width="10" stroke-linecap="round"/>
<path d="M90 200c20 48 60 78 120 86" stroke="#c96a3a" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.6"/>`,
  }),
  noodles: svg({
    w: 420,
    h: 380,
    seed: 45,
    shadow: [210, 350, 160, 16],
    defs: lg("bowl2", [[0, "#2f3a3f"], [1, "#11181b"]]),
    body: `<path d="M64 170c50-56 242-56 292 0z" fill="#f4d79a"/>
${Array.from({ length: 7 }, (_, i) => `<path d="M${84 + i * 4} ${150 + i * 3}c40 ${-24 + (i % 2) * 12} 80 ${18 - (i % 3) * 8} 120 0s80 ${-20 + (i % 2) * 10} 120 0" stroke="#f0c46e" stroke-width="7" fill="none" stroke-linecap="round"/>`).join("")}
<ellipse cx="282" cy="132" rx="40" ry="26" fill="#fffaf0"/><ellipse cx="282" cy="134" rx="18" ry="13" fill="#f6a91f"/>
${[120, 146, 168].map((x) => `<circle cx="${x}" cy="${134}" r="9" fill="#7cc35a" stroke="#4e9637" stroke-width="3"/>`).join("")}
<path d="M44 170h332c-8 100-80 162-166 162S52 270 44 170z" fill="url(#bowl2)"/>
<path d="M44 170h332" stroke="#c8261e" stroke-width="10" stroke-linecap="round"/>
<path d="M300 60l-90 120M330 70l-96 118" stroke="#c99862" stroke-width="9" stroke-linecap="round"/>`,
  }),
  oats: svg({
    w: 360,
    h: 360,
    seed: 47,
    defs: lg("oat", [[0, "#f1d48c"], [1, "#d3a64c"]]),
    body: [[80, 90, -20], [150, 70, 15], [120, 150, 30], [210, 130, -35], [260, 200, 10], [100, 230, -10], [180, 240, 40], [250, 290, -25], [300, 120, 20]]
      .map(
        ([x, y, r]) =>
          `<g transform="rotate(${r} ${x} ${y})"><ellipse cx="${x}" cy="${y + 8}" rx="40" ry="18" fill="#3a2414" opacity="0.18"/><ellipse cx="${x}" cy="${y}" rx="40" ry="20" fill="url(#oat)"/><path d="M${x - 26} ${y}h52" stroke="#b98a35" stroke-width="3" stroke-linecap="round"/></g>`,
      )
      .join(""),
  }),

  // ---------- Pantry ----------
  garlic: svg({
    seed: 51,
    shadow: [200, 350, 130, 16],
    defs: rg("garlic", [[0, "#fffdf6"], [0.7, "#efe6d6"], [1, "#c9b8a3"]]),
    body: `<path d="M200 70c10 26 24 40 52 58 60 38 90 92 72 150-16 50-70 72-124 72s-108-22-124-72c-18-58 12-112 72-150 28-18 42-32 52-58z" fill="url(#garlic)"/>
<path d="M200 128c-30 60-40 140-10 214M200 128c30 60 40 140 10 214M200 128c-70 40-100 120-70 196M200 128c70 40 100 120 70 196" stroke="#d8c8b4" stroke-width="5" fill="none"/>
<path d="M150 130c-10 30 0 60 10 70" stroke="#c9a4c8" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.6"/>
<path d="M170 344c-6 12-14 18-24 20M200 348v22M230 344c6 12 14 18 24 20" stroke="#b49c7c" stroke-width="5" stroke-linecap="round"/>`,
  }),
  chili: svg({
    w: 420,
    h: 300,
    seed: 53,
    shadow: [200, 262, 160, 14],
    defs: lg("chili", [[0, "#ff4a32"], [1, "#b8170f"]]),
    body: `<path d="M110 120c80-20 180 0 240 80 18 24 10 40-10 34-70-22-150-28-220-6-40 12-70-4-74-30s20-68 64-78z" fill="url(#chili)"/>
<path d="M140 132c60-12 130 2 180 40" stroke="#ff9a85" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.6"/>
<path d="M110 120c-20-10-44-6-60 8l-6 32c18 10 40 10 60-6z" fill="#3f8a2e"/>
<path d="M54 132c-14-16-22-38-20-60" stroke="#3a7a2a" stroke-width="10" stroke-linecap="round" fill="none"/>`,
  }),
  soy: svg({
    w: 260,
    h: 460,
    seed: 55,
    shadow: [130, 432, 90, 14],
    defs: lg("glass", [[0, "#3b241a"], [0.5, "#20120b"], [1, "#3b241a"]], 0, 0, 1, 0),
    body: `<rect x="108" y="30" width="44" height="40" rx="8" fill="#d8261c"/>
<path d="M112 70h36v60c34 22 52 54 52 100v170c0 14-12 24-26 24H86c-14 0-26-10-26-24V230c0-46 18-78 52-100z" fill="url(#glass)"/>
<rect x="68" y="250" width="124" height="110" rx="10" fill="#fbf4e2"/>
<text x="130" y="318" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="40" fill="#c8261e">SOY</text>
<text x="130" y="344" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="13" fill="#3a2414" letter-spacing="3">SAUCE</text>
<path d="M82 180c-6 40-6 80 0 120" stroke="#7a5240" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.6"/>`,
  }),
  honey: svg({
    w: 340,
    h: 420,
    seed: 57,
    shadow: [170, 392, 130, 16],
    defs: lg("honey", [[0, "#ffc84a"], [1, "#d98612"]], 0, 0, 1, 0),
    body: `<rect x="76" y="64" width="188" height="46" rx="10" fill="#c8261e"/>
<path d="M70 110h200c18 0 28 14 28 30v190c0 30-24 54-54 54H96c-30 0-54-24-54-54V140c0-16 10-30 28-30z" fill="url(#honey)"/>
<path d="M76 110c0 30 20 26 20 50s-12 22-12 36" stroke="#d98612" stroke-width="14" stroke-linecap="round" fill="none"/>
<rect x="88" y="200" width="164" height="96" rx="12" fill="#fff6dd"/>
<text x="170" y="262" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="38" fill="#b86d0c">HONEY</text>
<path d="M240 130c16 40 18 140 0 210" stroke="#ffe08a" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.6"/>`,
  }),
};

let total = 0;
for (const [name, markup] of Object.entries(ART)) {
  const file = `${OUT}${name}.svg`;
  const compact = markup.replace(/\n\s*/g, "");
  writeFileSync(file, compact);
  total += compact.length;
  console.log(`${name.padEnd(10)} ${(compact.length / 1024).toFixed(1)} KB`);
}
console.log(`total      ${(total / 1024).toFixed(1)} KB, ${Object.keys(ART).length} files`);
