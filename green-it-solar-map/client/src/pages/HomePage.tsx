import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom'; // Import useHistory
import {
  Cartesian2, Cartesian3, Cartographic, CallbackProperty,
  Ion, Math as CesiumMath, Viewer, ScreenSpaceEventHandler, ScreenSpaceEventType,
  Color, PolygonHierarchy, Entity
} from 'cesium';
import { FaLocationArrow, FaDrawPolygon, FaTimes, FaSync, FaBolt } from 'react-icons/fa';
import { AnalysisResult } from '../App'; // Import the interface from App

// --- NEW, ACCURATE HELPER FUNCTION ---
const getPolygonArea = (points: Cartesian3[]): number => {
  if (points.length < 3) return 0;

  // This is a more robust method for calculating the area of a polygon on the Earth's surface.
  // It uses the "Triangle Method" by creating a fan of triangles from the points and summing their areas.
  let totalArea = 0;
  // We use the first point as the central point for our fan of triangles
  const p1 = points[0];

  for (let i = 1; i < points.length - 1; i++) {
    const p2 = points[i];
    const p3 = points[i + 1];

    // Calculate the lengths of the sides of the triangle (a, b, c)
    const a = Cartesian3.distance(p1, p2);
    const b = Cartesian3.distance(p2, p3);
    const c = Cartesian3.distance(p3, p1);

    // Use Heron's formula to find the area of the triangle
    const s = (a + b + c) / 2.0;
    const triangleArea = Math.sqrt(s * (s - a) * (s - b) * (s - c));
    totalArea += triangleArea;
  }

  // The previous calculation was a flat area. We now apply a correction
  // factor for an average roof pitch (e.g., 30 degrees) to estimate the true surface area.
  const realisticArea = totalArea / Math.cos(CesiumMath.toRadians(30));
  return realisticArea;
};


// Define props to receive the callback function from App.tsx
interface HomePageProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onAnalysisComplete }) => {
  const history = useHistory(); // Hook for navigation
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<Cartesian3[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [calculatedArea, setCalculatedArea] = useState(0);
  const [powerSaved, setPowerSaved] = useState<number | null>(null);

  const [lat, setLat] = useState('18.463645');
  const [lng, setLng] = useState('73.868095');

  const drawingEntityRef = useRef<Entity | null>(null);
  const mousePositionRef = useRef<Cartesian3 | null>(null);

  // Initialize the Cesium Viewer and Fly to initial location
  useEffect(() => {
    if (cesiumContainer.current && !viewer) {
      // --- SIMPLIFIED VIEWER CREATION ---
      // No need to load tilesets, the Viewer uses a free satellite base layer by default.
      const newViewer = new Viewer(cesiumContainer.current, {
        timeline: false, animation: false, geocoder: false, homeButton: false,
        sceneModePicker: false, baseLayerPicker: false, navigationHelpButton: false,
        infoBox: false, selectionIndicator: false, fullscreenButton: false,
      });
      
      // Fly to initial coordinates on load
      newViewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(parseFloat(lng), parseFloat(lat), 350),
        orientation: { heading: CesiumMath.toRadians(0.0), pitch: CesiumMath.toRadians(-45.0) },
        duration: 5,
      });
      
      setViewer(newViewer);
    }
    return () => { if (viewer && !viewer.isDestroyed()) { viewer.destroy(); } };
  }, []);

  // --- Drawing Event Handler ---
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    if (isDrawing) {
      handler.setInputAction((event: { position: Cartesian2 }) => {
        // Use scene.globe.pick for 2D maps to get the point on the globe ellipsoid
        const ray = viewer.camera.getPickRay(event.position);
        const earthPosition = ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined;
        if (earthPosition) setPolygonPoints(prev => [...prev, earthPosition]);
      }, ScreenSpaceEventType.LEFT_CLICK);

      handler.setInputAction((event: { endPosition: Cartesian2 }) => {
        const ray = viewer.camera.getPickRay(event.endPosition);
        const newPosition = ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined;
        if (newPosition) mousePositionRef.current = newPosition;
      }, ScreenSpaceEventType.MOUSE_MOVE);

      handler.setInputAction(() => {
        setIsDrawing(false);
        const area = getPolygonArea(polygonPoints);
        setCalculatedArea(area);
        setShowResults(true);
        setPowerSaved(null);
      }, ScreenSpaceEventType.RIGHT_CLICK);
    }
    return () => handler.destroy();
  }, [viewer, isDrawing, polygonPoints]);

  // --- Dynamic Polygon Rendering ---
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
          outline: true,
          outlineColor: Color.WHITE,
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
  }, [viewer, isDrawing, polygonPoints]);

  const handleFlyTo = () => {
    if (viewer) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      if (isNaN(latitude) || isNaN(longitude)) {
        alert('Please enter valid coordinates.');
        return;
      }
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(longitude, latitude, 250),
        orientation: { heading: CesiumMath.toRadians(0.0), pitch: CesiumMath.toRadians(-45.0) },
        duration: 5,
      });
    }
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setShowResults(false);
    setPolygonPoints([]);
    if (drawingEntityRef.current) viewer?.entities.remove(drawingEntityRef.current);
  };

  const reset = () => {
    setIsDrawing(false);
    setShowResults(false);
    setPolygonPoints([]);
    setPowerSaved(null);
    if (drawingEntityRef.current) viewer?.entities.remove(drawingEntityRef.current);
  };

  // --- MODIFIED: Prediction Logic ---
  const runPrediction = () => {
    // More detailed prediction model
    const panelEfficiency = 0.20; // 20% efficiency
    const performanceRatio = 0.85; // Accounts for dust, wiring loss, etc.
    const panelDensityWattsPerSqm = 200; // Modern panels are ~200 W/m^2
    const peakSunHoursPerDay = 5; // Average for Pune

    const installedCapacityKw = (calculatedArea * panelDensityWattsPerSqm) / 1000;
    const dailyKwh = installedCapacityKw * peakSunHoursPerDay * performanceRatio * panelEfficiency;
    
    setPowerSaved(dailyKwh);

    // Create the result object
    const result: AnalysisResult = {
      area: calculatedArea,
      power: dailyKwh,
      location: { lat, lng },
      timestamp: new Date(),
    };

    // Send the data up to App.tsx
    onAnalysisComplete(result);

    // Navigate to the prediction page
    history.push('/prediction');
  };
  
  const renderMainPanel = () => (
    <>
      <div className="input-group">
        <input type="text" value={lat} onChange={e => setLat(e.target.value)} className="coord-input" placeholder="Latitude" />
        <input type="text" value={lng} onChange={e => setLng(e.target.value)} className="coord-input" placeholder="Longitude" />
      </div>
      <button className="ui-button" onClick={handleFlyTo}>
        <FaLocationArrow /> Fly to Location
      </button>
      <button className="ui-button" onClick={startDrawing}>
        <FaDrawPolygon /> Draw Solar Area
      </button>
    </>
  );

  const renderDrawingPanel = () => (
    <>
      <div className="instruction-panel">
        <p><kbd>Left-click</kbd> to add a point.</p>
        <p><kbd>Right-click</kbd> to finish.</p>
      </div>
      <button className="ui-button cancel-button" onClick={reset}>
        <FaTimes /> Cancel
      </button>
    </>
  );

  const renderResultsPanel = () => (
    <div className="results-panel">
      <h3>Analysis Results</h3>
      <div className="result-item">
        <span>Rooftop Area:</span>
        <span>{calculatedArea.toFixed(2)} m²</span>
      </div>
      <div className="action-buttons">
        <button className="ui-button" onClick={runPrediction}>
          <FaBolt /> Go to Prediction
        </button>
        <button className="ui-button" onClick={reset}>
          <FaSync /> Start Over
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="ui-panel">
        {isDrawing ? renderDrawingPanel() : (showResults ? renderResultsPanel() : renderMainPanel())}
      </div>
      <div ref={cesiumContainer} style={{ width: '100%', height: '90vh', margin: 0, padding: 0, overflow: 'hidden' }} />
    </div>
  );
};

export default HomePage;
