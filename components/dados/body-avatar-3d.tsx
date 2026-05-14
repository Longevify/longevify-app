"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
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
import { OrganOverlay, isOrganRegion, type OrganRegion } from "./organ-overlay";

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

// ─── Mapping região → faixa vertical Y (coords do modelo VH_*_Skin) ─────────
// O modelo HuBMAP Visible Human é estático (sem skin weights), então a
// segmentação por região é feita por POSIÇÃO Y do vertex em vez de bones.
// Y=0 nos pés, Y≈1.75 no topo da cabeça (manequim ~1.75m altura).
// Cada região é definida por [yMin, yMax]; alguns precisam de filtro X
// adicional (ex: arms = lateral, |x| > 0.18).
interface RegionBounds {
  yMin: number;
  yMax: number;
  /** filtro lateral opcional: requer abs(x) > xMinAbs OU < xMaxAbs */
  xMinAbs?: number;
  xMaxAbs?: number;
}
const REGION_BOUNDS: Record<Exclude<BodyRegion, "body">, RegionBounds> = {
  head: { yMin: 1.55, yMax: 1.85 },
  neck: { yMin: 1.42, yMax: 1.55 },
  chest: { yMin: 1.18, yMax: 1.42, xMaxAbs: 0.22 },
  "abdomen-upper": { yMin: 1.05, yMax: 1.18, xMaxAbs: 0.2 },
  "abdomen-mid": { yMin: 0.92, yMax: 1.05, xMaxAbs: 0.2 },
  "abdomen-low": { yMin: 0.78, yMax: 0.92, xMaxAbs: 0.22 },
  arms: { yMin: 0.65, yMax: 1.55, xMinAbs: 0.18 },
  legs: { yMin: 0, yMax: 0.78 },
  // órgãos individuais — esses não usam vertex color (têm OrganOverlay).
  // Mantemos entries pra type completar, mas com bounds que não casam ninguém.
  heart: { yMin: 1.28, yMax: 1.42, xMaxAbs: 0.18 },
  brain: { yMin: 1.6, yMax: 1.78, xMaxAbs: 0.12 },
  liver: { yMin: 1.08, yMax: 1.2, xMaxAbs: 0.2 },
  kidneys: { yMin: 0.95, yMax: 1.1 },
  lungs: { yMin: 1.18, yMax: 1.42 },
  intestine: { yMin: 0.85, yMax: 1.0, xMaxAbs: 0.2 },
  pancreas: { yMin: 1.0, yMax: 1.12, xMaxAbs: 0.18 },
};

// Modelo HuBMAP CCF Visible Human Skin — atlas anatômico clínico real
// (NLM Visible Human Project), CC-BY 4.0.
//  - VH_M_Skin.glb v1.2: 5.7MB, mesh masculino estático
//  - VH_F_Skin.glb v1.1: 3.2MB, mesh feminino estático
const MODEL_PATHS: Record<PatientSex, string> = {
  male: "/avatars/VH_M_Skin.glb",
  female: "/avatars/VH_F_Skin.glb",
};

const BASE_COLOR = new THREE.Color("#e8ecef"); // off-white clínico
const DEFAULT_ACTIVE_COLOR = "#1f5d3f";

interface BodyAvatar3DProps {
  sex: PatientSex;
  activeCategoryId?: string;
  /** Cor de destaque em hex. Default brand-700. */
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
        // Modelo é normalizado pra altura 1.7 unidades com pés em Y=0
        // → cabeça em ~Y=1.7. Camera mira no centro do corpo (Y=0.85)
        // a partir de ~4.2 unidades, com fov 38° → enquadra altura ~3m,
        // suficiente pra mostrar corpo todo com folga (pés + cabeça).
        camera={{ position: [0, 0.85, 4.2], fov: 38 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <directionalLight position={[2.5, 4.5, 3]} intensity={1.0} />
        <directionalLight position={[-2.5, 2.5, 2]} intensity={0.4} />
        <directionalLight position={[0, 1.5, -3]} intensity={0.6} />
        <ambientLight intensity={0.25} />

        <Environment preset="studio" environmentIntensity={0.35} />

        <Suspense fallback={<SkeletonFallback />}>
          <HumanModel
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
          target={[0, 0.85, 0]}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 1.7}
          autoRotate
          autoRotateSpeed={0.4}
        />
      </Canvas>
    </div>
  );
}

function SkeletonFallback() {
  return (
    <mesh position={[0, 0.9, 0]}>
      <capsuleGeometry args={[0.18, 1.2, 8, 16]} />
      <meshStandardMaterial
        color="#e7f5ec"
        roughness={1}
        metalness={0}
        transparent
        opacity={0.45}
      />
    </mesh>
  );
}

// ─── Modelo humano (HuBMAP Visible Human, estático) ──────────────────────────
function HumanModel({
  sex,
  activeRegion,
  activeColor,
}: {
  sex: PatientSex;
  activeRegion: BodyRegion | null;
  activeColor: string;
}) {
  const { scene } = useGLTF(MODEL_PATHS[sex]);
  const groupRef = useRef<THREE.Group>(null);

  // 1) Clona + material PBR + vertex colors habilitado + AUTO-FIT
  //    (HuBMAP tem origem no centro do torso e escala em metros do dataset;
  //    isso calcula bbox e normaliza pra altura ~1.7 unidades com pés em Y=0).
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.55,
          metalness: 0.08,
          vertexColors: true,
        });
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });

    // Auto-fit: bbox → scale → reposition pés em Y=0
    const TARGET_HEIGHT = 1.7;
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const heightFactor =
      TARGET_HEIGHT / Math.max(0.001, size.y) * (sex === "female" ? 0.98 : 1.0);
    clone.scale.setScalar(heightFactor);
    // Recalcula bbox após scale
    box.setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    clone.position.set(-center.x, -box.min.y, -center.z);

    return clone;
  }, [scene, sex]);

  // 2) Vertex color highlight por posição Y do vertex (modelo é estático,
  //    sem skin weights). Pinta região da pele que corresponde à área.
  useEffect(() => {
    const activeColorObj = new THREE.Color(activeColor);
    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const geo = obj.geometry;
      const pos = geo.attributes.position;
      if (!pos) return;
      const vertexCount = pos.count;

      const bounds =
        activeRegion && activeRegion !== "body"
          ? REGION_BOUNDS[activeRegion as Exclude<BodyRegion, "body">]
          : null;

      const colors = new Float32Array(vertexCount * 3);
      const tmp = new THREE.Color();

      for (let v = 0; v < vertexCount; v++) {
        const y = pos.getY(v);
        const x = pos.getX(v);

        let t = 0;
        if (activeRegion === "body") {
          t = 0.55; // body all: tint mais suave
        } else if (bounds) {
          const inY = y >= bounds.yMin && y <= bounds.yMax;
          let inX = true;
          if (bounds.xMinAbs !== undefined) inX = Math.abs(x) > bounds.xMinAbs;
          if (bounds.xMaxAbs !== undefined)
            inX = inX && Math.abs(x) < bounds.xMaxAbs;
          if (inY && inX) {
            // Fade suave nas bordas verticais
            const dY = Math.min(y - bounds.yMin, bounds.yMax - y);
            const yFade = Math.min(1, dY / 0.04);
            t = yFade;
          }
        }

        tmp.copy(BASE_COLOR).lerp(activeColorObj, t);
        colors[v * 3] = tmp.r;
        colors[v * 3 + 1] = tmp.g;
        colors[v * 3 + 2] = tmp.b;
      }

      const colorAttr = new THREE.BufferAttribute(colors, 3);
      geo.setAttribute("color", colorAttr);
      colorAttr.needsUpdate = true;
    });
  }, [cloned, activeRegion, activeColor]);

  // 3) Fade-in + ghost mode (corpo semitransparente quando órgão ativo)
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
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload(MODEL_PATHS.male);
useGLTF.preload(MODEL_PATHS.female);
