import React from 'react';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Admin screens
import AdminPanelScreen from '@/screens/admin/AdminPanelScreen';
// Auth screens
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
// Buyer screens
import HomeScreen from '@/screens/buyer/HomeScreen';
import ProductDetailScreen from '@/screens/buyer/ProductDetailScreen';
// Common
import ProfileScreen from '@/screens/common/ProfileScreen';
import SplashScreen from '@/screens/common/SplashScreen';
// Farmer screens
import AddProductScreen from '@/screens/farmer/AddProductScreen';
import MyProductsScreen from '@/screens/farmer/MyProductsScreen';
import { useAuth } from '@/store/AuthContext';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type BuyerTabsParamList = {
  Home: undefined;
  ProductDetail: undefined;
};

export type BuyerStackParamList = {
  BuyerTabs: undefined;
  Profile: undefined;
};

export type FarmerTabsParamList = {
  MyProducts: undefined;
  AddProduct: undefined;
};

export type FarmerStackParamList = {
  FarmerTabs: undefined;
  Profile: undefined;
};

export type AdminStackParamList = {
  AdminPanel: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();
const BuyerTab = createBottomTabNavigator<BuyerTabsParamList>();
const FarmerTab = createBottomTabNavigator<FarmerTabsParamList>();
const BuyerStack = createNativeStackNavigator<BuyerStackParamList>();
const FarmerStack = createNativeStackNavigator<FarmerStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();

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
    <BuyerTab.Navigator screenOptions={{ headerShown: false }}>
      <BuyerTab.Screen name="Home" component={HomeScreen} />
      <BuyerTab.Screen name="ProductDetail" component={ProductDetailScreen} />
    </BuyerTab.Navigator>
  );
}

function BuyerNavigator() {
  return (
    <BuyerStack.Navigator screenOptions={{ headerShown: false }}>
      <BuyerStack.Screen name="BuyerTabs" component={BuyerTabs} />
      <BuyerStack.Screen name="Profile" component={ProfileScreen} />
    </BuyerStack.Navigator>
  );
}

function FarmerTabs() {
  return (
    <FarmerTab.Navigator screenOptions={{ headerShown: false }}>
      <FarmerTab.Screen name="MyProducts" component={MyProductsScreen} />
      <FarmerTab.Screen name="AddProduct" component={AddProductScreen} />
    </FarmerTab.Navigator>
  );
}

function FarmerNavigator() {
  return (
    <FarmerStack.Navigator screenOptions={{ headerShown: false }}>
      <FarmerStack.Screen name="FarmerTabs" component={FarmerTabs} />
      <FarmerStack.Screen name="Profile" component={ProfileScreen} />
    </FarmerStack.Navigator>
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
    case 'farmer':
      return <FarmerNavigator />;
    case 'admin':
      return (
        <AdminStack.Navigator screenOptions={{ headerShown: false }}>
          <AdminStack.Screen name="AdminPanel" component={AdminPanelScreen} />
        </AdminStack.Navigator>
      );
    case 'buyer':
      return <BuyerNavigator />;
    case undefined:
    default:
      return <SplashScreen />;
  }
}
