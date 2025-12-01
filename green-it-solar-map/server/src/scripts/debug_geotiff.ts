
import * as fs from 'fs';
import * as path from 'path';
import { fromArrayBuffer } from 'geotiff';

async function debugGeoTIFF(filePath: string) {
    console.log(`\n--- Inspecting ${path.basename(filePath)} ---`);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    try {
        const fileBuffer = fs.readFileSync(filePath);
        const tiff = await fromArrayBuffer(fileBuffer.buffer);
        const image = await tiff.getImage();

        const width = image.getWidth();
        const height = image.getHeight();
        const bbox = image.getBoundingBox();
        const origin = image.getOrigin();
        const resolution = image.getResolution();
        const geoKeys = image.getGeoKeys();

        console.log(`Dimensions: ${width} x ${height}`);
        console.log(`Bounding Box: ${JSON.stringify(bbox)}`);
        console.log(`Origin: ${JSON.stringify(origin)}`);
        console.log(`Resolution: ${JSON.stringify(resolution)}`);
        console.log(`GeoKeys:`, geoKeys);

    } catch (error) {
        console.error('Error reading GeoTIFF:', error);
    }
}

async function main() {
    const dataDir = path.join(process.cwd(), '../../India_GISdata_LTAym_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/India_GISdata_LTAy_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF');

    await debugGeoTIFF(path.join(dataDir, 'GHI.tif'));
    await debugGeoTIFF(path.join(dataDir, 'OPTA.tif'));
    await debugGeoTIFF(path.join(dataDir, 'ELE.tif'));
}

main();
