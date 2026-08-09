export type ScrollAction = 'initial' | 'append' | 'pagination' | 'none';

export interface ScrollState {
  didInitialScroll: boolean;
  lastPageCount: number;
  lastMessageCount: number;
}

export const initialScrollState: ScrollState = {
  didInitialScroll: false,
  lastPageCount: 0,
  lastMessageCount: 0,
};

export function decideScroll(
  state: ScrollState,
  pageCount: number,
  messageCount: number,
): { action: ScrollAction; next: ScrollState } {
  if (messageCount === 0) {
    return { action: 'none', next: state };
  }
  if (!state.didInitialScroll) {
    return {
      action: 'initial',
      next: {
        didInitialScroll: true,
        lastPageCount: pageCount,
        lastMessageCount: messageCount,
      },
    };
  }
  if (messageCount === state.lastMessageCount) {
    return { action: 'none', next: state };
  }
  if (pageCount !== state.lastPageCount) {
    return {
      action: 'pagination',
      next: {
        ...state,
        lastPageCount: pageCount,
        lastMessageCount: messageCount,
      },
    };
  }
  return {
    action: 'append',
    next: { ...state, lastMessageCount: messageCount },
  };
}
