/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';

import { FarmerPickerModal } from '@/components/admin/settlements/FarmerPickerModal';
import type { AdminPalette } from '@/components/admin/merma/colors';
import type { FarmerOption } from '@/services/settlements';

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

const palette: AdminPalette = {
  surface: '#ffffff',
  fg: '#111111',
  muted: '#666666',
  border: '#e0e0e0',
  brand: '#DE393A',
  bg: '#f5f5f5',
  segBg: '#fef2f2',
  coral: '#DE393A',
};

const farmer: FarmerOption = {
  id_usuario: 4,
  nombre: 'Ana Ramírez',
};

function renderPicker(overrides?: {
  farmers?: FarmerOption[];
  isError?: boolean;
  onRetry?: () => void;
}) {
  return render(
    <FarmerPickerModal
      visible
      onClose={jest.fn()}
      onSelect={jest.fn()}
      selectedId={undefined}
      farmers={overrides?.farmers ?? []}
      isError={overrides?.isError ?? false}
      onRetry={overrides?.onRetry ?? jest.fn()}
      palette={palette}
    />,
  );
}

describe('FarmerPickerModal', () => {
  it('lists the farmers plus the "Todos los agricultores" option', () => {
    const { getByText, getByPlaceholderText } = renderPicker({
      farmers: [farmer],
    });

    expect(getByText('Todos los agricultores')).toBeTruthy();
    expect(getByText('Ana Ramírez')).toBeTruthy();
    expect(getByPlaceholderText('Buscar agricultor...')).toBeTruthy();
  });

  it('shows an error block with a retry action when the fetch failed with no data', () => {
    const onRetry = jest.fn();
    const { getByText, getByTestId } = renderPicker({
      isError: true,
      onRetry,
    });

    expect(getByText('No se pudieron cargar los agricultores')).toBeTruthy();

    fireEvent.press(getByTestId('farmer-picker-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps showing the list when there is an error but stale data exists', () => {
    const { getByText, queryByText, queryByTestId } = renderPicker({
      farmers: [farmer],
      isError: true,
    });

    // Stale farmers are better than an error block.
    expect(getByText('Ana Ramírez')).toBeTruthy();
    expect(queryByText('No se pudieron cargar los agricultores')).toBeNull();
    expect(queryByTestId('farmer-picker-retry')).toBeNull();
  });

  it('does not show the error block when there are simply no farmers', () => {
    const { getByText, queryByTestId } = renderPicker({ isError: false });

    expect(getByText('Todos los agricultores')).toBeTruthy();
    expect(queryByTestId('farmer-picker-retry')).toBeNull();
  });
});
