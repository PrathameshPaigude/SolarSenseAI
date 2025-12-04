import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api', // Your backend server URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to predict energy generation
export const predictEnergy = async (locationData: {
  lat: number;
  lng: number;
  area_sq_ft: number;
  panel_efficiency: number;
}) => {
  try {
    const response = await apiClient.post('/predict-energy', locationData);
    return response.data;
  } catch (error) {
    console.error('Error predicting energy:', error);
    throw error;
  }
};

// Function to get user data
export const getUserData = async (userId: string) => {
  try {
    // Use the configured apiClient instance
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

// Function to save user project
export const saveUserProject = async (userId: string, projectData: { name: string; location: object }) => {
  try {
    // Use the configured apiClient instance
    const response = await apiClient.post(`/users/${userId}/projects`, projectData);
    return response.data;
  } catch (error) {
    console.error('Error saving user project:', error);
    throw error;
  }
};

// This function needs to be exported so DashboardPage can import it.
export const fetchEnergyData = async (projectId: string) => {
  console.log(`Fetching data for project ${projectId}`);
  // Mock data for demonstration purposes
  return Promise.resolve({
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    consumption: [65, 59, 80, 81, 56, 55],
    generation: [45, 49, 60, 71, 46, 40],
  });
};

// GIS API functions for GeoTIFF sampling and PV calculations

export interface PolygonGeoJSON {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface ZonalStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
  count: number;
  units: string;
}

export interface PVSystemPreset {
  name: string;
  displayName: string;
  panelEfficiency: number;
  tilt: number;
  azimuth: number;
  performanceRatio: number;
  packingFactor: number;
}

export interface PVCalculationResult {
  // System Specs
  area_m2: number;
  area_effective_m2: number;
  num_panels: number;
  P_dc_kWp: number;
  P_ac_kW: number;
  panelTechnology: "mono" | "poly" | "thinfilm";
  gridType: "on_grid" | "hybrid" | "off_grid";
  presetName?: string;

  // Irradiance & climate (from GSA)
  ghi_mean: number;         // kWh/m²/day
  dni_mean?: number;        // kWh/m²/day
  dif_mean?: number;        // kWh/m²/day
  gti_mean?: number;        // kWh/m²/day
  temp_mean?: number;       // °C
  opta_deg?: number;        // degrees
  elevation_m?: number;     // meters
  pvout_reference_kwh_kwp?: number; // kWh/kWp/year
  pvout_scale_factor?: number;
  pvout_monthly_kwh_kwp?: number[]; // length 12

  // Energy (Raw vs Calibrated vs Usable)
  daily_kWh_raw: number;
  yearly_kWh_raw: number;
  yearly_kWh_calibrated: number;
  yearly_kWh_usable?: number;  // after gridType losses

  // Yields
  specific_yield_kwh_kwp_raw: number;
  specific_yield_kwh_kwp_calibrated: number;

  // Efficiency & Losses
  performance_ratio: number;
  static_losses_PR: number;
  temperature_corrected_efficiency: number;

  // Monthly Energy
  monthly_kWh_usable?: number[]; // length 12, for chart

  // Meta
  model_version: string; // "v2.0-pvwatts-style"

  // Legacy compatibility
  daily_kWh: number;
  yearly_kWh: number;
  monthly_kWh?: number[];
  installed_capacity_kWp?: number;
  n_panels?: number; // alias
  dc_capacity_kWp?: number; // alias
  ac_capacity_kW?: number; // alias
  kWh_per_kWp_per_year?: number;
  calibrated_yearly_kWh?: number;
  calibrated_kWh_per_kWp_per_year?: number;
  ghi_units: string;
  irradiance_units?: string;
}

/**
 * Sample GHI from GeoTIFF for a given polygon
 */
export const sampleGHI = async (polygonGeoJson: PolygonGeoJSON, layers?: string[]) => {
  try {
    const response = await apiClient.post('/gis/sample-ghi', {
      polygonGeoJson,
      layers: layers || ['GHI'],
    });
    return response.data;
  } catch (error: any) {
    console.error('Error sampling GHI:', error);
    throw error;
  }
};

/**
 * Compute PV energy output
 */
export const computePV = async (params: {
  polygonGeoJson?: PolygonGeoJSON;
  area_m2: number;
  ghi_mean?: number;
  systemConfig?: string | PVSystemPreset;
  installed_capacity_kWp?: number;
  useTiltCorrection?: boolean;
  latitude?: number;
  longitude?: number;
  panelTechnology?: string;
  gridType?: string;
  layers?: Record<string, ZonalStats>;
}) => {
  try {
    const response = await apiClient.post('/gis/compute-pv', params);
    // The backend returns { pv: PVCalculationResult, ... }
    return response.data as { pv: PVCalculationResult };
  } catch (error: any) {
    console.error('Error computing PV:', error);
    throw error;
  }
};

/**
 * Compute PV with monthly breakdown
 */
export const computeMonthlyPV = async (params: {
  polygonGeoJson: PolygonGeoJSON;
  area_m2: number;
  systemConfig?: string | PVSystemPreset;
  installed_capacity_kWp?: number;
}) => {
  try {
    const response = await apiClient.post('/gis/monthly-pv', params);
    return response.data;
  } catch (error: any) {
    console.error('Error computing monthly PV:', error);
    throw error;
  }
};

/**
 * Get available PV system presets
 */
export const getPVPresets = async () => {
  try {
    const response = await apiClient.get('/gis/presets');
    return response.data;
  } catch (error: any) {
    console.error('Error getting presets:', error);
    throw error;
  }
};

/**
 * Get hourly solar irradiance data from Open-Meteo
 */
export const getHourlyIrradiance = async (params: {
  lat: number;
  lng: number;
  start?: string;
  end?: string;
}) => {
  try {
    const response = await apiClient.get('/solar-data', {
      params: {
        lat: params.lat,
        lng: params.lng,
        start: params.start,
        end: params.end,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching hourly irradiance:', error);
    throw error;
  }
};

// --- Financial Analysis ---

export interface FinancialInputs {
  systemSize_kWp: number;
  annualOutput_kWh: number;
  gridType?: "on_grid" | "hybrid" | "off_grid";
  panelTechnology?: "mono" | "poly" | "thinfilm";
  tariff_Rs_per_kWh?: number;
  capex_Rs_per_kWp?: number;
  om_Rs_per_kWp_per_year?: number;
  projectLifetime_years?: number;
  energyDegradation_pct_per_year?: number;
  tariffInflation_pct_per_year?: number;
  omInflation_pct_per_year?: number;
  gridEmission_kgCO2_per_kWh?: number;
}

export interface FinancialYearResult {
  year: number;
  output_kWh: number;
  tariff_Rs_per_kWh: number;
  grossSavings_Rs: number;
  omCost_Rs: number;
  netSavings_Rs: number;
  cumulativeCashflow_Rs: number;
}

export interface FinancialSummary {
  totalCapex_Rs: number;
  firstYearNetSavings_Rs: number;
  paybackYears: number | null;
  co2Avoided_tons_per_year: number;
  years: FinancialYearResult[];
  inputs: FinancialInputs;
}

export const computeFinancials = async (inputs: FinancialInputs): Promise<FinancialSummary> => {
  try {
    const response = await apiClient.post('/finance/compute', inputs);
    return response.data;
  } catch (error: any) {
    console.error('Error computing financials:', error);
    throw error;
  }
};