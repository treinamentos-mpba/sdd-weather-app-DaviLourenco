import type { City, CurrentWeather, ForecastDay, WeatherData } from '../types/weather';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 10_000;

/** Erro tipado da camada de dados, com mensagem amigável ao usuário. */
export class WeatherServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeatherServiceError';
  }
}

/** Faz um fetch com timeout via AbortController. */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new WeatherServiceError('A requisição demorou demais.');
    }
    throw new WeatherServiceError('Falha de rede.');
  } finally {
    clearTimeout(timeout);
  }
}

interface GeocodingResult {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

/**
 * Busca cidades por nome (geocoding). Retorna lista vazia quando não há
 * resultados — o estado "vazio" é tratado pela camada de UI.
 */
export async function searchCities(name: string): Promise<City[]> {
  const query = name.trim();
  if (!query) return [];

  const url = `${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=5&language=pt&format=json`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    throw new WeatherServiceError('Não foi possível buscar a cidade. Tente novamente.');
  }

  const data = (await res.json()) as { results?: GeocodingResult[] };
  if (!data.results) return [];

  return data.results.map((r) => ({
    id: r.id,
    name: r.name,
    country: r.country ?? null,
    admin1: r.admin1 ?? null,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

interface ForecastResponse {
  timezone?: string;
  current?: {
    time: string;
    temperature_2m: number;
    weather_code: number;
    apparent_temperature?: number | null;
    relative_humidity_2m?: number | null;
    wind_speed_10m?: number | null;
    precipitation?: number | null;
    surface_pressure?: number | null;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: (number | null)[];
    wind_speed_10m_max?: number[];
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidCurrent(
  current: ForecastResponse['current'],
): current is NonNullable<ForecastResponse['current']> {
  return Boolean(
    current &&
      typeof current.time === 'string' &&
      isFiniteNumber(current.temperature_2m) &&
      isFiniteNumber(current.weather_code),
  );
}

function isValidDaily(
  daily: ForecastResponse['daily'],
): daily is NonNullable<ForecastResponse['daily']> {
  return Boolean(
    daily &&
      Array.isArray(daily.time) &&
      daily.time.every((date) => typeof date === 'string') &&
      Array.isArray(daily.weather_code) &&
      Array.isArray(daily.temperature_2m_min) &&
      Array.isArray(daily.temperature_2m_max),
  );
}

function optionalNumber(value: number | null | undefined): number | null {
  return isFiniteNumber(value) ? value : null;
}

function mapCurrent(c: NonNullable<ForecastResponse['current']>): CurrentWeather {
  return {
    observedAt: c.time,
    temperatureC: c.temperature_2m,
    weatherCode: c.weather_code,
    apparentTemperatureC: optionalNumber(c.apparent_temperature),
    humidityPercent: optionalNumber(c.relative_humidity_2m),
    windKmh: optionalNumber(c.wind_speed_10m),
    precipitationMm: optionalNumber(c.precipitation),
    surfacePressureHpa: optionalNumber(c.surface_pressure),
  };
}

function mapForecast(d: NonNullable<ForecastResponse['daily']>): ForecastDay[] {
  return d.time.map((date, i) => {
    const weatherCode = d.weather_code[i];
    const maxTemperatureC = d.temperature_2m_max[i];
    const minTemperatureC = d.temperature_2m_min[i];

    if (
      !isFiniteNumber(weatherCode) ||
      !isFiniteNumber(maxTemperatureC) ||
      !isFiniteNumber(minTemperatureC)
    ) {
      return { status: 'unavailable', date };
    }

    return {
      status: 'available',
      date,
      weatherCode,
      maxTemperatureC,
      minTemperatureC,
      precipitationProbabilityPercent: optionalNumber(d.precipitation_probability_max?.[i]),
      maxWindKmh: optionalNumber(d.wind_speed_10m_max?.[i]),
    };
  });
}

/**
 * Busca o clima atual e a previsão de 5 dias para uma cidade.
 * Temperaturas retornam em Celsius (conversão fica na UI).
 */
export async function getWeather(city: City): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current:
      'temperature_2m,weather_code,time,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,surface_pressure',
    daily:
      'weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max,wind_speed_10m_max',
    forecast_days: '5',
    timezone: 'auto',
  });

  const res = await fetchWithTimeout(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new WeatherServiceError('Não foi possível carregar o clima. Tente novamente.');
  }

  let data: ForecastResponse;
  try {
    const body: unknown = await res.json();
    if (typeof body !== 'object' || body === null) {
      throw new WeatherServiceError('Resposta de clima incompleta. Tente novamente.');
    }
    data = body as ForecastResponse;
  } catch {
    throw new WeatherServiceError('Resposta de clima incompleta. Tente novamente.');
  }

  if (!data.timezone || !isValidCurrent(data.current) || !isValidDaily(data.daily)) {
    throw new WeatherServiceError('Resposta de clima incompleta. Tente novamente.');
  }

  return {
    city,
    timezone: data.timezone,
    current: mapCurrent(data.current),
    forecast: mapForecast(data.daily),
    errors: {},
  };
}
