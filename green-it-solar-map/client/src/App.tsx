import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Switch, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PredictionPage from './pages/PredictionPage';
import DashboardPage from './pages/DashboardPage';
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
      <nav className="main-nav">
        <NavLink to="/" exact activeClassName="active-link">Home</NavLink>
        <NavLink to="/prediction" activeClassName="active-link">Prediction Tool</NavLink>
        <NavLink to="/dashboard" activeClassName="active-link">Dashboard</NavLink>
      </nav>
      <Switch>
        <Route path="/" exact>
          <HomePage onAnalysisComplete={handleNewAnalysis} />
        </Route>
        <Route path="/prediction">
          <PredictionPage latestResult={analysisHistory[0]} />
        </Route>
        <Route path="/dashboard">
          <DashboardPage history={analysisHistory} />
        </Route>
      </Switch>
    </Router>
  );
};

export default App;