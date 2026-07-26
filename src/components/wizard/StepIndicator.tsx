import React from 'react';
import { Pressable, View } from 'react-native';

import { themeColors } from '@/constants/colors';
import { WIZARD_STEPS } from '@/hooks/usePublicationWizard';
import type { WizardStep } from '@/hooks/usePublicationWizard';

interface StepIndicatorProps {
  stepIndex: number;
  isDark: boolean;
  brand: string;
  onStepPress: (step: WizardStep) => void;
}

export default function StepIndicator({
  stepIndex,
  isDark,
  brand,
  onStepPress,
}: StepIndicatorProps): React.JSX.Element {
  const shadowBg = themeColors(isDark).shadowBg;
  return (
    <View
      style={{
        flexDirection: 'row',
        marginBottom: 24,
        gap: 6,
      }}
    >
      {WIZARD_STEPS.map((step, i) => {
        const isActive = i === stepIndex;
        const isDone = i < stepIndex;
        return (
          <Pressable
            key={step}
            onPress={() => onStepPress(step)}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: isActive ? brand : (isDone ? brand : shadowBg),
              opacity: isDone && !isActive ? 0.5 : 1,
            }}
          />
        );
      })}
    </View>
  );
}
