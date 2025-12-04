import { Request, Response } from 'express';
import { computeCarbonData } from '../services/carbonService';

export const calculateCarbon = (req: Request, res: Response) => {
    try {
        const { annual_kWh } = req.body;

        if (annual_kWh === undefined || annual_kWh === null) {
            return res.status(400).json({ error: 'annual_kWh is required' });
        }

        const result = computeCarbonData(Number(annual_kWh));

        return res.json(result);
    } catch (error) {
        console.error('Error calculating carbon data:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
