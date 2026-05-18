"use client";

import { Component, type ReactNode } from "react";
import Image from "next/image";
import type { PatientSex } from "@/lib/mock-data";

/**
 * Error boundary específico do BodyMannequin (Three.js Canvas).
 *
 * Lucas (2026-05-17) reportou "Não conseguimos abrir esta tela agora"
 * no mobile em /dados e na "Rever apresentação". O culpado mais
 * provável é o Canvas WebGL falhando (browser sem WebGL, contexto
 * perdido, memória, etc.) — e como ele estava sem error boundary, o
 * erro subia até `app/(app)/error.tsx` e derrubava a página inteira.
 *
 * Agora: se o 3D crashar, cai num preview 2D estático (preview-male.webp
 * / preview-female.webp). User vê o boneco "congelado" mas a página
 * continua funcional.
 */
interface Props {
  children: ReactNode;
  sex: PatientSex;
}

interface State {
  hasError: boolean;
}

export class MannequinErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    // eslint-disable-next-line no-console
    console.warn(
      "[mannequin] 3D crashou — caindo no fallback 2D:",
      error.message,
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="relative flex aspect-[3/4] w-full items-center justify-center">
          <Image
            src={`/avatars/mannequin/preview-${this.props.sex}.webp`}
            alt="Manequim"
            fill
            className="object-contain opacity-95"
            sizes="(min-width: 1024px) 480px, 280px"
            priority={false}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
