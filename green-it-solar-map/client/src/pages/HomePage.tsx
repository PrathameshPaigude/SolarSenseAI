import React, { useEffect, useRef, useState } from 'react';
import {
  Cartesian2, Cartesian3, Cartographic, CallbackProperty, createGooglePhotorealistic3DTileset,
  Ion, Math as CesiumMath, Viewer, ScreenSpaceEventHandler, ScreenSpaceEventType,
  Color, PolygonHierarchy, Entity
} from 'cesium';
import { FaLocationArrow, FaDrawPolygon, FaTimes, FaSync, FaBolt } from 'react-icons/fa';

// This global variable is set to tell Cesium where to find its assets.
(window as any).CESIUM_BASE_URL = '/cesium/';

Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNDdiNWY1MC1hZDJhLTQ3NjItODIxOC03MmM1Mzk0MzNkNDUiLCJpZCI6MzQwMTEwLCJpYXQiOjE3NTc1MDc5MDR9.cyUvzRrufzlkzGqfd0miOY6y4CabqJ4Ob2o-0DG2slY";

// --- Helper function to calculate area ---
const getPolygonArea = (points: Cartesian3[]): number => {
  if (points.length < 3) return 0;
  // This is a simplified calculation using the shoelace formula on projected points.
  // It's a good approximation for small, relatively flat areas.
  const cartographicPoints = points.map(p => Cartographic.fromCartesian(p));
  const coordinates = cartographicPoints.map(p => ({
    x: p.longitude * CesiumMath.RADIANS_PER_DEGREE,
    y: p.latitude * CesiumMath.RADIANS_PER_DEGREE
  }));

  let area = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    area += coordinates[i].x * coordinates[j].y;
    area -= coordinates[j].x * coordinates[i].y;
  }
  area /= 2;
  // Using Earth's mean radius to convert to square meters
  return Math.abs(area * 6371000 * 6371000);
};

const HomePage: React.FC = () => {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<Cartesian3[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [calculatedArea, setCalculatedArea] = useState(0);

  // State for user input coordinates - Defaulting to VIT Pune
  const [lat, setLat] = useState('18.463645');
  const [lng, setLng] = useState('73.868095');

  const drawingEntityRef = useRef<Entity | null>(null);
  const mousePositionRef = useRef<Cartesian3 | null>(null);

  // Initialize the Cesium Viewer and Fly to initial location
  useEffect(() => {
    if (cesiumContainer.current && !viewer) {
      const newViewer = new Viewer(cesiumContainer.current, {
        timeline: false, animation: false, geocoder: false, homeButton: false,
        sceneModePicker: false, baseLayerPicker: false, navigationHelpButton: false,
        infoBox: false, selectionIndicator: false, fullscreenButton: false,
      });

      const loadAndFly = async () => {
        try {
          const tileset = await createGooglePhotorealistic3DTileset({ key: Ion.defaultAccessToken, onlyUsingWithGoogleGeocoder: true } as any);
          newViewer.scene.primitives.add(tileset);
          
          // --- MODIFICATION: Fly to initial coordinates on load ---
          newViewer.camera.flyTo({
            destination: Cartesian3.fromDegrees(parseFloat(lng), parseFloat(lat), 350), // Zoomed in to 350m
            orientation: { heading: CesiumMath.toRadians(0.0), pitch: CesiumMath.toRadians(-45.0) },
            duration: 5,
          });

        } catch (error) { console.error(`Failed to load 3D tiles: ${error}`); }
      };
      
      loadAndFly();
      setViewer(newViewer);
    }
    return () => { if (viewer && !viewer.isDestroyed()) { viewer.destroy(); } };
  }, []); // This effect runs only once

  // --- Drawing Event Handler ---
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    if (isDrawing) {
      handler.setInputAction((event: { position: Cartesian2 }) => {
        const earthPosition = viewer.scene.pickPosition(event.position);
        if (earthPosition) setPolygonPoints(prev => [...prev, earthPosition]);
      }, ScreenSpaceEventType.LEFT_CLICK);

      handler.setInputAction((event: { endPosition: Cartesian2 }) => {
        const newPosition = viewer.scene.pickPosition(event.endPosition);
        if (newPosition) mousePositionRef.current = newPosition;
      }, ScreenSpaceEventType.MOUSE_MOVE);

      handler.setInputAction(() => {
        setIsDrawing(false);
        const area = getPolygonArea(polygonPoints);
        setCalculatedArea(area);
        setShowResults(true);
      }, ScreenSpaceEventType.RIGHT_CLICK);
    }
    return () => handler.destroy();
  }, [viewer, isDrawing, polygonPoints]); // Added polygonPoints to dependency array

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
        destination: Cartesian3.fromDegrees(longitude, latitude, 250), // --- MODIFICATION: Zoomed in to 250m ---
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
    if (drawingEntityRef.current) viewer?.entities.remove(drawingEntityRef.current);
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
        <button className="ui-button" onClick={() => alert('Prediction logic would run here!')}>
          <FaBolt /> Run Prediction
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
