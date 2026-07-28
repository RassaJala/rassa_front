module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  testTimeout: 15000,
  testPathIgnorePatterns: ['/node_modules/', '/web/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/.*|native-base|react-native-svg|@formatjs/.*|@unimodules/.*|unimodules/.*|sentry-expo|expo.*|@react-native/.*|@react-native-community/.*|metro.*|@babel/runtime|pretty-format|@jest/.*|jest-.*|expect|jest-matcher-utils|jest-message-util|jest-regex-util|jest-resolve|jest-snapshot|jest-util|jest-worker|@types/.*|tslib|deepmerge|yargs|cliui|string-width|wrap-ansi|ansi-styles|color-convert|color-name|is-fullwidth-code-point|emoji-regex|strip-ansi|has-flag|supports-color|error-ex|p-locate|path-exists|path-type|resolve-from|locate-path|p-limit|slice-ansi|string-decoder|readable-stream|buffer|safe-buffer|util-deprecate|inherits|setimmediate|process|path-browserify|url|punycode|querystring|assert|events|stream|util|vm|crypto|buffer-from|string_decoder|os|tty|constants|module|_stream_.*|readable-stream|core-util-is|isarray|safe-buffer|buffer|performance-now|date-fns|uuid|@sentry/core|@sentry/utils|@sentry/react-native|@sentry/types)',
  ],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov'],
  moduleNameMapper: {
    '^@rassa/chat$': '<rootDir>/packages/chat/src',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/src/$1',
  },
};
