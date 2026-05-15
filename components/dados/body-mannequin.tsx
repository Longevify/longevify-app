"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Environment,
  ContactShadows,
  Center,
  Bounds,
} from "@react-three/drei";
import * as THREE from "three";
import type { PatientSex } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// ─── Material porcelana ─────────────────────────────────────────────────────
//
// Material aplicado sobre o GLB do Stichless Mannequin (Sketchfab CC-BY).
// Pose ajustada via bpy (Blender Python lib) — braços baixados 75° em pose
// natural neutra. Fonte:
//   https://sketchfab.com/3d-models/stichless-mannequin-7de2b540a6014077b7a2206d8c25ca12
//
// Material porcelana fosca off-white com sheen sutil — mesmo tom usado nas
// imagens estáticas anteriores (#ECE5DA).

const PORCELAIN_COLOR = "#ECE5DA";

const MODEL_PATHS: Record<PatientSex, string> = {
  male: "/avatars/mannequin/male.glb",
  female: "/avatars/mannequin/female.glb",
};

// Preload pra ficar instantâneo no toggle ♂/♀
useGLTF.preload(MODEL_PATHS.male);
useGLTF.preload(MODEL_PATHS.female);

// ─── Mesh component ─────────────────────────────────────────────────────────

interface MannequinModelProps {
  sex: PatientSex;
}

function MannequinModel({ sex }: MannequinModelProps) {
  const { scene } = useGLTF(MODEL_PATHS[sex]);
  const groupRef = useRef<THREE.Group>(null);

  // Clone scene + aplica material porcelana em todos os meshes
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    const material = new THREE.MeshPhysicalMaterial({
      color: PORCELAIN_COLOR,
      roughness: 0.55,
      metalness: 0,
      clearcoat: 0.25,
      clearcoatRoughness: 0.55,
      sheen: 0.45,
      sheenColor: new THREE.Color("#ffffff"),
      sheenRoughness: 0.85,
      envMapIntensity: 0.7,
    });

    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = material;
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  return <primitive ref={groupRef} object={clonedScene} />;
}

// ─── Componente principal ───────────────────────────────────────────────────

interface BodyMannequinProps {
  sex: PatientSex;
  className?: string;
  /** Habilita rotação automática lenta. Default true. */
  autoRotate?: boolean;
}

export function BodyMannequin({
  sex,
  className,
  autoRotate = true,
}: BodyMannequinProps) {
  return (
    <div className={cn("aspect-[3/4] w-full", className)}>
      <Canvas
        camera={{ position: [0, 0, 2.6], fov: 32 }}
        shadows
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          {/* Lighting estúdio */}
          <hemisphereLight
            args={["#fff8ee", "#dde4e8", 0.55]}
            position={[0, 1, 0]}
          />
          <directionalLight
            position={[2.5, 4, 3]}
            intensity={1.3}
            color="#fff5e8"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-1.5}
            shadow-camera-right={1.5}
            shadow-camera-top={2.5}
            shadow-camera-bottom={-0.5}
            shadow-bias={-0.0005}
          />
          <directionalLight
            position={[-3, 2, -2.5]}
            intensity={0.4}
            color="#d6e4ed"
          />
          <pointLight position={[0, 1.5, 3.5]} intensity={0.4} color="#fff" />

          <Environment preset="studio" environmentIntensity={0.6} />

          {/* Bounds margin 1.0 = fit exato no canvas (avatar maximizado).
              Center cuida da centralização XYZ ao redor de origin.
              Valores < 1.0 cortam o modelo (zoom in demais).
              Valores > 1.0 deixam padding (avatar menor). */}
          <Bounds fit clip observe margin={1}>
            <Center>
              <MannequinModel sex={sex} />
            </Center>
          </Bounds>

          {/* ContactShadows posicionada nos pés (-1) do modelo centralizado */}
          <ContactShadows
            position={[0, -1, 0]}
            opacity={0.32}
            scale={3}
            blur={2.8}
            far={1.5}
            color="#7a8480"
          />

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={autoRotate}
            autoRotateSpeed={0.7}
            minPolarAngle={Math.PI / 2.3}
            maxPolarAngle={Math.PI / 1.95}
            target={[0, 0, 0]}
            makeDefault
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
