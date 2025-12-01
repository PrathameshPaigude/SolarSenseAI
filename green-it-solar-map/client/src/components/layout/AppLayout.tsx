import React, { useState } from 'react';
import TopAppBar from './TopAppBar';
import Sidebar from './Sidebar';
import './AppLayout.css';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, showSidebar = true }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const handleThemeToggle = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark', !isDark);
  };

  return (
    <div className={`app-layout ${isDark ? 'dark' : ''}`}>
      <TopAppBar onThemeToggle={handleThemeToggle} isDark={isDark} />
      <div className="app-body">
        {showSidebar && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

