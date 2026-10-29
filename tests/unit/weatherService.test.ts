import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getWeather, searchCities, WeatherServiceError } from '../../src/services/weatherService';
import type { City } from '../../src/types/weather';

const CITY: City = {
  id: 1,
  name: 'Seattle',
  country: 'Estados Unidos',
  admin1: 'Washington',
  latitude: 47.6,
  longitude: -122.33,
};

function mockFetchOnce(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  } as Response);
}

describe('weatherService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('searchCities', () => {
    it('retorna lista vazia para input vazio sem chamar a rede', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      const result = await searchCities('   ');
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('mapeia resultados de geocoding', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
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
        }),
      );
      const result = await searchCities('Seattle');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Seattle');
    });

    it('codifica o nome pesquisado e normaliza campos de localização ausentes', async () => {
      const fetchSpy = mockFetchOnce({
        results: [
          {
            id: 2,
            name: 'São José',
            latitude: -23.5,
            longitude: -46.6,
          },
        ],
      });
      vi.stubGlobal('fetch', fetchSpy);

      const result = await searchCities('  São José  ');

      expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('name=S%C3%A3o%20Jos%C3%A9');
      expect(result).toEqual([
        {
          id: 2,
          name: 'São José',
          admin1: null,
          country: null,
          latitude: -23.5,
          longitude: -46.6,
        },
      ]);
    });

    it('retorna vazio quando não há results', async () => {
      vi.stubGlobal('fetch', mockFetchOnce({}));
      expect(await searchCities('xyzxyz')).toEqual([]);
    });

    it('lança erro tipado em resposta não-ok', async () => {
      vi.stubGlobal('fetch', mockFetchOnce({}, false));
      await expect(searchCities('Seattle')).rejects.toBeInstanceOf(WeatherServiceError);
    });

    it('converte AbortError na mensagem de timeout', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));

      await expect(searchCities('Seattle')).rejects.toMatchObject({
        name: 'WeatherServiceError',
        message: 'A requisição demorou demais.',
      });
    });

    it('aborta a requisição após 10 segundos e libera o timer', async () => {
      vi.useFakeTimers();
      try {
        const fetchSpy = vi.fn(
          (_url: string, options?: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
              options?.signal?.addEventListener(
                'abort',
                () => reject(new DOMException('Aborted', 'AbortError')),
                { once: true },
              );
            }),
        );
        vi.stubGlobal('fetch', fetchSpy);

        const request = searchCities('Seattle');
        const timeoutExpectation = expect(request).rejects.toMatchObject({
          name: 'WeatherServiceError',
          message: 'A requisição demorou demais.',
        });
        await vi.advanceTimersByTimeAsync(10_000);

        await timeoutExpectation;
        expect(vi.getTimerCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('converte falhas de rede na mensagem definida', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket failure')));

      await expect(searchCities('Seattle')).rejects.toMatchObject({
        name: 'WeatherServiceError',
        message: 'Falha de rede.',
      });
    });

    it('limpa o timer mesmo quando a requisição termina antes do timeout', async () => {
      vi.useFakeTimers();
      try {
        vi.stubGlobal('fetch', mockFetchOnce({ results: [] }));

        await expect(searchCities('Seattle')).resolves.toEqual([]);
        expect(vi.getTimerCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('getWeather', () => {
    it('mapeia current e daily para WeatherData', async () => {
      const fetchSpy = mockFetchOnce({
        current: {
          time: '2026-06-16T12:00',
          temperature_2m: 18,
          apparent_temperature: 17,
          relative_humidity_2m: 80,
          wind_speed_10m: 10,
          precipitation: 0,
          surface_pressure: 1015,
          weather_code: 3,
        },
        timezone: 'America/Los_Angeles',
        daily: {
          time: ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20'],
          weather_code: [3, 61, 80, 1, 0],
          temperature_2m_max: [20, 19, 22, 24, 25],
          temperature_2m_min: [12, 11, 13, 14, 15],
          precipitation_probability_max: [20, 90, 70, 10, null],
          wind_speed_10m_max: [15, 20, 12, 18, 14],
        },
      });
      vi.stubGlobal('fetch', fetchSpy);

      const data = await getWeather(CITY);
      const requestUrl = new URL(String(fetchSpy.mock.calls[0]?.[0]));

      expect(requestUrl.pathname).toBe('/v1/forecast');
      expect(requestUrl.searchParams.get('latitude')).toBe(String(CITY.latitude));
      expect(requestUrl.searchParams.get('longitude')).toBe(String(CITY.longitude));
      expect(requestUrl.searchParams.get('forecast_days')).toBe('5');
      expect(requestUrl.searchParams.get('timezone')).toBe('auto');
      const currentVariables = requestUrl.searchParams.get('current')?.split(',');
      expect(currentVariables).toContain('temperature_2m');
      expect(currentVariables).not.toContain('time');
      expect(requestUrl.searchParams.get('daily')).toContain('temperature_2m_min');
      expect(data.current?.temperatureC).toBe(18);
      expect(data.current?.apparentTemperatureC).toBe(17);
      expect(data.current?.surfacePressureHpa).toBe(1015);
      expect(data.timezone).toBe('America/Los_Angeles');
      expect(data.forecast).toHaveLength(5);
      expect(data.forecast[4].status).toBe('available');
      if (data.forecast[4].status === 'available') {
        expect(data.forecast[4].precipitationProbabilityPercent).toBeNull();
        expect(data.forecast[4].maxWindKmh).toBe(14);
      }
    });

    it('lança erro quando a resposta está incompleta', async () => {
      vi.stubGlobal('fetch', mockFetchOnce({ current: null, daily: null }));
      await expect(getWeather(CITY)).rejects.toBeInstanceOf(WeatherServiceError);
    });

    it('converte falha de rede do forecast em WeatherServiceError', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unavailable')));

      await expect(getWeather(CITY)).rejects.toMatchObject({
        name: 'WeatherServiceError',
        message: 'Falha de rede.',
      });
    });

    it.each([429, 503])('não repete automaticamente forecast com HTTP %i', async (status) => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: async () => ({}),
      } as Response);
      vi.stubGlobal('fetch', fetchSpy);

      await expect(getWeather(CITY)).rejects.toBeInstanceOf(WeatherServiceError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('lança WeatherServiceError quando o forecast retorna HTTP não-ok', async () => {
      vi.stubGlobal('fetch', mockFetchOnce({}, false));

      await expect(getWeather(CITY)).rejects.toBeInstanceOf(WeatherServiceError);
    });

    it('lança WeatherServiceError quando o JSON do forecast é inválido', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => {
            throw new SyntaxError('invalid JSON');
          },
        } as unknown as Response),
      );

      await expect(getWeather(CITY)).rejects.toBeInstanceOf(WeatherServiceError);
    });

    it('preserva null em campos complementares ausentes', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          timezone: 'America/Los_Angeles',
          current: {
            time: '2026-06-16T12:00',
            temperature_2m: 18,
            weather_code: 3,
          },
          daily: {
            time: ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20'],
            weather_code: [3, 61, 80, 1, 0],
            temperature_2m_max: [20, 19, 22, 24, 25],
            temperature_2m_min: [12, 11, 13, 14, 15],
          },
        }),
      );

      const data = await getWeather(CITY);

      expect(data.current?.apparentTemperatureC).toBeNull();
      expect(data.current?.humidityPercent).toBeNull();
      expect(data.current?.windKmh).toBeNull();
      expect(data.current?.precipitationMm).toBeNull();
      expect(data.current?.surfacePressureHpa).toBeNull();
      expect(data.forecast).toHaveLength(5);
      expect(data.forecast.every((day) => day.status === 'available')).toBe(true);
      for (const day of data.forecast) {
        if (day.status === 'available') {
          expect(day.precipitationProbabilityPercent).toBeNull();
          expect(day.maxWindKmh).toBeNull();
        }
      }
    });

    it('marca como indisponível o dia com arrays diários incompletos', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          timezone: 'America/Los_Angeles',
          current: {
            time: '2026-06-16T12:00',
            temperature_2m: 18,
            weather_code: 3,
          },
          daily: {
            time: ['2026-06-16', '2026-06-17'],
            weather_code: [3],
            temperature_2m_max: [20, 19],
            temperature_2m_min: [12, 11],
          },
        }),
      );

      const data = await getWeather(CITY);

      expect(data.forecast).toEqual([
        expect.objectContaining({ status: 'available', date: '2026-06-16' }),
        { status: 'unavailable', date: '2026-06-17' },
      ]);
    });

    it('lança WeatherServiceError quando current está ausente', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          timezone: 'America/Los_Angeles',
          daily: { time: [] },
        }),
      );

      await expect(getWeather(CITY)).rejects.toBeInstanceOf(WeatherServiceError);
    });

    it.each([
      ['time', { temperature_2m: 18, weather_code: 3 }],
      ['temperature_2m', { time: '2026-06-16T12:00', weather_code: 3 }],
      ['weather_code', { time: '2026-06-16T12:00', temperature_2m: 18 }],
    ])('lança WeatherServiceError quando current não contém %s', async (_field, current) => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          timezone: 'America/Los_Angeles',
          current,
          daily: {
            time: [],
            weather_code: [],
            temperature_2m_min: [],
            temperature_2m_max: [],
          },
        }),
      );

      await expect(getWeather(CITY)).rejects.toBeInstanceOf(WeatherServiceError);
    });

    it('lança WeatherServiceError quando daily está ausente', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          timezone: 'America/Los_Angeles',
          current: {
            time: '2026-06-16T12:00',
            temperature_2m: 18,
            weather_code: 3,
          },
        }),
      );

      await expect(getWeather(CITY)).rejects.toBeInstanceOf(WeatherServiceError);
    });
  });
});
