import '~/styles/global.css';
import React from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import {
  MD3DarkTheme,
  MD3LightTheme,
  Provider as PaperProvider,
} from 'react-native-paper';

import { StatusBar } from 'expo-status-bar';

import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import type { Theme as NavigationTheme } from '@react-navigation/native';
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useColorScheme } from 'nativewind';

import ErrorBoundary from '@/components/ErrorBoundary';
import { colors } from '@/constants/colors';
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

  const isDark = colorScheme === 'dark';

  const navigationTheme: NavigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: isDark ? colors.admBrandD : colors.admBrandL,
      background: isDark ? colors.admBgD : colors.admBgL,
      card: isDark ? colors.admSurfaceD : colors.admSurfaceL,
      text: isDark ? colors.admFgD : colors.admFgL,
      border: isDark ? colors.admBorderD : colors.admBorderL,
      notification: brandCoral,
    },
  };

  const theme =
    colorScheme === 'dark'
      ? {
          ...MD3DarkTheme,
          colors: {
            ...MD3DarkTheme.colors,
            primary: colors.admBrandD,
            secondaryContainer: colors.admActiveBgD,
            onSecondaryContainer: colors.admBrandD,
          },
        }
      : {
          ...MD3LightTheme,
          colors: {
            ...MD3LightTheme.colors,
            primary: colors.admBrandL,
            secondaryContainer: colors.admActiveBgL,
            onSecondaryContainer: colors.admBrandL,
          },
        };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PaperProvider theme={theme}>
          <AuthProvider>
            <ErrorBoundary>
              <KeyboardProvider preload={false}>
                <NavigationContainer theme={navigationTheme}>
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
