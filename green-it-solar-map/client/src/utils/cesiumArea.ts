// utils/cesiumArea.ts
import * as Cesium from "cesium";
import * as turf from "@turf/turf";

/**
 * Convert Cesium.Cartesian3[] -> GeoJSON polygon coordinates [[lng,lat],...]
 * - positions: ordered polygon vertices in Cartesian3 (not necessarily closed)
 * - returns: GeoJSON-style ring array (closed)
 */
export function cesiumPositionsToLonLatRing(positions: Cesium.Cartesian3[]): [number, number][] {
  if (!positions || positions.length < 3) return [];

  const ring: [number, number][] = positions.map((pos) => {
    const carto = Cesium.Cartographic.fromCartesian(pos);
    const lon = Cesium.Math.toDegrees(carto.longitude);
    const lat = Cesium.Math.toDegrees(carto.latitude);
    return [lon, lat];
  });

  // Ensure ring is closed: push first if not equal to last
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return ring;
}

/**
 * Compute geodesic area in m^2 using Turf
 * Returns 0 for invalid polygons
 */
export function computeGeodesicAreaM2(positions: Cesium.Cartesian3[]): number {
  if (!positions || positions.length < 3) return 0;

  const ring = cesiumPositionsToLonLatRing(positions);
  if (ring.length < 4) return 0; // after closing, polygon must have >= 4 points

  try {
    const polygonGeoJSON = turf.polygon([ring]);
    
    // Check for self-intersecting polygons
    const kinks = turf.kinks(polygonGeoJSON);
    if (kinks.features.length > 0) {
      console.warn("Polygon has self-intersections, area may be inaccurate");
      // Still compute area, but warn user
    }

    const areaM2 = turf.area(polygonGeoJSON); // returns area in square meters
    return areaM2;
  } catch (error) {
    console.error("Error computing geodesic area:", error);
    return 0;
  }
}

/**
 * Safe wrapper with validation and error handling
 * Returns 0 for invalid inputs or calculation errors
 */
export function safeComputeGeodesicAreaM2(positions: Cesium.Cartesian3[]): number {
  try {
    const area = computeGeodesicAreaM2(positions);
    if (!isFinite(area) || area < 0) {
      console.error("Invalid area computed:", area);
      return 0;
    }
    return area;
  } catch (err) {
    console.error("Area calculation failed:", err);
    return 0;
  }
}

/**
 * Validate polygon and return validation result
 */
export function validatePolygon(positions: Cesium.Cartesian3[]): {
  valid: boolean;
  error?: string;
  hasKinks?: boolean;
} {
  if (!positions || positions.length < 3) {
    return { valid: false, error: "Polygon must have at least 3 points" };
  }

  const ring = cesiumPositionsToLonLatRing(positions);
  if (ring.length < 4) {
    return { valid: false, error: "Invalid polygon ring" };
  }

  try {
    const polygonGeoJSON = turf.polygon([ring]);
    const kinks = turf.kinks(polygonGeoJSON);
    const hasKinks = kinks.features.length > 0;

    if (hasKinks) {
      return { valid: true, hasKinks: true, error: "Polygon has self-intersections" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Failed to validate polygon" };
  }
}

