import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { WIZARD_STEPS } from '@/hooks/usePublicationWizard';

interface WizardBottomActionsProps {
  stepIndex: number;
  isPublishing: boolean;
  isCreating: boolean;
  hasItemErrors: boolean;
  bg: string;
  surface: string;
  border: string;
  fg: string;
  white: string;
  onPrev: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export default function WizardBottomActions({
  stepIndex,
  isPublishing,
  isCreating,
  hasItemErrors,
  bg,
  surface,
  border,
  fg,
  white,
  onPrev,
  onNext,
  onSaveDraft,
  onPublish,
}: WizardBottomActionsProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const coral = colors.brandRedCoral;
  const isMutating = isPublishing || isCreating;

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingBottom: Math.max(insets.bottom, 16),
        paddingTop: 12,
        backgroundColor: bg,
        borderTopWidth: 1,
        borderTopColor: border,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {stepIndex > 0 ? (
          <Pressable
            onPress={onPrev}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: border,
              paddingVertical: 14,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color={fg} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
              Anterior
            </Text>
          </Pressable>
        ) : null}

        {stepIndex < WIZARD_STEPS.length - 1 ? (
          <Pressable
            onPress={onNext}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: border,
              paddingVertical: 14,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
              Siguiente
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color={fg} />
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={onSaveDraft}
              disabled={isMutating}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: border,
                paddingVertical: 14,
                opacity: pressed || isMutating ? 0.5 : 1,
              })}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={fg} />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '600', color: fg }}>
                  Borrador
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={onPublish}
              disabled={isMutating || hasItemErrors}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: coral,
                borderRadius: 14,
                paddingVertical: 14,
                opacity: pressed || isMutating || hasItemErrors ? 0.5 : 1,
              })}
            >
              {isPublishing ? (
                <ActivityIndicator size="small" color={white} />
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '600', color: white }}>
                  Publicar
                </Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
