import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { FaRupeeSign, FaChartLine, FaLeaf, FaPiggyBank, FaArrowLeft, FaSync } from 'react-icons/fa';
import { AnalysisResult } from '../App';
import { computeFinancials, FinancialSummary, FinancialInputs } from '../services/api';
import './PredictionPage.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface PredictionPageProps {
  latestResult?: AnalysisResult;
}

interface LocationState {
  pvOutputAnnual?: number; // kWh/year
  installedCapacity?: number; // kWp
  area?: number;
  gridType?: "on_grid" | "hybrid" | "off_grid";
  panelTechnology?: "mono" | "poly" | "thinfilm";
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
  const [capexPerKw, setCapexPerKw] = useState<number | undefined>(undefined); // Leave undefined to use smart defaults
  const [omCostPerKw, setOmCostPerKw] = useState(800); // ₹/kW/year
  const [lifetime, setLifetime] = useState(25); // years

  // Results State
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce effect for recalculation
  useEffect(() => {
    if (initialAnnualOutput > 0 && initialCapacity > 0) {
      const timer = setTimeout(() => {
        runFinancialAnalysis();
      }, 500); // 500ms debounce
      return () => clearTimeout(timer);
    }
  }, [tariff, capexPerKw, omCostPerKw, lifetime, initialAnnualOutput, initialCapacity]);

  const runFinancialAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const inputs: FinancialInputs = {
        systemSize_kWp: initialCapacity,
        annualOutput_kWh: initialAnnualOutput,
        gridType: state?.gridType,
        panelTechnology: state?.panelTechnology,
        tariff_Rs_per_kWh: tariff,
        capex_Rs_per_kWp: capexPerKw, // If undefined, backend uses smart default
        om_Rs_per_kWp_per_year: omCostPerKw,
        projectLifetime_years: lifetime,
      };

      const result = await computeFinancials(inputs);
      setSummary(result);
    } catch (err: any) {
      console.error('Financial analysis failed:', err);
      setError(err.message || 'Failed to compute financials');
    } finally {
      setLoading(false);
    }
  };

  // Chart Data
  const chartData = useMemo(() => {
    if (!summary) return null;
    return {
      labels: summary.years.map(y => y.year.toString()),
      datasets: [
        {
          label: 'Cumulative Cashflow (₹)',
          data: summary.years.map(y => y.cumulativeCashflow_Rs),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: true,
          tension: 0.4,
        }
      ]
    };
  }, [summary]);

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
          callback: (value: any) => `₹${value / 100000}L`
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
            {state?.gridType && (
              <div className="summary-row">
                <span>Grid Type:</span>
                <span style={{ textTransform: 'capitalize' }}>{state.gridType.replace('_', ' ')}</span>
              </div>
            )}
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
            <div className="input-with-hint">
              <input
                type="number" className="input-field"
                value={capexPerKw || ''}
                placeholder={summary?.inputs.capex_Rs_per_kWp ? `Default: ${summary.inputs.capex_Rs_per_kWp.toLocaleString()}` : 'Auto-calculated'}
                onChange={e => setCapexPerKw(e.target.value ? parseFloat(e.target.value) : undefined)}
                step="1000"
              />
            </div>
            <small className="input-hint">Leave empty to use smart default based on system type.</small>
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

          <div className="button-group" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="ui-button secondary-button" onClick={() => history.push('/solar-analysis')}>
              <FaArrowLeft /> Back to Analysis
            </button>
            <button className="ui-button primary-button" onClick={() => history.push('/dashboard')}>
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="results-column">
          {loading && !summary && <div className="loading-overlay"><FaSync className="fa-spin" /> Calculating...</div>}

          {error && <div className="error-message">{error}</div>}

          {summary && (
            <>
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-title">Total Investment</span>
                  <span className="metric-value">
                    ₹{(summary.totalCapex_Rs / 100000).toFixed(2)} L
                  </span>
                  <span className="metric-sub">CAPEX</span>
                </div>

                <div className="metric-card highlight">
                  <span className="metric-title">Annual Savings</span>
                  <span className="metric-value">
                    ₹{summary.firstYearNetSavings_Rs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="metric-sub">Year 1</span>
                </div>

                <div className="metric-card">
                  <span className="metric-title">Payback Period</span>
                  <span className="metric-value">
                    {summary.paybackYears ? summary.paybackYears.toFixed(1) : '> ' + lifetime}
                  </span>
                  <span className="metric-sub">Years</span>
                </div>

                <div className="metric-card">
                  <span className="metric-title">CO₂ Avoided</span>
                  <span className="metric-value">
                    {summary.co2Avoided_tons_per_year.toFixed(1)}
                  </span>
                  <span className="metric-sub">Tons / Year</span>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <h3 className="chart-title"><FaChartLine /> Cashflow Projection</h3>
                </div>
                <div style={{ height: '320px' }}>
                  {chartData && <Line data={chartData} options={chartOptions} />}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;