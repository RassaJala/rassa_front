/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';
import { Text } from 'react-native';

import { render } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import AttachmentPicker from '@/features/chat/components/AttachmentPicker';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

describe('AttachmentPicker', () => {
  it('renders children without crashing', () => {
    const { getByText } = render(
      <AttachmentPicker onSelected={jest.fn()}>
        <Text testID="trigger">Pick</Text>
      </AttachmentPicker>,
    );
    expect(getByText('Pick')).toBeTruthy();
  });
});
