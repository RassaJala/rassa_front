import '~/styles/global.css';
import React from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import {
  MD3DarkTheme,
  MD3LightTheme,
  Provider as PaperProvider,
} from 'react-native-paper';

import { StatusBar } from 'expo-status-bar';

import { NavigationContainer } from '@react-navigation/native';
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useColorScheme } from 'nativewind';

import ErrorBoundary from '@/components/ErrorBoundary';
import AppNavigator from '~/navigation/AppNavigator';
import { AuthProvider } from '~/store/AuthContext';
import { ThemeProvider } from '~/store/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 30_000,
    },
  },
  queryCache: new QueryCache({
    onError: (error: Error) => {
      console.error('[QueryCache]', error.message);
    },
  }),
});

export default function App(): React.JSX.Element {
  const { colorScheme } = useColorScheme();
  const brandCoral = '#DE393A';

  const brandCoralLight = '#FEF2F2'; // red-50 tint — active segment background (light)
  const brandCoralDark = '#3B1212'; // dark coral tint — active segment background (dark)

  const theme =
    colorScheme === 'dark'
      ? {
          ...MD3DarkTheme,
          colors: {
            ...MD3DarkTheme.colors,
            primary: brandCoral,
            secondaryContainer: brandCoralDark,
            onSecondaryContainer: brandCoral,
          },
        }
      : {
          ...MD3LightTheme,
          colors: {
            ...MD3LightTheme.colors,
            primary: brandCoral,
            secondaryContainer: brandCoralLight,
            onSecondaryContainer: brandCoral,
          },
        };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PaperProvider theme={theme}>
          <AuthProvider>
            <ErrorBoundary>
              <KeyboardProvider preload={false}>
                <NavigationContainer>
                  <AppNavigator />
                  <StatusBar style="auto" />
                </NavigationContainer>
              </KeyboardProvider>
            </ErrorBoundary>
          </AuthProvider>
        </PaperProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
