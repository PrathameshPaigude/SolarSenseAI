import { Router } from 'express';
import { calculateCarbon } from '../controllers/carbonController';

const router = Router();

router.post('/calculate', calculateCarbon);

export default router;
