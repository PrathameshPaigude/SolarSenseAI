# 🚨 IMMEDIATE FIX - 404 Error

## The Problem

The **compiled JavaScript** in `dist/api/index.js` is outdated - it doesn't include the GIS routes. The server is running old code.

## Quick Fix - Two Options

### Option 1: Use Development Mode (Recommended)

If you're running `npm run dev`, it uses `ts-node-dev` which runs TypeScript directly (not compiled code):

1. **Stop the server** (Ctrl+C)
2. **Restart it**:
   ```bash
   cd SolarSenseAI/green-it-solar-map/server
   npm run dev
   ```

This should work immediately because it uses the TypeScript source files.

### Option 2: Rebuild and Restart

If you're using `npm start` (which uses compiled code):

1. **Stop the server** (Ctrl+C)
2. **Rebuild TypeScript**:
   ```bash
   cd SolarSenseAI/green-it-solar-map/server
   npm run build
   ```
3. **Restart**:
   ```bash
   npm start
   ```

## Verify It's Working

After restarting, test this in your browser or with curl:

```bash
curl http://localhost:5000/api/gis/presets
```

You should get JSON with PV system presets.

Or test the sample-ghi endpoint:

```bash
curl -X POST http://localhost:5000/api/gis/sample-ghi \
  -H "Content-Type: application/json" \
  -d '{"polygonGeoJson":{"type":"Polygon","coordinates":[[[73.86,18.46],[73.87,18.46],[73.87,18.47],[73.86,18.47],[73.86,18.46]]]}}'
```

## Check Server Console

When you make a request, you should see:
```
[POST] /api/gis/sample-ghi
✅ /api/gis/sample-ghi route HIT, body: ...
```

If you don't see these logs, the routes aren't registered - **the server needs to be restarted**.

## No API Keys Needed

The routes are public - no authentication or API keys required.

