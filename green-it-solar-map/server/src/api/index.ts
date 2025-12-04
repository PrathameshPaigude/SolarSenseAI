import { Router } from 'express';
import predictionRoutes from './predictionRoutes';
import openMeteoRoutes from './openMeteoRoutes';
import gisRoutes from './gisRoutes';
import financialRoutes from './financialRoutes';

const router = Router();

// API routes
router.use('/', predictionRoutes);
router.use('/', openMeteoRoutes);
router.use('/gis', gisRoutes);
router.use('/finance', financialRoutes);

export default router;