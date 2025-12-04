import { Router } from 'express';
import { computeFinancialSummary, FinancialInputs } from '../services/financialService';

const router = Router();

router.post('/compute', (req, res) => {
    try {
        const inputs: FinancialInputs = req.body;

        // Basic validation
        if (!inputs.systemSize_kWp || !inputs.annualOutput_kWh) {
            return res.status(400).json({ error: 'Missing required inputs: systemSize_kWp, annualOutput_kWh' });
        }

        const summary = computeFinancialSummary(inputs);
        res.json(summary);
    } catch (error: any) {
        console.error('Financial computation error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

export default router;
