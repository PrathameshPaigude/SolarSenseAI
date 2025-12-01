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
  moduleArea?: number;
  capacity_kWp?: number;
}

export interface PVCalculationResult {
  daily_kWh: number;
  yearly_kWh: number;
  monthly_kWh?: number[];
  kWh_per_kWp_per_year?: number;
  area_m2: number;
  installed_capacity_kWp?: number;
  ghi_mean: number;
  ghi_units: string;
}

/**
 * Sample GHI and other layers for a polygon
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
}) => {
  try {
    const response = await apiClient.post('/gis/compute-pv', params);
    return response.data;
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