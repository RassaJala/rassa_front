import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { ProfileColors } from './profileColors';

interface CatalogSelectorProps {
  readonly label: string;
  readonly icon: string;
  readonly value: string;
  readonly placeholder: string;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly disabled?: boolean;
  readonly onPress: () => void;
  readonly onRetry?: () => void;
  readonly colors: ProfileColors;
}

export default function CatalogSelector({
  label,
  icon,
  value,
  placeholder,
  isLoading,
  error,
  disabled = false,
  onPress,
  onRetry,
  colors: c,
}: CatalogSelectorProps): React.JSX.Element {
  return (
    <>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: c.muted,
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: 0.04,
        }}
      >
        {label} *
      </Text>
      {error ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.errorColor,
            backgroundColor: c.errorBg,
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontSize: 14, color: c.errorColor, flex: 1 }}>
            {error}
          </Text>
          {onRetry ? (
            <TouchableOpacity onPress={() => void onRetry()}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: c.errorColor,
                }}
              >
                Reintentar
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled || isLoading}
          style={{
            marginBottom: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.inputBg,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={c.brand} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={20}
                color={c.muted}
                style={{ marginRight: 10 }}
              />
              <Text
                style={{
                  fontSize: 16,
                  color: value ? c.inputText : c.placeholderColor,
                }}
              >
                {value || placeholder}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </>
  );
}
