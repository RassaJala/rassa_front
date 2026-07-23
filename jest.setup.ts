// jest.setup.ts - Global test setup
// Mock React Native globals
(global as any).__DEV__ = true;

// Suppress React 18 act() warnings in tests (known issue with react-test-renderer)
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    args[0].includes('not wrapped in act')
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
};

// Debug: confirm setup is running
console.log('[jest.setup.ts] __DEV__ set to:', (global as any).__DEV__);

// Mock @sentry/react-native
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  init: jest.fn(),
  setUser: jest.fn(),
  configureScope: jest.fn(),
  withScope: jest.fn((callback) =>
    callback({ setTag: jest.fn(), setExtra: jest.fn() }),
  ),
}));

// Mock react-native modules that use native code
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  }));
});

// Mock react-native-paper Portal to avoid PortalHost AggregateError in Jest tests
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  return {
    ...RealModule,
    Portal: ({ children }: any) => children,
  };
});

// Mock react-native-safe-area-context to avoid safe area provider errors in Jest tests
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires -- jest mock factory needs inline require
  const { createContext } = require('react') as typeof import('react');
  const SafeAreaInsetsContext = createContext(inset);

  return {
    SafeAreaInsetsContext,
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children }: any) => children,
    initialWindowMetrics: null,
    useSafeAreaInsets: () => inset,
  };
});

export {};
