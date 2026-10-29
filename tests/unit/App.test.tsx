import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../src/App';

describe('App', () => {
  it('renderiza a marca e o estado inicial vazio', () => {
    render(<App />);
    expect(screen.getByText('WeatherView')).toBeInTheDocument();
    expect(screen.getByText(/busque uma cidade para começar/i)).toBeInTheDocument();
  });

  it('mostra a barra de busca e o alternador de unidade', () => {
    render(<App />);
    expect(screen.getByLabelText(/buscar cidade/i)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /unidade de temperatura/i })).toBeInTheDocument();
  });

  it('renderiza a prévia mockada e deriva a temperatura na unidade selecionada', async () => {
    render(<App />);

    expect(screen.getByRole('region', { name: 'Prévia de exemplo' })).toBeInTheDocument();
    expect(screen.getByText('24°')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '°F' }));

    expect(screen.getByText('75°')).toBeInTheDocument();
  });
});
