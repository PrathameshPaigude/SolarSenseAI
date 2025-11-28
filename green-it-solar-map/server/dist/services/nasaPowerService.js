"use strict";
/**
 * NASA POWER Hourly API Service
 * Fetches hourly solar irradiance and weather data for rooftop solar predictions
 */
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
exports.NasaPowerService = void 0;
class NasaPowerService {
    constructor() {
        this.baseUrl = 'https://power.larc.nasa.gov/api/temporal/hourly/point';
        this.community = 'ag'; // Agricultural community
        this.format = 'json';
        this.units = 'metric';
        this.header = 'true';
        this.timeStandard = 'lst'; // Local Standard Time
    }
    /**
     * Fetch hourly solar irradiance and weather data from NASA POWER API
     * @param lat Latitude of the location
     * @param lng Longitude of the location
     * @param startDate Start date (YYYYMMDD format)
     * @param endDate End date (YYYYMMDD format)
     * @returns Array of hourly data points
     */
    getHourlyData(lat, lng, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Build query parameters
            const params = new URLSearchParams({
                latitude: lat.toString(),
                longitude: lng.toString(),
                start: startDate,
                end: endDate,
                parameters: 'ALLSKY_SFC_SW_DWN,ALLSKY_SFC_SW_DNI,T2M,RH2M',
                community: this.community,
                format: this.format,
                units: this.units,
                header: this.header,
                'time-standard': this.timeStandard,
                user: 'SolarSenseAI', // Identify your app
            });
            try {
                const url = `${this.baseUrl}?${params.toString()}`;
                console.log(`[NASA POWER] Fetching hourly data from: ${url}`);
                const response = yield fetch(url);
                if (!response.ok) {
                    const errorData = yield response.json();
                    console.error('[NASA POWER] API Error:', errorData);
                    throw new Error(`NASA POWER API error (${response.status}): ${((_a = errorData.messages) === null || _a === void 0 ? void 0 : _a[0]) || errorData.header || response.statusText}`);
                }
                const data = (yield response.json());
                return this.parseHourlyData(data);
            }
            catch (error) {
                console.error('[NASA POWER] Service error:', error);
                throw error;
            }
        });
    }
    /**
     * Parse NASA POWER API response and extract hourly data
     */
    parseHourlyData(data) {
        const ghi = data.properties.parameter.ALLSKY_SFC_SW_DWN;
        const dni = data.properties.parameter.ALLSKY_SFC_SW_DNI;
        const temp = data.properties.parameter.T2M;
        const humidity = data.properties.parameter.RH2M;
        const hourlyData = [];
        // Iterate through timestamps and collect data
        for (const timestamp in ghi) {
            hourlyData.push({
                timestamp,
                ghi: ghi[timestamp] || 0,
                dni: dni[timestamp] || 0,
                temperature: temp[timestamp] || 20, // Default 20°C if missing
                humidity: humidity[timestamp] || 50, // Default 50% if missing
            });
        }
        // Sort by timestamp
        hourlyData.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        console.log(`[NASA POWER] Parsed ${hourlyData.length} hourly data points`);
        return hourlyData;
    }
    /**
     * Helper: Convert date string (YYYY-MM-DD) to API format (YYYYMMDD)
     */
    static formatDateForApi(date) {
        return date.replace(/-/g, '');
    }
    /**
     * Helper: Get today's date in YYYYMMDD format
     */
    static getTodayDateForApi() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }
}
exports.NasaPowerService = NasaPowerService;
