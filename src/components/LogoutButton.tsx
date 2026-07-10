import React from 'react';
import { Button } from 'react-native-paper';

import { useAuth } from '@/store/AuthContext';

interface LogoutButtonProps {
  readonly mode?:
    'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
  readonly style?: object;
  readonly testID?: string;
}

export default function LogoutButton({
  mode = 'outlined',
  style,
  testID,
}: LogoutButtonProps): React.JSX.Element {
  const { logout } = useAuth();

  return (
    <Button
      mode={mode}
      onPress={() => {
        void logout();
      }}
      style={style}
      {...(testID ? { testID } : {})}
    >
      Cerrar Sesión
    </Button>
  );
}
