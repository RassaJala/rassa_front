import React from 'react';
import { Pressable, Text } from 'react-native';
import { Button, Dialog, Portal, RadioButton } from 'react-native-paper';

import { colors } from '@/constants/colors';
import { ROLE_OPTIONS } from '@/constants/roles';
import type { AdminUser } from '@/types/userManagement';
import { getFullName } from '@/utils/userManagement';

interface RoleDialogProps {
  user: AdminUser | null;
  selectedRole: string;
  isPending: boolean;
  onRoleChange: (role: string) => void;
  onSave: () => void;
  onDismiss: () => void;
}

export default function RoleDialog({
  user,
  selectedRole,
  isPending,
  onRoleChange,
  onSave,
  onDismiss,
}: RoleDialogProps): React.JSX.Element {
  return (
    <Portal>
      <Dialog visible={user !== null} onDismiss={onDismiss}>
        <Dialog.Title>Cambiar Rol</Dialog.Title>

        <Dialog.Content>
          {user !== null && (
            <>
              <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Usuario:{' '}
                <Text className="font-medium text-gray-800 dark:text-gray-200">
                  {getFullName(user)}
                </Text>
              </Text>

              <RadioButton.Group
                onValueChange={(value: string) => onRoleChange(value)}
                value={selectedRole}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => onRoleChange(opt.value)}
                    className="flex-row items-center py-1.5"
                  >
                    <RadioButton
                      value={opt.value}
                      color={colors.primary}
                      status={
                        selectedRole === opt.value ? 'checked' : 'unchecked'
                      }
                    />
                    <Text
                      className="ml-2 text-base font-medium"
                      style={{ color: opt.color }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </RadioButton.Group>
            </>
          )}
        </Dialog.Content>

        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={colors.textSecondary}>
            Cancelar
          </Button>
          <Button
            onPress={onSave}
            textColor={colors.primary}
            loading={isPending}
          >
            Guardar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
