"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, QrCode, Sparkles, X } from "lucide-react";

export interface QuickTableItem {
  tenantSlug: string;
  tenantName: string;
  tableNumber: number;
  qrToken: string;
}

export interface TableQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  quickTables: QuickTableItem[];
}

interface BarcodeDetectorLike {
  detect: (
    source: HTMLVideoElement
  ) => Promise<Array<{ rawValue?: string }>>;
}

function resolveQrDestination(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      if (url.pathname.includes("/mesa/")) {
        return url.pathname;
      }
    }
  } catch {
    // Continue with path/token parsing
  }

  if (trimmed.startsWith("/") && trimmed.includes("/mesa/")) {
    return trimmed;
  }

  // Direct token format: <slug>-mesa-<num>
  const match = /^([a-z0-9-]+)-mesa-\d+$/i.exec(trimmed);
  if (match) {
    return `/${match[1].toLowerCase()}/mesa/${trimmed.toLowerCase()}`;
  }

  return null;
}

export function TableQrScannerModal({
  isOpen,
  onClose,
  quickTables,
}: TableQrScannerModalProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let stream: MediaStream | null = null;
    let animationFrameId: number | null = null;
    let isCancelled = false;

    async function startScanner() {
      setCameraError(null);
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setCameraError(
          "Selecciona tu mesa abajo o ingresa el código de la mesa."
        );
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
        }

        const win = window as unknown as {
          BarcodeDetector?: new (opts: {
            formats: string[];
          }) => BarcodeDetectorLike;
        };

        if (win.BarcodeDetector) {
          const detector = new win.BarcodeDetector({ formats: ["qr_code"] });
          const scanLoop = async () => {
            if (isCancelled || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              const firstValue = codes[0]?.rawValue;
              if (firstValue) {
                const dest = resolveQrDestination(firstValue);
                if (dest) {
                  onClose();
                  router.push(dest);
                  return;
                }
              }
            } catch {
              // Continue scanning frame
            }
            animationFrameId = window.requestAnimationFrame(() => {
              void scanLoop();
            });
          };
          void scanLoop();
        }
      } catch {
        setCameraError(
          "Permite el acceso a la cámara para escanear el QR o elige tu mesa directamente abajo."
        );
      }
    }

    void startScanner();

    return () => {
      isCancelled = true;
      setCameraActive(false);
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, onClose, router]);

  if (!isOpen) return null;

  function handleManualSubmit() {
    const dest = resolveQrDestination(manualCode);
    if (dest) {
      onClose();
      router.push(dest);
    } else {
      setCameraError(
        "Código no reconocido. Ej: cowiings-mesa-1 o toca tu número de mesa abajo."
      );
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 pt-10 backdrop-blur-sm"
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-[#18181B] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5A93C] text-zinc-950">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="qr-scanner-modal-title"
                className="text-base font-black uppercase text-zinc-50"
              >
                Enlazar a Mesa con QR
              </h2>
              <p className="text-[11px] text-zinc-400">
                Pide desde tu mesa sin hacer filas ni esperar al mesero
              </p>
            </div>
          </div>

          <button
            id="close-qr-scanner-btn"
            type="button"
            onClick={onClose}
            aria-label="Cerrar escáner QR"
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="relative flex h-52 w-full items-center justify-center overflow-hidden rounded-2xl border border-[#E5A93C]/40 bg-zinc-950">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed border-[#E5A93C]/70" />
            {!cameraActive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 p-4 text-center">
                <Camera className="mb-2 h-8 w-8 text-[#E5A93C]" />
                <p className="text-xs font-semibold text-zinc-200">
                  {cameraError ?? "Iniciando cámara trasera para escanear QR..."}
                </p>
              </div>
            ) : null}
          </div>

          {quickTables.length > 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-[#141418] p-3.5">
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-[#E5A93C]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>¿Ya estás sentado? Selecciona tu mesa directamente:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {quickTables.map((t) => (
                  <button
                    key={t.qrToken}
                    id={`quick-link-table-${t.qrToken}`}
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(`/${t.tenantSlug}/mesa/${t.qrToken}`);
                    }}
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/80 bg-[#202024] p-2.5 text-center transition-all hover:border-[#E5A93C] hover:bg-[#E5A93C]/10"
                  >
                    <span className="text-[10px] font-semibold uppercase text-zinc-400">
                      {t.tenantName}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs font-black text-zinc-100">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Mesa #{t.tableNumber}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <input
              id="manual-qr-token-input"
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="O escribe el código: cowiings-mesa-1"
              className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500"
            />
            <button
              id="manual-qr-submit-btn"
              type="button"
              onClick={handleManualSubmit}
              className="rounded-xl bg-[#E5A93C] px-3.5 py-2 text-xs font-black text-zinc-950 hover:bg-[#CA8A04]"
            >
              Enlazar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
