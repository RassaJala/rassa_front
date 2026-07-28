import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppColors } from '~/hooks/useAppColors';
import { useAuth } from '~/hooks/useAuth';
import { useConversations } from '~/hooks/chat/useConversations';
import { useGroupMembers } from '~/hooks/chat/useGroupMembers';
import { useRenameGroup } from '~/hooks/chat/useRenameGroup';
import { useAddGroupMember } from '~/hooks/chat/useAddGroupMember';
import { GroupMemberItem } from '~/components/chat/GroupMemberItem';
import { RenameGroupModal } from '~/components/chat/RenameGroupModal';
import { AddMemberModal } from '~/components/chat/AddMemberModal';
import { Toast, type ToastState } from '~/components/ui/Toast';

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const c = useAppColors();
  const { user } = useAuth();
  const conversationId = Number(id);

  const { data: conversations } = useConversations();
  const currentConversation = conversations?.results?.find(
    (c) => c.id === conversationId,
  );
  const groupName = currentConversation?.nombre ?? '';

  const { data: members, isLoading } = useGroupMembers(conversationId);
  const renameGroup = useRenameGroup(conversationId);
  const addGroupMember = useAddGroupMember(conversationId);

  const [showRename, setShowRename] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleRename = (name: string) => {
    renameGroup.mutate(
      { nombre: name },
      {
        onSuccess: () => {
          setShowRename(false);
          setToast({ message: 'Grupo renombrado', type: 'success' });
        },
        onError: () =>
          setToast({ message: 'Error al renombrar grupo', type: 'error' }),
      },
    );
  };

  const handleAddMember = (userId: number) => {
    addGroupMember.mutate(
      { fk_usuario: userId },
      {
        onSuccess: () => {
          setShowAddMember(false);
          setToast({ message: 'Miembro agregado', type: 'success' });
        },
        onError: () =>
          setToast({ message: 'Error al agregar miembro', type: 'error' }),
      },
    );
  };

  return (
    <div className="flex h-full flex-col" style={{ background: c.bg }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3"
        style={{ borderBottom: `1px solid ${c.border}`, background: c.surface }}
      >
        <button
          type="button"
          onClick={() => user?.rol && navigate(`/${user.rol}/chat/${id}`)}
          className="cursor-pointer border-none bg-transparent text-sm"
          style={{ color: c.brand }}
          aria-label="Volver al chat"
        >
          ← Volver
        </button>
        <h1 className="flex-1 text-base font-bold" style={{ color: c.fg }}>
          Detalle del grupo
        </h1>
        <button
          type="button"
          onClick={() => setShowRename(true)}
          className="cursor-pointer border-none bg-transparent text-sm font-medium"
          style={{ color: c.brand }}
          aria-label="Renombrar grupo"
        >
          Renombrar
        </button>
        <button
          type="button"
          onClick={() => setShowAddMember(true)}
          className="cursor-pointer border-none bg-transparent text-sm font-medium"
          style={{ color: c.brand }}
          aria-label="Agregar miembro"
        >
          + Miembro
        </button>
      </div>

      {/* Members */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2"
              style={{ borderColor: c.border, borderTopColor: c.brand }}
            />
          </div>
        )}

        {!isLoading && (!members || members.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="mb-3 text-4xl">👥</span>
            <p className="text-sm" style={{ color: c.muted }}>
              No hay miembros en este grupo
            </p>
          </div>
        )}

        {members?.map((member) => (
          <GroupMemberItem key={member.id} member={member} />
        ))}
      </div>

      {/* Modals */}
      {showRename && (
        <RenameGroupModal
          currentName={groupName}
          onSave={handleRename}
          onClose={() => setShowRename(false)}
          saving={renameGroup.isPending}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          onSave={handleAddMember}
          onClose={() => setShowAddMember(false)}
          saving={addGroupMember.isPending}
        />
      )}

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
