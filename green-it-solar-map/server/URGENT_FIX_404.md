# 🔴 URGENT: Fix 404 Error

## The Problem

The compiled JavaScript in `dist/` is **out of date** and doesn't include the GIS routes. The server might be running from old compiled code.

## Solution: Restart Server with TypeScript

You're using `ts-node-dev` which should compile TypeScript on the fly, but the server needs to be restarted:

### Step 1: Stop the Server
Press `Ctrl+C` in the terminal where the server is running.

### Step 2: Rebuild TypeScript (Optional but Recommended)
```bash
cd SolarSenseAI/green-it-solar-map/server
npm run build
```

This will recompile all TypeScript files including the new GIS routes.

### Step 3: Restart Server
```bash
npm run dev
```

Or if you want to use compiled code:
```bash
npm start
```

## Verify Routes Are Loaded

After restarting, check the server console. You should see:
```
Server is running on port: 5000
API routes available at /api/*
```

Then test:
```bash
curl http://localhost:5000/api/gis/presets
```

You should get JSON with PV system presets.

## If Still Getting 404

Check the server console when you make a request. You should see:
```
[POST] /api/gis/sample-ghi
```

If you don't see this, the route isn't being registered. Check:
1. Is the server actually restarted?
2. Are there any TypeScript compilation errors?
3. Check `dist/api/index.js` - does it include `gisRoutes`?

## No API Keys Needed

The routes are public - no authentication required.

