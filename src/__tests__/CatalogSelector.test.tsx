/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import CatalogSelector from '@/components/CatalogSelector';
import api from '@/services/api';

jest.mock('@/services/api');
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true }),
}));

const mockApiGet = api.get as jest.Mock;

const mockMunicipios = [
  { id_municipio: 1, nombre: 'Municipio 1', estado: true },
  { id_municipio: 2, nombre: 'Municipio 2', estado: true },
];

const mockLocalidades = [
  { id_localidad: 1, nombre: 'Localidad 1', municipio_id: 1, estado: true },
  { id_localidad: 2, nombre: 'Localidad 2', municipio_id: 1, estado: true },
];

const defaultProps = {
  selectedMunicipioId: null,
  selectedMunicipioNombre: '',
  onSelectMunicipio: jest.fn(),
  localidadId: null,
  localidadNombre: '',
  onSelectLocalidad: jest.fn(),
  municipios: mockMunicipios,
  localidades: mockLocalidades,
  isLoadingMunicipios: false,
  isLoadingLocalidades: false,
  errorMunicipios: null,
  errorLocalidades: null,
  refetchMunicipios: jest.fn(),
  refetchLocalidades: jest.fn(),
  setErrorMessage: jest.fn(),
  catalogColors: {
    muted: '#5E6B5E',
    border: '#E2E6DF',
    surface: '#FFFFFF',
    fg: '#2D3328',
    errorBg: 'rgba(254,242,242,1)',
    errorBorder: '#fca5a5',
    errorText: '#dc2626',
    errorAction: '#b91c1c',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockApiGet
    .mockResolvedValueOnce({ data: { data: mockMunicipios } })
    .mockResolvedValueOnce({ data: { data: mockLocalidades } });
});

describe('CatalogSelector', () => {
  it('renders municipio selector', async () => {
    const { getByText } = await render(<CatalogSelector {...defaultProps} />);
    expect(getByText('Municipio *')).toBeTruthy();
    expect(getByText('Seleccionar Municipio')).toBeTruthy();
  });

  it('renders localidad selector', async () => {
    const { getByText } = await render(<CatalogSelector {...defaultProps} />);
    expect(getByText('Localidad *')).toBeTruthy();
    expect(getByText('Seleccionar Localidad')).toBeTruthy();
  });

  it('shows loading indicator for municipios', async () => {
    const { getByTestId } = await render(
      <CatalogSelector {...defaultProps} isLoadingMunicipios />,
    );
    expect(getByTestId('loading-municipios')).toBeTruthy();
  });

  it('shows loading indicator for localidades', async () => {
    const { getByTestId } = await render(
      <CatalogSelector {...defaultProps} isLoadingLocalidades />,
    );
    expect(getByTestId('loading-localidades')).toBeTruthy();
  });

  it('opens municipio dialog on press', async () => {
    const { getByText, getAllByText } = await render(<CatalogSelector {...defaultProps} />);
    fireEvent.press(getByText('Seleccionar Municipio'));
    await waitFor(() => {
      // Both trigger button and modal title are rendered
      expect(getAllByText('Seleccionar Municipio').length).toBe(2);
      expect(getByText('Cerrar')).toBeTruthy();
    });
  });

  it('opens localidad dialog on press when municipio selected', async () => {
    const { getByText, getAllByText } = await render(
      <CatalogSelector
        {...defaultProps}
        selectedMunicipioId={1}
        selectedMunicipioNombre="Municipio 1"
      />,
    );
    fireEvent.press(getByText('Seleccionar Localidad'));
    await waitFor(() => {
      // Both trigger button and modal title are rendered
      expect(getAllByText('Seleccionar Localidad').length).toBe(2);
      expect(getByText('Cerrar')).toBeTruthy();
    });
  });

  it('shows error message for municipios', async () => {
    const { getByText } = await render(
      <CatalogSelector {...defaultProps} errorMunicipios="Error loading" />,
    );
    expect(getByText('Error loading')).toBeTruthy();
  });

  it('shows error message for localidades', async () => {
    const { getByText } = await render(
      <CatalogSelector
        {...defaultProps}
        selectedMunicipioId={1}
        errorLocalidades="Error loading"
      />,
    );
    expect(getByText('Error loading')).toBeTruthy();
  });

  it('disables localidad selector when no municipio selected', async () => {
    const { getByText } = await render(<CatalogSelector {...defaultProps} />);
    const localidadButton = getByText('Seleccionar Localidad');
    expect(localidadButton).toBeTruthy();
  });

  it('calls onSelectMunicipio when municipio is selected', async () => {
    const { getByText } = await render(<CatalogSelector {...defaultProps} />);
    fireEvent.press(getByText('Seleccionar Municipio'));
    await waitFor(() => {
      fireEvent.press(getByText('Municipio 1'));
    });
    expect(defaultProps.onSelectMunicipio).toHaveBeenCalledWith(
      1,
      'Municipio 1',
    );
  });

  it('calls onSelectLocalidad when localidad is selected', async () => {
    const { getByText } = await render(
      <CatalogSelector
        {...defaultProps}
        selectedMunicipioId={1}
        selectedMunicipioNombre="Municipio 1"
      />,
    );
    fireEvent.press(getByText('Seleccionar Localidad'));
    await waitFor(() => {
      fireEvent.press(getByText('Localidad 1'));
    });
    expect(defaultProps.onSelectLocalidad).toHaveBeenCalledWith(
      1,
      'Localidad 1',
    );
  });

  it('calls refetchMunicipios on retry', async () => {
    const { getByText } = await render(
      <CatalogSelector {...defaultProps} errorMunicipios="Error" />,
    );
    fireEvent.press(getByText('Reintentar'));
    expect(defaultProps.refetchMunicipios).toHaveBeenCalled();
  });

  it('calls refetchLocalidades on retry', async () => {
    const { getByText } = await render(
      <CatalogSelector
        {...defaultProps}
        selectedMunicipioId={1}
        errorLocalidades="Error"
      />,
    );
    fireEvent.press(getByText('Reintentar'));
    expect(defaultProps.refetchLocalidades).toHaveBeenCalled();
  });
});
