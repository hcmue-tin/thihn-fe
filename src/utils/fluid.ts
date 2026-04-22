/**
 * Fluid sizing helpers.
 *
 * The whole app already scales because the root font-size is driven by a
 * viewport-aware clamp() (see index.css). These helpers make it easy to add
 * additional clamp()-based fluid values where needed — for example when we
 * want a hard absolute min/max (like the LED countdown circle that must be
 * readable from a distance but must not overflow the viewport).
 */

/**
 * Build a CSS clamp() expression.
 *
 * Example:
 *   fluid(1, 2.5, 3.5) -> "clamp(1rem, 2.5vw, 3.5rem)"
 *   fluid(0.9, 1.4, 1.8, "vh") -> "clamp(0.9rem, 1.4vh, 1.8rem)"
 */
export const fluid = (
  minRem: number,
  preferredVw: number,
  maxRem: number,
  unit: "vw" | "vh" | "vmin" | "vmax" = "vw"
): string => `clamp(${minRem}rem, ${preferredVw}${unit}, ${maxRem}rem)`;

/**
 * Fluid font-size shortcuts tuned for the candidate + LED interfaces.
 *
 * All sizes are expressed in rem (so they inherit the viewport-aware root
 * font), but each has an absolute min/max in `vmin` for extra safety on
 * very tall or very short windows.
 */
export const fluidFont = {
  caption: fluid(0.75, 0.9, 0.9),
  body: fluid(0.9, 1.05, 1.1),
  subtitle: fluid(1, 1.15, 1.25),
  title: fluid(1.15, 1.45, 1.6),
  h6: fluid(1.1, 1.4, 1.5),
  h5: fluid(1.25, 1.8, 2),
  h4: fluid(1.5, 2.2, 2.75),
  h3: fluid(1.75, 2.6, 3.25),
  h2: fluid(2, 3.2, 4.25),
  h1: fluid(2.5, 4, 5.5),
  /** Very large numeric displays (timer on LED, etc.). */
  display: fluid(3, 8, 9, "vmin"),
  /** Medium-large numeric displays (timer on contestant screen). */
  displaySm: fluid(2, 4.5, 5.5, "vmin")
};

/** Fluid spacing in rem. Good for paddings/margins that need more range than MUI spacing. */
export const fluidSpace = {
  xs: fluid(0.25, 0.4, 0.5),
  sm: fluid(0.5, 0.7, 0.9),
  md: fluid(0.75, 1, 1.35),
  lg: fluid(1, 1.4, 1.9),
  xl: fluid(1.4, 2.2, 3)
};
