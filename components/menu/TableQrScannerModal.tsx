"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import {
  Camera,
  CheckCircle2,
  ImageUp,
  QrCode,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";

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

const TRANSPARENT_POSTER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    let stream: MediaStream | null = null;
    let animationFrameId: number | null = null;
    let isCancelled = false;

    async function startScanner() {
      setCameraError(null);
      setCameraActive(false);

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setCameraError(
          "Usa el botón 'Tomar foto del QR' o selecciona tu mesa abajo."
        );
        return;
      }

      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "true");
          await video.play();
          setCameraActive(true);
        }

        const scanFrame = () => {
          if (isCancelled) return;
          const v = videoRef.current;
          const canvas = canvasRef.current;

          if (v && canvas && v.readyState === v.HAVE_ENOUGH_DATA) {
            const width = v.videoWidth || 320;
            const height = v.videoHeight || 240;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(v, 0, 0, width, height);
              const imageData = ctx.getImageData(0, 0, width, height);
              const decoded = jsQR(imageData.data, width, height, {
                inversionAttempts: "dontInvert",
              });

              if (decoded?.data) {
                const dest = resolveQrDestination(decoded.data);
                if (dest) {
                  onClose();
                  router.push(dest);
                  return;
                }
              }
            }
          }

          animationFrameId = window.requestAnimationFrame(scanFrame);
        };

        animationFrameId = window.requestAnimationFrame(scanFrame);
      } catch {
        setCameraError(
          "No se pudo abrir la cámara en vivo. Toca 'Tomar foto del QR' o elige tu mesa abajo."
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
  }, [isOpen, onClose, router, retryCount]);

  if (!isOpen) return null;

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const maxDim = 900;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.floor(img.width * scale));
        const h = Math.max(1, Math.floor(img.height * scale));
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const decoded = jsQR(imageData.data, w, h, {
          inversionAttempts: "attemptBoth",
        });

        if (decoded?.data) {
          const dest = resolveQrDestination(decoded.data);
          if (dest) {
            onClose();
            router.push(dest);
            return;
          }
        }
        setCameraError(
          "No se detectó un QR de mesa en la foto. Intenta acercarte más o selecciona tu mesa abajo."
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E11D48] text-white shadow-sm shadow-[#E11D48]/30">
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
          <div className="relative flex h-52 w-full items-center justify-center overflow-hidden rounded-2xl border border-[#E11D48]/40 bg-zinc-950">
            <video
              ref={videoRef}
              poster={TRANSPARENT_POSTER}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed border-[#E11D48]/80" />
            {!cameraActive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-4 text-center">
                <Camera className="mb-2 h-8 w-8 text-[#E11D48]" />
                <p className="text-xs font-semibold text-zinc-200">
                  {cameraError ??
                    "Iniciando cámara trasera para escanear QR..."}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <button
                    id="retry-camera-qr-btn"
                    type="button"
                    onClick={() => setRetryCount((c) => c + 1)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-[11px] font-bold text-zinc-100 hover:border-[#E11D48]"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-[#E11D48]" />
                    <span>Reintentar cámara</span>
                  </button>
                  <button
                    id="capture-photo-qr-btn"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#E11D48] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#BE123C]"
                  >
                    <ImageUp className="h-3.5 w-3.5" />
                    <span>Tomar foto del QR</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />

          {cameraActive ? (
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-[#141418] px-3 py-2">
              <span className="text-[11px] text-zinc-400">
                Apunta al código QR de la mesa
              </span>
              <button
                id="fallback-photo-qr-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FB7185] hover:underline"
              >
                <ImageUp className="h-3.5 w-3.5" />
                <span>O escanear con foto</span>
              </button>
            </div>
          ) : null}

          {quickTables.length > 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-[#141418] p-3.5">
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-[#FB7185]">
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
                    className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/80 bg-[#202024] p-2.5 text-center transition-all hover:border-[#E11D48] hover:bg-[#E11D48]/10"
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
              className="rounded-xl bg-[#E11D48] px-3.5 py-2 text-xs font-black text-white hover:bg-[#BE123C]"
            >
              Enlazar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
