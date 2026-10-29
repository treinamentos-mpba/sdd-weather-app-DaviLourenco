import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWeather } from '../../src/hooks/useWeather';
import type { City, WeatherData } from '../../src/types/weather';

const { searchCitiesMock, getWeatherMock } = vi.hoisted(() => ({
  searchCitiesMock: vi.fn(),
  getWeatherMock: vi.fn(),
}));

vi.mock('../../src/services/weatherService', () => ({
  WeatherServiceError: class WeatherServiceError extends Error {},
  searchCities: searchCitiesMock,
  getWeather: getWeatherMock,
}));

const CITY: City = {
  id: 1,
  name: 'Seattle',
  admin1: 'Washington',
  country: 'Estados Unidos',
  latitude: 47.6,
  longitude: -122.33,
};

const OTHER_CITY: City = {
  ...CITY,
  id: 2,
  name: 'Portland',
  latitude: 45.52,
  longitude: -122.68,
};

const WEATHER_DATA: WeatherData = {
  city: CITY,
  timezone: 'America/Los_Angeles',
  current: null,
  forecast: [],
  errors: {},
};

describe('useWeather', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicia em idle', () => {
    const { result } = renderHook(() => useWeather());

    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeNull();
    expect(result.current.cities).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.query).toBe('');
  });

  it('busca cidades e carrega o clima da primeira correspondência', async () => {
    searchCitiesMock.mockResolvedValue([CITY, OTHER_CITY]);
    getWeatherMock.mockResolvedValue(WEATHER_DATA);
    const { result } = renderHook(() => useWeather());

    await act(async () => {
      await result.current.search('  Seattle  ');
    });

    expect(searchCitiesMock).toHaveBeenCalledWith('Seattle');
    expect(getWeatherMock).toHaveBeenCalledWith(CITY);
    expect(result.current.status).toBe('success');
    expect(result.current.data).toEqual(WEATHER_DATA);
    expect(result.current.cities).toEqual([CITY, OTHER_CITY]);
    expect(result.current.query).toBe('Seattle');
  });

  it('define empty e não carrega forecast quando não há cidades', async () => {
    searchCitiesMock.mockResolvedValue([]);
    const { result } = renderHook(() => useWeather());

    await act(async () => {
      await result.current.search('Cidade inexistente');
    });

    expect(result.current.status).toBe('empty');
    expect(result.current.cities).toEqual([]);
    expect(getWeatherMock).not.toHaveBeenCalled();
  });

  it('retry repete a busca mais recente após falha de geocoding', async () => {
    searchCitiesMock.mockRejectedValueOnce(new Error('network failure'));
    searchCitiesMock.mockResolvedValueOnce([CITY]);
    getWeatherMock.mockResolvedValue(WEATHER_DATA);
    const { result } = renderHook(() => useWeather());

    await act(async () => {
      await result.current.search('Portland');
    });
    expect(result.current.status).toBe('error');

    await act(async () => {
      await result.current.retry();
    });

    expect(searchCitiesMock).toHaveBeenNthCalledWith(2, 'Portland');
    expect(getWeatherMock).toHaveBeenCalledWith(CITY);
    expect(result.current.status).toBe('success');
  });

  it('retry repete a última seleção de cidade após falha de forecast', async () => {
    getWeatherMock.mockRejectedValueOnce(new Error('forecast failure'));
    getWeatherMock.mockResolvedValueOnce({ ...WEATHER_DATA, city: OTHER_CITY });
    const { result } = renderHook(() => useWeather());

    await act(async () => {
      await result.current.selectCity(OTHER_CITY);
    });
    expect(result.current.status).toBe('error');

    await act(async () => {
      await result.current.retry();
    });

    expect(getWeatherMock).toHaveBeenNthCalledWith(2, OTHER_CITY);
    expect(result.current.data?.city).toEqual(OTHER_CITY);
    expect(result.current.status).toBe('success');
  });

  it('ignora respostas de uma busca anterior', async () => {
    let resolveFirstSearch: ((cities: City[]) => void) | undefined;
    searchCitiesMock
      .mockImplementationOnce(
        () =>
          new Promise<City[]>((resolve) => {
            resolveFirstSearch = resolve;
          }),
      )
      .mockResolvedValueOnce([OTHER_CITY]);
    getWeatherMock.mockResolvedValue({ ...WEATHER_DATA, city: OTHER_CITY });
    const { result } = renderHook(() => useWeather());

    let firstSearch: Promise<void> | undefined;
    await act(async () => {
      firstSearch = result.current.search('Seattle');
      await result.current.search('Portland');
    });

    await act(async () => {
      resolveFirstSearch?.([CITY]);
      await firstSearch;
    });

    expect(result.current.query).toBe('Portland');
    expect(result.current.cities).toEqual([OTHER_CITY]);
    expect(result.current.data?.city).toEqual(OTHER_CITY);
  });
});
