"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// ─── Tipos ───────────────────────────────────────────────────────────────────
export type OrganRegion =
  | "heart"
  | "brain"
  | "liver"
  | "kidneys"
  | "lungs"
  | "intestine"
  | "pancreas";

const ORGAN_SET = new Set<string>([
  "heart",
  "brain",
  "liver",
  "kidneys",
  "lungs",
  "intestine",
  "pancreas",
]);

/** Type guard: true se `r` é uma das 7 regiões de órgão individuais. */
export function isOrganRegion(r: unknown): r is OrganRegion {
  return typeof r === "string" && ORGAN_SET.has(r);
}

// ─── Mapeamento órgão → GLB(s) ──────────────────────────────────────────────
// Todos os paths relativos a /public — servidos em /anatomy/*
const ORGAN_GLBS: Record<OrganRegion, string[]> = {
  heart:     ["/anatomy/VH_F_Heart.glb"],
  brain:     ["/anatomy/Allen_F_Brain.glb"],
  liver:     ["/anatomy/VH_F_Liver.glb"],
  kidneys:   ["/anatomy/VH_F_Kidney_L.glb", "/anatomy/VH_F_Kidney_R.glb"],
  lungs:     ["/anatomy/VH_F_Lung.glb"],
  intestine: ["/anatomy/VH_F_Small_Intestine.glb"],
  pancreas:  ["/anatomy/VH_F_Pancreas.glb"],
};

// ─── Posições anatômicas (coords Xbot — escala 1 unit = 1 m, pés em Y=0) ───
// Calibrado pra órgãos dentro do corpo, não na superfície da pele.
const ORGAN_POSITIONS: Record<OrganRegion, [number, number, number]> = {
  heart:     [0.05,  1.42,  0.08],
  brain:     [0,     1.71,  0.02],
  liver:     [-0.06, 1.22,  0.07],
  kidneys:   [0,     1.05, -0.06],
  lungs:     [0,     1.45,  0.04],
  intestine: [0,     0.97,  0.06],
  pancreas:  [0,     1.18,  0.04],
};

// ─── Scales anatômicos (GLBs HuBMAP estão em escala física mm ou cm)
// Coração real ~10cm = 0.10 unit em metros.
// Se organ fica gigante → dividir por 1000; invisível → multiplicar.
// Os valores abaixo calibrados pra GLBs HuBMAP (unidade original ~cm):
const ORGAN_SCALES: Record<OrganRegion, [number, number, number]> = {
  heart:     [0.0015, 0.0015, 0.0015],
  brain:     [0.001,  0.001,  0.001],
  liver:     [0.0015, 0.0015, 0.0015],
  kidneys:   [0.0015, 0.0015, 0.0015],
  lungs:     [0.0018, 0.0018, 0.0018],
  intestine: [0.0015, 0.0015, 0.0015],
  pancreas:  [0.0018, 0.0018, 0.0018],
};

// ─── Material verde úmido (sangue/órgão) ─────────────────────────────────────
// brand-500 com emissive pra brilho interno — simula órgão iluminado por dentro
const ORGAN_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#3f9a6b",          // brand-500
  emissive: "#3f9a6b",       // mesmo verde, brilho de dentro
  emissiveIntensity: 0.6,
  metalness: 0.1,
  roughness: 0.4,             // superfície úmida
  transparent: true,
  opacity: 0.92,
});

// ─── Componente interno de 1 GLB ─────────────────────────────────────────────
function OrganMesh({
  path,
  position,
  scale,
}: {
  path: string;
  position: [number, number, number];
  scale: [number, number, number];
}) {
  const { scene } = useGLTF(path);

  // Aplica material verde em TODOS os meshes do GLB
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = ORGAN_MATERIAL.clone();
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
    return clone;
  }, [scene]);

  return (
    <primitive
      object={cloned}
      position={position}
      scale={scale}
    />
  );
}

// ─── OrganOverlay — componente público ───────────────────────────────────────
// Renderiza 1 ou 2 instâncias (kidneys tem L + R).
// Envolto em Suspense pelo pai (HumanModel já tem <Suspense>).
export function OrganOverlay({ organ }: { organ: OrganRegion }) {
  const paths = ORGAN_GLBS[organ];
  const position = ORGAN_POSITIONS[organ];
  const scale = ORGAN_SCALES[organ];

  if (organ === "kidneys") {
    // Kidney_L fica no lado esquerdo do paciente (+x na tela = direito do espectador)
    // Kidney_R fica no lado direito do paciente (-x na tela)
    return (
      <>
        <OrganMesh
          path={paths[0]}
          position={[position[0] + 0.06, position[1], position[2]]}
          scale={scale}
        />
        <OrganMesh
          path={paths[1]}
          position={[position[0] - 0.06, position[1], position[2]]}
          scale={scale}
        />
      </>
    );
  }

  return (
    <OrganMesh
      path={paths[0]}
      position={position}
      scale={scale}
    />
  );
}

// ─── Preload — apenas os 7 menores (Brain 11MB + Lung 11MB ficam on-demand) ──
useGLTF.preload("/anatomy/VH_F_Heart.glb");
useGLTF.preload("/anatomy/VH_F_Liver.glb");
useGLTF.preload("/anatomy/VH_F_Kidney_L.glb");
useGLTF.preload("/anatomy/VH_F_Kidney_R.glb");
useGLTF.preload("/anatomy/VH_F_Pancreas.glb");
useGLTF.preload("/anatomy/VH_F_Small_Intestine.glb");
useGLTF.preload("/anatomy/VH_F_Spleen.glb");
// Brain (/anatomy/Allen_F_Brain.glb) e Lung (/anatomy/VH_F_Lung.glb) — on-demand only
