# Next Step: Swap Stub for Real GeoTIFF Sampling

## Current Status

✅ Route is working with stub data  
✅ UI can display results  
✅ Data structure is correct

## Step 1: Replace Stub Handler

Currently in `server.ts`, you have a stub handler. To use real GeoTIFF data, you need to:

### Option A: Use the Existing Controller (Recommended)

Remove the stub handler from `server.ts` and let the route go through the router to use the real controller:

1. **Comment out or remove the stub handler in `server.ts`**:
   ```typescript
   // Comment out or delete this block:
   // app.post('/api/gis/sample-ghi', (req, res) => {
   //   // stub code...
   // });
   ```

2. **The route will then use the controller** in `src/controllers/gisController.ts` which already has the real GeoTIFF sampling logic!

3. **Make sure the GeoTIFF path is correct** - The `getGeoTIFFPath()` function in `geoTiffService.ts` will automatically find your GeoTIFF files.

### Option B: Replace Stub with Real Logic Directly

If you prefer to keep it in `server.ts`, replace the stub with:

```typescript
import { sampleGeoTIFFForPolygon, getGeoTIFFPath, sampleMultipleLayers } from './services/geoTiffService';

app.post('/api/gis/sample-ghi', async (req, res) => {
  try {
    const { polygonGeoJson, layers } = req.body;

    if (!polygonGeoJson || polygonGeoJson.type !== 'Polygon') {
      return res.status(400).json({ error: 'polygonGeoJson (GeoJSON Polygon) is required' });
    }

    // Sample requested layers or default to GHI
    const layerNames = layers && Array.isArray(layers) ? layers : ['GHI'];
    
    const results = await sampleMultipleLayers(layerNames, polygonGeoJson);
    
    if (!results.GHI && layerNames.includes('GHI')) {
      return res.status(404).json({ error: 'Could not sample GHI layer. Check if polygon overlaps with data coverage.' });
    }

    return res.json({
      success: true,
      layers: results,
      polygon: polygonGeoJson,
    });
  } catch (err: any) {
    console.error('sample-ghi error:', err);
    return res.status(500).json({
      error: 'Failed to sample GHI',
      details: err?.message || String(err),
    });
  }
});
```

## Step 2: Verify GeoTIFF Path

The `getGeoTIFFPath()` function will search for your GeoTIFF files in these locations:

1. `../../../../India_GISdata_LTAym_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/...`
2. `../../../../../India_GISdata_LTAym_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/...`
3. `../India_GISdata_LTAym_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/...` (from process.cwd())

Make sure your GeoTIFF files are accessible from one of these paths relative to where the server is running.

## Step 3: Test with Real Data

After replacing the stub:

1. Restart server
2. Draw a polygon on the map
3. Check server console for any errors
4. Verify you get real GHI values instead of 5.5

## Troubleshooting

### "GeoTIFF file not found"
- Check the console for the path being used
- Verify the GeoTIFF files are in the expected location
- Update `getGeoTIFFPath()` if needed

### "Invalid array length"
- Usually means the GeoTIFF didn't load correctly
- Check file permissions
- Verify the file isn't corrupted

### "No valid pixels found in polygon"
- The polygon might be outside the GeoTIFF coverage area
- Try drawing a polygon over India (where the data covers)

