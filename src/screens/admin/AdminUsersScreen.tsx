import React from "react";
import { ScrollView, Text, View } from "react-native";

export default function AdminUsersScreen(): React.JSX.Element {
  const users = [
    {
      id: 1,
      name: "Carlos Rodríguez",
      email: "carlos@ejemplo.com",
      role: "Agricultor",
      status: "Activo",
    },
    {
      id: 2,
      name: "María García",
      email: "maria@ejemplo.com",
      role: "Comprador",
      status: "Activo",
    },
    {
      id: 3,
      name: "Juan Pérez",
      email: "juan@ejemplo.com",
      role: "Vendedor",
      status: "Activo",
    },
    {
      id: 4,
      name: "Ana López",
      email: "ana@ejemplo.com",
      role: "Agricultor",
      status: "Inactivo",
    },
    {
      id: 5,
      name: "Luis Martínez",
      email: "luis@ejemplo.com",
      role: "Comprador",
      status: "Activo",
    },
  ];

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "Agricultor":
        return "bg-brand-green-forest/10 text-brand-green-forest";
      case "Comprador":
        return "bg-blue-500/10 text-blue-600";
      case "Vendedor":
        return "bg-brand-red-coral/10 text-brand-red-coral";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      <ScrollView className="flex-1 px-4 py-6">
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-brand-ink dark:text-gray-100">
              RASSA
            </Text>
            <Text className="text-xl font-semibold text-brand-ink dark:text-gray-100">
              Usuarios
            </Text>
          </View>
        </View>

        {/* Table Header */}
        <View className="mb-2 flex-row items-center rounded-xl bg-white p-4 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
          <Text className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Nombre
          </Text>
          <Text className="w-32 text-xs font-medium text-gray-500 dark:text-gray-400">
            Email
          </Text>
          <Text className="w-24 text-xs font-medium text-gray-500 dark:text-gray-400">
            Rol
          </Text>
          <Text className="w-20 text-xs font-medium text-gray-500 dark:text-gray-400">
            Estado
          </Text>
        </View>

        {/* Table Rows */}
        <View className="gap-2">
          {users.map((user) => (
            <View
              key={user.id}
              className="flex-row items-center rounded-xl bg-white p-4 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none"
            >
              <Text className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                {user.name}
              </Text>
              <Text className="w-32 text-sm text-gray-500 dark:text-gray-400">
                {user.email}
              </Text>
              <View className="w-24">
                <Text
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeClass(user.role)}`}
                >
                  {user.role}
                </Text>
              </View>
              <Text className="w-20 text-sm text-gray-500 dark:text-gray-400">
                {user.status}
              </Text>
            </View>
          ))}
        </View>

        <View className="mt-6 flex items-center justify-center space-x-2">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Página 1 de 1
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
