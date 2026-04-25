import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  mono?: "dark" | "light";
}

const NATIVE_W = 2000;
const NATIVE_H = 700;

/**
 * Real Longevify wordmark — PNG export from the brand book, cropped to the
 * wordmark's bounding box (2000×700) so the rendered logo fills the box.
 *
 * `mono="dark"` is the deep-green logo on light surfaces.
 * `mono="light"` is the mint logo on dark surfaces.
 */
export function Logo({ className, mono = "dark" }: LogoProps) {
  const src = mono === "dark" ? "/logo-dark.png" : "/logo-light.png";
  const heightPx = 36;
  const widthPx = Math.round((heightPx * NATIVE_W) / NATIVE_H);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Longevify"
      width={widthPx}
      height={heightPx}
      className={cn("select-none shrink-0", className)}
      style={{ width: widthPx, height: heightPx }}
    />
  );
}
