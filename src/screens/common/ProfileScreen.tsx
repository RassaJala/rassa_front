import React from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Button, Card, Divider } from 'react-native-paper';

import { useQuery } from '@tanstack/react-query';

import api from '@/services/api';
import { useAuth } from '@/store/AuthContext';

// ── Types ─────────────────────────────────────────────────
interface ProfileData {
  id_usuario: number;
  email: string;
  telefono: string | null;
  role: string;
  nombre: string;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  fecha_nacimiento: string | null;
  genero: string | null;
  direccion: string | null;
  localidad: number | null;
  localidad_nombre: string | null;
}

// ── Helpers ────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  buyer: 'Comprador',
  farmer: 'Agricultor / Productor',
  admin: 'Administrador',
};

const GENDER_LABELS: Record<string, string> = {
  M: 'Masculino',
  F: 'Femenino',
  O: 'Otro',
};

function formatRole(role?: string): string {
  if (!role) return '—';
  return ROLE_LABELS[role.toLowerCase()] ?? role;
}

function formatGender(genero?: string | null): string {
  if (!genero) return '—';
  return GENDER_LABELS[genero.toUpperCase()] ?? genero;
}

function formatDate(isoDate?: string | null): string {
  if (!isoDate) return '—';
  try {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return isoDate;
  }
}

function buildFullName(data: ProfileData): string {
  const parts = [
    data.nombre,
    data.apellido_paterno,
    data.apellido_materno,
  ].filter((part): part is string => part != null && part.length > 0);
  return parts.length > 0 ? parts.join(' ') : '—';
}

// ── DetailRow component ────────────────────────────────────
interface DetailRowProps {
  label: string;
  value: string | ReactNode;
}

function DetailRow({ label, value }: DetailRowProps): React.JSX.Element {
  return (
    <View className="flex-row items-start justify-between py-3">
      <Text className="w-2/5 text-sm font-medium text-gray-500">{label}</Text>
      <View className="w-3/5">
        {typeof value === 'string' ? (
          <Text className="text-right text-base text-gray-900">{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

// ── Initials avatar ───────────────────────────────────────
function InitialsAvatar({ name }: { name: string }): React.JSX.Element {
  const initials = name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
      <Text className="text-2xl font-bold text-emerald-700">{initials}</Text>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────
const LOGOUT_BUTTON_STYLE = { paddingVertical: 6 };

export default function ProfileScreen(): React.JSX.Element {
  const { logout, user } = useAuth();

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: body } = await api.get<{ data: ProfileData }>('/auth/me/');
      return body.data;
    },
    staleTime: 30_000,
  });

  // ── Loading state ──────────────────────────────────────
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#16a34a" />
        <Text className="mt-4 text-sm text-gray-500">Cargando perfil...</Text>
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────
  if (isError || !profile) {
    const errorMessage =
      error instanceof Error ? error.message : 'No se pudo cargar el perfil.';

    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="mb-2 text-lg font-semibold text-gray-900">
          Algo salió mal
        </Text>
        <Text className="mb-6 text-center text-sm text-red-600">
          {errorMessage}
        </Text>
        <Button
          mode="contained"
          buttonColor="#16a34a"
          onPress={() => void refetch()}
        >
          Reintentar
        </Button>
      </View>
    );
  }

  const fullName = buildFullName(profile);
  const displayName = fullName !== '—' ? fullName : (user?.email ?? '—');

  // ── Success state ──────────────────────────────────────
  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          colors={['#16a34a']}
          tintColor="#16a34a"
        />
      }
    >
      {/* ── Header card ─────────────────────────────────── */}
      <Card className="mb-4 rounded-2xl bg-white" mode="elevated">
        <Card.Content className="items-center py-6">
          <InitialsAvatar name={displayName} />
          <Text className="text-xl font-bold text-gray-900">{displayName}</Text>
          <Text className="mt-1 text-sm text-gray-500">{profile.email}</Text>
          <View className="mt-3 rounded-full bg-emerald-100 px-4 py-1">
            <Text className="text-sm font-medium text-emerald-700">
              {formatRole(profile.role)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* ── Personal info card ──────────────────────────── */}
      <Card className="mb-4 rounded-2xl bg-white" mode="elevated">
        <Card.Content>
          <Text className="mb-2 text-base font-semibold text-gray-900">
            Información personal
          </Text>
          <Divider className="mb-1 bg-gray-200" />

          <DetailRow label="Nombre" value={fullName} />
          <Divider className="bg-gray-100" />

          <DetailRow
            label="Apellido paterno"
            value={profile.apellido_paterno ?? '—'}
          />
          <Divider className="bg-gray-100" />

          <DetailRow
            label="Apellido materno"
            value={profile.apellido_materno ?? '—'}
          />
          <Divider className="bg-gray-100" />

          <DetailRow
            label="Fecha de nacimiento"
            value={formatDate(profile.fecha_nacimiento)}
          />
          <Divider className="bg-gray-100" />

          <DetailRow label="Género" value={formatGender(profile.genero)} />
        </Card.Content>
      </Card>

      {/* ── Contact & location card ─────────────────────── */}
      <Card className="mb-4 rounded-2xl bg-white" mode="elevated">
        <Card.Content>
          <Text className="mb-2 text-base font-semibold text-gray-900">
            Contacto y ubicación
          </Text>
          <Divider className="mb-1 bg-gray-200" />

          <DetailRow label="Teléfono" value={profile.telefono ?? '—'} />
          <Divider className="bg-gray-100" />

          <DetailRow label="Dirección" value={profile.direccion ?? '—'} />
          <Divider className="bg-gray-100" />

          <DetailRow
            label="Localidad"
            value={profile.localidad_nombre ?? '—'}
          />
        </Card.Content>
      </Card>

      {/* ── Logout button ───────────────────────────────── */}
      <Button
        mode="contained"
        buttonColor="#ef4444"
        textColor="#fff"
        className="mt-2"
        contentStyle={LOGOUT_BUTTON_STYLE}
        onPress={() => {
          void logout();
        }}
      >
        Cerrar Sesión
      </Button>
    </ScrollView>
  );
}
