"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Environment,
  ContactShadows,
  Bounds,
} from "@react-three/drei";
import * as THREE from "three";
import type { PatientSex } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const PORCELAIN_COLOR = "#ECE5DA";

const MODEL_PATHS: Record<PatientSex, string> = {
  male: "/avatars/mannequin/male.glb",
  female: "/avatars/mannequin/female.glb",
};

useGLTF.preload(MODEL_PATHS.male);
useGLTF.preload(MODEL_PATHS.female);

// ─── Mapping órgão → região 3D no corpo (coords em espaço modelo) ──────────
//
// `center`: ponto central do órgão no body (X,Y,Z em metros, Y=0 nos pés)
// `radius`: extent do efeito (raios elipsóide nos 3 eixos)
// `cameraFocus`: posição da câmera quando esse órgão for focado
//
// Coords ligeiramente diferentes pra male vs female porque os modelos
// têm proporções diferentes (Stichless tem ombros mais largos, Female
// Base Mesh tem cintura mais estreita).

interface OrganZone {
  center: [number, number, number];
  radius: [number, number, number];
  cameraOffset: [number, number, number]; // offset relativo ao center
}

const ORGAN_ZONES: Record<PatientSex, Record<string, OrganZone>> = {
  male: {
    brain: {
      center: [0, 1.66, 0],
      radius: [0.13, 0.11, 0.12],
      cameraOffset: [0, 0.05, 0.7],
    },
    heart: {
      center: [-0.06, 1.36, 0.06],
      radius: [0.11, 0.10, 0.10],
      cameraOffset: [0, 0.04, 0.7],
    },
    lungs: {
      center: [0, 1.38, 0.04],
      radius: [0.18, 0.13, 0.12],
      cameraOffset: [0, 0.04, 0.75],
    },
    liver: {
      center: [0.09, 1.18, 0.06],
      radius: [0.12, 0.10, 0.10],
      cameraOffset: [0.1, 0.02, 0.7],
    },
    pancreas: {
      center: [-0.03, 1.09, 0.04],
      radius: [0.10, 0.06, 0.08],
      cameraOffset: [0, 0.02, 0.7],
    },
    kidneys: {
      center: [0, 1.05, -0.07],
      radius: [0.17, 0.07, 0.07],
      cameraOffset: [0, 0.04, -0.75], // câmera nas costas
    },
    intestine: {
      center: [0, 0.96, 0.05],
      radius: [0.13, 0.11, 0.10],
      cameraOffset: [0, 0.02, 0.7],
    },
  },
  female: {
    // Female: ombros mais estreitos, cintura mais marcada
    brain: {
      center: [0, 1.69, 0],
      radius: [0.11, 0.10, 0.11],
      cameraOffset: [0, 0.05, 0.65],
    },
    heart: {
      center: [-0.05, 1.39, 0.06],
      radius: [0.09, 0.10, 0.09],
      cameraOffset: [0, 0.04, 0.65],
    },
    lungs: {
      center: [0, 1.41, 0.04],
      radius: [0.15, 0.12, 0.10],
      cameraOffset: [0, 0.04, 0.7],
    },
    liver: {
      center: [0.07, 1.22, 0.05],
      radius: [0.10, 0.09, 0.09],
      cameraOffset: [0.08, 0.02, 0.65],
    },
    pancreas: {
      center: [-0.02, 1.13, 0.04],
      radius: [0.09, 0.06, 0.08],
      cameraOffset: [0, 0.02, 0.65],
    },
    kidneys: {
      center: [0, 1.08, -0.06],
      radius: [0.15, 0.07, 0.07],
      cameraOffset: [0, 0.04, -0.7],
    },
    intestine: {
      center: [0, 1.00, 0.05],
      radius: [0.12, 0.11, 0.09],
      cameraOffset: [0, 0.02, 0.65],
    },
  },
};

// ─── Vertex color painting ──────────────────────────────────────────────────
//
// Pra colorir REGIÃO do mesh (não esfera flutuante):
//   1. Itera vértices do body mesh
//   2. Pra cada vértice, calcula distância ao centro do órgão (elipsoide)
//   3. Vertice DENTRO da zona → cor do órgão; FORA → porcelana
//   4. Falloff suave (smoothstep) cria gradiente nas bordas
//
// Material precisa `vertexColors: true` + `color: white` pra não tingir
// por cima do vertex color.

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function paintOrganZone(
  mesh: THREE.Mesh,
  zone: OrganZone | null,
  organColor: THREE.Color,
  baseColor: THREE.Color,
) {
  const geo = mesh.geometry as THREE.BufferGeometry;
  const pos = geo.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    let weight = 0;
    if (zone) {
      // Distância normalizada num elipsoide (Mahalanobis)
      const dx = (x - zone.center[0]) / zone.radius[0];
      const dy = (y - zone.center[1]) / zone.radius[1];
      const dz = (z - zone.center[2]) / zone.radius[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // dist=0 → centro (weight=1), dist=1 → borda da zona (weight=0)
      // smoothstep dá falloff suave no edge
      weight = 1 - smoothstep(0.65, 1.05, dist);
    }

    // Lerp entre base e organ
    const r = baseColor.r * (1 - weight) + organColor.r * weight;
    const g = baseColor.g * (1 - weight) + organColor.g * weight;
    const b = baseColor.b * (1 - weight) + organColor.b * weight;
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

// ─── Model component ───────────────────────────────────────────────────────

interface MannequinModelProps {
  sex: PatientSex;
  activeOrgan?: string | null;
  activeColor?: string;
}

function MannequinModel({ sex, activeOrgan, activeColor }: MannequinModelProps) {
  const { scene } = useGLTF(MODEL_PATHS[sex]);
  const meshRef = useRef<THREE.Mesh | null>(null);

  const baseColor = useMemo(() => new THREE.Color(PORCELAIN_COLOR), []);

  // Clone scene + setup material com vertexColors
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    const material = new THREE.MeshPhysicalMaterial({
      // Color white pra vertex color funcionar sem tinge
      color: 0xffffff,
      vertexColors: true,
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
        meshRef.current = obj;
      }
    });
    return clone;
  }, [scene]);

  // Re-pinta vertices quando activeOrgan ou activeColor muda
  useEffect(() => {
    if (!meshRef.current) return;
    const zone =
      activeOrgan && ORGAN_ZONES[sex]?.[activeOrgan]
        ? ORGAN_ZONES[sex][activeOrgan]
        : null;
    const organColor = new THREE.Color(activeColor ?? "#0E7B45");
    paintOrganZone(meshRef.current, zone, organColor, baseColor);

    // Marca needsUpdate
    const geo = meshRef.current.geometry;
    if (geo.attributes.color) {
      (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
  }, [activeOrgan, activeColor, sex, baseColor]);

  return <primitive object={clonedScene} />;
}

// ─── Camera controller — anima câmera pra focar órgão ──────────────────────
//
// Quando activeOrgan muda, interpola camera.position + controls.target
// pra novos valores via useFrame. Lerp factor 0.08 = transition ~1s.

const DEFAULT_CAM_POSITION: [number, number, number] = [0, 0, 2.6];
const DEFAULT_CAM_TARGET: [number, number, number] = [0, 0, 0];

interface CameraFocusProps {
  sex: PatientSex;
  activeOrgan?: string | null;
  groupOffsetY: number; // o group offset Y aplicado ao model
}

function CameraFocus({ sex, activeOrgan, groupOffsetY }: CameraFocusProps) {
  const { camera, controls } = useThree();
  const targetPosRef = useRef(new THREE.Vector3(...DEFAULT_CAM_POSITION));
  const targetLookRef = useRef(new THREE.Vector3(...DEFAULT_CAM_TARGET));

  useEffect(() => {
    if (!activeOrgan || activeOrgan === "all" || !ORGAN_ZONES[sex]?.[activeOrgan]) {
      // Volta pra default (full body view)
      targetPosRef.current.set(...DEFAULT_CAM_POSITION);
      targetLookRef.current.set(...DEFAULT_CAM_TARGET);
      return;
    }
    const zone = ORGAN_ZONES[sex][activeOrgan];
    // Position relativa ao centro do órgão NO espaço do canvas
    // (após group offset Y=-0.88 do model)
    const lookAtWorld: [number, number, number] = [
      zone.center[0],
      zone.center[1] + groupOffsetY, // converte model space → world space
      zone.center[2],
    ];
    const camPosWorld: [number, number, number] = [
      lookAtWorld[0] + zone.cameraOffset[0],
      lookAtWorld[1] + zone.cameraOffset[1],
      lookAtWorld[2] + zone.cameraOffset[2],
    ];
    targetPosRef.current.set(...camPosWorld);
    targetLookRef.current.set(...lookAtWorld);
  }, [activeOrgan, sex, groupOffsetY]);

  useFrame(() => {
    const LERP = 0.08;
    camera.position.lerp(targetPosRef.current, LERP);

    // Lerp controls target
    if (
      controls &&
      "target" in controls &&
      controls.target instanceof THREE.Vector3
    ) {
      controls.target.lerp(targetLookRef.current, LERP);
      if ("update" in controls && typeof controls.update === "function") {
        controls.update();
      }
    } else {
      camera.lookAt(targetLookRef.current);
    }
  });

  return null;
}

// ─── Componente principal ───────────────────────────────────────────────────

interface BodyMannequinProps {
  sex: PatientSex;
  className?: string;
  /** ID do órgão ativo. Quando definido (e !=="all"), câmera foca + auto-rotate desliga. */
  activeOrgan?: string | null;
  activeColor?: string;
}

const GROUP_OFFSET_Y = -0.88; // centraliza model (height 1.77) em Y=0

export function BodyMannequin({
  sex,
  className,
  activeOrgan,
  activeColor = "#0E7B45",
}: BodyMannequinProps) {
  const hasFocus =
    !!activeOrgan && activeOrgan !== "all" && !!ORGAN_ZONES[sex]?.[activeOrgan];

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

          <Bounds fit clip={false} observe margin={1.02}>
            <group position={[0, GROUP_OFFSET_Y, 0]}>
              <MannequinModel
                sex={sex}
                activeOrgan={activeOrgan}
                activeColor={activeColor}
              />
            </group>
          </Bounds>

          <ContactShadows
            position={[0, -0.88, 0]}
            opacity={0.36}
            scale={2.5}
            blur={2.4}
            far={1}
            color="#7a8480"
          />

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={!hasFocus}
            autoRotateSpeed={0.7}
            minPolarAngle={Math.PI / 2.3}
            maxPolarAngle={Math.PI / 1.95}
            target={[0, 0, 0]}
            makeDefault
          />

          <CameraFocus
            sex={sex}
            activeOrgan={activeOrgan}
            groupOffsetY={GROUP_OFFSET_Y}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
