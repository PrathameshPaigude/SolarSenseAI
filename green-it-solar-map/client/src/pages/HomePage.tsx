import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  Cartesian2, Cartesian3, CallbackProperty,
  Ion, Math as CesiumMath, Viewer, ScreenSpaceEventHandler, ScreenSpaceEventType,
  Color, PolygonHierarchy, Entity
} from 'cesium';
import { FaLocationArrow, FaDrawPolygon, FaTimes, FaBolt, FaRulerCombined, FaGlobe, FaKeyboard } from 'react-icons/fa';
import { AnalysisResult } from '../App';
import { safeComputeGeodesicAreaM2, validatePolygon, cesiumPositionsToLonLatRing } from '../utils/cesiumArea';

Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNDdiNWY1MC1hZDJhLTQ3NjItODIxOC03MmM1Mzk0MzNkNDUiLCJpZCI6MzQwMTEwLCJpYXQiOjE3NTc1MDc5MDR9.cyUvzRrufzlkzGqfd0miOY6y4CabqJ4Ob2o-0DG2slY";

interface HomePageProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
}

type InputMode = 'choice' | 'direct' | 'globe';

const HomePage: React.FC<HomePageProps> = ({ onAnalysisComplete }) => {
  const history = useHistory();
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('choice');
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<Cartesian3[]>([]);
  const [directAreaInput, setDirectAreaInput] = useState('');

  const [lat, setLat] = useState('18.463645');
  const [lng, setLng] = useState('73.868095');

  const drawingEntityRef = useRef<Entity | null>(null);
  const mousePositionRef = useRef<Cartesian3 | null>(null);

  useEffect(() => {
    if (cesiumContainer.current && !viewer) {
      try {
        const newViewer = new Viewer(cesiumContainer.current, {
          timeline: false, animation: false, geocoder: false, homeButton: false,
          sceneModePicker: false, baseLayerPicker: false, navigationHelpButton: false,
          infoBox: false, selectionIndicator: false, fullscreenButton: false,
        });
        setViewer(newViewer);
      } catch (e: any) {
        // Cesium throws a RuntimeError when WebGL initialization fails. Capture message and show friendly UI.
        const msg = (e && e.message) ? e.message : String(e);
        console.error('Cesium initialization failed:', e);
        setWebglError(msg || 'Unknown error while initializing WebGL/Cesium');
      }
    }
    return () => { if (viewer && !viewer.isDestroyed()) { viewer.destroy(); } };
  }, []);

  // Convert polygon points to GeoJSON format
  const getPolygonGeoJSON = (points: Cartesian3[]) => {
    if (points.length < 3) return null;
    const ring = cesiumPositionsToLonLatRing(points);
    if (ring.length < 4) return null;
    return {
      type: 'Polygon' as const,
      coordinates: [ring],
    };
  };

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

        // Validate polygon before computing area
        const validation = validatePolygon(polygonPoints);
        if (!validation.valid) {
          alert(`Invalid polygon: ${validation.error || 'Please draw a valid polygon with at least 3 points.'}`);
          setPolygonPoints([]);
          return;
        }

        // Compute geodesic area using the safe wrapper
        const area = safeComputeGeodesicAreaM2(polygonPoints);

        if (area === 0) {
          alert('Could not calculate area. Please try drawing the polygon again.');
          setPolygonPoints([]);
          return;
        }

        // Warn user if polygon has self-intersections
        if (validation.hasKinks) {
          alert('Warning: Polygon has self-intersections. Area may be inaccurate. Please redraw for better accuracy.');
        }

        // Navigate to results page
        const polygonGeoJSON = getPolygonGeoJSON(polygonPoints);
        if (polygonGeoJSON) {
          history.push({
            pathname: '/solar-analysis',
            state: {
              polygonGeoJson: polygonGeoJSON,
              area_m2: area,
              latitude: parseFloat(lat),
              longitude: parseFloat(lng)
            }
          });
        }
      }, ScreenSpaceEventType.RIGHT_CLICK);
    }
    return () => handler.destroy();
  }, [viewer, isDrawing, polygonPoints, history, lat, lng]);

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
    setPolygonPoints([]);
    if (drawingEntityRef.current) viewer?.entities.remove(drawingEntityRef.current);
  };

  const reset = () => {
    setIsDrawing(false);
    setPolygonPoints([]);
    setInputMode('choice');
    setDirectAreaInput('');
    if (drawingEntityRef.current) viewer?.entities.remove(drawingEntityRef.current);
  };

  const handleDirectAreaSubmit = () => {
    const area = parseFloat(directAreaInput);
    if (isNaN(area) || area <= 0) {
      alert('Please enter a valid area in square meters.');
      return;
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      alert('Please enter valid coordinates (Latitude and Longitude).');
      return;
    }

    // Create a synthetic polygon around the point for GSA sampling
    // ~10m box: +/- 0.0001 degrees
    const delta = 0.0001;
    const syntheticPoints = [
      Cartesian3.fromDegrees(longitude - delta, latitude - delta),
      Cartesian3.fromDegrees(longitude + delta, latitude - delta),
      Cartesian3.fromDegrees(longitude + delta, latitude + delta),
      Cartesian3.fromDegrees(longitude - delta, latitude + delta)
    ];

    const polygonGeoJSON = getPolygonGeoJSON(syntheticPoints);

    if (polygonGeoJSON) {
      history.push({
        pathname: '/solar-analysis',
        state: {
          polygonGeoJson: polygonGeoJSON,
          area_m2: area,
          latitude: latitude,
          longitude: longitude
        }
      });
    }
  };

  const selectInputMode = (mode: 'direct' | 'globe') => {
    setInputMode(mode);
    if (mode === 'globe' && viewer) {
      // Reset to default view if needed
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(parseFloat(lng), parseFloat(lat), 250),
        orientation: { heading: CesiumMath.toRadians(0.0), pitch: CesiumMath.toRadians(-45.0) },
        duration: 2,
      });
    }
  };

  const renderChoicePanel = () => (
    <div className="choice-panel">
      <h3 className="choice-title">Select Input Method</h3>
      <p className="choice-subtitle">How would you like to provide the rooftop area?</p>
      <div className="choice-buttons">
        <button className="choice-button" onClick={() => selectInputMode('direct')}>
          <div className="choice-icon">
            <FaKeyboard />
          </div>
          <div className="choice-content">
            <h4>Direct Input</h4>
            <p>Enter area & coordinates</p>
          </div>
        </button>
        <button className="choice-button" onClick={() => selectInputMode('globe')}>
          <div className="choice-icon">
            <FaGlobe />
          </div>
          <div className="choice-content">
            <h4>Select on Globe</h4>
            <p>Draw polygon on map</p>
          </div>
        </button>
      </div>
    </div>
  );

  const renderDirectInputPanel = () => (
    <div className="direct-input-panel">
      <h3 className="panel-title">Enter Site Details</h3>

      <div className="input-section">
        <label className="input-label">
          <FaRulerCombined className="label-icon" />
          Area (m²)
        </label>
        <input
          type="number"
          value={directAreaInput}
          onChange={e => setDirectAreaInput(e.target.value)}
          className="area-input"
          placeholder="e.g., 50.5"
          min="0"
          step="0.01"
        />
      </div>

      <div className="input-section">
        <label className="input-label">
          <FaLocationArrow className="label-icon" />
          Location
        </label>
        <div className="coord-inputs">
          <input
            type="number"
            value={lat}
            onChange={e => setLat(e.target.value)}
            className="coord-input"
            placeholder="Lat"
            step="0.000001"
          />
          <input
            type="number"
            value={lng}
            onChange={e => setLng(e.target.value)}
            className="coord-input"
            placeholder="Lng"
            step="0.000001"
          />
        </div>
      </div>

      <div className="input-actions">
        <button className="ui-button primary-button" onClick={handleDirectAreaSubmit}>
          <FaBolt /> Calculate
        </button>
        <button className="ui-button secondary-button" onClick={reset}>
          <FaTimes /> Cancel
        </button>
      </div>
    </div>
  );

  const renderGlobePanel = () => (
    <>
      <div className="globe-controls">
        <div className="input-group">
          <input type="text" value={lat} onChange={e => setLat(e.target.value)} className="coord-input" placeholder="Latitude" />
          <input type="text" value={lng} onChange={e => setLng(e.target.value)} className="coord-input" placeholder="Longitude" />
        </div>
        <button className="ui-button primary-button" onClick={handleFlyTo}>
          <FaLocationArrow /> Fly to Location
        </button>
        <button className="ui-button primary-button" onClick={startDrawing}>
          <FaDrawPolygon /> Draw Solar Area
        </button>
      </div>
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

  const renderPanelContent = () => {
    if (inputMode === 'choice') {
      return renderChoicePanel();
    }
    if (isDrawing) {
      return renderDrawingPanel();
    }
    if (inputMode === 'direct') {
      return renderDirectInputPanel();
    }
    if (inputMode === 'globe') {
      return renderGlobePanel();
    }
    return null;
  };

  return (
    <div>
      <div className="ui-panel">
        {renderPanelContent()}
      </div>

      {webglError ? (
        <div style={{ padding: 20 }}>
          <h2>WebGL Initialization Failed</h2>
          <p>Cesium failed to initialize WebGL in your browser. This can happen if hardware acceleration is disabled, your browser does not support WebGL, or GPU drivers are outdated.</p>
          <p><strong>Error:</strong> {webglError}</p>
          <p>Please verify WebGL support and try one of the options below:</p>
          <ul>
            <li>Visit <a href="http://get.webgl.org" target="_blank" rel="noreferrer">get.webgl.org</a> to test WebGL in your browser.</li>
            <li>Enable hardware acceleration in your browser settings and restart it.</li>
            <li>Try a different browser (Chrome, Firefox, Edge) or update your graphics drivers.</li>
            <li>Open <code>chrome://gpu</code> (Chrome/Edge) or equivalent to inspect GPU/feature status.</li>
          </ul>
        </div>
      ) : (
        <div ref={cesiumContainer} style={{ width: '100%', height: '90vh', margin: 0, padding: 0, overflow: 'hidden' }} />
      )}
    </div>
  );
};

export default HomePage;
