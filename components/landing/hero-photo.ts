/**
 * The hero media photo is rendered twice — by the hero card and by the intro
 * layer that morphs into it. Both must request the exact same image URL (one
 * download, identical crop), so they share these settings.
 */
export const HERO_PHOTO_SIZES = "(min-width: 1152px) 1104px, calc(100vw - 32px)";
export const HERO_PHOTO_QUALITY = 72;
export const HERO_PHOTO_ALT =
  "A skillet of herby fried rice with shrimp, peas and lemon wedges.";
