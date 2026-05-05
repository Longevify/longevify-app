import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  mono?: "dark" | "light";
  /** Altura em px do wordmark. Largura é derivada mantendo aspect 2000:700.
   *  Default 36 (size original do top-nav). Em telas dedicadas (login hero)
   *  pode passar valores maiores tipo 56-72. */
  height?: number;
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
export function Logo({ className, mono = "dark", height = 36 }: LogoProps) {
  const src = mono === "dark" ? "/logo-dark.png" : "/logo-light.png";
  const heightPx = height;
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
