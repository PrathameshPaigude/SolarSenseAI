import React, { useState } from 'react';
import { FaSolarPanel, FaBolt, FaTimes, FaCheck } from 'react-icons/fa';
import './PVConfigModal.css';

interface PVConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (config: PVConfig) => void;
    initialArea?: number;
}

export interface PVConfig {
    panelTechnology: 'mono' | 'poly' | 'thinfilm';
    gridType: 'on_grid' | 'hybrid' | 'off_grid';
    panelWattage: number;
    systemType: 'smallResidential' | 'mediumCommercial' | 'groundMounted' | 'floatingLargeScale';
}

const PVConfigModal: React.FC<PVConfigModalProps> = ({ isOpen, onClose, onConfirm, initialArea }) => {
    const [panelTechnology, setPanelTechnology] = useState<'mono' | 'poly' | 'thinfilm'>('mono');
    const [gridType, setGridType] = useState<'on_grid' | 'hybrid' | 'off_grid'>('on_grid');
    const [panelWattage, setPanelWattage] = useState<number>(420);
    const [systemType, setSystemType] = useState<'smallResidential' | 'mediumCommercial' | 'groundMounted' | 'floatingLargeScale'>('smallResidential');

    if (!isOpen) return null;

    const handleSubmit = () => {
        onConfirm({
            panelTechnology,
            gridType,
            panelWattage,
            systemType,
        });
    };

    return (
        <div className="pv-config-modal-overlay">
            <div className="pv-config-modal">
                <div className="modal-header">
                    <h2><FaSolarPanel /> PV System Configuration</h2>
                    <button className="close-button" onClick={onClose}><FaTimes /></button>
                </div>

                <div className="modal-body">
                    <p className="modal-description">
                        Customize your system parameters for accurate energy yield estimation.
                    </p>

                    <div className="config-section">
                        <label className="section-label">System Type</label>
                        <div className="option-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div
                                className={`option-card ${systemType === 'smallResidential' ? 'active' : ''}`}
                                onClick={() => setSystemType('smallResidential')}
                            >
                                <span className="option-name">Small Residential</span>
                            </div>
                            <div
                                className={`option-card ${systemType === 'mediumCommercial' ? 'active' : ''}`}
                                onClick={() => setSystemType('mediumCommercial')}
                            >
                                <span className="option-name">Medium Commercial</span>
                            </div>
                            <div
                                className={`option-card ${systemType === 'groundMounted' ? 'active' : ''}`}
                                onClick={() => setSystemType('groundMounted')}
                            >
                                <span className="option-name">Ground Mounted</span>
                            </div>
                            <div
                                className={`option-card ${systemType === 'floatingLargeScale' ? 'active' : ''}`}
                                onClick={() => setSystemType('floatingLargeScale')}
                            >
                                <span className="option-name">Floating Large Scale</span>
                            </div>
                        </div>
                    </div>

                    <div className="config-section">
                        <label className="section-label">Panel Technology</label>
                        <div className="option-grid">
                            <div
                                className={`option-card ${panelTechnology === 'mono' ? 'active' : ''}`}
                                onClick={() => setPanelTechnology('mono')}
                            >
                                <span className="option-name">Monocrystalline</span>
                                <span className="option-detail">High Efficiency (20%+)</span>
                            </div>
                            <div
                                className={`option-card ${panelTechnology === 'poly' ? 'active' : ''}`}
                                onClick={() => setPanelTechnology('poly')}
                            >
                                <span className="option-name">Polycrystalline</span>
                                <span className="option-detail">Standard (17-19%)</span>
                            </div>
                            <div
                                className={`option-card ${panelTechnology === 'thinfilm' ? 'active' : ''}`}
                                onClick={() => setPanelTechnology('thinfilm')}
                            >
                                <span className="option-name">Thin Film</span>
                                <span className="option-detail">Good in Low Light</span>
                            </div>
                        </div>
                    </div>

                    <div className="config-section">
                        <label className="section-label">Grid Connection</label>
                        <div className="option-grid">
                            <div
                                className={`option-card ${gridType === 'on_grid' ? 'active' : ''}`}
                                onClick={() => setGridType('on_grid')}
                            >
                                <span className="option-name">On-Grid</span>
                                <span className="option-detail">Net Metering (95% Usable)</span>
                            </div>
                            <div
                                className={`option-card ${gridType === 'hybrid' ? 'active' : ''}`}
                                onClick={() => setGridType('hybrid')}
                            >
                                <span className="option-name">Hybrid</span>
                                <span className="option-detail">Battery Backup (85% Usable)</span>
                            </div>
                            <div
                                className={`option-card ${gridType === 'off_grid' ? 'active' : ''}`}
                                onClick={() => setGridType('off_grid')}
                            >
                                <span className="option-name">Off-Grid</span>
                                <span className="option-detail">Standalone (75% Usable)</span>
                            </div>
                        </div>
                    </div>

                    <div className="config-section">
                        <label className="section-label">Panel Wattage (W)</label>
                        <div className="input-wrapper">
                            <FaBolt className="input-icon" />
                            <input
                                type="number"
                                value={panelWattage}
                                onChange={(e) => setPanelWattage(Number(e.target.value))}
                                className="config-input"
                            />
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="ui-button secondary-button" onClick={onClose}>Cancel</button>
                    <button className="ui-button primary-button" onClick={handleSubmit}>
                        <FaCheck /> Confirm & Analyze
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PVConfigModal;
