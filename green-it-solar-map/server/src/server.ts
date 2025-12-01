import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import api from './api'; // Import the central API router

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Debug: Log all requests to see what's being called
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// SIMPLE TEST ROUTE - This MUST work if server is running
app.get('/api/test-route', (req, res) => {
  console.log('✅ TEST ROUTE HIT');
  res.json({ message: 'Server is working! Routes are accessible.', timestamp: new Date().toISOString() });
});

// TEMPORARY: Direct route handler with REAL GeoTIFF sampling
app.post('/api/gis/sample-ghi', async (req, res) => {
  console.log('✅ /api/gis/sample-ghi HIT - Starting GeoTIFF sampling...');
  try {
    const { polygonGeoJson, layers } = req.body;
    
    console.log('Request body received:', {
      hasPolygon: !!polygonGeoJson,
      polygonType: polygonGeoJson?.type,
      layers: layers || 'default',
    });
    
    if (!polygonGeoJson) {
      return res.status(400).json({ error: 'polygonGeoJson is required' });
    }

    // Import GeoTIFF service
    const { sampleGeoTIFFForPolygon, getGeoTIFFPath, sampleMultipleLayers } = await import('./services/geoTiffService');
    
    console.log('GeoTIFF service imported successfully');
    
    const layerNames = layers && Array.isArray(layers) ? layers : ['GHI'];
    console.log('Sampling layers:', layerNames);
    
    // Get path to GHI file for debugging
    const ghiPath = getGeoTIFFPath('GHI');
    console.log('GHI GeoTIFF path:', ghiPath);
    
    // Sample the layers
    const results = await sampleMultipleLayers(layerNames, polygonGeoJson);
    
    console.log('Sampling complete. Results:', Object.keys(results));
    
    if (!results.GHI && layerNames.includes('GHI')) {
      return res.status(404).json({ error: 'Could not sample GHI layer. Check if polygon overlaps with data coverage.' });
    }

    return res.json({
      success: true,
      layers: results,
      polygon: polygonGeoJson,
    });
  } catch (error: any) {
    console.error('❌ Error in sample-ghi:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Failed to sample GeoTIFF data',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Mount the API router (includes all sub-routes like /gis)
// The GIS routes are defined in src/api/gisRoutes.ts and use real GeoTIFF sampling
app.use('/api', api);

// Add a simple test route to verify server is responding
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
  console.log(`API routes available at /api/*`);
});