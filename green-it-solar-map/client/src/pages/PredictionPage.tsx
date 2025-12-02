import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { FaRupeeSign, FaChartLine, FaLeaf, FaPiggyBank, FaArrowLeft } from 'react-icons/fa';
import { AnalysisResult } from '../App';
import './PredictionPage.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface PredictionPageProps {
  latestResult?: AnalysisResult;
}

interface LocationState {
  pvOutputAnnual?: number; // kWh/year
  installedCapacity?: number; // kWp
  area?: number;
}

const PredictionPage: React.FC<PredictionPageProps> = ({ latestResult }) => {
  const location = useLocation<LocationState>();
  const history = useHistory();
  const state = location.state;

  // Defaults if no state passed (fallback to latestResult or zeros)
  const initialAnnualOutput = state?.pvOutputAnnual || (latestResult?.power ? latestResult.power * 365 : 0);
  const initialCapacity = state?.installedCapacity || (latestResult?.area ? latestResult.area / 6 : 0); // rough est

  // Financial Inputs State
  const [tariff, setTariff] = useState(8.5); // ₹/kWh
  const [capexPerKw, setCapexPerKw] = useState(45000); // ₹/kWp
  const [omCostPerKw, setOmCostPerKw] = useState(500); // ₹/kW/year
  const [lifetime, setLifetime] = useState(25); // years
  const [inflation, setInflation] = useState(2); // % per year (tariff increase)

  // Derived Metrics
  const totalCapex = useMemo(() => initialCapacity * capexPerKw, [initialCapacity, capexPerKw]);

  const financialProjection = useMemo(() => {
    let cumulativeCashflow = -totalCapex;
    const cashflowData = [cumulativeCashflow];
    const yearlySavingsData: number[] = [];
    let paybackYear = -1;

    for (let year = 1; year <= lifetime; year++) {
      // Degrade output slightly (0.5% per year)
      const output = initialAnnualOutput * Math.pow(0.995, year - 1);

      // Increase tariff by inflation
      const currentTariff = tariff * Math.pow(1 + inflation / 100, year - 1);

      const savings = output * currentTariff;
      const omCost = initialCapacity * omCostPerKw * Math.pow(1.03, year - 1); // 3% O&M inflation

      const netSavings = savings - omCost;
      cumulativeCashflow += netSavings;

      cashflowData.push(cumulativeCashflow);
      yearlySavingsData.push(netSavings);

      if (paybackYear === -1 && cumulativeCashflow >= 0) {
        paybackYear = year + (Math.abs(cashflowData[year - 1]) / netSavings); // Linear interpolation
      }
    }

    return {
      cashflowData,
      firstYearSavings: yearlySavingsData[0],
      paybackYear,
      totalSavings: cumulativeCashflow + totalCapex, // Net savings over lifetime
      roi: ((cumulativeCashflow + totalCapex) / totalCapex) * 100
    };
  }, [initialAnnualOutput, initialCapacity, totalCapex, tariff, omCostPerKw, lifetime, inflation]);

  const chartData = {
    labels: Array.from({ length: lifetime + 1 }, (_, i) => i.toString()),
    datasets: [
      {
        label: 'Cumulative Cashflow (₹)',
        data: financialProjection.cashflowData,
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (context: any) => `₹${context.raw.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value: any) => `₹${value / 1000}k`
        }
      },
      x: {
        title: { display: true, text: 'Years' }
      }
    }
  };

  if (!initialAnnualOutput || !initialCapacity) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Missing Analysis Data</h2>
        <p>Please run a solar analysis first.</p>
        <button className="ui-button primary-button" onClick={() => history.push('/')}>Go to Home</button>
      </div>
    );
  }

  return (
    <div className="prediction-page">
      <div className="prediction-grid">
        {/* Left: Inputs */}
        <div className="input-card">
          <h2 className="card-title"><FaPiggyBank /> Financial Parameters</h2>

          <div className="read-only-summary">
            <div className="summary-row">
              <span>System Size:</span>
              <span>{initialCapacity.toFixed(2)} kWp</span>
            </div>
            <div className="summary-row">
              <span>Annual Output:</span>
              <span>{(initialAnnualOutput / 1000).toFixed(2)} MWh</span>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Electricity Tariff (₹/kWh)</label>
            <input
              type="number" className="input-field"
              value={tariff} onChange={e => setTariff(parseFloat(e.target.value))}
              step="0.1"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Installation Cost (₹/kWp)</label>
            <input
              type="number" className="input-field"
              value={capexPerKw} onChange={e => setCapexPerKw(parseFloat(e.target.value))}
              step="1000"
            />
          </div>

          <div className="input-group">
            <label className="input-label">O&M Cost (₹/kW/year)</label>
            <input
              type="number" className="input-field"
              value={omCostPerKw} onChange={e => setOmCostPerKw(parseFloat(e.target.value))}
              step="100"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Project Lifetime (Years)</label>
            <input
              type="number" className="input-field"
              value={lifetime} onChange={e => setLifetime(parseFloat(e.target.value))}
              max="30"
            />
          </div>

          <button className="ui-button secondary-button" onClick={() => history.push('/solar-analysis')}>
            <FaArrowLeft /> Back to Analysis
          </button>
        </div>

        {/* Right: Results */}
        <div className="results-column">
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-title">Total Investment</span>
              <span className="metric-value">
                ₹{(totalCapex / 100000).toFixed(2)} L
              </span>
              <span className="metric-sub">CAPEX</span>
            </div>

            <div className="metric-card highlight">
              <span className="metric-title">Annual Savings</span>
              <span className="metric-value">
                ₹{financialProjection.firstYearSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className="metric-sub">Year 1</span>
            </div>

            <div className="metric-card">
              <span className="metric-title">Payback Period</span>
              <span className="metric-value">
                {financialProjection.paybackYear > 0 ? financialProjection.paybackYear.toFixed(1) : '> ' + lifetime}
              </span>
              <span className="metric-sub">Years</span>
            </div>

            <div className="metric-card">
              <span className="metric-title">CO₂ Avoided</span>
              <span className="metric-value">
                {(initialAnnualOutput * 0.82 / 1000).toFixed(1)}
              </span>
              <span className="metric-sub">Tons / Year</span>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title"><FaChartLine /> Cashflow Projection</h3>
            </div>
            <div style={{ height: '320px' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;