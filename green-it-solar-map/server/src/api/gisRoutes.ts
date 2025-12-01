import { Router } from 'express';
import * as gisController from '../controllers/gisController';

const router = Router();

// GIS and GeoTIFF sampling routes
// These routes are mounted at /gis inside the api router (in src/api/index.ts)
// The api router is mounted at /api in server.ts
// So /sample-ghi becomes /api/gis/sample-ghi
router.post('/sample-ghi', (req, res, next) => {
  console.log('✅ /api/gis/sample-ghi route HIT, body:', JSON.stringify(req.body).substring(0, 200));
  gisController.sampleGHI(req, res).catch(next);
});
router.post('/compute-pv', gisController.computePV);
router.post('/monthly-pv', gisController.computeMonthlyPV);
router.get('/presets', gisController.getPresets);

export default router;

