import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import * as Sentry from '@sentry/react';

import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './providers/AuthProvider';
import { QueryProvider } from './providers/QueryProvider';
import { ThemeProvider } from './providers/ThemeProvider';

import './index.css';

// ponytail: Sentry only when a DSN is configured — dev/tests run without it.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      const evt = event as Record<string, unknown>;
      const request = evt.request as
        | { headers: Record<string, unknown> }
        | undefined;
      if (request?.headers) {
        const redacted = { ...request.headers };
        for (const key of Object.keys(redacted)) {
          if (
            /^(authorization|proxy-authorization|cookie|set-cookie)$/i.test(
              key,
            )
          ) {
            delete redacted[key];
          }
        }
        request.headers = redacted;
      }
      return event;
    },
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  </StrictMode>,
);
