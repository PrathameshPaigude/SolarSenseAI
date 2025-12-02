import React, { useState, useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import {
    FaArrowLeft, FaSun, FaMap, FaBolt, FaSync, FaArrowRight, FaChartBar, FaClock
} from 'react-icons/fa';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { AnalysisResult } from '../App';
import { sampleGHI, computePV, PVCalculationResult, ZonalStats, getHourlyIrradiance } from '../services/api';
import { pvPresets } from '../config/pvPresets';
import './SolarAnalysisPage.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

interface LocationState {
    polygonGeoJson: { type: 'Polygon'; coordinates: number[][][] };
    area_m2: number;
    latitude?: number;
    longitude?: number;
    method?: string;
    systemConfig?: { panels: number; watts: number };
}

interface SolarAnalysisPageProps {
    onAnalysisComplete?: (result: AnalysisResult) => void;
}

interface AnalysisData {
    layers: Record<string, ZonalStats> | null;
    pv: PVCalculationResult | null;
    loading: boolean;
    error: string | null;
    selectedPreset: string;
    useTiltCorrection: boolean;
}

interface HourlyIrradianceData {
    hourly: {
        time: string[];
        shortwave_radiation?: (number | null)[];
        direct_radiation?: (number | null)[];
        shortwave_radiation_instant?: (number | null)[];
        direct_radiation_instant?: (number | null)[];
        global_tilted_irradiance_instant?: (number | null)[];
        terrestrial_radiation_instant?: (number | null)[];
        terrestrial_radiation?: (number | null)[];
        global_tilted_irradiance?: (number | null)[];
    };
}

const SolarAnalysisPage: React.FC<SolarAnalysisPageProps> = ({ onAnalysisComplete }) => {
    const location = useLocation<LocationState>();
    const history = useHistory();
    const state = location.state;

    const [analysis, setAnalysis] = useState<AnalysisData>({
        layers: null,
        pv: null,
        loading: false,
        error: null,
        selectedPreset: 'smallResidential',
        useTiltCorrection: false,
    });

    const [hourlyData, setHourlyData] = useState<HourlyIrradianceData | null>(null);
    const [hourlyLoading, setHourlyLoading] = useState(false);

    useEffect(() => {
        if (state && state.polygonGeoJson && state.area_m2 > 0) {
            runAnalysis();
        }
    }, [state]);

    useEffect(() => {
        if (state?.latitude && state?.longitude) {
            fetchHourlyIrradiance();
        }
    }, [state?.latitude, state?.longitude]);

    useEffect(() => {
        if (analysis.layers && analysis.layers.GHI) {
            recalculatePV();
        }
    }, [analysis.selectedPreset, analysis.useTiltCorrection]);

    const runAnalysis = async () => {
        setAnalysis(prev => ({ ...prev, loading: true, error: null }));
        try {
            const layerNames = ['GHI', 'DNI', 'DIF', 'PVOUT', 'GTI', 'OPTA', 'TEMP', 'ELE'];
            const gisResult = await sampleGHI(state.polygonGeoJson, layerNames);

            if (!gisResult.layers || !gisResult.layers.GHI) {
                throw new Error('Failed to sample GHI data');
            }

            const layers = gisResult.layers;
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
                polygonGeoJson: state.polygonGeoJson,
                area_m2: state.area_m2,
                ghi_mean: layers.GHI.mean,
                systemConfig: systemConfig,
                useTiltCorrection: analysis.useTiltCorrection,
                latitude: state.latitude,
                longitude: state.longitude,
            });

            setAnalysis(prev => ({
                ...prev,
                layers: layers,
                pv: pvResult.pv,
                loading: false,
                error: null,
            }));

        } catch (error: any) {
            console.error('Analysis error:', error);
            setAnalysis(prev => ({ ...prev, loading: false, error: error.message }));
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
                polygonGeoJson: state.polygonGeoJson,
                area_m2: state.area_m2,
                ghi_mean: analysis.layers.GHI.mean,
                systemConfig: systemConfig,
                useTiltCorrection: analysis.useTiltCorrection,
                latitude: state.latitude,
                longitude: state.longitude,
            });

            setAnalysis(prev => ({ ...prev, pv: pvResult.pv }));
        } catch (error) {
            console.error('PV Recalculation error:', error);
        }
    };

    const fetchHourlyIrradiance = async () => {
        if (!state?.latitude || !state?.longitude) return;
        
        setHourlyLoading(true);
        try {
            // Get data for today
            const today = new Date().toISOString().slice(0, 10);
            const data = await getHourlyIrradiance({
                lat: state.latitude,
                lng: state.longitude,
                start: today,
                end: today,
            });
            setHourlyData(data);
        } catch (error) {
            console.error('Error fetching hourly irradiance:', error);
        } finally {
            setHourlyLoading(false);
        }
    };

    const handlePrediction = () => {
        if (analysis.pv && state.latitude && state.longitude) {
            const result: AnalysisResult = {
                area: state.area_m2,
                power: analysis.pv.daily_kWh,
                location: { lat: state.latitude.toString(), lng: state.longitude.toString() },
                timestamp: new Date(),
            };
            if (onAnalysisComplete) onAnalysisComplete(result);
            history.push({
                pathname: '/prediction',
                state: {
                    pvOutputAnnual: analysis.pv.yearly_kWh,
                    installedCapacity: analysis.pv.installed_capacity_kWp,
                    area: state.area_m2
                }
            });
        }
    };

    if (!state) return <div>No data</div>;

    const layers = analysis.layers;
    const pv = analysis.pv;
    const currentPreset = pvPresets[analysis.selectedPreset];

    // Chart Data
    const monthlyData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            {
                label: 'Monthly Energy Output (kWh)',
                data: pv ? pv.monthly_kWh : [],
                backgroundColor: 'rgba(255, 152, 0, 0.6)',
                borderColor: 'rgba(255, 152, 0, 1)',
                borderWidth: 1,
            },
        ],
    };

    // Hourly Irradiance Chart Data
    const hourlyChartData = hourlyData ? {
        labels: hourlyData.hourly.time.map((t: string) => {
            const date = new Date(t);
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }),
        datasets: [
            {
                label: 'Shortwave Radiation (W/m²)',
                data: hourlyData.hourly.shortwave_radiation || [],
                borderColor: 'rgba(255, 152, 0, 1)',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Direct Radiation (W/m²)',
                data: hourlyData.hourly.direct_radiation || [],
                borderColor: 'rgba(33, 150, 243, 1)',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Global Tilted Irradiance (W/m²)',
                data: hourlyData.hourly.global_tilted_irradiance || [],
                borderColor: 'rgba(76, 175, 80, 1)',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    } : null;

    const hourlyChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'Hourly Solar Irradiance',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Irradiance (W/m²)',
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'Time of Day',
                },
            },
        },
    };

    return (
        <div className="solar-analysis-page">
            <div className="analysis-grid">
                {/* Left Column */}
                <div className="left-column">
                    {/* Site Summary */}
                    <div className="analysis-card">
                        <h3 className="card-title"><FaMap /> Site Overview</h3>
                        <div className="summary-item">
                            <span className="summary-label">Rooftop Area</span>
                            <span className="summary-value">{state.area_m2.toFixed(1)} m²</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Coordinates</span>
                            <span className="summary-value">{state.latitude?.toFixed(4)}, {state.longitude?.toFixed(4)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Method</span>
                            <span className="summary-value">{state.method || 'Manual Input'}</span>
                        </div>
                    </div>

                    {/* Climate Data */}
                    {layers && (
                        <div className="analysis-card">
                            <h3 className="card-title"><FaSun /> Solar Resource</h3>
                            <div className="climate-grid">
                                <div className="climate-item">
                                    <span className="climate-code">GHI</span>
                                    <span className="climate-value">{(layers.GHI.mean * 365).toFixed(0)}</span>
                                    <span className="climate-unit">kWh/m²/yr</span>
                                </div>
                                <div className="climate-item">
                                    <span className="climate-code">DNI</span>
                                    <span className="climate-value">{(layers.DNI ? layers.DNI.mean * 365 : 0).toFixed(0)}</span>
                                    <span className="climate-unit">kWh/m²/yr</span>
                                </div>
                                <div className="climate-item">
                                    <span className="climate-code">PVOUT</span>
                                    <span className="climate-value">{layers.PVOUT?.mean.toFixed(0)}</span>
                                    <span className="climate-unit">kWh/kWp/yr</span>
                                </div>
                                <div className="climate-item">
                                    <span className="climate-code">TEMP</span>
                                    <span className="climate-value">{layers.TEMP?.mean.toFixed(1)}°C</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PV Config */}
                    <div className="analysis-card">
                        <h3 className="card-title"><FaBolt /> PV Configuration</h3>
                        <div className="preset-selector">
                            {Object.entries(pvPresets).map(([key, preset]) => (
                                <button
                                    key={key}
                                    className={`preset-btn ${analysis.selectedPreset === key ? 'active' : ''}`}
                                    onClick={() => setAnalysis(prev => ({ ...prev, selectedPreset: key }))}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        {currentPreset && (
                            <div className="config-grid">
                                <div className="config-item">
                                    <span className="config-label">Efficiency</span>
                                    <span className="config-value">{(currentPreset.moduleEff * 100).toFixed(1)}%</span>
                                </div>
                                <div className="config-item">
                                    <span className="config-label">Tilt</span>
                                    <span className="config-value">{currentPreset.tiltDeg}°</span>
                                </div>
                            </div>
                        )}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={analysis.useTiltCorrection}
                                onChange={() => setAnalysis(prev => ({ ...prev, useTiltCorrection: !prev.useTiltCorrection }))}
                            />
                            Use Plane-of-Array (POA) correction
                        </label>
                    </div>
                </div>

                {/* Right Column */}
                <div className="right-column">
                    {pv && (
                        <>
                            {/* Energy Summary */}
                            <div className="analysis-card">
                                <h3 className="card-title"><FaBolt /> Energy Yield Summary</h3>
                                <div className="energy-summary-grid">
                                    <div className="energy-metric">
                                        <span className="metric-value">{(pv.yearly_kWh / 1000).toFixed(2)}</span>
                                        <span className="metric-label">Annual Output (MWh)</span>
                                    </div>
                                    <div className="energy-metric">
                                        <span className="metric-value">{pv.kWh_per_kWp_per_year?.toFixed(0) || '-'}</span>
                                        <span className="metric-label">Specific Yield (kWh/kWp)</span>
                                    </div>
                                    <div className="energy-metric">
                                        <span className="metric-value">{pv.daily_kWh.toFixed(1)}</span>
                                        <span className="metric-label">Daily Avg (kWh)</span>
                                    </div>
                                    <div className="energy-metric">
                                        <span className="metric-value">{pv.dc_capacity_kWp?.toFixed(1) || pv.installed_capacity_kWp?.toFixed(1) || '-'}</span>
                                        <span className="metric-label">DC Capacity (kWp)</span>
                                    </div>
                                    <div className="energy-metric">
                                        <span className="metric-value">{pv.ac_capacity_kW?.toFixed(1) || '-'}</span>
                                        <span className="metric-label">AC Capacity (kW)</span>
                                    </div>
                                    <div className="energy-metric">
                                        <span className="metric-value">{pv.n_panels ?? '-'}</span>
                                        <span className="metric-label">Estimated Panels</span>
                                    </div>
                                </div>
                            </div>

                            {/* Monthly Chart */}
                            <div className="analysis-card">
                                <h3 className="card-title"><FaChartBar /> Monthly Production</h3>
                                <div style={{ height: '300px' }}>
                                    <Bar data={monthlyData} options={{ maintainAspectRatio: false, responsive: true }} />
                                </div>
                            </div>

                            {/* Hourly Irradiance Chart */}
                            <div className="analysis-card">
                                <h3 className="card-title"><FaClock /> Hourly Solar Irradiance</h3>
                                {hourlyLoading ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>
                                        <FaSync className="fa-spin" style={{ fontSize: '1.5rem', color: '#ff9800' }} />
                                        <p>Loading irradiance data...</p>
                                    </div>
                                ) : hourlyChartData ? (
                                    <div style={{ height: '300px' }}>
                                        <Line data={hourlyChartData} options={hourlyChartOptions} />
                                    </div>
                                ) : (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                        <p>No hourly irradiance data available</p>
                                        <button 
                                            className="ui-button secondary-button" 
                                            onClick={fetchHourlyIrradiance}
                                            style={{ marginTop: '10px' }}
                                        >
                                            <FaSync /> Load Data
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    {analysis.loading && (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <FaSync className="fa-spin" style={{ fontSize: '2rem', color: '#ff9800' }} />
                            <p>Analyzing solar potential...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="action-bar">
                <div className="action-left">
                    <button className="ui-button secondary-button" onClick={() => history.push('/')}>
                        <FaArrowLeft /> Back to Map
                    </button>
                </div>
                <div className="action-right">
                    <button className="ui-button secondary-button" onClick={runAnalysis}>
                        <FaSync /> Refresh Data
                    </button>
                    <button className="ui-button primary-button" onClick={handlePrediction} disabled={!pv}>
                        Continue to Financial Prediction <FaArrowRight />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SolarAnalysisPage;
