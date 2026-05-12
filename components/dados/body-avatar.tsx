import Image from "next/image";
import { cn } from "@/lib/utils";
import type { PatientSex } from "@/lib/mock-data";

interface BodyAvatarProps {
  sex: PatientSex;
  className?: string;
}

/**
 * Avatar corporal — figura humana fotorrealista, totalmente branca
 * (manequim médico). Renderiza variantes por sexo biológico.
 *
 * Imagens são PNGs estáticos em /public/avatars/, geradas via
 * `scripts/generate-avatar-images.mjs` (OpenAI gpt-image-1).
 */
export function BodyAvatar({ sex, className }: BodyAvatarProps) {
  const src =
    sex === "female" ? "/avatars/body-female.png" : "/avatars/body-male.png";

  return (
    <Image
      src={src}
      alt={
        sex === "female"
          ? "Avatar corporal feminino"
          : "Avatar corporal masculino"
      }
      width={520}
      height={1040}
      priority
      className={cn("block h-auto w-full select-none", className)}
    />
  );
}
