# PV Model v2.0 API Examples

This document provides request/response examples for the upgraded PV calculation API (v2.0 - PVWatts-style).

## POST /api/gis/compute-pv

### Request Body

```json
{
  "polygonGeoJson": {
    "type": "Polygon",
    "coordinates": [[
      [73.8567, 18.5204],
      [73.8577, 18.5204],
      [73.8577, 18.5214],
      [73.8567, 18.5214],
      [73.8567, 18.5204]
    ]]
  },
  "area_m2": 150,
  "systemConfig": "smallResidential",
  "useTiltCorrection": true,
  "latitude": 18.5204,
  "longitude": 73.8567,
  "panelTechnology": "mono",
  "gridType": "on_grid"
}
```

**Alternative: Custom System Config**

```json
{
  "area_m2": 150,
  "ghi_mean": 5.2,
  "systemConfig": {
    "panelEfficiency": 0.18,
    "tilt": 25,
    "azimuth": 180,
    "performanceRatio": 0.75,
    "moduleArea": 1.7,
    "modulePowerW": 420,
    "packingFactor": 0.8,
    "dcAcRatio": 1.15,
    "temperatureCoefficient": -0.4,
    "noct": 45
  },
  "useTiltCorrection": false,
  "panelTechnology": "poly",
  "gridType": "hybrid"
}
```

### Response

```json
{
  "success": true,
  "pv": {
    // System Specs
    "num_panels": 70,
    "P_dc_kWp": 29.4,
    "P_ac_kW": 25.57,
    
    // Energy (Raw vs Calibrated)
    "daily_kWh_raw": 78.5,
    "yearly_kWh_raw": 28652.5,
    "yearly_kWh_calibrated": 30125.1,
    
    // Yields
    "specific_yield_kwh_kwp_raw": 974.5,
    "specific_yield_kwh_kwp_calibrated": 1024.7,
    
    // Efficiency & Losses
    "performance_ratio": 0.75,
    "static_losses_PR": 0.75,
    "temperature_corrected_efficiency": 0.132,
    
    // Inputs
    "ghi_mean": 5.2,
    "poa_mean": 5.45,
    "irradiance_units": "kWh/m²/day",
    
    // Calibration
    "pvout_reference_kwh_kwp": 1024.7,
    "pvout_scale_factor": 1.051,
    
    // Legacy compatibility (aliases)
    "area_m2": 150,
    "area_effective_m2": 120,
    "daily_kWh": 78.5,
    "yearly_kWh": 30125.1,
    "monthly_kWh": [2100, 2300, 2800, 3000, 3100, 2900, 2700, 2800, 2900, 2800, 2500, 2200],
    "installed_capacity_kWp": 29.4,
    "n_panels": 70,
    "dc_capacity_kWp": 29.4,
    "ac_capacity_kW": 25.57,
    "kWh_per_kWp_per_year": 1024.7,
    "calibration_scale": 1.051,
    "calibrated_yearly_kWh": 30125.1,
    "calibrated_kWh_per_kWp_per_year": 1024.7,
    "ghi_units": "kWh/m²/day",
    
    // Phase 8: Tech & Grid Model
    "panelTechnology": "mono",
    "gridType": "on_grid",
    "yearly_kWh_usable": 28618.8,
    
    // Model version
    "model_version": "v2.0-pvwatts-style"
  },
  "ghi": {
    "mean": 5.2,
    "median": 5.15,
    "min": 4.8,
    "max": 5.6,
    "std": 0.15,
    "count": 1250,
    "units": "kWh/m²/day"
  },
  "systemConfig": {
    "name": "smallResidential",
    "displayName": "Small Residential",
    "panelEfficiency": 0.17,
    "tilt": 25,
    "azimuth": 180,
    "performanceRatio": 0.75,
    "moduleArea": 1.7,
    "modulePowerW": 420,
    "packingFactor": 0.8,
    "dcAcRatio": 1.15,
    "temperatureCoefficient": -0.4,
    "noct": 45
  },
  "useTiltCorrection": true,
  "effectiveGHI": 5.45,
  "pvout": {
    "mean": 1024.7,
    "median": 1020.0,
    "min": 980.0,
    "max": 1080.0,
    "std": 25.0,
    "count": 1250,
    "units": "kWh/kWp/year"
  }
}
```

## Key Features

### 1. Raw vs Calibrated Energy

- **Raw**: Calculated from GHI/POA using model parameters
- **Calibrated**: Scaled using PVOUT reference data (Solargis)
- Always prefer `yearly_kWh_calibrated` for final results

### 2. Effective Area

- `area_effective_m2` = `area_m2` × `packingFactor`
- Used for energy calculations (accounts for gaps, walkways)

### 3. System Capacity

- `num_panels`: Calculated from effective area and module size
- `P_dc_kWp`: DC capacity (num_panels × modulePowerW / 1000)
- `P_ac_kW`: AC capacity (P_dc_kWp / dcAcRatio)

### 4. Irradiance

- `ghi_mean`: Global Horizontal Irradiance (always present)
- `poa_mean`: Plane-of-Array irradiance (if tilt correction used)
- Energy calculation uses POA if available, otherwise GHI

### 5. Temperature Correction

- Uses NOCT model: `T_cell = T_amb + (NOCT - 20) / 800 × G_eff`
- Applies temperature coefficient to efficiency
- Requires ambient temperature (from TEMP layer or external source)

### 6. Calibration

- Compares model-specific yield to PVOUT reference
- Scale factor: `pvout_reference_kwh_kwp / specific_yield_kwh_kwp_raw`
- Applied to both yearly energy and specific yield

### 7. Phase 8: Tech & Grid Model

- **Panel Technology**: `mono`, `poly`, `thinfilm`
  - Affects temperature coefficient and NOCT
- **Grid Type**: `on_grid`, `hybrid`, `off_grid`
  - Affects usable energy fraction:
    - `on_grid`: 95% usable
    - `hybrid`: 85% usable
    - `off_grid`: 75% usable

## Field Mapping (Legacy Compatibility)

The response includes both new v2.0 fields and legacy aliases:

| v2.0 Field | Legacy Alias |
|------------|--------------|
| `num_panels` | `n_panels` |
| `P_dc_kWp` | `installed_capacity_kWp`, `dc_capacity_kWp` |
| `P_ac_kW` | `ac_capacity_kW` |
| `yearly_kWh_calibrated` | `yearly_kWh`, `calibrated_yearly_kWh` |
| `specific_yield_kwh_kwp_calibrated` | `kWh_per_kWp_per_year`, `calibrated_kWh_per_kWp_per_year` |
| `pvout_scale_factor` | `calibration_scale` |
| `irradiance_units` | `ghi_units` |

## Validation Notes

- Model validated against PVGIS for 1 kWp systems
- Target accuracy: within 3-5% of PVGIS results
- Calibration using Solargis PVOUT improves accuracy to ±2%

## Example Use Cases

### 1. Basic Calculation (No Tilt Correction)

```json
{
  "area_m2": 100,
  "ghi_mean": 5.0,
  "systemConfig": "smallResidential"
}
```

### 2. With Tilt Correction

```json
{
  "area_m2": 100,
  "polygonGeoJson": {...},
  "systemConfig": "mediumCommercial",
  "useTiltCorrection": true,
  "latitude": 18.5204,
  "longitude": 73.8567
}
```

### 3. Phase 8: Tech & Grid Model

```json
{
  "area_m2": 200,
  "polygonGeoJson": {...},
  "systemConfig": "groundMounted",
  "panelTechnology": "mono",
  "gridType": "off_grid"
}
```

