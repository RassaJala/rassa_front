// jest.setup.ts - Global test setup
// Mock React Native globals
global.__DEV__ = true;

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
console.log('[jest.setup.ts] __DEV__ set to:', global.__DEV__);

// Mock @sentry/react-native
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  init: jest.fn(),
  setUser: jest.fn(),
  configureScope: jest.fn(),
  withScope: jest.fn((callback) => callback({ setTag: jest.fn(), setExtra: jest.fn() })),
}));

// Mock react-native modules that use native code
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  }));
});

export {};