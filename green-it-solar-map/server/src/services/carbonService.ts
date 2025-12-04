export interface CarbonResult {
    annual_CO2_kg: number;
    annual_CO2_tons: number;
    carbon_credits: number;
    monthly_CO2_tons: number;
    daily_CO2_kg: number;
    daily_CO2_tons: number;
    lifetime_years: number;
    lifetime_CO2_tons: number;
    lifetime_credits: number;
    price_low_usd: number;
    price_high_usd: number;
    usd_to_inr: number;
    annual_revenue_low_usd: number;
    annual_revenue_high_usd: number;
    annual_revenue_low_inr: number;
    annual_revenue_high_inr: number;
    trees_equivalent: number;
    cars_offset: number;
    petrol_liters_saved: number;
}

export const computeCarbonData = (annual_kWh: number): CarbonResult => {
    const annual_CO2_kg = annual_kWh * 0.9;
    const annual_CO2_tons = annual_CO2_kg / 1000;
    const carbon_credits = annual_CO2_tons;

    const monthly_CO2_tons = annual_CO2_tons / 12;
    const daily_CO2_kg = annual_CO2_kg / 365;
    const daily_CO2_tons = daily_CO2_kg / 1000;

    const lifetime_years = 25;
    const lifetime_CO2_tons = annual_CO2_tons * lifetime_years;
    const lifetime_credits = lifetime_CO2_tons;

    const price_low_usd = 1;
    const price_high_usd = 8;
    const usd_to_inr = 85;

    const annual_revenue_low_usd = carbon_credits * price_low_usd;
    const annual_revenue_high_usd = carbon_credits * price_high_usd;

    const annual_revenue_low_inr = annual_revenue_low_usd * usd_to_inr;
    const annual_revenue_high_inr = annual_revenue_high_usd * usd_to_inr;

    const trees_equivalent = annual_CO2_kg / 22;
    const cars_offset = annual_CO2_tons / 4.6;
    const petrol_liters_saved = annual_CO2_kg / 2.31;

    return {
        annual_CO2_kg,
        annual_CO2_tons,
        carbon_credits,
        monthly_CO2_tons,
        daily_CO2_kg,
        daily_CO2_tons,
        lifetime_years,
        lifetime_CO2_tons,
        lifetime_credits,
        price_low_usd,
        price_high_usd,
        usd_to_inr,
        annual_revenue_low_usd,
        annual_revenue_high_usd,
        annual_revenue_low_inr,
        annual_revenue_high_inr,
        trees_equivalent,
        cars_offset,
        petrol_liters_saved,
    };
};
