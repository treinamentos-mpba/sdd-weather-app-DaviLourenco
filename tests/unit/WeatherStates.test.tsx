import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EmptyState from '../../src/components/states/EmptyState';
import ErrorState from '../../src/components/states/ErrorState';
import LoadingState from '../../src/components/states/LoadingState';

describe('estados da interface', () => {
  it('anuncia o estado de carregamento', () => {
    render(<LoadingState />);

    expect(screen.getByRole('status')).toHaveTextContent('Carregando o clima');
  });

  it('apresenta a mensagem de erro e aciona nova tentativa', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Falha de rede" onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Falha de rede');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('apresenta título e dica no estado vazio', () => {
    render(<EmptyState title="Nenhuma cidade encontrada" hint="Revise a busca." />);

    expect(screen.getByRole('heading', { name: 'Nenhuma cidade encontrada' })).toBeInTheDocument();
    expect(screen.getByText('Revise a busca.')).toBeInTheDocument();
  });
});
