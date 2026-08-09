/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef -- Test files are less strict */
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SettlementListScreen from '@/screens/admin/SettlementListScreen';
import { fetchFarmers, fetchSettlements } from '@/services/settlements';
import type { AdminStackParamList } from '@/types';

jest.mock('@/store/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('@/services/settlements', () => ({
  fetchSettlements: jest.fn(),
  fetchFarmers: jest.fn(),
}));

// The native stack containers are Animated-wrapped native components that
// crash under react-test-renderer on unmount (RN 0.81 bug: removeListener on
// an AnimatedValue whose listeners map was never initialized). Stubbing the
// containers with plain Views keeps the REAL @react-navigation/native-stack
// navigation state machine and screen switching logic intact — only the
// native view layer is swapped out. Local to this file; react-native-screens
// stays enabled everywhere else.
jest.mock('react-native-screens', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const passthrough = ({
    children,
  }: {
    children?: React.ReactNode;
  }): React.JSX.Element => React.createElement(View, null, children);
  return {
    ScreenStack: passthrough,
    ScreenStackItem: passthrough,
    ScreenStackHeaderConfig: () => null,
    ScreenStackHeaderBackButtonImage: () => null,
    ScreenStackHeaderCenterView: passthrough,
    ScreenStackHeaderLeftView: passthrough,
    ScreenStackHeaderRightView: passthrough,
    ScreenStackHeaderSearchBarView: () => null,
    ScreenFooter: passthrough,
    SearchBar: () => null,
    isSearchBarAvailableForCurrentPlatform: () => false,
    compatibilityFlags: {},
    enableScreens: jest.fn(),
    screensEnabled: () => false,
    freezeEnabled: () => false,
  };
});

const mockFetchSettlements = fetchSettlements as jest.Mock;
const mockFetchFarmers = fetchFarmers as jest.Mock;

const Stack = createNativeStackNavigator<AdminStackParamList>();

const settlementPendiente = {
  id_liquidacion: 1,
  agricultor_id: 4,
  agricultor_nombre: 'Ana Ramírez',
  periodo_inicio: '2026-07-06',
  periodo_fin: '2026-07-12',
  monto_ventas: '1500.00',
  comision: '150.00',
  monto_liquidar: '1350.00',
  estado: 'pendiente' as const,
  creado_en: '2026-07-13T08:00:00-03:00',
};

const settlementPagada = {
  ...settlementPendiente,
  id_liquidacion: 2,
  agricultor_nombre: 'Luis Pérez',
  monto_liquidar: '900.00',
  estado: 'pagada' as const,
};

// Stub screen standing in for SettlementDetailScreen: it proves the navigator
// delivered the route params intact, and exposes a back control for the pop
// smoke test. Real navigation wiring, real param passing — only the detail
// screen's own business logic is stubbed out.
function SettlementDetailStub({
  route,
  navigation,
}: NativeStackScreenProps<
  AdminStackParamList,
  'SettlementDetail'
>): React.JSX.Element {
  return (
    <View testID="settlement-detail-stub">
      <Text>SettlementDetail</Text>
      <Text testID="stub-settlement-id">{route.params.settlementId}</Text>
      <Pressable testID="stub-back" onPress={() => navigation.goBack()}>
        <Text>Back</Text>
      </Pressable>
    </View>
  );
}

function renderHarness(): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="SettlementList"
            component={SettlementListScreen}
          />
          <Stack.Screen
            name="SettlementDetail"
            component={SettlementDetailStub}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

describe('SettlementNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchFarmers.mockResolvedValue([]);
  });

  it('smoke: pressing a settlement card navigates to SettlementDetail with the correct settlementId', async () => {
    mockFetchSettlements.mockResolvedValue({
      items: [settlementPendiente],
      count: 1,
      truncated: false,
    });

    const { findByText, findByTestId, getByTestId } = renderHarness();

    const row = await findByText('Ana Ramírez');
    fireEvent.press(row);

    // The stub screen appears and received the tapped settlement's id intact.
    await findByTestId('settlement-detail-stub');
    expect(getByTestId('stub-settlement-id').props.children).toBe(1);
  });

  it('smoke: tapping a different settlement delivers its own id', async () => {
    mockFetchSettlements.mockResolvedValue({
      items: [settlementPendiente, settlementPagada],
      count: 2,
      truncated: false,
    });

    const { findByText, findByTestId, getByTestId, getByText } =
      renderHarness();

    await findByText('Ana Ramírez');
    fireEvent.press(getByText('Luis Pérez'));

    // Triangulates the param wiring: a second card with a different id must
    // reach the stub too, so the mapping is not hardcoded to one value.
    await findByTestId('settlement-detail-stub');
    expect(getByTestId('stub-settlement-id').props.children).toBe(2);
  });

  it('smoke: list re-renders after back navigation', async () => {
    mockFetchSettlements.mockResolvedValue({
      items: [settlementPendiente, settlementPagada],
      count: 2,
      truncated: false,
    });

    const { findByText, findByTestId, getByText, queryByTestId } =
      renderHarness();

    await findByText('Ana Ramírez');
    fireEvent.press(getByText('Ana Ramírez'));

    const back = await findByTestId('stub-back');
    fireEvent.press(back);

    // The stack pops cleanly: the detail stub unmounts and the list screen is
    // visible again with its rows still rendered from the cached query data.
    await waitFor(() =>
      expect(queryByTestId('settlement-detail-stub')).toBeNull(),
    );
    expect(getByText('Liquidaciones')).toBeTruthy();
    expect(getByText('Ana Ramírez')).toBeTruthy();
    expect(getByText('Luis Pérez')).toBeTruthy();
    expect(getByText('$1350.00')).toBeTruthy();
  });

  it('types: SettlementDetail route requires settlementId (contract smoke)', () => {
    // @ts-expect-error — omitting the required settlementId must be a type error.
    const badParams: AdminStackParamList['SettlementDetail'] = {};
    // Runtime proof the object really lacks the param the compiler forbids
    // omitting. If settlementId ever becomes optional, the unused directive
    // above makes `bun run typecheck` fail.
    expect(badParams.settlementId).toBeUndefined();
  });
});
