import React, { Component } from 'react';
import { Platform, Text, View } from 'react-native';
import { Button, Card } from 'react-native-paper';

interface Props {
  readonly children: React.ReactNode;
  readonly fallback?: React.ReactNode;
}

interface State {
  readonly hasError: boolean;
  readonly error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  private errorHandler?: (event: ErrorEvent) => void;
  private rejectionHandler?: (event: PromiseRejectionEvent) => void;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidMount(): void {
    // ponytail: captura errores async que componentDidCatch no alcanza
    if (Platform.OS === 'web') {
      this.errorHandler = (event: ErrorEvent) => {
        event.preventDefault();
        this.setState({ hasError: true, error: new Error(event.message) });
      };
      this.rejectionHandler = (event: PromiseRejectionEvent) => {
        event.preventDefault();
        const msg =
          event.reason instanceof Error
            ? event.reason.message
            : String(event.reason);
        this.setState({ hasError: true, error: new Error(msg) });
      };

      window.addEventListener('error', this.errorHandler);

      window.addEventListener('unhandledrejection', this.rejectionHandler);
    }
  }

  override componentWillUnmount(): void {
    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler);
    }
    if (this.rejectionHandler) {
      window.removeEventListener('unhandledrejection', this.rejectionHandler);
    }
  }

  override componentDidCatch(error: Error, _errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error.message);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  renderErrorView(): React.JSX.Element {
    if (this.props.fallback) {
      return this.props.fallback as React.JSX.Element;
    }

    const isDev = __DEV__;

    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
        <Card className="w-full max-w-md">
          <View className="items-center p-6">
            <Text className="mb-4 text-center text-lg font-semibold text-brand-ink dark:text-gray-100">
              Algo salió mal
            </Text>
            <Text className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Ocurrió un error inesperado. Por favor, intenta de nuevo.
            </Text>
            {isDev && this.state.error ? (
              <View className="mb-4 max-h-48 w-full overflow-y-auto rounded bg-gray-100 p-3 dark:bg-gray-900">
                <Text className="font-mono text-xs text-red-600 dark:text-red-400">
                  {this.state.error.message}
                  {this.state.error.stack
                    ? `\n\n${this.state.error.stack}`
                    : ''}
                </Text>
              </View>
            ) : null}
            <Button mode="contained" onPress={this.handleRetry}>
              Reintentar
            </Button>
          </View>
        </Card>
      </View>
    );
  }

  override render(): React.JSX.Element {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback as React.JSX.Element;
      }

      const isDev = __DEV__;

      return (
        <View className="flex-1 items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
          <Card className="w-full max-w-md">
            <View className="items-center p-6">
              <Text className="mb-4 text-center text-lg font-semibold text-brand-ink dark:text-gray-100">
                Algo salió mal
              </Text>
              <Text className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Ocurrió un error inesperado. Por favor, intenta de nuevo.
              </Text>
              {isDev && this.state.error ? (
                <View className="mb-4 max-h-48 w-full overflow-y-auto rounded bg-gray-100 p-3 dark:bg-gray-900">
                  <Text className="font-mono text-xs text-red-600 dark:text-red-400">
                    {this.state.error.message}
                    {this.state.error.stack
                      ? `\n\n${this.state.error.stack}`
                      : ''}
                  </Text>
                </View>
              ) : null}
              <Button mode="contained" onPress={this.handleRetry}>
                Reintentar
              </Button>
            </View>
          </Card>
        </View>
      );
    }

    return this.props.children as React.JSX.Element;
  }
}
