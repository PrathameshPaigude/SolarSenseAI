export interface PVSystemPreset {
    label: string;
    kWp: number; // Typical system size in kWp
    tiltDeg: number;
    azimuthDeg: number;
    moduleEff: number;
    performanceRatio: number;
    packingFactor: number;
}

export const pvPresets: Record<string, PVSystemPreset> = {
    smallResidential: {
        label: "Small residential",
        kWp: 5,
        tiltDeg: 25,
        azimuthDeg: 180,
        moduleEff: 0.21,
        performanceRatio: 0.80,
        packingFactor: 0.9,
    },
    mediumCommercial: {
        label: "Medium size commercial",
        kWp: 100,
        tiltDeg: 10,
        azimuthDeg: 180,
        moduleEff: 0.21,
        performanceRatio: 0.82,
        packingFactor: 0.85,
    },
    groundMounted: {
        label: "Ground-mounted utility",
        kWp: 1000,
        tiltDeg: 30,
        azimuthDeg: 180,
        moduleEff: 0.22,
        performanceRatio: 0.85,
        packingFactor: 0.5,
    },
    floatingLargeScale: {
        label: "Floating large scale",
        kWp: 500,
        tiltDeg: 12,
        azimuthDeg: 180,
        moduleEff: 0.21,
        performanceRatio: 0.82,
        packingFactor: 0.7,
    },
};
