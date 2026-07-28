import React from 'react';
import { View } from 'react-native';

import StatCard from '@/components/StatCard';
import type { FarmerTheme } from '@/constants/theme';

interface FarmerStatsProps {
  isCompact: boolean;
  theme: FarmerTheme;
  totalProducts: number;
  activePublications: number;
  totalPublications: number;
}

export default function FarmerStats({
  isCompact,
  theme,
  totalProducts,
  activePublications,
  totalPublications,
}: FarmerStatsProps): React.JSX.Element {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingVertical: 24,
        gap: isCompact ? 8 : 10,
      }}
    >
      <View style={{ flex: 1, minWidth: isCompact ? '45%' : 0 }}>
        <StatCard
          icon="package-variant"
          value={totalProducts}
          label="Productos"
          surface={theme.surface}
          border={theme.border}
          muted={theme.muted}
          iconBg={theme.accentBg}
          iconColor={theme.brand}
        />
      </View>
      <View style={{ flex: 1, minWidth: isCompact ? '45%' : 0 }}>
        <StatCard
          icon="check-circle-outline"
          value={activePublications}
          label="Publicadas"
          surface={theme.surface}
          border={theme.border}
          muted={theme.muted}
          iconBg={theme.coralBg}
          iconColor={theme.coral}
        />
      </View>
      <View style={{ flex: 1, minWidth: isCompact ? '45%' : 0 }}>
        <StatCard
          icon="clipboard-list"
          value={totalPublications}
          label="Total pubs"
          surface={theme.surface}
          border={theme.border}
          muted={theme.muted}
          iconBg={theme.pumpkinBg}
          iconColor={theme.pumpkin}
        />
      </View>
    </View>
  );
}
