/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, sonarjs/no-duplicate-string -- Test files are less strict */
import React from 'react';

import { render } from '@testing-library/react-native';

import StatCard from '@/components/farmer/StatCard';

jest.mock('@expo/vector-icons', () => {
  const React = require('react') as typeof import('react');
  const { Text } = require('react-native') as typeof import('react-native');
  return {
    MaterialCommunityIcons: (props: { name: string; color?: string }) =>
      React.createElement(Text, null, `icon:${props.name}`),
  };
});

describe('StatCard', () => {
  const defaultProps = {
    icon: 'package-variant',
    value: 12,
    label: 'Productos',
    iconBg: '#E8F5E9',
    iconColor: '#2E7D32',
    valueColor: '#1B5E20',
    isCompact: false,
    isDark: false,
  };

  it('renders value and label', () => {
    const { getByText } = render(React.createElement(StatCard, defaultProps));
    expect(getByText('12')).toBeTruthy();
    expect(getByText('Productos')).toBeTruthy();
  });

  it('renders icon name', () => {
    const { getByText } = render(React.createElement(StatCard, defaultProps));
    expect(getByText('icon:package-variant')).toBeTruthy();
  });

  it('renders with string value', () => {
    const { getByText } = render(
      React.createElement(StatCard, { ...defaultProps, value: '$1,500' }),
    );
    expect(getByText('$1,500')).toBeTruthy();
  });
});
