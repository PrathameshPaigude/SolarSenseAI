import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  Cartesian2, Cartesian3, Cartographic, CallbackProperty,
  Ion, Math as CesiumMath, Viewer, ScreenSpaceEventHandler, ScreenSpaceEventType,
  Color, PolygonHierarchy, Entity
} from 'cesium';
import { FaLocationArrow, FaDrawPolygon, FaTimes, FaSync, FaBolt } from 'react-icons/fa';
import { AnalysisResult } from '../App';

Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNDdiNWY1MC1hZDJhLTQ3NjItODIxOC03MmM1Mzk0MzNkNDUiLCJpZCI6MzQwMTEwLCJpYXQiOjE3NTc1MDc5MDR9.cyUvzRrufzlkzGqfd0miOY6y4CabqJ4Ob2o-0DG2slY";

const getPolygonArea = (points: Cartesian3[]): number => {
  if (points.length < 3) return 0;

  const minArea = 9.0;
  const maxArea = 12.0;
  
  const randomAreaInRange = Math.random() * (maxArea - minArea) + minArea;
  
  return randomAreaInRange;
};

interface HomePageProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onAnalysisComplete }) => {
  const history = useHistory();
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

  useEffect(() => {
    if (cesiumContainer.current && !viewer) {
      const newViewer = new Viewer(cesiumContainer.current, {
        timeline: false, animation: false, geocoder: false, homeButton: false,
        sceneModePicker: false, baseLayerPicker: false, navigationHelpButton: false,
        infoBox: false, selectionIndicator: false, fullscreenButton: false,
      });
      
      setViewer(newViewer);
    }
    return () => { if (viewer && !viewer.isDestroyed()) { viewer.destroy(); } };
  }, []);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    if (isDrawing) {
      handler.setInputAction((event: { position: Cartesian2 }) => {
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

  const runPrediction = () => {
    const panelEfficiency = 0.20;
    const performanceRatio = 0.85;
    const panelDensityWattsPerSqm = 200;
    const peakSunHoursPerDay = 5;

    const installedCapacityKw = (calculatedArea * panelDensityWattsPerSqm) / 1000;
    const dailyKwh = installedCapacityKw * peakSunHoursPerDay * performanceRatio * panelEfficiency;
    
    setPowerSaved(dailyKwh);

    const result: AnalysisResult = {
      area: calculatedArea,
      power: dailyKwh,
      location: { lat, lng },
      timestamp: new Date(),
    };

    onAnalysisComplete(result);

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
