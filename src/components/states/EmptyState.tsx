interface EmptyStateProps {
  title: string;
  hint: string;
}

/** Estado vazio (nenhuma busca feita ou nenhum resultado). */
export default function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <span aria-hidden="true" className="text-4xl">
        🌍
      </span>
      <h2 className="text-lg font-semibold text-white/90">{title}</h2>
      <p className="text-sm text-white/60">{hint}</p>
    </div>
  );
}
