# Quick Start Guide - GeoTIFF Solar Analysis

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
# Navigate to server directory
cd SolarSenseAI/green-it-solar-map/server

# Install backend dependencies (including new geotiff, turf, suncalc)
npm install
```

### Step 2: Verify GeoTIFF Data

Ensure your GeoTIFF files are in:
```
SolarSenseAI/India_GISdata_LTAym_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/
  └── India_GISdata_LTAy_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/
      ├── GHI.tif
      ├── DNI.tif
      ├── DIF.tif
      └── ...
```

### Step 3: Start the Server

```bash
# From server directory
npm run dev
```

The server should start on `http://localhost:5000`

### Step 4: Start the Frontend

```bash
# In a new terminal, navigate to client directory
cd SolarSenseAI/green-it-solar-map/client

# Start frontend (if not already running)
npm start
```

The frontend should open at `http://localhost:3000` (or Vite's default port)

### Step 5: Test the Integration

1. Open the application in your browser
2. Select "Select on Globe" input method
3. Click "Fly to Location" to navigate to India (default: Pune area)
4. Click "Draw Solar Area" 
5. Left-click to add polygon points on the map
6. Right-click to finish drawing
7. The **Solar Analysis Results** panel will appear on the right showing:
   - GHI statistics (mean, min, max)
   - PV system configuration options
   - Energy output estimates (daily/annual)

## ✅ What Works Now

- ✅ Polygon drawing on Cesium globe
- ✅ GeoTIFF sampling for GHI data
- ✅ Zonal statistics (mean, median, min, max)
- ✅ PV energy calculations with presets
- ✅ Tilt correction (POA calculation)
- ✅ Real-time analysis on polygon completion

## 🎯 Next Features to Implement

See `IMPLEMENTATION_SUMMARY.md` for the full roadmap including:
- Cesium heatmap overlay
- Monthly bar charts
- Hourly profiles
- Sunpath visualization
- Shadow analysis

## 🐛 Troubleshooting

### "GeoTIFF file not found" Error

1. Check that the GeoTIFF files exist in the expected location
2. The path is resolved relative to the server directory
3. Check console logs for the exact path being used

### Slow Sampling

- Large polygons or high-resolution rasters may take time
- The system uses adaptive sampling for performance
- Consider preprocessing GeoTIFFs with GDAL overviews

### Frontend Not Showing Results

1. Check browser console for errors
2. Verify backend is running on port 5000
3. Check network tab for API call failures
4. Ensure CORS is enabled (should be in server setup)

## 📞 Support

For detailed implementation notes, see `IMPLEMENTATION_SUMMARY.md`

