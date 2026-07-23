import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon = "📦",
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="text-4xl" role="img" aria-hidden>
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      {message && (
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {message}
        </p>
      )}
      {action}
    </div>
  );
}
