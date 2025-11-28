import React, { useEffect, useState } from 'react';
import { AnalysisResult } from '../App';
import './PageStyles.css';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface DashboardPageProps {
  history: AnalysisResult[];
}

const DashboardPage: React.FC<DashboardPageProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="page-container">
        <h1>Dashboard</h1>
        <p>No analyses in your history. Go to the Home page to start a new one.</p>
      </div>
    );
  }

  const chartData = {
    labels: history.slice(0, 10).reverse().map(item => item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    datasets: [
      {
        label: 'Est. Daily Power (kWh)',
        data: history.slice(0, 10).reverse().map(item => item.power),
        fill: true,
        backgroundColor: 'rgba(0, 255, 157, 0.2)',
        borderColor: 'rgba(0, 255, 157, 1)',
        pointBackgroundColor: 'rgba(0, 255, 157, 1)',
        pointBorderColor: '#fff',
        pointHoverRadius: 7,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Rooftop Area (m²)',
        data: history.slice(0, 10).reverse().map(item => item.area),
        fill: false,
        borderColor: 'rgba(0, 123, 255, 1)',
        pointBackgroundColor: 'rgba(0, 123, 255, 1)',
        pointBorderColor: '#fff',
        pointHoverRadius: 7,
        tension: 0.4,
        yAxisID: 'y1',
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#fff'
        }
      },
      title: {
        display: true,
        text: 'Recent Analysis History',
        color: '#fff',
        font: { size: 18 }
      },
    },
    scales: {
      x: {
        ticks: { color: '#ccc', autoSkip: true, maxRotation: 0, maxTicksLimit: 8 },
        grid: { display: false },
        title: {
          display: true,
          text: 'Time of Analysis',
          color: '#ccc'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        ticks: { color: 'rgba(0, 255, 157, 1)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        title: {
          display: true,
          text: 'Power (kWh)',
          color: 'rgba(0, 255, 157, 1)'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        ticks: { color: 'rgba(0, 123, 255, 1)' },
        grid: { display: false },
        title: {
          display: true,
          text: 'Area (m²)',
          color: 'rgba(0, 123, 255, 1)'
        }
      },
    }
  };

  // --- Open-Meteo integration ---
  const [solarData, setSolarData] = useState<number[]>([]);
  const [solarLabels, setSolarLabels] = useState<string[]>([]);
  const [solarLoading, setSolarLoading] = useState(true);
  const [solarError, setSolarError] = useState<string | null>(null);
  const [solarInfo, setSolarInfo] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSolarData() {
      setSolarLoading(true);
      setSolarError(null);
      setSolarInfo(null);
      try {
        // Use college location and today's date
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const lat = 18.5196;
        const lng = 73.8554;
        // helper to fetch for a given yyyymmdd date string
        async function fetchForDate(yyyymmdd: string) {
          const url = `/api/solar-data?lat=${lat}&lng=${lng}&start=${yyyymmdd}&end=${yyyymmdd}`;
          console.log('Fetching solar data from:', url);
          const res = await fetch(url);
          console.log('Response status:', res.status, res.statusText);
          if (!res.ok) {
            const text = await res.text();
            console.error('API returned error:', text.slice(0, 200));
            throw new Error(`API error ${res.status}: ${res.statusText}`);
          }
          const json = await res.json();
          console.log('Got solar data for', yyyymmdd, json);
          const times = json.hourly?.time || [];
          const irradiance = json.hourly?.global_tilted_irradiance || [];
          const validData = times.map((t: string, idx: number) => ({
            time: t.slice(11, 16),
            irradiance: irradiance[idx] !== null ? Math.round(irradiance[idx] * 10) / 10 : null,
          })).filter((d: any) => d.irradiance !== null);
          return { validData, raw: json };
        }

        // try today's data first
        const todayResult = await fetchForDate(today);
        console.log('Valid data points for today:', todayResult.validData.length);

        if (todayResult.validData.length > 0) {
          setSolarLabels(todayResult.validData.map((d: any) => d.time));
          setSolarData(todayResult.validData.map((d: any) => d.irradiance));
        } else {
          // If today has no valid irradiance (likely night), try yesterday as a friendly fallback
          const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const ymd = yesterdayDate.toISOString().slice(0, 10).replace(/-/g, '');
          const yesterdayResult = await fetchForDate(ymd);
          console.log('Valid data points for yesterday:', yesterdayResult.validData.length);
          if (yesterdayResult.validData.length > 0) {
            setSolarLabels(yesterdayResult.validData.map((d: any) => d.time));
            setSolarData(yesterdayResult.validData.map((d: any) => d.irradiance));
            const readable = yesterdayDate.toLocaleDateString();
            setSolarInfo(`No irradiance data for today (night). Showing data for ${readable} instead.`);
          } else {
            setSolarError('No valid irradiance data available for today or yesterday');
          }
        }
      } catch (err: any) {
        const errMsg = err.message || String(err);
        console.error('Solar data fetch error:', errMsg);
        setSolarError(errMsg);
      } finally {
        setSolarLoading(false);
      }
    }
    fetchSolarData();
  }, []);

  const solarChartData = {
    labels: solarLabels,
    datasets: [
      {
        label: 'Global Tilted Irradiance (W/m²)',
        data: solarData,
        fill: true,
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        borderColor: 'rgba(255, 215, 0, 1)',
        pointBackgroundColor: 'rgba(255, 215, 0, 1)',
        pointBorderColor: '#fff',
        pointHoverRadius: 7,
        tension: 0.4,
        yAxisID: 'y',
      }
    ],
  };

  const solarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { 
        position: 'top' as const, 
        labels: { color: '#fff' } 
      },
      title: { 
        display: true, 
        text: 'Today\'s Hourly Solar Irradiance - Global Tilted (Open-Meteo)', 
        color: '#fff', 
        font: { size: 16 } 
      },
    },
    scales: {
      x: { 
        ticks: { color: '#ccc' }, 
        grid: { display: false }, 
        title: { display: true, text: 'Time (Hour)', color: '#ccc' } 
      },
      y: { 
        type: 'linear' as const, 
        display: true, 
        position: 'left' as const, 
        beginAtZero: true, 
        ticks: { color: 'rgba(255, 215, 0, 1)' }, 
        grid: { color: 'rgba(255, 255, 255, 0.1)' }, 
        title: { display: true, text: 'Irradiance (W/m²)', color: 'rgba(255, 215, 0, 1)' } 
      },
    },
  };

  return (
    <div className="page-container">
      <h1>Dashboard</h1>
      <div className="dashboard-layout">
        <div className="left-charts">
          <div className="chart-container">
            <Line options={chartOptions} data={chartData} />
          </div>
          <div className="solar-chart-container">
            <h3 style={{ margin: 0, marginBottom: 8, color: '#ccc' }}>Today's Hourly Solar Irradiance (Global Tilted)</h3>
            {solarLoading ? (
              <p>Loading solar data...</p>
            ) : solarError ? (
              <p style={{color: 'red'}}>Error: {solarError}</p>
            ) : solarInfo ? (
              <>
                <p style={{color: '#ddd', marginTop: 0}}>{solarInfo}</p>
                <Line options={solarChartOptions} data={solarChartData} />
              </>
            ) : solarData.length === 0 ? (
              <p>No solar data available for today</p>
            ) : (
              <Line options={solarChartOptions} data={solarChartData} />
            )}
          </div>
        </div>
        <div className="explanation-box">
          <h2>Your Analysis Hub</h2>
          <p>
            This dashboard provides a quick overview of your recent solar potential analyses.
          </p>
          <p>
            The <strong>graph</strong> visualizes the relationship between the <strong>Rooftop Area</strong> you draw and the <strong>Estimated Daily Power</strong>. This helps you compare the efficiency of different rooftops and see how area impacts potential generation.
          </p>
          <p>
            The <strong>table</strong> provides a detailed log of each analysis for your records.
          </p>
        </div>
      </div>
      <div style={{marginTop: '40px'}}>
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Location</th>
              <th>Area (m²)</th>
              <th>Est. Daily Power (kWh)</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, index) => (
              <tr key={index}>
                <td>{item.timestamp.toLocaleString()}</td>
                <td>{`${item.location.lat.substring(0, 7)}, ${item.location.lng.substring(0, 7)}`}</td>
                <td>{item.area.toFixed(2)}</td>
                <td>{item.power.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardPage;