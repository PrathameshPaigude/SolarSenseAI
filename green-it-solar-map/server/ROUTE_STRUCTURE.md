# Route Structure

## Current Setup

### Server mounts:
- `/api` → Main API router (from `src/api/index.ts`)
- `/api/gis` → GIS routes (from `src/api/gisRoutes.ts`) **mounted directly in server.ts**

### GIS Routes Available:
- `POST /api/gis/sample-ghi` - Sample GHI and other layers
- `POST /api/gis/compute-pv` - Compute PV energy output
- `POST /api/gis/monthly-pv` - Compute PV with monthly breakdown
- `GET /api/gis/presets` - Get PV system presets

### Route Structure:
```
server.ts
  └─ app.use('/api/gis', gisRoutes)
       └─ gisRoutes.ts
            ├─ router.post('/sample-ghi', ...)
            ├─ router.post('/compute-pv', ...)
            ├─ router.post('/monthly-pv', ...)
            └─ router.get('/presets', ...)
```

This means:
- `/api/gis` + `/sample-ghi` = `/api/gis/sample-ghi` ✅

## Testing Routes

### Test presets endpoint:
```bash
curl http://localhost:5000/api/gis/presets
```

### Test sample-ghi endpoint:
```bash
curl -X POST http://localhost:5000/api/gis/sample-ghi \
  -H "Content-Type: application/json" \
  -d '{"polygonGeoJson":{"type":"Polygon","coordinates":[[[73.86,18.46],[73.87,18.46],[73.87,18.47],[73.86,18.47],[73.86,18.46]]]}}'
```

## Important Notes

1. **Restart server after changes** - The server must be restarted to load new routes
2. **Check server console** - Look for "Server is running on port: 5000" and "GIS routes available at /api/gis/*"
3. **No trailing slashes** - Use `/api/gis/sample-ghi` not `/api/gis/sample-ghi/`

