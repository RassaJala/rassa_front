import React from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import type { FarmerTheme } from '@/constants/theme';
import type { User } from '@/types';

interface FarmerDrawerProps {
  isOpen: boolean;
  isDark: boolean;
  user: User | null;
  slideAnim: Animated.Value;
  screenWidth: number;
  drawerWidthRatio: number;
  theme: FarmerTheme;
  menuItems: Array<{
    icon: string;
    label: string;
    desc: string;
    color: string;
    action: () => void;
  }>;
  onClose: () => void;
}

const DRAWER_BG_LIGHT = '#FFFFFF';
const DRAWER_BG_DARK = '#1A211B';
const DRAWER_BORDER_LIGHT = '#E8ECE4';

export default function FarmerDrawer({
  isOpen,
  isDark,
  user,
  slideAnim,
  screenWidth,
  drawerWidthRatio,
  theme,
  menuItems,
  onClose,
}: FarmerDrawerProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const drawerBg = isDark ? DRAWER_BG_DARK : DRAWER_BG_LIGHT;
  const sidebarBorder = isDark ? theme.border : DRAWER_BORDER_LIGHT;

  const drawerTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth * drawerWidthRatio, 0],
  });

  const overlayOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  return (
    <>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          right: 0,
          opacity: overlayOpacity,
          backgroundColor: colors.shadow,
          zIndex: 10,
        }}
      >
        <Pressable onPress={onClose} style={{ flex: 1 }} />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: `${drawerWidthRatio * 100}%`,
          backgroundColor: drawerBg,
          transform: [{ translateX: drawerTranslate }],
          borderLeftWidth: 1,
          borderLeftColor: sidebarBorder,
          zIndex: 11,
        }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View
            style={{
              alignItems: 'center',
              paddingTop: 60,
              paddingHorizontal: 20,
              paddingBottom: 24,
              marginBottom: 20,
              borderBottomWidth: 1,
              borderBottomColor: sidebarBorder,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: theme.accentBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <MaterialCommunityIcons
                name="account-circle"
                size={40}
                color={theme.brand}
              />
            </View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '700',
                color: theme.fg,
                letterSpacing: -0.2,
              }}
            >
              {user?.nombre ?? 'Agricultor'}
            </Text>
            <Text style={{ fontSize: 15, color: theme.muted, marginTop: 4 }}>
              {user?.email ?? ''}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 16, gap: 6 }}>
            {menuItems.map((item, i) => {
              const isLast = i === menuItems.length - 1;
              return (
                <Pressable
                  key={i}
                  onPress={item.action}
                  style={({ pressed }) => ({
                    backgroundColor: isLast
                      ? (isDark
                        ? 'rgba(222,57,58,0.1)'
                        : 'rgba(222,57,58,0.07)')
                      : (isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.03)'),
                    borderRadius: 16,
                    borderWidth: isLast ? 1 : 0,
                    borderColor: isLast
                      ? (isDark
                        ? 'rgba(222,57,58,0.25)'
                        : 'rgba(222,57,58,0.15)')
                      : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      minHeight: 56,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={
                        item.icon as keyof typeof MaterialCommunityIcons.glyphMap
                      }
                      size={28}
                      color={item.color}
                    />
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: '600',
                        color: item.color,
                        letterSpacing: -0.15,
                        flexShrink: 1,
                      }}
                    >
                      {item.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </Animated.View>
    </>
  );
}
