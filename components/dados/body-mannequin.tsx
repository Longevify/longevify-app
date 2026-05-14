"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
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
// Material porcelana mate off-white — inspirado direto no avatar do app
// Superpower (manequim 3D estilo de loja). Sem detalhes anatômicos, sem
// face, sem textura — só forma orgânica em pose A natural.
//
// MeshPhysicalMaterial com sheen + clearcoat sutil = aparência de
// porcelana de verdade (não plástico, não gesso).

const PORCELAIN = "#ECE5DA";

// ─── Posições / Proporções (Vitruvian-style) ─────────────────────────────────
//
// Coordenadas Y em metros (modelo ~1.75m altura, Y=0 nos pés).
// Body landmarks aproximados de antropometria humana adulta:
//   - cabeça top: 1.75
//   - olhos: 1.65
//   - queixo: 1.58
//   - ombros: 1.45
//   - peito: 1.30
//   - umbigo: 1.05
//   - quadril: 0.95
//   - joelho: 0.50
//   - tornozelo: 0.10
//   - pé: 0.05

interface BodyMannequinMeshProps {
  sex: PatientSex;
}

/**
 * Mesh do manequim composto de cápsulas, esferas e cilindros mesclados.
 * Todos compartilham o mesmo material — as juntas ficam invisíveis no
 * render porque tudo é a mesma cor + mesma reflexão.
 *
 * Proporções masculino vs. feminino:
 *   - Male: ombros mais largos (0.50 raio), cintura+quadril mais estreitos
 *   - Female: ombros estreitos (0.42), quadril mais largo, peito sutil
 */
function MannequinMesh({ sex }: BodyMannequinMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const isFemale = sex === "female";

  // Auto-rotate suave (já tem OrbitControls autoRotate, esse é fallback)
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    // não rotaciona — OrbitControls cuida disso
  });

  // ─── Material compartilhado entre TODAS as partes ──────────────────────
  // Importante: usar o MESMO material instance pra evitar seams visuais
  // entre cápsulas/esferas.
  const material = (
    <meshPhysicalMaterial
      color={PORCELAIN}
      roughness={0.62}
      metalness={0}
      clearcoat={0.25}
      clearcoatRoughness={0.6}
      sheen={0.45}
      sheenColor={new THREE.Color("#ffffff")}
      sheenRoughness={0.85}
      envMapIntensity={0.7}
    />
  );

  // Proporções variáveis por sexo
  const shoulderWidth = isFemale ? 0.21 : 0.27; // half-width
  const chestRadius = isFemale ? 0.155 : 0.175;
  const waistRadius = isFemale ? 0.11 : 0.13;
  const hipRadius = isFemale ? 0.165 : 0.155;
  const armOffset = isFemale ? 0.27 : 0.32; // distância centro→braço

  return (
    <group ref={groupRef}>
      {/* ─── Cabeça ─── */}
      <mesh position={[0, 1.65, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.105, 48, 32]} />
        {material}
      </mesh>

      {/* Pescoço */}
      <mesh position={[0, 1.51, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.055, 0.07, 0.08, 32]} />
        {material}
      </mesh>

      {/* ─── Tórax (peito/parte superior) ─── */}
      {/* Capsule esticada lateralmente pra dar forma de tórax */}
      <mesh position={[0, 1.32, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[chestRadius, 0.22, 12, 32]} />
        {material}
      </mesh>

      {/* ─── Cintura ─── */}
      <mesh position={[0, 1.08, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[waistRadius, 0.12, 12, 32]} />
        {material}
      </mesh>

      {/* ─── Quadril ─── */}
      <mesh position={[0, 0.94, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[hipRadius, 0.1, 12, 32]} />
        {material}
      </mesh>

      {/* ─── Ombros (esferas grandes que cobrem a junção) ─── */}
      <mesh
        position={[-shoulderWidth, 1.42, 0]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.075, 32, 24]} />
        {material}
      </mesh>
      <mesh position={[shoulderWidth, 1.42, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.075, 32, 24]} />
        {material}
      </mesh>

      {/* ─── Braços superiores (esquerdo e direito) ─── */}
      {/* Inclinação ~6° pra ficar pose A natural */}
      <mesh
        position={[-armOffset, 1.21, 0]}
        rotation={[0, 0, 0.1]}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[0.045, 0.32, 8, 24]} />
        {material}
      </mesh>
      <mesh
        position={[armOffset, 1.21, 0]}
        rotation={[0, 0, -0.1]}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[0.045, 0.32, 8, 24]} />
        {material}
      </mesh>

      {/* Cotovelos (esferas pra ocultar junção) */}
      <mesh position={[-armOffset - 0.024, 1.0, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.045, 20, 16]} />
        {material}
      </mesh>
      <mesh position={[armOffset + 0.024, 1.0, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.045, 20, 16]} />
        {material}
      </mesh>

      {/* ─── Antebraços ─── */}
      <mesh
        position={[-armOffset - 0.024, 0.78, 0]}
        rotation={[0, 0, 0.06]}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[0.04, 0.28, 8, 24]} />
        {material}
      </mesh>
      <mesh
        position={[armOffset + 0.024, 0.78, 0]}
        rotation={[0, 0, -0.06]}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[0.04, 0.28, 8, 24]} />
        {material}
      </mesh>

      {/* ─── Mãos ─── */}
      <mesh
        position={[-armOffset - 0.04, 0.58, 0]}
        scale={[1, 1.4, 0.6]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.05, 24, 18]} />
        {material}
      </mesh>
      <mesh
        position={[armOffset + 0.04, 0.58, 0]}
        scale={[1, 1.4, 0.6]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.05, 24, 18]} />
        {material}
      </mesh>

      {/* ─── Coxas ─── */}
      <mesh position={[-0.08, 0.69, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.075, 0.34, 12, 24]} />
        {material}
      </mesh>
      <mesh position={[0.08, 0.69, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.075, 0.34, 12, 24]} />
        {material}
      </mesh>

      {/* Joelhos */}
      <mesh position={[-0.08, 0.46, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.073, 24, 18]} />
        {material}
      </mesh>
      <mesh position={[0.08, 0.46, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.073, 24, 18]} />
        {material}
      </mesh>

      {/* ─── Canelas ─── */}
      <mesh position={[-0.08, 0.24, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.06, 0.32, 12, 24]} />
        {material}
      </mesh>
      <mesh position={[0.08, 0.24, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.06, 0.32, 12, 24]} />
        {material}
      </mesh>

      {/* ─── Pés (achatados, ligeiramente alongados pra frente) ─── */}
      <mesh
        position={[-0.08, 0.04, 0.04]}
        scale={[1, 0.6, 1.8]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.062, 24, 18]} />
        {material}
      </mesh>
      <mesh
        position={[0.08, 0.04, 0.04]}
        scale={[1, 0.6, 1.8]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.062, 24, 18]} />
        {material}
      </mesh>
    </group>
  );
}

// ─── Loading skeleton (mostra enquanto Three.js carrega) ─────────────────────

function LoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-[11px] text-zinc-300">Carregando…</div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

interface BodyMannequinProps {
  sex: PatientSex;
  className?: string;
  /** Habilita rotação automática lenta. Default true. */
  autoRotate?: boolean;
}

/**
 * Avatar manequim 3D feito do zero (sem GLB importado, sem PNG/WebP) —
 * geometria composta de cápsulas, esferas e cilindros com material
 * porcelana branco fosco. Lighting estúdio + auto-rotação opcional.
 *
 * Substitui a silhueta SVG e o viewer 360° de frames. Estilo direto do
 * app Superpower.
 */
export function BodyMannequin({
  sex,
  className,
  autoRotate = true,
}: BodyMannequinProps) {
  return (
    <div className={cn("aspect-[2/3] w-full", className)}>
      <Canvas
        camera={{ position: [0, 0.9, 2.4], fov: 32 }}
        shadows
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: false,
        }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          {/* Lighting estúdio */}
          <hemisphereLight
            args={["#fff5e8", "#e0e7eb", 0.45]}
            position={[0, 1, 0]}
          />
          <directionalLight
            position={[2, 4, 3]}
            intensity={1.3}
            color="#fff8ee"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-1.5}
            shadow-camera-right={1.5}
            shadow-camera-top={2}
            shadow-camera-bottom={-0.5}
          />
          {/* Rim light de trás pra dar contorno */}
          <directionalLight
            position={[-3, 2, -2]}
            intensity={0.35}
            color="#cfe1eb"
          />
          {/* Fill light frontal sutil */}
          <pointLight position={[0, 1.5, 3]} intensity={0.3} color="#fff" />

          {/* Environment HDRI pra reflexos sutis */}
          <Environment preset="studio" />

          {/* Manequim */}
          <group position={[0, -0.85, 0]}>
            <MannequinMesh sex={sex} />
          </group>

          {/* Sombra de contato no chão */}
          <ContactShadows
            position={[0, -0.85, 0]}
            opacity={0.28}
            scale={2.2}
            blur={2.6}
            far={1}
            color="#9aa39d"
          />

          {/* Controle de câmera — auto-rotate horizontal */}
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={autoRotate}
            autoRotateSpeed={0.8}
            minPolarAngle={Math.PI / 2.4}
            maxPolarAngle={Math.PI / 1.9}
            target={[0, 0, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Re-export pra LoadingFallback ser usado em dynamic import wrapper
export { LoadingFallback };
