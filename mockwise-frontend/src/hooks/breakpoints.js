/**
 * Shared layout breakpoints (px).
 * Aligns with Bootstrap's md boundary: mobile below, laptop/desktop at md+.
 *
 * mobile  : width <= MOBILE_MAX
 * desktop : width >= DESKTOP_MIN
 */
export const BREAKPOINTS = {
  /** Largest width treated as mobile (inclusive). */
  MOBILE_MAX: 767,
  /** Smallest width treated as laptop/desktop (inclusive). */
  DESKTOP_MIN: 768,
};

export const MEDIA = {
  /** True when viewport is mobile-sized. */
  mobile: `(max-width: ${BREAKPOINTS.MOBILE_MAX}px)`,
  /** True when viewport is laptop/desktop-sized. */
  desktop: `(min-width: ${BREAKPOINTS.DESKTOP_MIN}px)`,
};
