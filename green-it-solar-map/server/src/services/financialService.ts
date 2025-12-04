import { PVCalculationResult } from './pvService';

export interface FinancialInputs {
    // Core inputs from PV Model (Single Source of Truth)
    systemSize_kWp: number;
    annualOutput_kWh: number;
    gridType?: "on_grid" | "hybrid" | "off_grid";
    panelTechnology?: "mono" | "poly" | "thinfilm";

    // Financial Parameters (UI Inputs with Defaults)
    tariff_Rs_per_kWh?: number;        // Default: 8.5
    capex_Rs_per_kWp?: number;         // Default: Smart derived
    om_Rs_per_kWp_per_year?: number;   // Default: 800
    projectLifetime_years?: number;    // Default: 25

    // Advanced Parameters (Defaults)
    energyDegradation_pct_per_year?: number; // Default: 0.7
    tariffInflation_pct_per_year?: number;   // Default: 3.0
    omInflation_pct_per_year?: number;       // Default: 3.0
    gridEmission_kgCO2_per_kWh?: number;     // Default: 0.82
}

export interface FinancialYearResult {
    year: number;
    output_kWh: number;
    tariff_Rs_per_kWh: number;
    grossSavings_Rs: number;
    omCost_Rs: number;
    netSavings_Rs: number;
    cumulativeCashflow_Rs: number;
}

export interface FinancialSummary {
    totalCapex_Rs: number;
    firstYearNetSavings_Rs: number;
    paybackYears: number | null;
    co2Avoided_tons_per_year: number;
    years: FinancialYearResult[];
    inputs: FinancialInputs; // Return inputs for verification/display
}

// --- Helper: Smart CAPEX Defaults ---
function getDefaultCapexPerkWp(
    gridType: "on_grid" | "hybrid" | "off_grid" = "on_grid",
    systemSize_kWp: number
): number {
    if (gridType === "hybrid") {
        return 130_000; // Mid-range for hybrid
    }
    if (gridType === "off_grid") {
        return 80_000;  // Off-grid with batteries
    }

    // On-grid defaults based on size
    if (systemSize_kWp <= 10) return 65_000;   // Small residential
    if (systemSize_kWp <= 100) return 52_000;  // Commercial rooftop
    return 45_000;                             // Large / Ground-mount
}

function getTechCostFactor(panelTech: "mono" | "poly" | "thinfilm" = "mono"): number {
    switch (panelTech) {
        case "mono": return 1.00;
        case "poly": return 0.96;
        case "thinfilm": return 0.95;
        default: return 1.00;
    }
}

export function computeFinancialSummary(inputs: FinancialInputs): FinancialSummary {
    // 1. Set Defaults
    const tariff0 = inputs.tariff_Rs_per_kWh ?? 8.5;
    const om0 = inputs.om_Rs_per_kWp_per_year ?? 800;
    const lifetime = inputs.projectLifetime_years ?? 25;
    const degradation = (inputs.energyDegradation_pct_per_year ?? 0.7) / 100;
    const tariffInflation = (inputs.tariffInflation_pct_per_year ?? 3.0) / 100;
    const omInflation = (inputs.omInflation_pct_per_year ?? 3.0) / 100;
    const gridEmission = inputs.gridEmission_kgCO2_per_kWh ?? 0.82;

    // 2. Determine CAPEX
    const baseCapex = getDefaultCapexPerkWp(inputs.gridType, inputs.systemSize_kWp);
    const techFactor = getTechCostFactor(inputs.panelTechnology);
    const capexEffective = (inputs.capex_Rs_per_kWp ?? baseCapex) * techFactor;
    const totalCapex_Rs = inputs.systemSize_kWp * capexEffective;

    // 3. Sanity Check
    const specificYield = inputs.annualOutput_kWh / inputs.systemSize_kWp;
    if (specificYield < 700 || specificYield > 2200) {
        console.warn(`[FinancialService] Suspicious specific yield: ${specificYield.toFixed(1)} kWh/kWp. Normal range: 700-2200.`);
    }

    // 4. Calculate Cashflows
    const years: FinancialYearResult[] = [];
    let cumulativeCashflow_Rs = -totalCapex_Rs;

    // Year 0 (Investment)
    years.push({
        year: 0,
        output_kWh: 0,
        tariff_Rs_per_kWh: tariff0,
        grossSavings_Rs: 0,
        omCost_Rs: 0,
        netSavings_Rs: 0,
        cumulativeCashflow_Rs,
    });

    let paybackYears: number | null = null;

    for (let y = 1; y <= lifetime; y++) {
        // Degraded Output
        const output_kWh = inputs.annualOutput_kWh * Math.pow(1 - degradation, y - 1);

        // Escalated Rates
        const tariff_y = tariff0 * Math.pow(1 + tariffInflation, y - 1);
        const omRate_y = om0 * Math.pow(1 + omInflation, y - 1);

        // Financials
        const grossSavings_Rs = output_kWh * tariff_y;
        const omCost_Rs = inputs.systemSize_kWp * omRate_y;
        const netSavings_Rs = grossSavings_Rs - omCost_Rs;

        const prevCumulative = cumulativeCashflow_Rs;
        cumulativeCashflow_Rs += netSavings_Rs;

        years.push({
            year: y,
            output_kWh,
            tariff_Rs_per_kWh: tariff_y,
            grossSavings_Rs,
            omCost_Rs,
            netSavings_Rs,
            cumulativeCashflow_Rs,
        });

        // Payback Interpolation
        if (paybackYears === null && prevCumulative < 0 && cumulativeCashflow_Rs >= 0) {
            const fraction = Math.abs(prevCumulative) / netSavings_Rs;
            paybackYears = (y - 1) + fraction;
        }
    }

    // 5. Summary Metrics
    const firstYearNetSavings_Rs = years[1]?.netSavings_Rs || 0;
    const co2Avoided_tons_per_year = (inputs.annualOutput_kWh * gridEmission) / 1000;

    return {
        totalCapex_Rs,
        firstYearNetSavings_Rs,
        paybackYears,
        co2Avoided_tons_per_year,
        years,
        inputs: { ...inputs, capex_Rs_per_kWp: capexEffective } // Return effective CAPEX
    };
}
