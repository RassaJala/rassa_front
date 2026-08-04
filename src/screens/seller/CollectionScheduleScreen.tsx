import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Toast from '@/components/Toast';
import { colors } from '@/constants/colors';
import { useCreatePrivateConversation } from '@/features/chat/hooks/useCreatePrivateConversation';
import FilterChips from '@/features/recolecciones/FilterChips';
import RecoleccionCard from '@/features/recolecciones/RecoleccionCard';
import ScheduleRecoleccionModal from '@/features/recolecciones/ScheduleRecoleccionModal';
import { formatFechaHeader, todayString } from '@/features/recolecciones/utils';
import {
  cambiarEstadoRecoleccion,
  cancelarRecoleccion,
  fetchRecolecciones,
} from '@/services/recolecciones';
import type { RecoleccionesResult } from '@/services/recolecciones';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import type { RecoleccionEstado } from '@/types/recolecciones';
import { extractApiError } from '@/utils/apiErrors';

export default function CollectionScheduleScreen(): React.JSX.Element {
  const { colorScheme } = useTheme();
  const { user } = useAuth();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? colors.admBgD : colors.admBgL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const brand = isDark ? colors.admBrandD : colors.admBrandL;
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const white = colors.iconWhite;

  const [today, setToday] = useState(todayString);

  // Midnight rollover: recalculate 'today' when the date changes.
  useEffect(() => {
    const msUntilMidnight =
      new Date().setHours(24, 0, 0, 0) - Date.now() + 1000;
    const timer = setTimeout(() => setToday(todayString()), msUntilMidnight);
    return () => clearTimeout(timer);
  }, [today]);

  const [filter, setFilter] = useState<RecoleccionEstado | ''>('');
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', type: 'info' });
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [modalVisible, setModalVisible] = useState(false);

  const queryClient = useQueryClient();

  const {
    data: result,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<RecoleccionesResult>({
    queryKey: ['recolecciones', filter, today],
    queryFn: () =>
      fetchRecolecciones({
        ...(filter ? { estado: filter } : {}),
        fechaDesde: today,
      }),
    retry: false,
  });

  const recolecciones = useMemo(() => result?.data ?? [], [result]);
  const truncated = result?.truncated ?? false;
  const erroresParciales = result?.errores ?? 0;

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ visible: true, message, type });
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const sections = useMemo(() => {
    const map = new Map<string, typeof recolecciones>();
    for (const recoleccion of recolecciones) {
      const list = map.get(recoleccion.fecha_recoleccion) ?? [];
      list.push(recoleccion);
      map.set(recoleccion.fecha_recoleccion, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, items]) => ({ title: fecha, data: items }));
  }, [recolecciones]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['recolecciones'] });
  }, [queryClient]);

  const onMutationSuccess = useCallback(
    (message: string) => {
      invalidate();
      showToast(message, 'success');
      const refetchPromise = refetch();
      if (refetchPromise) {
        refetchPromise
          .then((res) => {
            if (res.isError) {
              showToast(
                'El cambio se guardó, pero no se pudo actualizar la lista.',
                'error',
              );
            }
            return res;
          })
          .catch(() => {
            /* noop */
          });
      }
    },
    [invalidate, showToast, refetch],
  );

  const transicionMutation = useMutation({
    mutationFn: (payload: {
      readonly id: number;
      readonly estado: RecoleccionEstado;
    }) => cambiarEstadoRecoleccion(payload.id, payload.estado),
    onMutate: ({ id }) => {
      setPendingIds((prev) => new Set(prev).add(id));
    },
    onSettled: (_data, _error, { id }) => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    onSuccess: () => {
      onMutationSuccess('Estado actualizado correctamente.');
    },
    onError: (error: unknown) => {
      const detail = extractApiError(error, ['estado']);
      showToast(detail, 'error');
      invalidate();
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: (id: number) => cancelarRecoleccion(id),
    onMutate: (id) => {
      setPendingIds((prev) => new Set(prev).add(id));
    },
    onSettled: (_data, _error, id) => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    onSuccess: () => {
      onMutationSuccess('Recolección cancelada.');
    },
    onError: (error: unknown) => {
      const detail = extractApiError(error, ['estado']);
      showToast(detail, 'error');
      invalidate();
    },
  });

  const createChat = useCreatePrivateConversation();

  const chatPendingId = createChat.isPending
    ? (createChat.variables?.fk_usuario ?? null)
    : null;

  useEffect(() => {
    if (createChat.isError) {
      showToast('No se pudo abrir el chat con el agricultor.', 'error');
      createChat.reset();
    }
  }, [createChat.isError, createChat.reset, showToast, createChat]);

  const handleContact = useCallback(
    (fkAgricultor: number) => {
      if (fkAgricultor === user?.id_usuario) {
        showToast('No puedes abrir un chat contigo mismo.', 'info');
        return;
      }
      if (chatPendingId === fkAgricultor) return;
      createChat.mutate({ fk_usuario: fkAgricultor });
    },
    [chatPendingId, createChat, showToast, user?.id_usuario],
  );

  const handleSaved = useCallback(
    (message: string) => {
      onMutationSuccess(message);
    },
    [onMutationSuccess],
  );

  const confirmCancel = useCallback(
    (id: number) => {
      const run = () => cancelarMutation.mutate(id);
      if (Platform.OS === 'web') {
        if (window.confirm('¿Cancelar esta recolección?')) run();
        return;
      }
      Alert.alert('Cancelar recolección', '¿Estás seguro?', [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: run },
      ]);
    },
    [cancelarMutation],
  );

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={muted}
        />
        <Text
          style={{
            marginTop: 12,
            fontSize: 15,
            color: muted,
            textAlign: 'center',
          }}
        >
          Error al cargar recolecciones
        </Text>
        <Pressable
          onPress={() => void refetch()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 16,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <MaterialCommunityIcons name="refresh" size={18} color={brand} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: brand }}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View
        style={{
          paddingTop: 60,
          paddingHorizontal: 20,
          paddingBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.02,
            color: fg,
          }}
        >
          Recolecciones
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id_recoleccion)}
        renderItem={({ item }) => (
          <RecoleccionCard
            item={item}
            busy={
              pendingIds.has(item.id_recoleccion) ||
              chatPendingId === item.fk_agricultor
            }
            canContact={
              item.fk_agricultor != null &&
              item.fk_agricultor !== user?.id_usuario
            }
            onTransition={(estado) =>
              transicionMutation.mutate({ id: item.id_recoleccion, estado })
            }
            onCancel={() => confirmCancel(item.id_recoleccion)}
            onContact={() => {
              if (item.fk_agricultor != null) handleContact(item.fk_agricultor);
            }}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View
            style={{
              paddingTop: 18,
              paddingBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: fg,
              }}
            >
              {formatFechaHeader(section.title, today)}
            </Text>
            <Text style={{ fontSize: 12, color: muted, marginTop: 2 }}>
              {section.title} · {section.data.length}{' '}
              {section.data.length === 1 ? 'recolección' : 'recolecciones'}
            </Text>
          </View>
        )}
        ListHeaderComponent={
          <View style={{ paddingBottom: 12 }}>
            <View
              style={{
                backgroundColor: surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: border,
                padding: 12,
              }}
            >
              <FilterChips filter={filter} onSelect={setFilter} />
            </View>
            {truncated || erroresParciales > 0 ? (
              <View
                style={{
                  marginTop: 10,
                  backgroundColor: surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontSize: 12, color: muted }}>
                  {truncated
                    ? 'Solo se muestran los primeros resultados.'
                    : 'Algunas recolecciones no se pudieron cargar. Desliza para reintentar.'}
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 60,
            }}
          >
            <MaterialCommunityIcons
              name="calendar-remove-outline"
              size={48}
              color={muted}
            />
            <Text
              style={{
                marginTop: 12,
                fontSize: 15,
                color: muted,
                textAlign: 'center',
              }}
            >
              {filter
                ? 'No hay recolecciones en este estado'
                : 'No hay recolecciones programadas'}
            </Text>
          </View>
        }
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 120,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={brand}
            colors={[brand]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        onPress={() => setModalVisible(true)}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 28,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: brand,
          borderRadius: 28,
          paddingVertical: 14,
          paddingHorizontal: 18,
          shadowColor: colors.shadow,
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <MaterialCommunityIcons name="calendar-plus" size={20} color={white} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: white }}>
          Nueva
        </Text>
      </Pressable>

      <ScheduleRecoleccionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={handleSaved}
        existing={recolecciones}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    </View>
  );
}
