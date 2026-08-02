import { Text, View } from 'react-native';

import type { ProfileColors } from './profileColors';

interface ProfileAvatarProps {
  readonly name: string | undefined | null;
  readonly size: number;
  readonly colors: ProfileColors;
}

export default function ProfileAvatar({
  name,
  size,
  colors: c,
}: ProfileAvatarProps): React.JSX.Element {
  const initial = name?.trim() ? name.charAt(0).toUpperCase() : 'A';
  const fontSize = Math.round(size * 0.44);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.accentBg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize, fontWeight: '700', color: c.brand }}>
        {initial}
      </Text>
    </View>
  );
}
