import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchBar from '../../src/components/SearchBar';

describe('SearchBar', () => {
  it('não dispara busca com input vazio', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const form = screen.getByRole('search', { name: /pesquisa de cidades/i });
    fireEvent.submit(form);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('não dispara busca quando o input contém apenas espaços', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const input = screen.getByRole('textbox', { name: /buscar cidade/i });
    await userEvent.type(input, '   ');
    fireEvent.submit(screen.getByRole('search', { name: /pesquisa de cidades/i }));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('dispara busca com o termo digitado', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    await userEvent.type(screen.getByLabelText(/buscar cidade/i), 'Lisboa');
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }));
    expect(onSearch).toHaveBeenCalledWith('Lisboa');
  });

  it('desabilita input e submissão quando disabled está ativo', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} disabled />);
    const input = screen.getByRole('textbox', { name: /buscar cidade/i });

    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: /buscar/i })).toBeDisabled();
    fireEvent.submit(screen.getByRole('search', { name: /pesquisa de cidades/i }));
    expect(onSearch).not.toHaveBeenCalled();
  });
});
