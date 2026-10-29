import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { mockWeatherData } from '../../src/mocks/weatherData';

const { useWeatherMock } = vi.hoisted(() => ({ useWeatherMock: vi.fn() }));

vi.mock('../../src/hooks/useWeather', () => ({
  useWeather: useWeatherMock,
}));

const defaultWeatherState = {
  status: 'idle' as const,
  data: null,
  cities: [],
  error: null,
  query: '',
  search: vi.fn(),
  selectCity: vi.fn(),
  retry: vi.fn(),
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWeatherMock.mockReturnValue({ ...defaultWeatherState });
  });

  it('renderiza a marca e o estado inicial vazio', () => {
    render(<App />);
    expect(screen.getByText('WeatherView')).toBeInTheDocument();
    expect(screen.getByText(/busque uma cidade para começar/i)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Clima atual' })).not.toBeInTheDocument();
  });

  it('conecta a busca e mostra o alternador de unidade no header', async () => {
    render(<App />);
    expect(screen.getByLabelText(/buscar cidade/i)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /unidade de temperatura/i })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/buscar cidade/i), 'Seattle');
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }));
    expect(defaultWeatherState.search).toHaveBeenCalledWith('Seattle');
  });

  it('renderiza loading e desabilita a busca', () => {
    useWeatherMock.mockReturnValue({ ...defaultWeatherState, status: 'loading' });
    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('Carregando o clima');
    expect(screen.getByRole('textbox', { name: /buscar cidade/i })).toBeDisabled();
  });

  it('renderiza o estado vazio para a busca sem resultados', () => {
    useWeatherMock.mockReturnValue({
      ...defaultWeatherState,
      status: 'empty',
      query: 'Cidade inexistente',
    });

    render(<App />);

    expect(screen.getByRole('heading', { name: /cidade inexistente/i })).toBeInTheDocument();
  });

  it('encaminha retry ao hook no estado de erro', async () => {
    const retry = defaultWeatherState.retry;
    useWeatherMock.mockReturnValue({
      ...defaultWeatherState,
      status: 'error',
      error: 'Falha de rede.',
      retry,
    });
    render(<App />);

    expect(screen.getByRole('alert')).toHaveTextContent('Falha de rede.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('renderiza dados do hook e deriva temperaturas na unidade selecionada', async () => {
    useWeatherMock.mockReturnValue({
      ...defaultWeatherState,
      status: 'success',
      data: mockWeatherData,
    });
    render(<App />);

    expect(screen.getByRole('region', { name: 'Clima atual' })).toBeInTheDocument();
    expect(screen.getByText('24°')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '°F' }));

    expect(screen.getByText('75°')).toBeInTheDocument();
  });
});
