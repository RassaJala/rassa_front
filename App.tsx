import "~/styles/global.css";
import React from "react";

import { StatusBar } from "expo-status-bar";

import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AppNavigator from "~/navigation/AppNavigator";
import { AuthProvider } from "~/store/AuthContext";

const queryClient = new QueryClient();

export default function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </AuthProvider>
    </QueryClientProvider>
  );
}
