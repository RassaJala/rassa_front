import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Admin screens
import AdminPanelScreen from '@/screens/admin/AdminPanelScreen';

// Auth screens
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';

// Buyer screens
import HomeScreen from '@/screens/buyer/HomeScreen';

// Common
import SplashScreen from '@/screens/common/SplashScreen';
import OnboardingScreen from '@/screens/common/OnboardingScreen';
import CarritoScreen from '@/screens/common/CarritoScreen';
import NotificationsScreen from '@/screens/common/NotificationsScreen';

// Farmer screens
import AddProductScreen from '@/screens/farmer/AddProductScreen';
import MyProductsScreen from '@/screens/farmer/MyProductsScreen';

import HomeSellerScreen from '@/screens/seller/HomeSellerScreen';
import SalesScreen from '@/screens/seller/SalesScreen';
import ProfileSellerScreen from '@/screens/seller/ProfileSellerScreen';

// Storage
import * as Storage from '@/services/storage';

import { useAuth } from '@/store/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
      />

      <Stack.Screen
        name="Register"
        component={RegisterScreen}
      />
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
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;

            case 'Carrito':
              iconName = 'cart';
              break;

            case 'Notificaciones':
              iconName = 'notifications';
              break;

            default:
              iconName = 'ellipse';
              break;
          }

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
        options={{
          title: 'Inicio',
        }}
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
          let iconName: keyof typeof Ionicons.glyphMap = 'leaf';

          switch (route.name) {
            case 'MyProducts':
              iconName = 'leaf';
              break;

            case 'AddProduct':
              iconName = 'add-circle';
              break;

            case 'Notificaciones':
              iconName = 'notifications';
              break;

            default:
              iconName = 'ellipse';
              break;
          }

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
        options={{
          title: 'Mis Productos',
        }}
      />

      <Tab.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{
          title: 'Agregar',
        }}
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
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'SellerHome':
              iconName = 'storefront';
              break;

            case 'Sales':
              iconName = 'cash';
              break;

            case 'Notificaciones':
              iconName = 'notifications';
              break;

            case 'Perfil':
              iconName = 'person';
              break;

            default:
              iconName = 'ellipse';
              break;
          }

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
        options={{
          title: 'Inicio',
        }}
      />

      <Tab.Screen
        name="Sales"
        component={SalesScreen}
        options={{
          title: 'Ventas',
        }}
      />

      <Tab.Screen
        name="Notificaciones"
        component={NotificationsScreen}
        options={{
          title: 'Notificaciones',
        }}
      />

      <Tab.Screen
        name="Perfil"
        component={ProfileSellerScreen}
        options={{
          title: 'Perfil',
        }}
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
          Storage.ONBOARDING_KEY
        );

      if (!completed) {

        setShowOnboarding(true);

      }

      setCheckingOnboarding(false);

    };

    void verifyOnboarding();

  }, []);

  // Mientras revisa sesión y onboarding

  if (isLoading || checkingOnboarding) {

    return <SplashScreen />;

  }

  // Primera vez usando la aplicación

  if (showOnboarding) {

    return (

      <OnboardingScreen

        onFinish={async () => {

          await Storage.setItemAsync(

            Storage.ONBOARDING_KEY,

            'true'

          );

          setShowOnboarding(false);

        }}

      />

    );

  }

  // Usuario no autenticado

  if (!isAuthenticated) {

    return <AuthStack />;

  }

  // Usuario autenticado según rol

  switch (user?.role) {

  case 'farmer':
  return <FarmerTabs />;

case 'seller':
  return <SellerTabs />;

    case 'admin':

      return (

        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >

          <Stack.Screen
            name="AdminPanel"
            component={AdminPanelScreen}
          />

        </Stack.Navigator>

      );

    case 'buyer':

      return <BuyerTabs />;

    default:

      return <SplashScreen />;

  }

}