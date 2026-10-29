import { describe, expect, it } from 'vitest';
import { getWeatherIcon, getWeatherInfo, getWeatherLabel } from '../../src/lib/weatherCodes';

describe('weatherCodes', () => {
  it('mapeia códigos conhecidos', () => {
    expect(getWeatherInfo(61)).toEqual({ label: 'Chuva fraca', icon: '🌦️' });
    expect(getWeatherLabel(0)).toBe('Céu limpo');
    expect(getWeatherIcon(95)).toBe('⛈️');
  });

  it('usa fallback para código desconhecido', () => {
    const info = getWeatherInfo(123456);
    expect(info.label).toBe('Condição desconhecida');
    expect(info.icon).toBe('🌡️');
    expect(getWeatherLabel(123456)).toBe('Condição desconhecida');
    expect(getWeatherIcon(123456)).toBe('🌡️');
  });
});
