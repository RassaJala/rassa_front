import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '@/constants/colors';
import ChatListScreen from '@/features/chat/screens/ChatListScreen';
import ChatScreen from '@/features/chat/screens/ChatScreen';
import CreateGroupScreen from '@/features/chat/screens/CreateGroupScreen';
import GroupDetailScreen from '@/features/chat/screens/GroupDetailScreen';
import StartChatScreen from '@/features/chat/screens/StartChatScreen';
import { RoleErrorScreen } from '@/navigation/RoleErrorScreen';
import AdminPanelScreen from '@/screens/admin/AdminPanelScreen';
import AdminProductsScreen from '@/screens/admin/AdminProductsScreen';
import AdminProfileScreen from '@/screens/admin/AdminProfileScreen';
import CategoryListScreen from '@/screens/admin/CategoryListScreen';
import CategoryTrashScreen from '@/screens/admin/CategoryTrashScreen';
import LocalidadListScreen from '@/screens/admin/LocalidadListScreen';
import LocalidadTrashScreen from '@/screens/admin/LocalidadTrashScreen';
import MunicipioListScreen from '@/screens/admin/MunicipioListScreen';
import MunicipioTrashScreen from '@/screens/admin/MunicipioTrashScreen';
import AdminOrderDetailScreen from '@/screens/admin/OrderDetailScreen';
import UnitListScreen from '@/screens/admin/UnitListScreen';
import UnitTrashScreen from '@/screens/admin/UnitTrashScreen';
import UserFormScreen from '@/screens/admin/UserFormScreen';
import UserManagementScreen from '@/screens/admin/UserManagementScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import CatalogScreen from '@/screens/buyer/CatalogScreen';
import HomeScreen from '@/screens/buyer/HomeScreen';
import OrderDetailScreen from '@/screens/buyer/OrderDetailScreen';
import OrderHistoryScreen from '@/screens/buyer/OrderHistoryScreen';
import ProductDetailScreen from '@/screens/buyer/ProductDetailScreen';
import CarritoScreen from '@/screens/common/CarritoScreen';
import NotificationsScreen from '@/screens/common/NotificationsScreen';
import OnboardingScreen from '@/screens/common/OnboardingScreen';
import ProfileScreen from '@/screens/common/ProfileScreen';
import SplashScreen from '@/screens/common/SplashScreen';
import FamilyDetailScreen from '@/screens/families/FamilyDetailScreen';
import FamilyFormScreen from '@/screens/families/FamilyFormScreen';
import FamilyListScreen from '@/screens/families/FamilyListScreen';
import FarmerDashboardScreen from '@/screens/farmer/FarmerDashboardScreen';
import FarmerHomeScreen from '@/screens/farmer/FarmerHomeScreen';
import ProductFormScreen from '@/screens/farmer/ProductFormScreen';
import ProductListScreen from '@/screens/farmer/ProductListScreen';
import PublicationWizardScreen from '@/screens/farmer/PublicationWizardScreen';
import HomeSellerScreen from '@/screens/seller/HomeSellerScreen';
import ProfileSellerScreen from '@/screens/seller/ProfileSellerScreen';
import SalesScreen from '@/screens/seller/SalesScreen';
import * as Storage from '@/services/storage';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type {
  AdminStackParamList,
  AuthStackParamList,
  BuyerStackParamList,
  FarmerStackParamList,
  SellerStackParamList,
  SellerTabsParamList,
} from '@/types';

const Stack = createNativeStackNavigator<AuthStackParamList>();
const BuyerTab = createBottomTabNavigator();
const SellerTab = createBottomTabNavigator<SellerTabsParamList>();
const BuyerStack = createNativeStackNavigator<BuyerStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const FarmerStack = createNativeStackNavigator<FarmerStackParamList>();
const SellerStack = createNativeStackNavigator<SellerStackParamList>();
const AdminTab = createBottomTabNavigator();

function AdminTabs() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;

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
        name="AdminInicio"
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
        name="MunicipioList"
        component={MunicipioListScreen}
        options={{
          tabBarLabel: 'Municipios',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="map-outline"
              size={size}
              color={color}
            />
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
              name="account-multiple-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <AdminTab.Screen
        name="FamilyList"
        component={FamilyListScreen}
        options={{
          tabBarLabel: 'Familias',
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
        name="ChatList"
        component={ChatListScreen}
        options={{
          headerShown: true,
          title: 'Chats',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="chat-outline"
              size={size}
              color={color}
            />
          ),
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
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;

  return (
    <BuyerTab.Navigator
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
      <BuyerTab.Screen
        name="Home"
        component={HomeScreen}
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
      <BuyerTab.Screen
        name="Pedidos"
        component={OrderHistoryScreen}
        options={{
          tabBarLabel: 'Pedidos',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="truck-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <BuyerTab.Screen
        name="Catalog"
        component={CatalogScreen}
        options={{
          tabBarLabel: 'Catálogo',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="storefront-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <BuyerTab.Screen
        name="Carrito"
        component={CarritoScreen}
        options={{
          tabBarLabel: 'Carrito',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="cart-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <BuyerTab.Screen
        name="Notificaciones"
        component={NotificationsScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <BuyerTab.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{
          headerShown: true,
          title: 'Chats',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="chat-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </BuyerTab.Navigator>
  );
}

function BuyerNavigator() {
  return (
    <BuyerStack.Navigator screenOptions={{ headerShown: false }}>
      <BuyerStack.Screen name="BuyerTabs" component={BuyerTabs} />
      <BuyerStack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <BuyerStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <BuyerStack.Screen name="Profile" component={ProfileScreen} />
      <BuyerStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: true, title: 'Chat' }}
      />
      <BuyerStack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{ headerShown: true, title: 'Detalle del grupo' }}
      />
    </BuyerStack.Navigator>
  );
}

function FarmerScreens() {
  return (
    <FarmerStack.Navigator screenOptions={{ headerShown: false }}>
      <FarmerStack.Screen name="FarmerHome" component={FarmerHomeScreen} />
      <FarmerStack.Screen name="ProductList" component={ProductListScreen} />
      <FarmerStack.Screen
        name="ProductForm"
        component={ProductFormScreen}
        options={{ presentation: 'transparentModal' }}
      />
      <FarmerStack.Screen
        name="FarmerDashboard"
        component={FarmerDashboardScreen}
      />
      <FarmerStack.Screen
        name="PublicationWizard"
        component={PublicationWizardScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <FarmerStack.Screen name="Profile" component={ProfileScreen} />
      <FarmerStack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ headerShown: true, title: 'Chats' }}
      />
      <FarmerStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: true, title: 'Chat' }}
      />
      <FarmerStack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{ headerShown: true, title: 'Detalle del grupo' }}
      />
      <FarmerStack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ headerShown: true, title: 'Nuevo grupo' }}
      />
      <FarmerStack.Screen
        name="StartChat"
        component={StartChatScreen}
        options={{ headerShown: true, title: 'Iniciar conversación' }}
      />
    </FarmerStack.Navigator>
  );
}

function SellerTabs() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const surface = isDark ? colors.admSurfaceD : colors.surface;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;

  return (
    <SellerTab.Navigator
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
      <SellerTab.Screen
        name="HomeSeller"
        component={HomeSellerScreen}
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
      <SellerTab.Screen
        name="Sales"
        component={SalesScreen}
        options={{
          tabBarLabel: 'Ventas',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="cash-register"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <SellerTab.Screen
        name="Notificaciones"
        component={NotificationsScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <SellerTab.Screen
        name="Perfil"
        component={ProfileSellerScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      <SellerTab.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{
          headerShown: true,
          title: 'Chats',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="chat-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </SellerTab.Navigator>
  );
}

function SellerNavigator() {
  return (
    <SellerStack.Navigator screenOptions={{ headerShown: false }}>
      <SellerStack.Screen name="SellerTabs" component={SellerTabs} />
      <SellerStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: true, title: 'Chat' }}
      />
      <SellerStack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{ headerShown: true, title: 'Detalle del grupo' }}
      />
      <SellerStack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ headerShown: true, title: 'Nuevo grupo' }}
      />
      <SellerStack.Screen
        name="StartChat"
        component={StartChatScreen}
        options={{ headerShown: true, title: 'Iniciar conversación' }}
      />
    </SellerStack.Navigator>
  );
}

function AdminScreens() {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="AdminPanel" component={AdminTabs} />
      <AdminStack.Screen name="AdminProfile" component={AdminProfileScreen} />
      <AdminStack.Screen name="UserForm" component={UserFormScreen} />
      <AdminStack.Screen name="FamilyDetail" component={FamilyDetailScreen} />
      <AdminStack.Screen name="FamilyForm" component={FamilyFormScreen} />
      <AdminStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: true, title: 'Chat' }}
      />
      <AdminStack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{ headerShown: true, title: 'Detalle del grupo' }}
      />
      <AdminStack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ headerShown: true, title: 'Nuevo grupo' }}
      />
      <AdminStack.Screen
        name="StartChat"
        component={StartChatScreen}
        options={{ headerShown: true, title: 'Iniciar conversación' }}
      />
      <AdminStack.Screen name="CategoryTrash" component={CategoryTrashScreen} />
      <AdminStack.Screen name="UnitTrash" component={UnitTrashScreen} />
      <AdminStack.Screen
        name="MunicipioTrash"
        component={MunicipioTrashScreen}
      />
      <AdminStack.Screen name="LocalidadList" component={LocalidadListScreen} />
      <AdminStack.Screen
        name="LocalidadTrash"
        component={LocalidadTrashScreen}
      />
      <AdminStack.Screen
        name="OrderDetail"
        component={AdminOrderDetailScreen}
        options={{ title: 'Detalle del Pedido' }}
      />
      <AdminStack.Screen name="Profile" component={ProfileScreen} />
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
      return <FarmerScreens />;
    case 'seller':
      return <SellerNavigator />;
    case 'admin':
      return <AdminScreens />;
    case 'buyer':
      return <BuyerNavigator />;
    case undefined:
    default:
      return <RoleErrorScreen onLogout={() => void logout()} />;
  }
}
