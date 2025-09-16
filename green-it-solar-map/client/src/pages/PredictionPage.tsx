import React from 'react';
import { AnalysisResult } from '../App';
import './PageStyles.css'; // A shared stylesheet for pages

interface PredictionPageProps {
  latestResult?: AnalysisResult;
}

const PredictionPage: React.FC<PredictionPageProps> = ({ latestResult }) => {
  if (!latestResult) {
    return (
      <div className="page-container">
        <h1>Prediction Tool</h1>
        <p>No analysis has been run yet. Please go to the Home page, draw a polygon, and run a prediction.</p>
      </div>
    );
  }

  const { area, power, location } = latestResult;
  const monthlySavings = power * 30;
  const yearlySavings = power * 365;
  const numberOfPanels = Math.floor(area / 1.7); // Avg panel is 1.7 m^2

  return (
    <div className="page-container">
      <h1>Prediction Analysis</h1>
      <h2>Location: {location.lat}, {location.lng}</h2>
      <div className="results-grid">
        <div className="result-card">
          <h3>Rooftop Area</h3>
          <p>{area.toFixed(2)} <span>m²</span></p>
        </div>
        <div className="result-card">
          <h3>Est. Panels</h3>
          <p>~{numberOfPanels} <span>panels</span></p>
        </div>
        <div className="result-card">
          <h3>Daily Generation</h3>
          <p>{power.toFixed(2)} <span>kWh</span></p>
        </div>
        <div className="result-card">
          <h3>Monthly Generation</h3>
          <p>{monthlySavings.toFixed(2)} <span>kWh</span></p>
        </div>
        <div className="result-card">
          <h3>Yearly Generation</h3>
          <p>{yearlySavings.toFixed(2)} <span>kWh</span></p>
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;