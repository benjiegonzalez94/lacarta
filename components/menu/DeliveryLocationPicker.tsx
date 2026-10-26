"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Crosshair,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
} from "lucide-react";
import { buildGoogleMapsPinUrl } from "@/lib/whatsapp";

export interface DeliveryLocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChangeCoordinates: (lat: number, lng: number) => void;
  onSuggestedAddress?: (address: string) => void;
}

// Default center in Ecuador (Guayaquil / Quito region fallback) when opening manual map
const DEFAULT_CENTER = { lat: -2.1894, lng: -79.8891 };

export function DeliveryLocationPicker({
  lat,
  lng,
  onChangeCoordinates,
  onSuggestedAddress,
}: DeliveryLocationPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [showManualMap, setShowManualMap] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const activeLat = lat ?? DEFAULT_CENTER.lat;
  const activeLng = lng ?? DEFAULT_CENTER.lng;
  const hasCoordinates = typeof lat === "number" && typeof lng === "number";

  async function reverseGeocode(latitude: number, longitude: number) {
    if (!onSuggestedAddress) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        { headers: { "Accept-Language": "es" } }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { display_name?: string };
      if (data.display_name) {
        const shortAddr = data.display_name
          .split(",")
          .slice(0, 3)
          .join(",")
          .trim();
        if (shortAddr) {
          onSuggestedAddress(shortAddr);
        }
      }
    } catch {
      // Ignore reverse geocoding network issues
    }
  }

  function handleDetectGps() {
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError(
        "Tu navegador no permite geolocalización automática. Usa el selector de mapa manual."
      );
      setShowManualMap(true);
      onChangeCoordinates(activeLat, activeLng);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLat = Number(position.coords.latitude.toFixed(6));
        const nextLng = Number(position.coords.longitude.toFixed(6));
        onChangeCoordinates(nextLat, nextLng);
        setShowManualMap(true);
        setIsLocating(false);
        void reverseGeocode(nextLat, nextLng);
      },
      () => {
        setIsLocating(false);
        setGeoError(
          "No pudimos leer el GPS automáticamente. Activa la ubicación de tu teléfono o ajusta el pin en el mapa."
        );
        setShowManualMap(true);
        if (!hasCoordinates) {
          onChangeCoordinates(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function nudgePin(deltaLat: number, deltaLng: number) {
    const nextLat = Number((activeLat + deltaLat).toFixed(6));
    const nextLng = Number((activeLng + deltaLng).toFixed(6));
    onChangeCoordinates(nextLat, nextLng);
  }

  const bbox = `${(activeLng - 0.004).toFixed(6)}%2C${(
    activeLat - 0.003
  ).toFixed(6)}%2C${(activeLng + 0.004).toFixed(6)}%2C${(
    activeLat + 0.003
  ).toFixed(6)}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${activeLat.toFixed(
    6
  )}%2C${activeLng.toFixed(6)}`;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#141418] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#E5A93C]" />
          <span className="text-xs font-bold text-zinc-100">
            Ubicación en Mapa para Cotizar Envío
          </span>
        </div>
        {hasCoordinates ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Ubicación lista
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-[11px] text-zinc-400">
        Comparte tu punto exacto para que el local cotice el envío a tu
        domicilio y te envíe el total real por WhatsApp.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          id="detect-gps-location-btn"
          type="button"
          onClick={handleDetectGps}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E5A93C] px-3 py-2.5 text-xs font-black text-zinc-950 transition-colors hover:bg-[#CA8A04] disabled:opacity-60"
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          <span>
            {isLocating ? "Detectando GPS..." : "Usar mi ubicación actual"}
          </span>
        </button>

        <button
          id="toggle-manual-map-btn"
          type="button"
          onClick={() => {
            if (!hasCoordinates) {
              onChangeCoordinates(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
            }
            setShowManualMap((v) => !v);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#202024] px-3 py-2.5 text-xs font-bold text-zinc-200 hover:border-[#E5A93C] hover:text-[#E5A93C]"
        >
          <Crosshair className="h-4 w-4 text-[#E5A93C]" />
          <span>{showManualMap ? "Ocultar mapa" : "Marcar / Ver en mapa"}</span>
        </button>
      </div>

      {geoError ? (
        <p className="mt-2 text-[11px] text-amber-300">{geoError}</p>
      ) : null}

      {showManualMap && hasCoordinates ? (
        <div className="mt-3 space-y-2.5">
          <div className="relative h-44 w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
            <iframe
              title="Mapa de ubicación de entrega"
              src={osmEmbedUrl}
              className="h-full w-full border-0"
              loading="lazy"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2">
            <span className="text-[11px] text-zinc-300">
              Ajustar pin:{" "}
              <strong className="font-mono text-[#E5A93C]">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => nudgePin(0.0008, 0)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-bold text-zinc-200 hover:border-[#E5A93C]"
              >
                ↑ Norte
              </button>
              <button
                type="button"
                onClick={() => nudgePin(-0.0008, 0)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-bold text-zinc-200 hover:border-[#E5A93C]"
              >
                ↓ Sur
              </button>
              <button
                type="button"
                onClick={() => nudgePin(0, -0.0008)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-bold text-zinc-200 hover:border-[#E5A93C]"
              >
                ← Oeste
              </button>
              <button
                type="button"
                onClick={() => nudgePin(0, 0.0008)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-bold text-zinc-200 hover:border-[#E5A93C]"
              >
                → Este
              </button>
            </div>
          </div>

          <a
            href={buildGoogleMapsPinUrl(lat, lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline"
          >
            <span>Ver punto exacto en Google Maps</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : null}
    </div>
  );
}
