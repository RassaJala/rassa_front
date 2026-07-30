import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

import { BRAND_RED_CORAL } from '@/constants/brandColors';

export interface ProfilePasswordTabProps {
  readonly isSubmitting: boolean;
  readonly oldPassword: string;
  readonly setOldPassword: (val: string) => void;
  readonly newPassword: string;
  readonly setNewPassword: (val: string) => void;
  readonly confirmPassword: string;
  readonly setConfirmPassword: (val: string) => void;
  readonly handleChangePassword: () => void;
}

export default function ProfilePasswordTab({
  isSubmitting,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  handleChangePassword,
}: ProfilePasswordTabProps): React.JSX.Element {
  return (
    <View className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <Text className="text-brand-ink mb-4 border-b border-gray-200 pb-2 text-lg font-bold dark:border-gray-800 dark:text-gray-100">
        Cambiar Contraseña
      </Text>

      <TextInput
        testID="old-password-input"
        mode="outlined"
        label="Contraseña Actual *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="••••••••"
        secureTextEntry
        value={oldPassword}
        onChangeText={setOldPassword}
      />

      <TextInput
        testID="new-password-input"
        mode="outlined"
        label="Nueva Contraseña (mínimo 8 caracteres) *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="••••••••"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <TextInput
        testID="confirm-password-input"
        mode="outlined"
        label="Confirmar Nueva Contraseña *"
        className="mb-4 bg-white dark:bg-gray-900"
        placeholder="••••••••"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <Button
        testID="change-password-button"
        mode="contained"
        disabled={isSubmitting}
        onPress={handleChangePassword}
        buttonColor={BRAND_RED_CORAL}
        className="mt-4 rounded-lg"
        contentStyle={styles.buttonContent}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          'Cambiar Contraseña'
        )}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContent: {
    paddingVertical: 6,
  },
});
