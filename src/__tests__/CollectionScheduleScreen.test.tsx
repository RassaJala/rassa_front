/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';

import { Alert } from 'react-native';
import { act } from 'react';

import { fireEvent, render } from '@testing-library/react-native';

import CollectionScheduleScreen from '@/screens/seller/CollectionScheduleScreen';
import type { Recoleccion } from '@/types/recolecciones';
import type {
  AgricultorUbicacion,
  AgricultorAgricultorItem,
} from '@/hooks/useAgricultoresUbicacion';
import type { RecoleccionesResult } from '@/services/recolecciones';

import api from '@/services/api';

jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => ({
  addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  dismiss: jest.fn(),
  isVisible: jest.fn().mockReturnValue(false),
}));

const mockMutate = jest.fn(() => {
  mockMutationPending = true;
});
const mockChatMutate = jest.fn();
const mockInvalidateQueries = jest.fn();
let mockMutationPending = false;
let mockChatPending = false;
let mockChatError = false;
let mockChatVariables: { fk_usuario: number } | null = null;
let mockUser: { id_usuario: number; role: string } = {
  id_usuario: 999,
  role: 'seller',
};

interface MockMutationOptions {
  readonly mutationFn?: unknown;
  readonly onMutate?: (variable: unknown) => void;
  readonly onSuccess?: (
    data: unknown,
    variable: unknown,
    context: unknown,
  ) => void;
  readonly onError?: (
    error: unknown,
    variable: unknown,
    context: unknown,
  ) => void;
  readonly onSettled?: (
    data: unknown,
    error: unknown,
    variable: unknown,
  ) => void;
}

function mockMutationLabel(options: MockMutationOptions): string {
  const source =
    typeof options.mutationFn === 'function' ? String(options.mutationFn) : '';
  if (source.includes('cambiarEstadoRecoleccion')) return 'transicion';
  if (source.includes('cancelarRecoleccion')) return 'cancelar';
  if (source.includes('createRecoleccion')) return 'create';
  return 'unknown';
}

const mockMutations: Record<string, MockMutationOptions> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
  }),
}));

jest.mock('@/store/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: (options: MockMutationOptions) => {
    mockMutations[mockMutationLabel(options)] = options;
    return {
      mutate: mockMutate,
      isPending: mockMutationPending,
      isError: false,
    };
  },
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

jest.mock('@/features/chat/hooks/useCreatePrivateConversation', () => ({
  useCreatePrivateConversation: () => ({
    isPending: mockChatPending,
    isError: mockChatError,
    variables: mockChatVariables,
    mutate: mockChatMutate,
  }),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockRecolecciones: Recoleccion[] = [];
const mockAgricultores: AgricultorUbicacion[] = [];
let mockAgricultoresError = false;
let mockAgricultoresTruncated = false;
let mockAgricultoresErrores = 0;
const mockRefetchAgricultores = jest.fn();

jest.mock('@/hooks/useAgricultoresUbicacion', () => ({
  useAgricultoresUbicacion: () => ({
    agricultores: mockAgricultores,
    totalAgricultores: 1,
    isLoading: false,
    isError: mockAgricultoresError,
    truncated: mockAgricultoresTruncated,
    errores: mockAgricultoresErrores,
    refetch: mockRefetchAgricultores,
  }),
}));

function toDateString(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

const HOY = toDateString(new Date());
const MAÑANA = toDateString(addDays(new Date(), 1));

const juan: AgricultorAgricultorItem = {
  id_usuario: 11,
  role: 'farmer',
  nombre: 'Juan',
  apellido_paterno: 'Pérez',
  apellido_materno: null,
  localidad: 5,
};

const recoleccionHoy: Recoleccion = {
  id_recoleccion: 1,
  fk_agricultor: 11,
  agricultor_nombre: 'Juan Pérez',
  fecha_recoleccion: HOY,
  hora_inicio: '08:00:00',
  hora_fin: null,
  estado: 'pendiente',
  comentarios: null,
  creado_en: '2026-07-30T10:00:00Z',
};

const recoleccionMañana: Recoleccion = {
  id_recoleccion: 2,
  fk_agricultor: 12,
  agricultor_nombre: 'María López',
  fecha_recoleccion: MAÑANA,
  hora_inicio: '09:30:00',
  hora_fin: '11:00:00',
  estado: 'en_ruta',
  comentarios: 'Llevar cajas',
  creado_en: '2026-07-30T11:00:00Z',
};

function mockUseQuery(
  data: Recoleccion[],
  extra: Partial<RecoleccionesResult> = {},
): void {
  (
    jest.requireMock('@tanstack/react-query').useQuery as jest.Mock
  ).mockReturnValue({
    data: { data, truncated: false, errores: 0, ...extra },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    isRefetching: false,
  });
}

describe('CollectionScheduleScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecolecciones.length = 0;
    mockRecolecciones.push(recoleccionHoy, recoleccionMañana);
    mockAgricultores.length = 0;
    mockAgricultores.push({
      municipioNombre: 'Zacapa',
      localidades: [{ localidadNombre: 'La Esperanza', agricultores: [juan] }],
    });
    mockMutationPending = false;
    mockChatPending = false;
    mockChatError = false;
    mockChatVariables = null;
    mockUser = { id_usuario: 999, role: 'seller' };
    mockAgricultoresError = false;
    mockAgricultoresTruncated = false;
    mockAgricultoresErrores = 0;
    delete mockMutations.transicion;
    delete mockMutations.cancelar;
    delete mockMutations.create;
    delete mockMutations.unknown;
    (api.get as jest.Mock).mockResolvedValue({ data: { results: [] } });
    (api.post as jest.Mock).mockResolvedValue({ data: recoleccionHoy });
    mockUseQuery([]);
  });

  it('agrupa las recolecciones por fecha con encabezados Hoy y Mañana', () => {
    mockUseQuery(mockRecolecciones);

    const { getByText } = render(<CollectionScheduleScreen />);

    expect(getByText('Recolecciones')).toBeTruthy();
    expect(getByText('Hoy')).toBeTruthy();
    expect(getByText('Mañana')).toBeTruthy();
    expect(getByText('Juan Pérez')).toBeTruthy();
    expect(getByText('María López')).toBeTruthy();
  });

  it('muestra hora y badge de estado de cada recolección', () => {
    mockUseQuery(mockRecolecciones);

    const { getByText, getAllByText } = render(<CollectionScheduleScreen />);

    expect(getByText('08:00 h')).toBeTruthy();
    expect(getByText('09:30 h – 11:00 h')).toBeTruthy();
    expect(getAllByText('Pendiente').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('En ruta').length).toBeGreaterThanOrEqual(1);
    expect(getByText('Llevar cajas')).toBeTruthy();
  });

  it('muestra los filtros de estado', () => {
    mockUseQuery(mockRecolecciones);

    const { getByText, getAllByText } = render(<CollectionScheduleScreen />);

    expect(getByText('Todos')).toBeTruthy();
    expect(getAllByText('Recolectado').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Cancelado').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra el estado vacío cuando no hay recolecciones', () => {
    mockUseQuery([]);

    const { getByText } = render(<CollectionScheduleScreen />);

    expect(getByText('No hay recolecciones programadas')).toBeTruthy();
  });

  it('muestra error y reintenta', () => {
    const refetch = jest.fn();
    (
      jest.requireMock('@tanstack/react-query').useQuery as jest.Mock
    ).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch,
      isRefetching: false,
    });

    const { getByText } = render(<CollectionScheduleScreen />);

    expect(getByText('Error al cargar recolecciones')).toBeTruthy();
    fireEvent.press(getByText('Reintentar'));
    expect(refetch).toHaveBeenCalled();
  });

  it('inicia una transición de estado al presionar Iniciar ruta', () => {
    mockUseQuery(mockRecolecciones);

    const { getAllByText } = render(<CollectionScheduleScreen />);

    fireEvent.press(getAllByText('Iniciar ruta')[0]);
    expect(mockMutate).toHaveBeenCalledWith({
      id: 1,
      estado: 'en_ruta',
    });
  });

  it('abre un chat con el agricultor al presionar Contactar', () => {
    mockUseQuery(mockRecolecciones);

    const { getAllByText } = render(<CollectionScheduleScreen />);

    fireEvent.press(getAllByText('Contactar')[0]);
    expect(mockChatMutate).toHaveBeenCalledWith({ fk_usuario: 11 });
  });

  it('abre el modal de programación y agrupa agricultores por municipio y localidad', () => {
    mockUseQuery(mockRecolecciones);

    const { getByText, getAllByText } = render(<CollectionScheduleScreen />);

    fireEvent.press(getByText('Nueva'));

    expect(getAllByText('Programar recolección').length).toBeGreaterThanOrEqual(
      2,
    );
    expect(getByText('Zacapa')).toBeTruthy();
    expect(getByText('La Esperanza')).toBeTruthy();
    expect(getAllByText('Juan Pérez').length).toBeGreaterThanOrEqual(1);
  });

  it('marca al agricultor con recolección existente en la fecha seleccionada', () => {
    mockUseQuery(mockRecolecciones);

    const { getByText } = render(<CollectionScheduleScreen />);

    fireEvent.press(getByText('Nueva'));

    expect(getByText('Ya tiene recolección')).toBeTruthy();
  });

  it('muestra el error de carga de agricultores y reintenta', () => {
    mockAgricultoresError = true;
    mockUseQuery(mockRecolecciones);

    const { getByText } = render(<CollectionScheduleScreen />);

    fireEvent.press(getByText('Nueva'));

    expect(getByText('Error al cargar agricultores.')).toBeTruthy();
    fireEvent.press(getByText('Reintentar'));
    expect(mockRefetchAgricultores).toHaveBeenCalled();
  });

  it('avisa cuando la lista de agricultores está truncada o incompleta', () => {
    mockAgricultoresTruncated = true;
    mockAgricultoresErrores = 1;
    mockUseQuery(mockRecolecciones);

    const { getByText } = render(<CollectionScheduleScreen />);

    fireEvent.press(getByText('Nueva'));

    expect(
      getByText('Solo se muestran los primeros agricultores.'),
    ).toBeTruthy();
  });

  it('crea una recolección al llenar el formulario', () => {
    mockUseQuery(mockRecolecciones);

    const { getByText, getAllByText, getByPlaceholderText } = render(
      <CollectionScheduleScreen />,
    );

    fireEvent.press(getByText('Nueva'));

    const futuro = toDateString(addDays(new Date(), 5));
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), futuro);
    fireEvent.press(getAllByText('Juan Pérez')[1]);
    fireEvent.press(getAllByText('Programar recolección')[1]);

    expect(mockMutate).toHaveBeenCalledWith({
      fk_agricultor: 11,
      fecha_recoleccion: futuro,
      hora_inicio: null,
      hora_fin: null,
      comentarios: null,
    });
  });

  it('pide confirmación antes de cancelar una recolección', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockUseQuery(mockRecolecciones);

    const { getAllByText } = render(<CollectionScheduleScreen />);

    fireEvent.press(getAllByText('Cancelar')[0]);
    expect(alertSpy).toHaveBeenCalledWith(
      'Cancelar recolección',
      '¿Estás seguro?',
      expect.anything(),
    );
    alertSpy.mockRestore();
  });

  it('cancela la recolección al confirmar en el diálogo', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockUseQuery(mockRecolecciones);

    const { getAllByText } = render(<CollectionScheduleScreen />);

    fireEvent.press(getAllByText('Cancelar')[0]);

    const buttons = alertSpy.mock.calls[0]?.[2] as
      ReadonlyArray<{ text: string; onPress?: () => void }> | undefined;
    const confirmar = buttons?.find((b) => b.text === 'Sí, cancelar');
    confirmar?.onPress?.();

    expect(mockMutate).toHaveBeenCalledWith(1);
    alertSpy.mockRestore();
  });

  it('invalida la lista al completar una transición de estado', () => {
    mockUseQuery(mockRecolecciones);

    const { getAllByText } = render(<CollectionScheduleScreen />);

    act(() => {
      mockMutations.transicion?.onSuccess?.(
        undefined,
        { id: 1, estado: 'en_ruta' },
        undefined,
      );
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['recolecciones'],
    });
    expect(
      getAllByText('Estado actualizado correctamente.').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('muestra el error del servidor al crear y mantiene el modal abierto', () => {
    mockUseQuery(mockRecolecciones);

    const { getByText, getAllByText, getByPlaceholderText } = render(
      <CollectionScheduleScreen />,
    );

    fireEvent.press(getByText('Nueva'));

    const futuro = toDateString(addDays(new Date(), 5));
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), futuro);
    fireEvent.press(getAllByText('Juan Pérez')[1]);
    fireEvent.press(getAllByText('Programar recolección')[1]);
    expect(mockMutate).toHaveBeenCalledTimes(1);

    act(() => {
      mockMutations.create?.onError?.(
        new Error('Ya existe una recolección para este agricultor.'),
        { fk_agricultor: 11, fecha_recoleccion: futuro },
        undefined,
      );
    });

    expect(
      getByText('Ya existe una recolección para este agricultor.'),
    ).toBeTruthy();
    expect(getAllByText('Programar recolección').length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it('avisa cuando no se puede abrir el chat', () => {
    mockChatError = true;
    mockUseQuery(mockRecolecciones);

    const { getByText, getAllByText } = render(<CollectionScheduleScreen />);

    fireEvent.press(getAllByText('Contactar')[0]);

    expect(
      getByText('No se pudo abrir el chat con el agricultor.'),
    ).toBeTruthy();
  });

  it('no envía duplicados mientras el guardado está en curso', () => {
    mockUseQuery(mockRecolecciones);

    const { getByText, getAllByText, getByPlaceholderText, rerender } = render(
      <CollectionScheduleScreen />,
    );

    fireEvent.press(getByText('Nueva'));

    const futuro = toDateString(addDays(new Date(), 5));
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), futuro);
    fireEvent.press(getAllByText('Juan Pérez')[1]);
    fireEvent.press(getAllByText('Programar recolección')[1]);

    expect(mockMutate).toHaveBeenCalledTimes(1);

    rerender(<CollectionScheduleScreen />);
    fireEvent.press(getByText('Guardando…'));

    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('rechaza fechas imposibles como 2026-02-31', () => {
    mockUseQuery(mockRecolecciones);

    const { getByText, getAllByText, getByPlaceholderText } = render(
      <CollectionScheduleScreen />,
    );

    fireEvent.press(getByText('Nueva'));
    fireEvent.changeText(getByPlaceholderText('AAAA-MM-DD'), '2026-02-31');
    fireEvent.press(getAllByText('Juan Pérez')[1]);
    fireEvent.press(getAllByText('Programar recolección')[1]);

    expect(getByText('La fecha ingresada no es válida.')).toBeTruthy();
  });

  it('valida que la hora de fin sea posterior a la de inicio', () => {
    mockUseQuery(mockRecolecciones);

    const { getByText, getAllByText, getAllByPlaceholderText } = render(
      <CollectionScheduleScreen />,
    );

    fireEvent.press(getByText('Nueva'));
    fireEvent.changeText(
      getAllByPlaceholderText('HH:MM (opcional)')[0],
      '10:00',
    );
    fireEvent.changeText(
      getAllByPlaceholderText('HH:MM (opcional)')[1],
      '09:00',
    );
    fireEvent.press(getAllByText('Juan Pérez')[1]);
    fireEvent.press(getAllByText('Programar recolección')[1]);

    expect(
      getByText('La hora de fin debe ser posterior a la de inicio.'),
    ).toBeTruthy();
  });

  it('filtra las recolecciones al seleccionar un chip de estado', () => {
    mockUseQuery(mockRecolecciones);

    const { getAllByText } = render(<CollectionScheduleScreen />);

    fireEvent.press(getAllByText('Pendiente')[0]);

    const useQueryMock = jest.requireMock('@tanstack/react-query')
      .useQuery as jest.Mock;
    const lastCall =
      useQueryMock.mock.calls[useQueryMock.mock.calls.length - 1];
    expect(lastCall?.[0]?.queryKey).toEqual(['recolecciones', 'pendiente']);
  });

  it('no ofrece Contactar en la propia recolección', () => {
    mockUser = { id_usuario: 11, role: 'seller' };
    mockUseQuery(mockRecolecciones);

    const { getAllByText } = render(<CollectionScheduleScreen />);

    expect(getAllByText('Contactar')).toHaveLength(1);
    fireEvent.press(getAllByText('Contactar')[0]);
    expect(mockChatMutate).toHaveBeenCalledWith({ fk_usuario: 12 });
  });

  it('bloquea Contactar solo del agricultor cuyo chat está en curso', () => {
    mockChatPending = true;
    mockChatVariables = { fk_usuario: 11 };
    mockUseQuery(mockRecolecciones);

    const { getAllByText } = render(<CollectionScheduleScreen />);

    fireEvent.press(getAllByText('Contactar')[0]);
    expect(mockChatMutate).not.toHaveBeenCalled();

    fireEvent.press(getAllByText('Contactar')[1]);
    expect(mockChatMutate).toHaveBeenCalledWith({ fk_usuario: 12 });
  });

  it('avisa cuando la lista de recolecciones fue truncada', () => {
    mockUseQuery(mockRecolecciones, { truncated: true });

    const { getByText } = render(<CollectionScheduleScreen />);

    expect(getByText('Solo se muestran los primeros resultados.')).toBeTruthy();
  });

  it('avisa cuando algunas recolecciones no se pudieron cargar', () => {
    mockUseQuery(mockRecolecciones, { errores: 1 });

    const { getByText } = render(<CollectionScheduleScreen />);

    expect(
      getByText(
        'Algunas recolecciones no se pudieron cargar. Desliza para reintentar.',
      ),
    ).toBeTruthy();
  });
});
