import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { useTheme } from '@/store/ThemeContext';
import type { Recoleccion, RecoleccionEstado } from '@/types/recolecciones';

import { ESTADO_LABELS, TRANSICIONES } from './constants';
import { formatHora } from './utils';

function estadoColors(estado: RecoleccionEstado): {
  readonly bg: string;
  readonly fg: string;
} {
  switch (estado) {
    case 'pendiente':
      return { bg: colors.statusBorradorBg, fg: colors.statusBorradorFg };
    case 'en_ruta':
      return { bg: `${colors.info}1A`, fg: colors.info };
    case 'recolectado':
      return { bg: colors.statusPublicadoBg, fg: colors.statusPublicadoFg };
    case 'cancelado':
      return { bg: colors.statusCanceladoBg, fg: colors.statusCanceladoFg };
  }
}

interface RecoleccionCardProps {
  readonly item: Recoleccion;
  readonly busy: boolean;
  readonly canContact: boolean;
  readonly onTransition: (estado: RecoleccionEstado) => void;
  readonly onCancel: () => void;
  readonly onContact: () => void;
}

export default function RecoleccionCard({
  item,
  busy,
  canContact,
  onTransition,
  onCancel,
  onContact,
}: RecoleccionCardProps): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const surface = isDark ? colors.admSurfaceD : colors.admSurfaceL;
  const border = isDark ? colors.admBorderD : colors.admBorderL;
  const fg = isDark ? colors.admFgD : colors.admFgL;
  const muted = isDark ? colors.admMutedD : colors.admMutedL;

  const badge = estadoColors(item.estado);
  const transiciones = TRANSICIONES[item.estado];

  return (
    <View
      style={{
        backgroundColor: surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: border,
        padding: 16,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: fg }}>
            {item.agricultor_nombre ?? 'Agricultor'}
          </Text>
          <Text style={{ fontSize: 13, color: muted, marginTop: 2 }}>
            {item.hora_inicio
              ? `${formatHora(item.hora_inicio)} h${
                  item.hora_fin ? ` – ${formatHora(item.hora_fin)} h` : ''
                }`
              : 'Sin hora definida'}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: badge.bg,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: badge.fg,
            }}
          >
            {ESTADO_LABELS[item.estado]}
          </Text>
        </View>
      </View>

      {item.comentarios ? (
        <Text
          style={{
            fontSize: 13,
            color: muted,
            marginTop: 10,
            fontStyle: 'italic',
          }}
        >
          {item.comentarios}
        </Text>
      ) : null}

      <RecoleccionActions
        canContact={canContact}
        transiciones={transiciones}
        busy={busy}
        onTransition={onTransition}
        onCancel={onCancel}
        onContact={onContact}
      />
    </View>
  );
}

interface RecoleccionActionsProps {
  readonly canContact: boolean;
  readonly transiciones: readonly RecoleccionEstado[];
  readonly busy: boolean;
  readonly onTransition: (estado: RecoleccionEstado) => void;
  readonly onCancel: () => void;
  readonly onContact: () => void;
}

function RecoleccionActions({
  canContact,
  transiciones,
  busy,
  onTransition,
  onCancel,
  onContact,
}: RecoleccionActionsProps): React.JSX.Element {
  const white = colors.iconWhite;
  const redCoral = colors.brandRedCoral;

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        justifyContent: 'center',
      }}
    >
      {canContact ? (
        <Pressable
          onPress={onContact}
          disabled={busy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: colors.info,
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            opacity: busy ? 0.5 : 1,
          }}
        >
          <MaterialCommunityIcons
            name="message-outline"
            size={16}
            color={white}
          />
          <Text style={{ fontSize: 13, fontWeight: '700', color: white }}>
            Contactar
          </Text>
        </Pressable>
      ) : null}

      {transiciones.includes('recolectado') ? (
        <Pressable
          onPress={() => onTransition('recolectado')}
          disabled={busy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: colors.success,
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            opacity: busy ? 0.5 : 1,
          }}
        >
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={16}
            color={white}
          />
          <Text style={{ fontSize: 13, fontWeight: '700', color: white }}>
            Recolectado
          </Text>
        </Pressable>
      ) : null}

      {transiciones.includes('en_ruta') ? (
        <Pressable
          onPress={() => onTransition('en_ruta')}
          disabled={busy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: colors.info,
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            opacity: busy ? 0.5 : 1,
          }}
        >
          <MaterialCommunityIcons
            name="truck-fast-outline"
            size={16}
            color={white}
          />
          <Text style={{ fontSize: 13, fontWeight: '700', color: white }}>
            Iniciar ruta
          </Text>
        </Pressable>
      ) : null}

      {transiciones.includes('cancelado') ? (
        <Pressable
          onPress={onCancel}
          disabled={busy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: redCoral,
            paddingVertical: 10,
            paddingHorizontal: 14,
            opacity: busy ? 0.5 : 1,
          }}
        >
          <MaterialCommunityIcons name="close" size={16} color={redCoral} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: redCoral }}>
            Cancelar
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
