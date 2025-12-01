import { Router } from 'express';
import predictionRoutes from './predictionRoutes';
import openMeteoRoutes from './openMeteoRoutes';
import gisRoutes from './gisRoutes'; // Import GIS routes

const router = Router();

// API routes
router.use('/', predictionRoutes);
router.use('/', openMeteoRoutes);
// Mount GIS routes at /gis - so /api/gis/* becomes available
router.use('/gis', gisRoutes);

export default router;