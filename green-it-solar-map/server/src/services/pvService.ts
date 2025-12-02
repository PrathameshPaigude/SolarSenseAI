import { ZonalStats } from './geoTiffService';

/**
 * PV System Preset Configuration
 */
export interface PVSystemPreset {
  name: string;
  displayName: string;
  panelEfficiency: number; // Panel efficiency (0-1)
  tilt: number; // Tilt angle in degrees
  azimuth: number; // Azimuth angle (0=N, 90=E, 180=S, 270=W)
  performanceRatio: number; // System performance ratio (0-1)
  /**
   * Module area in m² (footprint of one panel)
   */
  moduleArea?: number;
  /**
   * Module nameplate power in W (e.g. 420 W)
   */
  modulePowerW?: number;
  /**
   * Packing factor (0-1) to account for gaps, walkways, unusable edges
   */
  packingFactor?: number;
  /**
   * Desired DC/AC ratio (e.g. 1.15). Used when computing AC capacity.
   */
  dcAcRatio?: number;
  /**
   * Optional installed capacity in kWp (legacy/custom configs).
   * Kept for backward compatibility with existing controllers.
   */
  capacity_kWp?: number;
}

/**
 * PV System Presets
 */
export const PV_SYSTEM_PRESETS: Record<string, PVSystemPreset> = {
  smallResidential: {
    name: 'smallResidential',
    displayName: 'Small Residential',
    panelEfficiency: 0.17,
    tilt: 25,
    azimuth: 180, // South-facing
    performanceRatio: 0.75,
    moduleArea: 1.7, // m² per module
    modulePowerW: 420,
    packingFactor: 0.8,
    dcAcRatio: 1.15,
  },
  mediumCommercial: {
    name: 'mediumCommercial',
    displayName: 'Medium Commercial',
    panelEfficiency: 0.18,
    tilt: 25,
    azimuth: 180,
    performanceRatio: 0.78,
    moduleArea: 1.7,
    modulePowerW: 450,
    packingFactor: 0.8,
    dcAcRatio: 1.2,
  },
  groundMounted: {
    name: 'groundMounted',
    displayName: 'Ground-Mounted',
    panelEfficiency: 0.19,
    tilt: 25, // Adjustable, using optimum
    azimuth: 180,
    performanceRatio: 0.80,
    moduleArea: 1.7,
    modulePowerW: 500,
    packingFactor: 0.9,
    dcAcRatio: 1.3,
  },
  floating: {
    name: 'floating',
    displayName: 'Floating Solar',
    panelEfficiency: 0.18,
    tilt: 15, // Lower tilt for floating
    azimuth: 180,
    performanceRatio: 0.77,
    moduleArea: 1.7,
    modulePowerW: 430,
    packingFactor: 0.75,
    dcAcRatio: 1.1,
  },
};

/**
 * PV Calculation Result
 */
export interface PVCalculationResult {
  daily_kWh: number;
  yearly_kWh: number;
  monthly_kWh?: number[]; // 12 months
  kWh_per_kWp_per_year?: number;
  area_m2: number;
  installed_capacity_kWp?: number;
  ghi_mean: number;
  ghi_units: string;
  /**
   * Estimated number of panels that fit on the rooftop
   */
  n_panels?: number;
  /**
   * Estimated DC capacity based on panel count and module power
   */
  dc_capacity_kWp?: number;
  /**
   * Estimated AC capacity after applying DC/AC ratio
   */
  ac_capacity_kW?: number;
  /**
   * Optional calibration scale applied using PVOUT (kWh/kWp/year)
   */
  calibration_scale?: number;
  /**
   * Calibrated yearly energy using PVOUT reference (if available)
   */
  calibrated_yearly_kWh?: number;
  /**
   * Calibrated specific yield using PVOUT reference (if available)
   */
  calibrated_kWh_per_kWp_per_year?: number;
}

/**
 * Simple PV energy calculation using GHI
 * @param area_m2 Area in square meters
 * @param ghi_kwh_m2_day Average daily GHI (kWh/m²/day)
 * @param panelEfficiency Panel efficiency (0-1)
 * @param performanceRatio System performance ratio (0-1)
 * @param installed_capacity_kWp Optional installed capacity (if provided, computes kWh/kWp)
 */
export function computeSimplePV(
  area_m2: number,
  ghi_kwh_m2_day: number,
  panelEfficiency: number = 0.18,
  performanceRatio: number = 0.75,
  installed_capacity_kWp?: number
): PVCalculationResult {
  // Convert GHI to daily energy output
  // daily_kWh = area (m²) × GHI (kWh/m²/day) × panelEfficiency × PR
  const daily_kwh = area_m2 * ghi_kwh_m2_day * panelEfficiency * performanceRatio;
  const yearly_kwh = daily_kwh * 365;

  let kWh_per_kWp_per_year: number | undefined;
  
  if (installed_capacity_kWp && installed_capacity_kWp > 0) {
    kWh_per_kWp_per_year = yearly_kwh / installed_capacity_kWp;
  }

  return {
    daily_kWh: daily_kwh,
    yearly_kWh: yearly_kwh,
    area_m2,
    installed_capacity_kWp,
    ghi_mean: ghi_kwh_m2_day,
    ghi_units: 'kWh/m²/day',
    kWh_per_kWp_per_year,
  };
}

/**
 * Compute PV output with monthly breakdown
 * @param area_m2 Area in square meters
 * @param ghi_mean Annual average GHI (kWh/m²/day)
 * @param monthly_ghi Array of 12 monthly GHI values (kWh/m²/day)
 * @param systemConfig PV system configuration
 */
export function computePVWithMonthly(
  area_m2: number,
  ghi_mean: number,
  monthly_ghi: number[],
  systemConfig: PVSystemPreset
): PVCalculationResult {
  if (monthly_ghi.length !== 12) {
    throw new Error('Monthly GHI array must have 12 values');
  }

  // Calculate monthly energy output
  const daysInMonth: number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const monthly_kWh: number[] = monthly_ghi.map((ghi: number, monthIndex: number): number => {
    const days: number = daysInMonth[monthIndex] || 30;
    return area_m2 * ghi * days * systemConfig.panelEfficiency * systemConfig.performanceRatio;
  });

  const yearly_kwh: number = monthly_kWh.reduce((sum: number, val: number): number => sum + val, 0);
  const daily_kwh = yearly_kwh / 365;

  // Calculate installed capacity if module area is provided
  const installed_capacity_kWp = systemConfig.moduleArea
    ? (area_m2 / systemConfig.moduleArea) * (systemConfig.moduleArea * systemConfig.panelEfficiency * 1000) / 1000
    : undefined;

  let kWh_per_kWp_per_year: number | undefined;
  if (installed_capacity_kWp && installed_capacity_kWp > 0) {
    kWh_per_kWp_per_year = yearly_kwh / installed_capacity_kWp;
  }

  return {
    daily_kWh: daily_kwh,
    yearly_kWh: yearly_kwh,
    monthly_kWh,
    area_m2,
    installed_capacity_kWp,
    ghi_mean,
    ghi_units: 'kWh/m²/day',
    kWh_per_kWp_per_year,
  };
}

/**
 * Estimate monthly GHI values from annual average based on latitude
 * Uses seasonal variation patterns typical for different latitudes
 */
export function estimateMonthlyGHI(annualGHI: number, latitude: number): number[] {
  // Normalize latitude to -90 to 90
  const lat = Math.max(-90, Math.min(90, latitude));
  
  // For tropical regions (near equator), less seasonal variation
  // For mid-latitudes, more seasonal variation
  // For high latitudes, extreme seasonal variation
  
  // Base seasonal factors (for Northern Hemisphere, adjust for Southern)
  // These represent typical monthly variation relative to annual average
  // Values are approximate multipliers for each month (Jan=0, Feb=1, ..., Dec=11)
  const baseFactors = [
    0.85, 0.90, 1.05, 1.10, 1.15, 1.20,  // Jan-Jun (winter to summer)
    1.15, 1.10, 1.05, 0.95, 0.90, 0.85   // Jul-Dec (summer to winter)
  ];
  
  // Adjust variation based on latitude
  // Near equator (0-15°): minimal variation
  // Mid-latitudes (15-45°): moderate variation
  // High latitudes (45-90°): high variation
  const absLat = Math.abs(lat);
  let variationFactor = 1.0;
  
  if (absLat < 15) {
    // Tropical: minimal seasonal variation (±5%)
    variationFactor = 0.05;
  } else if (absLat < 30) {
    // Subtropical: low variation (±10%)
    variationFactor = 0.10;
  } else if (absLat < 45) {
    // Mid-latitude: moderate variation (±15%)
    variationFactor = 0.15;
  } else {
    // High latitude: high variation (±20%)
    variationFactor = 0.20;
  }
  
  // Apply variation to base factors
  const monthlyFactors = baseFactors.map(factor => {
    // Normalize so average is 1.0
    const normalized = 1.0 + (factor - 1.0) * variationFactor;
    return normalized;
  });
  
  // Normalize factors to ensure annual average equals input
  const sum = monthlyFactors.reduce((a, b) => a + b, 0);
  const normalizedFactors = monthlyFactors.map(f => f * 12 / sum);
  
  // For Southern Hemisphere, shift by 6 months
  let finalFactors = normalizedFactors;
  if (lat < 0) {
    finalFactors = [...normalizedFactors.slice(6), ...normalizedFactors.slice(0, 6)];
  }
  
  // Calculate monthly GHI values
  return finalFactors.map(factor => annualGHI * factor);
}

/**
 * Compute PV output from zonal stats with optional monthly breakdown
 */
export function computePVFromZonalStats(
  area_m2: number,
  ghiStats: ZonalStats,
  systemConfig: PVSystemPreset,
  installed_capacity_kWp?: number,
  latitude?: number
): PVCalculationResult {
  const result = computeSimplePV(
    area_m2,
    ghiStats.mean,
    systemConfig.panelEfficiency,
    systemConfig.performanceRatio,
    installed_capacity_kWp
  );
  
  // --- Installed capacity & panel count ---
  let n_panels: number | undefined;
  let dc_capacity_kWp: number | undefined;
  let ac_capacity_kW: number | undefined;

  const moduleArea = systemConfig.moduleArea ?? 1.7; // m²
  const modulePowerW = systemConfig.modulePowerW ?? 420; // W
  const packingFactor = systemConfig.packingFactor ?? 0.8;
  const dcAcRatio = systemConfig.dcAcRatio ?? 1.15;

  if (area_m2 > 0) {
    n_panels = Math.floor((area_m2 * packingFactor) / moduleArea);
    if (n_panels > 0) {
      dc_capacity_kWp = (n_panels * modulePowerW) / 1000;
      ac_capacity_kW = dc_capacity_kWp / dcAcRatio;
    }
  }

  // Recompute specific yield using DC capacity if available
  let kWh_per_kWp_per_year = result.kWh_per_kWp_per_year;
  if (!kWh_per_kWp_per_year && dc_capacity_kWp && dc_capacity_kWp > 0) {
    kWh_per_kWp_per_year = result.yearly_kWh / dc_capacity_kWp;
  }

  // Always add monthly breakdown (use latitude if provided, otherwise use mid-latitude default)
  const latForEstimation = latitude !== undefined ? latitude : 30; // Default to 30° (subtropical)
  const monthly_ghi = estimateMonthlyGHI(ghiStats.mean, latForEstimation);
  const daysInMonth: number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const monthly_kWh: number[] = monthly_ghi.map((ghi: number, monthIndex: number): number => {
    const days: number = daysInMonth[monthIndex] || 30;
    return area_m2 * ghi * days * systemConfig.panelEfficiency * systemConfig.performanceRatio;
  });

  return {
    ...result,
    monthly_kWh,
    kWh_per_kWp_per_year,
    n_panels,
    dc_capacity_kWp,
    ac_capacity_kW,
  };
}

