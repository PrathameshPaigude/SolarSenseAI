# Complete Calculation Formulas and Data Sources Documentation

## Table of Contents
1. [Data Sources](#data-sources)
2. [Core PV Energy Calculation Formulas](#core-pv-energy-calculation-formulas)
3. [Monthly GHI Estimation Formula](#monthly-ghi-estimation-formula)
4. [Tilt Correction (POA) Formulas](#tilt-correction-poa-formulas)
5. [GeoTIFF Data Processing](#geotiff-data-processing)
6. [Financial Projection Formulas](#financial-projection-formulas)
7. [Variable Definitions](#variable-definitions)
8. [API Endpoints](#api-endpoints)
9. [Calculation Flow](#calculation-flow)

---

## Data Sources

### 1. GeoTIFF Files (Global Solar Atlas)
**Source:** Global Solar Atlas (https://globalsolaratlas.info/)
**Location:** `India_GISdata_LTAy_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/`

**Available Layers:**
- **GHI** (Global Horizontal Irradiance): `GHI.tif`
  - Units: kWh/m²/day
  - Description: Average daily global horizontal irradiance
  - Formula Source: Long-term average from satellite data

- **DNI** (Direct Normal Irradiance): `DNI.tif`
  - Units: kWh/m²/day
  - Description: Direct beam irradiance on a surface normal to the sun

- **DIF** (Diffuse Horizontal Irradiance): `DIF.tif`
  - Units: kWh/m²/day
  - Description: Diffuse sky irradiance on horizontal surface

- **PVOUT** (PV Output): `PVOUT.tif`
  - Units: kWh/kWp/year
  - Description: Specific photovoltaic power output

- **GTI** (Global Tilted Irradiance): `GTI.tif`
  - Units: kWh/m²/day
  - Description: Global irradiance on optimally tilted surface

- **OPTA** (Optimal Tilt Angle): `OPTA.tif`
  - Units: degrees
  - Description: Optimal tilt angle for maximum annual energy

- **TEMP** (Temperature): `TEMP.tif`
  - Units: °C
  - Description: Average air temperature

### 2. Open-Meteo Satellite API
**Base URL:** `https://satellite-api.open-meteo.com/v1/archive`

**Endpoint:** `/archive`
**Method:** GET

**Parameters:**
- `latitude`: Site latitude (decimal degrees)
- `longitude`: Site longitude (decimal degrees)
- `hourly`: Comma-separated list of parameters:
  - `shortwave_radiation` (W/m²)
  - `direct_radiation` (W/m²)
  - `shortwave_radiation_instant` (W/m²)
  - `direct_radiation_instant` (W/m²)
  - `global_tilted_irradiance_instant` (W/m²)
  - `terrestrial_radiation_instant` (W/m²)
  - `terrestrial_radiation` (W/m²)
  - `global_tilted_irradiance` (W/m²)
- `models`: `satellite_radiation_seamless`
- `timezone`: `auto`
- `start`: Start date (YYYY-MM-DD)
- `end`: End date (YYYY-MM-DD)

**Example Request:**
```
GET https://satellite-api.open-meteo.com/v1/archive?latitude=18.5196&longitude=73.8554&hourly=shortwave_radiation,direct_radiation,shortwave_radiation_instant,direct_radiation_instant,global_tilted_irradiance_instant,terrestrial_radiation_instant,terrestrial_radiation,global_tilted_irradiance&models=satellite_radiation_seamless&timezone=auto&start=2025-12-02&end=2025-12-02
```

**Response Format:**
```json
{
  "latitude": 18.5,
  "longitude": 73.85,
  "hourly": {
    "time": ["2025-12-02T00:00", "2025-12-02T01:00", ...],
    "shortwave_radiation": [0.0, 0.0, ...],
    "direct_radiation": [null, null, ...],
    "global_tilted_irradiance": [null, null, ...],
    ...
  }
}
```

---

## Core PV Energy Calculation Formulas

### Formula 1: Daily Energy Output
**Function:** `computeSimplePV()`

```
daily_kWh = area_m2 × GHI_mean × panelEfficiency × performanceRatio
```

**Where:**
- `daily_kWh`: Daily energy output (kWh)
- `area_m2`: Rooftop area in square meters
- `GHI_mean`: Average daily Global Horizontal Irradiance (kWh/m²/day)
- `panelEfficiency`: Panel conversion efficiency (0-1, typically 0.17-0.19)
- `performanceRatio`: System performance ratio (0-1, typically 0.75-0.80)

**Example:**
```
area_m2 = 100 m²
GHI_mean = 5.5 kWh/m²/day
panelEfficiency = 0.18
performanceRatio = 0.75

daily_kWh = 100 × 5.5 × 0.18 × 0.75 = 74.25 kWh/day
```

### Formula 2: Annual Energy Output
```
yearly_kWh = daily_kWh × 365
```

**Example:**
```
yearly_kWh = 74.25 × 365 = 27,101.25 kWh/year
```

### Formula 3: Specific Yield (kWh per kWp)
```
kWh_per_kWp_per_year = yearly_kWh / installed_capacity_kWp
```

**Where:**
- `installed_capacity_kWp`: Installed capacity in kilowatts peak

**Example:**
```
yearly_kWh = 27,101.25 kWh
installed_capacity_kWp = 18 kWp

kWh_per_kWp_per_year = 27,101.25 / 18 = 1,505.6 kWh/kWp/year
```

### Formula 4: Installed Capacity Calculation
```
installed_capacity_kWp = (area_m2 / moduleArea) × (moduleArea × panelEfficiency × 1000) / 1000
```

**Simplified:**
```
installed_capacity_kWp = area_m2 × panelEfficiency × 1000 / 1000
installed_capacity_kWp = area_m2 × panelEfficiency
```

**Example:**
```
area_m2 = 100 m²
panelEfficiency = 0.18

installed_capacity_kWp = 100 × 0.18 = 18 kWp
```

---

## Monthly GHI Estimation Formula

### Formula 5: Monthly GHI from Annual Average
**Function:** `estimateMonthlyGHI()`

**Step 1: Base Seasonal Factors (Northern Hemisphere)**
```
baseFactors = [0.85, 0.90, 1.05, 1.10, 1.15, 1.20, 1.15, 1.10, 1.05, 0.95, 0.90, 0.85]
```
- Index 0 = January, Index 11 = December
- Values represent multipliers relative to annual average

**Step 2: Variation Factor Based on Latitude**
```
absLat = |latitude|

if absLat < 15°:
    variationFactor = 0.05  (Tropical: ±5% variation)
else if absLat < 30°:
    variationFactor = 0.10  (Subtropical: ±10% variation)
else if absLat < 45°:
    variationFactor = 0.15  (Mid-latitude: ±15% variation)
else:
    variationFactor = 0.20  (High latitude: ±20% variation)
```

**Step 3: Apply Variation to Base Factors**
```
monthlyFactors[i] = 1.0 + (baseFactors[i] - 1.0) × variationFactor
```

**Step 4: Normalize to Ensure Annual Average**
```
sum = Σ(monthlyFactors[i]) for i = 0 to 11
normalizedFactors[i] = monthlyFactors[i] × (12 / sum)
```

**Step 5: Adjust for Southern Hemisphere**
```
if latitude < 0:
    finalFactors = [normalizedFactors[6..11], normalizedFactors[0..5]]
else:
    finalFactors = normalizedFactors
```

**Step 6: Calculate Monthly GHI**
```
monthly_GHI[i] = annualGHI × finalFactors[i]
```

**Example:**
```
annualGHI = 5.5 kWh/m²/day
latitude = 18.5° (Pune, India)

absLat = 18.5
variationFactor = 0.10 (subtropical)

baseFactors = [0.85, 0.90, 1.05, 1.10, 1.15, 1.20, 1.15, 1.10, 1.05, 0.95, 0.90, 0.85]

monthlyFactors[0] = 1.0 + (0.85 - 1.0) × 0.10 = 1.0 - 0.015 = 0.985
monthlyFactors[5] = 1.0 + (1.20 - 1.0) × 0.10 = 1.0 + 0.02 = 1.02

After normalization:
monthly_GHI[0] = 5.5 × 0.985 ≈ 5.42 kWh/m²/day (January)
monthly_GHI[5] = 5.5 × 1.02 ≈ 5.61 kWh/m²/day (June)
```

### Formula 6: Monthly Energy Output
```
monthly_kWh[i] = area_m2 × monthly_GHI[i] × daysInMonth[i] × panelEfficiency × performanceRatio
```

**Where:**
```
daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
```

**Example:**
```
area_m2 = 100 m²
monthly_GHI[0] = 5.42 kWh/m²/day
daysInMonth[0] = 31
panelEfficiency = 0.18
performanceRatio = 0.75

monthly_kWh[0] = 100 × 5.42 × 31 × 0.18 × 0.75 = 2,268.4 kWh (January)
```

---

## Tilt Correction (POA) Formulas

### Formula 7: Solar Declination
```
declination = 23.45° × sin(360° × (284 + dayOfYear) / 365)
```

**Where:**
- `dayOfYear`: Day of year (1-365)
- For annual average, typically use day 183 (mid-year)

### Formula 8: Solar Elevation at Noon
```
solarElevationNoon = 90° - |latitude - declination|
```

### Formula 9: Air Mass
```
airMass = 1 / (sin(solarElevationRad) + 0.15 × (solarElevationNoon + 3.885)^(-1.253))
```

### Formula 10: Clear-Sky GHI Estimate
```
clearSkyGHI = 1000 × sin(solarElevationRad) × exp(-0.0001184 × airMass × 1013.25)
```

**Units:** W/m²

### Formula 11: Clearness Index
```
kt = GHI / clearSkyGHI
```

### Formula 12: Erbs Diffuse Fraction Model
```
if kt ≤ 0:
    diffuseFraction = 1.0
else if kt ≥ 0.8:
    diffuseFraction = 0.165
else if kt ≤ 0.22:
    diffuseFraction = 1.0 - 0.09 × kt
else if kt ≤ 0.8:
    diffuseFraction = 0.9511 - 0.1604×kt + 4.388×kt² - 16.638×kt³ + 12.336×kt⁴
```

### Formula 13: Diffuse Irradiance
```
DIF = GHI × diffuseFraction
```

### Formula 14: Direct Normal Irradiance (from GHI and DIF)
```
solarZenith = 90° - solarElevation

if solarZenith > 85°:
    DNI = 0
else:
    DNI = max(0, (GHI - DIF) / cos(solarZenith))
```

### Formula 15: Angle of Incidence
**Surface Normal Vector:**
```
nx = sin(tilt) × sin(azimuth)
ny = sin(tilt) × cos(azimuth)
nz = cos(tilt)
```

**Sun Direction Vector:**
```
sx = cos(solarElevation) × sin(solarAzimuth)
sy = cos(solarElevation) × cos(solarAzimuth)
sz = sin(solarElevation)
```

**Angle of Incidence:**
```
cos(incidenceAngle) = nx×sx + ny×sy + nz×sz
incidenceAngle = arccos(cos(incidenceAngle))
```

### Formula 16: Anisotropic Index
```
ai = DNI / (1367 × cos(solarZenith))
aiClamped = max(0, min(1, ai))
```

**Where:**
- 1367 W/m² is the solar constant (extraterrestrial irradiance)

### Formula 17: Beam Component (Hay-Davies Model)
```
beamComponent = DNI × max(0, cos(incidenceAngle))
```

### Formula 18: Beam Transposition Factor
```
rb = max(0, cos(incidenceAngle)) / max(0.087, cos(solarZenith))
```

### Formula 19: Diffuse Component (Hay-Davies Model)
```
diffuseComponent = DIF × (
    aiClamped × rb +
    (1 - aiClamped) × ((1 + cos(tilt)) / 2)
)
```

### Formula 20: Ground-Reflected Component
```
albedo = 0.2  (typical ground reflectance)
groundReflectedComponent = GHI × albedo × ((1 - cos(tilt)) / 2)
```

### Formula 21: Plane-of-Array (POA) Irradiance
```
POA = beamComponent + diffuseComponent + groundReflectedComponent
```

**Example:**
```
GHI = 5.5 kWh/m²/day
DNI = 4.2 kWh/m²/day
DIF = 1.3 kWh/m²/day
tilt = 25°
azimuth = 180° (South)
latitude = 18.5°
longitude = 73.85°

After calculations:
POA ≈ 6.2 kWh/m²/day
```

---

## GeoTIFF Data Processing

### Formula 22: Coordinate to Pixel Conversion
```
x = ((longitude - imageMinX) / (imageMaxX - imageMinX)) × (width - 1)
y = ((imageMaxY - latitude) / (imageMaxY - imageMinY)) × (height - 1)
```

**Where:**
- `imageMinX, imageMinY, imageMaxX, imageMaxY`: GeoTIFF bounding box
- `width, height`: Image dimensions in pixels

### Formula 23: Zonal Statistics
**Mean:**
```
mean = (Σ pixelValues) / count
```

**Median:**
```
median = middle value of sorted pixelValues
```

**Min:**
```
min = minimum(pixelValues)
```

**Max:**
```
max = maximum(pixelValues)
```

**Standard Deviation:**
```
std = sqrt(Σ(pixelValue - mean)² / count)
```

**Count:**
```
count = number of valid pixels within polygon
```

---

## Financial Projection Formulas

### Formula 24: Total Capital Expenditure (CAPEX)
```
totalCapex = initialCapacity_kWp × capexPerKw
```

**Where:**
- `capexPerKw`: Capital cost per kWp (typically ₹40,000 - ₹60,000 in India)

### Formula 25: Annual Output with Degradation
```
output_year_n = initialAnnualOutput × (0.995)^(n-1)
```

**Where:**
- 0.995 represents 0.5% annual degradation
- `n`: Year number (1, 2, 3, ...)

### Formula 26: Current Tariff with Inflation
```
currentTariff_year_n = tariff × (1 + inflation/100)^(n-1)
```

**Where:**
- `inflation`: Annual inflation rate (typically 3-5%)

### Formula 27: Annual Savings
```
savings_year_n = output_year_n × currentTariff_year_n
```

### Formula 28: Operations & Maintenance Cost
```
omCost_year_n = initialCapacity_kWp × omCostPerKw × (1.03)^(n-1)
```

**Where:**
- `omCostPerKw`: O&M cost per kWp per year (typically ₹500-1,000)
- 1.03 represents 3% annual O&M cost inflation

### Formula 29: Net Savings
```
netSavings_year_n = savings_year_n - omCost_year_n
```

### Formula 30: Cumulative Cashflow
```
cumulativeCashflow_year_0 = -totalCapex
cumulativeCashflow_year_n = cumulativeCashflow_year_(n-1) + netSavings_year_n
```

### Formula 31: Payback Period
```
paybackYear = n + (|cumulativeCashflow_year_(n-1)| / netSavings_year_n)
```

**Where:**
- `n`: First year where cumulative cashflow becomes positive

### Formula 32: Return on Investment (ROI)
```
ROI = ((cumulativeCashflow_final + totalCapex) / totalCapex) × 100%
```

---

## Variable Definitions

### Input Variables
| Variable | Symbol | Unit | Description | Source |
|----------|--------|------|-------------|--------|
| Rooftop Area | `area_m2` | m² | Total rooftop area | User input / Polygon drawing |
| Latitude | `lat` | degrees | Site latitude | User input / Polygon centroid |
| Longitude | `lon` | degrees | Site longitude | User input / Polygon centroid |
| Panel Efficiency | `η` | 0-1 | Panel conversion efficiency | System preset (0.17-0.19) |
| Performance Ratio | `PR` | 0-1 | System performance ratio | System preset (0.75-0.80) |
| Tilt Angle | `β` | degrees | Panel tilt from horizontal | System preset (15-25°) |
| Azimuth Angle | `γ` | degrees | Panel orientation (0=N, 180=S) | System preset (180° = South) |
| Module Area | `A_module` | m² | Area per solar module | System preset (1.7 m²) |

### Calculated Variables
| Variable | Symbol | Unit | Description | Formula |
|----------|--------|------|-------------|---------|
| Daily Energy | `E_daily` | kWh | Daily energy output | Formula 1 |
| Annual Energy | `E_yearly` | kWh | Annual energy output | Formula 2 |
| Monthly Energy | `E_monthly[i]` | kWh | Monthly energy output | Formula 6 |
| Installed Capacity | `P_kWp` | kWp | Installed capacity | Formula 4 |
| Specific Yield | `Y_specific` | kWh/kWp/year | Energy per unit capacity | Formula 3 |
| POA Irradiance | `POA` | kWh/m²/day | Plane-of-Array irradiance | Formula 21 |

### GeoTIFF Variables
| Variable | Symbol | Unit | Description |
|----------|--------|------|-------------|
| GHI | `GHI` | kWh/m²/day | Global Horizontal Irradiance |
| DNI | `DNI` | kWh/m²/day | Direct Normal Irradiance |
| DIF | `DIF` | kWh/m²/day | Diffuse Horizontal Irradiance |
| PVOUT | `PVOUT` | kWh/kWp/year | PV specific output |
| GTI | `GTI` | kWh/m²/day | Global Tilted Irradiance |
| OPTA | `OPTA` | degrees | Optimal tilt angle |
| TEMP | `T` | °C | Average temperature |

---

## API Endpoints

### Backend API (Express Server)
**Base URL:** `http://localhost:5000/api`

#### 1. Sample GHI
**Endpoint:** `POST /api/gis/sample-ghi`
**Request Body:**
```json
{
  "polygonGeoJson": {
    "type": "Polygon",
    "coordinates": [[[lon1, lat1], [lon2, lat2], ...]]
  },
  "layers": ["GHI", "DNI", "DIF", "PVOUT", "GTI", "OPTA", "TEMP"]
}
```
**Response:**
```json
{
  "success": true,
  "layers": {
    "GHI": {
      "mean": 5.5,
      "median": 5.4,
      "min": 4.8,
      "max": 6.2,
      "std": 0.3,
      "count": 1250,
      "units": "kWh/m²/day"
    },
    ...
  }
}
```

#### 2. Compute PV
**Endpoint:** `POST /api/gis/compute-pv`
**Request Body:**
```json
{
  "polygonGeoJson": {...},
  "area_m2": 100,
  "ghi_mean": 5.5,
  "systemConfig": {
    "panelEfficiency": 0.18,
    "tilt": 25,
    "azimuth": 180,
    "performanceRatio": 0.75
  },
  "useTiltCorrection": false,
  "latitude": 18.5,
  "longitude": 73.85
}
```
**Response:**
```json
{
  "success": true,
  "pv": {
    "daily_kWh": 74.25,
    "yearly_kWh": 27,101.25,
    "monthly_kWh": [2268, 2345, ...],
    "kWh_per_kWp_per_year": 1505.6,
    "area_m2": 100,
    "installed_capacity_kWp": 18,
    "ghi_mean": 5.5,
    "ghi_units": "kWh/m²/day"
  }
}
```

#### 3. Get Hourly Irradiance
**Endpoint:** `GET /api/solar-data`
**Query Parameters:**
- `lat`: Latitude
- `lng`: Longitude
- `start`: Start date (YYYY-MM-DD)
- `end`: End date (YYYY-MM-DD)

**Response:** Open-Meteo API response format

---

## Calculation Flow

### Step-by-Step Process

1. **User Input**
   - Draw polygon on globe OR enter coordinates + area
   - Select PV system preset

2. **GeoTIFF Sampling**
   - Convert polygon to pixel coordinates
   - Sample all pixels within polygon
   - Calculate zonal statistics (mean, median, min, max, std)

3. **GHI Processing**
   - Extract GHI mean value
   - Optionally extract DNI and DIF for tilt correction

4. **Tilt Correction (Optional)**
   - Calculate sun position
   - Apply Hay-Davies transposition model
   - Convert GHI to POA irradiance

5. **Monthly GHI Estimation**
   - Estimate monthly GHI from annual average
   - Apply latitude-based seasonal variation

6. **PV Energy Calculation**
   - Calculate daily energy: `E_daily = area × GHI × η × PR`
   - Calculate annual energy: `E_yearly = E_daily × 365`
   - Calculate monthly energy: `E_monthly[i] = area × GHI_monthly[i] × days[i] × η × PR`

7. **Capacity Calculation**
   - Calculate installed capacity: `P_kWp = area × η`
   - Calculate specific yield: `Y = E_yearly / P_kWp`

8. **Financial Projection**
   - Calculate CAPEX
   - Project annual output with degradation
   - Calculate savings and O&M costs
   - Compute payback period and ROI

---

## References

1. **Global Solar Atlas:** https://globalsolaratlas.info/
2. **Open-Meteo API:** https://open-meteo.com/
3. **Hay-Davies Model:** Duffie, J.A., Beckman, W.A. (2013). "Solar Engineering of Thermal Processes"
4. **Erbs Model:** Erbs, D.G., et al. (1982). "Estimation of the diffuse radiation fraction for hourly, daily and monthly-average global radiation"
5. **IEC 61724:** Photovoltaic system performance monitoring

---

## System Presets

### Small Residential
- Panel Efficiency: 17%
- Tilt: 25°
- Azimuth: 180° (South)
- Performance Ratio: 0.75
- Module Area: 1.7 m²

### Medium Commercial
- Panel Efficiency: 18%
- Tilt: 25°
- Azimuth: 180° (South)
- Performance Ratio: 0.78
- Module Area: 1.7 m²

### Ground-Mounted
- Panel Efficiency: 19%
- Tilt: 25°
- Azimuth: 180° (South)
- Performance Ratio: 0.80
- Module Area: 1.7 m²

### Floating Solar
- Panel Efficiency: 18%
- Tilt: 15°
- Azimuth: 180° (South)
- Performance Ratio: 0.77
- Module Area: 1.7 m²

---

## Notes

1. **Monthly Estimation:** The monthly GHI estimation is approximate and based on typical seasonal patterns. For accurate monthly data, actual monthly GeoTIFF files should be used.

2. **Tilt Correction:** The tilt correction uses a representative sun position (summer solstice) for annual calculations. For precise results, hourly integration should be performed.

3. **Performance Ratio:** Includes losses from:
   - Inverter efficiency (~95%)
   - DC cable losses (~2%)
   - AC cable losses (~1%)
   - Shading (~2%)
   - Soiling (~3%)
   - Temperature derating (~5%)
   - Other losses (~2%)

4. **Degradation:** Typical solar panel degradation is 0.5-0.7% per year. The system uses 0.5% as default.

5. **Financial Assumptions:**
   - CAPEX: ₹40,000-60,000 per kWp (India)
   - O&M: ₹500-1,000 per kWp per year
   - Tariff: Varies by region (typically ₹3-8 per kWh)
   - Inflation: 3-5% per year

---

*Last Updated: December 2025*

