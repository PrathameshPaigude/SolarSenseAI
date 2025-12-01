import * as fs from 'fs';
import * as path from 'path';
import { fromFile, fromArrayBuffer, GeoTIFF, MultiGeoTIFF } from 'geotiff';
import * as turf from '@turf/turf';

// GeoJSON Polygon type
interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface ZonalStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
  count: number;
  units: string;
}

/**
 * Sample GeoTIFF raster for a polygon and compute zonal statistics
 * @param geoTiffPath Path to the GeoTIFF file
 * @param polygonGeoJson Polygon in GeoJSON format
 * @returns Zonal statistics (mean, median, min, max, std, count)
 */
export async function sampleGeoTIFFForPolygon(
  geoTiffPath: string,
  polygonGeoJson: GeoJSONPolygon
): Promise<ZonalStats> {
  // Check if file exists
  if (!fs.existsSync(geoTiffPath)) {
    throw new Error(`GeoTIFF file not found: ${geoTiffPath}`);
  }

  // Read GeoTIFF file
  const fileBuffer = fs.readFileSync(geoTiffPath);
  const tiff: GeoTIFF = await fromArrayBuffer(fileBuffer.buffer);
  const image = await tiff.getImage();

  const width = image.getWidth();
  const height = image.getHeight();
  const bbox = image.getBoundingBox(); // [minX, minY, maxX, maxY]
  const [imageMinX, imageMinY, imageMaxX, imageMaxY] = bbox;

  // Get units from metadata if available
  let units = 'kWh/m²/day';
  try {
    const fileDirectory = image.getFileDirectory();
    if (fileDirectory.GeoAsciiParamsTag) {
      const params = Array.isArray(fileDirectory.GeoAsciiParamsTag)
        ? fileDirectory.GeoAsciiParamsTag.join('')
        : fileDirectory.GeoAsciiParamsTag;
      if (params.includes('kWh/m²')) units = 'kWh/m²/day';
      if (params.includes('W/m²')) units = 'W/m²';
    }
  } catch (e) {
    // Ignore metadata parsing errors
  }

  // Coordinate transformation functions
  const lonToX = (lon: number): number => {
    return ((lon - imageMinX) / (imageMaxX - imageMinX)) * (width - 1);
  };

  const latToY = (lat: number): number => {
    // Note: GeoTIFF typically has Y increasing downward (top-left origin)
    return ((imageMaxY - lat) / (imageMaxY - imageMinY)) * (height - 1);
  };

  // Get polygon bounding box for optimization
  const polygonFeature = turf.polygon(polygonGeoJson.coordinates);
  const [polyMinX, polyMinY, polyMaxX, polyMaxY] = turf.bbox(polygonFeature);

  // Calculate pixel range to sample (with padding)
  const xMin = Math.max(0, Math.floor(lonToX(polyMinX)));
  const xMax = Math.min(width - 1, Math.ceil(lonToX(polyMaxX)));
  const yMin = Math.max(0, Math.floor(latToY(polyMaxY))); // Note: Y axis flip
  const yMax = Math.min(height - 1, Math.ceil(latToY(polyMinY)));

  // Ensure valid window
  if (xMin > xMax || yMin > yMax) {
    throw new Error('Polygon is outside GeoTIFF coverage area');
  }

  // Read only the window of interest
  const windowWidth = xMax - xMin + 1;
  const windowHeight = yMax - yMin + 1;

  // readRasters returns array of TypedArrays (one per band)
  const rastersResult = await image.readRasters({
    window: [xMin, yMin, xMax + 1, yMax + 1],
    interleave: false
  });
  const nodata = image.getGDALNoData();

  let rasterArray: number[];

  if (Array.isArray(rastersResult) && rastersResult.length > 0) {
    const firstBand = rastersResult[0];
    // Convert TypedArray to regular array
    if (firstBand && typeof (firstBand as any).length === 'number') {
      rasterArray = Array.from(firstBand as ArrayLike<number>);
    } else {
      throw new Error('Unexpected raster band format');
    }
  } else {
    throw new Error('No raster bands found in GeoTIFF');
  }

  const values: number[] = [];

  // Sample pixels within polygon
  // Use a sampling strategy: every Nth pixel for large areas
  // Since we only read the window, we iterate relative to the window
  const step = Math.max(1, Math.floor(Math.sqrt(windowWidth * windowHeight) / 500));

  for (let y = 0; y < windowHeight; y += step) {
    for (let x = 0; x < windowWidth; x += step) {
      // Global pixel coordinates
      const globalX = xMin + x;
      const globalY = yMin + y;

      // Convert pixel coordinates to geographic coordinates
      const lon = imageMinX + (globalX + 0.5) * (imageMaxX - imageMinX) / width;
      const lat = imageMaxY - (globalY + 0.5) * (imageMaxY - imageMinY) / height;

      // Check if point is inside polygon
      const point = turf.point([lon, lat]);
      const polygonFeature = turf.polygon(polygonGeoJson.coordinates);
      if (turf.booleanPointInPolygon(point, polygonFeature)) {
        const idx = y * windowWidth + x;
        if (idx >= 0 && idx < rasterArray.length) {
          const v = rasterArray[idx];
          // Check for valid data (not nodata, not null, not NaN)
          if (
            v !== nodata &&
            v != null &&
            !Number.isNaN(v) &&
            isFinite(v) &&
            typeof v === 'number' &&
            v > -9999 // Common nodata value
          ) {
            values.push(v);
          }
        }
      }
    }
  }

  // Fallback: If no pixels found (e.g. polygon is smaller than one pixel), sample the centroid
  if (values.length === 0) {
    const polygonFeature = turf.polygon(polygonGeoJson.coordinates);
    const centroid = turf.centroid(polygonFeature);
    const [cLon, cLat] = centroid.geometry.coordinates;

    // Convert centroid to pixel coordinates
    const cX = Math.floor(lonToX(cLon));
    const cY = Math.floor(latToY(cLat));

    // Check if centroid is within the window we read
    if (cX >= xMin && cX <= xMax && cY >= yMin && cY <= yMax) {
      const localX = cX - xMin;
      const localY = cY - yMin;
      const idx = localY * windowWidth + localX;

      if (idx >= 0 && idx < rasterArray.length) {
        const v = rasterArray[idx];
        if (v !== nodata && v != null && !Number.isNaN(v) && isFinite(v) && v > -9999) {
          values.push(v);
        }
      }
    }
  }

  if (values.length === 0) {
    throw new Error('No valid pixels found in polygon. Check if polygon overlaps with GeoTIFF coverage area.');
  }

  // Compute statistics
  values.sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / values.length;
  const median = values.length % 2 === 0
    ? (values[Math.floor(values.length / 2) - 1] + values[Math.floor(values.length / 2)]) / 2
    : values[Math.floor(values.length / 2)];
  const min = values[0];
  const max = values[values.length - 1];

  // Standard deviation
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);

  return {
    mean,
    median,
    min,
    max,
    std,
    count: values.length,
    units,
  };
}

/**
 * Get the path to a GeoTIFF layer by name
 */
export function getGeoTIFFPath(layerName: 'GHI' | 'DNI' | 'DIF' | 'GTI' | 'PVOUT' | 'OPTA' | 'TEMP' | string): string {
  // Resolve path from server/src/services to project root
  // In development: __dirname = server/src/services (or server/dist/services in compiled)
  // In production: __dirname = server/dist/services

  // Try to find the data directory from multiple possible locations
  // The GeoTIFF files are at: SolarSenseAI/India_GISdata_LTAym_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/...
  // Server is at: SolarSenseAI/SolarSenseAI/green-it-solar-map/server/
  const possibleBasePaths = [
    // From server directory: go up to SolarSenseAI root, then to India_GISdata folder
    path.join(process.cwd(), '../../..', 'India_GISdata_LTAym_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/India_GISdata_LTAy_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF'),
    // From compiled dist/services
    path.join(__dirname, '../../../..', 'India_GISdata_LTAym_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/India_GISdata_LTAy_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF'),
    // From source src/services
    path.join(__dirname, '../../../../..', 'India_GISdata_LTAym_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/India_GISdata_LTAy_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF'),
    // Absolute path from process.cwd() (where server is run from)
    path.join(process.cwd(), '..', 'India_GISdata_LTAym_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/India_GISdata_LTAy_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF'),
    // Try from project root (if server is run from project root)
    path.join(process.cwd(), 'India_GISdata_LTAym_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/India_GISdata_LTAy_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF'),
  ];

  let baseDir: string | null = null;

  for (const possiblePath of possibleBasePaths) {
    if (fs.existsSync(possiblePath)) {
      baseDir = possiblePath;
      break;
    }
  }

  // Fallback to first path if none found (will throw error when trying to read)
  if (!baseDir) {
    baseDir = possibleBasePaths[0];
    console.warn(`GeoTIFF base directory not found. Trying: ${baseDir}`);
    console.warn(`Current working directory: ${process.cwd()}`);
    console.warn(`__dirname: ${__dirname}`);
  }

  if (layerName.startsWith('PVOUT_')) {
    // Monthly PVOUT files
    return path.join(baseDir, 'monthly', `${layerName}.tif`);
  }

  return path.join(baseDir, `${layerName}.tif`);
}

/**
 * Sample multiple layers for a polygon
 */
export async function sampleMultipleLayers(
  layerNames: string[],
  polygonGeoJson: GeoJSONPolygon
): Promise<Record<string, ZonalStats>> {
  const results: Record<string, ZonalStats> = {};

  await Promise.all(
    layerNames.map(async (layerName) => {
      try {
        const layerPath = getGeoTIFFPath(layerName);
        const stats = await sampleGeoTIFFForPolygon(layerPath, polygonGeoJson);
        results[layerName] = stats;
      } catch (error: any) {
        console.error(`Error sampling layer ${layerName}:`, error.message);
        // Continue with other layers even if one fails
      }
    })
  );

  return results;
}
