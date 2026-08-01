import '@testing-library/jest-dom/vitest';
import { resetRecoleccionesMock } from './mocks/handlers';
import { server } from './mocks/server';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  resetRecoleccionesMock();
});
afterAll(() => server.close());
