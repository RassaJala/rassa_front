/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, sonarjs/no-duplicate-string -- Test files are less strict */
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

import QuickActionCard from '@/components/farmer/QuickActionCard';

jest.mock('@expo/vector-icons', () => {
  const React = require('react') as typeof import('react');
  const { Text } = require('react-native') as typeof import('react-native');
  return {
    MaterialCommunityIcons: (props: { name: string; color?: string }) =>
      React.createElement(Text, null, `icon:${props.name}`),
  };
});

describe('QuickActionCard', () => {
  const defaultProps = {
    icon: 'plus-circle',
    title: 'Nuevo producto',
    description: 'Agregá un producto nuevo a tu catálogo',
    iconBg: '#E3F2FD',
    iconColor: '#1565C0',
    isDark: false,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and description', () => {
    const { getByText } = render(
      React.createElement(QuickActionCard, defaultProps),
    );
    expect(getByText('Nuevo producto')).toBeTruthy();
    expect(getByText('Agregá un producto nuevo a tu catálogo')).toBeTruthy();
  });

  it('renders icon', () => {
    const { getByText } = render(
      React.createElement(QuickActionCard, defaultProps),
    );
    expect(getByText('icon:plus-circle')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      React.createElement(QuickActionCard, { ...defaultProps, onPress }),
    );
    fireEvent.press(getByText('Nuevo producto'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
