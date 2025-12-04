import { Request, Response } from 'express';
import * as turf from '@turf/turf';
import { sampleGeoTIFFForPolygon, getGeoTIFFPath, sampleMultipleLayers, ZonalStats } from '../services/geoTiffService';
import { computePVFromZonalStats, PV_SYSTEM_PRESETS, PVSystemPreset, computePVWithMonthly } from '../services/pvService';
import { convertGHIToPOA } from '../services/tiltCorrectionService';

/**
 * POST /api/gis/sample-ghi
 * Sample GHI (and optionally other layers) for a polygon
 */
export async function sampleGHI(req: Request, res: Response) {
  try {
    const { polygonGeoJson, layers } = req.body;

    if (!polygonGeoJson) {
      return res.status(400).json({ error: 'polygonGeoJson is required' });
    }

    // Validate polygon format
    if (!polygonGeoJson.type || polygonGeoJson.type !== 'Polygon' || !polygonGeoJson.coordinates) {
      return res.status(400).json({ error: 'Invalid polygon format. Expected GeoJSON Polygon.' });
    }

    // Sample requested layers or default to ALL available layers (excluding ELE which is missing)
    const allLayers = ['GHI', 'DNI', 'DIF', 'PVOUT', 'GTI', 'OPTA', 'TEMP'];
    const layerNames = layers && Array.isArray(layers) && layers.length > 0 ? layers : allLayers;

    const results = await sampleMultipleLayers(layerNames, polygonGeoJson);

    // Check if GHI failed (critical layer)
    if (!results.GHI && layerNames.includes('GHI')) {
      // If GHI failed but we tried to sample it, it's a problem. 
      // But if we tried to sample everything, maybe just GHI is missing? 
      // Let's be lenient and return what we have, but warn if GHI is missing.
      console.warn('GHI layer sampling failed or returned no data.');
    }

    res.json({
      success: true,
      layers: results,
      polygon: polygonGeoJson,
    });
  } catch (error: any) {
    console.error('Error sampling layers:', error);
    res.status(500).json({
      error: 'Failed to sample GeoTIFF data',
      message: error.message,
    });
  }
}

/**
 * POST /api/gis/compute-pv
 * Compute PV energy output from sampled GHI and system parameters
 */
export async function computePV(req: Request, res: Response) {
  try {
    const {
      polygonGeoJson,
      area_m2,
      ghi_mean, // Optional: if provided, skip sampling (legacy support)
      systemConfig, // PVSystemPreset or custom config
      installed_capacity_kWp,
      useTiltCorrection = false,
      latitude,
      longitude,
      panelTechnology = 'mono',
      gridType = 'on_grid',
      layers: providedLayers, // Optional: pre-sampled layers
    } = req.body;

    // Validate inputs
    if (!area_m2 || area_m2 <= 0) {
      return res.status(400).json({ error: 'area_m2 must be a positive number' });
    }

    let layers: Record<string, ZonalStats> = providedLayers || {};

    // Sample layers if not provided
    if (!providedLayers) {
      if (!polygonGeoJson) {
        // Legacy fallback: if only ghi_mean provided
        if (ghi_mean) {
          layers = {
            GHI: {
              mean: ghi_mean,
              median: ghi_mean,
              min: ghi_mean,
              max: ghi_mean,
              std: 0,
              count: 1,
              units: 'kWh/m²/day'
            }
          };
        } else {
          return res.status(400).json({ error: 'Either layers, polygonGeoJson, or ghi_mean must be provided' });
        }
      } else {
        // Sample ALL layers needed for accurate analysis
        const standardLayers = ['GHI', 'DNI', 'DIF', 'PVOUT', 'GTI', 'OPTA', 'TEMP', 'ELE'];
        const monthlyLayers = Array.from({ length: 12 }, (_, i) => `PVOUT_${String(i + 1).padStart(2, '0')}`);
        const allLayersToSample = [...standardLayers, ...monthlyLayers];

        try {
          layers = await sampleMultipleLayers(allLayersToSample, polygonGeoJson);
        } catch (error) {
          console.error('Error sampling layers:', error);
          // Fallback to just GHI if bulk sampling fails
          const ghiPath = getGeoTIFFPath('GHI');
          const ghiStats = await sampleGeoTIFFForPolygon(ghiPath, polygonGeoJson);
          layers = { GHI: ghiStats };
        }
      }
    }

    // Get system configuration
    let pvConfig: PVSystemPreset;
    if (systemConfig && typeof systemConfig === 'string') {
      // Preset name
      pvConfig = PV_SYSTEM_PRESETS[systemConfig] || PV_SYSTEM_PRESETS.smallResidential;
    } else if (systemConfig && typeof systemConfig === 'object') {
      // Custom config
      pvConfig = {
        name: 'custom',
        displayName: 'Custom',
        panelEfficiency: systemConfig.panelEfficiency ?? 0.18,
        tilt: systemConfig.tilt ?? 25,
        azimuth: systemConfig.azimuth ?? 180,
        performanceRatio: systemConfig.performanceRatio ?? 0.75,
        moduleArea: systemConfig.moduleArea,
        capacity_kWp: systemConfig.capacity_kWp,
        packingFactor: systemConfig.packingFactor,
      };
    } else {
      pvConfig = PV_SYSTEM_PRESETS.smallResidential;
    }

    // Compute PV output using v2.0 function
    const pvResult = computePVFromZonalStats(
      area_m2,
      layers,
      pvConfig,
      {
        installed_capacity_kWp,
        latitude,
        longitude,
        useTiltCorrection,
        panelTechnology,
        gridType,
      }
    );

    res.json({
      success: true,
      pv: pvResult,
      layers: layers, // Return all layers for UI display
      systemConfig: pvConfig,
    });
  } catch (error: any) {
    console.error('Error computing PV:', error);
    res.status(500).json({
      error: 'Failed to compute PV output',
      message: error.message,
    });
  }
}

/**
 * GET /api/gis/presets
 * Get available PV system presets
 */
export async function getPresets(req: Request, res: Response) {
  try {
    res.json({
      success: true,
      presets: PV_SYSTEM_PRESETS,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get presets',
      message: error.message,
    });
  }
}

/**
 * POST /api/gis/monthly-pv
 * Compute PV output with monthly breakdown
 */
export async function computeMonthlyPV(req: Request, res: Response) {
  try {
    const {
      polygonGeoJson,
      area_m2,
      systemConfig,
      installed_capacity_kWp,
    } = req.body;

    if (!polygonGeoJson || !area_m2) {
      return res.status(400).json({ error: 'polygonGeoJson and area_m2 are required' });
    }

    // Sample annual GHI
    const ghiStats = await sampleGeoTIFFForPolygon(getGeoTIFFPath('GHI'), polygonGeoJson);

    // Sample monthly PVOUT (or we can use monthly GHI if available)
    // For now, we'll estimate monthly GHI from annual and use representative values
    // In future, we can sample monthly GeoTIFFs if available
    const monthlyLayers = Array.from({ length: 12 }, (_, i) => `PVOUT_${String(i + 1).padStart(2, '0')}`);
    const monthlyStats = await sampleMultipleLayers(monthlyLayers, polygonGeoJson);

    // Convert monthly PVOUT to approximate monthly GHI
    // This is a simplification - ideally we'd have monthly GHI data
    const monthly_ghi = Array.from({ length: 12 }, (_, i) => {
      const monthKey = `PVOUT_${String(i + 1).padStart(2, '0')}`;
      const monthStats = monthlyStats[monthKey];

      // Rough conversion: assume PVOUT represents monthly energy
      // This would need calibration with actual monthly GHI data
      if (monthStats) {
        // Approximate: monthly PVOUT (kWh/kWp) / 30 days / efficiency / PR ≈ monthly daily GHI
        // This is very approximate
        return ghiStats.mean; // For now, use annual average
      }
      return ghiStats.mean;
    });

    // Get system configuration
    let pvConfig: PVSystemPreset;
    if (systemConfig && typeof systemConfig === 'string') {
      pvConfig = PV_SYSTEM_PRESETS[systemConfig] || PV_SYSTEM_PRESETS.smallResidential;
    } else if (systemConfig && typeof systemConfig === 'object') {
      pvConfig = {
        name: 'custom',
        displayName: 'Custom',
        panelEfficiency: systemConfig.panelEfficiency ?? 0.18,
        tilt: systemConfig.tilt ?? 25,
        azimuth: systemConfig.azimuth ?? 180,
        performanceRatio: systemConfig.performanceRatio ?? 0.75,
        moduleArea: systemConfig.moduleArea,
        capacity_kWp: systemConfig.capacity_kWp,
      };
    } else {
      pvConfig = PV_SYSTEM_PRESETS.smallResidential;
    }

    const pvResult = computePVWithMonthly(
      area_m2,
      ghiStats.mean,
      monthly_ghi,
      pvConfig
    );

    res.json({
      success: true,
      pv: pvResult,
      ghi: ghiStats,
      monthlyStats,
      systemConfig: pvConfig,
    });
  } catch (error: any) {
    console.error('Error computing monthly PV:', error);
    res.status(500).json({
      error: 'Failed to compute monthly PV output',
      message: error.message,
    });
  }
}

