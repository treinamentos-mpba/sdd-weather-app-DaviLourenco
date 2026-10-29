/**
 * Contratos de domínio compartilhados do Weather App.
 *
 * Decisão de arquitetura: as temperaturas são sempre armazenadas em Celsius
 * internamente e convertidas apenas na camada de apresentação. Assim, a troca
 * de unidade (C/F) nunca dispara um novo request.
 */

export type Unit = 'celsius' | 'fahrenheit';

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export type WeatherErrorKind = 'network' | 'timeout' | 'http' | 'invalid-response';

/** Localização selecionada para a consulta meteorológica. */
export interface City {
  id: number;
  name: string;
  admin1: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

/** Condições atuais normalizadas; temperaturas são mantidas em Celsius. */
export interface CurrentWeather {
  observedAt: string;
  temperatureC: number;
  weatherCode: number;
  apparentTemperatureC: number | null;
  humidityPercent: number | null;
  windKmh: number | null;
  precipitationMm: number | null;
  surfacePressureHpa: number | null;
}

/** Um dia válido ou indisponível da previsão, em horário local da cidade. */
export type ForecastDay =
  | {
      status: 'available';
      date: string;
      weatherCode: number;
      minTemperatureC: number;
      maxTemperatureC: number;
      precipitationProbabilityPercent: number | null;
      maxWindKmh: number | null;
    }
  | {
      status: 'unavailable';
      date: string;
    };

export interface WeatherError {
  kind: WeatherErrorKind;
  message: string;
  retryable: boolean;
}

export interface WeatherData {
  city: City;
  timezone: string;
  current: CurrentWeather | null;
  forecast: ForecastDay[];
  errors: {
    current?: WeatherError;
    forecast?: WeatherError;
  };
}

export interface Preferences {
  lastCity: City | null;
  unit: Unit;
}
