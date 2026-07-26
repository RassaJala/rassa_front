import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { WizardStep } from '@/hooks/usePublicationWizard';

interface WizardHeaderProps {
  currentStep: WizardStep;
  isMutating: boolean;
  fg: string;
  muted: string;
  surface: string;
  border: string;
  onBack: () => void;
  stepMeta: Record<
    WizardStep,
    { title: string; icon: string; description: string }
  >;
}

export default function WizardHeader({
  currentStep,
  isMutating,
  fg,
  muted,
  surface,
  border,
  onBack,
  stepMeta,
}: WizardHeaderProps): React.JSX.Element {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: '700',
            letterSpacing: -0.3,
            color: fg,
          }}
        >
          {stepMeta[currentStep].title}
        </Text>
        <Text style={{ fontSize: 13, color: muted, marginTop: 2 }}>
          {stepMeta[currentStep].description}
        </Text>
      </View>
      <Pressable
        onPress={onBack}
        disabled={isMutating}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: surface,
          borderWidth: 1,
          borderColor: border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isMutating ? 0.3 : pressed ? 0.6 : 1,
        })}
      >
        <MaterialCommunityIcons name="close" size={22} color={fg} />
      </Pressable>
    </View>
  );
}
