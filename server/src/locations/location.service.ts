export async function searchLocations(city: string): Promise<unknown> {
  const params = new URLSearchParams({
    name: city,
    count: '10',
    language: 'en',
    format: 'json',
  });

  const url = 'https://geocoding-api.open-meteo.com/' + `v1/search?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open-Meteo location request failed: ${response.status}`);
  }

  return response.json();
}
