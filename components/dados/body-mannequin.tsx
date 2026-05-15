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

const PORCELAIN_COLOR = "#ECE5DA";

const MODEL_PATHS: Record<PatientSex, string> = {
  male: "/avatars/mannequin/male.glb",
  female: "/avatars/mannequin/female.glb",
};

useGLTF.preload(MODEL_PATHS.male);
useGLTF.preload(MODEL_PATHS.female);

// ─── Mapping órgão → posição XYZ + scale ─────────────────────────────────────
//
// Coords no espaço do modelo CENTRADO (drei <Center> coloca origin no
// meio da bbox). Modelo Stichless: bbox Z=0..1.77, então após Center
// o modelo vai de Y=-0.885 (pés) a Y=+0.885 (cabeça).
//
// Posições anatômicas aproximadas (centro de massa do órgão):

interface OrganPos {
  position: [number, number, number];
  scale: [number, number, number];
}

const ORGAN_POSITIONS: Record<string, OrganPos> = {
  brain:     { position: [0,     0.75, 0],     scale: [0.075, 0.085, 0.085] },
  lungs:     { position: [0,     0.40, 0.02],  scale: [0.14,  0.13,  0.10]  }, // 2 pulmões = mais largo
  heart:     { position: [-0.04, 0.40, 0.06],  scale: [0.06,  0.07,  0.06]  }, // ligeiramente esquerda anatômica
  liver:     { position: [0.07,  0.22, 0.06],  scale: [0.10,  0.07,  0.08]  }, // direita anatômica
  pancreas:  { position: [-0.02, 0.14, 0.04],  scale: [0.07,  0.04,  0.06]  },
  kidneys:   { position: [0,     0.10, -0.06], scale: [0.13,  0.05,  0.05]  }, // 2 rins, atrás
  intestine: { position: [0,     0.00, 0.06],  scale: [0.10,  0.09,  0.08]  },
};

// ─── OrganHighlight ─────────────────────────────────────────────────────────
//
// Esfera/elipsoide colorida posicionada sobre o órgão. Pulsa de leve pra
// chamar atenção. Material emissive + transparent pra dar sensação de
// "iluminação interna".

function OrganHighlight({
  organId,
  color,
}: {
  organId: string;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const pos = ORGAN_POSITIONS[organId];
  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  // useFrame multiplica o base scale por pulse (não sobrescreve).
  // Bug fix de versão anterior: setScalar() descartava o base scale
  // e fazia esfera virar raio 1m (cobria todo o canvas).
  useFrame(({ clock }) => {
    if (!pos) return;
    const t = clock.elapsedTime;
    const pulse = 1 + 0.08 * Math.sin(t * 2);
    if (meshRef.current) {
      meshRef.current.scale.set(
        pos.scale[0] * pulse,
        pos.scale[1] * pulse,
        pos.scale[2] * pulse,
      );
    }
    const glowMul = 1.5 + 0.15 * Math.sin(t * 2);
    if (glowRef.current) {
      glowRef.current.scale.set(
        pos.scale[0] * glowMul,
        pos.scale[1] * glowMul,
        pos.scale[2] * glowMul,
      );
    }
  });

  if (!pos) return null;

  return (
    <group position={pos.position}>
      {/* Inner solid — represents the organ */}
      <mesh ref={meshRef} renderOrder={2}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial
          color={colorObj}
          emissive={colorObj}
          emissiveIntensity={0.7}
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </mesh>

      {/* Outer glow halo */}
      <mesh ref={glowRef} renderOrder={1}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshBasicMaterial
          color={colorObj}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─── Model component ───────────────────────────────────────────────────────

interface MannequinModelProps {
  sex: PatientSex;
}

function MannequinModel({ sex }: MannequinModelProps) {
  const { scene } = useGLTF(MODEL_PATHS[sex]);

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

  return <primitive object={clonedScene} />;
}

// ─── Componente principal ───────────────────────────────────────────────────

interface BodyMannequinProps {
  sex: PatientSex;
  className?: string;
  autoRotate?: boolean;
  /** ID do órgão pra destacar — heart, brain, lungs, liver, kidneys,
   *  intestine, pancreas. Quando "all" ou ausente, não destaca nada. */
  activeOrgan?: string | null;
  /** Cor do destaque do órgão (vem do grade da categoria no dados-view). */
  activeColor?: string;
}

export function BodyMannequin({
  sex,
  className,
  autoRotate = true,
  activeOrgan,
  activeColor = "#0E7B45",
}: BodyMannequinProps) {
  const showOrgan =
    activeOrgan && activeOrgan !== "all" && ORGAN_POSITIONS[activeOrgan];

  return (
    <div className={cn("aspect-[3/4] w-full", className)}>
      <Canvas
        camera={{ position: [0, 0, 2.6], fov: 32 }}
        shadows
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
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

          {/* Avatar MAIOR — margin 1.02 (apertado, com buffer mínimo
              pra auto-rotate não cortar). Modelo + organ highlight
              dentro do mesmo Bounds pra escalarem juntos. */}
          <Bounds fit clip={false} observe margin={1.02}>
            <Center>
              <MannequinModel sex={sex} />
              {showOrgan && (
                <OrganHighlight
                  organId={activeOrgan!}
                  color={activeColor}
                />
              )}
            </Center>
          </Bounds>

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
