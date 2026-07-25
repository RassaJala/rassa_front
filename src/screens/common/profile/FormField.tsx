import { Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';

import type { ProfileColors } from './profileColors';

interface FormFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (val: string) => void;
  readonly placeholder: string;
  readonly maxLength: number;
  readonly required?: boolean;
  readonly keyboardType?: 'default' | 'phone-pad';
  readonly secureTextEntry?: boolean;
  readonly colors: ProfileColors;
}

export default function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  required = false,
  keyboardType = 'default',
  secureTextEntry = false,
  colors: c,
}: FormFieldProps): React.JSX.Element {
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
        {label} {required ? '*' : ''}
      </Text>
      <TextInput
        mode="outlined"
        placeholder={placeholder}
        placeholderTextColor={c.placeholderColor}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={{ marginBottom: 14, backgroundColor: c.inputBg }}
        theme={c.textInputTheme}
      />
    </>
  );
}
