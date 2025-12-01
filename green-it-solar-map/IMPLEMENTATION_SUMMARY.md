# SolarSenseAI - GeoTIFF Solar Analysis Implementation Summary

## Overview

This document summarizes the implementation of the GeoTIFF-based solar irradiance analysis system using Global Solar Atlas data for India.

## ✅ Implemented Features

### Backend Services

1. **GeoTIFF Sampling Service** (`server/src/services/geoTiffService.ts`)
   - Zonal statistics (mean, median, min, max, std, count) from polygon sampling
   - Support for multiple layers (GHI, DNI, DIF, GTI, PVOUT, OPTA, TEMP)
   - Monthly PVOUT sampling
   - Robust path resolution for GeoTIFF files

2. **PV Energy Calculator Service** (`server/src/services/pvService.ts`)
   - Basic PV energy calculation: `daily_kWh = area_m2 × GHI × efficiency × PR`
   - PV system presets (small residential, medium commercial, ground-mounted, floating)
   - Monthly breakdown support
   - kWh/kWp calculation

3. **Tilt Correction Service** (`server/src/services/tiltCorrectionService.ts`)
   - Hay-Davies transposition model
   - GHI → POA (Plane-of-Array) conversion
   - Erbs diffuse fraction estimation
   - Sun position calculation using suncalc
   - Angle of incidence calculation

4. **GIS API Endpoints** (`server/src/controllers/gisController.ts`)
   - `POST /api/gis/sample-ghi` - Sample GHI and other layers for polygon
   - `POST /api/gis/compute-pv` - Compute PV energy output
   - `POST /api/gis/monthly-pv` - Compute PV with monthly breakdown
   - `GET /api/gis/presets` - Get available PV system presets

### Frontend Components

1. **SolarAnalysisResults Component** (`client/src/components/gis/SolarAnalysisResults.tsx`)
   - Displays zonal GHI statistics
   - PV system preset selector
   - Real-time PV energy calculations
   - Tilt correction toggle
   - Energy output display (daily, annual, specific yield)

2. **Updated HomePage** (`client/src/pages/HomePage.tsx`)
   - Integrated SolarAnalysisResults component
   - Polygon to GeoJSON conversion
   - Automatic solar analysis on polygon completion

3. **API Service Functions** (`client/src/services/api.ts`)
   - `sampleGHI()` - Sample irradiance layers
   - `computePV()` - Compute PV output
   - `computeMonthlyPV()` - Monthly PV breakdown
   - `getPVPresets()` - Get system presets

## 📊 Available GeoTIFF Layers

Located in: `India_GISdata_LTAym_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/India_GISdata_LTAy_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/`

- **GHI.tif** - Global Horizontal Irradiance (primary)
- **DNI.tif** - Direct Normal Irradiance
- **DIF.tif** - Diffuse Irradiance
- **GTI.tif** - Global Tilted Irradiance
- **PVOUT.tif** - PV Output (annual)
- **OPTA.tif** - Optimum Tilt Angle
- **TEMP.tif** - Temperature
- **monthly/PVOUT_01.tif through PVOUT_12.tif** - Monthly PV output

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
# Backend dependencies
cd SolarSenseAI/green-it-solar-map/server
npm install

# Frontend dependencies (if not already installed)
cd ../client
npm install
```

### 2. Verify GeoTIFF Data Location

The system will automatically search for GeoTIFF files in:
- `../../../../India_GISdata_LTAym_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/...`
- Or relative to `process.cwd()`

Ensure the data folder is in the expected location relative to the server directory.

### 3. Run the Application

```bash
# Start backend server (from server directory)
npm run dev  # or npm start

# Start frontend (from client directory, in a separate terminal)
npm start
```

### 4. Test the API

```bash
# Test preset endpoint
curl http://localhost:5000/api/gis/presets

# Test sampling (requires valid polygon)
curl -X POST http://localhost:5000/api/gis/sample-ghi \
  -H "Content-Type: application/json" \
  -d '{
    "polygonGeoJson": {
      "type": "Polygon",
      "coordinates": [[[73.86, 18.46], [73.87, 18.46], [73.87, 18.47], [73.86, 18.47], [73.86, 18.46]]]
    },
    "layers": ["GHI"]
  }'
```

## 📝 API Usage Examples

### Sample GHI for Polygon

```typescript
const response = await fetch('/api/gis/sample-ghi', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    polygonGeoJson: {
      type: 'Polygon',
      coordinates: [[[lon1, lat1], [lon2, lat2], ...]]
    },
    layers: ['GHI', 'DNI', 'DIF']
  })
});
```

### Compute PV Output

```typescript
const response = await fetch('/api/gis/compute-pv', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    polygonGeoJson: { /* polygon */ },
    area_m2: 100,
    systemConfig: 'smallResidential', // or custom config object
    useTiltCorrection: true,
    latitude: 18.46,
    longitude: 73.86
  })
});
```

## 🚀 Next Steps / Pending Features

### Priority Features (Not Yet Implemented)

1. **Cesium Imagery Overlay**
   - Create XYZ tiles from GeoTIFF for GHI heatmap
   - Overlay as Cesium imagery layer
   - Color ramp legend

2. **Monthly Bar Charts**
   - Display monthly GHI/PVOUT values
   - Seasonal variation visualization
   - Using chart.js

3. **Hourly Profiles**
   - Synthetic hourly irradiance profiles
   - Or integrate NASA POWER API for real hourly data

4. **Sunpath & Horizon Visualization**
   - 2D sunpath plot (elevation vs azimuth)
   - Horizon obstruction visualization
   - Shade analysis

5. **Shadow-Aware Simulation**
   - Hourly shadow casting
   - Integration with Cesium 3D buildings
   - Shading loss calculations

6. **Advanced Features**
   - PDF report export
   - Database storage of predictions
   - Historical analysis
   - User project management

## 📦 Dependencies Added

### Backend
- `geotiff` ^2.1.3 - GeoTIFF file reading
- `@turf/turf` ^7.3.1 - Geospatial operations
- `suncalc` ^1.9.0 - Sun position calculations

### Frontend
- Already had `@turf/turf` and `axios` installed

## 🐛 Known Issues / Limitations

1. **Path Resolution**: GeoTIFF path resolution may need adjustment based on deployment structure
2. **Large Files**: Very large GeoTIFF files may be slow to read (consider preprocessing with GDAL)
3. **Tilt Correction**: Simplified approach - full integration requires hourly calculations
4. **Monthly Data**: Currently uses annual average for monthly breakdown (needs improvement)

## 🔍 Performance Tips

1. **Preprocessing**: Use GDAL to create overviews and tiles for faster serving:
   ```bash
   gdaladdo -r average GHI.tif 2 4 8 16 32
   gdal2tiles.py -z 0-12 -w none GHI.tif ./tiles/
   ```

2. **Caching**: Implement caching for polygon sampling results (key by polygon hash)

3. **Sampling Strategy**: Current implementation uses step-based sampling for large areas

## 📚 References

- Global Solar Atlas: https://globalsolaratlas.info/
- Hay-Davies Transposition Model
- Erbs Diffuse Fraction Model
- GeoTIFF Specification

## 🤝 Contributing

When adding new features:
1. Follow the priority order listed in the main requirements
2. Test with actual GeoTIFF data
3. Update this document with new features
4. Ensure TypeScript types are properly defined

