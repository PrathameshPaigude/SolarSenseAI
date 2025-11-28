import { Router } from 'express';
import predictionRoutes from './predictionRoutes';
import openMeteoRoutes from './openMeteoRoutes';

const router = Router();

// API routes
router.use('/', predictionRoutes);
router.use('/', openMeteoRoutes);

export default router;