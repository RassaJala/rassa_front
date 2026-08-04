import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Modal, Portal, TextInput } from 'react-native-paper';

interface MessageEditModalProps {
  visible: boolean;
  currentContent: string;
  onDismiss: () => void;
  onSave: (newContent: string) => void;
  saving?: boolean;
}

export default function MessageEditModal({
  visible,
  currentContent,
  onDismiss,
  onSave,
  saving = false,
}: Readonly<MessageEditModalProps>): React.JSX.Element {
  const [text, setText] = useState(currentContent);

  useEffect(() => {
    setText(currentContent);
  }, [currentContent]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== currentContent) {
      onSave(trimmed);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          marginHorizontal: 16,
          borderRadius: 12,
          padding: 16,
        }}
      >
        <TextInput
          label="Editar mensaje"
          value={text}
          onChangeText={setText}
          mode="outlined"
          multiline
          numberOfLines={3}
          className="mb-4"
        />
        <View className="flex-row justify-end gap-2">
          <Button mode="text" onPress={onDismiss} disabled={saving}>
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            disabled={saving || !text.trim() || text.trim() === currentContent}
            loading={saving}
          >
            Guardar
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}
