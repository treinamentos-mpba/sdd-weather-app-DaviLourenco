import { expect, type Page, test } from '@playwright/test';

const geocoding = {
  results: [
    {
      id: 1,
      name: 'Seattle',
      country: 'Estados Unidos',
      admin1: 'Washington',
      latitude: 47.6,
      longitude: -122.33,
    },
  ],
};

const forecast = {
  timezone: 'America/Los_Angeles',
  current: {
    time: '2026-06-16T12:00',
    temperature_2m: 0,
    apparent_temperature: 0,
    relative_humidity_2m: 80,
    wind_speed_10m: 10,
    surface_pressure: 1015,
    precipitation: 0,
    weather_code: 3,
  },
  daily: {
    time: ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20'],
    weather_code: [3, 61, 80, 1, 0],
    temperature_2m_max: [20, 19, 22, 24, 25],
    temperature_2m_min: [12, 11, 13, 14, 15],
    precipitation_probability_max: [20, 90, 70, 10, 0],
    wind_speed_10m_max: [14, 16, 18, 12, 11],
  },
};

interface MockApiOptions {
  geocodingResponse?: typeof geocoding | Record<string, never>;
  expectedSearchName?: string;
  onForecastRequest?: () => void;
}

async function mockApis(page: Page, options: MockApiOptions = {}) {
  const geocodingResponse = options.geocodingResponse ?? geocoding;
  const expectedSearchName = options.expectedSearchName ?? 'Seattle';

  await page.route('**/geocoding-api.open-meteo.com/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    expect(request.method()).toBe('GET');
    expect(url.pathname).toBe('/v1/search');
    expect(url.searchParams.get('name')).toBe(expectedSearchName);
    expect(url.searchParams.get('count')).toBe('5');
    await route.fulfill({ json: geocodingResponse });
  });

  await page.route('**/api.open-meteo.com/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    options.onForecastRequest?.();
    expect(request.method()).toBe('GET');
    expect(url.pathname).toBe('/v1/forecast');
    expect(url.searchParams.get('forecast_days')).toBe('5');
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('current')?.split(',')).toContain('temperature_2m');
    expect(url.searchParams.get('current')?.split(',')).not.toContain('time');
    expect(url.searchParams.get('daily')?.split(',')).toContain('temperature_2m_min');
    await route.fulfill({ json: forecast });
  });
}

test('fluxo completo: buscar → clima atual → previsão → trocar unidade', async ({ page }) => {
  await mockApis(page);
  await page.goto('/');

  await page.getByLabel(/buscar cidade/i).fill('Seattle');
  await page.getByRole('button', { name: /buscar/i }).click();

  await expect(page.getByRole('heading', { name: 'Seattle' })).toBeVisible();
  await expect(page.getByRole('region', { name: /previsão de 5 dias/i })).toBeVisible();

  // 0°C exibido; após trocar para °F deve virar 32°.
  await expect(page.getByRole('status', { name: 'Temperatura atual: 0° Celsius' })).toBeVisible();
  await page.getByRole('button', { name: '°F' }).click();
  await expect(
    page.getByRole('status', { name: 'Temperatura atual: 32° Fahrenheit' }),
  ).toBeVisible();
});

test('estado vazio quando a cidade não existe', async ({ page }) => {
  let forecastRequests = 0;
  await mockApis(page, {
    geocodingResponse: {},
    expectedSearchName: 'xyzxyz',
    onForecastRequest: () => {
      forecastRequests += 1;
    },
  });
  await page.goto('/');

  await page.getByLabel(/buscar cidade/i).fill('xyzxyz');
  await page.getByRole('button', { name: /buscar/i }).click();

  await expect(
    page.getByRole('heading', { name: 'Nenhuma cidade encontrada para "xyzxyz"' }),
  ).toBeVisible();
  expect(forecastRequests).toBe(0);
});

test('viewport mobile 375x812 renderiza o clima e os cinco dias', async ({ page }) => {
  await mockApis(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await page.getByLabel(/buscar cidade/i).fill('Seattle');
  await page.getByRole('button', { name: /buscar/i }).click();

  await expect(page.getByRole('heading', { name: 'Seattle' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Clima atual' })).toContainText('Nublado');
  await expect(page.getByRole('status', { name: 'Temperatura atual: 0° Celsius' })).toBeVisible();

  const forecastRegion = page.getByRole('region', { name: 'Previsão de 5 dias' });
  await expect(forecastRegion).toBeVisible();
  await expect(forecastRegion.getByRole('listitem')).toHaveCount(5);
});

test('layout não cria overflow horizontal de 320px a desktop', async ({ page }) => {
  await page.goto('/');

  for (const width of [320, 375, 640, 768, 1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));

    expect(dimensions.content, `overflow em viewport de ${width}px`).toBeLessThanOrEqual(
      dimensions.viewport,
    );
  }
});
