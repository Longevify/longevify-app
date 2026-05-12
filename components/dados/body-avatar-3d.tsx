"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { PatientSex } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// ─── Regiões corporais ──────────────────────────────────────────────────────
// Cada região é um mesh separado pra poder destacar quando uma categoria
// é selecionada na sidebar de /dados.
export type BodyRegion =
  | "head"
  | "neck"
  | "chest"
  | "abdomen-upper"
  | "abdomen-mid"
  | "abdomen-low"
  | "arms"
  | "legs"
  | "body"; // marcador especial pra destacar tudo

/**
 * Mapping categoria → região destacada no avatar.
 *  - `null` = nada destacado (corpo todo neutro)
 *  - `"body"` = corpo inteiro destacado
 */
export const CATEGORY_TO_REGION: Record<string, BodyRegion | null> = {
  all: null,
  longevity: "body",
  cardiac: "chest",
  thyroid: "neck",
  immune: "body",
  hormonal: "abdomen-low",
  metabolic: "abdomen-mid",
  nutrients: "abdomen-mid",
  hepatic: "abdomen-upper",
  "heavy-metals": "body",
};

// ─── Cores ──────────────────────────────────────────────────────────────────
const BASE_COLOR = "#eef0f0"; // off-white
const ACTIVE_COLOR = "#1f5d3f"; // brand-700
const ACTIVE_EMISSIVE = "#3f9a6b"; // brand-500

interface BodyAvatar3DProps {
  sex: PatientSex;
  /** Categoria selecionada — usa CATEGORY_TO_REGION pra resolver a região. */
  activeCategoryId?: string;
  className?: string;
}

/**
 * Avatar corporal 3D interativo (substitui a versão PNG estática).
 *  - Background transparente
 *  - Rotação 360° via OrbitControls (drag-to-rotate, sem zoom/pan)
 *  - Destaque por região quando uma categoria é selecionada
 *  - Variantes male/female com proporções diferentes
 */
export function BodyAvatar3D({
  sex,
  activeCategoryId,
  className,
}: BodyAvatar3DProps) {
  const activeRegion = activeCategoryId
    ? (CATEGORY_TO_REGION[activeCategoryId] ?? null)
    : null;

  return (
    <div className={cn("relative aspect-[2/3] w-full", className)}>
      <Canvas
        camera={{ position: [0, 0.2, 3.4], fov: 32 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[3, 5, 3]} intensity={1.1} castShadow />
        <directionalLight position={[-3, 2, 2]} intensity={0.45} />
        <directionalLight position={[0, -2, 3]} intensity={0.2} />

        <Suspense fallback={null}>
          <HumanFigure sex={sex} activeRegion={activeRegion} />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.8}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 1.6}
        />
      </Canvas>
    </div>
  );
}

// ─── Figura humana ──────────────────────────────────────────────────────────
function HumanFigure({
  sex,
  activeRegion,
}: {
  sex: PatientSex;
  activeRegion: BodyRegion | null;
}) {
  const isActive = (region: BodyRegion) =>
    activeRegion === region || activeRegion === "body";

  const matProps = (region: BodyRegion) =>
    ({
      color: isActive(region) ? ACTIVE_COLOR : BASE_COLOR,
      emissive: isActive(region) ? ACTIVE_EMISSIVE : "#000000",
      emissiveIntensity: isActive(region) ? 0.35 : 0,
      roughness: 0.7,
      metalness: 0.05,
    }) as const;

  // Proporções por sexo (sutil — só silhueta)
  const isFemale = sex === "female";
  const shoulderW = isFemale ? 0.4 : 0.5;
  const waistW = isFemale ? 0.28 : 0.36;
  const hipW = isFemale ? 0.42 : 0.4;

  return (
    <group position={[0, -1.05, 0]}>
      {/* Cabeça */}
      <mesh position={[0, 2.05, 0]}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial {...matProps("head")} />
      </mesh>

      {/* Pescoço (tireoide) */}
      <mesh position={[0, 1.78, 0]}>
        <capsuleGeometry args={[0.08, 0.08, 8, 16]} />
        <meshStandardMaterial {...matProps("neck")} />
      </mesh>

      {/* Ombros — esferas pra suavizar transição */}
      <mesh position={[-shoulderW, 1.55, 0]}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshStandardMaterial {...matProps("chest")} />
      </mesh>
      <mesh position={[shoulderW, 1.55, 0]}>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshStandardMaterial {...matProps("chest")} />
      </mesh>

      {/* Peito (cardíaca) — cylinder afunilando dos ombros pra cintura */}
      <mesh position={[0, 1.32, 0]}>
        <cylinderGeometry args={[waistW * 0.9, shoulderW, 0.45, 24]} />
        <meshStandardMaterial {...matProps("chest")} />
      </mesh>

      {/* Abdômen superior (hepática) */}
      <mesh position={[0, 1.04, 0]}>
        <cylinderGeometry args={[waistW * 0.92, waistW * 0.9, 0.15, 24]} />
        <meshStandardMaterial {...matProps("abdomen-upper")} />
      </mesh>

      {/* Abdômen médio (metabólica / nutrientes) */}
      <mesh position={[0, 0.89, 0]}>
        <cylinderGeometry args={[waistW, waistW * 0.92, 0.16, 24]} />
        <meshStandardMaterial {...matProps("abdomen-mid")} />
      </mesh>

      {/* Quadril / abdômen baixo (hormonal) */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[hipW * 0.95, waistW, 0.22, 24]} />
        <meshStandardMaterial {...matProps("abdomen-low")} />
      </mesh>

      {/* Braço esquerdo */}
      <group position={[-shoulderW - 0.02, 1.32, 0]} rotation={[0, 0, 0.08]}>
        <mesh position={[0, -0.42, 0]}>
          <capsuleGeometry args={[0.075, 0.78, 8, 16]} />
          <meshStandardMaterial {...matProps("arms")} />
        </mesh>
        {/* mão */}
        <mesh position={[0, -0.88, 0]}>
          <sphereGeometry args={[0.085, 16, 16]} />
          <meshStandardMaterial {...matProps("arms")} />
        </mesh>
      </group>

      {/* Braço direito */}
      <group position={[shoulderW + 0.02, 1.32, 0]} rotation={[0, 0, -0.08]}>
        <mesh position={[0, -0.42, 0]}>
          <capsuleGeometry args={[0.075, 0.78, 8, 16]} />
          <meshStandardMaterial {...matProps("arms")} />
        </mesh>
        <mesh position={[0, -0.88, 0]}>
          <sphereGeometry args={[0.085, 16, 16]} />
          <meshStandardMaterial {...matProps("arms")} />
        </mesh>
      </group>

      {/* Perna esquerda */}
      <group position={[-0.16, 0.5, 0]}>
        <mesh position={[0, -0.45, 0]}>
          <capsuleGeometry args={[0.11, 0.85, 8, 16]} />
          <meshStandardMaterial {...matProps("legs")} />
        </mesh>
        {/* pé */}
        <mesh position={[0, -0.96, 0.04]} rotation={[Math.PI / 2.4, 0, 0]}>
          <capsuleGeometry args={[0.07, 0.1, 8, 16]} />
          <meshStandardMaterial {...matProps("legs")} />
        </mesh>
      </group>

      {/* Perna direita */}
      <group position={[0.16, 0.5, 0]}>
        <mesh position={[0, -0.45, 0]}>
          <capsuleGeometry args={[0.11, 0.85, 8, 16]} />
          <meshStandardMaterial {...matProps("legs")} />
        </mesh>
        <mesh position={[0, -0.96, 0.04]} rotation={[Math.PI / 2.4, 0, 0]}>
          <capsuleGeometry args={[0.07, 0.1, 8, 16]} />
          <meshStandardMaterial {...matProps("legs")} />
        </mesh>
      </group>
    </group>
  );
}
