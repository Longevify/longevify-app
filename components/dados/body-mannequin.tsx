"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import type { PatientSex } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// ─── Cor & Material ──────────────────────────────────────────────────────────
//
// Material porcelana mate off-white inspirado direto no avatar do app
// Superpower. SUPER importante: TODOS os meshes compartilham o MESMO
// material instance pra que as juntas entre cápsulas/esferas fiquem
// invisíveis ao renderizador (mesma cor + mesma reflexão).

const PORCELAIN = "#ECE5DA";

// ─── Mesh do manequim ────────────────────────────────────────────────────────
//
// Estratégia anti-Lego:
//   1. UMA capsule grande pro torso (não 3 partes empilhadas)
//   2. Esferas de JUNTA grandes (overlap >50%) cobrindo cada interface:
//      ombro, cotovelo, quadril, joelho
//   3. Subdivisão alta (32+ segments) pra smoothing sem facetas
//   4. Pose A muito leve (5°) — quase reto
//   5. Material com sheen alto = aparência uniforme

interface BodyMannequinMeshProps {
  sex: PatientSex;
}

function MannequinMesh({ sex }: BodyMannequinMeshProps) {
  const isFemale = sex === "female";

  // Material compartilhado (instance único pra eliminar seams)
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: PORCELAIN,
        roughness: 0.55,
        metalness: 0,
        clearcoat: 0.3,
        clearcoatRoughness: 0.55,
        sheen: 0.5,
        sheenColor: new THREE.Color("#ffffff"),
        sheenRoughness: 0.8,
        envMapIntensity: 0.6,
      }),
    [],
  );

  // Proporções variáveis por sexo
  const shoulderWidth = isFemale ? 0.19 : 0.245;
  const torsoRadius = isFemale ? 0.155 : 0.175;
  const armOffset = isFemale ? 0.245 : 0.295;

  return (
    <group>
      {/* ─── Cabeça (oval, não esfera) ─── */}
      <mesh
        position={[0, 1.66, 0]}
        scale={[1, 1.18, 0.92]}
        material={material}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.092, 48, 32]} />
      </mesh>

      {/* Mandíbula sutil — sphere achatada à frente da cabeça pra dar dimensão */}
      <mesh
        position={[0, 1.61, 0.02]}
        scale={[0.85, 0.7, 0.85]}
        material={material}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.075, 32, 24]} />
      </mesh>

      {/* ─── Pescoço (tapered cylinder) ─── */}
      <mesh position={[0, 1.51, 0]} material={material} castShadow receiveShadow>
        <cylinderGeometry args={[0.052, 0.075, 0.1, 32]} />
      </mesh>

      {/* ─── Torso (UMA capsule alta cobrindo peito + cintura + pelvis) ─── */}
      <mesh position={[0, 1.18, 0]} material={material} castShadow receiveShadow>
        <capsuleGeometry args={[torsoRadius, 0.46, 16, 48]} />
      </mesh>

      {/* Detalhe sutil de peito — sphere achatada à frente do torso (só male) */}
      {!isFemale ? (
        <>
          <mesh
            position={[-0.08, 1.32, 0.085]}
            scale={[1, 0.7, 0.5]}
            material={material}
            castShadow
            receiveShadow
          >
            <sphereGeometry args={[0.078, 24, 16]} />
          </mesh>
          <mesh
            position={[0.08, 1.32, 0.085]}
            scale={[1, 0.7, 0.5]}
            material={material}
            castShadow
            receiveShadow
          >
            <sphereGeometry args={[0.078, 24, 16]} />
          </mesh>
        </>
      ) : null}

      {/* ─── Ombros (esferas GRANDES sobrepondo topo torso + braço) ─── */}
      <mesh
        position={[-shoulderWidth, 1.4, 0]}
        material={material}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.095, 32, 24]} />
      </mesh>
      <mesh
        position={[shoulderWidth, 1.4, 0]}
        material={material}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.095, 32, 24]} />
      </mesh>

      {/* ─── Braços superiores ─── */}
      {/* Inclinação 5° (pose A levíssima) */}
      <mesh
        position={[-armOffset, 1.18, 0]}
        rotation={[0, 0, 0.08]}
        material={material}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[0.052, 0.36, 12, 32]} />
      </mesh>
      <mesh
        position={[armOffset, 1.18, 0]}
        rotation={[0, 0, -0.08]}
        material={material}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[0.052, 0.36, 12, 32]} />
      </mesh>

      {/* ─── Cotovelos (grandes, sobrepondo braço sup + antebraço) ─── */}
      <mesh
        position={[-armOffset - 0.034, 0.94, 0]}
        material={material}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.058, 28, 20]} />
      </mesh>
      <mesh
        position={[armOffset + 0.034, 0.94, 0]}
        material={material}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.058, 28, 20]} />
      </mesh>

      {/* ─── Antebraços ─── */}
      <mesh
        position={[-armOffset - 0.034, 0.72, 0]}
        rotation={[0, 0, 0.06]}
        material={material}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[0.044, 0.3, 12, 32]} />
      </mesh>
      <mesh
        position={[armOffset + 0.034, 0.72, 0]}
        rotation={[0, 0, -0.06]}
        material={material}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[0.044, 0.3, 12, 32]} />
      </mesh>

      {/* ─── Punhos (esferas sobrepondo antebraço + mão) ─── */}
      <mesh
        position={[-armOffset - 0.05, 0.51, 0]}
        material={material}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.045, 24, 18]} />
      </mesh>
      <mesh
        position={[armOffset + 0.05, 0.51, 0]}
        material={material}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.045, 24, 18]} />
      </mesh>

      {/* ─── Mãos (esfera achatada, alongada pra baixo) ─── */}
      <mesh
        position={[-armOffset - 0.06, 0.43, 0]}
        scale={[0.85, 1.5, 0.55]}
        material={material}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.06, 28, 20]} />
      </mesh>
      <mesh
        position={[armOffset + 0.06, 0.43, 0]}
        scale={[0.85, 1.5, 0.55]}
        material={material}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.06, 28, 20]} />
      </mesh>

      {/* ─── Quadril (esfera GRANDE escondendo bottom torso + topo coxas) ─── */}
      <mesh position={[-0.08, 0.85, 0]} material={material} castShadow receiveShadow>
        <sphereGeometry args={[0.1, 32, 24]} />
      </mesh>
      <mesh position={[0.08, 0.85, 0]} material={material} castShadow receiveShadow>
        <sphereGeometry args={[0.1, 32, 24]} />
      </mesh>

      {/* ─── Coxas ─── */}
      <mesh position={[-0.085, 0.6, 0]} material={material} castShadow receiveShadow>
        <capsuleGeometry args={[0.082, 0.38, 12, 32]} />
      </mesh>
      <mesh position={[0.085, 0.6, 0]} material={material} castShadow receiveShadow>
        <capsuleGeometry args={[0.082, 0.38, 12, 32]} />
      </mesh>

      {/* ─── Joelhos (sobrepondo coxa + canela) ─── */}
      <mesh position={[-0.085, 0.36, 0]} material={material} castShadow receiveShadow>
        <sphereGeometry args={[0.085, 28, 20]} />
      </mesh>
      <mesh position={[0.085, 0.36, 0]} material={material} castShadow receiveShadow>
        <sphereGeometry args={[0.085, 28, 20]} />
      </mesh>

      {/* ─── Canelas ─── */}
      <mesh position={[-0.085, 0.16, 0]} material={material} castShadow receiveShadow>
        <capsuleGeometry args={[0.062, 0.32, 12, 32]} />
      </mesh>
      <mesh position={[0.085, 0.16, 0]} material={material} castShadow receiveShadow>
        <capsuleGeometry args={[0.062, 0.32, 12, 32]} />
      </mesh>

      {/* ─── Tornozelos (sobrepondo canela + pé) ─── */}
      <mesh
        position={[-0.085, -0.018, 0]}
        material={material}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.058, 24, 18]} />
      </mesh>
      <mesh
        position={[0.085, -0.018, 0]}
        material={material}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.058, 24, 18]} />
      </mesh>

      {/* ─── Pés (rounded box alongado pra frente) ─── */}
      <mesh
        position={[-0.085, -0.045, 0.05]}
        scale={[1, 0.4, 2.1]}
        material={material}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.062, 28, 20]} />
      </mesh>
      <mesh
        position={[0.085, -0.045, 0.05]}
        scale={[1, 0.4, 2.1]}
        material={material}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.062, 28, 20]} />
      </mesh>
    </group>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

interface BodyMannequinProps {
  sex: PatientSex;
  className?: string;
  autoRotate?: boolean;
}

/**
 * Avatar manequim 3D — geometria composta inteligente com material
 * porcelana branco fosco. Estilo Superpower app.
 */
export function BodyMannequin({
  sex,
  className,
  autoRotate = true,
}: BodyMannequinProps) {
  return (
    <div className={cn("aspect-[2/3] w-full", className)}>
      <Canvas
        camera={{ position: [0, 0.9, 2.6], fov: 28 }}
        shadows
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          {/* Lighting estúdio soft */}
          <hemisphereLight
            args={["#fff8ee", "#dde4e8", 0.55]}
            position={[0, 1, 0]}
          />
          <directionalLight
            position={[2.5, 4, 3]}
            intensity={1.2}
            color="#fff5e8"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-1.5}
            shadow-camera-right={1.5}
            shadow-camera-top={2}
            shadow-camera-bottom={-0.5}
            shadow-bias={-0.0005}
          />
          {/* Rim light traseira */}
          <directionalLight
            position={[-3, 2, -2.5]}
            intensity={0.4}
            color="#d6e4ed"
          />
          {/* Fill frontal */}
          <pointLight position={[0, 1.5, 3.5]} intensity={0.4} color="#fff" />

          <Environment preset="studio" environmentIntensity={0.6} />

          {/* Manequim */}
          <group position={[0, -0.85, 0]}>
            <MannequinMesh sex={sex} />
          </group>

          {/* Sombra de contato */}
          <ContactShadows
            position={[0, -0.85, 0]}
            opacity={0.32}
            scale={2.4}
            blur={2.8}
            far={1}
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
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
