import { Router } from 'express';
import { OpenMeteoService } from '../services/openMeteoService';

const router = Router();
const openMeteoService = new OpenMeteoService();

router.get('/solar-data', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const start = req.query.start as string | undefined;
  const end = req.query.end as string | undefined;

  console.log(`[/api/solar-data] Request: lat=${lat}, lng=${lng}, start=${start}, end=${end}`);

  if (isNaN(lat) || isNaN(lng)) {
    console.error('[/api/solar-data] Invalid coordinates');
    return res.status(400).json({ error: 'Invalid latitude or longitude' });
  }

  try {
    console.log('[/api/solar-data] Calling OpenMeteoService...');
    const data = await openMeteoService.getHourlySolarData(lat, lng, start, end);
    console.log('[/api/solar-data] Got data, sending response...');
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (err: any) {
    console.error('[/api/solar-data] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
