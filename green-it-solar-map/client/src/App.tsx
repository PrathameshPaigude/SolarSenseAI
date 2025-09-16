import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Switch, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PredictionPage from './pages/PredictionPage';
import DashboardPage from './pages/DashboardPage';
import './App.css'; // We'll create this for navigation styling

// Define the structure for our analysis data
export interface AnalysisResult {
  area: number;
  power: number;
  location: { lat: string; lng: string };
  timestamp: Date;
}

const App: React.FC = () => {
  // State to hold all historical analysis results
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);

  // This function will be called from HomePage to add a new result
  const handleNewAnalysis = (result: AnalysisResult) => {
    setAnalysisHistory(prevHistory => [result, ...prevHistory]); // Add new result to the top
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
          {/* Pass the most recent analysis to the prediction page */}
          <PredictionPage latestResult={analysisHistory[0]} />
        </Route>
        <Route path="/dashboard">
          {/* Pass the entire history to the dashboard page */}
          <DashboardPage history={analysisHistory} />
        </Route>
      </Switch>
    </Router>
  );
};

export default App;