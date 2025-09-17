import React, { useState } from 'react';
import { AnalysisResult } from '../App';
import './PageStyles.css';
import { FaRulerCombined, FaSolarPanel, FaSun, FaCalendarAlt, FaChartLine } from 'react-icons/fa';

interface PredictionPageProps {
  latestResult?: AnalysisResult;
}

const PredictionPage: React.FC<PredictionPageProps> = ({ latestResult }) => {
  const [isExplanationVisible, setIsExplanationVisible] = useState(false);

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
  const numberOfPanels = Math.floor(area / 1.7);

  return (
    <div className="page-container">
      <h1>Prediction Analysis</h1>
      <h2>Location: {location.lat}, {location.lng}</h2>
      <div className="results-grid">
        <div className="result-card">
          <FaRulerCombined className="icon" />
          <h3>Rooftop Area</h3>
          <p>{area.toFixed(2)} <span>m²</span></p>
        </div>
        <div className="result-card">
          <FaSolarPanel className="icon" />
          <h3>Est. Panels</h3>
          <p>~{numberOfPanels} <span>panels</span></p>
        </div>
        <div className="result-card">
          <FaSun className="icon" />
          <h3>Daily Generation</h3>
          <p>{power.toFixed(2)} <span>kWh</span></p>
        </div>
        <div className="result-card">
          <FaCalendarAlt className="icon" />
          <h3>Monthly Generation</h3>
          <p>{monthlySavings.toFixed(2)} <span>kWh</span></p>
        </div>
        <div className="result-card">
          <FaChartLine className="icon" />
          <h3>Yearly Generation</h3>
          <p>{yearlySavings.toFixed(2)} <span>kWh</span></p>
        </div>
      </div>

      <button 
        className="explanation-toggle-button" 
        onClick={() => setIsExplanationVisible(!isExplanationVisible)}
      >
        {isExplanationVisible ? 'Hide' : 'Show'} Calculation Details
      </button>

      {isExplanationVisible && (
        <div className="explanation-box">
          <h2>How We Calculate This</h2>
          <p>
            Our prediction starts with the <strong>Rooftop Area</strong> you draw. From there, we use a standard model to estimate potential energy generation:
          </p>
          <p>
            1. <strong>Installed Capacity (kW):</strong> We assume a modern solar panel generates about 200 Watts per square meter. The total power capacity is calculated as: <br/>
            <code>Area * 200W/m² / 1000</code>
          </p>
          <p>
            2. <strong>Energy Generation (kWh):</strong> We then multiply this capacity by the average 'Peak Sun Hours' for the location (approx. 5 hours for Pune) and factor in real-world inefficiencies (like heat, dust, and wiring losses) using a performance ratio of 85% and panel efficiency of 20%.<br/>
            <code>Capacity * 5 hours * 0.85 * 0.20</code>
          </p>
        </div>
      )}
    </div>
  );
};

export default PredictionPage;