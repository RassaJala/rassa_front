import { createChatApi } from '@rassa/chat';

import api from './api';

export const chatApi = createChatApi(api);
