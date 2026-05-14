"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import type { PatientSex } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { OrganOverlay, isOrganRegion, type OrganRegion } from "./organ-overlay";

// ─── Regiões corporais ──────────────────────────────────────────────────────
// Cada região da pele é renderizada como mesh separado (capsule/sphere/cylinder).
// Pra destacar uma região, basta trocar o color material do mesh correspondente.
export type BodyRegion =
  | "head"
  | "neck"
  | "chest"
  | "abdomen-upper"
  | "abdomen-mid"
  | "abdomen-low"
  | "arms"
  | "legs"
  // Órgãos individuais — disparam OrganOverlay com GLB anatômico real
  | "heart"
  | "brain"
  | "liver"
  | "kidneys"
  | "lungs"
  | "intestine"
  | "pancreas"
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
  heart: "heart",
  brain: "brain",
  liver: "liver",
  kidneys: "kidneys",
  lungs: "lungs",
  intestine: "intestine",
  pancreas: "pancreas",
};

const BASE_COLOR = "#e8ecef"; // porcelana clínica
const DEFAULT_ACTIVE_COLOR = "#1f5d3f";

interface BodyAvatar3DProps {
  sex: PatientSex;
  activeCategoryId?: string;
  /** Cor de destaque hex. Default brand-700. */
  activeColor?: string;
  className?: string;
}

export function BodyAvatar3D({
  sex,
  activeCategoryId,
  activeColor = DEFAULT_ACTIVE_COLOR,
  className,
}: BodyAvatar3DProps) {
  const activeRegion = activeCategoryId
    ? (CATEGORY_TO_REGION[activeCategoryId] ?? null)
    : null;

  return (
    <div className={cn("relative aspect-[2/3] w-full", className)}>
      <Canvas
        // Figura humana ~1.85 unidades de altura, pés em Y=0, cabeça em Y=1.85.
        // Target em Y=1.0 (mira no abdômen), distance 3.5, fov 36° →
        // altura visível ~2.3m, enquadra corpo todo com folga.
        camera={{ position: [0, 1.0, 3.5], fov: 36 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <directionalLight position={[2.5, 4.5, 3]} intensity={1.0} />
        <directionalLight position={[-2.5, 2.5, 2]} intensity={0.4} />
        <directionalLight position={[0, 1.5, -3]} intensity={0.6} />
        <ambientLight intensity={0.25} />

        <Environment preset="studio" environmentIntensity={0.35} />

        <Suspense fallback={null}>
          <HumanFigure
            sex={sex}
            activeRegion={activeRegion}
            activeColor={activeColor}
          />
          {isOrganRegion(activeRegion) ? (
            <Suspense fallback={null}>
              <OrganOverlay
                organ={activeRegion as OrganRegion}
                color={activeColor}
              />
            </Suspense>
          ) : null}
          <ContactShadows
            position={[0, -0.02, 0]}
            opacity={0.3}
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
          target={[0, 1.0, 0]}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 1.7}
          autoRotate
          autoRotateSpeed={0.4}
        />
      </Canvas>
    </div>
  );
}

// ─── Figura humana (mesh primitives, A-pose por design) ─────────────────────
//
// Construída com sphere/capsule/cylinder. Cada parte da pele é um Mesh
// independente — destaque é só trocar a cor do material. Sem rigging.
//
// Coordenadas: Y=0 pés, Y=1.85 topo cabeça. Pose A natural: braços
// ~17° abertos pra fora do tronco (rotation.z nos braços).
function HumanFigure({
  sex,
  activeRegion,
  activeColor,
}: {
  sex: PatientSex;
  activeRegion: BodyRegion | null;
  activeColor: string;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const isFemale = sex === "female";
  // Proporções por sexo (sutil — só silhueta)
  const shoulderW = isFemale ? 0.18 : 0.21;
  const chestR = isFemale ? 0.15 : 0.17;
  const waistR = isFemale ? 0.11 : 0.13;
  const hipR = isFemale ? 0.16 : 0.155;
  const armRadius = isFemale ? 0.05 : 0.058;
  const legRadius = isFemale ? 0.085 : 0.092;

  // Materiais por região — instanciados via useMemo no top level pra
  // respeitar rules of hooks. Cada região tem seu próprio material pra
  // ghost mode (opacity) funcionar independente por mesh.
  const materials = useMemo(() => {
    const colorFor = (region: BodyRegion) =>
      activeRegion === region || activeRegion === "body"
        ? activeColor
        : BASE_COLOR;
    const makeMat = (region: BodyRegion) =>
      new THREE.MeshStandardMaterial({
        color: colorFor(region),
        roughness: 0.65,
        metalness: 0.08,
      });
    return {
      head: makeMat("head"),
      neck: makeMat("neck"),
      chest: makeMat("chest"),
      "abdomen-upper": makeMat("abdomen-upper"),
      "abdomen-mid": makeMat("abdomen-mid"),
      "abdomen-low": makeMat("abdomen-low"),
      arms: makeMat("arms"),
      legs: makeMat("legs"),
    };
  }, [activeRegion, activeColor]);

  // Ghost mode quando órgão ativo — opacity gradient via useFrame
  const opacityRef = useRef(0);
  const isGhost = isOrganRegion(activeRegion);
  useFrame((_, delta) => {
    const target = isGhost ? 0.22 : 1;
    const speed = opacityRef.current === 0 ? 1.6 : 3.0;
    if (opacityRef.current < target) {
      opacityRef.current = Math.min(target, opacityRef.current + delta * speed);
    } else if (opacityRef.current > target) {
      opacityRef.current = Math.max(target, opacityRef.current - delta * speed);
    }
    if (groupRef.current) {
      groupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.Material) {
          obj.material.opacity = opacityRef.current;
          obj.material.transparent = opacityRef.current < 1;
          (obj.material as THREE.MeshStandardMaterial).depthWrite =
            opacityRef.current >= 0.95;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Cabeça */}
      <mesh position={[0, 1.74, 0]} material={materials.head}>
        <sphereGeometry args={[0.13, 32, 32]} />
      </mesh>

      {/* Pescoço */}
      <mesh position={[0, 1.56, 0]} material={materials.neck}>
        <cylinderGeometry args={[0.055, 0.07, 0.1, 16]} />
      </mesh>

      {/* Ombros (esferas pra suavizar) */}
      <mesh position={[-shoulderW, 1.48, 0]} material={materials.chest}>
        <sphereGeometry args={[0.08, 16, 16]} />
      </mesh>
      <mesh position={[shoulderW, 1.48, 0]} material={materials.chest}>
        <sphereGeometry args={[0.08, 16, 16]} />
      </mesh>

      {/* Tronco superior (peito) — cylinder afunilando ombros→cintura */}
      <mesh position={[0, 1.30, 0]} material={materials.chest}>
        <cylinderGeometry args={[waistR * 1.1, chestR, 0.32, 24]} />
      </mesh>

      {/* Abdômen superior */}
      <mesh position={[0, 1.10, 0]} material={materials['abdomen-upper']}>
        <cylinderGeometry args={[waistR * 1.05, waistR * 1.1, 0.12, 24]} />
      </mesh>

      {/* Abdômen médio (cintura) */}
      <mesh position={[0, 0.98, 0]} material={materials['abdomen-mid']}>
        <cylinderGeometry args={[waistR, waistR * 1.05, 0.12, 24]} />
      </mesh>

      {/* Quadril / abdômen baixo */}
      <mesh position={[0, 0.84, 0]} material={materials['abdomen-low']}>
        <cylinderGeometry args={[hipR, waistR, 0.16, 24]} />
      </mesh>

      {/* Braço esquerdo (do paciente — direita da tela) — A-pose ~17° aberto */}
      <group position={[-shoulderW - 0.01, 1.46, 0]} rotation={[0, 0, 0.18]}>
        {/* Braço superior */}
        <mesh position={[0, -0.22, 0]} material={materials.arms}>
          <capsuleGeometry args={[armRadius, 0.38, 8, 16]} />
        </mesh>
        {/* Cotovelo */}
        <mesh position={[0, -0.45, 0]} material={materials.arms}>
          <sphereGeometry args={[armRadius * 1.05, 12, 12]} />
        </mesh>
        {/* Antebraço */}
        <mesh position={[0, -0.65, 0]} material={materials.arms}>
          <capsuleGeometry args={[armRadius * 0.92, 0.32, 8, 16]} />
        </mesh>
        {/* Mão */}
        <mesh position={[0, -0.86, 0]} material={materials.arms}>
          <sphereGeometry args={[armRadius * 1.15, 12, 12]} />
        </mesh>
      </group>

      {/* Braço direito (mirror) */}
      <group position={[shoulderW + 0.01, 1.46, 0]} rotation={[0, 0, -0.18]}>
        <mesh position={[0, -0.22, 0]} material={materials.arms}>
          <capsuleGeometry args={[armRadius, 0.38, 8, 16]} />
        </mesh>
        <mesh position={[0, -0.45, 0]} material={materials.arms}>
          <sphereGeometry args={[armRadius * 1.05, 12, 12]} />
        </mesh>
        <mesh position={[0, -0.65, 0]} material={materials.arms}>
          <capsuleGeometry args={[armRadius * 0.92, 0.32, 8, 16]} />
        </mesh>
        <mesh position={[0, -0.86, 0]} material={materials.arms}>
          <sphereGeometry args={[armRadius * 1.15, 12, 12]} />
        </mesh>
      </group>

      {/* Perna esquerda */}
      <group position={[-0.09, 0.72, 0]}>
        {/* Coxa */}
        <mesh position={[0, -0.20, 0]} material={materials.legs}>
          <capsuleGeometry args={[legRadius, 0.32, 8, 16]} />
        </mesh>
        {/* Joelho */}
        <mesh position={[0, -0.42, 0]} material={materials.legs}>
          <sphereGeometry args={[legRadius * 1.02, 12, 12]} />
        </mesh>
        {/* Panturrilha */}
        <mesh position={[0, -0.60, 0]} material={materials.legs}>
          <capsuleGeometry args={[legRadius * 0.85, 0.30, 8, 16]} />
        </mesh>
        {/* Pé */}
        <mesh
          position={[0, -0.79, 0.05]}
          rotation={[Math.PI / 2.2, 0, 0]}
          material={materials.legs}
        >
          <capsuleGeometry args={[0.05, 0.10, 8, 16]} />
        </mesh>
      </group>

      {/* Perna direita */}
      <group position={[0.09, 0.72, 0]}>
        <mesh position={[0, -0.20, 0]} material={materials.legs}>
          <capsuleGeometry args={[legRadius, 0.32, 8, 16]} />
        </mesh>
        <mesh position={[0, -0.42, 0]} material={materials.legs}>
          <sphereGeometry args={[legRadius * 1.02, 12, 12]} />
        </mesh>
        <mesh position={[0, -0.60, 0]} material={materials.legs}>
          <capsuleGeometry args={[legRadius * 0.85, 0.30, 8, 16]} />
        </mesh>
        <mesh
          position={[0, -0.79, 0.05]}
          rotation={[Math.PI / 2.2, 0, 0]}
          material={materials.legs}
        >
          <capsuleGeometry args={[0.05, 0.10, 8, 16]} />
        </mesh>
      </group>
    </group>
  );
}
