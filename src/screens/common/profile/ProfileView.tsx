import React from 'react';
import { Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { User } from '@/types';
import { getGenderLabel, getRoleLabel } from '@/utils/labels';
import { formatPhoneNumber } from '@/utils/validation';

import ChangePassword from './ChangePassword';
import { useProfileColors } from './profileColors';

interface InfoRowProps {
  readonly label: string;
  readonly value: string;
  readonly icon: string;
}

function InfoRow({ label, value, icon }: InfoRowProps): React.JSX.Element {
  const c = useProfileColors();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <MaterialCommunityIcons
        name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={22}
        color={c.muted}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: c.muted,
            letterSpacing: 0.04,
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '500',
            color: c.fg,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

interface ProfileViewProps {
  readonly user: User | null;
}

export default function ProfileView({
  user,
}: ProfileViewProps): React.JSX.Element {
  const c = useProfileColors();
  return (
    <>
      {/* Avatar + Nombre + Rol */}
      <View
        style={{
          alignItems: 'center',
          backgroundColor: c.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border,
          paddingVertical: 28,
          paddingHorizontal: 20,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: c.accentBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 32, fontWeight: '700', color: c.brand }}>
            {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'A'}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: c.fg,
            letterSpacing: -0.2,
          }}
        >
          {user?.nombre} {user?.apellido_paterno}
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: c.muted,
            marginTop: 4,
          }}
        >
          {user?.email}
        </Text>
        <View
          style={{
            marginTop: 12,
            backgroundColor: c.accentBg,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 20,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: c.brand,
            }}
          >
            {getRoleLabel(user?.role)}
          </Text>
        </View>
      </View>

      {/* Información Personal */}
      <View
        style={{
          backgroundColor: c.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border,
          padding: 20,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: c.fg,
            letterSpacing: -0.15,
            marginBottom: 20,
          }}
        >
          Información Personal
        </Text>

        <InfoRow
          label="Nombre Completo"
          value={`${user?.nombre ?? ''} ${user?.apellido_paterno ?? ''}${user?.apellido_materno ? ` ${user.apellido_materno}` : ''}`}
          icon="account-outline"
        />
        <View
          style={{ height: 1, backgroundColor: c.border, marginVertical: 14 }}
        />
        <InfoRow
          label="Teléfono"
          value={
            user?.telefono
              ? formatPhoneNumber(user.telefono)
              : 'No especificado'
          }
          icon="phone-outline"
        />
        <View
          style={{ height: 1, backgroundColor: c.border, marginVertical: 14 }}
        />
        <InfoRow
          label="Correo Electrónico"
          value={user?.email ?? ''}
          icon="email-outline"
        />
        <View
          style={{ height: 1, backgroundColor: c.border, marginVertical: 14 }}
        />
        <InfoRow
          label="Fecha de Nacimiento"
          value={user?.fecha_nacimiento ?? 'No especificado'}
          icon="cake-variant-outline"
        />
        <View
          style={{ height: 1, backgroundColor: c.border, marginVertical: 14 }}
        />
        <InfoRow
          label="Género"
          value={user?.genero ? getGenderLabel(user.genero) : 'No especificado'}
          icon="gender-male-female"
        />
        <View
          style={{ height: 1, backgroundColor: c.border, marginVertical: 14 }}
        />
        <InfoRow
          label="Dirección"
          value={user?.direccion ?? 'No especificado'}
          icon="map-marker-outline"
        />
        <View
          style={{ height: 1, backgroundColor: c.border, marginVertical: 14 }}
        />
        <InfoRow
          label="Localidad"
          value={user?.localidad_nombre ?? 'No especificado'}
          icon="city-variant-outline"
        />
        <View
          style={{ height: 1, backgroundColor: c.border, marginVertical: 14 }}
        />
        <InfoRow
          label="Municipio"
          value={user?.municipio_nombre ?? 'No especificado'}
          icon="map-marker-radius-outline"
        />
      </View>

      <ChangePassword onPasswordChanged={() => {}} />
    </>
  );
}
