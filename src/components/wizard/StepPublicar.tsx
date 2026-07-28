import React from 'react';
import { Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { WizardItemDraft } from '@/hooks/usePublicationWizard';

interface StepPublicarProps {
  items: WizardItemDraft[];
  hasItemErrors: boolean;
  surface: string;
  border: string;
  fg: string;
  muted: string;
  brand: string;
  errorBg: string;
  coral: string;
}

export default function StepPublicar({
  items,
  hasItemErrors,
  surface,
  border,
  fg,
  muted,
  brand,
  errorBg,
  coral,
}: StepPublicarProps): React.JSX.Element {
  return (
    <View>
      <View
        style={{
          backgroundColor: surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: border,
          padding: 20,
          marginBottom: 16,
          alignItems: 'center',
        }}
      >
        <MaterialCommunityIcons name="send-check" size={48} color={brand} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: fg,
            marginTop: 12,
            textAlign: 'center',
          }}
        >
          ¿Listo para publicar?
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: muted,
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          {items.length} {items.length === 1 ? 'producto' : 'productos'} en esta
          publicación
        </Text>

        {hasItemErrors ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
              backgroundColor: errorBg,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={16}
              color={coral}
            />
            <Text style={{ fontSize: 13, color: coral }}>
              Hay errores de validación
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
