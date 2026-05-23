"use client";

import { useEffect, useRef, useState } from "react";
import { X, Camera, AlertCircle, Loader2, Zap, ZapOff } from "lucide-react";

/**
 * Lucas (2026-05-23): "ao adicionar uma refeição via codigo de barras,
 * tem que ser possível scannear e não precisar escrever numero por
 * numero do código de barras"
 *
 * Scanner em fullscreen overlay usando a Web API nativa
 * `BarcodeDetector`. Suportada em:
 *   - Chrome / Edge / Opera (desktop + Android) — desde 2020
 *   - Samsung Internet, Android WebView
 *   - Safari iOS 17.4+ / macOS 14.4+ (março 2024)
 *
 * Browsers sem suporte (Firefox, iOS Safari < 17.4) mostram mensagem
 * clara e o user volta pra digitar o código manualmente.
 *
 * Suporta EAN-13, EAN-8, UPC-A, UPC-E. Auto-fecha quando detecta um
 * código válido (8-14 dígitos).
 *
 * Permissões: usa getUserMedia({ video: { facingMode: "environment" }})
 * — a câmera traseira é a esperada em mobile. Em desktop, qualquer
 * câmera disponível.
 */

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

// Códigos que aceitamos (formato Open Food Facts)
const SUPPORTED_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

// Validação: EAN/UPC são 8 a 14 dígitos
function isValidBarcode(code: string): boolean {
  return /^\d{8,14}$/.test(code);
}

type Status = "init" | "unsupported" | "permission" | "scanning" | "error";

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<Status>("init");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    async function start() {
      // 1. Check BarcodeDetector support
      // @ts-expect-error - BarcodeDetector não está nos tipos padrão
      if (typeof window.BarcodeDetector !== "function") {
        setErrorMsg(
          "Seu navegador não suporta scanner de código de barras. Atualize o navegador (iOS 17.4+ / Chrome / Edge) ou digite o código manualmente.",
        );
        setStatus("unsupported");
        return;
      }

      setStatus("permission");
      setErrorMsg(null);

      try {
        // 2. Pede câmera traseira em mobile, qualquer câmera em desktop
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            // Resolução alta o suficiente pra detectar barcode pequeno
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Detecta torch support (Android Chrome geralmente expõe)
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && typeof videoTrack.getCapabilities === "function") {
          const capabilities = videoTrack.getCapabilities() as Record<
            string,
            unknown
          >;
          if (capabilities.torch) {
            setTorchSupported(true);
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {
            /* autoplay pode falhar em algum browser exótico, ignore */
          });
        }

        setStatus("scanning");

        // 3. Inicia detection loop
        // @ts-expect-error - BarcodeDetector não está nos tipos padrão
        const Detector = window.BarcodeDetector;
        const detector = new Detector({ formats: SUPPORTED_FORMATS });

        const tick = async () => {
          if (cancelled) return;
          if (!videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          try {
            const barcodes = await detector.detect(videoRef.current);
            for (const b of barcodes) {
              const code = ((b as { rawValue?: string }).rawValue ?? "").trim();
              if (isValidBarcode(code)) {
                handleDetected(code);
                return;
              }
            }
          } catch {
            /* detect pode falhar transientemente em alguns frames */
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error
            ? err.name === "NotAllowedError" ||
              err.name === "PermissionDeniedError"
              ? "Você precisa permitir acesso à câmera. Verifique as permissões do navegador."
              : err.name === "NotFoundError" ||
                  err.name === "DevicesNotFoundError"
                ? "Nenhuma câmera encontrada neste dispositivo."
                : err.message
            : "Erro ao acessar câmera.";
        setErrorMsg(msg);
        setStatus("error");
      }
    }

    function handleDetected(code: string) {
      cancelled = true;
      // Vibração feedback (se suportado)
      try {
        navigator.vibrate?.(80);
      } catch {
        /* noop */
      }
      onDetected(code);
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const newState = !torchOn;
      await track.applyConstraints({
        // @ts-expect-error - torch não está nos tipos padrão
        advanced: [{ torch: newState }],
      });
      setTorchOn(newState);
    } catch {
      /* alguns devices reportam torch mas falham ao ligar */
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 text-white">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4" />
          <h2 className="text-[14px] font-semibold">Escanear código</h2>
        </div>
        <div className="flex items-center gap-2">
          {torchSupported && status === "scanning" && (
            <button
              type="button"
              onClick={toggleTorch}
              aria-label={torchOn ? "Desligar lanterna" : "Ligar lanterna"}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              {torchOn ? (
                <Zap className="h-4 w-4 fill-amber-300 text-amber-300" />
              ) : (
                <ZapOff className="h-4 w-4" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar scanner"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Vídeo */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />

        {/* Frame de mira */}
        {status === "scanning" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative w-[80%] max-w-[400px]">
              <div className="aspect-[3/2] w-full">
                {/* Cantos da mira */}
                <div className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-brand-400" />
                <div className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-brand-400" />
                <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-brand-400" />
                <div className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-brand-400" />
                {/* Linha vermelha animada de scan */}
                <div className="absolute left-2 right-2 top-1/2 h-[2px] -translate-y-1/2 animate-pulse bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,.6)]" />
              </div>
            </div>
          </div>
        )}

        {/* Overlay escurecido fora da mira */}
        {status === "scanning" && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-black/35"
            style={{
              maskImage:
                "radial-gradient(ellipse 40% 25% at center, transparent 60%, black 100%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 40% 25% at center, transparent 60%, black 100%)",
            }}
          />
        )}

        {/* Loading state */}
        {(status === "init" || status === "permission") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white">
            <Loader2 className="h-6 w-6 animate-spin text-brand-300" />
            <p className="text-[13px]">
              {status === "init"
                ? "Iniciando..."
                : "Aguardando permissão da câmera..."}
            </p>
          </div>
        )}

        {/* Error state — both unsupported and runtime errors */}
        {(status === "error" || status === "unsupported") && errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center text-white">
            <AlertCircle className="h-8 w-8 text-rose-400" />
            <p className="max-w-md text-[14px] leading-relaxed font-medium">
              {errorMsg}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-zinc-900 transition hover:bg-zinc-100"
            >
              Voltar e digitar
            </button>
          </div>
        )}
      </div>

      {/* Footer dica */}
      {status === "scanning" && (
        <footer className="relative z-10 px-6 py-4 text-center text-white">
          <p className="text-[12.5px] text-white/80">
            Aponte a câmera para o código de barras do produto
          </p>
        </footer>
      )}
    </div>
  );
}
