import React from 'react';
import { Text, View } from 'react-native';
import { Button, Dialog, Portal } from 'react-native-paper';

import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';
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
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const gray700 = isDark ? '#D1D5DB' : '#374151';
  const red50 = isDark ? 'rgba(127,29,29,0.3)' : '#FEF2F2';
  const red600 = isDark ? '#FCA5A5' : '#DC2626';

  return (
    <Portal>
      <Dialog visible={user !== null} onDismiss={onDismiss}>
        <Dialog.Title>Confirmar desactivación</Dialog.Title>

        <Dialog.Content>
          {user !== null && (
            <>
              <Text
                style={{
                  fontSize: 15,
                  color: gray700,
                }}
              >
                {isSelf
                  ? 'No puedes desactivar tu propia cuenta.'
                  : `¿Estás seguro de desactivar a ${user.nombre}?\n\nEl usuario perderá acceso al sistema hasta que sea reactivado.`}
              </Text>

              {isSelf ? (
                <View
                  style={{
                    marginTop: 12,
                    borderRadius: 8,
                    backgroundColor: red50,
                    padding: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: red600,
                    }}
                  >
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
