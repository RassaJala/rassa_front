// Chat navigation types + re-exports of shared domain types (M9 PR-B1).
// Domain types/enums/DTOs live in @rassa/chat; they are re-exported here so
// existing `@/types/chat` import sites keep compiling (minimal-diff principle, R4).
// Only ChatStackParamList (RN navigation) is defined locally.

export type {
  AddGroupMemberPayload,
  Attachment,
  AttachmentType,
  BackendConversation,
  BackendGroupMember,
  BackendMessage,
  ChatApiEnvelope,
  Conversation,
  CreateConversationPayload,
  CreateGroupPayload,
  GroupMember,
  Message,
  PaginatedResponse,
  RenameGroupPayload,
  SearchUser,
  SendMessagePayload,
  SendMessageWithMediaPayload,
} from '@rassa/chat';
export { ATTACHMENT_TYPES } from '@rassa/chat';

export type ChatStackParamList = {
  ChatList: undefined;
  Chat: {
    conversationId: number;
    title: string;
    tipo: 'privada' | 'grupal';
    isFamily?: boolean | undefined;
    nombreOverride?: boolean | undefined;
  };
  GroupDetail: {
    conversationId: number;
    title: string;
    isFamily?: boolean | undefined;
    nombreOverride?: boolean | undefined;
  };
  CreateGroup: undefined;
  StartChat: undefined;
};
