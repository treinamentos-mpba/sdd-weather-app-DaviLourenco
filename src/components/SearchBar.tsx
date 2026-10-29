import { type FormEvent, useState } from 'react';

interface SearchBarProps {
  onSearch: (city: string) => void;
  disabled?: boolean;
}

/** Barra de busca de cidade. Bloqueia submit com input vazio. */
export default function SearchBar({ onSearch, disabled }: SearchBarProps) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (disabled) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    onSearch(trimmed);
  }

  return (
    <form
      role="search"
      aria-label="Pesquisa de cidades"
      onSubmit={handleSubmit}
      className="w-full max-w-md"
    >
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md transition focus-within:border-accent-500 focus-within:ring-2 focus-within:ring-accent-500/40">
        <span aria-hidden="true" className="text-white/50">
          🔍
        </span>
        <label htmlFor="city-search" className="sr-only">
          Buscar cidade
        </label>
        <input
          id="city-search"
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Buscar cidade…"
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 bg-transparent text-white placeholder-white/60 outline-none"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="min-h-11 min-w-11 shrink-0 rounded-lg bg-accent-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-night-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
