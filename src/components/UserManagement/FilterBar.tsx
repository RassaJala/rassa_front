import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { ROLE_FILTERS, STATUS_FILTERS } from '@/constants/roles';

interface FilterBarProps {
  roleFilter: string | null;
  statusFilter: string | null;
  onRoleFilterChange: (value: string | null) => void;
  onStatusFilterChange: (value: string | null) => void;
}

export default function FilterBar({
  roleFilter,
  statusFilter,
  onRoleFilterChange,
  onStatusFilterChange,
}: FilterBarProps): React.JSX.Element {
  return (
    <View className="mx-4 mb-3 rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900 dark:shadow-none">
      {/* Rol filter */}
      <View>
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Rol
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {ROLE_FILTERS.map((opt) => (
            <Pressable
              key={String(opt.value)}
              onPress={() => onRoleFilterChange(opt.value)}
              className={`rounded-full px-3.5 py-1.5 ${
                roleFilter === opt.value
                  ? 'bg-brand-green-forest'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  roleFilter === opt.value
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Divider */}
      <View className="my-3 h-px bg-gray-100 dark:bg-gray-800" />

      {/* Status filter */}
      <View>
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Estado
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {STATUS_FILTERS.map((opt) => (
            <Pressable
              key={String(opt.value)}
              onPress={() => onStatusFilterChange(opt.value)}
              className={`rounded-full px-3.5 py-1.5 ${
                statusFilter === opt.value
                  ? 'bg-brand-green-forest'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  statusFilter === opt.value
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
