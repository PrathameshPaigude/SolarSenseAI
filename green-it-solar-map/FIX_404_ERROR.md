# Fix: 404 Error on /api/gis/sample-ghi

## The Problem
The server is running but doesn't have the new GIS routes loaded. The compiled code is out of date.

## Quick Fix

### Step 1: Stop the Server
In the terminal where your server is running, press `Ctrl+C` to stop it.

### Step 2: Restart the Server

Navigate to the server directory and restart:
```bash
cd SolarSenseAI/green-it-solar-map/server
npm run dev
```

Or if you're using npm start:
```bash
cd SolarSenseAI/green-it-solar-map/server
npm run build
npm start
```

### Step 3: Verify It's Working

After the server restarts, test the endpoint:
```bash
curl http://localhost:5000/api/gis/presets
```

You should see a JSON response with PV system presets.

### Step 4: Refresh Your Browser

Once the server is running with the new routes, refresh your browser to test the solar analysis.

## Why This Happened

The GIS routes were added to the source code (`src/api/gisRoutes.ts`), but:
- The server was already running from compiled code in `dist/`
- The compiled code didn't include the new routes
- Restarting forces TypeScript to recompile and include all routes

## Still Getting 404?

1. Check server console for errors
2. Verify server is running on port 5000
3. Check that `src/api/index.ts` includes: `router.use('/', gisRoutes);`
4. Make sure all TypeScript files compile without errors

