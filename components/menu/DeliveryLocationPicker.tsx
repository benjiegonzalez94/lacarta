"use client";

import { useEffect, useRef, useState } from "react";
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

interface LeafletLatLng {
  lat: number;
  lng: number;
}

interface LeafletMapInstance {
  setView: (center: [number, number], zoom: number) => LeafletMapInstance;
  on: (
    event: string,
    handler: (e: { latlng: LeafletLatLng }) => void
  ) => void;
  remove: () => void;
  invalidateSize: () => void;
}

interface LeafletMarkerInstance {
  setLatLng: (coords: [number, number]) => LeafletMarkerInstance;
  getLatLng: () => LeafletLatLng;
  on: (event: string, handler: () => void) => void;
  addTo: (map: LeafletMapInstance) => LeafletMarkerInstance;
}

interface LeafletGlobal {
  map: (
    element: HTMLElement,
    options: {
      center: [number, number];
      zoom: number;
      attributionControl: boolean;
      zoomControl: boolean;
    }
  ) => LeafletMapInstance;
  tileLayer: (
    urlTemplate: string,
    options: { maxZoom: number }
  ) => { addTo: (map: LeafletMapInstance) => void };
  divIcon: (options: {
    className: string;
    html: string;
    iconSize: [number, number];
    iconAnchor: [number, number];
  }) => unknown;
  marker: (
    coords: [number, number],
    options: { draggable: boolean; icon: unknown }
  ) => LeafletMarkerInstance;
}

// Default center in Ecuador when opening manual map without prior GPS fix
const DEFAULT_CENTER = { lat: -2.1894, lng: -79.8891 };

function loadLeafletAssets(): Promise<LeafletGlobal | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const win = window as unknown as { L?: LeafletGlobal };
  if (win.L) return Promise.resolve(win.L);

  return new Promise((resolve) => {
    if (!document.getElementById("leaflet-css-cdn")) {
      const link = document.createElement("link");
      link.id = "leaflet-css-cdn";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById(
      "leaflet-js-cdn"
    ) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(win.L ?? null));
      existingScript.addEventListener("error", () => resolve(null));
      return;
    }

    const script = document.createElement("script");
    script.id = "leaflet-js-cdn";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve(win.L ?? null);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
}

export function DeliveryLocationPicker({
  lat,
  lng,
  onChangeCoordinates,
  onSuggestedAddress,
}: DeliveryLocationPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [showManualMap, setShowManualMap] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMapInstance | null>(null);
  const markerInstanceRef = useRef<LeafletMarkerInstance | null>(null);

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

  // Initialize interactive Leaflet map when manual map view is active
  useEffect(() => {
    if (!showManualMap || !mapContainerRef.current) return;

    let isCancelled = false;

    async function initMap() {
      const L = await loadLeafletAssets();
      if (isCancelled || !L || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const startLat = lat ?? DEFAULT_CENTER.lat;
        const startLng = lng ?? DEFAULT_CENTER.lng;

        const map = L.map(mapContainerRef.current, {
          center: [startLat, startLng],
          zoom: 16,
          attributionControl: false,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        const pinIcon = L.divIcon({
          className: "lacarta-custom-pin",
          html: `<div style="width:32px;height:32px;border-radius:9999px;background:#E11D48;border:3px solid #FFFFFF;box-shadow:0 4px 14px rgba(225,29,72,0.65);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:9999px;background:#FFFFFF;"></div></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([startLat, startLng], {
          draggable: true,
          icon: pinIcon,
        }).addTo(map);

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          const nextLat = Number(pos.lat.toFixed(6));
          const nextLng = Number(pos.lng.toFixed(6));
          onChangeCoordinates(nextLat, nextLng);
          void reverseGeocode(nextLat, nextLng);
        });

        map.on("click", (e) => {
          const nextLat = Number(e.latlng.lat.toFixed(6));
          const nextLng = Number(e.latlng.lng.toFixed(6));
          marker.setLatLng([nextLat, nextLng]);
          onChangeCoordinates(nextLat, nextLng);
          void reverseGeocode(nextLat, nextLng);
        });

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;

        window.setTimeout(() => {
          map.invalidateSize();
        }, 150);
      }
    }

    void initMap();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showManualMap]);

  // Keep marker & map centered when coordinates update externally (e.g. GPS button or nudge)
  useEffect(() => {
    if (
      mapInstanceRef.current &&
      markerInstanceRef.current &&
      typeof lat === "number" &&
      typeof lng === "number"
    ) {
      markerInstanceRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], 16);
    }
  }, [lat, lng]);

  // Clean up map instance on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, []);

  function applyDetectedPosition(latitude: number, longitude: number) {
    const nextLat = Number(latitude.toFixed(6));
    const nextLng = Number(longitude.toFixed(6));
    onChangeCoordinates(nextLat, nextLng);
    setShowManualMap(true);
    setIsLocating(false);
    setGeoError(null);
    void reverseGeocode(nextLat, nextLng);
  }

  function handleDetectGps() {
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError(
        "Tu dispositivo no reportó GPS directo. Toca el mapa abajo para colocar el pin en tu calle."
      );
      setShowManualMap(true);
      onChangeCoordinates(activeLat, activeLng);
      return;
    }

    setIsLocating(true);

    // Stage 1: Try High Accuracy GPS first (6 seconds)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyDetectedPosition(
          position.coords.latitude,
          position.coords.longitude
        );
      },
      () => {
        // Stage 2: Fallback to Network / Wi-Fi / Cell tower location (works indoors on Android)
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            applyDetectedPosition(
              fallbackPos.coords.latitude,
              fallbackPos.coords.longitude
            );
          },
          (err) => {
            setIsLocating(false);
            const reason =
              err.code === 1
                ? "Permiso de ubicación denegado. Activa el permiso de Ubicación para LaCarta o toca el mapa para fijar tu pin."
                : "No se obtuvo señal GPS a tiempo. Toca cualquier calle en el mapa o arrastra el círculo rojo hasta tu ubicación.";
            setGeoError(reason);
            setShowManualMap(true);
            if (!hasCoordinates) {
              onChangeCoordinates(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  }

  function nudgePin(deltaLat: number, deltaLng: number) {
    const nextLat = Number((activeLat + deltaLat).toFixed(6));
    const nextLng = Number((activeLng + deltaLng).toFixed(6));
    onChangeCoordinates(nextLat, nextLng);
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#141418] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#E11D48]" />
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
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-3 py-2.5 text-xs font-black text-white shadow-sm shadow-[#E11D48]/30 transition-colors hover:bg-[#BE123C] disabled:opacity-60"
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
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#202024] px-3 py-2.5 text-xs font-bold text-zinc-200 hover:border-[#E11D48] hover:text-[#E11D48]"
        >
          <Crosshair className="h-4 w-4 text-[#E11D48]" />
          <span>{showManualMap ? "Ocultar mapa" : "Marcar / Ver en mapa"}</span>
        </button>
      </div>

      {geoError ? (
        <p className="mt-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
          {geoError}
        </p>
      ) : null}

      {showManualMap && hasCoordinates ? (
        <div className="mt-3 space-y-2.5">
          <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
            <div
              ref={mapContainerRef}
              className="h-52 w-full touch-pan-x touch-pan-y"
            />
            <div className="border-t border-zinc-800 bg-[#18181B] px-3 py-1.5 text-[11px] text-zinc-400">
              💡 Toca cualquier punto en el mapa o arrastra el pin rojo hasta tu
              casa.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-[#202024] px-3 py-2">
            <span className="text-[11px] text-zinc-300">
              Coordenadas:{" "}
              <strong className="font-mono text-[#FB7185]">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => nudgePin(0.0008, 0)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-bold text-zinc-200 hover:border-[#E11D48]"
              >
                ↑ Norte
              </button>
              <button
                type="button"
                onClick={() => nudgePin(-0.0008, 0)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-bold text-zinc-200 hover:border-[#E11D48]"
              >
                ↓ Sur
              </button>
              <button
                type="button"
                onClick={() => nudgePin(0, -0.0008)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-bold text-zinc-200 hover:border-[#E11D48]"
              >
                ← Oeste
              </button>
              <button
                type="button"
                onClick={() => nudgePin(0, 0.0008)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-bold text-zinc-200 hover:border-[#E11D48]"
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
