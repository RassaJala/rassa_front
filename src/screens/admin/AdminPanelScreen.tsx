import React from 'react';
import { Text, View } from 'react-native';

export default function AdminPanelScreen(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <Text className="text-center text-lg text-gray-500 dark:text-gray-400">
        Bienvenido al panel de administración.{'\n'}Usa la barra de navegación
        superior para acceder a las secciones.
      </Text>
    </View>
  );
}
