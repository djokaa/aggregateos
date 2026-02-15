/**
 * Google Maps integration service for geocoding and distance calculations.
 * Uses Google Maps Platform APIs:
 * - Geocoding API: Convert addresses to lat/lng
 * - Distance Matrix API: Calculate distance and travel time between locations
 * 
 * Set GOOGLE_MAPS_API_KEY in environment variables.
 */

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface DistanceResult {
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
  durationMinutes: number;
  durationText: string;
  distanceText: string;
}

/**
 * Geocode an address string to lat/lng coordinates.
 * Falls back gracefully if the API key is not set.
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("[Google Maps] No API key configured, skipping geocoding");
    return null;
  }

  try {
    const encoded = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK" && data.results?.[0]) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      };
    }

    console.warn("[Google Maps] Geocoding failed:", data.status, data.error_message);
    return null;
  } catch (error) {
    console.error("[Google Maps] Geocoding error:", error);
    return null;
  }
}

/**
 * Calculate distance and travel time between two points.
 * Accepts either lat/lng pairs or address strings.
 */
export async function calculateDistance(
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string
): Promise<DistanceResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("[Google Maps] No API key configured, skipping distance calculation");
    return null;
  }

  try {
    const originStr = typeof origin === "string"
      ? encodeURIComponent(origin)
      : `${origin.lat},${origin.lng}`;
    const destStr = typeof destination === "string"
      ? encodeURIComponent(destination)
      : `${destination.lat},${destination.lng}`;

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originStr}&destinations=${destStr}&units=imperial&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK" && data.rows?.[0]?.elements?.[0]?.status === "OK") {
      const element = data.rows[0].elements[0];
      const distanceMeters = element.distance.value;
      const durationSeconds = element.duration.value;

      return {
        distanceMeters,
        distanceMiles: Math.round((distanceMeters / 1609.34) * 100) / 100,
        durationSeconds,
        durationMinutes: Math.round(durationSeconds / 60),
        durationText: element.duration.text,
        distanceText: element.distance.text,
      };
    }

    console.warn("[Google Maps] Distance calculation failed:", data.status);
    return null;
  } catch (error) {
    console.error("[Google Maps] Distance error:", error);
    return null;
  }
}
