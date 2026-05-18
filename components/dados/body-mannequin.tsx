"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Environment,
  ContactShadows,
  Bounds,
} from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { PatientSex } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { MannequinErrorBoundary } from "@/components/dados/mannequin-error-boundary";

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
    // Cérebro: cobre topo da cabeça inteiro acima dos olhos (Lucas 2026-05)
    brain: {
      center: [0, 1.72, 0],
      radius: [0.14, 0.13, 0.14],
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
    // Female (height 1.80) — ombros estreitos, cintura marcada
    brain: {
      center: [0, 1.75, 0],
      radius: [0.13, 0.12, 0.13],
      cameraOffset: [0, 0.05, 0.7],
    },
    heart: {
      center: [-0.05, 1.41, 0.06],
      radius: [0.09, 0.10, 0.09],
      cameraOffset: [0, 0.04, 0.8], // câmera mais longe (era 0.65, zoom agressivo demais)
    },
    lungs: {
      center: [0, 1.43, 0.04],
      radius: [0.15, 0.12, 0.10],
      cameraOffset: [0, 0.04, 0.8],
    },
    liver: {
      center: [0.07, 1.24, 0.05],
      radius: [0.10, 0.09, 0.09],
      cameraOffset: [0.08, 0.02, 0.75],
    },
    pancreas: {
      center: [-0.02, 1.15, 0.04],
      radius: [0.09, 0.06, 0.08],
      cameraOffset: [0, 0.02, 0.75],
    },
    kidneys: {
      center: [0, 1.10, -0.06],
      radius: [0.15, 0.07, 0.07],
      cameraOffset: [0, 0.04, -0.75],
    },
    // Intestino: subido pra umbigo (Lucas: "está muito baixo")
    intestine: {
      center: [0, 1.10, 0.05],
      radius: [0.12, 0.11, 0.09],
      cameraOffset: [0, 0.02, 0.75],
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

/**
 * Pinta vertex colors do mesh em uma OU múltiplas zonas.
 *
 * - `zones=[]` → tudo porcelana (sem highlight)
 * - `zones=[{zone, color}]` → uma região colorida (modo categoria órgão)
 * - `zones=[...7 zones]` → modo "Todos" — todos órgãos coloridos
 *
 * Vertice pode estar em múltiplas zonas. Algoritmo: pega zone com maior
 * weight (= mais próxima do centro). Lerp entre porcelain e essa cor.
 */
function paintOrganZones(
  mesh: THREE.Mesh,
  zones: Array<{ zone: OrganZone; color: THREE.Color }>,
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

    let bestWeight = 0;
    let bestColor: THREE.Color | null = null;

    for (const { zone, color } of zones) {
      const dx = (x - zone.center[0]) / zone.radius[0];
      const dy = (y - zone.center[1]) / zone.radius[1];
      const dz = (z - zone.center[2]) / zone.radius[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const weight = 1 - smoothstep(0.65, 1.05, dist);
      if (weight > bestWeight) {
        bestWeight = weight;
        bestColor = color;
      }
    }

    if (bestColor && bestWeight > 0) {
      const r = baseColor.r * (1 - bestWeight) + bestColor.r * bestWeight;
      const g = baseColor.g * (1 - bestWeight) + bestColor.g * bestWeight;
      const b = baseColor.b * (1 - bestWeight) + bestColor.b * bestWeight;
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    } else {
      colors[i * 3] = baseColor.r;
      colors[i * 3 + 1] = baseColor.g;
      colors[i * 3 + 2] = baseColor.b;
    }
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/**
 * Cores por STATUS clínico (verde/amarelo/vermelho) — usadas no modo
 * "Todos" pra refletir saúde de cada órgão.
 *
 * Lucas (2026-05): "quando clicar em todos os dados, cada parte tem que
 * aparecer com as cores devidas (verde, amarelo ou vermelho)".
 */
export type OrganStatus = "optimal" | "normal" | "out";

const STATUS_COLORS: Record<OrganStatus, string> = {
  optimal: "#10B981", // emerald — saudável
  normal: "#F59E0B", // amber — atenção
  out: "#EF4444", // red — fora da faixa
};

// ─── Model component ───────────────────────────────────────────────────────

interface MannequinModelProps {
  sex: PatientSex;
  activeOrgan?: string | null;
  activeColor?: string;
  /** Mapa órgão → status clínico (optimal/normal/out). Usado no modo
   *  'all' pra colorir cada região com a cor do status real. */
  organStatuses?: Record<string, OrganStatus>;
}

function MannequinModel({
  sex,
  activeOrgan,
  activeColor,
  organStatuses,
}: MannequinModelProps) {
  const { scene } = useGLTF(MODEL_PATHS[sex]);
  const meshesRef = useRef<THREE.Mesh[]>([]);

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

    // IMPORTANTE: itera TODOS meshes (não só último). Female pode ter
    // vários submeshes; pintar só um deixa parte do corpo sem cor.
    const allMeshes: THREE.Mesh[] = [];
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = material;
        obj.castShadow = true;
        obj.receiveShadow = true;
        allMeshes.push(obj);
      }
    });
    meshesRef.current = allMeshes;
    return clone;
  }, [scene]);

  // Re-pinta vertices quando activeOrgan ou activeColor muda
  useEffect(() => {
    if (meshesRef.current.length === 0) return;

    // Determina zonas a pintar:
    // - 'all' → todas as 7 zonas com cores ALL_ORGAN_COLORS
    // - órgão específico → 1 zona com activeColor
    // - default → nenhuma zona (porcelana)
    const sexZones = ORGAN_ZONES[sex] ?? {};
    let zonesToPaint: Array<{ zone: OrganZone; color: THREE.Color }> = [];

    if (activeOrgan === "all") {
      // Cor de cada órgão = cor do status clínico real (verde/amarelo/vermelho).
      // Default optimal se status não vier (fallback)
      zonesToPaint = Object.entries(sexZones).map(([orgId, zone]) => {
        const status = organStatuses?.[orgId] ?? "optimal";
        return {
          zone,
          color: new THREE.Color(STATUS_COLORS[status]),
        };
      });
    } else if (activeOrgan && sexZones[activeOrgan]) {
      zonesToPaint = [
        {
          zone: sexZones[activeOrgan],
          color: new THREE.Color(activeColor ?? "#0E7B45"),
        },
      ];
    }

    for (const mesh of meshesRef.current) {
      paintOrganZones(mesh, zonesToPaint, baseColor);
      const geo = mesh.geometry;
      if (geo.attributes.color) {
        (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      }
    }
  }, [activeOrgan, activeColor, sex, baseColor, organStatuses]);

  return <primitive object={clonedScene} />;
}

// Câmera fixa em posição padrão — Lucas (2026-05): "Não precisa dar
// zoom que eu te pedi inicialmente". Removed CameraFocus + cameraOffset
// fields ainda existem em ORGAN_ZONES mas não são mais usados.

// ─── CameraCenteringRig — sempre centraliza câmera frente/costas ──────────
//
// Lucas (2026-05): "você tem que sempre centralizar (escolhendo frente do
// personagem ou costas do personagem)". Comportamento:
//
//   - activeOrgan = null | "all" → sem alvo, autoRotate continua girando
//   - activeOrgan = "kidneys"    → câmera vai PRAS COSTAS (azimuth π)
//   - qualquer outro órgão       → câmera vai PRA FRENTE (azimuth 0)
//
// Lerp factor 0.22 (era 0.08) — Lucas: "a mudança de ângulo tinha que
// ser mais rapida". Completa rotação de 180° em ~0.3-0.4s.
//
// Shortest-arc lerp pra ir pelo caminho curto. Ex: indo de π pra 0,
// pode girar +π OR -π (mesma distância) — fica na direção atual.
//
// Quando target está setado, autoRotate é desligado externamente (no
// OrbitControls). Quando não há target, autoRotate fica livre.

const BACK_AZIMUTH = Math.PI; // 180° = costas do boneco
const FRONT_AZIMUTH = 0; // 0 = frente do boneco
const LERP_FACTOR = 0.22; // velocidade da animação

/** Órgãos que ficam atrás do tronco e precisam da câmera nas costas. */
const BACK_ORGANS = new Set<string>(["kidneys"]);

function organTargetAzimuth(organ: string | null | undefined): number | null {
  if (!organ || organ === "all") return null;
  return BACK_ORGANS.has(organ) ? BACK_AZIMUTH : FRONT_AZIMUTH;
}

function CameraCenteringRig({
  activeOrgan,
  controlsRef,
}: {
  activeOrgan?: string | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  // null = sem alvo (libera autoRotate); número = lerp até esse azimuth
  const targetAzimuth = useRef<number | null>(null);

  useEffect(() => {
    targetAzimuth.current = organTargetAzimuth(activeOrgan);
  }, [activeOrgan]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls || targetAzimuth.current === null) return;

    const current = controls.getAzimuthalAngle();
    // Shortest-arc diff em [-π, π] pra não girar 358° quando faltam 2°
    const rawDiff = targetAzimuth.current - current;
    const diff = ((rawDiff + Math.PI) % (2 * Math.PI)) - Math.PI;

    if (Math.abs(diff) > 0.005) {
      controls.setAzimuthalAngle(current + diff * LERP_FACTOR);
      controls.update();
    } else {
      controls.setAzimuthalAngle(targetAzimuth.current);
      controls.update();
    }
  });

  return null;
}

// ─── Componente principal ───────────────────────────────────────────────────

interface BodyMannequinProps {
  sex: PatientSex;
  className?: string;
  /** ID do órgão a destacar. Câmera fica sempre em posição padrão
   *  (full body) — Lucas 2026-05: "Não precisa dar zoom". */
  activeOrgan?: string | null;
  activeColor?: string;
  /** Mapping órgão → status clínico. Usado no modo 'all' pra colorir
   *  cada região com cor do status (verde/amarelo/vermelho). */
  organStatuses?: Record<string, OrganStatus>;
}

const GROUP_OFFSET_Y = -0.88; // centraliza model (height 1.77) em Y=0

export function BodyMannequin(props: BodyMannequinProps) {
  // ErrorBoundary local — se WebGL/Three.js crashar no mobile (causa
  // mais provável dos "Algo deu errado" reportados por Lucas em
  // /dados e na "Rever apresentação"), cai num fallback 2D estático
  // em vez de derrubar a página inteira pelo error boundary do (app)
  // route group.
  return (
    <MannequinErrorBoundary sex={props.sex}>
      <BodyMannequinInner {...props} />
    </MannequinErrorBoundary>
  );
}

function BodyMannequinInner({
  sex,
  className,
  activeOrgan,
  activeColor = "#0E7B45",
  organStatuses,
}: BodyMannequinProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  // Quando há órgão específico selecionado (não null/"all"), centraliza
  // a câmera (frente ou costas, conforme órgão) e desliga autoRotate
  // pra view ficar estática. autoRotate volta quando vai pro modo
  // "all" ou sem órgão.
  const hasCameraTarget = organTargetAzimuth(activeOrgan) !== null;

  return (
    <div className={cn("aspect-[3/4] w-full", className)}>
      <Canvas
        camera={{ position: [0, 0, 3.0], fov: 32 }}
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
                organStatuses={organStatuses}
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

          {/* Auto-rotate só quando NÃO tem órgão específico selecionado
              (= modo "all" ou null). Pra órgãos específicos o
              CameraCenteringRig centraliza câmera frente/costas. */}
          <OrbitControls
            ref={controlsRef}
            enableZoom={false}
            enablePan={false}
            autoRotate={!hasCameraTarget}
            autoRotateSpeed={0.7}
            minPolarAngle={Math.PI / 2.3}
            maxPolarAngle={Math.PI / 1.95}
            target={[0, 0, 0]}
            makeDefault
          />

          <CameraCenteringRig
            activeOrgan={activeOrgan}
            controlsRef={controlsRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
