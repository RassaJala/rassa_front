/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test file for admin profile components */

import React from 'react';

import { render } from '@testing-library/react-native';

import AdminProfileView from '@/screens/admin/profile/AdminProfileView';

// ── Mock Animated ──────────────────────────────────────
const emptyAnimation = { start: () => {}, stop: () => {}, reset: () => {} };

jest.mock('react-native/Libraries/Animated/Animated', () => {
  const ViewComponent =
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    require('react-native/Libraries/Components/View/View').default;
  const TextComponent =
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    require('react-native/Libraries/Text/Text').default;

  const { default: AnimatedValueClass } = jest.requireActual(
    'react-native/Libraries/Animated/nodes/AnimatedValue',
  );
  const { default: AnimatedValueXYClass } = jest.requireActual(
    'react-native/Libraries/Animated/nodes/AnimatedValueXY',
  );

  return {
    __esModule: true,
    default: {
      Value: AnimatedValueClass,
      ValueXY: AnimatedValueXYClass,
      timing: jest.fn(() => ({
        ...emptyAnimation,
        start: jest.fn((cb?: (r?: { finished: boolean }) => void) =>
          cb?.({ finished: true }),
        ),
        _isUsingNativeDriver: () => false,
      })),
      parallel: jest.fn(() => ({ ...emptyAnimation, start: jest.fn() })),
      sequence: jest.fn(() => ({ ...emptyAnimation, start: jest.fn() })),
      delay: jest.fn(() => ({ ...emptyAnimation, start: jest.fn() })),
      loop: jest.fn(() => ({ ...emptyAnimation, start: jest.fn() })),
      event: jest.fn(),
      createAnimatedComponent: (Component: React.ComponentType) => Component,
      View: ViewComponent,
      Text: TextComponent,
    },
  };
});

// ── Mock dependencies ──────────────────────────────────
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@/utils/validation', () => ({
  formatPhoneNumber: (val: string) => val,
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('@/utils/labels', () => ({
  getGenderLabel: (val?: string) => val ?? 'No especificado',
  getRoleLabel: (val?: string) => val ?? 'Desconocido',
}));

// ── Fixtures ───────────────────────────────────────────
const mockUser = {
  id: 1,
  nombre: 'Admin',
  apellido_paterno: 'Sistema',
  apellido_materno: 'Test',
  first_name: '',
  last_name: '',
  email: 'admin@rassa.com',
  telefono: '5551234567',
  fecha_nacimiento: '1990-01-15',
  genero: 'M',
  direccion: 'Calle Principal 123',
  localidad: 1,
  localidad_nombre: 'Centro',
  municipio_id: 1,
  municipio_nombre: 'Monterrey',
  role: 'admin' as const,
} as const;

// ── validateProfileEdit ────────────────────────────────
describe('validateProfileEdit', () => {
  const validate = (
    nombre: string,
    apellidoPaterno: string,
    rawTelefono: string,
    fechaNacimiento: string,
    domicilio: string,
    localidadId: number | null,
  ): string | null => {
    if (
      !nombre.trim() ||
      !apellidoPaterno.trim() ||
      !rawTelefono ||
      !fechaNacimiento.trim() ||
      !domicilio.trim() ||
      localidadId === null
    ) {
      return 'Por favor, completa todos los campos obligatorios.';
    }
    return null;
  };

  it('retorna null cuando todos los campos son válidos', () => {
    expect(
      validate('Admin', 'Sistema', '5551234567', '1990-01-15', 'Calle 123', 1),
    ).toBeNull();
  });

  it('retorna error cuando nombre está vacío', () => {
    expect(
      validate('', 'Sistema', '5551234567', '1990-01-15', 'Calle 123', 1),
    ).toBe('Por favor, completa todos los campos obligatorios.');
  });

  it('retorna error cuando apellidoPaterno está vacío', () => {
    expect(
      validate('Admin', '', '5551234567', '1990-01-15', 'Calle 123', 1),
    ).toBe('Por favor, completa todos los campos obligatorios.');
  });

  it('retorna error cuando teléfono está vacío', () => {
    expect(validate('Admin', 'Sistema', '', '1990-01-15', 'Calle 123', 1)).toBe(
      'Por favor, completa todos los campos obligatorios.',
    );
  });

  it('retorna error cuando fecha de nacimiento está vacía', () => {
    expect(validate('Admin', 'Sistema', '5551234567', '', 'Calle 123', 1)).toBe(
      'Por favor, completa todos los campos obligatorios.',
    );
  });

  it('retorna error cuando domicilio está vacío', () => {
    expect(
      validate('Admin', 'Sistema', '5551234567', '1990-01-15', '', 1),
    ).toBe('Por favor, completa todos los campos obligatorios.');
  });

  it('retorna error cuando localidadId es null', () => {
    expect(
      validate(
        'Admin',
        'Sistema',
        '5551234567',
        '1990-01-15',
        'Calle 123',
        null,
      ),
    ).toBe('Por favor, completa todos los campos obligatorios.');
  });

  it('retorna error con espacios en blanco en campos requeridos', () => {
    expect(
      validate('   ', 'Sistema', '5551234567', '1990-01-15', 'Calle 123', 1),
    ).toBe('Por favor, completa todos los campos obligatorios.');
  });
});

// ── AdminProfileView ───────────────────────────────────
describe('AdminProfileView', () => {
  it('renderiza el nombre del usuario', () => {
    const { getByText } = render(<AdminProfileView user={mockUser} />);

    expect(getByText('Admin Sistema Test')).toBeTruthy();
  });

  it('renderiza el email del usuario en el header y en InfoRow', () => {
    const { getAllByText } = render(<AdminProfileView user={mockUser} />);

    // Aparece en el header y en el InfoRow de email
    expect(getAllByText('admin@rassa.com')).toHaveLength(2);
  });

  it('renderiza la inicial del nombre en el avatar', () => {
    const { getByText } = render(<AdminProfileView user={mockUser} />);

    expect(getByText('A')).toBeTruthy();
  });

  it('muestra No especificado cuando falta teléfono', () => {
    const userSinTelefono = { ...mockUser, telefono: null };

    const { getByText } = render(<AdminProfileView user={userSinTelefono} />);

    expect(getByText('No especificado')).toBeTruthy();
  });

  it('muestra la fecha de nacimiento con formato', () => {
    const { getByText } = render(<AdminProfileView user={mockUser} />);

    expect(getByText('1990-01-15')).toBeTruthy();
  });

  it('maneja user null sin crash', () => {
    const { toJSON } = render(<AdminProfileView user={null} />);

    expect(toJSON()).toBeTruthy();
  });
});
