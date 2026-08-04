import { FlatList, Text, TouchableOpacity } from 'react-native';
import { Button, Dialog, Portal } from 'react-native-paper';

import type { ProfileColors } from './profileColors';

interface CatalogDialogsProps {
  readonly showMunicipioDialog: boolean;
  readonly showLocalidadDialog: boolean;
  readonly onCloseMunicipio: () => void;
  readonly onCloseLocalidad: () => void;
  readonly municipios: ReadonlyArray<{
    readonly id_municipio: number;
    readonly nombre: string;
  }>;
  readonly localidades: ReadonlyArray<{
    readonly id_localidad: number;
    readonly nombre: string;
  }>;
  readonly onSelectMunicipio: (id: number, nombre: string) => void;
  readonly onSelectLocalidad: (id: number, nombre: string) => void;
  readonly colors: ProfileColors;
  readonly isLoadingLocalidades?: boolean;
  readonly errorLocalidades?: string | null;
  readonly onRetryLocalidades?: () => void;
}

function renderCatalogDialog<T>(
  visible: boolean,
  onDismiss: () => void,
  title: string,
  data: readonly T[],
  keyExtractor: (item: T) => string,
  onSelect: (item: T) => void,
  c: ProfileColors,
  emptyMessage?: string,
): React.JSX.Element {
  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={{ backgroundColor: c.surface }}
      >
        <Dialog.Title style={{ color: c.fg }}>{title}</Dialog.Title>
        <Dialog.Content>
          <FlatList
            data={data}
            keyExtractor={keyExtractor}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onSelect(item);
                  onDismiss();
                }}
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                  paddingVertical: 16,
                }}
              >
                <Text style={{ fontSize: 16, color: c.fg }}>
                  {(item as { nombre: string }).nombre}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              emptyMessage ? (
                <Text
                  style={{ fontSize: 14, color: c.muted, paddingVertical: 16 }}
                >
                  {emptyMessage}
                </Text>
              ) : null
            }
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={c.brand}>
            Cerrar
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

export default function CatalogDialogs({
  showMunicipioDialog,
  showLocalidadDialog,
  onCloseMunicipio,
  onCloseLocalidad,
  municipios,
  localidades,
  onSelectMunicipio,
  onSelectLocalidad,
  colors: c,
  isLoadingLocalidades = false,
  errorLocalidades = null,
  onRetryLocalidades,
}: CatalogDialogsProps): React.JSX.Element {
  // W6: an empty list must not be reported as "no localidades" while the
  // request is still loading or when it failed — those are different states.
  const localidadEmptyMessage = isLoadingLocalidades
    ? 'Cargando localidades...'
    : (errorLocalidades
      ? `No se pudieron cargar las localidades. ${onRetryLocalidades ? 'Tocá Reintentar.' : 'Intentá de nuevo más tarde.'}`
      : 'Este municipio no tiene localidades cargadas. Elegí otro municipio o contactá soporte.');

  return (
    <>
      {renderCatalogDialog(
        showMunicipioDialog,
        onCloseMunicipio,
        'Seleccionar Municipio',
        municipios,
        (item) => String(item.id_municipio),
        (item) => onSelectMunicipio(item.id_municipio, item.nombre),
        c,
      )}
      {renderCatalogDialog(
        showLocalidadDialog,
        onCloseLocalidad,
        'Seleccionar Localidad',
        localidades,
        (item) => String(item.id_localidad),
        (item) => onSelectLocalidad(item.id_localidad, item.nombre),
        c,
        localidadEmptyMessage,
      )}
    </>
  );
}
