import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import type { User } from '@/types';
import { getRoleLabel } from '@/utils/labels';

import ProfileAvatar from './ProfileAvatar';
import type { ProfileColors } from './profileColors';

interface ProfileHeaderProps {
  readonly user: User | null;
  readonly colors: ProfileColors;
  readonly avatarSize?: number;
  readonly children?: ReactNode;
  readonly paddingVertical?: number;
}

export default function ProfileHeader({
  user,
  colors: c,
  avatarSize = 72,
  children,
  paddingVertical = 28,
}: ProfileHeaderProps): React.JSX.Element {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        paddingVertical,
        paddingHorizontal: 20,
        marginBottom: 16,
      }}
    >
      <View style={{ marginBottom: avatarSize > 64 ? 14 : 10 }}>
        <ProfileAvatar name={user?.nombre} size={avatarSize} colors={c} />
      </View>
      {children}
      <View
        style={{
          marginTop: children ? 8 : 12,
          backgroundColor: c.accentBg,
          paddingHorizontal: children ? 12 : 14,
          paddingVertical: children ? 4 : 6,
          borderRadius: 20,
        }}
      >
        <Text
          style={{
            fontSize: children ? 12 : 13,
            fontWeight: '700',
            color: c.brand,
          }}
        >
          {getRoleLabel(user?.role)}
        </Text>
      </View>
    </View>
  );
}
