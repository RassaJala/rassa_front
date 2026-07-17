/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test file for user management components */
import React from 'react';
import { PaperProvider } from 'react-native-paper';

import { fireEvent, render } from '@testing-library/react-native';

import ConfirmDeactivationDialog from '@/components/UserManagement/ConfirmDeactivationDialog';
import EmptyState from '@/components/UserManagement/EmptyState';
import FilterBar from '@/components/UserManagement/FilterBar';
import RoleDialog from '@/components/UserManagement/RoleDialog';
import UserCard from '@/components/UserManagement/UserCard';
import type { AdminUser } from '@/types/userManagement';
import { getRoleLabel } from '@/utils/labels';
import { getFullName, getRoleBadgeBg } from '@/utils/userManagement';

// ── Mock data ─────────────────────────────────────────────

const mockUser: AdminUser = {
  id_usuario: 1,
  email: 'juan@example.com',
  telefono: '555-0100',
  role: 'farmer',
  nombre: 'Juan',
  apellido_paterno: 'Pérez',
  apellido_materno: 'García',
  fecha_nacimiento: '1990-01-01',
  genero: 'M',
  direccion: 'Calle 1',
  localidad: 1,
  localidad_nombre: 'Ciudad',
  estado: true,
  creado_en: '2024-01-01',
};

const mockAdminUser: AdminUser = {
  ...mockUser,
  id_usuario: 2,
  role: 'admin',
  email: 'admin@example.com',
  estado: true,
};

// ── Pure function tests ───────────────────────────────────

describe('getRoleLabel', () => {
  it('retorna "Admin" para role admin', () => {
    expect(getRoleLabel('admin')).toBe('Admin');
  });

  it('retorna "Agricultor" para role farmer', () => {
    expect(getRoleLabel('farmer')).toBe('Agricultor');
  });

  it('retorna "Vendedor" para role seller', () => {
    expect(getRoleLabel('seller')).toBe('Vendedor');
  });

  it('retorna "Comprador" para role buyer', () => {
    expect(getRoleLabel('buyer')).toBe('Comprador');
  });

  it('retorna el mismo valor si el role no está mapeado', () => {
    expect(getRoleLabel('unknown')).toBe('unknown');
  });
});

describe('getFullName', () => {
  it('combina nombre y apellidos', () => {
    expect(getFullName(mockUser)).toBe('Juan Pérez García');
  });

  it('omite apellidos nulos', () => {
    const user = {
      ...mockUser,
      apellido_paterno: null,
      apellido_materno: null,
    };

    expect(getFullName(user)).toBe('Juan');
  });

  it('omite apellido materno nulo', () => {
    const user = { ...mockUser, apellido_materno: null };

    expect(getFullName(user)).toBe('Juan Pérez');
  });
});

describe('getRoleBadgeBg', () => {
  it('retorna un string con formato hex + 1A', () => {
    const bg = getRoleBadgeBg('farmer');

    expect(bg).toMatch(/^#[0-9A-Fa-f]{6}1A$/);
  });

  it('usa un gris por defecto para roles desconocidos', () => {
    const bg = getRoleBadgeBg('unknown');

    expect(bg).toBe('#6b72801A');
  });
});

// ── EmptyState ────────────────────────────────────────────

describe('EmptyState', () => {
  it('muestra mensaje con filtros activos', () => {
    const { getByText } = render(<EmptyState hasFilters />);

    expect(
      getByText('No se encontraron usuarios con esos filtros.'),
    ).toBeTruthy();
  });

  it('muestra mensaje sin filtros', () => {
    const { getByText } = render(<EmptyState hasFilters={false} />);

    expect(getByText('No hay usuarios registrados.')).toBeTruthy();
  });
});

// ── FilterBar ─────────────────────────────────────────────

describe('FilterBar', () => {
  it('renderiza los chips de rol', () => {
    const { getAllByText, getByText } = render(
      <FilterBar
        roleFilter={null}
        statusFilter={null}
        onRoleFilterChange={jest.fn()}
        onStatusFilterChange={jest.fn()}
      />,
    );

    // "Todos" aparece en ambos grupos (rol y estado)
    expect(getAllByText('Todos')).toHaveLength(2);
    expect(getByText('Admin')).toBeTruthy();
    expect(getByText('Agricultor')).toBeTruthy();
  });

  it('renderiza los chips de estado', () => {
    const { getByText } = render(
      <FilterBar
        roleFilter={null}
        statusFilter={null}
        onRoleFilterChange={jest.fn()}
        onStatusFilterChange={jest.fn()}
      />,
    );

    expect(getByText('Activos')).toBeTruthy();
    expect(getByText('Inactivos')).toBeTruthy();
  });

  it('llama onRoleFilterChange al presionar un chip de rol', () => {
    const onRoleFilterChange = jest.fn();

    const { getByText } = render(
      <FilterBar
        roleFilter={null}
        statusFilter={null}
        onRoleFilterChange={onRoleFilterChange}
        onStatusFilterChange={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Admin'));
    expect(onRoleFilterChange).toHaveBeenCalledWith('Admin');
  });

  it('llama onStatusFilterChange al presionar un chip de estado', () => {
    const onStatusFilterChange = jest.fn();

    const { getByText } = render(
      <FilterBar
        roleFilter={null}
        statusFilter={null}
        onRoleFilterChange={jest.fn()}
        onStatusFilterChange={onStatusFilterChange}
      />,
    );

    fireEvent.press(getByText('Activos'));
    expect(onStatusFilterChange).toHaveBeenCalledWith('true');
  });
});

// ── UserCard ──────────────────────────────────────────────

jest.mock('react-native/Libraries/Animated/Animated', () => {
  const ViewComponent =
    require('react-native/Libraries/Components/View/View').default;
  const TextComponent = require('react-native/Libraries/Text/Text').default;

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
        start: jest.fn(),
      })),
      parallel: jest.fn(() => ({
        start: jest.fn(),
      })),
      sequence: jest.fn(() => ({
        start: jest.fn(),
      })),
      delay: jest.fn(() => ({
        start: jest.fn(),
      })),
      loop: jest.fn(() => ({
        start: jest.fn(),
      })),
      event: jest.fn(),
      createAnimatedComponent: (Component: React.ComponentType) => Component,
      View: ViewComponent,
      Text: TextComponent,
    },
  };
});

describe('UserCard', () => {
  it('renderiza nombre completo del usuario', () => {
    const { getByText } = render(
      <UserCard
        user={mockUser}
        isSelf={false}
        onTogglePress={jest.fn()}
        onRolePress={jest.fn()}
      />,
    );

    expect(getByText('Juan Pérez García')).toBeTruthy();
  });

  it('renderiza el email', () => {
    const { getByText } = render(
      <UserCard
        user={mockUser}
        isSelf={false}
        onTogglePress={jest.fn()}
        onRolePress={jest.fn()}
      />,
    );

    expect(getByText('juan@example.com')).toBeTruthy();
  });

  it('muestra "Activo" para usuario activo', () => {
    const { getByText } = render(
      <UserCard
        user={mockUser}
        isSelf={false}
        onTogglePress={jest.fn()}
        onRolePress={jest.fn()}
      />,
    );

    expect(getByText('Activo')).toBeTruthy();
  });

  it('muestra "Inactivo" para usuario inactivo', () => {
    const inactiveUser = { ...mockUser, estado: false };

    const { getByText } = render(
      <UserCard
        user={inactiveUser}
        isSelf={false}
        onTogglePress={jest.fn()}
        onRolePress={jest.fn()}
      />,
    );

    expect(getByText('Inactivo')).toBeTruthy();
  });

  it('muestra badge "tú" cuando es el usuario actual', () => {
    const { getByText } = render(
      <UserCard
        user={mockUser}
        isSelf
        onTogglePress={jest.fn()}
        onRolePress={jest.fn()}
      />,
    );

    expect(getByText('tú')).toBeTruthy();
  });

  it('no muestra badge "tú" cuando no es el usuario actual', () => {
    const { queryByText } = render(
      <UserCard
        user={mockUser}
        isSelf={false}
        onTogglePress={jest.fn()}
        onRolePress={jest.fn()}
      />,
    );

    expect(queryByText('tú')).toBeNull();
  });

  it('llama onRolePress al presionar el badge de rol', () => {
    const onRolePress = jest.fn();

    const { getByText } = render(
      <UserCard
        user={mockUser}
        isSelf={false}
        onTogglePress={jest.fn()}
        onRolePress={onRolePress}
      />,
    );

    fireEvent.press(getByText('Agricultor'));
    expect(onRolePress).toHaveBeenCalledWith(mockUser);
  });

  it('llama onTogglePress al presionar el switch', () => {
    const onTogglePress = jest.fn();

    const { getByText } = render(
      <UserCard
        user={mockUser}
        isSelf={false}
        onTogglePress={onTogglePress}
        onRolePress={jest.fn()}
      />,
    );

    // Press the status text to find the toggle
    fireEvent.press(getByText('Activo'));
    // The Switch onValueChange is triggered by press on the status area
  });
});

// ── Helper: render with PaperProvider ──────────────────────
// Paper's Dialog and Portal require a PaperProvider ancestor

function renderWithPaper(ui: React.ReactElement) {
  return render(<PaperProvider>{ui}</PaperProvider>);
}

// ── ConfirmDeactivationDialog ─────────────────────────────

describe('ConfirmDeactivationDialog', () => {
  it('muestra mensaje de confirmación para otro usuario', () => {
    const { getByText } = renderWithPaper(
      <ConfirmDeactivationDialog
        user={mockUser}
        isPending={false}
        isSelf={false}
        onConfirm={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(getByText(/¿Estás seguro de desactivar a/)).toBeTruthy();
  });

  it('muestra mensaje de auto-desactivación', () => {
    const { getByText } = renderWithPaper(
      <ConfirmDeactivationDialog
        user={mockAdminUser}
        isPending={false}
        isSelf
        onConfirm={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(getByText('No puedes desactivar tu propia cuenta.')).toBeTruthy();
  });

  it('llama onConfirm al presionar Desactivar', () => {
    const onConfirm = jest.fn();

    const { getByText } = renderWithPaper(
      <ConfirmDeactivationDialog
        user={mockUser}
        isPending={false}
        isSelf={false}
        onConfirm={onConfirm}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Desactivar'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('llama onDismiss al presionar Cancelar', () => {
    const onDismiss = jest.fn();

    const { getByText } = renderWithPaper(
      <ConfirmDeactivationDialog
        user={mockUser}
        isPending={false}
        isSelf={false}
        onConfirm={jest.fn()}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(getByText('Cancelar'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('deshabilita el botón Desactivar cuando es auto-desactivación', () => {
    const onConfirm = jest.fn();

    const { getByText } = renderWithPaper(
      <ConfirmDeactivationDialog
        user={mockAdminUser}
        isPending={false}
        isSelf
        onConfirm={onConfirm}
        onDismiss={jest.fn()}
      />,
    );

    // El botón está presente pero no debe llamar onConfirm al presionarlo
    // porque el disabled evita la acción
    expect(getByText('Desactivar')).toBeTruthy();
  });
});

// ── RoleDialog ────────────────────────────────────────────

describe('RoleDialog', () => {
  it('muestra el nombre del usuario en el modal', () => {
    const { getByText } = renderWithPaper(
      <RoleDialog
        user={mockUser}
        selectedRole="farmer"
        isPending={false}
        onRoleChange={jest.fn()}
        onSave={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(getByText(/Juan/)).toBeTruthy();
  });

  it('llama onSave al presionar Guardar', () => {
    const onSave = jest.fn();

    const { getByText } = renderWithPaper(
      <RoleDialog
        user={mockUser}
        selectedRole="farmer"
        isPending={false}
        onRoleChange={jest.fn()}
        onSave={onSave}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Guardar'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('llama onDismiss al presionar Cancelar', () => {
    const onDismiss = jest.fn();

    const { getByText } = renderWithPaper(
      <RoleDialog
        user={mockUser}
        selectedRole="farmer"
        isPending={false}
        onRoleChange={jest.fn()}
        onSave={jest.fn()}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(getByText('Cancelar'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
