import React from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import SolarAnalysisResults from '../components/gis/SolarAnalysisResults';
import { FaArrowLeft } from 'react-icons/fa';
import { AnalysisResult } from '../App';

interface LocationState {
    polygonGeoJson: {
        type: 'Polygon';
        coordinates: number[][][];
    };
    area_m2: number;
    latitude?: number;
    longitude?: number;
}

interface SolarAnalysisPageProps {
    onAnalysisComplete?: (result: AnalysisResult) => void;
}

const SolarAnalysisPage: React.FC<SolarAnalysisPageProps> = ({ onAnalysisComplete }) => {
    const location = useLocation<LocationState>();
    const history = useHistory();
    const state = location.state;

    if (!state || !state.polygonGeoJson || !state.area_m2) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>No analysis data found</h2>
                <p>Please go back to the home page and select an area first.</p>
                <button
                    onClick={() => history.push('/')}
                    style={{
                        marginTop: '1rem',
                        padding: '0.75rem 1.5rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    Back to Map
                </button>
            </div>
        );
    }

    const handlePrediction = (data: { dailyKwh: number; area: number }) => {
        if (onAnalysisComplete && state.latitude && state.longitude) {
            const result: AnalysisResult = {
                area: data.area,
                power: data.dailyKwh,
                location: {
                    lat: state.latitude.toString(),
                    lng: state.longitude.toString()
                },
                timestamp: new Date(),
            };
            onAnalysisComplete(result);
            history.push('/prediction');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f8fafc',
            padding: '2rem 1rem'
        }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <button
                    onClick={() => history.push('/')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        marginBottom: '1rem',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                    <FaArrowLeft /> Back to Map
                </button>

                <SolarAnalysisResults
                    polygonGeoJson={state.polygonGeoJson}
                    area_m2={state.area_m2}
                    latitude={state.latitude}
                    longitude={state.longitude}
                    onPredictionClick={handlePrediction}
                />
            </div>
        </div>
    );
};

export default SolarAnalysisPage;
