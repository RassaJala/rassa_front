import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import * as Sentry from '@sentry/react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private errorHandler?: (event: ErrorEvent) => void;
  private rejectionHandler?: (event: PromiseRejectionEvent) => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidMount(): void {
    // ponytail: captura errores async (useMutation, setTimeout, promesas)
    this.errorHandler = (event: ErrorEvent) => {
      event.preventDefault();
      this.setState({ hasError: true });
    };
    this.rejectionHandler = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      this.setState({ hasError: true });
    };
    window.addEventListener('error', this.errorHandler);
    window.addEventListener('unhandledrejection', this.rejectionHandler);
  }

  override componentWillUnmount(): void {
    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler);
    }
    if (this.rejectionHandler) {
      window.removeEventListener('unhandledrejection', this.rejectionHandler);
    }
  }

  override componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    // ponytail: sanitize — only log message, not stack/user data
    console.error('[ErrorBoundary]', error.message);
    Sentry.captureException(error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-4 dark:bg-gray-950">
          <h1 className="text-brand-ink text-2xl font-bold dark:text-gray-100">
            Algo salió mal
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Ocurrió un error inesperado. Intentá de nuevo.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-brand-red-coral rounded-lg px-6 py-2 text-white transition-colors hover:bg-red-600"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
