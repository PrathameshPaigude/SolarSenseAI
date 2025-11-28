"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictEnergy = void 0;
const solarService_1 = require("../services/solarService");
const predictEnergy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { area, lat, lng, date } = req.body;
    // Validate required parameters
    if (!area || lat === undefined || lng === undefined) {
        return res.status(400).json({
            error: 'Missing required parameters. Expected: area (m²), lat, lng. Optional: date (YYYY-MM-DD)'
        });
    }
    try {
        const solarService = new solarService_1.SolarService();
        const result = yield solarService.predictEnergyGeneration(area, { lat, lng }, date);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('[Prediction Controller] Error:', error);
        res.status(500).json({
            error: 'Failed to generate prediction',
            details: error.message,
        });
    }
});
exports.predictEnergy = predictEnergy;
