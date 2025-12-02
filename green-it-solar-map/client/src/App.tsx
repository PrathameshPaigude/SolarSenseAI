import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Switch, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PredictionPage from './pages/PredictionPage';
import DashboardPage from './pages/DashboardPage';
import SolarAnalysisPage from './pages/SolarAnalysisPage';
import AppLayout from './components/layout/AppLayout';
import './App.css';

export interface AnalysisResult {
  area: number;
  power: number;
  location: { lat: string; lng: string };
  timestamp: Date;
}

const App: React.FC = () => {
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);

  const handleNewAnalysis = (result: AnalysisResult) => {
    setAnalysisHistory(prevHistory => [result, ...prevHistory]);
  };

  return (
    <Router>
      <AppLayout>
        <Switch>
          <Route path="/" exact>
            <HomePage onAnalysisComplete={handleNewAnalysis} />
          </Route>
          <Route path="/solar-analysis">
            <SolarAnalysisPage onAnalysisComplete={handleNewAnalysis} />
          </Route>
          <Route path="/prediction">
            <PredictionPage latestResult={analysisHistory[0]} />
          </Route>
          <Route path="/dashboard">
            <DashboardPage history={analysisHistory} />
          </Route>
        </Switch>
      </AppLayout>
    </Router>
  );
};

export default App;