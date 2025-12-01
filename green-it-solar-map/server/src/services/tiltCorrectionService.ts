import * as turf from '@turf/turf';
import * as suncalc from 'suncalc';

/**
 * Plane-of-Array (POA) irradiance calculation using tilt correction
 * This service implements Hay-Davies transposition model for converting
 * GHI (Global Horizontal Irradiance) to POA (Plane-of-Array) irradiance
 */

export interface TiltCorrectionParams {
  ghi: number; // Global Horizontal Irradiance (kWh/m²/day or W/m²)
  dni?: number; // Direct Normal Irradiance (optional, if available)
  dif?: number; // Diffuse Irradiance (optional, if available)
  latitude: number; // Site latitude in degrees
  longitude: number; // Site longitude in degrees
  tilt: number; // Panel tilt angle in degrees (0-90)
  azimuth: number; // Panel azimuth angle in degrees (0=N, 90=E, 180=S, 270=W)
  date?: Date; // Date for sun position calculation (default: annual average)
}

export interface TiltCorrectionResult {
  poa: number; // Plane-of-Array irradiance (same units as input)
  beamComponent: number;
  diffuseComponent: number;
  groundReflectedComponent: number;
  solarElevation: number; // Sun elevation angle in degrees
  solarAzimuth: number; // Sun azimuth angle in degrees
  incidenceAngle: number; // Angle of incidence on panel in degrees
}

/**
 * Estimate diffuse fraction using Erbs model
 * @param ghi Global Horizontal Irradiance
 * @param clearSkyGHI Clear-sky GHI estimate
 */
function erbsDiffuseFraction(ghi: number, clearSkyGHI: number): number {
  const kt = ghi / clearSkyGHI; // Clearness index
  
  if (kt <= 0) return 1.0;
  if (kt >= 0.8) return 0.165;
  
  // Erbs correlation
  if (kt <= 0.22) {
    return 1.0 - 0.09 * kt;
  } else if (kt <= 0.8) {
    return 0.9511 - 0.1604 * kt + 4.388 * kt * kt - 16.638 * kt * kt * kt + 12.336 * kt * kt * kt * kt;
  }
  
  return 0.165;
}

/**
 * Estimate clear-sky GHI using simplified model
 * @param latitude Latitude in degrees
 * @param dayOfYear Day of year (1-365)
 */
function estimateClearSkyGHI(latitude: number, dayOfYear: number): number {
  // Simplified clear-sky estimate (in W/m², approximate)
  // For annual average, use day 183 (mid-year)
  const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180);
  const latRad = latitude * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  
  // Solar elevation at solar noon
  const solarElevationNoon = 90 - Math.abs(latitude - declination);
  const solarElevationRad = solarElevationNoon * Math.PI / 180;
  
  // Rough clear-sky GHI estimate (W/m²)
  const airMass = 1 / (Math.sin(solarElevationRad) + 0.15 * Math.pow(solarElevationNoon + 3.885, -1.253));
  const clearSkyGHI = 1000 * Math.sin(solarElevationRad) * Math.exp(-0.0001184 * airMass * 1013.25);
  
  return Math.max(0, clearSkyGHI);
}

/**
 * Convert degrees to radians
 */
function degToRad(deg: number): number {
  return deg * Math.PI / 180;
}

/**
 * Convert radians to degrees
 */
function radToDeg(rad: number): number {
  return rad * 180 / Math.PI;
}

/**
 * Calculate sun position using suncalc
 */
function getSunPosition(lat: number, lon: number, date: Date) {
  const times = suncalc.getPosition(date, lat, lon);
  return {
    altitude: times.altitude, // in radians
    azimuth: times.azimuth + Math.PI, // suncalc gives azimuth from north, convert to 0-360 from south
  };
}

/**
 * Calculate angle of incidence on tilted surface
 */
function calculateIncidenceAngle(
  solarElevation: number,
  solarAzimuth: number,
  panelTilt: number,
  panelAzimuth: number
): number {
  const solarElevRad = degToRad(solarElevation);
  const solarAzRad = degToRad(solarAzimuth);
  const tiltRad = degToRad(panelTilt);
  const panelAzRad = degToRad(panelAzimuth);
  
  // Surface normal vector components
  const nx = Math.sin(tiltRad) * Math.sin(panelAzRad);
  const ny = Math.sin(tiltRad) * Math.cos(panelAzRad);
  const nz = Math.cos(tiltRad);
  
  // Sun direction vector
  const sx = Math.cos(solarElevRad) * Math.sin(solarAzRad);
  const sy = Math.cos(solarElevRad) * Math.cos(solarAzRad);
  const sz = Math.sin(solarElevRad);
  
  // Dot product gives cos(incidence angle)
  const cosIncidence = nx * sx + ny * sy + nz * sz;
  const cosIncidenceClamped = Math.max(-1, Math.min(1, cosIncidence));
  
  return radToDeg(Math.acos(cosIncidenceClamped));
}

/**
 * Hay-Davies transposition model for POA calculation
 */
export function calculateTiltCorrection(params: TiltCorrectionParams): TiltCorrectionResult {
  const {
    ghi,
    dni: providedDNI,
    dif: providedDIF,
    latitude,
    longitude,
    tilt,
    azimuth,
    date = new Date('2024-06-21T12:00:00Z'), // Use summer solstice as representative
  } = params;

  // Get sun position (for annual average, use mid-year date)
  const sunPos = getSunPosition(latitude, longitude, date);
  const solarElevation = radToDeg(sunPos.altitude);
  const solarAzimuth = radToDeg(sunPos.azimuth);

  // Calculate angle of incidence
  const incidenceAngle = calculateIncidenceAngle(solarElevation, solarAzimuth, tilt, azimuth);

  // Decompose GHI into DNI and DIF if not provided
  let dni: number;
  let dif: number;
  
  if (providedDNI !== undefined && providedDIF !== undefined) {
    dni = providedDNI;
    dif = providedDIF;
  } else {
    // Estimate using Erbs model
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
    const clearSkyGHI = estimateClearSkyGHI(latitude, dayOfYear);
    const diffuseFraction = erbsDiffuseFraction(ghi, clearSkyGHI);
    dif = ghi * diffuseFraction;
    
    // DNI from GHI and DIF (simplified)
    const solarZenith = 90 - solarElevation;
    if (solarZenith > 85) {
      dni = 0; // Sun too low
    } else {
      dni = Math.max(0, (ghi - dif) / Math.cos(degToRad(solarZenith)));
    }
  }

  // Hay-Davies transposition model
  const tiltRad = degToRad(tilt);
  const incidenceRad = degToRad(incidenceAngle);
  const solarZenith = 90 - solarElevation;
  const solarZenithRad = degToRad(solarZenith);
  
  // Anisotropic index (simplified)
  const ai = dni / (1367 * Math.cos(solarZenithRad)); // Extraterrestrial irradiance normalization
  const aiClamped = Math.max(0, Math.min(1, ai));
  
  // Beam component
  const beamComponent = dni * Math.max(0, Math.cos(incidenceRad));
  
  // Diffuse component (Hay-Davies)
  const rb = Math.max(0, Math.cos(incidenceRad)) / Math.max(0.087, Math.cos(solarZenithRad)); // Beam transposition factor
  const diffuseComponent = dif * (
    aiClamped * rb +
    (1 - aiClamped) * ((1 + Math.cos(tiltRad)) / 2)
  );
  
  // Ground-reflected component (assume albedo = 0.2)
  const albedo = 0.2;
  const groundReflectedComponent = ghi * albedo * ((1 - Math.cos(tiltRad)) / 2);
  
  // Total POA
  const poa = beamComponent + diffuseComponent + groundReflectedComponent;

  return {
    poa: Math.max(0, poa),
    beamComponent: Math.max(0, beamComponent),
    diffuseComponent: Math.max(0, diffuseComponent),
    groundReflectedComponent: Math.max(0, groundReflectedComponent),
    solarElevation,
    solarAzimuth,
    incidenceAngle,
  };
}

/**
 * Convert daily GHI to POA using tilt correction
 * For annual calculations, this uses representative sun positions
 */
export function convertGHIToPOA(
  ghi_kwh_m2_day: number,
  latitude: number,
  longitude: number,
  tilt: number,
  azimuth: number,
  dni?: number,
  dif?: number
): number {
  // For daily totals, we use a representative sun position
  // In practice, this should be integrated over the day, but for simplicity
  // we use a mid-day representative value
  const date = new Date('2024-06-21T12:00:00Z');
  
  // Convert daily kWh/m² to representative W/m² for calculation
  // Approximate peak irradiance from daily total
  const peakGHI_w_m2 = (ghi_kwh_m2_day * 1000) / 5; // Assume 5 peak sun hours
  
  const result = calculateTiltCorrection({
    ghi: peakGHI_w_m2,
    dni: dni ? dni * 1000 : undefined,
    dif: dif ? dif * 1000 : undefined,
    latitude,
    longitude,
    tilt,
    azimuth,
    date,
  });
  
  // Convert back to daily kWh/m²
  // This is a simplified approach; full implementation would integrate hourly values
  const poa_kwh_m2_day = (result.poa / 1000) * 5; // Approximate conversion back
  
  return Math.max(0, poa_kwh_m2_day);
}

