import { useAppColors } from '~/hooks/useAppColors';
import type { GroupMember } from '@rassa/chat';

interface GroupMemberItemProps {
  member: GroupMember;
  onChat?: (member: GroupMember) => void;
  chatDisabled?: boolean;
}

export function GroupMemberItem({
  member,
  onChat,
  chatDisabled,
}: Readonly<GroupMemberItemProps>) {
  const c = useAppColors();

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: `1px solid ${c.border}` }}
    >
      {/* Avatar placeholder */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: c.brand }}
      >
        {member.nombre?.slice(0, 2).toUpperCase() ?? '??'}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium" style={{ color: c.fg }}>
          {member.nombre || 'Sin nombre'}
        </div>
        <div className="text-xs capitalize" style={{ color: c.muted }}>
          {member.rol || 'Miembro'}
        </div>
      </div>

      {/* Chat button */}
      {onChat && (
        <button
          type="button"
          disabled={chatDisabled}
          onClick={() => onChat(member)}
          className="shrink-0 cursor-pointer rounded-md border-none px-3 py-1.5 text-sm font-medium"
          style={{
            background: chatDisabled ? c.border : c.brand,
            color: chatDisabled ? c.muted : '#FFFFFF',
          }}
          aria-label={`Chatear con ${member.nombre || 'miembro'}`}
        >
          Chatear
        </button>
      )}
    </div>
  );
}
