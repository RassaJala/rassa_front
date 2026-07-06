import React from "react";

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Admin screens
import AdminPanelScreen from "~/screens/admin/AdminPanelScreen";
// Auth screens
import LoginScreen from "~/screens/auth/LoginScreen";
import RegisterScreen from "~/screens/auth/RegisterScreen";
// Buyer screens
import HomeScreen from "~/screens/buyer/HomeScreen";
import ProductDetailScreen from "~/screens/buyer/ProductDetailScreen";
// Common
import SplashScreen from "~/screens/common/SplashScreen";
import AddProductScreen from "~/screens/farmer/AddProductScreen";
// Farmer screens
import MyProductsScreen from "~/screens/farmer/MyProductsScreen";
import { useAuth } from "~/store/AuthContext";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function BuyerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Tab.Navigator>
  );
}

function FarmerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="MyProducts" component={MyProductsScreen} />
      <Tab.Screen name="AddProduct" component={AddProductScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator(): React.JSX.Element {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  // Authenticated: route by role
  switch (user?.role) {
    case "farmer":
      return <FarmerTabs />;
    case "admin":
      return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
        </Stack.Navigator>
      );
    case "buyer":
      return <BuyerTabs />;
    case undefined:
    default:
      return <SplashScreen />;
  }
}
