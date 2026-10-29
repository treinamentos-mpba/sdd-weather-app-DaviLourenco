import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import CurrentWeather from '../../src/components/CurrentWeather';
import UnitToggle from '../../src/components/UnitToggle';
import type { City, CurrentWeather as CurrentWeatherType, Unit } from '../../src/types/weather';

const city: City = {
  id: 1,
  name: 'Seattle',
  country: 'Estados Unidos',
  admin1: 'Washington',
  latitude: 47.6,
  longitude: -122.33,
};

const current: CurrentWeatherType = {
  observedAt: '2026-06-16T12:00',
  temperatureC: 0, // 0°C => 32°F (fácil de verificar)
  weatherCode: 3,
  apparentTemperatureC: null,
  humidityPercent: 80,
  windKmh: 10,
  precipitationMm: 0,
  surfacePressureHpa: 1015,
};

function Harness() {
  const [unit, setUnit] = useState<Unit>('celsius');
  return (
    <>
      <UnitToggle unit={unit} onChange={setUnit} />
      <CurrentWeather city={city} current={current} unit={unit} />
    </>
  );
}

describe('UnitToggle + CurrentWeather', () => {
  it('converte a temperatura ao alternar a unidade', async () => {
    render(<Harness />);
    expect(screen.getByText('0°')).toBeInTheDocument();
    expect(screen.getByText('1015 hPa')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '°F' }));
    expect(screen.getByText('32°')).toBeInTheDocument();
  });

  it('expõe os botões com estado pressionado acessível', () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'Unidade de temperatura' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '°C' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('permite navegar e ativar as unidades pelo teclado', async () => {
    const onChange = vi.fn();
    render(<UnitToggle unit="celsius" onChange={onChange} />);
    const celsiusButton = screen.getByRole('button', { name: '°C' });
    const fahrenheitButton = screen.getByRole('button', { name: '°F' });

    await userEvent.tab();
    expect(celsiusButton).toHaveFocus();
    await userEvent.tab();
    expect(fahrenheitButton).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith('fahrenheit');
  });
});
