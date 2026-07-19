import React from 'react';
import { Pressable, Text } from 'react-native';
import { Button, Dialog, Portal, RadioButton } from 'react-native-paper';

import { colors } from '@/constants/colors';
import { ROLE_OPTIONS } from '@/constants/roles';
import { useTheme } from '@/store/ThemeContext';
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
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const gray500 = isDark ? '#9CA3AF' : '#6B7280';
  const gray800 = isDark ? '#E5E7EB' : '#1F2937';

  return (
    <Portal>
      <Dialog visible={user !== null} onDismiss={onDismiss}>
        <Dialog.Title>Cambiar Rol</Dialog.Title>

        <Dialog.Content>
          {user !== null && (
            <>
              <Text
                style={{
                  marginBottom: 16,
                  fontSize: 13,
                  color: gray500,
                }}
              >
                Usuario:{' '}
                <Text
                  style={{
                    fontWeight: '500',
                    color: gray800,
                  }}
                >
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
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 6,
                    }}
                  >
                    <RadioButton
                      value={opt.value}
                      color={colors.primary}
                      status={
                        selectedRole === opt.value ? 'checked' : 'unchecked'
                      }
                    />
                    <Text
                      style={{
                        marginLeft: 8,
                        fontSize: 15,
                        fontWeight: '500',
                        color: opt.color,
                      }}
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
