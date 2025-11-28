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
exports.SolarService = void 0;
const nasaPowerService_1 = require("./nasaPowerService");
class SolarService {
    constructor() {
        this.nasaPower = new nasaPowerService_1.NasaPowerService();
        this.panelEfficiency = 0.20; // 20% panel efficiency
        this.performanceRatio = 0.85; // 85% system efficiency (wiring, inverter losses, etc.)
        this.panelDensityWattsPerSqm = 200; // 200 W/m² panel density
        this.tempCoefficientPct = -0.004; // -0.4% per °C above 25°C
        this.referenceTemp = 25; // °C
        this.costPerKwh = 0.12; // $/kWh
        this.carbonFactorTonsPerKwh = 0.0005; // tons CO2/kWh
    }
    /**
     * Predict hourly energy generation using NASA POWER API data
     * @param areaSqM Area of rooftop in square meters
     * @param location { lat, lng }
     * @param date Optional: YYYY-MM-DD format (default: today)
     * @returns Prediction result with hourly breakdown
     */
    predictEnergyGeneration(areaSqM, location, date) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use provided date or default to today
            const predictionDate = date || new Date().toISOString().split('T')[0];
            // Fetch hourly data from NASA POWER API
            const startDate = nasaPowerService_1.NasaPowerService.formatDateForApi(predictionDate);
            const endDate = startDate; // Single day for now
            const hourlyData = yield this.nasaPower.getHourlyData(location.lat, location.lng, startDate, endDate);
            // Calculate hourly generation with temperature derating
            const hourlyGeneration = this.calculateHourlyGeneration(areaSqM, hourlyData);
            // Sum to daily, monthly, yearly
            const dailyKwh = hourlyGeneration.reduce((sum, h) => sum + h.generationKwh, 0);
            const monthlyKwh = dailyKwh * 30;
            const yearlyKwh = dailyKwh * 365;
            // Calculate carbon and savings
            const carbonReduction = this.calculateCarbonReduction(yearlyKwh);
            const estimatedSavings = this.calculateEstimatedSavings(yearlyKwh);
            return {
                areaSqM,
                dailyGenerationKwh: dailyKwh,
                monthlyGenerationKwh: monthlyKwh,
                yearlyGenerationKwh: yearlyKwh,
                hourlyGeneration,
                carbonReductionTons: carbonReduction,
                estimatedSavings,
                location,
                date: predictionDate,
            };
        });
    }
    /**
     * Calculate hourly generation with temperature derating
     */
    calculateHourlyGeneration(areaSqM, hourlyData) {
        return hourlyData.map((hour) => {
            // Temperature derating: efficiency decreases with temperature
            const tempDifference = hour.temperature - this.referenceTemp;
            const efficiencyDerating = 1 + this.tempCoefficientPct * tempDifference;
            const dertedEfficiency = Math.max(0, this.panelEfficiency * efficiencyDerating);
            // Calculate power output in watts
            const powerWatts = areaSqM *
                hour.ghi *
                dertedEfficiency *
                this.performanceRatio *
                this.panelDensityWattsPerSqm;
            // Convert to kWh (assuming 1 hour period, so divide by 1,000,000 to convert Wh to kWh)
            const generationKwh = (powerWatts * 1) / 1000;
            return {
                timestamp: hour.timestamp,
                irradiance: hour.ghi,
                temperature: hour.temperature,
                efficiencyDerating: efficiencyDerating,
                generationKwh: Math.max(0, generationKwh),
            };
        });
    }
    /**
     * Calculate annual carbon reduction in tons CO2
     */
    calculateCarbonReduction(yearlyEnergyKwh) {
        return yearlyEnergyKwh * this.carbonFactorTonsPerKwh;
    }
    /**
     * Calculate annual cost savings
     */
    calculateEstimatedSavings(yearlyEnergyKwh) {
        return yearlyEnergyKwh * this.costPerKwh;
    }
}
exports.SolarService = SolarService;
