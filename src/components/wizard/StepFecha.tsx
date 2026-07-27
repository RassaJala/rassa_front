import React from 'react';
import { Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { getWeekNumber } from '@/utils/date';

interface StepFechaProps {
  nextMondayDate: Date;
  accentBg: string;
  brand: string;
  fg: string;
  muted: string;
  surface: string;
  border: string;
  subtleBg: string;
}

export default function StepFecha({
  nextMondayDate,
  accentBg,
  brand,
  fg,
  muted,
  surface,
  border,
  subtleBg,
}: StepFechaProps): React.JSX.Element {
  const weekNumber = getWeekNumber(nextMondayDate);

  return (
    <View
      style={{
        backgroundColor: surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        padding: 20,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: accentBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="calendar" size={24} color={brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: fg }}>
            Fecha de publicación
          </Text>
          <Text style={{ fontSize: 13, color: muted }}>
            Se asigna automáticamente
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: subtleBg,
          borderRadius: 12,
          padding: 16,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: fg,
            marginBottom: 4,
          }}
        >
          {nextMondayDate.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
        <Text style={{ fontSize: 13, color: muted }}>Semana {weekNumber}</Text>
      </View>
    </View>
  );
}
