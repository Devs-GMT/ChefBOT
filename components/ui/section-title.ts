/**
 * Kitchen sections render as an h2 inside a longer page, or as the h1 when
 * the section is the page itself (e.g. /app/list).
 */
export interface SectionTitleProps {
  titleAs?: "h1" | "h2";
}
