interface CardKPIProps {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  icone?: string;
  destaque?: boolean;
}

export function CardKPI({
  titulo,
  valor,
  subtitulo,
  icone,
  destaque = false,
}: CardKPIProps) {
  return (
    <div
      className={`min-h-[102px] rounded-[10px] border px-4 py-3 transition-colors ${
        destaque
          ? "border-[#73d9cb]/35 bg-[var(--accent-soft)] text-[var(--text-primary)]"
          : "border-[var(--border-col)] bg-[var(--bg-panel)] text-[var(--text-primary)]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)]"
          >
            {titulo}
          </p>
          <p className="text-xl font-extrabold tracking-tight">{valor}</p>
          {subtitulo && (
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              {subtitulo}
            </p>
          )}
        </div>
        {icone && <span className="text-base opacity-45">{icone}</span>}
      </div>
    </div>
  );
}
