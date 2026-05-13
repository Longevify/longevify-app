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
import { SkeletonUtils } from "three-stdlib";
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
  | "body"; // destacar tudo

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

// Mapping região → bones (sufixo do nome). Mixamo usa prefix "mixamorig:"
// mas alguns rigs vêm sem o prefix. Por isso casamos por endsWith.
const REGION_TO_BONE_SUFFIXES: Record<Exclude<BodyRegion, "body">, string[]> = {
  head: ["Head", "HeadTop_End"],
  neck: ["Neck"],
  chest: ["Spine1", "Spine2", "LeftShoulder", "RightShoulder"],
  "abdomen-upper": ["Spine", "Spine1"],
  "abdomen-mid": ["Spine"],
  "abdomen-low": ["Hips"],
  arms: [
    "LeftArm",
    "LeftForeArm",
    "LeftHand",
    "RightArm",
    "RightForeArm",
    "RightHand",
  ],
  legs: [
    "LeftUpLeg",
    "LeftLeg",
    "LeftFoot",
    "LeftToeBase",
    "RightUpLeg",
    "RightLeg",
    "RightFoot",
    "RightToeBase",
  ],
};

const MODEL_PATHS: Record<PatientSex, string> = {
  male: "/avatars/Xbot.glb",
  female: "/avatars/Michelle.glb",
};

const BASE_COLOR = new THREE.Color("#eef0f0"); // off-white porcelana
const ACTIVE_COLOR = new THREE.Color("#1f5d3f"); // brand-700

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
      <Canvas
        camera={{ position: [0, 0.85, 4.6], fov: 32 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        {/* 3-point lighting */}
        <directionalLight position={[2.5, 4.5, 3]} intensity={1.0} />
        <directionalLight position={[-2.5, 2.5, 2]} intensity={0.4} />
        <directionalLight position={[0, 1.5, -3]} intensity={0.6} />
        <ambientLight intensity={0.2} />

        <Environment preset="studio" environmentIntensity={0.35} />

        <Suspense fallback={<SkeletonFallback />}>
          <HumanModel sex={sex} activeRegion={activeRegion} />
          <ContactShadows
            position={[0, -0.02, 0]}
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
          target={[0, 0.85, 0]}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 1.7}
          autoRotate
          autoRotateSpeed={0.45}
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

// ─── Modelo humano ──────────────────────────────────────────────────────────
function HumanModel({
  sex,
  activeRegion,
}: {
  sex: PatientSex;
  activeRegion: BodyRegion | null;
}) {
  const { scene } = useGLTF(MODEL_PATHS[sex]);
  const groupRef = useRef<THREE.Group>(null);

  // 1) Clona com SkeletonUtils (preserva skinning) + aplica material PBR
  //    branco fosco + ativa vertex colors (necessário pra colorir mesh).
  const cloned = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.SkinnedMesh) {
        obj.material = new THREE.MeshStandardMaterial({
          color: 0xffffff, // multiplicado pelos vertex colors abaixo
          roughness: 0.75,
          metalness: 0.05,
          vertexColors: true,
        });
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
    return clone;
  }, [scene]);

  // 2) A-pose — Xbot/Michelle vêm em T-pose. Rotaciona ombros + braços pra
  //    trazer membros pra baixo num ângulo natural (≈20° do tronco).
  useEffect(() => {
    cloned.traverse((obj) => {
      if (!(obj as THREE.Bone).isBone) return;
      const name = obj.name;
      // Z negativo no ombro esquerdo = rotaciona pra baixo (em torno do eixo Z)
      if (name.endsWith("LeftShoulder")) {
        obj.rotation.z = -0.18;
      } else if (name.endsWith("LeftArm")) {
        obj.rotation.z = -0.95;
      } else if (name.endsWith("RightShoulder")) {
        obj.rotation.z = 0.18;
      } else if (name.endsWith("RightArm")) {
        obj.rotation.z = 0.95;
      }
    });
  }, [cloned]);

  // 3) Vertex color highlight — recalcula a cor de cada vertex baseado nos
  //    skin weights dos bones da região ativa. Sem shader custom, sem
  //    overlay sphere — pinta o mesh de verdade.
  useEffect(() => {
    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.SkinnedMesh)) return;
      const geo = obj.geometry;
      const skinIndex = geo.attributes.skinIndex;
      const skinWeight = geo.attributes.skinWeight;
      if (!skinIndex || !skinWeight) return;

      const vertexCount = skinIndex.count;

      // Lista de bone indices que pertencem à região ativa
      const targetBoneSet = new Set<number>();
      const allBoneSet = new Set<number>();
      if (activeRegion === "body") {
        // todos os bones
        for (let i = 0; i < obj.skeleton.bones.length; i++) {
          targetBoneSet.add(i);
          allBoneSet.add(i);
        }
      } else if (activeRegion) {
        const suffixes = REGION_TO_BONE_SUFFIXES[
          activeRegion as Exclude<BodyRegion, "body">
        ];
        for (let i = 0; i < obj.skeleton.bones.length; i++) {
          const boneName = obj.skeleton.bones[i].name;
          if (suffixes.some((s) => boneName.endsWith(s))) {
            targetBoneSet.add(i);
          }
        }
      }

      // Construir/atualizar atributo de cor por vertex
      const colors = new Float32Array(vertexCount * 3);
      const tmp = new THREE.Color();
      for (let v = 0; v < vertexCount; v++) {
        let weightInRegion = 0;
        for (let j = 0; j < 4; j++) {
          const boneIdx = skinIndex.getComponent(v, j);
          if (targetBoneSet.has(boneIdx)) {
            weightInRegion += skinWeight.getComponent(v, j);
          }
        }
        // weightInRegion ∈ [0, 1] — quanto desse vertex está "na" região
        const t = Math.min(1, weightInRegion);
        tmp.copy(BASE_COLOR).lerp(ACTIVE_COLOR, t);
        colors[v * 3] = tmp.r;
        colors[v * 3 + 1] = tmp.g;
        colors[v * 3 + 2] = tmp.b;
      }

      const colorAttr = new THREE.BufferAttribute(colors, 3);
      geo.setAttribute("color", colorAttr);
      colorAttr.needsUpdate = true;
    });
  }, [cloned, activeRegion]);

  // 4) Fade-in suave na entrada
  const opacityRef = useRef(0);
  useFrame((_, delta) => {
    opacityRef.current = Math.min(1, opacityRef.current + delta * 1.6);
    if (groupRef.current) {
      groupRef.current.traverse((obj) => {
        if (
          (obj instanceof THREE.Mesh || obj instanceof THREE.SkinnedMesh) &&
          obj.material instanceof THREE.Material
        ) {
          obj.material.opacity = opacityRef.current;
          obj.material.transparent = opacityRef.current < 1;
        }
      });
    }
  });

  const baseScale = 1.05;
  const scaleX = (sex === "female" ? 0.92 : 1.0) * baseScale;
  const scaleY = (sex === "female" ? 0.95 : 1.0) * baseScale;

  return (
    <group ref={groupRef}>
      <primitive
        object={cloned}
        position={[0, 0, 0]}
        scale={[scaleX, scaleY, scaleX]}
      />
    </group>
  );
}

useGLTF.preload(MODEL_PATHS.male);
useGLTF.preload(MODEL_PATHS.female);
