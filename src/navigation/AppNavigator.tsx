/* globals clearTimeout, setTimeout -- Required for React Native timers */

import React, { useEffect, useState } from 'react';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RoleErrorScreen } from '@/navigation/RoleErrorScreen';
import AdminPanelScreen from '@/screens/admin/AdminPanelScreen';
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
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#DE393A',
        tabBarInactiveTintColor: '#6b7280',

        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'home',
            Carrito: 'cart',
            Notificaciones: 'bell',
          } as const;

          const iconName =
            icons[route.name as keyof typeof icons] ?? 'dots-horizontal';

          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
      })}
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
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#DE393A',
        tabBarInactiveTintColor: '#6b7280',

        tabBarIcon: ({ color, size }) => {
          const icons = {
            MyProducts: 'leaf',
            AddProduct: 'plus-circle',
            Notificaciones: 'bell',
          } as const;

          const iconName =
            icons[route.name as keyof typeof icons] ?? 'dots-horizontal';

          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
      })}
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
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#DE393A',
        tabBarInactiveTintColor: '#6b7280',

        tabBarIcon: ({ color, size }) => {
          const icons = {
            SellerHome: 'storefront',
            Sales: 'cash',
            Notificaciones: 'bell',
            Perfil: 'account',
          } as const;

          const iconName =
            icons[route.name as keyof typeof icons] ?? 'dots-horizontal';

          return (
            <MaterialCommunityIcons name={iconName} size={size} color={color} />
          );
        },
      })}
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
      return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
        </Stack.Navigator>
      );

    case 'buyer':
      return <BuyerTabs />;

    case undefined:
    default:
      return <RoleErrorScreen onLogout={() => void logout()} />;
  }
}
