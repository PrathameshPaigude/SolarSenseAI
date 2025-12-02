import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  Cartesian2, Cartesian3, CallbackProperty,
  Ion, Math as CesiumMath, Viewer, ScreenSpaceEventHandler, ScreenSpaceEventType,
  Color, PolygonHierarchy, Entity
} from 'cesium';
import {
  FaSolarPanel, FaRulerCombined, FaGlobeAmericas, FaMapMarkerAlt,
  FaPlay, FaTrash, FaCheck, FaSearch, FaDrawPolygon
} from 'react-icons/fa';
import { AnalysisResult } from '../App';
import { safeComputeGeodesicAreaM2, validatePolygon, cesiumPositionsToLonLatRing } from '../utils/cesiumArea';
import './HomePage.css';

Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNDdiNWY1MC1hZDJhLTQ3NjItODIxOC03MmM1Mzk0MzNkNDUiLCJpZCI6MzQwMTEwLCJpYXQiOjE3NTc1MDc5MDR9.cyUvzRrufzlkzGqfd0miOY6y4CabqJ4Ob2o-0DG2slY";

interface HomePageProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
}

type InputMode = 'quick' | 'area' | 'globe';

const HomePage: React.FC<HomePageProps> = ({ onAnalysisComplete }) => {
  const history = useHistory();
  const [activeMode, setActiveMode] = useState<InputMode>('quick');

  // Quick Mode State
  const [panelCount, setPanelCount] = useState('10');
  const [panelWattage, setPanelWattage] = useState('400');
  const [quickLat, setQuickLat] = useState('18.5204');
  const [quickLng, setQuickLng] = useState('73.8567');

  // Area Mode State
  const [areaInput, setAreaInput] = useState('');
  const [areaLat, setAreaLat] = useState('18.5204');
  const [areaLng, setAreaLng] = useState('73.8567');

  // Globe Mode State
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<Cartesian3[]>([]);
  const drawingEntityRef = useRef<Entity | null>(null);
  const mousePositionRef = useRef<Cartesian3 | null>(null);
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [globeLat, setGlobeLat] = useState('18.5204');
  const [globeLng, setGlobeLng] = useState('73.8567');
  const [drawnArea, setDrawnArea] = useState<number | null>(null);
  const analyzeButtonRef = useRef<HTMLDivElement>(null);

  // --- Cesium Logic ---
  useEffect(() => {
    if (activeMode === 'globe' && cesiumContainer.current && !viewer) {
      try {
        const newViewer = new Viewer(cesiumContainer.current, {
          timeline: false, animation: false, geocoder: false, homeButton: false,
          sceneModePicker: false, baseLayerPicker: false, navigationHelpButton: false,
          infoBox: false, selectionIndicator: false, fullscreenButton: false,
          contextOptions: {
            webgl: {
              powerPreference: 'high-performance',
              alpha: true,
            },
          },
        });

        // Performance optimizations
        newViewer.scene.fog.enabled = true;
        newViewer.scene.debugShowFramesPerSecond = false;
        
        // Optimize rendering performance
        newViewer.scene.globe.enableLighting = false;
        newViewer.scene.globe.dynamicAtmosphereLighting = false;
        newViewer.scene.globe.dynamicAtmosphereLightingFromSun = false;
        
        // Reduce terrain detail for better performance
        newViewer.scene.globe.terrainExaggeration = 1.0;
        
        // Optimize camera movement
        newViewer.scene.screenSpaceCameraController.enableRotate = true;
        newViewer.scene.screenSpaceCameraController.enableTranslate = true;
        newViewer.scene.screenSpaceCameraController.enableZoom = true;
        newViewer.scene.screenSpaceCameraController.enableTilt = true;
        newViewer.scene.screenSpaceCameraController.enableLook = true;
        
        // Set initial camera position to center on India
        newViewer.camera.setView({
          destination: Cartesian3.fromDegrees(77.2090, 20.5937, 20000000),
        });

        setViewer(newViewer);
      } catch (e) {
        console.error('Cesium init failed', e);
      }
    }
    return () => {
      if (activeMode !== 'globe' && viewer && !viewer.isDestroyed()) {
        viewer.destroy();
        setViewer(null);
      }
    };
  }, [activeMode]);

  const getPolygonGeoJSON = (points: Cartesian3[]) => {
    if (points.length < 3) return null;
    const ring = cesiumPositionsToLonLatRing(points);
    if (ring.length < 4) return null;
    return { type: 'Polygon' as const, coordinates: [ring] };
  };

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    if (isDrawing) {
      // Throttle render requests for better performance
      const throttledRender = () => {
        if (renderTimeoutRef.current) return;
        renderTimeoutRef.current = setTimeout(() => {
          if (!viewer.isDestroyed()) {
            viewer.scene.requestRender();
          }
          renderTimeoutRef.current = null;
        }, 16); // ~60fps
      };

      handler.setInputAction((event: { position: Cartesian2 }) => {
        const ray = viewer.camera.getPickRay(event.position);
        const earthPosition = ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined;
        if (earthPosition) {
          setPolygonPoints(prev => [...prev, earthPosition]);
          throttledRender();
        }
      }, ScreenSpaceEventType.LEFT_CLICK);

      handler.setInputAction((event: { endPosition: Cartesian2 }) => {
        const ray = viewer.camera.getPickRay(event.endPosition);
        const newPosition = ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined;
        if (newPosition) {
          mousePositionRef.current = newPosition;
          throttledRender();
        }
      }, ScreenSpaceEventType.MOUSE_MOVE);

      handler.setInputAction(() => {
        setIsDrawing(false);
        const validation = validatePolygon(polygonPoints);
        if (!validation.valid) {
          alert(`Invalid polygon: ${validation.error}`);
          setPolygonPoints([]);
          if (!viewer.isDestroyed()) {
            viewer.scene.requestRender();
          }
          return;
        }
        const area = safeComputeGeodesicAreaM2(polygonPoints);
        setDrawnArea(area);
        if (!viewer.isDestroyed()) {
          viewer.scene.requestRender();
        }
        // Scroll to analyze button when area is calculated
        setTimeout(() => {
          analyzeButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }, ScreenSpaceEventType.RIGHT_CLICK);

      return () => {
        if (renderTimeoutRef.current) {
          clearTimeout(renderTimeoutRef.current);
          renderTimeoutRef.current = null;
        }
        handler.destroy();
      };
    }
    return () => handler.destroy();
  }, [viewer, isDrawing, polygonPoints]);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    if (drawingEntityRef.current) viewer.entities.remove(drawingEntityRef.current);

    if (isDrawing) {
      drawingEntityRef.current = viewer.entities.add({
        polygon: {
          hierarchy: new CallbackProperty(() => {
            const activePoints = [...polygonPoints];
            if (mousePositionRef.current) activePoints.push(mousePositionRef.current);
            if (activePoints.length >= 3) return new PolygonHierarchy(activePoints);
            return undefined;
          }, false),
          material: Color.CYAN.withAlpha(0.5),
          outline: true, outlineColor: Color.WHITE,
        },
      });
    } else if (polygonPoints.length > 2) {
      drawingEntityRef.current = viewer.entities.add({
        polygon: {
          hierarchy: new PolygonHierarchy(polygonPoints),
          material: Color.LIMEGREEN.withAlpha(0.7),
        },
      });
    }
    // Throttle render requests
    if (viewer && !viewer.isDestroyed()) {
      const timeout = setTimeout(() => {
        if (!viewer.isDestroyed()) {
          viewer.scene.requestRender();
        }
      }, 16);
      return () => clearTimeout(timeout);
    }
  }, [viewer, isDrawing, polygonPoints]);

  const targetEntityRef = useRef<Entity | null>(null);

  const handleFlyTo = () => {
    if (viewer) {
      const lat = parseFloat(globeLat);
      const lng = parseFloat(globeLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        // Remove previous target point
        if (targetEntityRef.current) {
          viewer.entities.remove(targetEntityRef.current);
        }

        // Add new target point for visual verification
        targetEntityRef.current = viewer.entities.add({
          position: Cartesian3.fromDegrees(lng, lat),
          point: {
            pixelSize: 10,
            color: Color.RED,
            outlineColor: Color.WHITE,
            outlineWidth: 2
          }
        });

        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(lng, lat, 500),
          orientation: { heading: CesiumMath.toRadians(0.0), pitch: CesiumMath.toRadians(-45.0) },
        });

        viewer.scene.requestRender();
      }
    }
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setPolygonPoints([]);
    setDrawnArea(null);
    if (drawingEntityRef.current) viewer?.entities.remove(drawingEntityRef.current);
    if (targetEntityRef.current) viewer?.entities.remove(targetEntityRef.current);
    viewer?.scene.requestRender();
  };

  const resetDrawing = () => {
    setIsDrawing(false);
    setPolygonPoints([]);
    setDrawnArea(null);
    if (drawingEntityRef.current) viewer?.entities.remove(drawingEntityRef.current);
    if (targetEntityRef.current) viewer?.entities.remove(targetEntityRef.current);
    viewer?.scene.requestRender();
  };

  // --- Navigation Logic ---
  const handleQuickAnalysis = () => {
    const lat = parseFloat(quickLat);
    const lng = parseFloat(quickLng);
    const panels = parseInt(panelCount);
    const watts = parseFloat(panelWattage);

    // Estimate area based on panels (approx 2m^2 per panel)
    const estimatedArea = panels * 2;

    // Create synthetic polygon
    const delta = 0.0001;
    const syntheticPoints = [
      Cartesian3.fromDegrees(lng - delta, lat - delta),
      Cartesian3.fromDegrees(lng + delta, lat - delta),
      Cartesian3.fromDegrees(lng + delta, lat + delta),
      Cartesian3.fromDegrees(lng - delta, lat + delta)
    ];
    const polygonGeoJSON = getPolygonGeoJSON(syntheticPoints);

    history.push({
      pathname: '/solar-analysis',
      state: {
        polygonGeoJson: polygonGeoJSON,
        area_m2: estimatedArea,
        latitude: lat,
        longitude: lng,
        systemConfig: { panels, watts }
      }
    });
  };

  const handleAreaAnalysis = () => {
    const lat = parseFloat(areaLat);
    const lng = parseFloat(areaLng);
    const area = parseFloat(areaInput);

    const delta = 0.0001; // This should ideally be scaled by area, but keeping simple for now
    const syntheticPoints = [
      Cartesian3.fromDegrees(lng - delta, lat - delta),
      Cartesian3.fromDegrees(lng + delta, lat - delta),
      Cartesian3.fromDegrees(lng + delta, lat + delta),
      Cartesian3.fromDegrees(lng - delta, lat + delta)
    ];
    const polygonGeoJSON = getPolygonGeoJSON(syntheticPoints);

    history.push({
      pathname: '/solar-analysis',
      state: {
        polygonGeoJson: polygonGeoJSON,
        area_m2: area,
        latitude: lat,
        longitude: lng
      }
    });
  };

  const handleGlobeAnalysis = () => {
    if (!drawnArea || polygonPoints.length < 3) return;
    const polygonGeoJSON = getPolygonGeoJSON(polygonPoints);

    // Calculate centroid for lat/lon
    // Simple average for now
    let sumLat = 0, sumLng = 0;
    const ring = cesiumPositionsToLonLatRing(polygonPoints);
    ring.forEach(p => { sumLng += p[0]; sumLat += p[1]; });
    const centerLat = sumLat / ring.length;
    const centerLng = sumLng / ring.length;

    history.push({
      pathname: '/solar-analysis',
      state: {
        polygonGeoJson: polygonGeoJSON,
        area_m2: drawnArea,
        latitude: centerLat,
        longitude: centerLng,
        method: 'Drawn on globe'
      }
    });
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-header">
          <h1 className="hero-title">SolarSenseAI</h1>
          <p className="hero-subtitle">
            Analyze rooftop solar potential with GIS precision, 3D visualization, and financial insights.
            Choose how you want to start your analysis below.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="mode-selection-grid">
          <div
            className={`mode-card ${activeMode === 'quick' ? 'active' : ''}`}
            onClick={() => setActiveMode('quick')}
          >
            <FaSolarPanel className="mode-icon" />
            <h3 className="mode-title">Quick System Input</h3>
            <p className="mode-description">I know my panel type, number of panels, and coordinates.</p>
          </div>

          <div
            className={`mode-card ${activeMode === 'area' ? 'active' : ''}`}
            onClick={() => setActiveMode('area')}
          >
            <FaRulerCombined className="mode-icon" />
            <h3 className="mode-title">Area + Coordinates</h3>
            <p className="mode-description">I know my rooftop area (m²) and its location.</p>
          </div>

          <div
            className={`mode-card ${activeMode === 'globe' ? 'active' : ''}`}
            onClick={() => setActiveMode('globe')}
          >
            <FaGlobeAmericas className="mode-icon" />
            <h3 className="mode-title">Draw on 3D Globe</h3>
            <p className="mode-description">Help me mark the rooftop on the Cesium globe.</p>
          </div>
        </div>
      </section>

      {/* Content Area */}
      <section className="content-area">
        {activeMode === 'quick' && (
          <div className="split-layout">
            <div className="form-column">
              <h2 className="form-title">Quick System Configuration</h2>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Number of Panels</label>
                  <input
                    type="number" className="form-input"
                    value={panelCount} onChange={e => setPanelCount(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Panel Wattage (W)</label>
                  <input
                    type="number" className="form-input"
                    value={panelWattage} onChange={e => setPanelWattage(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Location (Lat, Lon)</label>
                <div className="form-row">
                  <input
                    type="number" className="form-input" placeholder="Latitude"
                    value={quickLat} onChange={e => setQuickLat(e.target.value)}
                  />
                  <input
                    type="number" className="form-input" placeholder="Longitude"
                    value={quickLng} onChange={e => setQuickLng(e.target.value)}
                  />
                </div>
              </div>

              <button className="primary-button" onClick={handleQuickAnalysis}>
                <FaPlay /> Run Solar Analysis
              </button>
            </div>
            <div className="preview-column">
              <div style={{ textAlign: 'center', color: '#999' }}>
                <FaMapMarkerAlt style={{ fontSize: '48px', marginBottom: '16px' }} />
                <p>Mini Map Preview (Placeholder)</p>
                <p style={{ fontSize: '0.8rem' }}>{quickLat}, {quickLng}</p>
              </div>
            </div>
          </div>
        )}

        {activeMode === 'area' && (
          <div className="split-layout">
            <div className="form-column">
              <h2 className="form-title">Site Details</h2>

              <div className="form-group">
                <label className="form-label">Rooftop Area (m²)</label>
                <input
                  type="number" className="form-input" placeholder="e.g. 150"
                  value={areaInput} onChange={e => setAreaInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location (Lat, Lon)</label>
                <div className="form-row">
                  <input
                    type="number" className="form-input" placeholder="Latitude"
                    value={areaLat} onChange={e => setAreaLat(e.target.value)}
                  />
                  <input
                    type="number" className="form-input" placeholder="Longitude"
                    value={areaLng} onChange={e => setAreaLng(e.target.value)}
                  />
                </div>
              </div>

              <button className="primary-button" onClick={handleAreaAnalysis}>
                <FaPlay /> Run Solar Analysis
              </button>
            </div>
            <div className="preview-column">
              <div style={{ textAlign: 'center', color: '#999' }}>
                <FaRulerCombined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <p>Area Preview (Placeholder)</p>
                <p style={{ fontSize: '0.8rem' }}>{areaLat}, {areaLng}</p>
              </div>
            </div>
          </div>
        )}

        {activeMode === 'globe' && (
          <div className="globe-layout">
            <div className="globe-controls">
              <div className="controls-scroll-area">
                <div className="control-section">
                  <h3 className="form-title">Camera & Location</h3>
                  <div className="form-group">
                    <label className="form-label">Jump to Coordinates</label>
                    <div className="form-row">
                      <input
                        type="number" className="form-input" placeholder="Lat"
                        value={globeLat} onChange={e => setGlobeLat(e.target.value)}
                      />
                      <input
                        type="number" className="form-input" placeholder="Lng"
                        value={globeLng} onChange={e => setGlobeLng(e.target.value)}
                      />
                    </div>
                    <button className="ui-button secondary-button" onClick={handleFlyTo} style={{ marginTop: '8px' }}>
                      <FaSearch /> Fly to Location
                    </button>
                  </div>
                </div>

                <div className="section-divider" />

                <div className="control-section">
                  <h3 className="form-title">Draw Rooftop</h3>
                  <div className={`status-badge ${isDrawing ? 'active' : ''}`}>
                    {isDrawing ? 'Drawing Mode: ON' : 'Drawing Mode: OFF'}
                  </div>

                  <div className="form-row">
                    <button className="ui-button primary-button" onClick={startDrawing} disabled={isDrawing}>
                      <FaDrawPolygon /> Start
                    </button>
                    <button className="ui-button secondary-button" onClick={resetDrawing}>
                      <FaTrash /> Reset
                    </button>
                  </div>

                  <ul className="instruction-list">
                    <li>Left-click to add vertices</li>
                    <li>Right-click to finish polygon</li>
                  </ul>

                  {drawnArea && (
                    <div className="form-group" style={{ marginTop: '16px' }}>
                      <label className="form-label">Calculated Area</label>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {drawnArea.toFixed(2)} m²
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div ref={analyzeButtonRef} style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #eee', flexShrink: 0 }}>
                <button
                  className="primary-button"
                  style={{ width: '100%' }}
                  disabled={!drawnArea}
                  onClick={handleGlobeAnalysis}
                >
                  <FaCheck /> Analyze this Rooftop
                </button>
              </div>
            </div>

            <div className="globe-viewer-container">
              <div ref={cesiumContainer} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
