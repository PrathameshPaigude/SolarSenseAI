import React from 'react';
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
    labels: history.slice(0, 10).reverse().map(item => item.timestamp.toLocaleTimeString()),
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
        ticks: { color: '#ccc' },
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

  return (
    <div className="page-container">
      <h1>Dashboard</h1>
      <div className="dashboard-layout">
        <div className="chart-container">
          <Line options={chartOptions} data={chartData} />
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