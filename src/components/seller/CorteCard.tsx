import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CorteCardProps {
  readonly onPress: () => void;
  readonly surface: string;
  readonly border: string;
  readonly fg: string;
  readonly muted: string;
  readonly brand: string;
  readonly accentBg: string;
}

export default function CorteCard({
  onPress,
  surface,
  border,
  fg,
  muted,
  brand,
  accentBg,
}: CorteCardProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: border,
        padding: 16,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: accentBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons name="cash-register" size={22} color={brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: fg }}>
          Corte de caja
        </Text>
        <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
          Registrar arqueo y ver historial
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={muted} />
    </Pressable>
  );
}
