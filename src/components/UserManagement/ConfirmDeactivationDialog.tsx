import React from 'react';
import { Text, View } from 'react-native';
import { Button, Dialog, Portal } from 'react-native-paper';

import { colors } from '@/constants/colors';
import type { AdminUser } from '@/types/userManagement';

interface ConfirmDeactivationDialogProps {
  user: AdminUser | null;
  isPending: boolean;
  isSelf: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function ConfirmDeactivationDialog({
  user,
  isPending,
  isSelf,
  onConfirm,
  onDismiss,
}: ConfirmDeactivationDialogProps): React.JSX.Element {
  return (
    <Portal>
      <Dialog visible={user !== null} onDismiss={onDismiss}>
        <Dialog.Title>Confirmar desactivación</Dialog.Title>

        <Dialog.Content>
          {user !== null && (
            <>
              <Text className="text-base text-gray-700 dark:text-gray-300">
                {isSelf
                  ? 'No puedes desactivar tu propia cuenta.'
                  : `¿Estás seguro de desactivar a ${user.nombre}?\n\nEl usuario perderá acceso al sistema hasta que sea reactivado.`}
              </Text>

              {isSelf ? (
                <View className="mt-3 rounded-lg bg-red-50 p-3 dark:bg-red-900/30">
                  <Text className="text-sm text-red-600 dark:text-red-400">
                    Para desactivar tu cuenta necesitarías que otro
                    administrador lo haga.
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </Dialog.Content>

        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={colors.textSecondary}>
            Cancelar
          </Button>
          <Button
            onPress={onConfirm}
            textColor={colors.error}
            disabled={user !== null ? isSelf : true}
            loading={isPending}
          >
            Desactivar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
