import React from 'react';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Admin screens
import AdminPanelScreen from '@/screens/admin/AdminPanelScreen';
import CategoryListScreen from '@/screens/admin/CategoryListScreen';
import CategoryTrashScreen from '@/screens/admin/CategoryTrashScreen';
import UnitListScreen from '@/screens/admin/UnitListScreen';
import UnitTrashScreen from '@/screens/admin/UnitTrashScreen';
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
import type {
  AdminStackParamList,
  AuthStackParamList,
  BuyerStackParamList,
  BuyerTabsParamList,
  FarmerStackParamList,
  FarmerTabsParamList,
} from '@/types';

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

function AdminScreens() {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="AdminPanel" component={AdminPanelScreen} />
      <AdminStack.Screen name="CategoryList" component={CategoryListScreen} />
      <AdminStack.Screen name="UnitList" component={UnitListScreen} />
      <AdminStack.Screen name="CategoryTrash" component={CategoryTrashScreen} />
      <AdminStack.Screen name="UnitTrash" component={UnitTrashScreen} />
    </AdminStack.Navigator>
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
      return <AdminScreens />;
    case 'buyer':
      return <BuyerNavigator />;
    case undefined:
    default:
      return <SplashScreen />;
  }
}
