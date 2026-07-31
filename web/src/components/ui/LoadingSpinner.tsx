export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className={`flex items-center justify-center ${className}`}
    >
      <div className="border-t-brand-red-coral dark:border-t-brand-red-coral h-8 w-8 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700" />
    </div>
  );
}
