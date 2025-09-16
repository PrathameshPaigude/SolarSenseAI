import React, { useEffect, useState } from 'react';
import { fetchEnergyData } from '../services/api';
import EnergyChart from '../components/charts/EnergyChart';
import { AnalysisResult } from '../App';
import './PageStyles.css';

interface DashboardPageProps {
  history: AnalysisResult[];
}

const DashboardPage: React.FC<DashboardPageProps> = ({ history }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getData = async () => {
      setLoading(true);
      // In a real app, you'd pass a user or project ID
      const data = await fetchEnergyData('project-123');
      setChartData({
        labels: data.labels,
        datasets: [
          {
            label: 'Energy Consumption (kWh)',
            data: data.consumption,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
          },
          {
            label: 'Energy Generation (kWh)',
            data: data.generation,
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
          },
        ],
      });
      setLoading(false);
    };

    getData();
  }, []);

  if (history.length === 0) {
    return (
      <div className="page-container">
        <h1>Dashboard</h1>
        <p>No analyses in your history. Go to the Home page to start a new one.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Dashboard - Analysis History</h1>
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
      {loading ? (
        <p>Loading chart data...</p>
      ) : (
        <div style={{ maxWidth: '800px' }}>
          {chartData && <EnergyChart data={chartData} />}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;