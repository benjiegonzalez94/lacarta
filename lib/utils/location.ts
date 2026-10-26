export interface EcuadorCityOption {
  name: string;
  province: string;
  latitude: number;
  longitude: number;
}

export const ECUADOR_CITIES: readonly EcuadorCityOption[] = [
  { name: "Quito", province: "Pichincha", latitude: -0.180653, longitude: -78.467834 },
  { name: "Guayaquil", province: "Guayas", latitude: -2.189412, longitude: -79.889066 },
  { name: "Cuenca", province: "Azuay", latitude: -2.900128, longitude: -79.005896 },
  { name: "Santo Domingo", province: "Santo Domingo", latitude: -0.25305, longitude: -79.17536 },
  { name: "Ambato", province: "Tungurahua", latitude: -1.24908, longitude: -78.61675 },
  { name: "Manta", province: "Manabí", latitude: -0.967653, longitude: -80.70891 },
  { name: "Portoviejo", province: "Manabí", latitude: -1.05458, longitude: -80.45445 },
  { name: "Machala", province: "El Oro", latitude: -3.25811, longitude: -79.95539 },
  { name: "Loja", province: "Loja", latitude: -3.99313, longitude: -79.20422 },
  { name: "Ibarra", province: "Imbabura", latitude: 0.35171, longitude: -78.12233 },
  { name: "Riobamba", province: "Chimborazo", latitude: -1.66355, longitude: -78.65464 },
  { name: "Esmeraldas", province: "Esmeraldas", latitude: 0.9592, longitude: -79.65397 },
  { name: "Quevedo", province: "Los Ríos", latitude: -1.02863, longitude: -79.46352 },
  { name: "Latacunga", province: "Cotopaxi", latitude: -0.93521, longitude: -78.61554 },
  { name: "Milagro", province: "Guayas", latitude: -2.13404, longitude: -79.59415 },
  { name: "Durán", province: "Guayas", latitude: -2.17099, longitude: -79.83901 },
  { name: "Babahoyo", province: "Los Ríos", latitude: -1.80217, longitude: -79.53443 },
  { name: "Tulcán", province: "Carchi", latitude: 0.81187, longitude: -77.71727 },
  { name: "Salinas", province: "Santa Elena", latitude: -2.21452, longitude: -80.95151 },
  { name: "Baños", province: "Tungurahua", latitude: -1.39699, longitude: -78.42289 },
  { name: "Otavalo", province: "Imbabura", latitude: 0.23457, longitude: -78.26248 },
  { name: "Tena", province: "Napo", latitude: -0.9938, longitude: -77.81286 },
  { name: "Puyo", province: "Pastaza", latitude: -1.48369, longitude: -78.00257 },
] as const;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance between two coordinates in kilometers.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusKm * c * 10) / 10;
}

/**
 * Resolves the nearest Ecuadorian city to the given GPS coordinates.
 */
export function resolveNearestEcuadorCity(
  latitude: number,
  longitude: number
): EcuadorCityOption {
  let closest = ECUADOR_CITIES[0];
  let minDistance = Number.POSITIVE_INFINITY;

  for (const city of ECUADOR_CITIES) {
    const dist = calculateDistanceKm(
      latitude,
      longitude,
      city.latitude,
      city.longitude
    );
    if (dist < minDistance) {
      minDistance = dist;
      closest = city;
    }
  }

  return closest;
}

export interface DirectionsTarget {
  name: string;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
}

/**
 * Builds a universal GPS navigation URL that opens the phone's Maps/GPS app
 * with the restaurant's pin marked as destination.
 */
export function buildDirectionsUrl(target: DirectionsTarget): string {
  if (target.googleMapsUrl && target.googleMapsUrl.trim().length > 0) {
    return target.googleMapsUrl.trim();
  }

  if (
    typeof target.latitude === "number" &&
    Number.isFinite(target.latitude) &&
    typeof target.longitude === "number" &&
    Number.isFinite(target.longitude)
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`;
  }

  const queryParts = [
    target.address?.trim(),
    target.city?.trim() || "Ecuador",
  ].filter(Boolean);

  const destinationQuery =
    queryParts.length > 0 ? queryParts.join(", ") : `${target.name}, Ecuador`;

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destinationQuery
  )}`;
}

export interface DeviceGpsResult {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Robust device GPS detector that handles mobile browser & webview quirks:
 * 1. Checks if navigator.geolocation exists.
 * 2. Attempts high-accuracy reading with cached fallback (maximumAge: 120s).
 * 3. If timeout or position unavailable (common indoors on Android), falls back to network/wifi low-accuracy location.
 */
export async function getDeviceGpsCoordinates(): Promise<DeviceGpsResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocalización no soportada en este dispositivo.");
  }

  const tryGetPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  try {
    const pos = await tryGetPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 120000,
    });
    return {
      latitude: Number(pos.coords.latitude.toFixed(6)),
      longitude: Number(pos.coords.longitude.toFixed(6)),
      accuracy: pos.coords.accuracy,
    };
  } catch {
    // Fallback: low accuracy (cell tower / Wi-Fi) with 15s timeout and 5 min cached age
    const fallbackPos = await tryGetPosition({
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 300000,
    });
    return {
      latitude: Number(fallbackPos.coords.latitude.toFixed(6)),
      longitude: Number(fallbackPos.coords.longitude.toFixed(6)),
      accuracy: fallbackPos.coords.accuracy,
    };
  }
}
