/* globals clearTimeout, setTimeout -- Required for React Native timers */

import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Navbar from '@/components/Navbar';
import { RoleErrorScreen } from '@/navigation/RoleErrorScreen';
import AdminPanelScreen from '@/screens/admin/AdminPanelScreen';
import AdminProductsScreen from '@/screens/admin/AdminProductsScreen';
import AdminProfileScreen from '@/screens/admin/AdminProfileScreen';
import CategoryListScreen from '@/screens/admin/CategoryListScreen';
import CategoryTrashScreen from '@/screens/admin/CategoryTrashScreen';
import UnitListScreen from '@/screens/admin/UnitListScreen';
import UnitTrashScreen from '@/screens/admin/UnitTrashScreen';
import UserManagementScreen from '@/screens/admin/UserManagementScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import HomeScreen from '@/screens/buyer/HomeScreen';
import ProductDetailScreen from '@/screens/buyer/ProductDetailScreen';
import CarritoScreen from '@/screens/common/CarritoScreen';
import NotificationsScreen from '@/screens/common/NotificationsScreen';
import OnboardingScreen from '@/screens/common/OnboardingScreen';
import ProfileScreen from '@/screens/common/ProfileScreen';
import SplashScreen from '@/screens/common/SplashScreen';
import AddProductScreen from '@/screens/farmer/AddProductScreen';
import MyProductsScreen from '@/screens/farmer/MyProductsScreen';
import HomeSellerScreen from '@/screens/seller/HomeSellerScreen';
import ProfileSellerScreen from '@/screens/seller/ProfileSellerScreen';
import SalesScreen from '@/screens/seller/SalesScreen';
import * as Storage from '@/services/storage';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList, AuthStackParamList } from '@/types';

const Stack = createNativeStackNavigator<AuthStackParamList>();
const BuyerTab = createBottomTabNavigator();
const FarmerTab = createBottomTabNavigator();
const SellerTab = createBottomTabNavigator();
const BuyerStack = createNativeStackNavigator();
const FarmerStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const AdminTab = createBottomTabNavigator();

function AdminTabs() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const surface = isDark ? '#263028' : '#FFFFFF';
  const muted = isDark ? '#9DA89D' : '#5E6B5E';
  const brand = isDark ? '#4A8A63' : '#24563C';
  const border = isDark ? '#353D35' : '#E2E6DF';

  return (
    <AdminTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: surface,
          borderTopColor: border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: brand,
        tabBarInactiveTintColor: muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <AdminTab.Screen
        name="AdminPanel"
        component={AdminPanelScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="home-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <AdminTab.Screen
        name="AdminProducts"
        component={AdminProductsScreen}
        options={{
          tabBarLabel: 'Productos',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="package-variant"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <AdminTab.Screen
        name="CategoryList"
        component={CategoryListScreen}
        options={{
          tabBarLabel: 'Categorías',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="folder-multiple-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <AdminTab.Screen
        name="UnitList"
        component={UnitListScreen}
        options={{
          tabBarLabel: 'Unidades',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="ruler" size={size} color={color} />
          ),
        }}
      />
      <AdminTab.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{
          tabBarLabel: 'Usuarios',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-group-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <AdminTab.Screen
        name="CategoryTrash"
        component={CategoryTrashScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none', width: 0, height: 0 },
        }}
      />
      <AdminTab.Screen
        name="UnitTrash"
        component={UnitTrashScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none', width: 0, height: 0 },
        }}
      />
    </AdminTab.Navigator>
  );
}

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
    <BuyerTab.Navigator
      screenOptions={{
        header: () => <Navbar />,
        tabBarStyle: { display: 'none' },
      }}
    >
      <BuyerTab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Inicio' }}
      />
      <BuyerTab.Screen name="Carrito" component={CarritoScreen} />
      <BuyerTab.Screen name="Notificaciones" component={NotificationsScreen} />
    </BuyerTab.Navigator>
  );
}

function BuyerNavigator() {
  return (
    <BuyerStack.Navigator screenOptions={{ headerShown: false }}>
      <BuyerStack.Screen name="BuyerTabs" component={BuyerTabs} />
      <BuyerStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <BuyerStack.Screen name="Profile" component={ProfileScreen} />
    </BuyerStack.Navigator>
  );
}

function FarmerTabs() {
  return (
    <FarmerTab.Navigator
      screenOptions={{
        header: () => <Navbar />,
        tabBarStyle: { display: 'none' },
      }}
    >
      <FarmerTab.Screen
        name="MyProducts"
        component={MyProductsScreen}
        options={{ title: 'Mis Productos' }}
      />
      <FarmerTab.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ title: 'Agregar' }}
      />
      <FarmerTab.Screen name="Notificaciones" component={NotificationsScreen} />
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

function SellerTabs() {
  return (
    <SellerTab.Navigator
      screenOptions={{
        header: () => <Navbar />,
        tabBarStyle: { display: 'none' },
      }}
    >
      <SellerTab.Screen
        name="SellerHome"
        component={HomeSellerScreen}
        options={{ title: 'Inicio' }}
      />
      <SellerTab.Screen
        name="Sales"
        component={SalesScreen}
        options={{ title: 'Ventas' }}
      />
      <SellerTab.Screen
        name="Notificaciones"
        component={NotificationsScreen}
        options={{ title: 'Notificaciones' }}
      />
      <SellerTab.Screen
        name="Perfil"
        component={ProfileSellerScreen}
        options={{ title: 'Perfil' }}
      />
    </SellerTab.Navigator>
  );
}

function AdminScreens() {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="AdminPanel" component={AdminTabs} />
      <AdminStack.Screen name="AdminProfile" component={AdminProfileScreen} />
    </AdminStack.Navigator>
  );
}

const SPLASH_TIMEOUT_MS = 5000;

export default function AppNavigator(): React.JSX.Element {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  const [showOnboarding, setShowOnboarding] = useState(false);

  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  const [splashTimedOut, setSplashTimedOut] = useState(false);

  useEffect(() => {
    if (isLoading || checkingOnboarding) {
      const timer = setTimeout(() => {
        setSplashTimedOut(true);
      }, SPLASH_TIMEOUT_MS);

      return () => {
        clearTimeout(timer);
      };
    }

    setSplashTimedOut(false);

    return () => {};
  }, [isLoading, checkingOnboarding]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setShowOnboarding(false);
      setCheckingOnboarding(false);
      return;
    }

    const verifyOnboarding = async (): Promise<void> => {
      try {
        const completed = await Storage.getItemAsync(Storage.ONBOARDING_KEY);

        setShowOnboarding(!completed);
      } catch {
        setShowOnboarding(false);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    void verifyOnboarding();
  }, []);

  if (isLoading || checkingOnboarding) {
    if (splashTimedOut) {
      return <RoleErrorScreen onLogout={() => void logout()} />;
    }

    return <SplashScreen />;
  }

  if (showOnboarding) {
    return (
      <OnboardingScreen
        onFinish={() => {
          void (async () => {
            await Storage.setItemAsync(Storage.ONBOARDING_KEY, 'true');
            setShowOnboarding(false);
          })();
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  switch (user?.role) {
    case 'farmer':
      return <FarmerNavigator />;
    case 'seller':
      return <SellerTabs />;
    case 'admin':
      return <AdminScreens />;
    case 'buyer':
      return <BuyerNavigator />;
    case undefined:
    default:
      return <RoleErrorScreen onLogout={() => void logout()} />;
  }
}
