"use client";

import { useState } from "react";
import { Loader2, LocateFixed, MapPin, Navigation } from "lucide-react";
import {
  buildDirectionsUrl,
  ECUADOR_CITIES,
  resolveNearestEcuadorCity,
} from "@/lib/utils/location";

export interface SellerLocationFieldsProps {
  tenantName: string;
  initialCity: string;
  initialAddress: string;
  initialLatitude: number | null;
  initialLongitude: number | null;
  initialGoogleMapsUrl: string;
}

export function SellerLocationFields({
  tenantName,
  initialCity,
  initialAddress,
  initialLatitude,
  initialLongitude,
  initialGoogleMapsUrl,
}: SellerLocationFieldsProps) {
  const [city, setCity] = useState(initialCity || "Quito");
  const [address, setAddress] = useState(initialAddress);
  const [latitude, setLatitude] = useState<string>(
    initialLatitude !== null ? String(initialLatitude) : ""
  );
  const [longitude, setLongitude] = useState<string>(
    initialLongitude !== null ? String(initialLongitude) : ""
  );
  const [googleMapsUrl, setGoogleMapsUrl] = useState(initialGoogleMapsUrl);
  const [detecting, setDetecting] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  function handleCaptureCurrentGps() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatusNote("Tu navegador no soporta geolocalización.");
      return;
    }
    setDetecting(true);
    setStatusNote(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const nearest = resolveNearestEcuadorCity(lat, lng);
        setLatitude(String(lat));
        setLongitude(String(lng));
        setCity(nearest.name);
        setDetecting(false);
        setStatusNote(
          `Ubicación del local capturada en ${nearest.name} (${lat}, ${lng}). Recuerda guardar los cambios.`
        );
      },
      () => {
        setDetecting(false);
        setStatusNote(
          "No se pudo obtener el GPS automáticamente. Puedes seleccionar la ciudad y escribir la dirección."
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const parsedLat = latitude.trim() ? Number(latitude) : null;
  const parsedLng = longitude.trim() ? Number(longitude) : null;

  const previewDirectionsHref = buildDirectionsUrl({
    name: tenantName,
    address,
    city,
    latitude: parsedLat !== null && Number.isFinite(parsedLat) ? parsedLat : null,
    longitude:
      parsedLng !== null && Number.isFinite(parsedLng) ? parsedLng : null,
    googleMapsUrl,
  });

  return (
    <div className="space-y-3.5 rounded-2xl border border-zinc-800 bg-[#121215] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
          <MapPin className="h-4 w-4 text-[#FB7185]" />
          <span>Ubicación, Ciudad y Botón &ldquo;Cómo llegar&rdquo;</span>
        </div>

        <button
          id="seller-capture-gps-btn"
          type="button"
          onClick={handleCaptureCurrentGps}
          disabled={detecting}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E11D48]/40 bg-[#E11D48]/15 px-3 py-1.5 text-xs font-bold text-[#FB7185] hover:bg-[#E11D48]/25"
        >
          {detecting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" />
          )}
          <span>Marcar ubicación GPS actual del local</span>
        </button>
      </div>

      {statusNote ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-300">
          {statusNote}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor="cfg-city"
            className="mb-1 block text-xs font-semibold text-zinc-400"
          >
            Ciudad del Local
          </label>
          <select
            id="cfg-city"
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#E11D48] focus:outline-none"
          >
            {ECUADOR_CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.province})
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="cfg-address"
            className="mb-1 block text-xs font-semibold text-zinc-400"
          >
            Dirección física del Local
          </label>
          <input
            id="cfg-address"
            name="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej. Av. Amazonas y Naciones Unidas, Sector Iñaquito"
            className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2.5 text-sm text-zinc-100 focus:border-[#E11D48] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor="cfg-latitude"
            className="mb-1 block text-[11px] font-semibold text-zinc-400"
          >
            Latitud GPS
          </label>
          <input
            id="cfg-latitude"
            name="latitude"
            type="text"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="-0.180653"
            className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 text-xs text-zinc-200 focus:border-[#E11D48] focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="cfg-longitude"
            className="mb-1 block text-[11px] font-semibold text-zinc-400"
          >
            Longitud GPS
          </label>
          <input
            id="cfg-longitude"
            name="longitude"
            type="text"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="-78.467834"
            className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 text-xs text-zinc-200 focus:border-[#E11D48] focus:outline-none"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label
            htmlFor="cfg-google-maps-url"
            className="mb-1 block text-[11px] font-semibold text-zinc-400"
          >
            Link Google Maps (opcional)
          </label>
          <input
            id="cfg-google-maps-url"
            name="googleMapsUrl"
            type="url"
            value={googleMapsUrl}
            onChange={(e) => setGoogleMapsUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            className="w-full rounded-xl border border-zinc-800 bg-[#18181B] px-3 py-2 text-xs text-zinc-200 focus:border-[#E11D48] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
        <span className="text-[11px] text-zinc-400">
          Así abrirán tus clientes el GPS hacia tu local:
        </span>
        <a
          id="seller-preview-directions-btn"
          href={previewDirectionsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-[#18181B] px-3 py-1.5 text-xs font-bold text-zinc-200 hover:border-[#E11D48]"
        >
          <Navigation className="h-3.5 w-3.5 text-[#FB7185]" />
          <span>Probar &ldquo;Cómo llegar&rdquo;</span>
        </a>
      </div>
    </div>
  );
}
