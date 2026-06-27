import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../store/AuthContext";

// Auth screens
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

// Buyer screens
import HomeScreen from "../screens/buyer/HomeScreen";
import ProductDetailScreen from "../screens/buyer/ProductDetailScreen";

// Farmer screens
import MyProductsScreen from "../screens/farmer/MyProductsScreen";
import AddProductScreen from "../screens/farmer/AddProductScreen";

// Seller screens
import SellerDashboardScreen from "../screens/seller/SellerDashboardScreen";

// Admin screens
import AdminPanelScreen from "../screens/admin/AdminPanelScreen";

// Common
import SplashScreen from "../screens/common/SplashScreen";
import ProfileScreen from "../screens/common/ProfileScreen";

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
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "🛒 Tienda" }} />
      <Tab.Screen name="ProductDetail" component={ProductDetailScreen} options={{ tabBarLabel: "🔍 Detalle" }} />
    </Tab.Navigator>
  );
}

function FarmerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="MyProducts" component={MyProductsScreen} options={{ tabBarLabel: "🌾 Mis Productos" }} />
      <Tab.Screen name="AddProduct" component={AddProductScreen} options={{ tabBarLabel: "➕ Agregar" }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  // Authenticated: route by role, all stacks include ProfileScreen
  switch (user?.role) {
    case "farmer":
      return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="FarmerTabs" component={FarmerTabs} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
      );
    case "seller":
      return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="SellerDashboard" component={SellerDashboardScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
      );
    case "admin":
      return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
      );
    case "buyer":
    default:
      return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="BuyerHome" component={BuyerTabs} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
      );
  }
}
