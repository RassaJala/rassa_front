/* globals clearTimeout, setTimeout -- Required for React Native timers */

import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Navbar from '@/components/Navbar';
import { RoleErrorScreen } from '@/navigation/RoleErrorScreen';
import AdminPanelScreen from '@/screens/admin/AdminPanelScreen';
import CategoryListScreen from '@/screens/admin/CategoryListScreen';
import CategoryTrashScreen from '@/screens/admin/CategoryTrashScreen';
import UnitListScreen from '@/screens/admin/UnitListScreen';
import UnitTrashScreen from '@/screens/admin/UnitTrashScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import HomeScreen from '@/screens/buyer/HomeScreen';
import CarritoScreen from '@/screens/common/CarritoScreen';
import NotificationsScreen from '@/screens/common/NotificationsScreen';
import OnboardingScreen from '@/screens/common/OnboardingScreen';
import SplashScreen from '@/screens/common/SplashScreen';
import AddProductScreen from '@/screens/farmer/AddProductScreen';
import MyProductsScreen from '@/screens/farmer/MyProductsScreen';
import HomeSellerScreen from '@/screens/seller/HomeSellerScreen';
import ProfileSellerScreen from '@/screens/seller/ProfileSellerScreen';
import SalesScreen from '@/screens/seller/SalesScreen';
import * as Storage from '@/services/storage';
import { useAuth } from '@/store/AuthContext';
import type { AdminStackParamList } from '@/types';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
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
    <Tab.Navigator
      screenOptions={{
        header: () => <Navbar />,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Inicio' }}
      />

      <Tab.Screen name="Carrito" component={CarritoScreen} />

      <Tab.Screen name="Notificaciones" component={NotificationsScreen} />
    </Tab.Navigator>
  );
}

function FarmerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <Navbar />,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tab.Screen
        name="MyProducts"
        component={MyProductsScreen}
        options={{ title: 'Mis Productos' }}
      />

      <Tab.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ title: 'Agregar' }}
      />

      <Tab.Screen name="Notificaciones" component={NotificationsScreen} />
    </Tab.Navigator>
  );
}

function SellerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <Navbar />,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tab.Screen
        name="SellerHome"
        component={HomeSellerScreen}
        options={{ title: 'Inicio' }}
      />

      <Tab.Screen
        name="Sales"
        component={SalesScreen}
        options={{ title: 'Ventas' }}
      />

      <Tab.Screen
        name="Notificaciones"
        component={NotificationsScreen}
        options={{ title: 'Notificaciones' }}
      />

      <Tab.Screen
        name="Perfil"
        component={ProfileSellerScreen}
        options={{ title: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}

function AdminScreens() {
  return (
    <AdminStack.Navigator
      screenOptions={{
        header: () => <Navbar />,
      }}
    >
      <AdminStack.Screen name="AdminPanel" component={AdminPanelScreen} />
      <AdminStack.Screen name="CategoryList" component={CategoryListScreen} />
      <AdminStack.Screen name="UnitList" component={UnitListScreen} />
      <AdminStack.Screen name="CategoryTrash" component={CategoryTrashScreen} />
      <AdminStack.Screen name="UnitTrash" component={UnitTrashScreen} />
      <AdminStack.Screen
        name="Notificaciones"
        component={NotificationsScreen}
      />
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
      return <FarmerTabs />;

    case 'seller':
      return <SellerTabs />;

    case 'admin':
      return <AdminScreens />;
    case 'buyer':
      return <BuyerTabs />;

    case undefined:
    default:
      return <RoleErrorScreen onLogout={() => void logout()} />;
  }
}
