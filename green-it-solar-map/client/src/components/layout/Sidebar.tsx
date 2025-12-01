import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaSun, FaChartLine, FaThLarge } from 'react-icons/fa';
import './Sidebar.css';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home / Site Setup', icon: FaHome },
    { path: '/solar-analysis', label: 'Solar Analysis', icon: FaSun },
    { path: '/prediction', label: 'Prediction', icon: FaChartLine },
    { path: '/dashboard', label: 'Dashboard', icon: FaThLarge },
  ];

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <Icon className="sidebar-icon" />
                <span className="sidebar-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;

