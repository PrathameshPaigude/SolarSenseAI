export interface PVSystemPreset {
    label: string;
    kWp: number; // Typical system size in kWp
    tiltDeg: number;
    azimuthDeg: number;
    moduleEff: number;
    performanceRatio: number;
}

export const pvPresets: Record<string, PVSystemPreset> = {
    smallResidential: {
        label: "Small residential",
        kWp: 5,
        tiltDeg: 25,
        azimuthDeg: 180,
        moduleEff: 0.18,
        performanceRatio: 0.75,
    },
    mediumCommercial: {
        label: "Medium size commercial",
        kWp: 100,
        tiltDeg: 25,
        azimuthDeg: 180,
        moduleEff: 0.19,
        performanceRatio: 0.80,
    },
    groundMounted: {
        label: "Ground-mounted utility",
        kWp: 1000,
        tiltDeg: 30, // Optimized tilt
        azimuthDeg: 180,
        moduleEff: 0.20,
        performanceRatio: 0.82,
    },
    floatingLargeScale: {
        label: "Floating large scale",
        kWp: 500,
        tiltDeg: 15, // Lower tilt for stability
        azimuthDeg: 180,
        moduleEff: 0.19,
        performanceRatio: 0.78,
    },
};
