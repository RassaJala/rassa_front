import '@testing-library/jest-dom/vitest';
import { resetRecoleccionesMock } from './mocks/handlers';
import { server } from './mocks/server';

// jsdom does not implement URL.createObjectURL/revokeObjectURL; components use them for image previews.
Object.defineProperty(URL, 'createObjectURL', {
  configurable: true,
  writable: true,
  value: () => 'blob:stub',
});

Object.defineProperty(URL, 'revokeObjectURL', {
  configurable: true,
  writable: true,
  value: () => {},
});

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
