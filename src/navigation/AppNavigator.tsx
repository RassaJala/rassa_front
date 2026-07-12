import React, { useEffect, useState } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
        tabBarActiveTintColor: '#15803d',
        tabBarInactiveTintColor: '#9ca3af',

        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'home',
            Carrito: 'cart',
            Notificaciones: 'notifications',
          } as const;

          const iconName =
            icons[route.name as keyof typeof icons] ?? 'ellipse';

          return (
            <Ionicons
              name={iconName}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Inicio' }}
      />

      <Tab.Screen
        name="Carrito"
        component={CarritoScreen}
      />

      <Tab.Screen
        name="Notificaciones"
        component={NotificationsScreen}
      />
    </Tab.Navigator>
  );
}


function FarmerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#15803d',
        tabBarInactiveTintColor: '#9ca3af',

        tabBarIcon: ({ color, size }) => {
          const icons = {
            MyProducts: 'leaf',
            AddProduct: 'add-circle',
            Notificaciones: 'notifications',
          } as const;

          const iconName =
            icons[route.name as keyof typeof icons] ?? 'ellipse';

          return (
            <Ionicons
              name={iconName}
              size={size}
              color={color}
            />
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

      <Tab.Screen
        name="Notificaciones"
        component={NotificationsScreen}
      />
    </Tab.Navigator>
  );
}


function SellerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#15803d',
        tabBarInactiveTintColor: '#9ca3af',

        tabBarIcon: ({ color, size }) => {
          const icons = {
            SellerHome: 'storefront',
            Sales: 'cash',
            Notificaciones: 'notifications',
            Perfil: 'person',
          } as const;

          const iconName =
            icons[route.name as keyof typeof icons] ?? 'ellipse';

          return (
            <Ionicons
              name={iconName}
              size={size}
              color={color}
            />
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


export default function AppNavigator(): React.JSX.Element {
  const {
    isAuthenticated,
    isLoading,
    user,
  } = useAuth();

  const [showOnboarding, setShowOnboarding] = useState(false);

  const [checkingOnboarding, setCheckingOnboarding] =
    useState(true);


  useEffect(() => {
    const verifyOnboarding = async () => {
      const completed =
        await Storage.getItemAsync(
          Storage.ONBOARDING_KEY,
        );

      if (!completed) {
        setShowOnboarding(true);
      }

      setCheckingOnboarding(false);
    };

    void verifyOnboarding();
  }, []);


  if (isLoading || checkingOnboarding) {
    return <SplashScreen />;
  }


  if (showOnboarding) {
    return (
      <OnboardingScreen
        onFinish={async () => {
          await Storage.setItemAsync(
            Storage.ONBOARDING_KEY,
            'true',
          );

          setShowOnboarding(false);
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
          <Stack.Screen
            name="AdminPanel"
            component={AdminPanelScreen}
          />
        </Stack.Navigator>
      );

    case 'buyer':
      return <BuyerTabs />;

    case undefined:
      return <SplashScreen />;

    default:
      return <SplashScreen />;
  }
}