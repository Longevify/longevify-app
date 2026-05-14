"use client";

import Image from "next/image";
import type { PatientSex } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface BodyMannequinProps {
  sex: PatientSex;
  className?: string;
}

/**
 * Avatar manequim — UMA imagem estática profissional (manequim 3D porcelana
 * branco fosco renderizado, estilo direto do app Superpower).
 *
 * Substitui o Three.js puro (que parecia Lego) e o viewer 360° de 24 frames
 * (proporções inconsistentes entre frames). Aqui usa só 1 frame perfeito
 * por sexo — o frame 0° (frente) que ficou anatomicamente correto.
 *
 * Frames já estão em /public/avatars/360/{sex}/000.webp (gerados via
 * gpt-image-1, depois comprimidos pra WebP 512×768 ~5KB).
 */
export function BodyMannequin({ sex, className }: BodyMannequinProps) {
  const src = `/avatars/360/${sex}/000.webp`;
  const alt = `Avatar manequim ${sex === "female" ? "feminino" : "masculino"}`;

  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-full select-none",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 280px, 140px"
        priority
        className="object-contain"
        draggable={false}
      />
    </div>
  );
}
