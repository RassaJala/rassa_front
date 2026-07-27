import { Text, View } from 'react-native';

import type { ProfileColors } from './profileColors';

interface FeedbackBannerProps {
  readonly type: 'success' | 'error';
  readonly message: string | null;
  readonly colors: ProfileColors;
  readonly marginTop?: number;
  readonly marginBottom?: number;
}

export default function FeedbackBanner({
  type,
  message,
  colors: c,
  marginTop = 0,
  marginBottom = 16,
}: FeedbackBannerProps): React.JSX.Element | null {
  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <View
      style={{
        marginTop,
        marginBottom,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isSuccess ? c.brand : c.errorColor,
        backgroundColor: isSuccess ? c.accentBg : c.errorBg,
        padding: 14,
      }}
    >
      <Text
        style={{
          textAlign: 'center',
          fontSize: 14,
          fontWeight: '600',
          color: isSuccess ? c.brand : c.errorColor,
        }}
      >
        {message}
      </Text>
    </View>
  );
}
