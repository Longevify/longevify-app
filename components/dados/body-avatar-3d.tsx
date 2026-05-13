"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import type { PatientSex } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// ─── Regiões corporais ──────────────────────────────────────────────────────
export type BodyRegion =
  | "head"
  | "neck"
  | "chest"
  | "abdomen-upper"
  | "abdomen-mid"
  | "abdomen-low"
  | "arms"
  | "legs"
  | "body";

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

// Posições relativas (em coords do modelo Xbot) pra cada região anatômica.
const REGION_POSITIONS: Record<Exclude<BodyRegion, "body">, [number, number, number]> = {
  head: [0, 1.65, 0.05],
  neck: [0, 1.45, 0.03],
  chest: [0, 1.30, 0.07],
  "abdomen-upper": [0, 1.10, 0.07],
  "abdomen-mid": [0, 0.95, 0.07],
  "abdomen-low": [0, 0.80, 0.05],
  arms: [0, 1.20, 0],
  legs: [0, 0.40, 0],
};

const REGION_SIZES: Record<Exclude<BodyRegion, "body">, [number, number, number]> = {
  head: [0.22, 0.28, 0.22],
  neck: [0.14, 0.12, 0.14],
  chest: [0.38, 0.30, 0.24],
  "abdomen-upper": [0.32, 0.16, 0.22],
  "abdomen-mid": [0.30, 0.18, 0.22],
  "abdomen-low": [0.34, 0.18, 0.22],
  arms: [0.6, 0.6, 0.3],
  legs: [0.4, 0.9, 0.3],
};

// Modelos GLB por sexo — recomendação do research agent. Soldier/Michelle do
// repo three.js (MIT) tem proporções mais anatomicamente realistas que Xbot.
// O material é overridado pra porcelana fosca branca (BASE_MATERIAL), então
// a silhueta da roupa do modelo vira parte da forma corporal abstrata.
const MODEL_PATHS: Record<PatientSex, string> = {
  male: "/avatars/Soldier.glb",
  female: "/avatars/Michelle.glb",
};

const ACTIVE_COLOR = "#1f5d3f"; // brand-700
const ACTIVE_EMISSIVE = "#3f9a6b"; // brand-500

// Porcelana fosca — sem plástico
const BASE_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#eef0f0",
  roughness: 0.75,
  metalness: 0.05,
});

interface BodyAvatar3DProps {
  sex: PatientSex;
  activeCategoryId?: string;
  className?: string;
}

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
      {/* Skeleton placeholder enquanto GLB não chegou */}
      <Canvas
        camera={{ position: [0, 1.0, 3.3], fov: 28 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
        shadows
      >
        {/* ── 3-point lighting ─────────────────────────────────── */}
        {/* Key: front-right-top */}
        <directionalLight
          position={[2.5, 4.5, 3]}
          intensity={1.0}
          castShadow={false}
        />
        {/* Fill: front-left, suave */}
        <directionalLight
          position={[-2.5, 2.5, 2]}
          intensity={0.4}
          castShadow={false}
        />
        {/* Rim/back: delineia silhueta */}
        <directionalLight
          position={[0, 1.5, -3]}
          intensity={0.6}
          castShadow={false}
        />
        {/* Ambient mínimo pra não crashar nas sombras */}
        <ambientLight intensity={0.18} />

        {/* Environment map sutil (studio) — reflexos naturais sem metalicidade */}
        <Environment preset="studio" environmentIntensity={0.35} />

        <Suspense fallback={<SkeletonFallback />}>
          <HumanModel sex={sex} activeRegion={activeRegion} />
          {/* Sombra de contato pra dar peso/grounding */}
          <ContactShadows
            position={[0, 0.001, 0]}
            opacity={0.35}
            blur={2.4}
            far={1.5}
            resolution={256}
          />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.8}
          target={[0, 0.95, 0]}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 1.7}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}

// ─── Skeleton enquanto carrega ───────────────────────────────────────────────
function SkeletonFallback() {
  return (
    <mesh position={[0, 0.9, 0]}>
      <capsuleGeometry args={[0.18, 1.2, 8, 16]} />
      <meshStandardMaterial color="#e7f5ec" roughness={1} metalness={0} transparent opacity={0.45} />
    </mesh>
  );
}

// ─── Modelo humano ───────────────────────────────────────────────────────────
function HumanModel({
  sex,
  activeRegion,
}: {
  sex: PatientSex;
  activeRegion: BodyRegion | null;
}) {
  const { scene } = useGLTF(MODEL_PATHS[sex]);
  const groupRef = useRef<THREE.Group>(null);

  // Fade-in suave na entrada
  const opacityRef = useRef(0);
  useFrame((_, delta) => {
    opacityRef.current = Math.min(1, opacityRef.current + delta * 1.6);
    if (groupRef.current) {
      groupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.Material) {
          obj.material.opacity = opacityRef.current;
          obj.material.transparent = opacityRef.current < 1;
        }
      });
    }
  });

  const scaleX = sex === "female" ? 0.92 : 1.0;
  const scaleY = sex === "female" ? 0.95 : 1.0;

  // Regiões ativas para destaque
  const activeRegions = useMemo<Array<Exclude<BodyRegion, "body">>>(() => {
    if (!activeRegion) return [];
    if (activeRegion === "body")
      return Object.keys(REGION_POSITIONS) as Array<Exclude<BodyRegion, "body">>;
    return [activeRegion as Exclude<BodyRegion, "body">];
  }, [activeRegion]);

  // Clona e aplica material base em todos os meshes
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        // Cada mesh precisa de instância própria pro fade-in funcionar por objeto
        obj.material = BASE_MATERIAL.clone();
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
    return clone;
  }, [scene]);

  return (
    <group ref={groupRef}>
      <primitive
        object={cloned}
        position={[0, 0, 0]}
        scale={[scaleX, scaleY, scaleX]}
      />
      {activeRegions.map((region) => (
        <RegionHighlight key={region} region={region} />
      ))}
    </group>
  );
}

useGLTF.preload(MODEL_PATHS.male);
useGLTF.preload(MODEL_PATHS.female);

// ─── Highlight de região ─────────────────────────────────────────────────────
function RegionHighlight({ region }: { region: Exclude<BodyRegion, "body"> }) {
  const pos = REGION_POSITIONS[region];
  const size = REGION_SIZES[region];
  const radius = Math.max(...size) * 0.55;

  return (
    <mesh position={pos}>
      <sphereGeometry args={[radius, 28, 28]} />
      <meshStandardMaterial
        color={ACTIVE_COLOR}
        emissive={ACTIVE_EMISSIVE}
        emissiveIntensity={0.55}
        transparent
        opacity={0.52}
        depthWrite={false}
        roughness={0.6}
        metalness={0}
      />
    </mesh>
  );
}
