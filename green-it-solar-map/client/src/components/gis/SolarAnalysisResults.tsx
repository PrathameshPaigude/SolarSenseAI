import React, { useState, useEffect } from 'react';
import { FaRulerCombined, FaBolt, FaSun, FaSync, FaSpinner, FaMap, FaArrowRight } from 'react-icons/fa';
import { sampleGHI, computePV, PVCalculationResult, ZonalStats } from '../../services/api';
import { pvPresets } from '../../config/pvPresets';
import './SolarAnalysisResults.css';

interface SolarAnalysisResultsProps {
  polygonGeoJson: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  area_m2: number;
  latitude?: number;
  longitude?: number;
  onUpdate?: (results: any) => void;
  onPredictionClick?: (data: { dailyKwh: number; area: number }) => void;
}

interface AnalysisData {
  layers: Record<string, ZonalStats> | null;
  pv: PVCalculationResult | null;
  loading: boolean;
  error: string | null;
  selectedPreset: string;
  useTiltCorrection: boolean;
}

const SolarAnalysisResults: React.FC<SolarAnalysisResultsProps> = ({
  polygonGeoJson,
  area_m2,
  latitude,
  longitude,
  onUpdate,
  onPredictionClick,
}) => {
  const [analysis, setAnalysis] = useState<AnalysisData>({
    layers: null,
    pv: null,
    loading: false,
    error: null,
    selectedPreset: 'smallResidential',
    useTiltCorrection: false,
  });

  // Auto-run analysis when polygon or area changes
  useEffect(() => {
    if (polygonGeoJson && area_m2 > 0) {
      runAnalysis();
    }
  }, [polygonGeoJson, area_m2]);

  // Re-run PV calculation when preset changes (without re-fetching GIS data)
  useEffect(() => {
    if (analysis.layers && analysis.layers.GHI) {
      recalculatePV();
    }
  }, [analysis.selectedPreset, analysis.useTiltCorrection]);

  const runAnalysis = async () => {
    setAnalysis(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Step 1: Sample ALL layers
      const layerNames = ['GHI', 'DNI', 'DIF', 'PVOUT', 'GTI', 'OPTA', 'TEMP', 'ELE'];
      const gisResult = await sampleGHI(polygonGeoJson, layerNames);

      if (!gisResult.layers || !gisResult.layers.GHI) {
        throw new Error('Failed to sample GHI data');
      }

      const layers = gisResult.layers;

      // Step 2: Compute PV
      // Use the selected preset from our new config
      const presetConfig = pvPresets[analysis.selectedPreset];

      const systemConfig = {
        name: analysis.selectedPreset,
        displayName: presetConfig.label,
        panelEfficiency: presetConfig.moduleEff,
        tilt: presetConfig.tiltDeg,
        azimuth: presetConfig.azimuthDeg,
        performanceRatio: presetConfig.performanceRatio,
        capacity_kWp: presetConfig.kWp, // Optional hint to backend
      };

      const pvResult = await computePV({
        polygonGeoJson,
        area_m2,
        ghi_mean: layers.GHI.mean,
        systemConfig: systemConfig,
        useTiltCorrection: analysis.useTiltCorrection,
        latitude,
        longitude,
      });

      const newAnalysis = {
        ...analysis,
        layers: layers,
        pv: pvResult.pv,
        loading: false,
        error: null,
      };

      setAnalysis(newAnalysis);

      if (onUpdate) {
        onUpdate({
          layers: layers,
          pv: pvResult.pv,
          systemConfig: pvResult.systemConfig,
        });
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      setAnalysis(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to analyze solar potential',
      }));
    }
  };

  const recalculatePV = async () => {
    if (!analysis.layers || !analysis.layers.GHI) return;

    try {
      const presetConfig = pvPresets[analysis.selectedPreset];
      const systemConfig = {
        name: analysis.selectedPreset,
        displayName: presetConfig.label,
        panelEfficiency: presetConfig.moduleEff,
        tilt: presetConfig.tiltDeg,
        azimuth: presetConfig.azimuthDeg,
        performanceRatio: presetConfig.performanceRatio,
        capacity_kWp: presetConfig.kWp,
      };

      const pvResult = await computePV({
        polygonGeoJson,
        area_m2,
        ghi_mean: analysis.layers.GHI.mean,
        systemConfig: systemConfig,
        useTiltCorrection: analysis.useTiltCorrection,
        latitude,
        longitude,
      });

      setAnalysis(prev => ({
        ...prev,
        pv: pvResult.pv,
      }));
    } catch (error) {
      console.error('PV Recalculation error:', error);
    }
  };

  const handlePresetChange = (presetName: string) => {
    setAnalysis(prev => ({ ...prev, selectedPreset: presetName }));
  };

  const handleTiltCorrectionToggle = () => {
    setAnalysis(prev => ({ ...prev, useTiltCorrection: !prev.useTiltCorrection }));
  };

  const currentPreset = pvPresets[analysis.selectedPreset];
  const layers = analysis.layers;

  return (
    <div className="solar-analysis-container">
      <div className="solar-header">
        <h3>
          <FaSun className="icon-sun" />
          Solar Analysis Results
        </h3>
      </div>

      {analysis.loading && (
        <div className="loading-container">
          <FaSpinner className="fa-spin" size={32} />
          <p>Analyzing solar potential...</p>
        </div>
      )}

      {analysis.error && (
        <div className="error-container">
          <strong>Error:</strong> {analysis.error}
        </div>
      )}

      {layers && !analysis.loading && (
        <>
          {/* Area Info */}
          <div className="area-info">
            <span className="area-label">
              <FaRulerCombined />
              Rooftop Area:
            </span>
            <span className="area-value">{area_m2.toFixed(2)} m²</span>
          </div>

          {/* Map Data Card */}
          <div className="data-card">
            <h4 className="card-title">
              <FaMap />
              Site Climate Data
            </h4>

            <div className="grid-stats">
              {/* GHI */}
              <div className="stat-item">
                <span className="stat-label">GHI (Global Horizontal)</span>
                <span className="stat-value">
                  {layers.GHI ? (layers.GHI.mean * 365).toFixed(0) : '-'} <span className="stat-unit">kWh/m²/yr</span>
                </span>
              </div>

              {/* DNI */}
              <div className="stat-item">
                <span className="stat-label">DNI (Direct Normal)</span>
                <span className="stat-value">
                  {layers.DNI ? (layers.DNI.mean * 365).toFixed(0) : '-'} <span className="stat-unit">kWh/m²/yr</span>
                </span>
              </div>

              {/* DIF */}
              <div className="stat-item">
                <span className="stat-label">DIF (Diffuse)</span>
                <span className="stat-value">
                  {layers.DIF ? (layers.DIF.mean * 365).toFixed(0) : '-'} <span className="stat-unit">kWh/m²/yr</span>
                </span>
              </div>

              {/* GTI */}
              <div className="stat-item">
                <span className="stat-label">GTI (Global Tilted)</span>
                <span className="stat-value">
                  {layers.GTI ? (layers.GTI.mean * 365).toFixed(0) : '-'} <span className="stat-unit">kWh/m²/yr</span>
                </span>
              </div>

              {/* PVOUT */}
              <div className="stat-item">
                <span className="stat-label">PV Potential</span>
                <span className="stat-value">
                  {layers.PVOUT ? layers.PVOUT.mean.toFixed(0) : '-'} <span className="stat-unit">kWh/kWp/yr</span>
                </span>
              </div>

              {/* OPTA */}
              <div className="stat-item">
                <span className="stat-label">Optimum Tilt</span>
                <span className="stat-value">
                  {layers.OPTA ? layers.OPTA.mean.toFixed(1) : '-'}°
                </span>
              </div>

              {/* TEMP */}
              <div className="stat-item">
                <span className="stat-label">Temperature</span>
                <span className="stat-value">
                  {layers.TEMP ? layers.TEMP.mean.toFixed(1) : '-'}°C
                </span>
              </div>
            </div>
          </div>

          {/* PV System Configuration */}
          <div className="config-section">
            <h4 className="card-title">PV System Configuration</h4>
            <select
              value={analysis.selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="preset-select"
            >
              {Object.entries(pvPresets).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
            </select>

            {currentPreset && (
              <div className="preset-details">
                <div className="detail-row">
                  <span>Efficiency: {(currentPreset.moduleEff * 100).toFixed(1)}%</span>
                  <span>PR: {(currentPreset.performanceRatio * 100).toFixed(0)}%</span>
                </div>
                <div className="detail-row">
                  <span>Tilt: {currentPreset.tiltDeg}°</span>
                  <span>Azimuth: {currentPreset.azimuthDeg}°</span>
                </div>
              </div>
            )}

            {latitude !== undefined && longitude !== undefined && (
              <label className="tilt-correction">
                <input
                  type="checkbox"
                  checked={analysis.useTiltCorrection}
                  onChange={handleTiltCorrectionToggle}
                />
                Use tilt correction (POA)
              </label>
            )}
          </div>

          {/* PV Results */}
          {analysis.pv && (
            <div className="energy-output">
              <h4 className="energy-title">
                <FaBolt />
                Energy Output
              </h4>
              <div className="energy-content">
                <div className="energy-row">
                  <span className="energy-label">Daily Average:</span>
                  <span className="energy-value">{analysis.pv.daily_kWh.toFixed(2)} kWh</span>
                </div>
                <div className="energy-row">
                  <span className="energy-label">Annual Total:</span>
                  <span className="energy-value highlight-value">
                    {(analysis.pv.yearly_kWh / 1000).toFixed(2)} MWh
                  </span>
                </div>
                {analysis.pv.kWh_per_kWp_per_year && (
                  <div className="energy-row">
                    <span className="energy-label">Specific yield:</span>
                    <span className="energy-value">{analysis.pv.kWh_per_kWp_per_year.toFixed(0)} kWh/kWp</span>
                  </div>
                )}
                {analysis.pv.installed_capacity_kWp && (
                  <div className="energy-row">
                    <span className="energy-label">Installed capacity:</span>
                    <span className="energy-value">{analysis.pv.installed_capacity_kWp.toFixed(2)} kWp</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button onClick={runAnalysis} className="refresh-button" style={{ flex: 1 }}>
              <FaSync /> Refresh Data
            </button>

            {onPredictionClick && analysis.pv && (
              <button
                onClick={() => onPredictionClick({ dailyKwh: analysis.pv!.daily_kWh, area: area_m2 })}
                className="refresh-button"
                style={{ flex: 1, background: '#3b82f6' }}
              >
                <FaArrowRight /> Go to Prediction
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SolarAnalysisResults;

