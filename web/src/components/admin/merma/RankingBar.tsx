interface RankingBarProps {
  label: string;
  total: number;
  maxTotal: number;
  barClass: string;
  rank?: number;
  suffix?: string;
}

export function RankingBar({
  label,
  total,
  maxTotal,
  barClass,
  rank,
  suffix = '',
}: RankingBarProps) {
  const pct = (total / maxTotal) * 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-800 dark:text-gray-200">
          {rank !== undefined && (
            <span className="mr-1.5 text-xs text-gray-400">{rank}.</span>
          )}
          {label}
        </span>
        <span className="ml-2 font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {total}
          {suffix}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}
