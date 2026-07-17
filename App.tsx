import '~/styles/global.css';
import React from 'react';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';

import { StatusBar } from 'expo-status-bar';

import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { colors } from '~/constants/colors';
import AppNavigator from '~/navigation/AppNavigator';
import { AuthProvider } from '~/store/AuthContext';

const queryClient = new QueryClient();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.brandGreenForest,
  },
};

export default function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
