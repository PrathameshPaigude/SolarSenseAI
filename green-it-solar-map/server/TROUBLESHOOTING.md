# Troubleshooting 404 Errors on GIS Routes

## Problem
Getting 404 error when accessing `/api/gis/sample-ghi`

## Solution

The server needs to be restarted to pick up the new routes. The compiled JavaScript in `dist/` is out of date.

### Option 1: Restart Development Server (Recommended)

If you're using `npm run dev`, the server should automatically reload. If not:

1. **Stop the current server** (Ctrl+C)
2. **Restart it**:
   ```bash
   cd SolarSenseAI/green-it-solar-map/server
   npm run dev
   ```

### Option 2: Rebuild and Restart

If the server is running from compiled code:

1. **Stop the server**
2. **Rebuild TypeScript**:
   ```bash
   cd SolarSenseAI/green-it-solar-map/server
   npm run build
   ```
3. **Start the server**:
   ```bash
   npm start
   ```

### Option 3: Verify Routes Are Registered

Check that the routes are properly exported in `src/api/index.ts`:

```typescript
router.use('/', gisRoutes);
```

### Verify Server is Running Correctly

After restarting, you should see:
- Server console: `Server is running on port: 5000`
- No TypeScript compilation errors

### Test the Endpoint

Test if the route is available:
```bash
curl http://localhost:5000/api/gis/presets
```

You should get a JSON response with PV system presets.

