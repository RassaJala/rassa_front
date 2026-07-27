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
}

function renderCatalogDialog<T>(
  visible: boolean,
  onDismiss: () => void,
  title: string,
  data: readonly T[],
  keyExtractor: (item: T) => string,
  onSelect: (item: T) => void,
  c: ProfileColors,
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
}: CatalogDialogsProps): React.JSX.Element {
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
      )}
    </>
  );
}
