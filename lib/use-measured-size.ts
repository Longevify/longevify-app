"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Measure a DOM node's content box so recharts charts can be given numeric
 * width/height and avoid the ResponsiveContainer "width(-1) height(-1)"
 * warning that fires when the container mounts at 0x0.
 */
export function useMeasuredSize<T extends HTMLElement = HTMLDivElement>(): {
  ref: React.RefObject<T | null>;
  width: number;
  height: number;
} {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setSize((prev) => {
        const next = {
          width: Math.max(0, Math.round(rect.width)),
          height: Math.max(0, Math.round(rect.height)),
        };
        if (prev.width === next.width && prev.height === next.height) {
          return prev;
        }
        return next;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return { ref, width: size.width, height: size.height };
}
