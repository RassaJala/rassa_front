import type { AppColors } from '../hooks/useAppColors';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  colors: AppColors;
}

export function Pagination({
  page,
  totalPages,
  onChange,
  colors,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div
      className="flex items-center justify-center gap-1.5 px-[18px] py-4"
      style={{
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: colors.bg,
          color: colors.muted,
          border: `1px solid ${colors.border}`,
        }}
      >
        Anterior
      </button>

      {start > 1 && (
        <>
          <button
            onClick={() => onChange(1)}
            className="cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium"
            style={{
              background: colors.bg,
              color: colors.muted,
              border: `1px solid ${colors.border}`,
            }}
          >
            1
          </button>
          {start > 2 && (
            <span className="px-1 text-[13px]" style={{ color: colors.muted }}>
              ...
            </span>
          )}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium"
          style={{
            background: p === page ? colors.brand : colors.bg,
            color: p === page ? '#fff' : colors.muted,
            border: `1px solid ${p === page ? colors.brand : colors.border}`,
          }}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="px-1 text-[13px]" style={{ color: colors.muted }}>
              ...
            </span>
          )}
          <button
            onClick={() => onChange(totalPages)}
            className="cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium"
            style={{
              background: colors.bg,
              color: colors.muted,
              border: `1px solid ${colors.border}`,
            }}
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: colors.bg,
          color: colors.muted,
          border: `1px solid ${colors.border}`,
        }}
      >
        Siguiente
      </button>
    </div>
  );
}
