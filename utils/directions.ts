const GOOGLE_MAPS_API_KEY = "AIzaSyDXCnCDEWKKhAvEYzu0Lv2ukk_Tjjr4zAk";

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteInfo {
  distanceText: string;
  durationText: string;
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
  polylineCoords: LatLng[];
}

export interface RouteStep {
  instruction: string;
  distanceText: string;
  durationText: string;
  startLocation: LatLng;
  endLocation: LatLng;
  maneuver?: string;
}

function decodePolyline(encoded: string): LatLng[] {
  const coords: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let result = 1;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 1;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({ latitude: lat * 1e-5, longitude: lng * 1e-5 });
  }
  return coords;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").trim();
}

export async function getDirections(
  origin: LatLng,
  destination: LatLng
): Promise<RouteInfo | null> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${origin.latitude},${origin.longitude}` +
      `&destination=${destination.latitude},${destination.longitude}` +
      `&mode=driving` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" || !data.routes?.length) {
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0];
    const polylineCoords = decodePolyline(route.overview_polyline.points);

    const steps: RouteStep[] = leg.steps.map((s: any) => ({
      instruction: stripHtml(s.html_instructions),
      distanceText: s.distance.text,
      durationText: s.duration.text,
      startLocation: {
        latitude: s.start_location.lat,
        longitude: s.start_location.lng,
      },
      endLocation: {
        latitude: s.end_location.lat,
        longitude: s.end_location.lng,
      },
      maneuver: s.maneuver ?? "straight",
    }));

    return {
      distanceText: leg.distance.text,
      durationText: leg.duration.text,
      distanceMeters: leg.distance.value,
      durationSeconds: leg.duration.value,
      steps,
      polylineCoords,
    };
  } catch {
    return null;
  }
}

export function getManeuverIcon(maneuver?: string): string {
  if (!maneuver) return "arrow-up";
  if (maneuver.includes("left")) return "corner-up-left";
  if (maneuver.includes("right")) return "corner-up-right";
  if (maneuver.includes("uturn")) return "rotate-ccw";
  if (maneuver.includes("roundabout")) return "refresh-cw";
  if (maneuver.includes("merge") || maneuver.includes("ramp")) return "trending-up";
  if (maneuver.includes("destination")) return "map-pin";
  return "arrow-up";
}
