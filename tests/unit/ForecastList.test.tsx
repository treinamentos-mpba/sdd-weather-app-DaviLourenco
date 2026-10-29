import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ForecastCard from '../../src/components/ForecastCard';
import ForecastList from '../../src/components/ForecastList';
import type { ForecastDay } from '../../src/types/weather';

const forecastDates = ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'];

const forecast: ForecastDay[] = forecastDates.map((date, dayIndex) => ({
  status: 'available',
  date,
  weatherCode: dayIndex === 0 ? 61 : 0,
  minTemperatureC: 10,
  maxTemperatureC: 20,
  precipitationProbabilityPercent: 30,
  maxWindKmh: 14,
}));

describe('ForecastList', () => {
  it('renderiza cinco dias com rótulos, ícones, máximas/mínimas e chuva na unidade atual', () => {
    render(<ForecastList forecast={forecast} unit="fahrenheit" />);

    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(5);

    const firstCard = within(cards[0]!);
    expect(firstCard.getByText('Hoje')).toBeInTheDocument();
    expect(firstCard.getByRole('img', { name: 'Chuva fraca' })).toBeInTheDocument();
    expect(firstCard.getByText('Máx 68°F')).toBeInTheDocument();
    expect(firstCard.getByText('Mín 50°F')).toBeInTheDocument();
    expect(firstCard.getByText('Chuva 30%')).toBeInTheDocument();
  });

  it('indica quando os dados essenciais de um dia estão indisponíveis', () => {
    const unavailableDay: ForecastDay = {
      status: 'unavailable',
      date: '2026-10-31',
    };

    render(<ForecastCard day={unavailableDay} index={2} unit="celsius" />);

    expect(screen.getByRole('listitem')).toHaveTextContent('Previsão indisponível');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
