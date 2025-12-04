import https from 'https';

export class OpenMeteoService {
  private readonly baseUrl = 'https://api.open-meteo.com/v1/forecast';

  async getHourlySolarData(lat: number, lng: number, start?: string, end?: string): Promise<any> {
    // Default: today if not provided
    const today = new Date();
    const defaultEnd = today.toISOString().slice(0, 10);
    const defaultStart = defaultEnd; // Same day
    const startDate = start || defaultStart;
    const endDate = end || defaultEnd;

    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lng.toString(),
        hourly: 'shortwave_radiation,direct_radiation,diffuse_radiation,direct_normal_irradiance,global_tilted_irradiance',
        timezone: 'auto',
        start_date: startDate,
        end_date: endDate,
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      console.log('OpenMeteoService: Fetching from:', url);

      const data = await this.fetchUrl(url);
      console.log('OpenMeteoService: Received data successfully');
      return data;
    } catch (err: any) {
      console.error('OpenMeteoService error:', err.message);
      throw err;
    }
  }

  private fetchUrl(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            reject(new Error(`Failed to parse JSON: ${errMsg}`));
          }
        });
      }).on('error', (err: Error) => {
        reject(new Error(`HTTP request failed: ${err.message}`));
      });
    });
  }
}
