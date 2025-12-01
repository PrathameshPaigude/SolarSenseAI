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
  moduleArea?: number; // m² per module (optional)
  capacity_kWp?: number; // Installed capacity in kWp (optional)
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
  },
  mediumCommercial: {
    name: 'mediumCommercial',
    displayName: 'Medium Commercial',
    panelEfficiency: 0.18,
    tilt: 25,
    azimuth: 180,
    performanceRatio: 0.78,
    moduleArea: 1.7,
  },
  groundMounted: {
    name: 'groundMounted',
    displayName: 'Ground-Mounted',
    panelEfficiency: 0.19,
    tilt: 25, // Adjustable, using optimum
    azimuth: 180,
    performanceRatio: 0.80,
    moduleArea: 1.7,
  },
  floating: {
    name: 'floating',
    displayName: 'Floating Solar',
    panelEfficiency: 0.18,
    tilt: 15, // Lower tilt for floating
    azimuth: 180,
    performanceRatio: 0.77,
    moduleArea: 1.7,
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
 * Compute PV output from zonal stats
 */
export function computePVFromZonalStats(
  area_m2: number,
  ghiStats: ZonalStats,
  systemConfig: PVSystemPreset,
  installed_capacity_kWp?: number
): PVCalculationResult {
  return computeSimplePV(
    area_m2,
    ghiStats.mean,
    systemConfig.panelEfficiency,
    systemConfig.performanceRatio,
    installed_capacity_kWp
  );
}

